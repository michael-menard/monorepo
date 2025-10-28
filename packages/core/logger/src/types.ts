import { z } from 'zod'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level schema for validation
 */
export const LogLevelSchema = z.nativeEnum(LogLevel)

/**
 * Log entry structure
 */
export const LogEntrySchema = z.object({
  level: LogLevelSchema,
  message: z.string(),
  timestamp: z.date(),
  context: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  error: z.instanceof(Error).optional(),
})

export type LogEntry = z.infer<typeof LogEntrySchema>

/**
 * Logger configuration
 */
export const LoggerConfigSchema = z.object({
  level: LogLevelSchema.optional().default(LogLevel.INFO),
  context: z.string().optional(),
  enableConsole: z.boolean().optional().default(true),
  enableStorage: z.boolean().optional().default(false),
  enableRemote: z.boolean().optional().default(false),
  remoteEndpoint: z.string().optional(),
  maxStorageEntries: z.number().optional().default(1000),
  batchSize: z.number().optional().default(10),
  flushInterval: z.number().optional().default(5000),
})

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>

/**
 * Environment-specific logger configuration
 */
export const EnvironmentConfigSchema = z.object({
  development: LoggerConfigSchema.partial(),
  production: LoggerConfigSchema.partial(),
  test: LoggerConfigSchema.partial(),
})

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, metadata?: Record<string, unknown>): void
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void
  setLevel(level: LogLevel): void
  setContext(context: string): void
  flush(): Promise<void>
}

/**
 * Log transport interface
 */
export interface ILogTransport {
  log(entry: LogEntry): void | Promise<void>
  flush?(): Promise<void>
}

/**
 * Performance log entry
 */
export const PerformanceLogSchema = z.object({
  name: z.string(),
  duration: z.number(),
  startTime: z.number(),
  endTime: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type PerformanceLog = z.infer<typeof PerformanceLogSchema>

/**
 * API log entry
 */
export const ApiLogSchema = z.object({
  method: z.string(),
  url: z.string(),
  status: z.number().optional(),
  duration: z.number().optional(),
  requestSize: z.number().optional(),
  responseSize: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ApiLog = z.infer<typeof ApiLogSchema>

/**
 * User interaction log entry
 */
export const UserInteractionLogSchema = z.object({
  action: z.string(),
  element: z.string().optional(),
  page: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UserInteractionLog = z.infer<typeof UserInteractionLogSchema>
