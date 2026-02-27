import { Controller, Get, Post, Param, Body, HttpException, HttpStatus, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioPointersService, AudioPointer } from './audio-pointers.service';

@Controller('audio-pointers')
export class AudioPointersController {
  constructor(private readonly audioPointersService: AudioPointersService) {}

  @Get(':pdfId')
  async getPointers(@Param('pdfId') pdfId: string) {
    if (!pdfId) throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    const pointers = await this.audioPointersService.getPointers(pdfId);
    return { pointers };
  }

  @Post(':pdfId')
  async savePointers(@Param('pdfId') pdfId: string, @Body() body: { pointers: AudioPointer[] }) {
    if (!pdfId) throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    if (!body || !Array.isArray(body.pointers)) {
        throw new HttpException('Invalid pointers array', HttpStatus.BAD_REQUEST);
    }
    
    await this.audioPointersService.savePointers(pdfId, body.pointers);
    return { success: true };
  }

  @Post(':pdfId/audio/:pointerId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPointerAudio(
    @Param('pdfId') pdfId: string,
    @Param('pointerId') pointerId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }
    return this.audioPointersService.saveAudioFile(pdfId, pointerId, file);
  }

  @Post(':pdfId/delete/:pointerId') // Using POST for easier dev-test if needed, but DELETE is better
  async deletePointer(
    @Param('pdfId') pdfId: string,
    @Param('pointerId') pointerId: string,
  ) {
    await this.audioPointersService.deleteOnePointer(pdfId, pointerId);
    return { success: true };
  }
}
