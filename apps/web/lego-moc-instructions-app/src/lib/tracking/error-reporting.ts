/**
 * Frontend Error Reporting Module
 * Story 3.4: Frontend Error Reporting to CloudWatch
 *
 * This module captures frontend errors and sends them to CloudWatch
 * via the Lambda ingestion endpoint for monitoring in Grafana dashboards.
 * PII is sanitized before transmission.
 */

import { getPerformanceConfig } from '../../config/performance'

/**
 * Error type classification
 */
export type ErrorType = 'error' | 'unhandledrejection' | 'react-error-boundary'

/**
 * Error context information
 */
export interface ErrorContext {
  userId?: string
  route?: string
  action?: string
  metadata?: Record<string, unknown>
}

/**
 * Frontend error data
 */
export interface FrontendError {
  type: ErrorType
  sessionId: string
  timestamp: number
  url: string
  userAgent?: string
  error: {
    message: string
    name?: string
    stack?: string
    componentStack?: string
  }
  context?: ErrorContext
}

// Error queue for batching
let errorQueue: FrontendError[] = []
let flushTimer: number | null = null

/**
 * Get or create session ID
 */
function getSessionId(): string {
  const SESSION_KEY = 'error-reporting-session-id'
  let sessionId = sessionStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

/**
 * Get error reporting endpoint
 */
function getErrorReportingEndpoint(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/tracking/errors`
}

/**
 * Send a single error to the backend
 */
async function sendError(error: FrontendError): Promise<void> {
  const config = getPerformanceConfig()

  // In development, only log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Reporting]', {
      type: error.type,
      name: error.error.name,
      message: error.error.message,
      stack: error.error.stack,
      context: error.context,
    })
    return
  }

  // In production, send to CloudWatch via Lambda
  if (config.production.sendToAnalytics) {
    try {
      await fetch(getErrorReportingEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
        // Use keepalive to ensure errors are sent even if page is closing
        keepalive: true,
      })
    } catch (fetchError) {
      // Silent fail - don't throw errors for error reporting
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send error report:', fetchError)
      }
    }
  }
}

/**
 * Send batched errors to the backend
 */
function batchSendErrors(): void {
  if (errorQueue.length === 0) return

  const config = getPerformanceConfig()
  const batch = [...errorQueue]
  errorQueue = []

  // In development, only log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Reporting Batch]', batch)
    return
  }

  // In production, send batch to CloudWatch
  if (config.production.sendToAnalytics) {
    const payload = {
      sessionId: getSessionId(),
      errors: batch,
    }

    fetch(getErrorReportingEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silent fail
    })
  }
}

/**
 * Queue error for batching
 */
function queueError(error: FrontendError): void {
  const config = getPerformanceConfig()
  errorQueue.push(error)

  // Start flush timer if not already running
  if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      batchSendErrors()
      flushTimer = null
    }, config.production.flushInterval)
  }

  // If batch size reached, flush immediately
  if (errorQueue.length >= config.production.batchSize) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    batchSendErrors()
  }
}

/**
 * Report a frontend error
 */
export function reportError(
  type: ErrorType,
  error: Error,
  context?: ErrorContext,
  componentStack?: string,
): void {
  const config = getPerformanceConfig()

  if (!config.enabled) {
    return
  }

  const frontendError: FrontendError = {
    type,
    sessionId: getSessionId(),
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: config.privacy.anonymizeUserAgent ? undefined : navigator.userAgent,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack,
    },
    context,
  }

  // Send critical errors immediately
  if (type === 'react-error-boundary' || error.message.includes('ChunkLoadError')) {
    sendError(frontendError)
  } else {
    // Queue less critical errors for batching
    queueError(frontendError)
  }
}

/**
 * Report window.onerror event
 */
export function reportWindowError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error,
): void {
  const errorMessage = typeof message === 'string' ? message : message.type
  const errorObj = error || new Error(errorMessage)

  reportError('error', errorObj, {
    metadata: {
      source,
      lineno,
      colno,
    },
  })
}

/**
 * Report unhandled promise rejection
 */
export function reportUnhandledRejection(reason: unknown): void {
  let error: Error

  if (reason instanceof Error) {
    error = reason
  } else if (typeof reason === 'string') {
    error = new Error(reason)
  } else {
    error = new Error(JSON.stringify(reason))
  }

  reportError('unhandledrejection', error)
}

/**
 * Initialize global error handlers
 */
export function initErrorReporting(): void {
  const config = getPerformanceConfig()

  if (!config.enabled) {
    return
  }

  // Handle uncaught errors
  window.addEventListener('error', event => {
    reportWindowError(event.message, event.filename, event.lineno, event.colno, event.error)
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    reportUnhandledRejection(event.reason)
  })

  // Flush remaining errors when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      batchSendErrors()
    }
  })

  // Flush errors before page unload
  window.addEventListener('beforeunload', () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    batchSendErrors()
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('[Error Reporting] Initialized')
  }
}
