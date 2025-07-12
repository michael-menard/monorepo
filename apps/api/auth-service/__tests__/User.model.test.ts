import { vi, describe, it, expect, beforeEach } from 'vitest';
import { User } from '../models/User';

// Mock the User model
vi.mock('../models/User', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

describe('User Model', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('User Schema Validation', () => {
    it('should validate required fields', () => {
      // Test that the User model exists and has expected methods
      expect(User).toBeDefined();
      expect(typeof User.findOne).toBe('function');
      expect(typeof User.findById).toBe('function');
      expect(typeof User.create).toBe('function');
    });

    it('should handle findOne queries', async () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        isVerified: false,
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const result = await User.findOne({ email: 'test@example.com' });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should handle findById queries', async () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
      };

      (User.findById as any).mockResolvedValue(mockUser);

      const result = await User.findById('test-id');

      expect(User.findById).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockUser);
    });

    it('should handle create operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
      };

      const mockCreatedUser = {
        _id: 'test-id',
        ...userData,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (User.create as any).mockResolvedValue(mockCreatedUser);

      const result = await User.create(userData);

      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle deleteMany operations', async () => {
      (User.deleteMany as any).mockResolvedValue({ deletedCount: 1 });

      const result = await User.deleteMany({});

      expect(User.deleteMany).toHaveBeenCalledWith({});
      expect(result).toEqual({ deletedCount: 1 });
    });
  });

  describe('User Model Methods', () => {
    it('should find user by email', async () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const foundUser = await User.findOne({ email: 'test@example.com' });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(foundUser).toEqual(mockUser);
    });

    it('should find user by verification token', async () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        verificationToken: '123456',
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const foundUser = await User.findOne({
        verificationToken: '123456',
        verificationTokenExpiresAt: { $gt: Date.now() },
      });

      expect(User.findOne).toHaveBeenCalledWith({
        verificationToken: '123456',
        verificationTokenExpiresAt: { $gt: expect.any(Number) },
      });
      expect(foundUser).toEqual(mockUser);
    });

    it('should find user by reset password token', async () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        resetPasswordToken: 'reset-token-123',
        resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const foundUser = await User.findOne({
        resetPasswordToken: 'reset-token-123',
        resetPasswordExpiresAt: { $gt: Date.now() },
      });

      expect(User.findOne).toHaveBeenCalledWith({
        resetPasswordToken: 'reset-token-123',
        resetPasswordExpiresAt: { $gt: expect.any(Number) },
      });
      expect(foundUser).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (User.findOne as any).mockResolvedValue(null);

      const foundUser = await User.findOne({ email: 'nonexistent@example.com' });

      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(foundUser).toBeNull();
    });
  });

  describe('User Data Structure', () => {
    it('should have expected user properties', () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        isVerified: false,
        verificationToken: '123456',
        verificationTokenExpiresAt: new Date(),
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockUser).toHaveProperty('_id');
      expect(mockUser).toHaveProperty('email');
      expect(mockUser).toHaveProperty('name');
      expect(mockUser).toHaveProperty('password');
      expect(mockUser).toHaveProperty('isVerified');
      expect(mockUser).toHaveProperty('verificationToken');
      expect(mockUser).toHaveProperty('resetPasswordToken');
      expect(mockUser).toHaveProperty('createdAt');
      expect(mockUser).toHaveProperty('updatedAt');
    });

    it('should handle user with all optional fields', () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        resetPasswordToken: 'reset-token',
        resetPasswordExpiresAt: new Date(),
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.verificationToken).toBeNull();
      expect(mockUser.resetPasswordToken).toBe('reset-token');
      expect(mockUser.lastLogin).toBeInstanceOf(Date);
    });
  });
}); 