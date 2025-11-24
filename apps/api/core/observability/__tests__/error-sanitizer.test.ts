/**
 * Unit Tests for Error Sanitizer
 *
 * Tests sanitization of errors before sending to clients
 */

import { describe, it, expect } from 'vitest'
import { sanitizeError, sanitizeErrorForLogging } from '../error-sanitizer'
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  InternalServerError,
} from '@/core/utils/responses'

describe('sanitizeError', () => {
  describe('ApiError instances', () => {
    it('should return ApiError as-is with all fields', () => {
      const error = new ValidationError('Invalid email format', {
        field: 'email',
        reason: 'must be valid email',
      })

      const sanitized = sanitizeError(error, true)

      expect(sanitized).toEqual({
        statusCode: 422,
        errorType: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        details: {
          field: 'email',
          reason: 'must be valid email',
        },
      })
    })

    it('should exclude details in production mode', () => {
      const error = new NotFoundError('User not found', {
        userId: '123',
      })

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 404,
        errorType: 'NOT_FOUND',
        message: 'User not found',
        details: undefined,
      })
    })
  })

  describe('AWS SDK errors', () => {
    it('should sanitize AWS ThrottlingException', () => {
      const error = new Error('Rate exceeded')
      error.name = 'ThrottlingException'

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'EXTERNAL_SERVICE_ERROR',
        message: 'Service is temporarily busy. Please try again.',
        details: undefined,
      })
    })

    it('should sanitize generic AWS errors', () => {
      const error = new Error('Internal AWS error occurred')
      error.name = 'AWSError'

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'EXTERNAL_SERVICE_ERROR',
        message: 'An error occurred with external service. Please try again.',
        details: undefined,
      })
    })

    it('should include debug info in development', () => {
      const error = new Error('S3 bucket not found')
      error.name = 'S3Error'

      const sanitized = sanitizeError(error, true)

      expect(sanitized.statusCode).toBe(500)
      expect(sanitized.errorType).toBe('EXTERNAL_SERVICE_ERROR')
      expect(sanitized.details).toEqual({
        service: 'AWS',
        errorName: 'S3Error',
      })
    })
  })

  describe('Database errors', () => {
    it('should sanitize PostgreSQL errors', () => {
      const error = new Error('relation "users" does not exist')
      error.name = 'PostgresError'

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'DATABASE_ERROR',
        message: 'A database error occurred. Please try again later.',
        details: undefined,
      })
    })

    it('should sanitize SQL errors without exposing queries', () => {
      const error = new Error('SELECT * FROM users WHERE password = ...') as any
      error.name = 'DatabaseError'
      error.code = '42P01'

      const sanitized = sanitizeError(error, true)

      expect(sanitized.statusCode).toBe(500)
      expect(sanitized.errorType).toBe('DATABASE_ERROR')
      expect(sanitized.message).toBe('A database error occurred. Please try again later.')
      // Should only include error code, not the query
      expect(sanitized.details).toEqual({
        errorCode: '42P01',
      })
    })
  })

  describe('Generic errors', () => {
    it('should wrap standard Error in generic message', () => {
      const error = new Error('Something broke')

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: undefined,
      })
    })

    it('should include original error name in development', () => {
      const error = new Error('Null pointer')
      error.name = 'NullPointerError'

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        originalError: 'NullPointerError',
      })
    })
  })

  describe('Non-Error objects', () => {
    it('should handle string errors', () => {
      const error = 'Something went wrong'

      const sanitized = sanitizeError(error, true)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: {
          errorType: 'string',
        },
      })
    })

    it('should handle number errors', () => {
      const error = 404

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        errorType: 'number',
      })
    })

    it('should handle null errors', () => {
      const error = null

      const sanitized = sanitizeError(error, false)

      expect(sanitized).toEqual({
        statusCode: 500,
        errorType: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: undefined,
      })
    })
  })

  describe('Sensitive data filtering', () => {
    it('should remove password fields from details', () => {
      const error = new ValidationError('Validation failed', {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      })

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        username: 'john',
        email: 'john@example.com',
        // password should be removed
      })
    })

    it('should remove token fields from details', () => {
      const error = new InternalServerError('Auth failed', {
        userId: '123',
        token: 'Bearer abc123',
        apiKey: 'key_secret',
      })

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        userId: '123',
        // token and apiKey should be removed
      })
    })

    it('should remove stack traces from details', () => {
      const error = new InternalServerError('Error', {
        context: 'upload',
        stack: 'Error: at line 123...',
        stackTrace: 'Full stack trace...',
      })

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        context: 'upload',
        // stack and stackTrace should be removed
      })
    })

    it('should recursively sanitize nested objects', () => {
      const error = new ValidationError('Nested error', {
        user: {
          id: '123',
          password: 'secret',
          profile: {
            name: 'John',
            secret: 'hidden',
          },
        },
      })

      const sanitized = sanitizeError(error, true)

      expect(sanitized.details).toEqual({
        user: {
          id: '123',
          profile: {
            name: 'John',
          },
        },
      })
    })
  })
})

describe('sanitizeErrorForLogging', () => {
  it('should include stack trace for logging', () => {
    const error = new Error('Test error')
    error.stack = 'Error: Test error\n  at line 1'

    const sanitized = sanitizeErrorForLogging(error)

    expect(sanitized.name).toBe('Error')
    expect(sanitized.message).toBe('Test error')
    expect(sanitized.stack).toBeDefined()
  })

  it('should remove password from additional properties', () => {
    const error = new Error('Auth error') as any
    error.username = 'john'
    error.password = 'secret123'
    error.context = 'login'

    const sanitized = sanitizeErrorForLogging(error)

    expect(sanitized.username).toBe('john')
    expect(sanitized.context).toBe('login')
    expect(sanitized.password).toBeUndefined()
  })

  it('should handle non-Error objects', () => {
    const error = 'string error'

    const sanitized = sanitizeErrorForLogging(error)

    expect(sanitized).toEqual({
      type: 'string',
      value: 'string error',
    })
  })

  it('should filter credentials from custom properties', () => {
    const error = new Error('Database error') as any
    error.password = 'secret123'
    error.token = 'Bearer abc'
    error.dbName = 'mydb'

    const sanitized = sanitizeErrorForLogging(error)

    expect(sanitized.dbName).toBe('mydb')
    expect(sanitized.password).toBeUndefined()
    expect(sanitized.token).toBeUndefined()
  })
})
