// Main exports
export { Logger, PerformanceLogger, ApiLogger } from './logger'
export { ConsoleTransport, StorageTransport, RemoteTransport, NullTransport } from './transports'
export {
  LoggerFactory,
  createEnvironmentConfig,
  getAppLogger,
  getPerformanceLogger,
  getApiLogger,
  getTestLogger,
} from './factory'

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
} from './types'

export {
  LogLevel,
  LogLevelSchema,
  LogEntrySchema,
  LoggerConfigSchema,
  EnvironmentConfigSchema,
  PerformanceLogSchema,
  ApiLogSchema,
  UserInteractionLogSchema,
} from './types'

// Simple logger for immediate use (no dependencies)
export { logger, createLogger, SimpleLogger, LogLevel as SimpleLogLevel } from './simple-logger'

// Convenience re-exports for common usage (requires full setup)
// export const logger = getAppLogger()
// export const perfLogger = getPerformanceLogger()
// export const apiLogger = getApiLogger()
