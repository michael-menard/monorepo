// Jest-based test file (migrated from Vitest)

process.env.AUTH_API = 'http://auth-api';
process.env.JWT_SECRET = 'test-secret';

const validToken = 'valid.jwt.token';
const expiredToken = 'expired.jwt.token';
const refreshToken = 'refresh.jwt.token';
const validPayload = { sub: 'user-id', iss: 'lego-projects-api', exp: Math.floor(Date.now() / 1000) + 3600 };

// Mock JWT before importing the middleware
const mockJwtVerify = jest.fn((token: string) => {
  if (token === validToken) return validPayload;
  if (token === expiredToken) throw new Error('jwt expired');
  throw new Error('invalid token');
});

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  verify: mockJwtVerify,
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.resolve({ data: { token: validToken } })),
  },
}));

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as authMiddleware from '../src/middleware/auth';

describe('requireAuth middleware', () => {
  const makeApp = (middleware: any) => {
    const app = express();
    app.use(cookieParser());
    app.get('/protected', middleware, (req: Request, res: Response) => {
      res.json({ ok: true });
    });
    return app;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // Reset the mock to default behavior
    mockJwtVerify.mockImplementation((token: string) => {
      if (token === validToken) return validPayload;
      if (token === expiredToken) throw new Error('jwt expired');
      throw new Error('invalid token');
    });
  });

  it('returns 403 if no token cookie', async () => {
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'No authentication token provided' });
  });

  it('verifies JWT mock is working', () => {
    const jwt = require('jsonwebtoken');
    expect(jwt.verify(validToken)).toEqual(validPayload);
    expect(() => jwt.verify(expiredToken)).toThrow('jwt expired');
    expect(() => jwt.verify('invalid')).toThrow('invalid token');
  });

  it('returns 403 if token is invalid', async () => {
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app).get('/protected').set('Cookie', [`token=invalid.jwt.token`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Invalid authentication token' });
  });

  it('returns 403 if token issuer is invalid', async () => {
    const app = makeApp(authMiddleware.requireAuth);
    // Mock JWT to return payload with wrong issuer
    mockJwtVerify.mockImplementationOnce(() => ({ ...validPayload, iss: 'wrong-issuer' }));
    const res = await request(app).get('/protected').set('Cookie', [`token=${validToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Invalid token issuer' });
  });

  it('calls next if token is valid and issuer matches', async () => {
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app).get('/protected').set('Cookie', [`token=${validToken}`]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 403 if token expired and no refresh token', async () => {
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app).get('/protected').set('Cookie', [`token=${expiredToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Token expired and no refresh token provided' });
  });

  it('returns 403 if refresh fails (auth API error)', async () => {
    (require('axios').default.post as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('auth API error')));
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app)
      .get('/protected')
      .set('Cookie', [`token=${expiredToken}`, `refresh-token=${refreshToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Failed to refresh token' });
  });

  it('returns 403 if refresh returns no token', async () => {
    (require('axios').default.post as jest.Mock).mockImplementationOnce(() => Promise.resolve({ data: {} }));
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app)
      .get('/protected')
      .set('Cookie', [`token=${expiredToken}`, `refresh-token=${refreshToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Failed to refresh token: No token returned' });
  });

  it('returns 403 if new token after refresh has invalid issuer', async () => {
    (require('axios').default.post as jest.Mock).mockImplementationOnce(() => Promise.resolve({ data: { token: validToken } }));
    const app = makeApp(authMiddleware.requireAuth);
    // Mock JWT to return payload with wrong issuer for the refreshed token
    mockJwtVerify.mockImplementationOnce(() => ({ ...validPayload, iss: 'wrong-issuer' }));
    const res = await request(app)
      .get('/protected')
      .set('Cookie', [`token=${expiredToken}`, `refresh-token=${refreshToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Invalid token issuer after refresh' });
  });

  it('returns 403 if new token after refresh is invalid', async () => {
    (require('axios').default.post as jest.Mock).mockImplementationOnce(() => Promise.resolve({ data: { token: 'invalid.jwt.token' } }));
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app)
      .get('/protected')
      .set('Cookie', [`token=${expiredToken}`, `refresh-token=${refreshToken}`]);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'Invalid token after refresh' });
  });

  it('sets new token cookie and calls next if refresh succeeds', async () => {
    (require('axios').default.post as jest.Mock).mockImplementationOnce(() => Promise.resolve({ data: { token: validToken } }));
    const app = makeApp(authMiddleware.requireAuth);
    const res = await request(app)
      .get('/protected')
      .set('Cookie', [`token=${expiredToken}`, `refresh-token=${refreshToken}`]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // Optionally, check for set-cookie header
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('canModifyProfile middleware', () => {
  it('calls next() when user can modify their own profile', () => {
    const req = { user: { sub: 'user-id' }, params: { id: 'user-id' } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;
    const next = jest.fn();
    authMiddleware.canModifyProfile(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user tries to modify another profile', () => {
    const req = { user: { sub: 'user-id' }, params: { id: 'other-user-id' } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;
    const next = jest.fn();
    authMiddleware.canModifyProfile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'You can only modify your own profile' });
    expect(next).not.toHaveBeenCalled();
  });
}); 