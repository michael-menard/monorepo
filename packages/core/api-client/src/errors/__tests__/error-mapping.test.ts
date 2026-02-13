/**
 * Story 3.1.21: Client Error Mapping Tests
 *
 * Tests the error mapping module that converts API errors to user-friendly messages.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseApiError,
  parseApiErrorFromResponse,
  getRetryDelay,
  isRetryableStatus,
  formatSupportReference,
  type ParsedApiError,
} from '../error-mapping'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('Error Mapping Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parseApiError', () => {
    it('should parse standard error response with new contract', () => {
      const response = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: { id: '123' },
        },
        correlationId: 'corr-123',
        timestamp: '2025-01-01T00:00:00Z',
      }

      const result = parseApiError(response, 404)

      expect(result.code).toBe('NOT_FOUND')
      expect(result.originalMessage).toBe('Resource not found')
      expect(result.title).toBe('Not Found')
      expect(result.isRetryable).toBe(false)
      expect(result.action).toBe('navigate-away')
      expect(result.correlationId).toBe('corr-123')
      expect(result.details).toEqual({ id: '123' })
      expect(result.httpStatus).toBe(404)
    })

    it('should map UNAUTHORIZED to login action', () => {
      const response = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        correlationId: 'corr-456',
      }

      const result = parseApiError(response, 401)

      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.action).toBe('login')
      expect(result.isRetryable).toBe(false)
      expect(result.icon).toBe('lock')
    })

    it('should map EXPIRED_SESSION to login action', () => {
      const response = {
        success: false,
        error: {
          code: 'EXPIRED_SESSION',
          message: 'Session has expired',
        },
      }

      const result = parseApiError(response, 401)

      expect(result.code).toBe('EXPIRED_SESSION')
      expect(result.action).toBe('login')
      expect(result.title).toBe('Session Expired')
    })

    it('should map DUPLICATE_SLUG to fix-input action', () => {
      const response = {
        success: false,
        error: {
          code: 'DUPLICATE_SLUG',
          message: 'A resource with this slug already exists',
          details: { suggestedSlug: 'my-moc-2' },
        },
        correlationId: 'corr-789',
      }

      const result = parseApiError(response, 409)

      expect(result.code).toBe('DUPLICATE_SLUG')
      expect(result.action).toBe('fix-input')
      expect(result.details?.suggestedSlug).toBe('my-moc-2')
    })

    it('should map RATE_LIMITED to wait action with retry hint', () => {
      const response = {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please retry in 60 seconds',
        },
      }

      const result = parseApiError(response, 429)

      expect(result.code).toBe('RATE_LIMITED')
      expect(result.action).toBe('wait')
      expect(result.isRetryable).toBe(true)
      expect(result.retryDelay).toBe(60)
    })

    it('should map INVALID_TYPE to fix-input action', () => {
      const response = {
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'File type not allowed',
          details: { allowedTypes: ['application/pdf', 'image/png'] },
        },
      }

      const result = parseApiError(response, 400)

      expect(result.code).toBe('INVALID_TYPE')
      expect(result.action).toBe('fix-input')
      expect(result.icon).toBe('file')
    })

    it('should map SIZE_TOO_LARGE to fix-input action', () => {
      const response = {
        success: false,
        error: {
          code: 'SIZE_TOO_LARGE',
          message: 'File exceeds 50MB limit',
          details: { maxSize: 52428800, actualSize: 60000000 },
        },
      }

      const result = parseApiError(response, 400)

      expect(result.code).toBe('SIZE_TOO_LARGE')
      expect(result.action).toBe('fix-input')
      expect(result.title).toBe('File Too Large')
    })

    it('should map SERVICE_UNAVAILABLE to retry action', () => {
      const response = {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
        },
      }

      const result = parseApiError(response, 503)

      expect(result.code).toBe('SERVICE_UNAVAILABLE')
      expect(result.action).toBe('retry')
      expect(result.isRetryable).toBe(true)
      expect(result.retryDelay).toBe(30)
    })

    it('should handle unknown error codes gracefully', () => {
      const response = {
        success: false,
        error: {
          code: 'UNKNOWN_NEW_CODE',
          message: 'Something unexpected happened',
        },
      }

      const result = parseApiError(response, 500)

      expect(result.code).toBe('UNKNOWN_NEW_CODE')
      expect(result.action).toBe('contact-support')
      expect(result.isRetryable).toBe(false)
    })

    it('should handle legacy error format with type field', () => {
      const response = {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      }

      const result = parseApiError(response, 422)

      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.action).toBe('fix-input')
    })

    it('should handle completely malformed response', () => {
      const response = { foo: 'bar' }

      const result = parseApiError(response, 500)

      expect(result.code).toBe('INTERNAL_ERROR')
      expect(result.action).toBe('contact-support')
    })

    it('should use API message for validation errors', () => {
      const response = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email must be a valid email address',
        },
      }

      const result = parseApiError(response, 422)

      expect(result.message).toBe('Email must be a valid email address')
    })
  })

  describe('parseApiErrorFromResponse', () => {
    it('should parse Response object with JSON body', async () => {
      const body = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
        correlationId: 'header-corr-123',
      }

      const response = new Response(JSON.stringify(body), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await parseApiErrorFromResponse(response)

      expect(result.code).toBe('NOT_FOUND')
      expect(result.httpStatus).toBe(404)
      expect(result.correlationId).toBe('header-corr-123')
    })

    it('should use X-Correlation-Id header if body lacks correlationId', async () => {
      const body = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error',
        },
      }

      const response = new Response(JSON.stringify(body), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': 'header-123',
        },
      })

      const result = await parseApiErrorFromResponse(response)

      expect(result.correlationId).toBe('header-123')
    })

    it('should handle non-JSON response', async () => {
      const response = new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })

      const result = await parseApiErrorFromResponse(response)

      expect(result.code).toBe('INTERNAL_ERROR')
      expect(result.httpStatus).toBe(500)
    })
  })

  describe('getRetryDelay', () => {
    it('should use Retry-After header if present', () => {
      const error: ParsedApiError = {
        code: 'RATE_LIMITED',
        originalMessage: 'Too many requests',
        title: 'Too Many Requests',
        message: 'Please wait',
        isRetryable: true,
        retryDelay: 60,
        action: 'wait',
      }

      const delay = getRetryDelay(error, '120')

      expect(delay).toBe(120)
    })

    it('should fall back to error retryDelay', () => {
      const error: ParsedApiError = {
        code: 'SERVICE_UNAVAILABLE',
        originalMessage: 'Service unavailable',
        title: 'Service Unavailable',
        message: 'Please retry',
        isRetryable: true,
        retryDelay: 30,
        action: 'retry',
      }

      const delay = getRetryDelay(error, null)

      expect(delay).toBe(30)
    })

    it('should default to 5 seconds if no delay specified', () => {
      const error: ParsedApiError = {
        code: 'INTERNAL_ERROR',
        originalMessage: 'Error',
        title: 'Error',
        message: 'Error',
        isRetryable: true,
        action: 'retry',
      }

      const delay = getRetryDelay(error, null)

      expect(delay).toBe(5)
    })
  })

  describe('isRetryableStatus', () => {
    it('should return false for 401', () => {
      expect(isRetryableStatus(401)).toBe(false)
    })

    it('should return false for 403', () => {
      expect(isRetryableStatus(403)).toBe(false)
    })

    it('should return false for 404', () => {
      expect(isRetryableStatus(404)).toBe(false)
    })

    it('should return true for 429', () => {
      expect(isRetryableStatus(429)).toBe(true)
    })

    it('should return true for 500', () => {
      expect(isRetryableStatus(500)).toBe(true)
    })

    it('should return true for 503', () => {
      expect(isRetryableStatus(503)).toBe(true)
    })

    it('should return false for 400', () => {
      expect(isRetryableStatus(400)).toBe(false)
    })
  })

  describe('formatSupportReference', () => {
    it('should format correlation ID for support', () => {
      const error: ParsedApiError = {
        code: 'INTERNAL_ERROR',
        originalMessage: 'Error',
        title: 'Error',
        message: 'Error',
        isRetryable: false,
        action: 'contact-support',
        correlationId: 'abc12345-defg-hijk-lmno-pqrstuvwxyz',
      }

      const reference = formatSupportReference(error)

      expect(reference).toBe('Reference: ABC12345')
    })

    it('should return empty string if no correlation ID', () => {
      const error: ParsedApiError = {
        code: 'INTERNAL_ERROR',
        originalMessage: 'Error',
        title: 'Error',
        message: 'Error',
        isRetryable: false,
        action: 'contact-support',
      }

      const reference = formatSupportReference(error)

      expect(reference).toBe('')
    })
  })
})
