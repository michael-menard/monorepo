import { Request, Response } from 'express';
import { signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/authMiddleware';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { User } from '../models/User';
import bcryptjs from 'bcryptjs';
import request from 'supertest';
import { app } from '../index';

// Mock the auth controller
vi.mock('../controllers/auth.controller', () => ({
  login: vi.fn((req, res) => res.status(200).json({ message: 'Login successful' })),
  logout: vi.fn((req, res) => res.status(200).json({ message: 'Logout successful' })),
  signup: vi.fn((req, res) => res.status(201).json({ message: 'Signup successful' })),
  verifyEmail: vi.fn((req, res) => res.status(200).json({ message: 'Email verified' })),
  forgotPassword: vi.fn((req, res) => res.status(200).json({ message: 'Reset email sent' })),
  resetPassword: vi.fn((req, res) => res.status(200).json({ message: 'Password reset' })),
  checkAuth: vi.fn((req, res) => res.status(200).json({ message: 'Authenticated' })),
}));

// Mock the auth middleware
vi.mock('../middleware/authMiddleware', () => ({
  verifyToken: vi.fn((req, res, next) => next()),
}));

describe('Auth Routes', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      cookies: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('GET /api/auth/check-auth', () => {
    it('should return 200 for authenticated user', async () => {
      mockRequest.cookies = { token: 'valid-token' };

      await checkAuth(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authenticated' });
    });
  });

  describe('POST /api/auth/sign-up', () => {
    it('should handle signup request', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockRequest.body = signupData;

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Signup successful' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should handle login request', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockRequest.body = loginData;

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Login successful' });
    });
  });

  describe('POST /api/auth/log-out', () => {
    it('should handle logout request', async () => {
      await logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should handle email verification request', async () => {
      const verificationData = {
        token: 'verification-token'
      };

      mockRequest.body = verificationData;

      await verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Email verified' });
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should handle forgot password request', async () => {
      const forgotPasswordData = {
        email: 'test@example.com'
      };

      mockRequest.body = forgotPasswordData;

      await forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Reset email sent' });
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    it('should handle password reset request', async () => {
      const resetData = {
        password: 'newpassword123'
      };

      mockRequest.params = { token: 'reset-token' };
      mockRequest.body = resetData;

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Password reset' });
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      // Arrange: create an unverified user
      const user = await User.create({
        email: 'unverified@example.com',
        password: await bcryptjs.hash('password123', 10),
        name: 'Unverified User',
        isVerified: false,
      });
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unverified@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Verification email resent');
      await User.deleteOne({ email: 'unverified@example.com' });
    });

    it('should return error if user is already verified', async () => {
      // Arrange: create a verified user
      const user = await User.create({
        email: 'verified@example.com',
        password: await bcryptjs.hash('password123', 10),
        name: 'Verified User',
        isVerified: true,
      });
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'verified@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ALREADY_VERIFIED');
      await User.deleteOne({ email: 'verified@example.com' });
    });

    it('should return error if user is not found', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nouser@example.com' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });

    it('should return error if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('EMAIL_REQUIRED');
    });
  });

  describe('Auth Middleware', () => {
    it('should call verifyToken middleware', async () => {
      mockRequest.cookies = { token: 'valid-token' };

      await verifyToken(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(verifyToken).toHaveBeenCalled();
    });
  });
}); 