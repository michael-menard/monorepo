import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock problematic modules before importing
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('helmet', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('cookie-parser', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('pino-http', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('../db/connectDB', () => ({
  connectDB: vi.fn().mockResolvedValue({}),
}));

// Mock User model
vi.mock('../models/User', () => ({
  User: vi.fn().mockImplementation((data) => ({
    ...data,
    _id: 'mock_user_id',
    save: vi.fn().mockResolvedValue(data),
    toObject: vi.fn().mockReturnValue(data),
  })),
}));

// Create a simpler approach - don't mock the entire express module
// Instead, let's create a test app directly

import { app } from '../index';
import { User } from '../models/User';

describe('CSRF Token Endpoint', () => {
  beforeAll(async () => {
    // Mock database connection - no real MongoDB needed since we're mocking
  });

  afterAll(async () => {
    // Clean up any mocks if needed
  });

  beforeEach(async () => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  describe('GET /api/auth/csrf', () => {
    it('should return a CSRF token and set XSRF-TOKEN cookie', async () => {
      const response = await request(app).get('/api/auth/csrf');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token).toHaveLength(64); // 32 bytes hex encoded = 64 chars

      // Check that the XSRF-TOKEN cookie is set
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : undefined;
      expect(cookies).toBeDefined();
      
      const csrfCookie = cookies?.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('Max-Age=7200'); // 2 hours
      expect(csrfCookie).toContain('SameSite=lax'); // Development mode
      expect(csrfCookie).not.toContain('HttpOnly'); // Should be accessible to JavaScript
    });

    it('should set Cache-Control header to no-store', async () => {
      const response = await request(app).get('/api/auth/csrf');

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('should generate different tokens on subsequent calls', async () => {
      const response1 = await request(app).get('/api/auth/csrf');
      const response2 = await request(app).get('/api/auth/csrf');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.token).not.toBe(response2.body.token);
    });

    it('should be rate limited', async () => {
      // The rate limit is 50 requests per 15 minutes
      // Let's make 51 requests in quick succession
      const promises = Array.from({ length: 51 }, () => request(app).get('/api/auth/csrf'));
      const responses = await Promise.all(promises);

      // First 50 should succeed
      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(successfulResponses.length).toBe(50);
      expect(rateLimitedResponses.length).toBe(1);
    });

    it('should return valid hex-encoded token', async () => {
      const response = await request(app).get('/api/auth/csrf');

      expect(response.status).toBe(200);
      const { token } = response.body;
      
      // Should be valid hex string
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      
      // Should be able to convert from hex without errors
      const buffer = Buffer.from(token, 'hex');
      expect(buffer.length).toBe(32); // 32 bytes
    });

    it('should set cookie with correct attributes in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).get('/api/auth/csrf');
      expect(response.status).toBe(200);

      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : undefined;
      const csrfCookie = cookies?.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      
      expect(csrfCookie).toContain('SameSite=lax');
      expect(csrfCookie).not.toContain('Secure'); // Not secure in development
    });
  });

  describe('Login endpoint CSRF token integration', () => {
    beforeEach(async () => {
      // Create a verified test user
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: '$2a$10$8K1p/RNtT2kG0J8j2OHyYOZIrKfCJ3jR2LkYv4NeX8P8vTnNgHnVC', // bcrypt hash of 'password123'
        isVerified: true,
      });
      await testUser.save();
    });

    it('should set CSRF token cookie upon successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Check that the XSRF-TOKEN cookie is set
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : undefined;
      expect(cookies).toBeDefined();
      
      const csrfCookie = cookies?.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('Max-Age=7200'); // 2 hours
      expect(csrfCookie).toContain('SameSite=lax');
      expect(csrfCookie).not.toContain('HttpOnly');
    });

    it('should not set CSRF token cookie on failed login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Should not have XSRF-TOKEN cookie
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
      const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeUndefined();
    });
  });

  describe('Signup endpoint CSRF token integration', () => {
    it('should set CSRF token cookie upon successful signup', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Check that the XSRF-TOKEN cookie is set
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : undefined;
      expect(cookies).toBeDefined();
      
      const csrfCookie = cookies?.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('Max-Age=7200'); // 2 hours
      expect(csrfCookie).toContain('SameSite=lax');
      expect(csrfCookie).not.toContain('HttpOnly');
    });

    it('should not set CSRF token cookie on failed signup (duplicate email)', async () => {
      // Since we're using mocks, we need to mock User.save to simulate the duplicate user scenario
      vi.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('E11000 duplicate key error'));
      vi.spyOn(User, 'findOne').mockResolvedValueOnce(new User({ email: 'existing@example.com' }));

      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'New User',
          email: 'existing@example.com', // Duplicate email
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // Should not have XSRF-TOKEN cookie
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
      const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeUndefined();
    });

    it('should not set CSRF token cookie on validation error', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'New User',
          email: 'invalid-email', // Invalid email format
          password: 'password123',
        });

      expect(response.status).toBe(400);

      // Should not have XSRF-TOKEN cookie
      const setCookieHeader = response.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
      const csrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));
      expect(csrfCookie).toBeUndefined();
    });
  });

  describe('CSRF token uniqueness across authentication flows', () => {
    beforeEach(async () => {
      // Create a verified test user for login tests
      const testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: '$2a$10$8K1p/RNtT2kG0J8j2OHyYOZIrKfCJ3jR2LkYv4NeX8P8vTnNgHnVC', // bcrypt hash of 'password123'
        isVerified: true,
      });
      await testUser.save();
    });

    it('should generate different CSRF tokens for different authentication methods', async () => {
      // Get token from direct endpoint
      const csrfResponse = await request(app).get('/api/auth/csrf');
      const csrfToken = csrfResponse.body.token;

      // Get token from login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const loginSetCookieHeader = loginResponse.headers['set-cookie'];
      const loginCookies = Array.isArray(loginSetCookieHeader) ? loginSetCookieHeader : loginSetCookieHeader ? [loginSetCookieHeader] : undefined;
      const loginCsrfCookie = loginCookies?.find((cookie) => 
        cookie.startsWith('XSRF-TOKEN=')
      );
      const loginToken = loginCsrfCookie?.split('=')[1].split(';')[0];

      // Get token from signup
      const signupResponse = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'Another User',
          email: 'another@example.com',
          password: 'password123',
        });

      const signupSetCookieHeader = signupResponse.headers['set-cookie'];
      const signupCookies = Array.isArray(signupSetCookieHeader) ? signupSetCookieHeader : signupSetCookieHeader ? [signupSetCookieHeader] : undefined;
      const signupCsrfCookie = signupCookies?.find((cookie) => 
        cookie.startsWith('XSRF-TOKEN=')
      );
      const signupToken = signupCsrfCookie?.split('=')[1].split(';')[0];

      // All tokens should be different
      expect(csrfToken).not.toBe(loginToken);
      expect(csrfToken).not.toBe(signupToken);
      expect(loginToken).not.toBe(signupToken);
    });
  });
});
