/**
 * Error Sanitization Layer for MCP Server
 *
 * Provides safe error handling for MCP tool responses.
 * Full errors are logged server-side; sanitized errors are returned to clients.
 *
 * @see KNOW-0051 AC4 for error sanitization requirements
 */

import { z } from 'zod'
import { NotFoundError } from '../crud-operations/errors.js'
import { createMcpLogger } from './logger.js'

const logger = createMcpLogger('error-handling')

/**
 * Structured error codes for MCP responses.
 *
 * Error code conventions:
 * - VALIDATION_ERROR - Zod validation failure
 * - NOT_FOUND - Resource not found (kb_update, kb_get non-existent)
 * - DATABASE_ERROR - Database connection or query failure
 * - API_ERROR - OpenAI API failure
 * - FORBIDDEN - Authorization failure (KNOW-009)
 * - INTERNAL_ERROR - Unhandled exception
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Zod schema for sanitized MCP error response.
 */
export const McpErrorSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'DATABASE_ERROR',
    'API_ERROR',
    'FORBIDDEN',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
  field: z.string().optional(),
})

export type McpError = z.infer<typeof McpErrorSchema>

/**
 * MCP tool result with error flag.
 */
export interface McpToolResult {
  isError?: boolean
  content: Array<{
    type: 'text'
    text: string
  }>
}

/**
 * Authorization error for access control failures.
 *
 * Thrown when an agent role does not have permission to access a tool.
 *
 * @see KNOW-009 for authorization implementation
 */
export class AuthorizationError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly requiredRole: string,
    public readonly actualRole: string,
  ) {
    super(`${toolName} requires ${requiredRole} role`)
    this.name = 'AuthorizationError'
  }
}

/**
 * Check if an error is an AuthorizationError.
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError
}

/**
 * Sanitize AuthorizationError for client response.
 *
 * Returns only the tool name and required role, no internal details.
 */
export function sanitizeAuthorizationError(error: AuthorizationError): McpError {
  // Log full error server-side
  logger.info('Authorization denied', {
    tool_name: error.toolName,
    required_role: error.requiredRole,
    actual_role: error.actualRole,
  })

  return {
    code: ErrorCode.FORBIDDEN,
    message: `${error.toolName} requires ${error.requiredRole} role`,
  }
}

/**
 * Check if an error is a Zod validation error.
 */
export function isZodError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError
}

/**
 * Check if an error is a database error.
 * Database errors typically have specific error codes or messages.
 */
export function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // PostgreSQL error codes, connection errors, and common patterns
  const dbPatterns = [
    'connection',
    'postgres',
    'pg_',
    'database',
    'econnrefused',
    'econnreset',
    'enotfound',
    'etimedout',
    'epipe',
    'pool',
    'relation',
    'column',
    'constraint',
    'duplicate key',
    'foreign key',
    'unique violation',
    'socket hang up',
    'connection terminated',
    'timeout expired',
    'client has encountered a connection error',
    'cannot use a pool after calling end',
    'remaining connection slots are reserved',
    'too many clients already',
    'sorry, too many clients',
  ]

  // Check string patterns first
  if (dbPatterns.some(pattern => message.includes(pattern) || name.includes(pattern))) {
    return true
  }

  // Drizzle ORM errors
  if (name === 'drizzleerror') {
    return true
  }

  // pg library errors use 5-character SQLSTATE codes (e.g. '23505', '42P01')
  // Only match if .code looks like a PostgreSQL error code, not any .code property
  if ('code' in error) {
    const code = String((error as Record<string, unknown>).code)
    if (/^[0-9A-Z]{5}$/.test(code)) {
      return true
    }
  }

  return false
}

/**
 * Check if an error is an OpenAI API error.
 *
 * Does NOT match on 'embedding' — that word appears in DB column names
 * and was causing DB errors to be misclassified as OpenAI failures.
 */
