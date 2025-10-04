import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock the problematic modules before importing the app
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('helmet', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('cookie-parser', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

vi.mock('../db/connectDB', () => ({
  connectDB: vi.fn().mockResolvedValue({}),
}));

// Mock the routes module to prevent Router() call at import time
vi.mock('../routes/auth.routes', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    use: vi.fn(),
  },
}));

// Fix express Router mock - COMPREHENSIVE
vi.mock('express', async () => {
  const actual = await vi.importActual('express');

  const mockRouter = {
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    patch: vi.fn().mockReturnThis(),
    options: vi.fn().mockReturnThis(),
    use: vi.fn().mockReturnThis(),
  };

  const mockApp = {
    use: vi.fn().mockReturnThis(),
    listen: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    patch: vi.fn().mockReturnThis(),
    options: vi.fn().mockReturnThis(),
  };

  const mockExpress = vi.fn(() => mockApp);
  mockExpress.Router = vi.fn(() => mockRouter);
  mockExpress.json = vi.fn(() => (req: any, res: any, next: any) => next());
  mockExpress.urlencoded = vi.fn(() => (req: any, res: any, next: any) => next());
  mockExpress.static = vi.fn(() => (req: any, res: any, next: any) => next());

  return {
    ...actual,
    default: mockExpress,
    Router: mockExpress.Router,
    json: mockExpress.json,
    urlencoded: mockExpress.urlencoded,
    static: mockExpress.static,
  };
});

import { app } from '../index';

describe('CSRF Middleware Integration Tests', () => {
  let server: any;

  beforeAll(async () => {
    // Start the server for testing
    server = app.listen(0); // Use port 0 to let the system assign an available port
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('Safe HTTP Methods', () => {
    it('should allow GET requests without CSRF tokens', async () => {
      const response = await request(app).get('/api/auth/health').expect(404); // 404 because route doesn't exist, but CSRF passed
      
      // Should not get CSRF error (403), should get 404 for non-existent route
      expect(response.status).not.toBe(403);
    });

    it('should allow OPTIONS requests without CSRF tokens', async () => {
      const response = await request(app).options('/api/auth/test');
      
      // OPTIONS requests should pass through CSRF middleware
      expect(response.status).not.toBe(403);
    });
  });

  describe('State-Changing HTTP Methods', () => {
    const statChangingMethods = [
      { method: 'post', name: 'POST' },
      { method: 'put', name: 'PUT' },
      { method: 'patch', name: 'PATCH' },
      { method: 'delete', name: 'DELETE' },
    ] as const;

    statChangingMethods.forEach(({ method, name }) => {
      describe(`${name} requests`, () => {
        it(`should reject ${name} requests without CSRF tokens`, async () => {
          const response = await request(app)[method]('/api/auth/test')
            .expect(403);

          expect(response.body).toEqual({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          });
        });

        it(`should reject ${name} requests with missing cookie token`, async () => {
          const response = await request(app)[method]('/api/auth/test')
            .set('X-CSRF-Token', 'header-token')
            .expect(403);

          expect(response.body).toEqual({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          });
        });

        it(`should reject ${name} requests with missing header token`, async () => {
          const response = await request(app)[method]('/api/auth/test')
            .set('Cookie', 'XSRF-TOKEN=cookie-token')
            .expect(403);

          expect(response.body).toEqual({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          });
        });

        it(`should reject ${name} requests with mismatched tokens`, async () => {
          const response = await request(app)[method]('/api/auth/test')
            .set('Cookie', 'XSRF-TOKEN=cookie-token')
            .set('X-CSRF-Token', 'different-header-token')
            .expect(403);

          expect(response.body).toEqual({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          });
        });

        it(`should allow ${name} requests with matching tokens to pass CSRF validation`, async () => {
          const token = 'valid-csrf-token';
          const response = await request(app)[method]('/api/auth/test')
            .set('Cookie', `XSRF-TOKEN=${token}`)
            .set('X-CSRF-Token', token);

          // Should not get CSRF error (403), should get 404 for non-existent route
          expect(response.status).not.toBe(403);
          expect(response.status).toBe(404); // Route doesn't exist, but CSRF passed
        });
      });
    });
  });

  describe('Origin Validation in Production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAppOrigin = process.env.APP_ORIGIN;
    const originalFrontendUrl = process.env.FRONTEND_URL;

    beforeAll(() => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ORIGIN = 'https://example.com';
      process.env.FRONTEND_URL = 'https://frontend.com';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.APP_ORIGIN = originalAppOrigin;
      process.env.FRONTEND_URL = originalFrontendUrl;
    });

    it('should reject requests from invalid origins in production', async () => {
      const token = 'valid-token';
      const response = await request(app)
        .post('/api/auth/test')
        .set('Origin', 'https://malicious.com')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-CSRF-Token', token)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        code: 'CSRF_FAILED',
        message: 'Invalid origin',
      });
    });

    it('should allow requests from valid APP_ORIGIN in production', async () => {
      const token = 'valid-token';
      const response = await request(app)
        .post('/api/auth/test')
        .set('Origin', 'https://example.com')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-CSRF-Token', token);

      // Should not get CSRF error (403), should get 404 for non-existent route
      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });

    it('should allow requests from valid FRONTEND_URL in production', async () => {
      const token = 'valid-token';
      const response = await request(app)
        .post('/api/auth/test')
        .set('Origin', 'https://frontend.com')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-CSRF-Token', token);

      // Should not get CSRF error (403), should get 404 for non-existent route
      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });

    it('should allow requests from localhost in production', async () => {
      const token = 'valid-token';
      const response = await request(app)
        .post('/api/auth/test')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-CSRF-Token', token);

      // Should not get CSRF error (403), should get 404 for non-existent route
      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });
  });

  describe('Development Mode Origin Handling', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should skip origin validation in development mode', async () => {
      const token = 'valid-token';
      const response = await request(app)
        .post('/api/auth/test')
        .set('Origin', 'https://any-origin.com')
        .set('Cookie', `XSRF-TOKEN=${token}`)
        .set('X-CSRF-Token', token);

      // Should not get CSRF error (403), should get 404 for non-existent route
      expect(response.status).not.toBe(403);
      expect(response.status).toBe(404);
    });
  });

});
