import { Module } from '@nestjs/common';
import { AudioPointersController } from './audio-pointers.controller';
import { AudioPointersService } from './audio-pointers.service';

@Module({
  controllers: [AudioPointersController],
  providers: [AudioPointersService],
  exports: [AudioPointersService]
})
export class AudioPointersModule {}
