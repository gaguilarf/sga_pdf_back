import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AudioPointersService } from '../audio-pointers/audio-pointers.service';

@Injectable()
export class PdfsService {
  // Point to the backend's own public/recursos directory
  private readonly uploadDir = path.resolve(__dirname, '..', '..', 'public', 'recursos');

  constructor(private readonly audioPointersService: AudioPointersService) {}

  async onModuleInit() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async listPdfs() {
    try {
      await this.onModuleInit(); // Ensure dir exists
      const files = await fs.readdir(this.uploadDir);
      
      const pdfs = files
        .filter((file) => file.toLowerCase().endsWith('.pdf'))
        .map((file) => ({
          name: file,
          url: `/recursos/${file}`, // The frontend serves this via its public folder
        }));
        
      return { pdfs };
    } catch (error) {
      throw new HttpException('Failed to list PDFs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async savePdf(file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new HttpException('Only PDF files are allowed', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.onModuleInit();
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const filePath = path.join(this.uploadDir, sanitizedFileName);
      
      await fs.writeFile(filePath, file.buffer);
      
      return {
        success: true,
         file: {
          name: sanitizedFileName,
          url: `/recursos/${sanitizedFileName}`,
        }
      };
    } catch (error) {
      throw new HttpException('Failed to save PDF', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePdf(filename: string) {
    try {
      // 1. Delete physical file
      const filePath = path.join(this.uploadDir, filename);
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (err) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      
      // 2. Cascade delete audio pointers
      await this.audioPointersService.deletePointersForPdf(filename);

      return { success: true };
    } catch (error) {
       if (error instanceof HttpException) throw error;
       throw new HttpException('Failed to delete PDF', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
