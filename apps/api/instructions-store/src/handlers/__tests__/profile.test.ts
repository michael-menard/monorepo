import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import profileRouter from '../profile';
import * as dbUser from '../../db/user';
import jwt from 'jsonwebtoken';

describe('GET /api/profile', () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', profileRouter);

  const validUser = {
    id: 'user123',
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
  };
  const validToken = jwt.sign(validUser, 'testsecret');

  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
  });

  it('returns profile for valid auth token', async () => {
    vi.spyOn(dbUser, 'getUserById').mockResolvedValue({
      id: validUser.id,
      name: validUser.name,
      username: validUser.username,
      email: validUser.email,
      bio: 'Sample bio',
      avatar: 'https://example.com/avatar.jpg',
    });
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', [`auth_token=${validToken}`]);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: validUser.id,
      name: validUser.name,
      username: validUser.username,
    });
  });

  it('returns 404 if user not found', async () => {
    vi.spyOn(dbUser, 'getUserById').mockResolvedValue(null);
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', [`auth_token=${validToken}`]);
    expect(res.status).toBe(404);
  });

  it('returns 401 for missing token', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', [`auth_token=invalidtoken`]);
    expect(res.status).toBe(401);
  });
}); 