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
 * - INTERNAL_ERROR - Unhandled exception
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  API_ERROR: 'API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * Zod schema for sanitized MCP error response.
 */
export const McpErrorSchema = z.object({
  code: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'DATABASE_ERROR', 'API_ERROR', 'INTERNAL_ERROR']),
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

  // PostgreSQL error codes and common patterns
  const dbPatterns = [
    'connection',
    'postgres',
    'pg_',
    'database',
    'econnrefused',
    'enotfound',
    'etimedout',
    'pool',
    'relation',
    'column',
    'constraint',
    'duplicate key',
    'foreign key',
    'unique violation',
  ]

  return (
    dbPatterns.some(pattern => message.includes(pattern) || name.includes(pattern)) ||
    // Drizzle ORM errors
    name === 'drizzleerror' ||
    // pg library errors
    'code' in error
  )
}

/**
 * Check if an error is an OpenAI API error.
 */
export function isOpenAIError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  const openaiPatterns = ['openai', 'embedding', 'api_key', 'rate_limit', 'insufficient_quota']

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
  // Log full error server-side
  logger.error('OpenAI API error occurred', { error })

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
  // Zod validation errors - include field info
  if (isZodError(error)) {
    return parseZodError(error)
  }

  // NotFoundError - include resource info
  if (error instanceof NotFoundError) {
    return sanitizeNotFoundError(error)
  }

  // Database errors - sanitize connection details
  if (error instanceof Error && isDatabaseError(error)) {
    return sanitizeDatabaseError(error)
  }

  // OpenAI API errors - sanitize API keys
  if (error instanceof Error && isOpenAIError(error)) {
    return sanitizeOpenAIError(error)
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
