import { Controller, Get, Post, Param, Body, HttpException, HttpStatus, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioPointersService } from './audio-pointers.service';
import { AudioPointer } from './entities/audio-pointer.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('audio-pointers')
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
  async savePointers(@Param('pdfId') pdfId: string, @Body() body: { pointers: AudioPointer[] }) {
    if (!pdfId) throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    if (!body || !Array.isArray(body.pointers)) {
        throw new HttpException('Invalid pointers array', HttpStatus.BAD_REQUEST);
    }
    
    await this.audioPointersService.savePointers(pdfId, body.pointers);
    return { success: true };
  }

  @Post(':pdfId/audio/:pointerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
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

  @Post(':pdfId/delete/:pointerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
  async deletePointer(
    @Param('pdfId') pdfId: string,
    @Param('pointerId') pointerId: string,
  ) {
    await this.audioPointersService.deleteOnePointer(pdfId, pointerId);
    return { success: true };
  }
}

