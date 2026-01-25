/**
 * Node logger factory.
 *
 * AC-3: Entry/exit logging with node name, story ID, and duration.
 * AC-14: No console.log statements - uses @repo/logger.
 *
 * Creates logger instances with node-specific context for structured logging.
 */

import { createLogger } from '@repo/logger'
import type { NodeExecutionContext } from './types.js'

/**
 * Logger interface for node execution.
 * Provides methods for structured logging with node context.
 */
export interface NodeLogger {
  /** Log node entry */
  logEntry(storyId: string): void
  /** Log node exit with duration */
  logExit(storyId: string, durationMs: number, success: boolean): void
  /** Log an error during execution */
  logError(error: Error, context?: Record<string, unknown>): void
  /** Log a retry attempt */
  logRetry(attempt: number, maxAttempts: number, delayMs: number, error: Error): void
  /** Log general debug information */
  debug(message: string, context?: Record<string, unknown>): void
  /** Log general info */
  info(message: string, context?: Record<string, unknown>): void
  /** Log a warning */
  warn(message: string, context?: Record<string, unknown>): void
}

/**
 * Creates a logger for a specific node.
 * AC-3: Logging with node name, story ID, and duration.
 *
 * @param nodeName - The name of the node
 * @returns A configured node logger
 */
export function createNodeLogger(nodeName: string): NodeLogger {
  const logger = createLogger(`orchestrator:node:${nodeName}`)

  return {
    logEntry(storyId: string): void {
      logger.info('Node execution started', {
        nodeName,
        storyId,
        timestamp: new Date().toISOString(),
      })
    },

    logExit(storyId: string, durationMs: number, success: boolean): void {
      const level = success ? 'info' : 'warn'
      logger[level]('Node execution completed', {
        nodeName,
        storyId,
        durationMs,
        success,
        timestamp: new Date().toISOString(),
      })
    },

    logError(error: Error, context?: Record<string, unknown>): void {
      logger.error('Node execution error', error, {
        nodeName,
        errorName: error.name,
        errorMessage: error.message,
        ...context,
      })
    },

    logRetry(attempt: number, maxAttempts: number, delayMs: number, error: Error): void {
      logger.warn('Node retry scheduled', {
        nodeName,
        attempt,
        maxAttempts,
        delayMs,
        errorMessage: error.message,
      })
    },

    debug(message: string, context?: Record<string, unknown>): void {
      logger.debug(message, { nodeName, ...context })
    },

    info(message: string, context?: Record<string, unknown>): void {
      logger.info(message, { nodeName, ...context })
    },

    warn(message: string, context?: Record<string, unknown>): void {
      logger.warn(message, { nodeName, ...context })
    },
  }
}

/**
 * Creates a logger with full execution context.
 * Includes traceId, graphExecutionId for distributed tracing.
 *
 * @param nodeName - The name of the node
 * @param context - The execution context
 * @returns A configured node logger with context
 */
export function createNodeLoggerWithContext(
  nodeName: string,
  context: NodeExecutionContext,
): NodeLogger {
  const baseLogger = createNodeLogger(nodeName)

  // Enhance all methods with context
  return {
    logEntry(storyId: string): void {
      baseLogger.info(`Node execution started`, {
        storyId,
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
        retryAttempt: context.retryAttempt,
        maxRetryAttempts: context.maxRetryAttempts,
        parentNodeId: context.parentNodeId,
      })
    },

    logExit(storyId: string, durationMs: number, success: boolean): void {
      const level = success ? 'info' : 'warn'
      baseLogger[level](`Node execution completed`, {
        storyId,
        durationMs,
        success,
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
      })
    },

    logError(error: Error, extraContext?: Record<string, unknown>): void {
      baseLogger.logError(error, {
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
        ...extraContext,
      })
    },

    logRetry(attempt: number, maxAttempts: number, delayMs: number, error: Error): void {
      baseLogger.logRetry(attempt, maxAttempts, delayMs, error)
    },

    debug(message: string, extraContext?: Record<string, unknown>): void {
      baseLogger.debug(message, {
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
        ...extraContext,
      })
    },

    info(message: string, extraContext?: Record<string, unknown>): void {
      baseLogger.info(message, {
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
        ...extraContext,
      })
    },

    warn(message: string, extraContext?: Record<string, unknown>): void {
      baseLogger.warn(message, {
        traceId: context.traceId,
        graphExecutionId: context.graphExecutionId,
        ...extraContext,
      })
    },
  }
}
