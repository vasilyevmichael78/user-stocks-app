import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { CustomLoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until custom logger is ready
  });

  // Get custom logger service
  const logger = app.get(CustomLoggerService);
  logger.setContext('Bootstrap');
  
  // Use custom logger
  app.useLogger(logger);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`📊 Health check available at: http://localhost:${port}/api/health`);
  logger.log(`📈 Metrics available at: http://localhost:${port}/api/health/metrics`);
  
  // Log application startup
  logger.logBusinessEvent('application_started', {
    port,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  });
}

bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
