import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('LoggingInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = this.getClientIp(request);
    const userId = (request as any).user?.id;
    
    const startTime = Date.now();
    
    // Generate request ID if not present
    const requestId = headers['x-request-id'] as string || this.generateRequestId();
    response.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logger.logRequest(method, url, {
      requestId,
      ip,
      userAgent,
      userId,
      body: this.sanitizeBody(body),
      query,
      params,
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // Log successful response
          this.logger.logResponse(method, url, statusCode, responseTime, {
            requestId,
            ip,
            userAgent,
            userId,
            responseSize: this.getResponseSize(data),
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          
          // Log error response
          this.logger.logResponse(method, url, statusCode, responseTime, {
            requestId,
            ip,
            userAgent,
            userId,
            error: error.message,
          });
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'refresh_token',
      'access_token',
      'api_key',
      'apiKey',
      'privateKey',
      'secretKey',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getResponseSize(data: any): number {
    if (!data) return 0;
    
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }
}
