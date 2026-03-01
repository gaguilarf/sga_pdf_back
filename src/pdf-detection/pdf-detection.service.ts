import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface DetectedPointer {
  x: number;
  y: number;
  page: number;
  score: number;
}

// Lower scale = less memory, but less accuracy for small icons.
// 1.2 gives ~173 DPI which is enough for icon detection.
const RENDER_SCALE = 1.2;
const SAD_THRESHOLD = 0.07;  // max avg pixel diff per channel (0-1). Keep STRICT.
const STEP = 2;               // sliding window step (2 = 4x faster than 1)
const NMS_RADIUS = 0.7;
const MAX_MATCHES_PER_PAGE = 10; // safety cap: if more than this after NMS, page is skipped
const SAVE_BATCH_SIZE = 200;     // TypeORM batch insert size

@Injectable()
export class PdfDetectionService {
  private readonly publicDir = path.resolve(__dirname, '..', '..', 'public');

  private _pdfjs: any = null;
  private _canvas: any = null;
  private _jimp: any = null;

  private async canvas() {
    if (!this._canvas) {
      this._canvas = await (new Function('return import("@napi-rs/canvas")')());
    }
    return this._canvas;
  }

  private async pdfjs() {
    if (!this._pdfjs) {
      const c = await this.canvas();
      if (typeof (globalThis as any).DOMMatrix === 'undefined') {
        (globalThis as any).DOMMatrix = c.DOMMatrix;
      }
      if (typeof (globalThis as any).Path2D === 'undefined' && c.Path2D) {
        (globalThis as any).Path2D = c.Path2D;
      }
      this._pdfjs = await (new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')());
    }
    return this._pdfjs;
  }

  private async jimp() {
    if (!this._jimp) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._jimp = require('jimp');
    }
    return this._jimp;
  }

  // Render a single page using an already-open PDFDocumentProxy
  private async renderPage(
    pdf: any,
    pageNum: number,
  ): Promise<{ buffer: Buffer; widthPx: number; heightPx: number }> {
    const { createCanvas } = await this.canvas();

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const w = Math.ceil(viewport.width);
    const h = Math.ceil(viewport.height);

    const canvasEl = createCanvas(w, h);
    const ctx = canvasEl.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

    const raw = canvasEl.toBuffer('image/png');
    // Free the canvas immediately
    (canvasEl as any).width = 1;
    (canvasEl as any).height = 1;

    return {
      buffer: Buffer.isBuffer(raw) ? raw : Buffer.from(raw),
      widthPx: w,
      heightPx: h,
    };
  }

  // Pre-extract template pixels once (reused for every page)
  private async extractTemplatePixels(
    templateBuffer: Buffer,
  ): Promise<{ tmplPx: Uint8Array; tw: number; th: number; opaqueCount: number }> {
    const Jimp = await this.jimp();
    const tmplImg = await Jimp.read(templateBuffer);
    const tw = tmplImg.bitmap.width;
    const th = tmplImg.bitmap.height;

    const tmplPx = new Uint8Array(tw * th * 4);
    let opaqueCount = 0;
    for (let ty = 0; ty < th; ty++) {
      for (let tx = 0; tx < tw; tx++) {
        const idx = (ty * tw + tx) * 4;
        const c = tmplImg.getPixelColor(tx, ty);
        tmplPx[idx]     = (c >>> 24) & 0xff;
        tmplPx[idx + 1] = (c >>> 16) & 0xff;
        tmplPx[idx + 2] = (c >>> 8)  & 0xff;
        tmplPx[idx + 3] = c & 0xff;
        if ((c & 0xff) >= 128) opaqueCount++;
      }
    }
    if (opaqueCount === 0) opaqueCount = tw * th;

    // Free jimp image
    tmplImg.bitmap.data = Buffer.alloc(0);
    return { tmplPx, tw, th, opaqueCount };
  }

