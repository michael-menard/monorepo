/**
 * Simple logger utility for immediate use
 * This is a lightweight logger that can be used to replace console statements
 * without requiring the full logger infrastructure setup.
 * Uses native console so it is safe for browser and Node environments.
 */

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

export class SimpleLogger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      ...config,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level
  }

  private formatMessage(message: string): string {
    return this.config.context ? `[${this.config.context}] ${message}` : message
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    // eslint-disable-next-line no-console
    console.debug(this.formatMessage(message), ...args)
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    // eslint-disable-next-line no-console
    console.info(this.formatMessage(message), ...args)
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    // eslint-disable-next-line no-console
    console.warn(this.formatMessage(message), ...args)
  }

  error(message: string, error?: unknown, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    // eslint-disable-next-line no-console
    console.error(this.formatMessage(message), ...(error !== undefined ? [error] : []), ...args)
  }

  setLevel(level: LogLevel): void {
    this.config.level = level
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

export default logger
