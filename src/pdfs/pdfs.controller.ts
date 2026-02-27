import { Controller, Get, Post, UploadedFile, UseInterceptors, HttpException, HttpStatus, Delete, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfsService } from './pdfs.service';

@Controller('pdfs')
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get()
  async getPdfs() {
    return this.pdfsService.listPdfs();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }
    return this.pdfsService.savePdf(file);
  }

  @Delete(':filename')
  async deletePdf(@Param('filename') filename: string) {
    return this.pdfsService.deletePdf(filename);
  }
}
