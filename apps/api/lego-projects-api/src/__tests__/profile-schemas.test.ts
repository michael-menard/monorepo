import { describe, it, expect } from '@jest/globals';
import { ProfileUpdateSchema, AvatarUploadSchema } from '../types';

describe('Profile Validation Schemas', () => {
  describe('ProfileUpdateSchema', () => {
    it('should validate valid profile update data', () => {
      const validData = {
        name: 'John Doe',
        username: 'johndoe',
        bio: 'A software developer who loves LEGO'
      };

      const result = ProfileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate partial profile update data', () => {
      const validData = {
        name: 'John Doe'
      };

      const result = ProfileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const validData = {};

      const result = ProfileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject name that is too short', () => {
      const invalidData = {
        name: ''
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be at least 1 character');
      }
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'a'.repeat(101)
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
      }
    });

    it('should reject username that is too short', () => {
      const invalidData = {
        username: 'ab'
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be at least 3 characters');
      }
    });

    it('should reject username that is too long', () => {
      const invalidData = {
        username: 'a'.repeat(31)
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username must be less than 30 characters');
      }
    });

    it('should reject username with invalid characters', () => {
      const invalidData = {
        username: 'john@doe'
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Username can only contain letters, numbers, underscores, and hyphens');
      }
    });

    it('should accept valid username with underscores and hyphens', () => {
      const validData = {
        username: 'john_doe-123'
      };

      const result = ProfileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject bio that is too long', () => {
      const invalidData = {
        bio: 'a'.repeat(501)
      };

      const result = ProfileUpdateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Bio must be less than 500 characters');
      }
    });

    it('should accept bio at maximum length', () => {
      const validData = {
        bio: 'a'.repeat(500)
      };

      const result = ProfileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('AvatarUploadSchema', () => {
    it('should validate valid JPEG file', () => {
      const validFile = {
        type: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      };

      const result = AvatarUploadSchema.safeParse({ file: validFile });
      expect(result.success).toBe(true);
    });

    it('should validate valid HEIC file', () => {
      const validFile = {
        type: 'image/heic',
        size: 5 * 1024 * 1024 // 5MB
      };

      const result = AvatarUploadSchema.safeParse({ file: validFile });
      expect(result.success).toBe(true);
    });

    it('should reject unsupported file type', () => {
      const invalidFile = {
        type: 'image/png',
        size: 1024 * 1024
      };

      const result = AvatarUploadSchema.safeParse({ file: invalidFile });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Only .jpg or .heic files are supported');
      }
    });

    it('should reject file that is too large', () => {
      const invalidFile = {
        type: 'image/jpeg',
        size: 11 * 1024 * 1024 // 11MB
      };

      const result = AvatarUploadSchema.safeParse({ file: invalidFile });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('File size must be less than 10MB');
      }
    });

    it('should accept file at maximum size', () => {
      const validFile = {
        type: 'image/jpeg',
        size: 10 * 1024 * 1024 // Exactly 10MB
      };

      const result = AvatarUploadSchema.safeParse({ file: validFile });
      expect(result.success).toBe(true);
    });

    it('should reject file with both invalid type and size', () => {
      const invalidFile = {
        type: 'image/png',
        size: 11 * 1024 * 1024
      };

      const result = AvatarUploadSchema.safeParse({ file: invalidFile });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map(issue => issue.message);
        expect(messages).toContain('Only .jpg or .heic files are supported');
        expect(messages).toContain('File size must be less than 10MB');
      }
    });
  });
}); 