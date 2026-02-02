import { Logger, PerformanceLogger, ApiLogger } from './logger.js'
import { ConsoleTransport, StorageTransport, RemoteTransport, NullTransport } from './transports.js'
import { LogLevel, LoggerConfig, EnvironmentConfig } from './types.js'

/**
 * Logger factory for creating pre-configured loggers
 */
export class LoggerFactory {
  private static instance?: LoggerFactory
  private loggers: Map<string, Logger> = new Map()
  private defaultConfig: LoggerConfig

  private constructor(config: LoggerConfig) {
    this.defaultConfig = config
  }

  /**
   * Get or create the singleton factory instance
   */
  static getInstance(config?: LoggerConfig): LoggerFactory {
    if (!LoggerFactory.instance) {
      const defaultConfig: LoggerConfig = config || {
        level: LogLevel.INFO,
        enableConsole: true,
        enableStorage: false,
        enableRemote: false,
        maxStorageEntries: 1000,
        batchSize: 10,
        flushInterval: 5000,
      }
      LoggerFactory.instance = new LoggerFactory(defaultConfig)
    }
    return LoggerFactory.instance
  }

  /**
   * Create or get a logger with the specified name
   */
  getLogger(name: string, config?: Partial<LoggerConfig>): Logger {
    if (this.loggers.has(name)) {
      return this.loggers.get(name)!
    }

    const mergedConfig = { ...this.defaultConfig, ...config, context: name }
    const logger = new Logger(mergedConfig)

    // Add transports based on configuration
    if (mergedConfig.enableConsole) {
      logger.addTransport(new ConsoleTransport())
    }

    if (mergedConfig.enableStorage) {
      logger.addTransport(
        new StorageTransport(localStorage, `logs-${name}`, mergedConfig.maxStorageEntries),
      )
    }

    if (mergedConfig.enableRemote && mergedConfig.remoteEndpoint) {
      logger.addTransport(
        new RemoteTransport(
          mergedConfig.remoteEndpoint,
          mergedConfig.batchSize,
          mergedConfig.flushInterval,
        ),
      )
    }

    this.loggers.set(name, logger)
    return logger
  }

  /**
   * Create a performance logger
   */
  getPerformanceLogger(name: string, config?: Partial<LoggerConfig>): PerformanceLogger {
    const logger = this.getLogger(`${name}-perf`, config)
    return new PerformanceLogger(logger)
  }

  /**
   * Create an API logger
   */
  getApiLogger(name: string, config?: Partial<LoggerConfig>): ApiLogger {
    const logger = this.getLogger(`${name}-api`, config)
    return new ApiLogger(logger)
  }

  /**
   * Update the default configuration
   */
  updateDefaultConfig(config: Partial<LoggerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }

  /**
   * Clear all loggers (useful for testing)
   */
  clearLoggers(): void {
    this.loggers.clear()
  }
}

/**
 * Environment-specific logger configuration
 */
export function createEnvironmentConfig(): LoggerConfig {
  const env = typeof process !== 'undefined' ? process.env.NODE_ENV : 'development'

  const configs: EnvironmentConfig = {
    development: {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
    },
    production: {
      level: LogLevel.INFO,
      enableConsole: false,
      enableStorage: false,
      enableRemote: true,
      remoteEndpoint: '/api/logs',
    },
    test: {
      level: LogLevel.ERROR,
      enableConsole: false,
      enableStorage: false,
      enableRemote: false,
    },
  }

  const envConfig = configs[env as keyof EnvironmentConfig] || configs.development

  return {
    level: LogLevel.INFO,
    enableConsole: true,
    enableStorage: false,
    enableRemote: false,
    maxStorageEntries: 1000,
    batchSize: 10,
    flushInterval: 5000,
    ...envConfig,
  }
}

/**
 * Convenience functions for getting common loggers
 */

// Default application logger
export const getAppLogger = (context?: string) => {
  const factory = LoggerFactory.getInstance(createEnvironmentConfig())
  return factory.getLogger(context || 'app')
}

// Performance logger
export const getPerformanceLogger = (context?: string) => {
  const factory = LoggerFactory.getInstance(createEnvironmentConfig())
  return factory.getPerformanceLogger(context || 'app')
}

// API logger
export const getApiLogger = (context?: string) => {
  const factory = LoggerFactory.getInstance(createEnvironmentConfig())
  return factory.getApiLogger(context || 'app')
}

// Test logger (null transport)
export const getTestLogger = (context?: string) => {
  const logger = new Logger({ context })
  logger.addTransport(new NullTransport())
  return logger
}
