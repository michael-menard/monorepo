import request from 'supertest';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, wishlistOwnershipAuth } from '../middleware/auth';

// Mock the database module
jest.mock('../db/client');

// Mock axios for auth service calls
jest.mock('axios');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Simple test routes that use our auth middleware
app.get('/test/auth', requireAuth, (req, res) => {
  res.json({ userId: req.user?.sub, message: 'authenticated' });
});

app.get('/test/wishlist-auth', requireAuth, wishlistOwnershipAuth, (req, res) => {
  res.json({ 
    userId: req.user?.sub, 
    authenticatedUserId: req.authenticatedUserId,
    message: 'wishlist authenticated' 
  });
});

app.post('/test/wishlist-create', requireAuth, wishlistOwnershipAuth, (req, res) => {
  res.json({ 
    body: req.body,
    authenticatedUserId: req.authenticatedUserId,
    message: 'create authorized' 
  });
});

describe('Wishlist Authorization Middleware', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = createTestToken('user-123', 'test@example.com');
  });

  describe('requireAuth middleware', () => {
    it('should return 403 when no token provided', async () => {
      const response = await request(app)
        .get('/test/auth')
        .expect(403);

      expect(response.body.error).toBe('No authentication token provided');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/test/auth')
        .set('Cookie', 'token=invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid authentication token');
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/test/auth')
        .set('Cookie', `token=${validToken}`)
        .expect(200);

      expect(response.body.userId).toBe('user-123');
      expect(response.body.message).toBe('authenticated');
    });

    it('should reject token with wrong issuer', async () => {
      const wrongIssuerToken = jwt.sign(
        { 
          sub: 'user-123',
          email: 'test@example.com',
          iss: 'wrong-issuer' 
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test/auth')
        .set('Cookie', `token=${wrongIssuerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Invalid token issuer');
    });
  });

  describe('wishlistOwnershipAuth middleware', () => {
    it('should return 403 when user not authenticated', async () => {
      const response = await request(app)
        .get('/test/wishlist-auth')
        .expect(403);

      expect(response.body.error).toBe('No authentication token provided');
    });

    it('should add authenticatedUserId to request when authenticated', async () => {
      const response = await request(app)
        .get('/test/wishlist-auth')
        .set('Cookie', `token=${validToken}`)
        .expect(200);

      expect(response.body.userId).toBe('user-123');
      expect(response.body.authenticatedUserId).toBe('user-123');
      expect(response.body.message).toBe('wishlist authenticated');
    });

    it('should prevent creating items for other users', async () => {
      const response = await request(app)
        .post('/test/wishlist-create')
        .set('Cookie', `token=${validToken}`)
        .send({ 
          userId: 'different-user-id',
          title: 'Test Item'
        })
        .expect(403);

      expect(response.body.error).toBe('You can only create wishlist items for yourself');
      expect(response.body.statusCode).toBe(403);
    });

    it('should allow creating items without explicit userId', async () => {
      const response = await request(app)
        .post('/test/wishlist-create')
        .set('Cookie', `token=${validToken}`)
        .send({ 
          title: 'Test Item',
          description: 'Test Description'
        })
        .expect(200);

      expect(response.body.authenticatedUserId).toBe('user-123');
      expect(response.body.body.title).toBe('Test Item');
      expect(response.body.message).toBe('create authorized');
    });

    it('should allow creating items when userId matches authenticated user', async () => {
      const response = await request(app)
        .post('/test/wishlist-create')
        .set('Cookie', `token=${validToken}`)
        .send({ 
          userId: 'user-123',  // Same as authenticated user
          title: 'Test Item'
        })
        .expect(200);

      expect(response.body.authenticatedUserId).toBe('user-123');
      expect(response.body.body.userId).toBe('user-123');
      expect(response.body.message).toBe('create authorized');
    });
  });

  describe('Authorization flow integration', () => {
    it('should handle complete auth flow for wishlist operations', async () => {
      // First, test that requireAuth works
      const authResponse = await request(app)
        .get('/test/auth')
        .set('Cookie', `token=${validToken}`)
        .expect(200);

      expect(authResponse.body.userId).toBe('user-123');

      // Then test that wishlist auth builds on top of it
      const wishlistResponse = await request(app)
        .get('/test/wishlist-auth')
        .set('Cookie', `token=${validToken}`)
        .expect(200);

      expect(wishlistResponse.body.userId).toBe('user-123');
      expect(wishlistResponse.body.authenticatedUserId).toBe('user-123');
    });

    it('should fail both auth steps when no token provided', async () => {
      // Both should fail at the requireAuth level
      await request(app)
        .get('/test/auth')
        .expect(403);

      await request(app)
        .get('/test/wishlist-auth')
        .expect(403);
    });
  });
}); 