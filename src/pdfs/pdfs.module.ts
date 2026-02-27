import { Module } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { AudioPointersModule } from '../audio-pointers/audio-pointers.module';

@Module({
  imports: [AudioPointersModule],
  controllers: [PdfsController],
  providers: [PdfsService]
})
export class PdfsModule {}
