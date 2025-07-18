import request from 'supertest';
import express from 'express';
import { 
  validateFileContent, 
  securityHeaders, 
  sanitizeRequest, 
  securityLogger,
  fileAccessControl,
  virusScanFile,
  createRateLimiters
} from '../src/middleware/security';

// Mock file for testing
const createMockFile = (mimetype: string, size: number, originalname: string, buffer?: Buffer) => ({
  fieldname: 'avatar',
  originalname,
  encoding: '7bit',
  mimetype,
  size,
  buffer: buffer || Buffer.from('fake-image-data'),
  destination: '',
  filename: 'test.jpg',
  path: ''
});

// Create valid mock files for testing
const createValidJPEGFile = () => createMockFile('image/jpeg', 1024, 'test.jpg');
const createValidPNGFile = () => createMockFile('image/png', 1024, 'test.png');

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validateFileContent', () => {
    it('should pass valid JPEG file', () => {
      const mockFile = createValidJPEGFile();
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass valid PNG file', () => {
      const mockFile = createValidPNGFile();
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid mimetype', () => {
      const mockFile = createMockFile('application/pdf', 1024, 'test.pdf');
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'File validation failed'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject oversized file', () => {
      const mockFile = createMockFile('image/jpeg', 25 * 1024 * 1024, 'test.jpg'); // 25MB
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'File validation failed'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid file extension', () => {
      const mockFile = createMockFile('image/jpeg', 1024, 'test.exe');
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'File validation failed'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject file with no buffer', () => {
      const mockFile = createMockFile('image/jpeg', 1024, 'test.jpg');
      const fileWithoutBuffer = { ...mockFile, buffer: undefined };
      const req = { file: fileWithoutBuffer } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      validateFileContent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid file content'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('fileAccessControl', () => {
    it('should allow user to access their own files', () => {
      const req = { 
        params: { id: 'user123' }, 
        user: { sub: 'user123' } 
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      fileAccessControl(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access to other users files', () => {
      const req = { 
        params: { id: 'user123' }, 
        user: { sub: 'user456' } 
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      fileAccessControl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied. You can only access your own files.'
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user is authenticated', () => {
      const req = { 
        params: { id: 'user123' }
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      fileAccessControl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Access denied. You can only access your own files.'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('virusScanFile', () => {
    it('should pass clean file', async () => {
      const mockFile = createMockFile('image/jpeg', 1024, 'test.jpg');
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await virusScanFile(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass when no file is provided', async () => {
      const req = {} as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await virusScanFile(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject file with suspicious patterns', async () => {
      // Create a file with MZ header (PE file signature)
      const suspiciousBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const mockFile = createMockFile('image/jpeg', 1024, 'test.jpg', suspiciousBuffer);
      const req = { file: mockFile } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await virusScanFile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'File appears to be infected. Upload blocked for security reasons.'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeRequest', () => {
    it('should sanitize XSS in request body', () => {
      const req = { 
        body: { 
          name: '<script>alert("xss")</script>John',
          email: 'javascript:alert("xss")',
          bio: 'Hello<img src=x onerror=alert("xss")>'
        } 
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      sanitizeRequest(req, res, next);

      expect(req.body.name).toBe('John');
      expect(req.body.email).toBe('alert("xss")');
      expect(req.body.bio).toBe('Hello');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize XSS in query parameters', () => {
      const req = { 
        query: { 
          search: '<script>alert("xss")</script>test',
          filter: 'javascript:alert("xss")'
        } 
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      sanitizeRequest(req, res, next);

      expect(req.query.search).toBe('test');
      expect(req.query.filter).toBe('alert("xss")');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('securityLogger', () => {
    it('should log security events', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const req = { method: 'POST', url: '/api/users/123/avatar', ip: '127.0.0.1' } as any;
      const res = { 
        statusCode: 403,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') callback();
        })
      } as any;
      const next = jest.fn();

      securityLogger(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY] POST /api/users/123/avatar from 127.0.0.1 - 403')
      );
      expect(next).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log security alerts for suspicious activities', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const req = { method: 'POST', url: '/api/users/123/avatar', ip: '127.0.0.1' } as any;
      const res = { 
        statusCode: 429,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') callback();
        })
      } as any;
      const next = jest.fn();

      securityLogger(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] Suspicious activity detected')
      );
      expect(next).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiters', () => {
    it('should create rate limiters with correct configuration', () => {
      const limiters = createRateLimiters();

      expect(limiters.general).toBeDefined();
      expect(limiters.upload).toBeDefined();
      expect(limiters.auth).toBeDefined();
    });

    it('should apply general rate limiting', async () => {
      const limiters = createRateLimiters();
      app.use(limiters.general);
      
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 101; i++) {
        const response = await request(app).get('/test');
        if (i === 100) {
          expect(response.status).toBe(429);
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Security Headers', () => {
    it('should apply security headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
}); 