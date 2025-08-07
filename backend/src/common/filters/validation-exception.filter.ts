import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('ValidationExceptionFilter');
  }

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Validation failed',
      errors: this.formatValidationErrors(exceptionResponse.message),
      requestId: response.getHeader('X-Request-ID'),
    };

    this.logger.warn(
      `Validation failed for ${request.method} ${request.url}`,
      {
        statusCode: status,
        errors: errorResponse.errors,
        body: request.body,
        query: request.query,
        params: request.params,
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
      }
    );

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(errors: string | string[]): any[] {
    if (typeof errors === 'string') {
      return [{ message: errors }];
    }

    return errors.map(error => {
      // Parse class-validator error format
      const match = error.match(/^(\w+) (.+)$/);
      if (match) {
        return {
          field: match[1],
          message: match[2],
        };
      }
      
      return { message: error };
    });
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
