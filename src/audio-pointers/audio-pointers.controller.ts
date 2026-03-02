import { Controller, Get, Post, Param, Body, HttpException, HttpStatus, UploadedFile, UploadedFiles, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

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

  /**
   * ONE-SHOT MIGRATION endpoint — call once to shift all pointer positions.
   * xDelta / yDelta: percentage to add to each pointer's x / y (can be negative).
   * Example: POST /audio-pointers/migrate/add-centering-offset { "xDelta": 1.41, "yDelta": 1.41 }
   */
  @Post('migrate/add-centering-offset')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
  async migrateCenteringOffset(@Body() body: { xDelta: number; yDelta: number }) {
    const xDelta = Number(body?.xDelta ?? 0);
    const yDelta = Number(body?.yDelta ?? 0);
    return this.audioPointersService.migrateAddCenteringOffset(xDelta, yDelta);
  }

  /**
   * Returns all pointers for a PDF sorted by the canonical order:
   *   page ASC → left column (x<30) by y ASC → right column (x>=30) by y ASC
   */
  @Get(':pdfId/sorted')
  async getSortedPointers(@Param('pdfId') pdfId: string) {
    if (!pdfId) throw new HttpException('pdfId is required', HttpStatus.BAD_REQUEST);
    const all = await this.audioPointersService.getPointers(pdfId);
    const sorted = this.audioPointersService.getSortedPointers(all);
    return { pointers: sorted };
  }

  /**
   * Bulk-assigns audio files to pointers in order.
   * Body: multipart/form-data with files[] + pointerIds (JSON string array)
   */
  @Post(':pdfId/bulk-assign')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
  @UseInterceptors(FilesInterceptor('files', 500, { limits: { fileSize: 50 * 1024 * 1024 } }))
  async bulkAssignAudios(
    @Param('pdfId') pdfId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('pointerIds') pointerIdsRaw: string,
  ) {
    if (!files?.length) throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    
    // Sort files by originalname to ensure deterministic order (1.mp3, 2.mp3, etc.)
    const sortedFiles = [...files].sort((a, b) => 
      a.originalname.localeCompare(b.originalname, undefined, { numeric: true, sensitivity: 'base' })
    );

    const pointerIds: string[] = JSON.parse(pointerIdsRaw);
    return this.audioPointersService.bulkAssignAudios(pdfId, pointerIds, sortedFiles);
  }
}


