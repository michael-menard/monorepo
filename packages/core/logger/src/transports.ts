import { join } from 'path'
import pino from 'pino'
import { z } from 'zod'
import { ILogTransport, LogEntry, LogLevel } from './types.js'

/**
 * Console transport for logging to browser console
 */
export class ConsoleTransport implements ILogTransport {
  private readonly pinoLogger: pino.Logger

  constructor(enableColors = true) {
    this.pinoLogger = pino({
      transport: enableColors
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

  log(entry: LogEntry): void {
    const { level, message, context, metadata, error } = entry

    const logData = {
      ...(context && { context }),
      ...(metadata && { metadata }),
      ...(error && { err: error }),
    }

    switch (level) {
      case LogLevel.DEBUG:
        this.pinoLogger.debug(logData, message)
        break
      case LogLevel.INFO:
        this.pinoLogger.info(logData, message)
        break
      case LogLevel.WARN:
        this.pinoLogger.warn(logData, message)
        break
      case LogLevel.ERROR:
        this.pinoLogger.error(logData, message)
        break
    }
  }
}

/**
 * Storage transport for logging to localStorage/sessionStorage
 */
export class StorageTransport implements ILogTransport {
  private readonly storage: Storage
  private readonly key: string
  private readonly maxEntries: number
  private entries: LogEntry[] = []

  constructor(storage: Storage = localStorage, key = 'app-logs', maxEntries = 1000) {
    this.storage = storage
    this.key = key
    this.maxEntries = maxEntries
    this.loadEntries()
  }

  log(entry: LogEntry): void {
    this.entries.push(entry)

    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    this.saveEntries()
  }

  async flush(): Promise<void> {
    this.entries = []
    this.saveEntries()
  }

  getLogs(): LogEntry[] {
    return [...this.entries]
  }

  private loadEntries(): void {
    try {
      const stored = this.storage.getItem(this.key)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.entries = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
      }
    } catch (error) {
      // Ignore storage errors
      this.entries = []
    }
  }

  private saveEntries(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.entries))
    } catch (error) {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }
}

/**
 * Remote transport for sending logs to a server
 */
export class RemoteTransport implements ILogTransport {
  private readonly endpoint: string
  private readonly batchSize: number
  private readonly flushInterval: number
  private batch: LogEntry[] = []
  private flushTimer?: ReturnType<typeof setInterval>

  constructor(endpoint: string, batchSize = 10, flushInterval = 5000) {
    this.endpoint = endpoint
    this.batchSize = batchSize
    this.flushInterval = flushInterval
    this.startFlushTimer()
  }

  log(entry: LogEntry): void {
    this.batch.push(entry)

    if (this.batch.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return

    const logsToSend = [...this.batch]
    this.batch = []

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      })
    } catch (error) {
      // If sending fails, add logs back to batch for retry
      this.batch.unshift(...logsToSend)

      // Limit batch size to prevent memory issues
      if (this.batch.length > this.batchSize * 5) {
        this.batch = this.batch.slice(-this.batchSize * 5)
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush()
  }
}

/**
 * Null transport that discards all logs (for testing)
 */
export class NullTransport implements ILogTransport {
  log(): void {
    // Do nothing
  }

  async flush(): Promise<void> {
    // Do nothing
  }
}

export const FileTransportConfigSchema = z.object({
  /** Directory to write log files into */
  dir: z.string(),
  /** Base filename without extension (e.g. "app" → app.2025-01-01.1.log) */
  filename: z.string().optional().default('app'),
  /** Rotate frequency — 'daily' | 'hourly' | milliseconds */
  frequency: z.union([z.literal('daily'), z.literal('hourly'), z.number()]).optional().default('daily'),
  /** Max number of rotated files to keep (in addition to the active file).
   *  Defaults to 13, giving 14 days of retention with daily rotation. */
  retainCount: z.number().int().positive().optional().default(13),
  /** Create the log directory if it doesn't exist */
  mkdir: z.boolean().optional().default(true),
})

export type FileTransportConfig = z.infer<typeof FileTransportConfigSchema>

/**
 * File transport with daily rotation and configurable retention.
 *
 * Uses pino-roll for high-performance file writing. Log files are named
 * using the Extension Last Format: `{filename}.{date}.{count}.log`
 * e.g. `app.2025-01-15.1.log`
 *
 * @example
 * ```typescript
 * const fileTransport = new FileTransport({ dir: '/var/log/myapp' })
 * logger.addTransport(fileTransport)
 * await fileTransport.destroy() // call on shutdown to flush & close
 * ```
 */
export class FileTransport implements ILogTransport {
  private readonly pinoLogger: pino.Logger
  private readonly config: FileTransportConfig

  constructor(options: z.input<typeof FileTransportConfigSchema>) {
    this.config = FileTransportConfigSchema.parse(options)

    const filePath = join(this.config.dir, this.config.filename)

    const transport = pino.transport({
      target: 'pino-roll',
      options: {
        file: filePath,
        frequency: this.config.frequency,
        dateFormat: 'yyyy-MM-dd',
        mkdir: this.config.mkdir,
        limit: { count: this.config.retainCount },
        symlink: true,
      },
    })

    this.pinoLogger = pino({ level: 'trace' }, transport)
  }

  log(entry: LogEntry): void {
    const { level, message, context, metadata, error } = entry

    const logData: Record<string, unknown> = {
      ...(context && { context }),
      ...(metadata && { metadata }),
      ...(error && { err: error }),
    }

    switch (level) {
      case LogLevel.DEBUG:
        this.pinoLogger.debug(logData, message)
        break
      case LogLevel.INFO:
        this.pinoLogger.info(logData, message)
        break
      case LogLevel.WARN:
        this.pinoLogger.warn(logData, message)
        break
      case LogLevel.ERROR:
        this.pinoLogger.error(logData, message)
        break
    }
  }

  async flush(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.pinoLogger.flush(err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  /** Flush and close the underlying transport. Call on process shutdown. */
  async destroy(): Promise<void> {
    await this.flush()
  }
}

/**
 * Browser console transport (pino-free for browser compatibility)
 */
export class BrowserConsoleTransport implements ILogTransport {
  private readonly context?: string

  constructor(context?: string) {
    this.context = context
  }

  log(entry: LogEntry): void {
    const { level, message, context, metadata, error } = entry
    const prefix = context || this.context ? `[${context || this.context}]` : ''
    const fullMessage = prefix ? `${prefix} ${message}` : message

    const logData = {
      ...(metadata && metadata),
      ...(error && { error }),
    }

    const hasData = Object.keys(logData).length > 0

    /* eslint-disable no-console */
    switch (level) {
      case LogLevel.DEBUG:
        if (hasData) {
          console.debug(fullMessage, logData)
        } else {
          console.debug(fullMessage)
        }
        break
      case LogLevel.INFO:
        if (hasData) {
          console.info(fullMessage, logData)
        } else {
          console.info(fullMessage)
        }
        break
      case LogLevel.WARN:
        if (hasData) {
          console.warn(fullMessage, logData)
        } else {
          console.warn(fullMessage)
        }
        break
      case LogLevel.ERROR:
        if (hasData) {
          console.error(fullMessage, logData)
        } else {
          console.error(fullMessage)
        }
        break
    }
    /* eslint-enable no-console */
  }

  async flush(): Promise<void> {
    // No-op for console transport
  }
}
