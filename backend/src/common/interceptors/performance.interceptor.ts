import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CustomLoggerService } from '../logger/logger.service';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
  statusCode?: number;
  userId?: string;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly slowRequestThreshold: number = 1000; // 1 second
  private readonly memoryLeakThreshold: number = 100 * 1024 * 1024; // 100MB

  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('PerformanceInterceptor');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    return next.handle().pipe(
      tap({
        next: () => this.logPerformanceMetrics(request, startTime, startMemory),
        error: () => this.logPerformanceMetrics(request, startTime, startMemory, true),
      }),
    );
  }

  private logPerformanceMetrics(
    request: Request,
    startTime: bigint,
    startMemory: NodeJS.MemoryUsage,
    isError: boolean = false
  ): void {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      endpoint: request.url,
      method: request.method,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      memoryUsage: endMemory,
      timestamp: new Date().toISOString(),
      userId: (request as any).user?.id,
    };

    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      this.logger.warn(
        `Slow request detected: ${request.method} ${request.url} took ${metrics.duration}ms`,
        {
          ...metrics,
          type: 'slow_request',
          threshold: this.slowRequestThreshold,
        }
      );
    }

    // Log memory usage warnings
    const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
    if (memoryIncrease > this.memoryLeakThreshold) {
      this.logger.warn(
        `High memory usage detected: ${request.method} ${request.url} used ${this.formatBytes(memoryIncrease)}`,
        {
          ...metrics,
          type: 'high_memory_usage',
          memoryIncrease: this.formatBytes(memoryIncrease),
          threshold: this.formatBytes(this.memoryLeakThreshold),
        }
      );
    }

    // Log general performance metrics for debugging
    this.logger.debug(
      `Performance: ${request.method} ${request.url} - ${metrics.duration}ms`,
      {
        ...metrics,
        type: 'performance',
        memoryStats: {
          heapUsed: this.formatBytes(endMemory.heapUsed),
          heapTotal: this.formatBytes(endMemory.heapTotal),
          external: this.formatBytes(endMemory.external),
          rss: this.formatBytes(endMemory.rss),
        },
      }
    );

    // Log aggregated stats every 100 requests (optional)
    this.logAggregatedStats(request.url, metrics.duration);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private requestStats = new Map<string, { count: number; totalTime: number; minTime: number; maxTime: number }>();

  private logAggregatedStats(endpoint: string, duration: number): void {
    const stats = this.requestStats.get(endpoint) || {
      count: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
    };

    stats.count++;
    stats.totalTime += duration;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);

    this.requestStats.set(endpoint, stats);

    // Log aggregated stats every 100 requests for this endpoint
    if (stats.count % 100 === 0) {
      const avgTime = stats.totalTime / stats.count;
      
      this.logger.log(
        `Aggregated stats for ${endpoint}`,
        {
          type: 'aggregated_stats',
          endpoint,
          count: stats.count,
          averageTime: Math.round(avgTime * 100) / 100,
          minTime: Math.round(stats.minTime * 100) / 100,
          maxTime: Math.round(stats.maxTime * 100) / 100,
        }
      );
    }
  }

  // Method to get current stats (useful for health checks)
  getPerformanceStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [endpoint, data] of this.requestStats.entries()) {
      stats[endpoint] = {
        ...data,
        averageTime: data.count > 0 ? Math.round((data.totalTime / data.count) * 100) / 100 : 0,
      };
    }
    
    return stats;
  }

  // Method to reset stats
  resetStats(): void {
    this.requestStats.clear();
    this.logger.log('Performance stats reset');
  }
}
