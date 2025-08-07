import { SetMetadata } from '@nestjs/common';

// Decorator to exclude endpoints from logging
export const NO_LOGGING = 'no_logging';
export const NoLogging = () => SetMetadata(NO_LOGGING, true);

// Decorator to mark sensitive endpoints for enhanced security logging
export const SENSITIVE_ENDPOINT = 'sensitive_endpoint';
export const SensitiveEndpoint = () => SetMetadata(SENSITIVE_ENDPOINT, true);

// Decorator to set custom log context
export const LOG_CONTEXT = 'log_context';
export const LogContext = (context: string) => SetMetadata(LOG_CONTEXT, context);

// Decorator to enable performance monitoring for specific endpoints
export const MONITOR_PERFORMANCE = 'monitor_performance';
export const MonitorPerformance = (threshold?: number) => SetMetadata(MONITOR_PERFORMANCE, threshold || 1000);

// Decorator to log business events
export const BUSINESS_EVENT = 'business_event';
export const BusinessEvent = (eventName: string) => SetMetadata(BUSINESS_EVENT, eventName);
