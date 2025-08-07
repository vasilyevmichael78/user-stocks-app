import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;
    let details: any;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error || exception.name;
      details = (exceptionResponse as any).details;
    } else {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      requestId: response.getHeader('X-Request-ID'),
      ...(details && { details }),
    };

    // Log with appropriate level based on status code
    if (status >= 500) {
      this.logger.error(
        `HTTP Exception: ${request.method} ${request.url} - ${status} - ${message}`,
        exception,
        {
          statusCode: status,
          ip: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
          userId: (request as any).user?.id,
        }
      );
    } else if (status >= 400) {
      this.logger.warn(
        `HTTP Exception: ${request.method} ${request.url} - ${status} - ${message}`,
        {
          statusCode: status,
          ip: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
          userId: (request as any).user?.id,
        }
      );
    }

    response.status(status).json(errorResponse);
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
