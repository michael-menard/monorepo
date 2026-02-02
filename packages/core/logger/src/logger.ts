import pino from 'pino'
import {
  ILogger,
  ILogTransport,
  LogEntry,
  LogLevel,
  LoggerConfig,
  LoggerConfigSchema,
} from './types.js'

/**
 * Main logger implementation
 */
export class Logger implements ILogger {
  private config: LoggerConfig
  private transports: ILogTransport[] = []
  private context?: string
  private fallbackLogger: pino.Logger

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = LoggerConfigSchema.parse(config)
    this.context = this.config.context

    // Create fallback logger for transport errors
    this.fallbackLogger = pino({
      level: 'error',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    })
  }

  /**
   * Add a transport to the logger
   */
  addTransport(transport: ILogTransport): void {
    this.transports.push(transport)
  }

  /**
   * Remove a transport from the logger
   */
  removeTransport(transport: ILogTransport): void {
    const index = this.transports.indexOf(transport)
    if (index > -1) {
      this.transports.splice(index, 1)
    }
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * Set the logger context
   */
  setContext(context: string): void {
    this.context = context
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, undefined, metadata)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, undefined, metadata)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, undefined, metadata)
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, error, metadata)
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(transport => (transport.flush ? transport.flush() : Promise.resolve())),
    )
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    // Check if log level meets minimum threshold
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
      error,
    }

    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport.log(entry)
      } catch (transportError) {
        // Don't let transport errors break logging - use fallback logger
        this.fallbackLogger.error({ err: transportError }, 'Logger transport error')
      }
    })
  }
}

/**
 * Performance logger for tracking timing metrics
 */
export class PerformanceLogger {
  private logger: ILogger
  private timers: Map<string, number> = new Map()

  constructor(logger: ILogger) {
    this.logger = logger
  }

  /**
   * Start timing an operation
   */
  start(name: string): void {
    this.timers.set(name, performance.now())
  }

  /**
   * End timing an operation and log the result
   */
  end(name: string, metadata?: Record<string, unknown>): void {
    const startTime = this.timers.get(name)
    if (startTime === undefined) {
      this.logger.warn(`Performance timer '${name}' was not started`)
      return
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    this.timers.delete(name)

    this.logger.info(`Performance: ${name}`, {
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      startTime,
      endTime,
      ...metadata,
    })
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    this.start(name)
    try {
      const result = await fn()
      this.end(name, metadata)
      return result
    } catch (error) {
      this.end(name, { ...metadata, error: true })
      throw error
    }
  }
}

/**
 * API logger for tracking HTTP requests
 */
export class ApiLogger {
  private logger: ILogger

  constructor(logger: ILogger) {
    this.logger = logger
  }

  /**
   * Log an API request
   */
  logRequest(method: string, url: string, metadata?: Record<string, unknown>): void {
    this.logger.info(`API Request: ${method} ${url}`, {
      type: 'api_request',
      method,
      url,
      ...metadata,
    })
  }

  /**
   * Log an API response
   */
  logResponse(
    method: string,
    url: string,
    status: number,
    duration?: number,
    metadata?: Record<string, unknown>,
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO
    const message = `API Response: ${method} ${url} ${status}`

    if (level === LogLevel.ERROR) {
      this.logger.error(message, undefined, {
        type: 'api_response',
        method,
        url,
        status,
        duration,
        ...metadata,
      })
    } else {
      this.logger.info(message, {
        type: 'api_response',
        method,
        url,
        status,
        duration,
        ...metadata,
      })
    }
  }

  /**
   * Log an API error
   */
  logError(method: string, url: string, error: Error, metadata?: Record<string, unknown>): void {
    this.logger.error(`API Error: ${method} ${url}`, error, {
      type: 'api_error',
      method,
      url,
      ...metadata,
    })
  }
}
