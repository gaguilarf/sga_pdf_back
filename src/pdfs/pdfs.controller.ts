import { Controller, Get, Post, UploadedFiles, UseInterceptors, HttpException, HttpStatus, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PdfsService } from './pdfs.service';
import { PdfLevel } from './entities/pdf.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('pdfs')
@Controller('pdfs')
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get()
  async getPdfs() {
    return this.pdfsService.listPdfs();
  }

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('developer')
  async deletePdf(@Param('id') id: string) {
    return this.pdfsService.deletePdf(id);
  }
}

