// Mock fs for file operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock AWS S3
jest.mock('../storage/s3', () => ({
  uploadWishlistImage: jest.fn(),
  deleteWishlistImage: jest.fn()
}));

// Mock multer storage path
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/'))
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import { 
  validateFileType, 
  validateFileSize, 
  WishlistUploadError,
  getFileInfo
} from '../storage/wishlist-storage';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Wishlist Storage Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    it('should accept valid image types', () => {
      const validTypes = [
        { mimetype: 'image/jpeg', filename: 'test.jpg' },
        { mimetype: 'image/jpg', filename: 'test.jpeg' },
        { mimetype: 'image/heic', filename: 'test.heic' }
      ];
      
      validTypes.forEach(({ mimetype, filename }) => {
        expect(() => validateFileType(mimetype, filename)).not.toThrow();
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = [
        { mimetype: 'image/png', filename: 'test.png' },
        { mimetype: 'image/gif', filename: 'test.gif' },
        { mimetype: 'text/plain', filename: 'test.txt' },
        { mimetype: 'application/pdf', filename: 'test.pdf' }
      ];
      
      invalidTypes.forEach(({ mimetype, filename }) => {
        expect(() => validateFileType(mimetype, filename)).toThrow(WishlistUploadError);
        expect(() => validateFileType(mimetype, filename)).toThrow('Only JPEG and HEIC files are supported');
      });
    });

    it('should throw error for invalid mimetype', () => {
      expect(() => validateFileType('invalid/type', 'test.jpg')).toThrow(WishlistUploadError);
    });
  });

  describe('validateFileSize', () => {
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB

    it('should accept files within size limit', () => {
      const validSizes = [1024, 5 * 1024 * 1024, MAX_SIZE - 1, MAX_SIZE];
      
      validSizes.forEach(size => {
        expect(() => validateFileSize(size)).not.toThrow();
      });
    });

    it('should reject files exceeding size limit', () => {
      const invalidSizes = [MAX_SIZE + 1, 25 * 1024 * 1024, 100 * 1024 * 1024];
      
      invalidSizes.forEach(size => {
        expect(() => validateFileSize(size)).toThrow(WishlistUploadError);
        expect(() => validateFileSize(size)).toThrow('File size too large:');
      });
    });

    it('should not throw error for zero or negative sizes', () => {
      // The function only checks if size > MAX_SIZE, so it won't throw for negative numbers
      expect(() => validateFileSize(-1)).not.toThrow();
      expect(() => validateFileSize(0)).not.toThrow();
    });
  });

  describe('getFileInfo', () => {
    it('should return correct file information', () => {
      const mockFile = {
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      } as Express.Multer.File;

      const fileInfo = getFileInfo(mockFile);

      expect(fileInfo).toEqual({
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        sizeInMB: 1,
        extension: '.jpg'
      });
    });

    it('should handle files with decimal MB sizes', () => {
      const mockFile = {
        originalname: 'small-image.heic',
        mimetype: 'image/heic',
        size: 1536 * 1024 // 1.5MB
      } as Express.Multer.File;

      const fileInfo = getFileInfo(mockFile);

      expect(fileInfo.sizeInMB).toBe(1.5);
    });
  });

  describe('WishlistUploadError', () => {
    it('should create error with specified status code', () => {
      const error = new WishlistUploadError('Test error message', 400);
      
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with custom status code', () => {
      const error = new WishlistUploadError('Custom error', 413);
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(413);
    });

    it('should be catchable as Error instance', () => {
      try {
        throw new WishlistUploadError('Test error', 500);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(WishlistUploadError);
        expect((error as WishlistUploadError).statusCode).toBe(500);
      }
    });
  });
}); 