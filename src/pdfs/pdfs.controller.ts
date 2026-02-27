import { Controller, Get, Post, UploadedFiles, UseInterceptors, HttpException, HttpStatus, Delete, Param, Body } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PdfsService } from './pdfs.service';
import { PdfLevel } from './entities/pdf.entity';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('pdfs')
@Controller('pdfs')
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get()
  async getPdfs() {
    return this.pdfsService.listPdfs();
  }

  @Post('upload')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]))
  async uploadPdf(
    @UploadedFiles() files: { file?: Express.Multer.File[], thumbnail?: Express.Multer.File[] },
    @Body('title') title: string,
    @Body('level') level: PdfLevel
  ) {
    const pdfFile = files.file?.[0];
    const thumbFile = files.thumbnail?.[0];
    
    if (!pdfFile) {
      throw new HttpException('No PDF file provided', HttpStatus.BAD_REQUEST);
    }
    
    return this.pdfsService.savePdf(pdfFile, thumbFile, title, level);
  }

  @Delete(':id')
  async deletePdf(@Param('id') id: string) {
    return this.pdfsService.deletePdf(id);
  }
}
