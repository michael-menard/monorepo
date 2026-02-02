// Main exports
export { Logger, PerformanceLogger, ApiLogger } from './logger.js'
export {
  ConsoleTransport,
  StorageTransport,
  RemoteTransport,
  NullTransport,
  BrowserConsoleTransport,
} from './transports.js'
export {
  LoggerFactory,
  createEnvironmentConfig,
  getAppLogger,
  getPerformanceLogger,
  getApiLogger,
  getTestLogger,
} from './factory.js'

// Types
export type {
  ILogger,
  ILogTransport,
  LogEntry,
  LoggerConfig,
  EnvironmentConfig,
  PerformanceLog,
  ApiLog,
  UserInteractionLog,
} from './types.js'

export {
  LogLevel,
  LogLevelSchema,
  LogEntrySchema,
  LoggerConfigSchema,
  EnvironmentConfigSchema,
  PerformanceLogSchema,
  ApiLogSchema,
  UserInteractionLogSchema,
} from './types.js'

// Simple logger for immediate use (no dependencies)
export { logger, createLogger, SimpleLogger, LogLevel as SimpleLogLevel } from './simple-logger.js'

// Lambda-optimized structured logger (Story 3.2)
export {
  LambdaLogger,
  createLambdaLogger,
  generateCorrelationId,
  getXRayTraceId,
  extractCorrelationId,
} from './lambda-logger.js'
export type { LambdaLogContext, LambdaLoggerConfig } from './lambda-logger.js'

// Convenience re-exports for common usage (requires full setup)
// export const logger = getAppLogger()
// export const perfLogger = getPerformanceLogger()
// export const apiLogger = getApiLogger()
