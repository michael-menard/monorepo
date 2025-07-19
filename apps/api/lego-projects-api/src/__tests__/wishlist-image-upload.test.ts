import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { requireAuth, wishlistOwnershipAuth } from '../middleware/auth';
import { uploadWishlistImage, deleteWishlistImageHandler } from '../handlers/wishlist';
import { wishlistImageUpload } from '../storage/wishlist-storage';
import { handleWishlistUploadError, validateWishlistFile } from '../middleware/wishlist-upload';

// Mock the storage functions
jest.mock('../storage/wishlist-storage', () => ({
  saveWishlistImage: jest.fn(),
  deleteWishlistImage: jest.fn(),
  validateFileSize: jest.fn(),
  validateFileType: jest.fn(),
  getFileInfo: jest.fn(() => ({
    originalname: 'test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    sizeInMB: 0.001,
    extension: '.jpg'
  })),
  WishlistUploadError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
      this.name = 'WishlistUploadError';
    }
  },
  wishlistImageUpload: {
    single: jest.fn(() => (req: any, res: any, next: any) => {
      next();
    })
  }
}));

// Mock axios for auth service calls
jest.mock('axios');

const app = express();
app.use(express.json());

// Test data
const EXPECTED_ISSUER = 'lego-projects-api';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

function createTestToken(userId: string, email: string) {
  return jwt.sign(
    { 
      sub: userId,
      email: email,
      iss: EXPECTED_ISSUER 
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Create test files
const createTestImageFile = (filename: string, sizeInMB: number, mimetype: string = 'image/jpeg') => {
  const sizeInBytes = sizeInMB * 1024 * 1024;
  return {
    fieldname: 'image',
    originalname: filename,
    encoding: '7bit',
    mimetype: mimetype,
    size: sizeInBytes,
    buffer: Buffer.alloc(sizeInBytes),
    filename: `test-${Date.now()}.jpg`
  };
};

// Set up test routes
app.post('/test/upload-image', 
  requireAuth, 
  wishlistOwnershipAuth,
  (req: any, res: any, next: any) => {
    // Mock file attachment for specific tests
    if (req.body.mockFile) {
      req.file = createTestImageFile(
        req.body.mockFile.name, 
        req.body.mockFile.size, 
        req.body.mockFile.mimetype
      );
    }
    next();
  },
  validateWishlistFile,
  uploadWishlistImage
);

app.delete('/test/delete-image', 
  requireAuth, 
  wishlistOwnershipAuth, 
  deleteWishlistImageHandler
);

// Test error handling
app.post('/test/upload-error',
  requireAuth,
  wishlistOwnershipAuth,
  (req: any, res: any, next: any) => {
    // Simulate multer errors
    if (req.body.errorType) {
      const error: any = new Error('Test error');
      error.code = req.body.errorType;
      return next(error);
    }
    next();
  },
  handleWishlistUploadError
);

describe('Wishlist Image Upload & Validation', () => {
  let validToken: string;
  const testUserId = 'user-123';

  beforeAll(() => {
    validToken = createTestToken(testUserId, 'test@example.com');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should accept valid JPEG files under 20MB', async () => {
      const { saveWishlistImage } = require('../storage/wishlist-storage');
      saveWishlistImage.mockResolvedValue('/uploads/wishlist/user-123/test-image.jpg');

      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.jpg',
            size: 10, // 10MB
            mimetype: 'image/jpeg'
          }
        })
        .expect(200);

      expect(response.body.status).toBe(200);
      expect(response.body.message).toBe('Image uploaded successfully');
      expect(response.body.data).toHaveProperty('imageUrl');
      expect(response.body.data).toHaveProperty('fileInfo');
    });

    it('should accept valid HEIC files under 20MB', async () => {
      const { saveWishlistImage } = require('../storage/wishlist-storage');
      saveWishlistImage.mockResolvedValue('/uploads/wishlist/user-123/test-image.heic');

      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.heic',
            size: 15, // 15MB
            mimetype: 'image/heic'
          }
        })
        .expect(200);

      expect(response.body.status).toBe(200);
      expect(response.body.message).toBe('Image uploaded successfully');
    });

    it('should reject files over 20MB with 413 status', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'large-image.jpg',
            size: 25, // 25MB - over limit
            mimetype: 'image/jpeg'
          }
        })
        .expect(413);

      expect(response.body.status).toBe(413);
      expect(response.body.error).toBe('FILE_ERROR');
      expect(response.body.message).toContain('File size too large');
    });

    it('should reject unsupported file types with 400 status', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.png',
            size: 5, // Valid size
            mimetype: 'image/png' // Unsupported type
          }
        })
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('Unsupported file type');
    });

    it('should reject files with unsupported extensions', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.gif',
            size: 5,
            mimetype: 'image/gif'
          }
        })
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('Unsupported file');
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('No file provided. Please upload an image file.');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for image upload', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .send({
          mockFile: {
            name: 'test-image.jpg',
            size: 5,
            mimetype: 'image/jpeg'
          }
        })
        .expect(403);

      expect(response.body.error).toBe('No authentication token provided');
    });

    it('should require authentication for image deletion', async () => {
      const response = await request(app)
        .delete('/test/delete-image')
        .send({ imageUrl: '/uploads/wishlist/user-123/test.jpg' })
        .expect(403);

      expect(response.body.error).toBe('No authentication token provided');
    });
  });

  describe('Image Deletion', () => {
    it('should allow users to delete their own images', async () => {
      const { deleteWishlistImage } = require('../storage/wishlist-storage');
      deleteWishlistImage.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/test/delete-image')
        .set('Cookie', `token=${validToken}`)
        .send({ 
          imageUrl: `/uploads/wishlist/${testUserId}/test-image.jpg` 
        })
        .expect(200);

      expect(response.body.status).toBe(200);
      expect(response.body.message).toBe('Image deleted successfully');
      expect(deleteWishlistImage).toHaveBeenCalledWith(`/uploads/wishlist/${testUserId}/test-image.jpg`);
    });

    it('should prevent users from deleting other users\' images', async () => {
      const response = await request(app)
        .delete('/test/delete-image')
        .set('Cookie', `token=${validToken}`)
        .send({ 
          imageUrl: '/uploads/wishlist/other-user-456/test-image.jpg' 
        })
        .expect(403);

      expect(response.body.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
      expect(response.body.message).toBe('You can only delete your own images');
    });

    it('should return 400 when no imageUrl is provided', async () => {
      const response = await request(app)
        .delete('/test/delete-image')
        .set('Cookie', `token=${validToken}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Image URL is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle multer LIMIT_FILE_SIZE error', async () => {
      const response = await request(app)
        .post('/test/upload-error')
        .set('Cookie', `token=${validToken}`)
        .send({ errorType: 'LIMIT_FILE_SIZE' })
        .expect(413);

      expect(response.body.status).toBe(413);
      expect(response.body.error).toBe('FILE_ERROR');
      expect(response.body.message).toBe('File size too large. Maximum allowed size is 20MB.');
    });

    it('should handle multer LIMIT_FILE_COUNT error', async () => {
      const response = await request(app)
        .post('/test/upload-error')
        .set('Cookie', `token=${validToken}`)
        .send({ errorType: 'LIMIT_FILE_COUNT' })
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Only one file can be uploaded at a time.');
    });

    it('should handle multer LIMIT_UNEXPECTED_FILE error', async () => {
      const response = await request(app)
        .post('/test/upload-error')
        .set('Cookie', `token=${validToken}`)
        .send({ errorType: 'LIMIT_UNEXPECTED_FILE' })
        .expect(400);

      expect(response.body.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Unexpected file field. Please use the correct field name for image upload.');
    });
  });

  describe('File Size Validation Edge Cases', () => {
    it('should accept files exactly at 20MB limit', async () => {
      const { saveWishlistImage } = require('../storage/wishlist-storage');
      saveWishlistImage.mockResolvedValue('/uploads/wishlist/user-123/test-image.jpg');

      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'max-size-image.jpg',
            size: 20, // Exactly 20MB
            mimetype: 'image/jpeg'
          }
        })
        .expect(200);

      expect(response.body.status).toBe(200);
    });

    it('should reject files just over 20MB limit', async () => {
      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'over-limit-image.jpg',
            size: 20.1, // Just over 20MB
            mimetype: 'image/jpeg'
          }
        })
        .expect(413);

      expect(response.body.status).toBe(413);
      expect(response.body.error).toBe('FILE_ERROR');
    });
  });

  describe('File Type Validation Edge Cases', () => {
    it('should accept image/jpg mimetype', async () => {
      const { saveWishlistImage } = require('../storage/wishlist-storage');
      saveWishlistImage.mockResolvedValue('/uploads/wishlist/user-123/test-image.jpg');

      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.jpg',
            size: 5,
            mimetype: 'image/jpg' // Alternative mimetype
          }
        })
        .expect(200);

      expect(response.body.status).toBe(200);
    });

    it('should accept .jpeg extension', async () => {
      const { saveWishlistImage } = require('../storage/wishlist-storage');
      saveWishlistImage.mockResolvedValue('/uploads/wishlist/user-123/test-image.jpeg');

      const response = await request(app)
        .post('/test/upload-image')
        .set('Cookie', `token=${validToken}`)
        .send({
          mockFile: {
            name: 'test-image.jpeg',
            size: 5,
            mimetype: 'image/jpeg'
          }
        })
        .expect(200);

      expect(response.body.status).toBe(200);
    });
  });
}); 