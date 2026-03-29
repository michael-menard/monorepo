import { join } from 'path'
import pino from 'pino'
import { z } from 'zod'
import { ILogTransport, LogEntry, LogLevel } from './types.js'
import { FileTransportConfigSchema } from './browser-transports.js'
import type { FileTransportConfig } from './browser-transports.js'

// Re-export browser-safe transports so Node consumers can import everything from this file
export {
  StorageTransport,
  RemoteTransport,
  NullTransport,
  BrowserConsoleTransport,
  FileTransportConfigSchema,
} from './browser-transports.js'
export type { FileTransportConfig } from './browser-transports.js'

/**
 * Console transport using pino + pino-pretty (Node.js only)
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
 * File transport with daily rotation and configurable retention (Node.js only).
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
