import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioPointersController } from './audio-pointers.controller';
import { AudioPointersService } from './audio-pointers.service';
import { AudioPointer } from './entities/audio-pointer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AudioPointer])],
  controllers: [AudioPointersController],
  providers: [AudioPointersService],
  exports: [AudioPointersService]
})
export class AudioPointersModule {}