  // SAD sliding window for one page
  private async matchPage(
    pageBuffer: Buffer,
    tmplPx: Uint8Array,
    tw: number,
    th: number,
    opaqueCount: number,
  ): Promise<Array<{ x: number; y: number; score: number }>> {
    const Jimp = await this.jimp();
    const pageImg = await Jimp.read(pageBuffer);
    const pw = pageImg.bitmap.width;
    const ph = pageImg.bitmap.height;

    if (tw > pw || th > ph) {
      pageImg.bitmap.data = Buffer.alloc(0);
      return [];
    }

    // Extract raw page pixel buffer for direct access (faster than getPixelColor)
    const pagePx: Buffer = pageImg.bitmap.data;
    const matches: Array<{ x: number; y: number; score: number }> = [];
    const norm = opaqueCount * 3 * 255;
    // Pre-calculate early-exit threshold in absolute units
    const sadLimit = SAD_THRESHOLD * norm;

    for (let y = 0; y <= ph - th; y += STEP) {
      for (let x = 0; x <= pw - tw; x += STEP) {
        let sad = 0;
        let aborted = false;
        for (let ty = 0; ty < th && !aborted; ty++) {
          for (let tx = 0; tx < tw; tx++) {
            const ti = (ty * tw + tx) * 4;
            if (tmplPx[ti + 3] < 128) continue;
            // jimp bitmap is RGBA
            const pi = ((y + ty) * pw + (x + tx)) * 4;
            sad +=
              Math.abs(pagePx[pi]     - tmplPx[ti])     +
              Math.abs(pagePx[pi + 1] - tmplPx[ti + 1]) +
              Math.abs(pagePx[pi + 2] - tmplPx[ti + 2]);
            if (sad > sadLimit) { aborted = true; break; } // early exit
          }
        }
        if (!aborted) {
          const s = sad / norm;
          if (s < SAD_THRESHOLD) {
            matches.push({ x: x + tw / 2, y: y + th / 2, score: s });
          }
        }
      }
    }

    // Free page image memory
    pageImg.bitmap.data = Buffer.alloc(0);

    return this.nms(matches, tw * NMS_RADIUS);
  }

  private nms(
    matches: Array<{ x: number; y: number; score: number }>,
    radius: number,
  ) {
    const sorted = [...matches].sort((a, b) => a.score - b.score);
    const kept: typeof sorted = [];
    for (const c of sorted) {
      if (!kept.some(k => Math.abs(k.x - c.x) < radius && Math.abs(k.y - c.y) < radius)) {
        kept.push(c);
      }
    }
    return kept;
  }

  // Main: scan all pages of a PDF for the disco template
  async detectInPdf(pdfFilename: string): Promise<DetectedPointer[]> {
    const pdfPath  = path.join(this.publicDir, 'recursos', pdfFilename);
    const tmplPath = path.join(this.publicDir, 'disco.png');

    const [pdfData, templateBuffer] = await Promise.all([
      fs.readFile(pdfPath),
      fs.readFile(tmplPath),
    ]);

    const { tmplPx, tw, th, opaqueCount } = await this.extractTemplatePixels(templateBuffer);

    const lib = await this.pdfjs();
    // Open PDF ONCE and reuse across all pages
    const pdf = await lib.getDocument({ data: new Uint8Array(pdfData) }).promise;
    const numPages = pdf.numPages;

    console.log(`[AutoDetect] ${pdfFilename}: ${numPages} pages, template ${tw}×${th}px`);

    const results: DetectedPointer[] = [];

    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const { buffer, widthPx, heightPx } = await this.renderPage(pdf, pageNum);
        const matches = await this.matchPage(buffer, tmplPx, tw, th, opaqueCount);

        // Safety cap: if we get too many matches on a single page it means the template
        // is matching background noise — skip the page entirely.
        if (matches.length > MAX_MATCHES_PER_PAGE) {
          console.log(`[AutoDetect] Page ${pageNum}: ${matches.length} matches (too many, likely noise — skipped)`);
          continue;
        }

        for (const m of matches) {
          results.push({
            x: (m.x / widthPx) * 100,
            y: (m.y / heightPx) * 100,
            page: pageNum,
            score: m.score,
          });
        }

        if (matches.length > 0) {
          console.log(`[AutoDetect] Page ${pageNum}: ${matches.length} match(es) ✓`);
        }
      }
    } finally {
      await pdf.destroy();
    }

    console.log(`[AutoDetect] Done. Total: ${results.length} pointer(s) detected.`);
    return results;
  }
}
