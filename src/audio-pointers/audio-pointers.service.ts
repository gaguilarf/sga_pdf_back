import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AudioPointer } from './entities/audio-pointer.entity';

@Injectable()
export class AudioPointersService {
  constructor(
    @InjectRepository(AudioPointer)
    private audioPointerRepository: Repository<AudioPointer>,
    private configService: ConfigService,
  ) {}

  async getPointers(pdfId: string): Promise<AudioPointer[]> {
    return this.audioPointerRepository.find({
      where: { pdfId },
    });
  }

  async savePointers(pdfId: string, pointers: AudioPointer[]): Promise<void> {
    if (!pdfId) {
       throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    }
    
    // In database context, we usually save individual pointers or sync.
    // Given the previous bulk-save behavior, we'll ensure all pointers have the pdfId
    const pointersToSave = pointers.map(p => ({
      ...p,
      pdfId
    }));

    await this.audioPointerRepository.save(pointersToSave);
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
      
      const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3003').replace(/\/$/, '');
      const audioUrl = `${baseUrl}/recursos/audios/${pdfId}/${fileName}`;

      // Update the database record with the new audio path
      await this.audioPointerRepository.update(pointerId, {
        audioPath: audioUrl
      });
      
      return {
        success: true,
        audioUrl: audioUrl
      };
    } catch (error) {
      console.error('Failed to save audio:', error);
      throw new HttpException('Failed to save audio file', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deletePointersForPdf(pdfId: string): Promise<void> {
    // Remove associated audio directory for this PDF entirely
    const pdfAudioDir = path.resolve(__dirname, '..', '..', 'public', 'recursos', 'audios', pdfId);
    try {
      await fs.rm(pdfAudioDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not delete audio directory for PDF ${pdfId}:`, error);
    }

    await this.audioPointerRepository.delete({ pdfId });
  }

  async deleteOnePointer(pdfId: string, pointerId: string): Promise<void> {
    const pointerToDelete = await this.audioPointerRepository.findOne({
      where: { id: pointerId }
    });
    
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

    await this.audioPointerRepository.delete(pointerId);
  }
}
