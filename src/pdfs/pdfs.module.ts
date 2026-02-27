import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { AudioPointersModule } from '../audio-pointers/audio-pointers.module';
import { Pdf } from './entities/pdf.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pdf]),
    AudioPointersModule
  ],
  controllers: [PdfsController],
  providers: [PdfsService]
})
export class PdfsModule {}
