/**
 * Lambda-optimized logger using @repo/logger
 *
 * This module provides a centralized logger for AWS Lambda functions
 * using the @repo/logger package. For Lambda, we use simple JSON output
 * instead of pino-pretty since CloudWatch Logs handles formatting.
 */

import {
  createLogger as createSimpleLogger,
  LogLevel,
  SimpleLogger as BaseLogger,
} from '@repo/logger'

// Determine log level from environment
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase()

  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG
    case 'INFO':
      return LogLevel.INFO
    case 'WARN':
      return LogLevel.WARN
    case 'ERROR':
      return LogLevel.ERROR
    default:
      // Default to INFO in production, DEBUG in development
      return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
  }
}

/**
 * Helper to convert unknown error to Error instance
 */
const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string') {
    return new Error(error)
  }
  return new Error(String(error))
}

/**
 * Lambda logger wrapper that handles unknown error types
 */
class LambdaLogger {
  constructor(private baseLogger: BaseLogger) {}

  debug(message: string, ...args: unknown[]): void {
    this.baseLogger.debug(message, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    this.baseLogger.info(message, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.baseLogger.warn(message, ...args)
  }

  /**
   * Log an error, automatically converting unknown types to Error
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (error !== undefined) {
      this.baseLogger.error(message, toError(error), ...args)
    } else {
      this.baseLogger.error(message, undefined, ...args)
    }
  }

  setLevel(level: LogLevel): void {
    this.baseLogger.setLevel(level)
  }

  setContext(context: string): void {
    this.baseLogger.setContext(context)
  }
}

/**
 * Default application logger
 */
export const logger = new LambdaLogger(
  createSimpleLogger('lego-api-serverless', {
    level: getLogLevel(),
    enableConsole: true, // CloudWatch captures console output
  }),
)

/**
 * Create a context-specific logger
 * @param context - The context name (e.g., 'moc-service', 'gallery-handler')
 */
export const createLogger = (context: string) => {
  return new LambdaLogger(
    createSimpleLogger(context, {
      level: getLogLevel(),
      enableConsole: true,
    }),
  )
}

// Export log level enum for convenience
export { LogLevel }
