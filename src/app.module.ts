import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfsModule } from './pdfs/pdfs.module';
import { AudioPointersModule } from './audio-pointers/audio-pointers.module';
import { AudioPointer } from './audio-pointers/entities/audio-pointer.entity';
import { Pdf } from './pdfs/entities/pdf.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USER', 'payxiohs_deployer2'),
        password: configService.get<string>('DB_PASS', 'brittanyDev512'),
        database: configService.get<string>('DB_NAME', 'payxiohs_ebook_brittany'),
        entities: [AudioPointer, Pdf],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
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
