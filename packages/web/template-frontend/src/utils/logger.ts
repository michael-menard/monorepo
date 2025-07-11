import winston from 'winston';

// Custom format for browser console
const browserFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const createLogger = (level: string = 'info') => {
  const logger = winston.createLogger({
    level,
    format: browserFormat,
    transports: [
      // Console transport for browser
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });

  return logger;
};

// Default logger instance
export const logger = createLogger();

// Logger with different levels
export const debugLogger = createLogger('debug');
export const infoLogger = createLogger('info');
export const warnLogger = createLogger('warn');
export const errorLogger = createLogger('error');

// Utility functions for common logging patterns
export const logUserAction = (action: string, details?: any) => {
  logger.info('User Action', { action, details, timestamp: new Date().toISOString() });
};

export const logError = (error: Error, context?: string) => {
  logger.error('Application Error', { 
    error: error.message, 
    stack: error.stack, 
    context,
    timestamp: new Date().toISOString() 
  });
};

export const logSecurityEvent = (event: string, details?: any) => {
  logger.warn('Security Event', { 
    event, 
    details, 
    timestamp: new Date().toISOString() 
  });
};

export const logPerformance = (operation: string, duration: number) => {
  logger.info('Performance', { 
    operation, 
    duration, 
    timestamp: new Date().toISOString() 
  });
};

// Export types
export type { Logger } from 'winston'; 