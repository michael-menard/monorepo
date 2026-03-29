// Browser-safe entry point — no pino, no Node.js built-ins

export { logger, createLogger, SimpleLogger, LogLevel as SimpleLogLevel } from './simple-logger.js'

export {
  BrowserConsoleTransport,
  StorageTransport,
  RemoteTransport,
  NullTransport,
  FileTransportConfigSchema,
} from './browser-transports.js'
export type { FileTransportConfig } from './browser-transports.js'

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
