import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

const logger = new Logger('Bootstrap');

// Prevent unhandled rejections/exceptions from killing the process silently
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection:', String(reason));
});
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception — continuing:', err.stack ?? err.message);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    logger: ['log', 'error', 'warn'],
  });

  // ── Security headers (Helmet) ─────────────────────────────────────────────
  app.use(require('helmet')({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // ── Gzip Compression ──────────────────────────────────────────────────────
  app.use(require('compression')());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // ── Body size limits (PDF uploads + bulk audio) ───────────────────────────
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(require('express').json({ limit: '50mb' }));
  expressApp.use(require('express').urlencoded({ limit: '200mb', extended: true }));

  // ── Global Validation Pipe ────────────────────────────────────────────────
  // Strips unknown fields (whitelist), rejects requests with extra fields,
  // auto-transforms primitive types per DTO decorators.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: false, // don't 400 unknown props — graceful
      transform: true,          // auto-transform types (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ───────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  // Lets TypeORM / Express drain in-flight requests before process exits
  app.enableShutdownHooks();

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('SGA PDF API')
    .setDescription('Documentación de la API para el sistema de PDFs interactivos')
    .setVersion('1.6')
    .addTag('pdfs')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.log(`✅ Application listening on port ${port}`);
  logger.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
