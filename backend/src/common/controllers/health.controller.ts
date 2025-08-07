import { Controller, Get } from '@nestjs/common';
import { CustomLoggerService } from '../logger/logger.service';
import { PerformanceInterceptor } from '../interceptors/performance.interceptor';
import { NoLogging } from '../decorators/logging.decorators';

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  performance?: Record<string, any>;
  version?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly logger: CustomLoggerService,
    private readonly performanceInterceptor: PerformanceInterceptor,
  ) {
    this.logger.setContext('HealthController');
  }

  @Get()
  @NoLogging() // Don't log health check requests to avoid noise
  getHealth(): HealthStatus {
    const memoryUsage = process.memoryUsage();
    
    const health: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memoryUsage,
      performance: this.performanceInterceptor.getPerformanceStats(),
      version: process.env.npm_package_version || '1.0.0',
    };

    // Log health check with memory usage
    this.logger.debug('Health check performed', {
      type: 'health_check',
      uptime: health.uptime,
      memoryUsage: {
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        rss: this.formatBytes(memoryUsage.rss),
        external: this.formatBytes(memoryUsage.external),
      },
    });

    return health;
  }

  @Get('metrics')
  @NoLogging()
  getMetrics(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      performance: this.performanceInterceptor.getPerformanceStats(),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  @Get('reset-metrics')
  resetMetrics(): { message: string } {
    this.performanceInterceptor.resetStats();
    this.logger.log('Performance metrics reset via health endpoint');
    
    return { message: 'Performance metrics reset successfully' };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
