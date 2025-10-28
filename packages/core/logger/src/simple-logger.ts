/**
 * Simple logger utility for immediate use
 * This is a lightweight logger that can be used to replace console statements
 * without requiring the full logger infrastructure setup.
 */

import pino from 'pino'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LoggerConfig {
  level: LogLevel
  context?: string
  enableConsole: boolean
}

class SimpleLogger {
  private config: LoggerConfig
  private pinoLogger: pino.Logger

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      ...config,
    }

    // Create Pino logger instance
    this.pinoLogger = pino({
      level: this.getPinoLevel(this.config.level),
      transport: this.config.enableConsole
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
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level
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

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const context = this.config.context ? { context: this.config.context } : {}
    this.pinoLogger.debug({ ...context, args }, message)
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    const context = this.config.context ? { context: this.config.context } : {}
    this.pinoLogger.info({ ...context, args }, message)
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    const context = this.config.context ? { context: this.config.context } : {}
    this.pinoLogger.warn({ ...context, args }, message)
  }

  error(message: string, error?: Error, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const context = this.config.context ? { context: this.config.context } : {}
    this.pinoLogger.error({ ...context, err: error, args }, message)
  }

  setLevel(level: LogLevel): void {
    this.config.level = level
    this.pinoLogger.level = this.getPinoLevel(level)
  }

  setContext(context: string): void {
    this.config.context = context
  }
}

// Environment-specific configuration
function getEnvironmentConfig(): Partial<LoggerConfig> {
  const env = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development'

  switch (env) {
    case 'production':
      return {
        level: LogLevel.WARN,
        enableConsole: false,
      }
    case 'test':
      return {
        level: LogLevel.ERROR,
        enableConsole: false,
      }
    default: // development
      return {
        level: LogLevel.DEBUG,
        enableConsole: true,
      }
  }
}

// Create default loggers
export const logger = new SimpleLogger({
  ...getEnvironmentConfig(),
  context: 'app',
})

export const createLogger = (context: string, config?: Partial<LoggerConfig>) => {
  return new SimpleLogger({
    ...getEnvironmentConfig(),
    context,
    ...config,
  })
}

// Convenience exports
export { SimpleLogger }
export default logger
