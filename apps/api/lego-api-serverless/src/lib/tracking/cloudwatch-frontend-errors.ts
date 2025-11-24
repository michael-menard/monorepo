/**
 * CloudWatch Frontend Error Logging Module
 * Story 3.4: Frontend Error Reporting to CloudWatch
 *
 * This module logs frontend errors to CloudWatch Logs with PII sanitization
 * using structured logging format for easy querying and visualization in Grafana.
 */

import { createLambdaLogger } from '@repo/logger'
import { sanitizeObject, sanitizeString } from '@monorepo/pii-sanitizer'

const logger = createLambdaLogger('cloudwatch-frontend-errors')

/**
 * Frontend error context
 */
export interface FrontendErrorContext {
  userId?: string
  route?: string
  action?: string
  metadata?: Record<string, unknown>
}

/**
 * Frontend error data
 */
export interface FrontendErrorData {
  message: string
  name: string
  stack?: string
  componentStack?: string
}

/**
 * Frontend error log entry
 */
export interface FrontendErrorLogEntry {
  type: 'error' | 'unhandledrejection' | 'react-error-boundary'
  sessionId: string
  timestamp: number
  url: string
  userAgent?: string
  error: FrontendErrorData
  context?: FrontendErrorContext
}

/**
 * Sanitize error data to remove PII before logging
 */
function sanitizeErrorData(error: FrontendErrorData): FrontendErrorData {
  return {
    message: sanitizeString(error.message, {
      sanitizeEmails: true,
      sanitizePhoneNumbers: true,
      sanitizeCreditCards: true,
      sanitizeSSN: true,
      sanitizeAPIKeys: true,
      sanitizeJWT: true,
      sanitizeAWSKeys: true,
      sanitizeIPAddresses: false, // Keep IPs for debugging
    }),
    name: error.name,
    stack: error.stack ? sanitizeString(error.stack) : undefined,
    componentStack: error.componentStack ? sanitizeString(error.componentStack) : undefined,
  }
}

/**
 * Sanitize error context to remove PII
 */
function sanitizeErrorContext(context?: FrontendErrorContext): FrontendErrorContext | undefined {
  if (!context) return undefined

  return sanitizeObject(context, {
    sanitizeEmails: true,
    sanitizePhoneNumbers: true,
    sanitizeCreditCards: true,
    sanitizeSSN: true,
    sanitizeAPIKeys: true,
    sanitizeJWT: true,
    sanitizeAWSKeys: true,
    sanitizeIPAddresses: false,
  })
}

/**
 * Log a frontend error to CloudWatch with PII sanitization
 */
export async function logFrontendError(entry: FrontendErrorLogEntry): Promise<void> {
  try {
    // Sanitize error data
    const sanitizedError = sanitizeErrorData(entry.error)
    const sanitizedContext = sanitizeErrorContext(entry.context)
    const sanitizedUrl = sanitizeString(entry.url)
    const sanitizedUserAgent = entry.userAgent ? sanitizeString(entry.userAgent) : undefined

    // Create structured log entry
    const logEntry = {
      // Error classification
      ErrorType: entry.type,
      ErrorName: sanitizedError.name,
      ErrorMessage: sanitizedError.message,

      // Session tracking
      SessionId: entry.sessionId,
      Timestamp: entry.timestamp,
      ISOTimestamp: new Date(entry.timestamp).toISOString(),

      // Context
      URL: sanitizedUrl,
      UserAgent: sanitizedUserAgent,
      Route: sanitizedContext?.route,
      UserAction: sanitizedContext?.action,

      // Stack traces (truncated to avoid excessive log size)
      Stack: sanitizedError.stack?.substring(0, 5000),
      ComponentStack: sanitizedError.componentStack?.substring(0, 2000),

      // Additional metadata
      Metadata: sanitizedContext?.metadata,

      // CloudWatch Insights fields for easy querying
      LogLevel: 'ERROR',
      Source: 'Frontend',
    }

    // Log to CloudWatch using structured logger
    logger.error('Frontend error reported', undefined, logEntry)

    // Log error counts for metrics (without PII)
    logger.info('Frontend error metric', {
      ErrorType: entry.type,
      ErrorName: sanitizedError.name,
      SessionId: entry.sessionId,
      Route: sanitizedContext?.route,
    })
  } catch (error) {
    // If logging fails, log the failure but don't throw (to avoid breaking the Lambda)
    logger.error('Failed to log frontend error', error instanceof Error ? error : undefined, {
      errorType: entry.type,
      sessionId: entry.sessionId,
    })
    throw error
  }
}

/**
 * Log a batch of frontend errors
 */
export async function logFrontendErrorBatch(entries: FrontendErrorLogEntry[]): Promise<void> {
  await Promise.all(entries.map(entry => logFrontendError(entry)))
}
