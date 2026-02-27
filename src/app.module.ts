import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfsModule } from './pdfs/pdfs.module';
import { AudioPointersModule } from './audio-pointers/audio-pointers.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Serve out of sga_pdf_back/public
    }),
    PdfsModule, 
    AudioPointersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
