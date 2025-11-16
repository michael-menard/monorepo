/**
 * Unit Tests for Custom Error Types
 *
 * Tests all custom error classes to ensure they follow coding standards:
 * - Never use `throw new Error()` - always create custom error types
 * - Proper error inheritance and properties
 * - Correct HTTP status codes and error codes
 */

import { describe, it, expect } from 'vitest'
import {
  AuthError,
  UnauthorizedError,
  InvalidTokenError,
  TokenExpiredError,
  InvalidIssuerError,
  ForbiddenError,
  ValidationError,
  AuthInternalError,
} from '../errors'

describe('AuthError Base Class', () => {
  // Create a concrete implementation for testing
  class TestAuthError extends AuthError {
    readonly statusCode = 418
    readonly code = 'TEST_ERROR'
  }

  it('should set correct name and message', () => {
    // When: Creating auth error
    const error = new TestAuthError('Test message')

    // Then: Properties are set correctly
    expect(error.name).toBe('TestAuthError')
    expect(error.message).toBe('Test message')
    expect(error.statusCode).toBe(418)
    expect(error.code).toBe('TEST_ERROR')
  })

  it('should be instance of Error', () => {
    // When: Creating auth error
    const error = new TestAuthError('Test message')

    // Then: Is proper Error instance
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AuthError)
  })
})

describe('UnauthorizedError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new UnauthorizedError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.message).toBe('Authentication required')
    expect(error.name).toBe('UnauthorizedError')
  })

  it('should accept custom message', () => {
    // When: Creating error with custom message
    const error = new UnauthorizedError('Custom auth message')

    // Then: Uses custom message
    expect(error.message).toBe('Custom auth message')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
  })
})

describe('InvalidTokenError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new InvalidTokenError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('INVALID_TOKEN')
    expect(error.message).toBe('Invalid authentication token')
    expect(error.name).toBe('InvalidTokenError')
  })

  it('should accept custom message', () => {
    // When: Creating error with custom message
    const error = new InvalidTokenError('Token format is invalid')

    // Then: Uses custom message
    expect(error.message).toBe('Token format is invalid')
  })
})

describe('TokenExpiredError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new TokenExpiredError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('TOKEN_EXPIRED')
    expect(error.message).toBe('Authentication token has expired')
    expect(error.name).toBe('TokenExpiredError')
  })

  it('should accept custom message with expiration details', () => {
    // When: Creating error with expiration details
    const error = new TokenExpiredError('Token expired at 2021-12-20T01:00:00Z')

    // Then: Uses custom message
    expect(error.message).toBe('Token expired at 2021-12-20T01:00:00Z')
  })
})

describe('InvalidIssuerError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new InvalidIssuerError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('INVALID_ISSUER')
    expect(error.message).toBe('Token is not from expected issuer')
    expect(error.name).toBe('InvalidIssuerError')
  })

  it('should accept custom message with issuer details', () => {
    // When: Creating error with issuer details
    const customMessage = "Token issuer 'https://malicious.com' does not match expected 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123'"
    const error = new InvalidIssuerError(customMessage)

    // Then: Uses custom message
    expect(error.message).toBe(customMessage)
  })
})

describe('ForbiddenError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new ForbiddenError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
    expect(error.message).toBe('Access denied')
    expect(error.name).toBe('ForbiddenError')
  })

  it('should accept custom message for resource access', () => {
    // When: Creating error with resource-specific message
    const error = new ForbiddenError("Cannot access another user's profile")

    // Then: Uses custom message
    expect(error.message).toBe("Cannot access another user's profile")
  })
})

describe('ValidationError', () => {
  it('should have correct properties with default field', () => {
    // When: Creating error without field
    const error = new ValidationError('Resource ID is required')

    // Then: Properties are correct
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Resource ID is required')
    expect(error.name).toBe('ValidationError')
    expect(error.field).toBeUndefined()
  })

  it('should store field information', () => {
    // When: Creating error with field
    const error = new ValidationError('Invalid email format', 'email')

    // Then: Field is stored
    expect(error.message).toBe('Invalid email format')
    expect(error.field).toBe('email')
  })
})

describe('AuthInternalError', () => {
  it('should have correct properties with default message', () => {
    // When: Creating error with default message
    const error = new AuthInternalError()

    // Then: Properties are correct
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.message).toBe('Failed to validate authentication')
    expect(error.name).toBe('AuthInternalError')
  })

  it('should accept custom message for specific errors', () => {
    // When: Creating error with specific message
    const error = new AuthInternalError('Database connection failed during auth validation')

    // Then: Uses custom message
    expect(error.message).toBe('Database connection failed during auth validation')
  })
})

describe('Error Inheritance Chain', () => {
  it('should maintain proper inheritance chain', () => {
    // Given: Various error instances
    const errors = [
      new UnauthorizedError(),
      new InvalidTokenError(),
      new TokenExpiredError(),
      new InvalidIssuerError(),
      new ForbiddenError(),
      new ValidationError('test'),
      new AuthInternalError(),
    ]

    errors.forEach((error) => {
      // Then: All errors inherit properly
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error.name).toBeTruthy()
      expect(error.statusCode).toBeGreaterThan(0)
      expect(error.code).toBeTruthy()
    })
  })

  it('should have unique status codes and error codes', () => {
    // Given: All error types
    const errors = [
      new UnauthorizedError(),
      new InvalidTokenError(),
      new TokenExpiredError(),
      new InvalidIssuerError(),
      new ForbiddenError(),
      new ValidationError('test'),
      new AuthInternalError(),
    ]

    // When: Collecting status codes and error codes
    const statusCodes = errors.map(e => e.statusCode)
    const errorCodes = errors.map(e => e.code)

    // Then: Status codes are appropriate for error types
    expect(statusCodes).toContain(400) // ValidationError
    expect(statusCodes).toContain(401) // Auth errors
    expect(statusCodes).toContain(403) // ForbiddenError
    expect(statusCodes).toContain(500) // AuthInternalError

    // And error codes are unique and descriptive
    expect(errorCodes).toContain('UNAUTHORIZED')
    expect(errorCodes).toContain('INVALID_TOKEN')
    expect(errorCodes).toContain('TOKEN_EXPIRED')
    expect(errorCodes).toContain('INVALID_ISSUER')
    expect(errorCodes).toContain('FORBIDDEN')
    expect(errorCodes).toContain('VALIDATION_ERROR')
    expect(errorCodes).toContain('INTERNAL_ERROR')

    // All codes should be unique
    const uniqueErrorCodes = [...new Set(errorCodes)]
    expect(uniqueErrorCodes).toHaveLength(errorCodes.length)
  })
})

describe('Error Usage in try-catch', () => {
  it('should work properly when thrown and caught', () => {
    // Given: Function that throws custom error
    const throwCustomError = () => {
      throw new InvalidTokenError('Test token error')
    }

    // When: Catching the error
    expect(() => throwCustomError()).toThrow(InvalidTokenError)
    expect(() => throwCustomError()).toThrow('Test token error')

    // And: Error can be caught and inspected
    try {
      throwCustomError()
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTokenError)
      expect(error).toBeInstanceOf(AuthError)
      if (error instanceof InvalidTokenError) {
        expect(error.statusCode).toBe(401)
        expect(error.code).toBe('INVALID_TOKEN')
      }
    }
  })
})
