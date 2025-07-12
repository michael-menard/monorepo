import { Request, Response, NextFunction } from 'express';
import { notFound, errorHandler } from '@repo/api-shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Error Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      originalUrl: '/test'
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('notFound', () => {
    it('should return 404 status and error message', () => {
      notFound(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 404,
        message: 'Not Found - /test'
      });
    });

    it('should include request URL in error message', () => {
      mockRequest.originalUrl = '/api/auth/signup';

      notFound(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 404,
        message: 'Not Found - /api/auth/signup'
      });
    });
  });

  describe('errorHandler', () => {
    it('should handle generic errors', () => {
      const error = new Error('Test error');
      const mockNext = vi.fn();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 500,
        message: 'Test error',
        stack: undefined
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors with custom status code', () => {
      const error = new Error('Custom error');
      (error as any).statusCode = 403;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 403,
        message: 'Custom error',
        stack: undefined
      });
    });

    it('should handle duplicate key errors', () => {
      const error = new Error('Duplicate key error');
      (error as any).code = 11000;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 400,
        message: 'Duplicate resource found',
        stack: undefined
      });
    });

    it('should handle errors without message', () => {
      const error = new Error();

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 500,
        message: 'Internal Server Error',
        stack: undefined
      });
    });

    it('should include stack trace in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 500,
        message: 'Test error',
        stack: 'Error stack trace'
      });

      // Restore environment variable
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        statusCode: 500,
        message: 'Test error',
        stack: undefined
      });

      // Restore environment variable
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
}); 