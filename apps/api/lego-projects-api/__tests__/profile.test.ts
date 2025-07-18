// Place all jest.mock calls at the very top, before any imports!
// Mock the entire storage module to prevent any real imports
import type { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
jest.mock('../src/storage', () => ({
  avatarUpload: {
    single: () => (req: Request, res: Response, next: NextFunction) => {
      // Simulate multer middleware behavior for all tests
      if (!req.file && req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        // Only set req.file if a file is attached
        req.file = {
          originalname: 'avatar.png',
          buffer: Buffer.from('fake'),
          mimetype: 'image/jpeg',
          filename: 'avatar.png',
          path: '/tmp/avatar.png',
          size: 1234,
          fieldname: 'avatar',
          encoding: '7bit',
          stream: new Readable(),
          destination: '/tmp',
        };
      }
      
      // Also simulate parsing form fields for multipart requests
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        // Set req.body with the form fields that would be parsed by multer
        req.body = {
          username: req.body?.username || 'testuser',
          email: req.body?.email || 'test@example.com',
          preferredName: req.body?.preferredName || 'Testy'
        };
      }
      
      next();
    }
  },
  saveAvatar: jest.fn(() => Promise.resolve('/uploads/avatar.png')),
  deleteAvatar: jest.fn(() => Promise.resolve()),
}));

const dbMock = {
  select: jest.fn() as jest.Mock,
  insert: jest.fn() as jest.Mock,
  update: jest.fn() as jest.Mock,
};
jest.mock('../src/db/client', () => {
  return { db: dbMock };
});

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.resolve({ data: { token: 'mocked.new.token' } })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

// Mock JWT with proper payload
const validPayload = { sub: 'user-123', iss: 'lego-projects-api', exp: Math.floor(Date.now() / 1000) + 3600 };
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(() => validPayload),
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  requireAuth: jest.fn((req: any, res: any, next: any) => {
    // Simulate successful authentication
    req.user = { id: 'user-123', sub: 'user-123' };
    next();
  }),
  canModifyProfile: jest.fn((req: any, res: any, next: any) => {
    // Simulate successful authorization
    next();
  }),
}));

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { avatarUpload, saveAvatar, deleteAvatar } from '../src/storage';
import fs from 'fs';
import { getProfile, createProfile, updateProfile, deleteAvatar as deleteAvatarHandler, uploadAvatar, handleUploadError } from '../src/handlers/profile';

const validToken = 'valid.jwt.token';

