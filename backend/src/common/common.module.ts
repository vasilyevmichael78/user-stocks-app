import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomLoggerService } from './logger/logger.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [
    CustomLoggerService,
    GlobalExceptionFilter,
    HttpExceptionFilter,
    ValidationExceptionFilter,
    LoggingInterceptor,
    PerformanceInterceptor,
  ],
  exports: [
    CustomLoggerService,
    GlobalExceptionFilter,
    HttpExceptionFilter,
    ValidationExceptionFilter,
    LoggingInterceptor,
    PerformanceInterceptor,
  ],
})
export class CommonModule {}
