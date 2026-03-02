import { Module, OnModuleInit } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfsModule } from './pdfs/pdfs.module';
import { AudioPointersModule } from './audio-pointers/audio-pointers.module';
import { AudioPointer } from './audio-pointers/entities/audio-pointer.entity';
import { Pdf } from './pdfs/entities/pdf.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { UsersService } from './users/users.service';
import { MonitorModule } from './monitor/monitor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 minuto
        limit: 100,  // 100 requests/min (público es más liviano de lo que parece)
      },
    ]),
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
        entities: [AudioPointer, Pdf, User],
        // NEVER synchronize in production — use migrations instead
        synchronize: configService.get<string>('NODE_ENV', 'development') !== 'production',
        // Connection pool tuning
        extra: {
          connectionLimit: 10,
        },
        logging: configService.get<string>('NODE_ENV', 'development') === 'development'
          ? ['error', 'warn']
          : false,
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveStaticOptions: {
        setHeaders: (res) => {
          res.set('Access-Control-Allow-Origin', '*');
          res.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
          res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
          res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
        },
      },
    }),
    AuthModule,
    UsersModule,
    PdfsModule,
    AudioPointersModule,
    MonitorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    await this.usersService.seedUsers();
  }
}
