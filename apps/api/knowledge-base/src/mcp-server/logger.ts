/**
 * MCP Server Logger
 *
 * Creates a logger that writes to stderr instead of stdout
 * to comply with MCP protocol requirements.
 *
 * MCP uses stdio transport:
 * - stdin: JSON-RPC requests from client
 * - stdout: JSON-RPC responses to client
 * - stderr: Logs (must not interfere with protocol)
 *
 * @see KNOW-0051 AC5 for logging requirements
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel
  context: string
}

/**
 * Get log level from environment
 */
function getLogLevelFromEnv(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase()

  switch (level) {
    case 'debug':
      return LogLevel.DEBUG
    case 'info':
      return LogLevel.INFO
    case 'warn':
      return LogLevel.WARN
    case 'error':
      return LogLevel.ERROR
    default:
      return LogLevel.INFO
  }
}

/**
 * MCP-compliant logger that writes to stderr.
 *
 * Sensitive data sanitization rules:
 * - Content: Truncate to 200 chars
 * - API keys: Redact completely
 * - Connection strings: Mask password portion
 * - Embeddings: Do not log (1536 floats)
 */
class McpLogger {
  private config: LoggerConfig

  constructor(context: string) {
    this.config = {
      level: getLogLevelFromEnv(),
      context,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG'
      case LogLevel.INFO:
        return 'INFO'
      case LogLevel.WARN:
        return 'WARN'
      case LogLevel.ERROR:
        return 'ERROR'
      default:
        return 'INFO'
    }
  }

  private formatLog(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString()
    const levelName = this.getLevelName(level)

    const logEntry: Record<string, unknown> = {
      timestamp,
      level: levelName,
      context: this.config.context,
      message,
    }

    if (data) {
      // Sanitize sensitive data
      const sanitizedData = this.sanitizeData(data)
      Object.assign(logEntry, sanitizedData)
    }

    return JSON.stringify(logEntry)
  }

  /**
   * Sanitize data for logging.
   * - Truncate content > 200 chars
   * - Redact API keys
   * - Mask connection string passwords
   * - Remove embeddings entirely
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(data)) {
      // Skip embeddings entirely
      if (key === 'embedding' || key === 'embeddings') {
        sanitized[key] = '[REDACTED - vector data]'
        continue
      }

      // Redact API keys
      if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('api_key')) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Handle content truncation
      if (key === 'content' && typeof value === 'string') {
        sanitized[key] = value.length > 200 ? value.substring(0, 200) + '...' : value
        sanitized['content_length'] = value.length
        continue
      }

      // Handle connection strings
      if ((key === 'connectionString' || key === 'DATABASE_URL') && typeof value === 'string') {
        // Mask password in connection string
        sanitized[key] = value.replace(/:([^:@]+)@/, ':***@')
        continue
      }

      // Handle error objects
      if (key === 'error' && value instanceof Error) {
        sanitized[key] = {
          name: value.name,
          message: value.message,
          stack: process.env.NODE_ENV === 'development' ? value.stack : undefined,
        }
        continue
      }

      // Pass through other values
      sanitized[key] = value
    }

    return sanitized
  }

  /**
   * Write log to stderr (MCP protocol compliance)
   */
  private write(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return

    const formatted = this.formatLog(level, message, data)
    // Write to stderr (file descriptor 2)
    process.stderr.write(formatted + '\n')
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.write(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.write(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.write(LogLevel.WARN, message, data)
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.write(LogLevel.ERROR, message, data)
  }
}

/**
 * Create an MCP-compliant logger instance.
 *
 * @param context - Logger context (e.g., 'server', 'tool-handlers')
 * @returns Logger instance that writes to stderr
 */
export function createMcpLogger(context: string): McpLogger {
  return new McpLogger(context)
}

/**
 * Default MCP server logger
 */
export const mcpLogger = createMcpLogger('mcp-server')
