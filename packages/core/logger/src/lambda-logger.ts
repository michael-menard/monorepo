/**
 * Lambda-optimized structured logger
 *
 * Provides structured JSON logging for AWS Lambda functions with:
 * - Pure JSON output (no pretty-printing) for CloudWatch Logs
 * - Request correlation ID tracking
 * - X-Ray trace ID integration
 * - Lambda-specific context fields
 * - Efficient performance for Lambda cold starts
 *
 * Usage:
 * ```typescript
 * import { createLambdaLogger } from '@repo/logger'
 *
 * const logger = createLambdaLogger('my-function', {
 *   requestId: event.requestContext.requestId,
 *   traceId: process.env._X_AMZN_TRACE_ID,
 * })
 *
 * logger.info('Processing request', { userId: '123', action: 'get' })
 * ```
 */

import pino from 'pino'
import { LogLevel } from './types'

/**
 * Lambda log context - fields automatically added to every log entry
 */
export interface LambdaLogContext {
  /** AWS Request ID from Lambda context */
  requestId?: string
  /** Correlation ID for request tracing */
  correlationId?: string
  /** X-Ray trace ID */
  traceId?: string
  /** User ID from JWT/authentication */
  userId?: string
  /** Lambda function name */
  functionName?: string
  /** HTTP method (GET, POST, etc.) */
  method?: string
  /** API path */
  path?: string
  /** Additional custom context */
  [key: string]: unknown
}

/**
 * Lambda logger configuration
 */
export interface LambdaLoggerConfig {
  /** Log level */
  level?: LogLevel
  /** Logger context/name */
  context?: string
  /** Base log context (added to all log entries) */
  baseContext?: LambdaLogContext
  /** Enable JSON output (default: true for Lambda) */
  json?: boolean
}

/**
 * Lambda-optimized structured logger
 */
export class LambdaLogger {
  private pinoLogger: pino.Logger
  private baseContext: LambdaLogContext

  constructor(config: LambdaLoggerConfig = {}) {
    this.baseContext = config.baseContext || {}

    // Create Pino logger with pure JSON output (no pretty-printing)
    this.pinoLogger = pino({
      level: this.getPinoLevel(config.level || LogLevel.INFO),
      // Pure JSON output for CloudWatch Logs
      ...(config.json !== false && {
        formatters: {
          level: (label: string) => {
            return { level: label.toUpperCase() }
          },
        },
      }),
      // Base fields added to every log entry
      base: {
        ...(config.context && { context: config.context }),
        ...(process.env.AWS_LAMBDA_FUNCTION_NAME && {
          functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        }),
        ...(process.env.AWS_REGION && { region: process.env.AWS_REGION }),
      },
      // Timestamp in ISO format
      timestamp: pino.stdTimeFunctions.isoTime,
    })
  }

  private getPinoLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'debug'
      case LogLevel.INFO:
        return 'info'
      case LogLevel.WARN:
        return 'warn'
      case LogLevel.ERROR:
        return 'error'
      default:
        return 'info'
    }
  }

  /**
   * Merge base context with additional context
   */
  private mergeContext(additionalContext?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...this.baseContext,
      ...additionalContext,
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.debug(this.mergeContext(context), message)
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.info(this.mergeContext(context), message)
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.pinoLogger.warn(this.mergeContext(context), message)
  }

  /**
   * Log error message
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const baseContext = this.mergeContext(context)
    let errorContext: Record<string, unknown> = baseContext

    if (error) {
      const errorInfo =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : { message: String(error), name: 'UnknownError' }
      errorContext = { ...baseContext, error: errorInfo }
    }

    this.pinoLogger.error(errorContext, message)
  }

  /**
   * Update base context (e.g., add userId after authentication)
   */
  setContext(context: Partial<LambdaLogContext>): void {
    this.baseContext = {
      ...this.baseContext,
      ...context,
    }
  }

  /**
   * Get current base context
   */
  getContext(): LambdaLogContext {
    return { ...this.baseContext }
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.pinoLogger.level = this.getPinoLevel(level)
  }

  /**
   * Create child logger with additional context
   */
  child(context: Partial<LambdaLogContext>): LambdaLogger {
    const childLogger = new LambdaLogger({
      level: LogLevel.INFO, // Will inherit from parent
      baseContext: {
        ...this.baseContext,
        ...context,
      },
    })
    childLogger.pinoLogger = this.pinoLogger.child(context)
    return childLogger
  }
}

/**
 * Create a Lambda-optimized structured logger
 *
 * @param context - Logger context/name
 * @param baseContext - Base context added to all log entries
 * @returns Lambda logger instance
 *
 * @example
 * ```typescript
 * const logger = createLambdaLogger('moc-service', {
 *   requestId: event.requestContext.requestId,
 *   correlationId: generateCorrelationId(),
 * })
 *
 * logger.info('Processing MOC request', { mocId: '123' })
 * ```
 */
export function createLambdaLogger(context: string, baseContext?: LambdaLogContext): LambdaLogger {
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

  return new LambdaLogger({
    level: getLogLevel(),
    context,
    baseContext,
    json: true, // Always JSON for Lambda
  })
}

/**
 * Generate a correlation ID for request tracing
 *
 * Format: {timestamp}-{random}
 * Example: 1234567890123-a1b2c3d4
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Extract X-Ray trace ID from environment
 *
 * @returns X-Ray trace ID or undefined if not available
 */
export function getXRayTraceId(): string | undefined {
  const traceHeader = process.env._X_AMZN_TRACE_ID
  if (!traceHeader) {
    return undefined
  }

  // Parse X-Ray trace header: Root=1-5e645f3e-1234567890abcdef;Parent=abcdef1234567890;Sampled=1
  const rootMatch = traceHeader.match(/Root=([^;]+)/)
  return rootMatch ? rootMatch[1] : undefined
}

/**
 * Extract correlation ID from API Gateway event headers
 *
 * Looks for: X-Correlation-ID, x-correlation-id, correlationId
 *
 * @param headers - API Gateway event headers
 * @returns Correlation ID from headers or undefined
 */
export function extractCorrelationId(
  headers?: Record<string, string | undefined>,
): string | undefined {
  if (!headers) {
    return undefined
  }

  // Check various header names (case-insensitive)
  const correlationIdKeys = [
    'X-Correlation-ID',
    'x-correlation-id',
    'correlationId',
    'CorrelationId',
    'correlation-id',
  ]

  for (const key of correlationIdKeys) {
    const value = headers[key]
    if (value) {
      return value
    }
  }

  return undefined
}
