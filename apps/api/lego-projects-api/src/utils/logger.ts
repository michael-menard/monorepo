/**
 * Centralized Logger Utility using Pino
 *
 * This module provides structured logging using Pino for the lego-projects-api service.
 * It replaces console.log statements with proper structured logging that integrates
 * with CloudWatch and other log aggregation services.
 */

import pino from 'pino'
import pinoHttp from 'pino-http'

/**
 * Create a Pino logger instance with appropriate configuration
 */
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

/**
 * Create a child logger with a specific name/context
 *
 * @param name - The name/context for the logger (e.g., 'db-client', 'moc-handler')
 * @returns A Pino logger instance with the specified name
 *
 * @example
 * const logger = createLogger('moc-handler')
 * logger.info({ mocId: '123' }, 'Processing MOC')
 * logger.error({ err }, 'Failed to process MOC')
 */
export function createLogger(name: string) {
  return pinoLogger.child({ name })
}

/**
 * Default logger instance for general use
 */
export const logger = pinoLogger

/**
 * Pino HTTP middleware for Express
 * Automatically logs all HTTP requests and responses
 */
export const pinoHttpMiddleware = pinoHttp({ logger: pinoLogger })
