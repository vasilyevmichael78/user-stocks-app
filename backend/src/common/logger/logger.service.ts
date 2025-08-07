import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  [key: string]: any;
}

@Injectable()
export class CustomLoggerService implements LoggerService {
  private context?: string;
  private logLevel: LogLevel;

  constructor(private configService: ConfigService) {
    const envLogLevel = this.configService.get<string>('LOG_LEVEL', 'info').toLowerCase();
    this.logLevel = this.getLogLevelFromString(envLogLevel);
  }

  setContext(context: string): void {
    this.context = context;
  }

  private getLogLevelFromString(level: string): LogLevel {
    switch (level) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(
    level: string,
    message: string,
    context?: string,
    metadata?: LogContext,
    error?: Error
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context || this.context || 'Application';
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      context: contextStr,
      message,
      ...(metadata && { metadata }),
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };

    // In production, return JSON; in development, return formatted string
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    
    if (isDevelopment) {
      const colorMap: Record<string, string> = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[36m',  // Cyan
        DEBUG: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = colorMap[level.toUpperCase()] || '';
      
      return `${color}[${timestamp}] ${level.toUpperCase().padEnd(5)} ${reset}[${contextStr}] ${message}${
        metadata ? `\n   📊 Metadata: ${JSON.stringify(metadata, null, 2)}` : ''
      }${error ? `\n   ❌ Error: ${error.stack}` : ''}`;
    }

    return JSON.stringify(logEntry);
  }

  log(message: string, context?: string): void;
  log(message: string, metadata?: LogContext, context?: string): void;
  log(message: string, contextOrMetadata?: string | LogContext, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const isMetadata = typeof contextOrMetadata === 'object';
    const actualContext = isMetadata ? context : (contextOrMetadata as string);
    const metadata = isMetadata ? (contextOrMetadata as LogContext) : undefined;

    console.log(this.formatMessage('info', message, actualContext, metadata));
  }

  error(message: string, error?: Error, context?: string): void;
  error(message: string, error?: Error, metadata?: LogContext, context?: string): void;
  error(
    message: string,
    errorOrMetadata?: Error | LogContext,
    metadataOrContext?: LogContext | string,
    context?: string
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    let error: Error | undefined;
    let metadata: LogContext | undefined;
    let actualContext: string | undefined;

    if (errorOrMetadata instanceof Error) {
      error = errorOrMetadata;
      if (typeof metadataOrContext === 'object') {
        metadata = metadataOrContext;
        actualContext = context;
      } else {
        actualContext = metadataOrContext as string;
      }
    } else if (typeof errorOrMetadata === 'object') {
      metadata = errorOrMetadata;
      actualContext = metadataOrContext as string;
    } else {
      actualContext = errorOrMetadata as string | undefined;
    }

    console.error(this.formatMessage('error', message, actualContext, metadata, error));
  }

  warn(message: string, context?: string): void;
  warn(message: string, metadata?: LogContext, context?: string): void;
  warn(message: string, contextOrMetadata?: string | LogContext, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const isMetadata = typeof contextOrMetadata === 'object';
    const actualContext = isMetadata ? context : (contextOrMetadata as string);
    const metadata = isMetadata ? (contextOrMetadata as LogContext) : undefined;

    console.warn(this.formatMessage('warn', message, actualContext, metadata));
  }

  debug(message: string, context?: string): void;
  debug(message: string, metadata?: LogContext, context?: string): void;
  debug(message: string, contextOrMetadata?: string | LogContext, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const isMetadata = typeof contextOrMetadata === 'object';
    const actualContext = isMetadata ? context : (contextOrMetadata as string);
    const metadata = isMetadata ? (contextOrMetadata as LogContext) : undefined;

    console.debug(this.formatMessage('debug', message, actualContext, metadata));
  }

  verbose(message: string, context?: string): void {
    this.debug(message, context);
  }

  // Utility methods for structured logging
  logRequest(method: string, url: string, metadata?: LogContext): void {
    this.log(`${method} ${url}`, { 
      type: 'request',
      method,
      url,
      ...metadata 
    }, 'HTTP');
  }

  logResponse(method: string, url: string, statusCode: number, responseTime: number, metadata?: LogContext): void {
    const level = statusCode >= 400 ? 'warn' : 'log';
    this[level](`${method} ${url} ${statusCode} - ${responseTime}ms`, {
      type: 'response',
      method,
      url,
      statusCode,
      responseTime,
      ...metadata
    }, 'HTTP');
  }

  logDatabaseQuery(operation: string, collection: string, duration: number, metadata?: LogContext): void {
    this.debug(`DB ${operation} on ${collection} - ${duration}ms`, {
      type: 'database',
      operation,
      collection,
      duration,
      ...metadata
    }, 'Database');
  }

  logExternalApi(service: string, endpoint: string, duration: number, statusCode?: number, metadata?: LogContext): void {
    const level = statusCode && statusCode >= 400 ? 'warn' : 'log';
    this[level](`External API ${service} ${endpoint} - ${duration}ms`, {
      type: 'external_api',
      service,
      endpoint,
      duration,
      statusCode,
      ...metadata
    }, 'ExternalAPI');
  }

  logSecurityEvent(event: string, metadata?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      type: 'security',
      event,
      ...metadata
    }, 'Security');
  }

  logBusinessEvent(event: string, metadata?: LogContext): void {
    this.log(`Business Event: ${event}`, {
      type: 'business',
      event,
      ...metadata
    }, 'Business');
  }
}
