import { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import { signup, login, logout, verifyEmail, forgotPassword, resetPassword, checkAuth, resendVerification } from '../controllers/auth.controller';
import { User } from '../models/User';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { sendPasswordResetEmail } from '../mailtrap/emails';

// Mock dependencies
vi.mock('bcryptjs');
vi.mock('../utils/generateTokenAndSetCookie');
vi.mock('../mailtrap/emails');
vi.mock('../models/User', () => {
  const mockUser = {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  };
  
  const UserConstructor = vi.fn().mockImplementation(() => ({
    save: vi.fn().mockResolvedValue(true),
    toObject: () => ({ _id: 'test-id', email: 'test@example.com', name: 'Test User' }),
  }));
  
  Object.assign(UserConstructor, mockUser);
  
  return {
    User: UserConstructor,
  };
});

describe('Auth Controller', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      userId: 'test-user-id'
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockRequest.body = userData;
      (User.findOne as any).mockResolvedValue(null);
      (bcryptjs.hash as any).mockResolvedValue('hashedPassword');

      await signup(mockRequest as Request, mockResponse as Response);

      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(bcryptjs.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User created successfully'
        })
      );
    });

    it('should return error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      mockRequest.body = userData;
      (User.findOne as any).mockResolvedValue({ email: userData.email });

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists'
      });
    });

    it('should return error if required fields are missing', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'All fields are required'
      });
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUserDoc = {
        _id: 'test-id',
        email: loginData.email,
        password: 'hashedPassword',
        lastLogin: new Date(),
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'test-id', email: loginData.email })
      };

      mockRequest.body = loginData;
      (User.findOne as any).mockResolvedValue(mockUserDoc);
      (bcryptjs.compare as any).mockResolvedValue(true);

      await login(mockRequest as Request, mockResponse as Response);

      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcryptjs.compare).toHaveBeenCalledWith(loginData.password, 'hashedPassword');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged in successfully'
        })
      );
    });

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockRequest.body = loginData;
      (User.findOne as any).mockResolvedValue(null);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUserDoc = {
        _id: 'test-id',
        email: loginData.email,
        password: 'hashedPassword'
      };

      mockRequest.body = loginData;
      (User.findOne as any).mockResolvedValue(mockUserDoc);
      (bcryptjs.compare as any).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should return 403 and EMAIL_NOT_VERIFIED code if user email is not verified', async () => {
      // Arrange: create a user with isVerified: false
      const user = await User.create({
        email: 'unverified@example.com',
        password: await bcryptjs.hash('password123', 10),
        name: 'Unverified User',
        isVerified: false,
      });

      // Act: attempt to login
      const res = await login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email not verified'
      });

      // Cleanup
      await User.deleteOne({ email: 'unverified@example.com' });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('token');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid code', async () => {
      const verifyData = { code: '123456' };
      const mockUserDoc = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        verificationToken: '123456',
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'test-id', email: 'test@example.com', name: 'Test User' })
      };

      mockRequest.body = verifyData;
      (User.findOne as any).mockResolvedValue(mockUserDoc);

      await verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(User.findOne).toHaveBeenCalledWith({
        verificationToken: '123456',
        verificationTokenExpiresAt: { $gt: expect.any(Number) }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Email verified successfully'
        })
      );
    });

    it('should return error for invalid verification code', async () => {
      const verifyData = { code: 'invalid' };

      mockRequest.body = verifyData;
      (User.findOne as any).mockResolvedValue(null);

      await verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired verification code'
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      const forgotData = { email: 'test@example.com' };
      
      const mockUserDoc = {
        _id: 'test-id' as any,
        email: 'test@example.com',
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        save: vi.fn().mockResolvedValue(true)
      };

      mockRequest.body = forgotData;
      (User.findOne as any).mockResolvedValue(mockUserDoc);

      await forgotPassword(mockRequest as Request, mockResponse as Response);

      // Debug log
      console.log('Status calls:', mockResponse.status.mock.calls);
      console.log('JSON calls:', mockResponse.json.mock.calls);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.stringContaining('/reset-password/'));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset link sent to your email'
      });
    });

    it('should return error if user not found', async () => {
      const forgotData = { email: 'nonexistent@example.com' };

      mockRequest.body = forgotData;
      (User.findOne as any).mockResolvedValue(null);

      await forgotPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const resetData = { password: 'newpassword123' };
      const mockUserDoc = {
        _id: 'test-id',
        email: 'test@example.com',
        resetPasswordToken: 'valid-token',
        resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        save: vi.fn().mockResolvedValue(true)
      };

      mockRequest.params = { token: 'valid-token' };
      mockRequest.body = resetData;
      (User.findOne as any).mockResolvedValue(mockUserDoc);
      (bcryptjs.hash as any).mockResolvedValue('newHashedPassword');

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(User.findOne).toHaveBeenCalledWith({
        resetPasswordToken: 'valid-token',
        resetPasswordExpiresAt: { $gt: expect.any(Number) }
      });
      expect(bcryptjs.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successful'
      });
    });

    it('should return error for invalid reset token', async () => {
      const resetData = { password: 'newpassword123' };

      mockRequest.params = { token: 'invalid-token' };
      mockRequest.body = resetData;
      (User.findOne as any).mockResolvedValue(null);

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired reset token'
      });
    });
  });

  describe('checkAuth', () => {
    it('should return user data for valid user ID', async () => {
      const mockUserDoc = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockRequest.userId = 'test-id';
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUserDoc)
      });

      await checkAuth(mockRequest as Request, mockResponse as Response);

      expect(User.findById).toHaveBeenCalledWith('test-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        user: mockUserDoc
      });
    });

    it('should return error if user not found', async () => {
      mockRequest.userId = 'invalid-id';
      (User.findById as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(null)
      });

      await checkAuth(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email if user is not verified', async () => {
      const mockUser = {
        email: 'notverified@example.com',
        isVerified: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ email: 'notverified@example.com', isVerified: false })
      };
      (User.findOne as any).mockResolvedValue(mockUser);
      const req = { body: { email: 'notverified@example.com' } } as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
      await resendVerification(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Verification email resent' });
    });

    it('should return error if user is already verified', async () => {
      const mockUser = {
        email: 'verified@example.com',
        isVerified: true,
      };
      (User.findOne as any).mockResolvedValue(mockUser);
      const req = { body: { email: 'verified@example.com' } } as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
      await resendVerification(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User already verified', code: 'ALREADY_VERIFIED' });
    });

    it('should return error if user is not found', async () => {
      (User.findOne as any).mockResolvedValue(null);
      const req = { body: { email: 'nouser@example.com' } } as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
      await resendVerification(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
    });

    it('should return error if email is missing', async () => {
      const req = { body: {} } as Request;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
      await resendVerification(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Email is required', code: 'EMAIL_REQUIRED' });
    });
  });
}); 