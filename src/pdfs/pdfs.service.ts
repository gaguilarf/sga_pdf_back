import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AudioPointersService } from '../audio-pointers/audio-pointers.service';
import { Pdf, PdfLevel } from './entities/pdf.entity';

@Injectable()
export class PdfsService {
  private readonly uploadDir = path.resolve(__dirname, '..', '..', 'public', 'recursos');
  private readonly thumbnailDir = path.join(this.uploadDir, 'thumbnails');

  constructor(
    @InjectRepository(Pdf)
    private pdfRepository: Repository<Pdf>,
    private readonly audioPointersService: AudioPointersService
  ) {}

  async onModuleInit() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.thumbnailDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async listPdfs() {
    try {
      const pdfs = await this.pdfRepository.find({
        order: { createdAt: 'DESC' }
      });
      return { pdfs };
    } catch (error) {
      throw new HttpException('Failed to list PDFs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async savePdf(file: Express.Multer.File, thumbnail: Express.Multer.File | undefined, title: string, level: PdfLevel) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new HttpException('Only PDF files are allowed', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.onModuleInit();
      const sanitizedFileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(this.uploadDir, sanitizedFileName);
      
      await fs.writeFile(filePath, file.buffer);

      let thumbnailUrl: string | undefined = undefined;
      if (thumbnail) {
        const thumbFileName = `${Date.now()}_thumb_${thumbnail.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const thumbPath = path.join(this.thumbnailDir, thumbFileName);
        await fs.writeFile(thumbPath, thumbnail.buffer);
        thumbnailUrl = `/recursos/thumbnails/${thumbFileName}`;
      }
      
      const newPdf = this.pdfRepository.create({
        title: title || file.originalname,
        filename: sanitizedFileName,
        level: level || PdfLevel.BEGINNER,
        thumbnailUrl: thumbnailUrl ?? undefined,
      });

      const savedPdf = await this.pdfRepository.save(newPdf);

      // Return consistent URL for the PDF
      return {
        success: true,
        file: {
          ...savedPdf,
          url: `/recursos/${sanitizedFileName}`
        }
      };
    } catch (error) {
      console.error('Save PDF Error:', error);
      throw new HttpException('Failed to save PDF', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePdf(id: string) {
    try {
      const pdf = await this.pdfRepository.findOne({ where: { id } });
      if (!pdf) {
        throw new HttpException('PDF not found', HttpStatus.NOT_FOUND);
      }

      // 1. Delete physical files
      const filePath = path.join(this.uploadDir, pdf.filename);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('Physical PDF file not found during deletion');
      }

      if (pdf.thumbnailUrl) {
        const thumbPath = path.join(this.uploadDir, '..', pdf.thumbnailUrl);
        try {
          await fs.unlink(thumbPath);
        } catch (err) {
          console.warn('Physical thumbnail file not found during deletion');
        }
      }
      
      // 2. Cascade delete audio pointers
      await this.audioPointersService.deletePointersForPdf(pdf.filename);

      // 3. Delete from database
      await this.pdfRepository.delete(id);

      return { success: true };
    } catch (error) {
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to delete PDF', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
