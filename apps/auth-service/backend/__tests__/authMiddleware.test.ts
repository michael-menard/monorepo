import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middleware/authMiddleware';
import { User } from '../models/User';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/User');

describe('Auth Middleware', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      headers: {},
      userId: null
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('authentication', () => {
    it('should authenticate user with valid token in cookies', async () => {
      mockRequest.cookies = { token: 'valid-token' };
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'test-user-id' });

      await verifyToken(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(mockRequest.userId).toBe('test-user-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', async () => {
      await verifyToken(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockRequest.cookies = { token: 'invalid-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await verifyToken(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if JWT_SECRET is not configured', async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      mockRequest.cookies = { token: 'valid-token' };

      await verifyToken(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });

      // Restore environment variable
      process.env.JWT_SECRET = originalJwtSecret;
    });

    it('should handle decoded token without userId', async () => {
      mockRequest.cookies = { token: 'valid-token' };
      (jwt.verify as jest.Mock).mockReturnValue({ someOtherField: 'value' });

      await verifyToken(mockRequest as Request, mockResponse as Response, mockNext as NextFunction);

      expect(mockRequest.userId).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 