describe('Profile API Handlers', () => {
  let app: express.Express;
  let mockUser: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Set up the app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Set up a fresh mock user for each test
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      preferredName: 'Testy',
      avatar: 'avatar.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Reset all mocks
    dbMock.select.mockReset();
    dbMock.insert.mockReset();
    dbMock.update.mockReset();
    (fs.existsSync as jest.Mock).mockReset();
    (fs.unlinkSync as jest.Mock).mockReset();
    (saveAvatar as jest.Mock).mockReset();
    // Default mock for db.select().from().where()
    dbMock.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    
    // Default mock for db.insert().values().returning()
    dbMock.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([mockUser])
      })
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user profile when user exists', async () => {
      // Mock db.select chain to resolve with user
      dbMock.select.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([mockUser])
        })
      });
      
      app.get('/api/users/:id', getProfile);
      
      const response = await request(app)
        .get(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .expect(200);
        
      expect(response.body).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        preferredName: mockUser.preferredName,
        avatar: mockUser.avatar,
      });
    });

    it('should return 404 when user does not exist', async () => {
      // Mock db.select chain to resolve with empty array
      dbMock.select.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([])
        })
      });
      
      app.get('/api/users/:id', getProfile);
      
      const response = await request(app)
        .get('/api/users/nonexistent-id')
        .set('Cookie', [`token=${validToken}`])
        .expect(404);
        
      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should return 500 on database error', async () => {
      // Mock db.select chain to reject with error
      dbMock.select.mockReturnValue({
        from: () => ({
          where: () => Promise.reject(new Error('Database connection failed'))
        })
      });
      
      app.get('/api/users/:id', getProfile);
      
      const response = await request(app)
        .get(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .expect(500);
        
      expect(response.body.error).toBe('Database error');
      expect(response.body.details).toMatch(/Database connection failed|Failed query/);
    });
  });

  describe('POST /api/users/:id', () => {
    it('should create new profile with avatar when valid data provided', async () => {
      // Mock the database operations properly
      dbMock.select.mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([])
        })
      });
      
      // Create a mock user with the expected avatar URL
      const createdUser = { ...mockUser, avatar: '/uploads/avatar.png' };
      
      dbMock.insert.mockReturnValueOnce({
        values: () => ({
          returning: () => Promise.resolve([createdUser])
        })
      });
      
      (saveAvatar as jest.Mock).mockResolvedValueOnce('/uploads/avatar.png');
      
      app.post('/api/users/:id', avatarUpload.single('avatar'), handleUploadError, createProfile);
      
      const response = await request(app)
        .post(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .field('username', mockUser.username)
        .field('email', mockUser.email)
        .field('preferredName', mockUser.preferredName)
        .attach('avatar', Buffer.from('fake'), 'avatar.png');
        
      expect(response.status).toBe(201);
        
      expect(response.body).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        preferredName: mockUser.preferredName,
        avatar: '/uploads/avatar.png',
      });
    });
    it('should return 400 when avatar file is missing', async () => {
      // Create a custom middleware that doesn't set req.file
      const customAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
        // Don't set req.file to simulate missing file
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
          req.body = {
            username: req.body?.username || 'testuser',
            email: req.body?.email || 'test@example.com',
            preferredName: req.body?.preferredName || 'Testy'
          };
        }
        next();
      };
      
      app.post('/api/users/:id', customAvatarUpload, handleUploadError, createProfile);
      
      const response = await request(app)
        .post(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .field('username', mockUser.username)
        .field('email', mockUser.email)
        .field('preferredName', mockUser.preferredName)
        .expect(400);
        
      expect(response.body).toEqual({ error: 'Avatar file is required' });
    });
    it('should return 400 for invalid file format', async () => {
      // Import security middleware
      const { validateFileContent } = require('../src/middleware/security');
      
      // Create a custom middleware that sets an invalid file type
      const customAvatarUpload = (req: Request, res: Response, next: NextFunction) => {
        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
          req.file = {
            originalname: 'avatar.txt',
            buffer: Buffer.from('fake'),
            mimetype: 'text/plain',
            filename: 'avatar.txt',
            path: '/tmp/avatar.txt',
            size: 1234,
            fieldname: 'avatar',
            encoding: '7bit',
            stream: new Readable(),
            destination: '/tmp',
          };
          req.body = {
            username: req.body?.username || 'testuser',
            email: req.body?.email || 'test@example.com',
            preferredName: req.body?.preferredName || 'Testy'
          };
        }
        next();
      };
      
      app.post('/api/users/:id', customAvatarUpload, handleUploadError, validateFileContent, createProfile);
      
      const response = await request(app)
        .post(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .field('username', mockUser.username)
        .field('email', mockUser.email)
        .field('preferredName', mockUser.preferredName)
        .attach('avatar', Buffer.from('fake'), 'avatar.txt')
        .expect(400);
        
      expect(response.body).toEqual(expect.objectContaining({ 
        error: 'File validation failed' 
      }));
    });
    it('should return 409 when user already exists', async () => {
      dbMock.select.mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([mockUser])
        })
      });
      
      app.post('/api/users/:id', avatarUpload.single('avatar'), handleUploadError, createProfile);
      
      const response = await request(app)
        .post(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .field('username', mockUser.username)
        .field('email', mockUser.email)
        .field('preferredName', mockUser.preferredName)
        .attach('avatar', Buffer.from('fake'), 'avatar.png')
        .expect(409);
        
      expect(response.body).toEqual({ error: 'User already exists' });
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update profile when valid data provided', async () => {
      const updatedUser = { ...mockUser, username: 'updateduser', email: 'updated@example.com', preferredName: 'Updated Name' };
      dbMock.select.mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([mockUser])
        })
      });
      dbMock.update.mockReturnValue({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([updatedUser])
          })
        })
      });
      app.patch('/api/users/:id', updateProfile);
      const response = await request(app)
        .patch(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .send({ username: updatedUser.username, email: updatedUser.email, preferredName: updatedUser.preferredName })
        .expect(200);
      expect(response.body).toMatchObject({
        id: mockUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        preferredName: updatedUser.preferredName,
      });
    });
    it('should return 404 when user does not exist for update', async () => {
      dbMock.select.mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([])
        })
      });
      app.patch('/api/users/:id', updateProfile);
      const response = await request(app)
        .patch('/api/users/nonexistent-id')
        .set('Cookie', [`token=${validToken}`])
        .send({ username: 'Updated Name', email: 'updated@example.com', preferredName: 'Updated Name' })
        .expect(404);
      expect(response.body).toEqual({ error: 'User not found' });
    });
    it('should return 400 for invalid input data', async () => {
      // Mock the database to return a user so validation can be tested
      dbMock.select.mockReturnValueOnce({
        from: () => ({
          where: () => Promise.resolve([mockUser])
        })
      });
      
      app.patch('/api/users/:id', updateProfile);
      const response = await request(app)
        .patch(`/api/users/${mockUser.id}`)
        .set('Cookie', [`token=${validToken}`])
        .send({ username: '', email: 'invalid-email', preferredName: '' }) // Invalid data
        .expect(400);
        
      expect(response.body.error).toBeDefined();
    });
  });
});