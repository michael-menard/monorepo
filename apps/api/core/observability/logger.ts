/**
 * Lambda-optimized logger using @repo/logger
 *
 * This module provides a centralized logger for AWS Lambda functions
 * using the @repo/logger package. The @repo/logger automatically detects
 * Lambda environment and skips pino-pretty (incompatible with Lambda).
 */

import { createLogger as createSimpleLogger, LogLevel } from '@repo/logger'

// Re-export LogLevel for convenience
export { LogLevel }

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
      return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
  }
}

/**
 * Default application logger
 */
export const logger = createSimpleLogger('lego-api-serverless', {
  level: getLogLevel(),
  enableConsole: true,
})

/**
 * Create a context-specific logger
 * @param context - The context name (e.g., 'moc-service', 'gallery-handler')
 */
export const createLogger = (context: string) => {
  return createSimpleLogger(context, {
    level: getLogLevel(),
    enableConsole: true,
  })
}
