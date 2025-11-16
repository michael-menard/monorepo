/**
 * Unit Tests for Error Classes
 *
 * Tests the error class hierarchy and utility functions.
 * Focus: API contract, error serialization, type guards, error conversion.
 */

import { describe, it, expect } from 'vitest';
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
} from '../index';

describe('Error Classes', () => {
  describe('Error Class Instantiation - Status Codes', () => {
    it('should have correct status codes for all error classes', () => {
      // Given: Each ApiError subclass
      // When: Instantiated with a message
      // Then: Has correct statusCode property
      expect(new BadRequestError('test').statusCode).toBe(400);
      expect(new UnauthorizedError('test').statusCode).toBe(401);
      expect(new ForbiddenError('test').statusCode).toBe(403);
      expect(new NotFoundError('test').statusCode).toBe(404);
      expect(new ConflictError('test').statusCode).toBe(409);
      expect(new ValidationError('test').statusCode).toBe(422);
      expect(new RateLimitError('test').statusCode).toBe(429);
      expect(new InternalServerError('test').statusCode).toBe(500);
      expect(new ServiceUnavailableError('test').statusCode).toBe(503);
      expect(new FileError('test').statusCode).toBe(400);
      expect(new SearchError('test').statusCode).toBe(500);
      expect(new DatabaseError('test').statusCode).toBe(500);
    });
  });

  describe('Error Class Instantiation - Error Types', () => {
    it('should have correct errorType for all error classes', () => {
      // Given: Each ApiError subclass
      // When: Instantiated
      // Then: Has correct errorType property matching ApiErrorType enum
      expect(new BadRequestError('test').errorType).toBe('BAD_REQUEST');
      expect(new UnauthorizedError('test').errorType).toBe('UNAUTHORIZED');
      expect(new ForbiddenError('test').errorType).toBe('FORBIDDEN');
      expect(new NotFoundError('test').errorType).toBe('NOT_FOUND');
      expect(new ConflictError('test').errorType).toBe('CONFLICT');
      expect(new ValidationError('test').errorType).toBe('VALIDATION_ERROR');
      expect(new RateLimitError('test').errorType).toBe('TOO_MANY_REQUESTS');
      expect(new InternalServerError('test').errorType).toBe('INTERNAL_ERROR');
      expect(new ServiceUnavailableError('test').errorType).toBe('SERVICE_UNAVAILABLE');
      expect(new FileError('test').errorType).toBe('FILE_ERROR');
      expect(new SearchError('test').errorType).toBe('SEARCH_ERROR');
      expect(new DatabaseError('test').errorType).toBe('DATABASE_ERROR');
    });
  });

  describe('Error Constructor - Custom Messages and Details', () => {
    it('should create error with custom message', () => {
      // Given: NotFoundError('MOC project not found')
      const error = new NotFoundError('MOC project not found');

      // When: Instantiated
      // Then: error properties are correct
      expect(error.message).toBe('MOC project not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.statusCode).toBe(404);
      expect(error.errorType).toBe('NOT_FOUND');
    });

    it('should create error with custom message and details', () => {
      // Given: NotFoundError with message and details object
      const error = new NotFoundError('MOC not found', {
        mocId: '123',
        userId: 'abc',
      });

      // When: Instantiated
      // Then: error.details contains provided details
      expect(error.details).toEqual({
        mocId: '123',
        userId: 'abc',
      });
    });

    it('should create error without details', () => {
      // Given: BadRequestError('Invalid request')
      const error = new BadRequestError('Invalid request');

      // When: Instantiated
      // Then: error.details === undefined
      expect(error.details).toBeUndefined();
    });
  });

  describe('Default Messages', () => {
    it('should use default messages when not provided', () => {
      // Given: Error classes instantiated without messages
      // When: Checking message property
      // Then: Default message is used
      expect(new BadRequestError().message).toBe('Bad request');
      expect(new UnauthorizedError().message).toBe('Authentication required');
      expect(new ForbiddenError().message).toBe('Access forbidden');
      expect(new NotFoundError().message).toBe('Resource not found');
      expect(new ConflictError().message).toBe('Resource conflict');
      expect(new ValidationError().message).toBe('Validation failed');
      expect(new RateLimitError().message).toBe('Rate limit exceeded');
      expect(new InternalServerError().message).toBe('Internal server error');
      expect(new ServiceUnavailableError().message).toBe('Service temporarily unavailable');
      expect(new FileError().message).toBe('File operation failed');
      expect(new SearchError().message).toBe('Search operation failed');
      expect(new DatabaseError().message).toBe('Database operation failed');
    });
  });

  describe('Error Serialization - toJSON()', () => {
    it('should serialize error with all parameters', () => {
      // Given: NotFoundError with message and details
      const error = new NotFoundError('Resource not found', { id: '123' });

      // When: error.toJSON() is called
      const json = error.toJSON();

      // Then: Returns object with keys: name, errorType, message, statusCode, details
      expect(json).toEqual({
        name: 'NotFoundError',
        errorType: 'NOT_FOUND',
        message: 'Resource not found',
        statusCode: 404,
        details: { id: '123' },
      });
    });

    it('should serialize error without details', () => {
      // Given: BadRequestError without details
      const error = new BadRequestError('Bad request');

      // When: error.toJSON() is called
      const json = error.toJSON();

      // Then: Returns object with details: undefined
      expect(json).toEqual({
        name: 'BadRequestError',
        errorType: 'BAD_REQUEST',
        message: 'Bad request',
        statusCode: 400,
        details: undefined,
      });
    });

    it('should work with JSON.stringify', () => {
      // Given: Any ApiError instance
      const error = new ValidationError('Validation failed', {
        field: 'email',
        reason: 'invalid format',
      });

      // When: JSON.stringify is called
      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);

      // Then: Serialization works correctly
      expect(parsed.name).toBe('ValidationError');
      expect(parsed.errorType).toBe('VALIDATION_ERROR');
      expect(parsed.statusCode).toBe(422);
      expect(parsed.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      });
    });
  });

  describe('Error Stack Trace', () => {
    it('should capture stack trace', () => {
      // Given: Any ApiError subclass instantiated
      const error = new NotFoundError('Resource not found');

      // When: Checking error.stack property
      // Then: Stack trace is present and starts with error name
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('NotFoundError');
    });
  });

  describe('Type Guard - isApiError()', () => {
    it('should return true for ApiError instances', () => {
      // Given: Various ApiError instances
      const errors = [
        new NotFoundError('test'),
        new BadRequestError('test'),
        new InternalServerError('test'),
      ];

      // When: isApiError(error) is called
      // Then: Returns true
      errors.forEach((error) => {
        expect(isApiError(error)).toBe(true);
      });
    });

    it('should return false for standard Error', () => {
      // Given: Standard Error
      const error = new Error('Something broke');

      // When: isApiError(error) is called
      // Then: Returns false
      expect(isApiError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      // Given: Plain object, null, undefined, string, number
      const values = [
        { message: 'error' },
        null,
        undefined,
        'error string',
        500,
      ];

      // When: isApiError(value) is called
      // Then: Returns false
      values.forEach((value) => {
        expect(isApiError(value)).toBe(false);
      });
    });
  });

  describe('Error Conversion - toApiError()', () => {
    it('should preserve ApiError instances', () => {
      // Given: NotFoundError instance
      const originalError = new NotFoundError('Not found');

      // When: toApiError(error) is called
      const convertedError = toApiError(originalError);

      // Then: Returns the same NotFoundError instance (not wrapped)
      expect(convertedError).toBe(originalError);
      expect(convertedError).toBeInstanceOf(NotFoundError);
    });

    it('should wrap standard Error', () => {
      // Given: Standard Error
      const originalError = new Error('Database connection failed');

      // When: toApiError(error) is called
      const convertedError = toApiError(originalError);

      // Then: Returns InternalServerError with original message and details
      expect(convertedError).toBeInstanceOf(InternalServerError);
      expect(convertedError.message).toBe('Database connection failed');
      expect(convertedError.details?.originalError).toBe('Error');
      expect(convertedError.details?.stack).toBeDefined();
    });

    it('should wrap non-Error values - string', () => {
      // Given: String value
      const value = 'Something went wrong';

      // When: toApiError(value) is called
      const convertedError = toApiError(value);

      // Then: Returns InternalServerError with generic message
      expect(convertedError).toBeInstanceOf(InternalServerError);
      expect(convertedError.message).toBe('An unexpected error occurred');
      expect(convertedError.details?.error).toBe('Something went wrong');
    });

    it('should wrap non-Error values - number', () => {
      // Given: Number value
      const value = 500;

      // When: toApiError(value) is called
      const convertedError = toApiError(value);

      // Then: Returns InternalServerError with generic message
      expect(convertedError).toBeInstanceOf(InternalServerError);
      expect(convertedError.message).toBe('An unexpected error occurred');
      expect(convertedError.details?.error).toBe('500');
    });

    it('should wrap null/undefined', () => {
      // Given: null or undefined
      const nullError = toApiError(null);
      const undefinedError = toApiError(undefined);

      // Then: Returns InternalServerError
      expect(nullError).toBeInstanceOf(InternalServerError);
      expect(undefinedError).toBeInstanceOf(InternalServerError);
      expect(nullError.message).toBe('An unexpected error occurred');
      expect(undefinedError.message).toBe('An unexpected error occurred');
    });
  });

  describe('Error Inheritance', () => {
    it('should inherit from Error', () => {
      // Given: Any ApiError subclass
      const error = new NotFoundError('test');

      // Then: Is instanceof Error
      expect(error).toBeInstanceOf(Error);
    });

    it('should inherit from ApiError', () => {
      // Given: Any ApiError subclass
      const errors = [
        new BadRequestError('test'),
        new UnauthorizedError('test'),
        new NotFoundError('test'),
        new InternalServerError('test'),
      ];

      // Then: All are instanceof ApiError
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(ApiError);
      });
    });
  });
});
