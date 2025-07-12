import jwt from 'jsonwebtoken';
import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie';
import { generateVerificationCode } from '../utils/generateVerificationCode';

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Utility Functions', () => {
  let mockResponse: any;

  beforeEach(() => {
    mockResponse = {
      cookie: jest.fn().mockReturnThis(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('generateTokenAndSetCookie', () => {
    it('should generate JWT token and set cookie', () => {
      const userId = 'test-user-id';
      const mockToken = 'mock-jwt-token';

      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      generateTokenAndSetCookie(mockResponse, userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
      );
    });

    it('should use fallback secret when JWT_SECRET is not set', () => {
      const userId = 'test-user-id';
      const originalJwtSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      generateTokenAndSetCookie(mockResponse, userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        'fallback_secret',
        { expiresIn: '7d' }
      );

      // Restore environment variable
      process.env.JWT_SECRET = originalJwtSecret;
    });

    it('should set secure cookie in production', () => {
      const userId = 'test-user-id';
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      generateTokenAndSetCookie(mockResponse, userId);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        'mock-token',
        expect.objectContaining({
          secure: true
        })
      );

      // Restore environment variable
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should set non-secure cookie in development', () => {
      const userId = 'test-user-id';
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      generateTokenAndSetCookie(mockResponse, userId);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'token',
        'mock-token',
        expect.objectContaining({
          secure: false
        })
      );

      // Restore environment variable
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a verification code', () => {
      const code = generateVerificationCode();

      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThanOrEqual(6);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();

      expect(code1).not.toBe(code2);
    });

    it('should generate codes within valid range', () => {
      const code = generateVerificationCode();
      const codeNumber = parseInt(code, 10);

      expect(codeNumber).toBeGreaterThanOrEqual(1000000);
      expect(codeNumber).toBeLessThanOrEqual(1009000);
    });

    it('should always generate numeric codes', () => {
      for (let i = 0; i < 10; i++) {
        const code = generateVerificationCode();
        expect(/^\d+$/.test(code)).toBe(true);
        expect(parseInt(code, 10)).toBeGreaterThan(0);
      }
    });
  });
}); 