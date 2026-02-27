import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface AudioPointer {
  id: string;
  x: number;
  y: number;
  page: number; // Support for pagination
  audioPath: string | null;
}

@Injectable()
export class AudioPointersService {
  private readonly dbPath = path.resolve(__dirname, '../../..', 'audio-pointers.json');

  async onModuleInit() {
    try {
      // Create empty db file if it doesn't exist
      try {
        await fs.access(this.dbPath);
      } catch {
        await fs.writeFile(this.dbPath, JSON.stringify({}), 'utf-8');
      }
    } catch (error) {
      console.error('Failed to initialize audio pointers DB:', error);
    }
  }

  private async readDb(): Promise<Record<string, AudioPointer[]>> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  private async writeDb(data: Record<string, AudioPointer[]>): Promise<void> {
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getPointers(pdfId: string): Promise<AudioPointer[]> {
    const db = await this.readDb();
    return db[pdfId] || [];
  }

  async savePointers(pdfId: string, pointers: AudioPointer[]): Promise<void> {
    if (!pdfId) {
       throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    }
    const db = await this.readDb();
    db[pdfId] = pointers;
    await this.writeDb(db);
  }

  async saveAudioFile(pdfId: string, pointerId: string, file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No audio file uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      // Ensure specific audios directory exists in backend public folder, nested by pdfId
      const audioDir = path.resolve(__dirname, '..', '..', 'public', 'recursos', 'audios', pdfId);
      await fs.mkdir(audioDir, { recursive: true });

      // Clean file extension, enforce .mp3 or similar based on original
      const ext = path.extname(file.originalname) || '.mp3';
      const fileName = `pointer_${pointerId}${ext}`;
      const filePath = path.join(audioDir, fileName);
      
      await fs.writeFile(filePath, file.buffer);
      
      return {
        success: true,
        // Host it natively on the backend under the /recursos alias
        audioUrl: `http://localhost:3002/recursos/audios/${pdfId}/${fileName}`
      };
    } catch (error) {
      console.error('Failed to save audio:', error);
      throw new HttpException('Failed to save audio file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePointersForPdf(pdfId: string): Promise<void> {
    const db = await this.readDb();
    const pointers = db[pdfId];
    if (!pointers) return;

    // Remove associated audio directory for this PDF entirely
    const pdfAudioDir = path.resolve(__dirname, '..', '..', 'public', 'recursos', 'audios', pdfId);
    try {
      await fs.rm(pdfAudioDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not delete audio directory for PDF ${pdfId}:`, error);
    }

    delete db[pdfId];
    await this.writeDb(db);
  }

  async deleteOnePointer(pdfId: string, pointerId: string): Promise<void> {
    const db = await this.readDb();
    const pointers = db[pdfId] || [];
    
    const pointerToDelete = pointers.find(p => p.id === pointerId);
    
    if (pointerToDelete?.audioPath) {
      try {
        // Extract fileName from URL
        const fileName = pointerToDelete.audioPath.split('/').pop();
        if (fileName) {
          const filePath = path.resolve(__dirname, '..', '..', 'public', 'recursos', 'audios', pdfId, fileName);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to delete audio file during pointer removal:', error);
      }
    }

    db[pdfId] = pointers.filter(p => p.id !== pointerId);
    await this.writeDb(db);
  }
}
