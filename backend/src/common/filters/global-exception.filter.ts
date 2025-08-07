import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../logger/logger.service';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  requestId?: string;
  details?: any;
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('GlobalExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let status: number;
    let message: string | string[];
    let error: string;
    let details: any;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
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
    } else if (exception instanceof MongoError) {
      status = this.getMongoErrorStatus(exception);
      message = this.getMongoErrorMessage(exception);
      error = 'DatabaseError';
      details = {
        code: exception.code,
        codeName: (exception as any).codeName,
      };
    } else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors).map(err => err.message);
      error = 'ValidationError';
      details = exception.errors;
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ${exception.path}: ${exception.value}`;
      error = 'CastError';
      details = {
        path: exception.path,
        value: exception.value,
        kind: exception.kind,
      };
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || 'Internal server error';
      error = exception.name || 'InternalServerError';
      
      // Add stack trace in development
      if (process.env.NODE_ENV === 'development') {
        details = { stack: exception.stack };
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      error = 'UnknownError';
      details = { exception: String(exception) };
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp,
      path,
      method,
      message,
      error,
      requestId,
      ...(details && { details }),
    };

    // Log the error with appropriate level
    const logMessage = `${method} ${path} - ${status} - ${message}`;
    const logMetadata = {
      requestId,
      statusCode: status,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      userId: (request as any).user?.id,
      body: this.sanitizeRequestBody(request.body),
      query: request.query,
      params: request.params,
    };

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception : undefined,
        logMetadata
      );
    } else {
      this.logger.warn(logMessage, logMetadata);
    }

    // Send response
    response.status(status).json(errorResponse);
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

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getMongoErrorStatus(error: MongoError): number {
    switch (error.code) {
      case 11000: // Duplicate key
        return HttpStatus.CONFLICT;
      case 11001: // Duplicate key
        return HttpStatus.CONFLICT;
      case 12582: // Tailable cursor error
        return HttpStatus.BAD_REQUEST;
      case 13: // Unauthorized
        return HttpStatus.UNAUTHORIZED;
      case 18: // Authentication failed
        return HttpStatus.UNAUTHORIZED;
      case 20: // Invalid namespace
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private getMongoErrorMessage(error: MongoError): string {
    switch (error.code) {
      case 11000:
      case 11001:
        const duplicateField = this.extractDuplicateField(error.message);
        return `${duplicateField} already exists`;
      case 12582:
        return 'Invalid cursor operation';
      case 13:
      case 18:
        return 'Authentication failed';
      case 20:
        return 'Invalid database operation';
      default:
        return error.message || 'Database operation failed';
    }
  }

  private extractDuplicateField(errorMessage: string): string {
    const match = errorMessage.match(/dup key: { (\w+):/);
    return match ? match[1] : 'Resource';
  }
}
