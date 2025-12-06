/**
 * Unit Tests for Error Classes
 *
 * Tests the error class hierarchy and utility functions.
 * Focus: API contract, error serialization, type guards, error conversion.
 */

import { describe, it, expect } from 'vitest'
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  FileError,
  SearchError,
  DatabaseError,
  isApiError,
  toApiError,
} from '../errors.js'

describe('Error Classes', () => {
  describe('Error Class Instantiation - Status Codes', () => {
    it('should have correct status codes for all error classes', () => {
      expect(new BadRequestError('test').statusCode).toBe(400)
      expect(new UnauthorizedError('test').statusCode).toBe(401)
      expect(new ForbiddenError('test').statusCode).toBe(403)
      expect(new NotFoundError('test').statusCode).toBe(404)
      expect(new ConflictError('test').statusCode).toBe(409)
      expect(new ValidationError('test').statusCode).toBe(422)
      expect(new RateLimitError('test').statusCode).toBe(429)
      expect(new InternalServerError('test').statusCode).toBe(500)
      expect(new ServiceUnavailableError('test').statusCode).toBe(503)
      expect(new FileError('test').statusCode).toBe(400)
      expect(new SearchError('test').statusCode).toBe(500)
      expect(new DatabaseError('test').statusCode).toBe(500)
    })
  })

  describe('Error Class Instantiation - Error Types', () => {
    it('should have correct errorType for all error classes', () => {
      expect(new BadRequestError('test').errorType).toBe('BAD_REQUEST')
      expect(new UnauthorizedError('test').errorType).toBe('UNAUTHORIZED')
      expect(new ForbiddenError('test').errorType).toBe('FORBIDDEN')
      expect(new NotFoundError('test').errorType).toBe('NOT_FOUND')
      expect(new ConflictError('test').errorType).toBe('CONFLICT')
      expect(new ValidationError('test').errorType).toBe('VALIDATION_ERROR')
      expect(new RateLimitError('test').errorType).toBe('TOO_MANY_REQUESTS')
      expect(new InternalServerError('test').errorType).toBe('INTERNAL_ERROR')
      expect(new ServiceUnavailableError('test').errorType).toBe('SERVICE_UNAVAILABLE')
      expect(new FileError('test').errorType).toBe('FILE_ERROR')
      expect(new SearchError('test').errorType).toBe('SEARCH_ERROR')
      expect(new DatabaseError('test').errorType).toBe('DATABASE_ERROR')
    })
  })

  describe('Error Constructor - Custom Messages and Details', () => {
    it('should create error with custom message', () => {
      const error = new NotFoundError('MOC project not found')

      expect(error.message).toBe('MOC project not found')
      expect(error.name).toBe('NotFoundError')
      expect(error.statusCode).toBe(404)
      expect(error.errorType).toBe('NOT_FOUND')
    })

    it('should create error with custom message and details', () => {
      const error = new NotFoundError('MOC not found', {
        mocId: '123',
        userId: 'abc',
      })

      expect(error.details).toEqual({
        mocId: '123',
        userId: 'abc',
      })
    })

    it('should create error without details', () => {
      const error = new BadRequestError('Invalid request')
      expect(error.details).toBeUndefined()
    })
  })

  describe('Default Messages', () => {
    it('should use default messages when not provided', () => {
      expect(new BadRequestError().message).toBe('Bad request')
      expect(new UnauthorizedError().message).toBe('Authentication required')
      expect(new ForbiddenError().message).toBe('Access forbidden')
      expect(new NotFoundError().message).toBe('Resource not found')
      expect(new ConflictError().message).toBe('Resource conflict')
      expect(new ValidationError().message).toBe('Validation failed')
      expect(new RateLimitError().message).toBe('Rate limit exceeded')
      expect(new InternalServerError().message).toBe('Internal server error')
      expect(new ServiceUnavailableError().message).toBe('Service temporarily unavailable')
      expect(new FileError().message).toBe('File operation failed')
      expect(new SearchError().message).toBe('Search operation failed')
      expect(new DatabaseError().message).toBe('Database operation failed')
    })
  })

  describe('Error Serialization - toJSON()', () => {
    it('should serialize error with all parameters', () => {
      const error = new NotFoundError('Resource not found', { id: '123' })
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'NotFoundError',
        errorType: 'NOT_FOUND',
        message: 'Resource not found',
        statusCode: 404,
        isRetryable: false,
        details: { id: '123' },
      })
    })

    it('should serialize error without details', () => {
      const error = new BadRequestError('Bad request')
      const json = error.toJSON()

      expect(json).toEqual({
        name: 'BadRequestError',
        errorType: 'BAD_REQUEST',
        message: 'Bad request',
        statusCode: 400,
        isRetryable: false,
        details: undefined,
      })
    })

    it('should work with JSON.stringify', () => {
      const error = new ValidationError('Validation failed', {
        field: 'email',
        reason: 'invalid format',
      })

      const jsonString = JSON.stringify(error)
      const parsed = JSON.parse(jsonString)

      expect(parsed.name).toBe('ValidationError')
      expect(parsed.errorType).toBe('VALIDATION_ERROR')
      expect(parsed.statusCode).toBe(422)
      expect(parsed.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      })
    })
  })

  describe('Error Stack Trace', () => {
    it('should capture stack trace', () => {
      const error = new NotFoundError('Resource not found')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('NotFoundError')
    })
  })

  describe('Type Guard - isApiError()', () => {
    it('should return true for ApiError instances', () => {
      const errors = [
        new NotFoundError('test'),
        new BadRequestError('test'),
        new InternalServerError('test'),
      ]

      errors.forEach((error) => {
        expect(isApiError(error)).toBe(true)
      })
    })

    it('should return false for standard Error', () => {
      const error = new Error('Something broke')
      expect(isApiError(error)).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      const values = [{ message: 'error' }, null, undefined, 'error string', 500]

      values.forEach((value) => {
        expect(isApiError(value)).toBe(false)
      })
    })
  })

  describe('Error Conversion - toApiError()', () => {
    it('should preserve ApiError instances', () => {
      const originalError = new NotFoundError('Not found')
      const convertedError = toApiError(originalError)

      expect(convertedError).toBe(originalError)
      expect(convertedError).toBeInstanceOf(NotFoundError)
    })

    it('should wrap standard Error', () => {
      const originalError = new Error('Database connection failed')
      const convertedError = toApiError(originalError)

      expect(convertedError).toBeInstanceOf(InternalServerError)
      expect(convertedError.message).toBe('Database connection failed')
      expect(convertedError.details?.originalError).toBe('Error')
      expect(convertedError.details?.stack).toBeDefined()
    })

    it('should wrap non-Error values - string', () => {
      const value = 'Something went wrong'
      const convertedError = toApiError(value)

      expect(convertedError).toBeInstanceOf(InternalServerError)
      expect(convertedError.message).toBe('An unexpected error occurred')
      expect(convertedError.details?.error).toBe('Something went wrong')
    })

    it('should wrap non-Error values - number', () => {
      const value = 500
      const convertedError = toApiError(value)

      expect(convertedError).toBeInstanceOf(InternalServerError)
      expect(convertedError.message).toBe('An unexpected error occurred')
      expect(convertedError.details?.error).toBe('500')
    })

    it('should wrap null/undefined', () => {
      const nullError = toApiError(null)
      const undefinedError = toApiError(undefined)

      expect(nullError).toBeInstanceOf(InternalServerError)
      expect(undefinedError).toBeInstanceOf(InternalServerError)
      expect(nullError.message).toBe('An unexpected error occurred')
      expect(undefinedError.message).toBe('An unexpected error occurred')
    })
  })

  describe('Error Inheritance', () => {
    it('should inherit from Error', () => {
      const error = new NotFoundError('test')
      expect(error).toBeInstanceOf(Error)
    })

    it('should inherit from ApiError', () => {
      const errors = [
        new BadRequestError('test'),
        new UnauthorizedError('test'),
        new NotFoundError('test'),
        new InternalServerError('test'),
      ]

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(ApiError)
      })
    })
  })
})