export function isOpenAIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Check for OpenAI SDK error class names
  const ctorName = error.constructor.name
  if (ctorName === 'APIError' || ctorName === 'OpenAIError') {
    return true
  }

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  // Only match patterns that are unambiguously OpenAI API failures
  const openaiPatterns = ['openai', 'api_key', 'rate_limit', 'insufficient_quota']

  return openaiPatterns.some(pattern => message.includes(pattern) || name.includes(pattern))
}

/**
 * Parse Zod validation error into sanitized format.
 */
export function parseZodError(error: z.ZodError): McpError {
  const firstIssue = error.issues[0]
  const field = firstIssue?.path?.join('.') || undefined

  return {
    code: ErrorCode.VALIDATION_ERROR,
    message: firstIssue?.message || 'Validation failed',
    field: field || undefined,
  }
}

/**
 * Sanitize database error for client response.
 * Removes SQL queries, connection strings, and sensitive details.
 */
export function sanitizeDatabaseError(error: Error): McpError {
  // Log full error server-side
  logger.error('Database error occurred', { error })

  return {
    code: ErrorCode.DATABASE_ERROR,
    message: 'Database operation failed. Please try again later.',
  }
}

/**
 * Sanitize OpenAI API error for client response.
 * Removes API keys and includes retry context.
 */
export function sanitizeOpenAIError(error: Error): McpError {
  // Log full error server-side with structured context for debugging
  logger.error('OpenAI API error occurred', {
    error,
    error_class: error.constructor.name,
    error_code: 'code' in error ? (error as Record<string, unknown>).code : undefined,
    error_status: 'status' in error ? (error as Record<string, unknown>).status : undefined,
  })

  const message = error.message.toLowerCase()

  // Provide specific guidance for rate limits
  if (message.includes('rate_limit')) {
    return {
      code: ErrorCode.API_ERROR,
      message: 'API rate limit exceeded. Please wait before retrying.',
    }
  }

  // Provide specific guidance for quota issues
  if (message.includes('insufficient_quota')) {
    return {
      code: ErrorCode.API_ERROR,
      message: 'API quota exceeded. Please contact administrator.',
    }
  }

  return {
    code: ErrorCode.API_ERROR,
    message: 'Embedding generation failed. Please try again later.',
  }
}

/**
 * Sanitize NotFoundError for client response.
 */
export function sanitizeNotFoundError(error: NotFoundError): McpError {
  return {
    code: ErrorCode.NOT_FOUND,
    message: error.message,
  }
}

/**
 * Sanitize unknown error for client response.
 */
export function sanitizeUnknownError(error: unknown): McpError {
  // Log full error server-side
  logger.error('Unknown error occurred', { error })

  return {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred. Please try again later.',
  }
}

/**
 * Main error sanitization function.
 *
 * Converts any error into a sanitized McpError suitable for client response.
 * Full errors are logged server-side; sanitized errors are returned.
 *
 * @param error - The error to sanitize
 * @returns Sanitized error for client response
 */
export function sanitizeError(error: unknown): McpError {
  // Authorization errors - include tool name and required role only
  if (isAuthorizationError(error)) {
    return sanitizeAuthorizationError(error)
  }

  // Zod validation errors - include field info
  if (isZodError(error)) {
    return parseZodError(error)
  }

  // NotFoundError - include resource info
  if (error instanceof NotFoundError) {
    return sanitizeNotFoundError(error)
  }

  // OpenAI API errors - check before DB errors since isDatabaseError() broadly
  // matches any error with a .code property, which includes OpenAI SDK errors
  if (error instanceof Error && isOpenAIError(error)) {
    return sanitizeOpenAIError(error)
  }

  // Database errors - sanitize connection details
  if (error instanceof Error && isDatabaseError(error)) {
    return sanitizeDatabaseError(error)
  }

  // Unknown errors - generic message
  return sanitizeUnknownError(error)
}

/**
 * Convert sanitized error to MCP tool result format.
 *
 * @param error - The error to convert (will be sanitized)
 * @returns MCP tool result with error flag
 */
export function errorToToolResult(error: unknown): McpToolResult {
  const sanitized = sanitizeError(error)

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(sanitized),
      },
    ],
  }
}
