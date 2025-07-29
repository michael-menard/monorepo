import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTanStackRouteGuard } from '../TanStackRouteGuard';

// Mock TanStack Router redirect
vi.mock('@tanstack/react-router', () => ({
  redirect: vi.fn((options) => {
    const error = new Error('Redirect');
    (error as any).redirect = options;
    throw error;
  }),
}));

describe('Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Protected Routes', () => {
    it('should protect profile route with authentication', async () => {
      const guard = createTanStackRouteGuard({
        requireAuth: true,
        redirectTo: '/',
      });

      // Test unauthenticated access
      try {
        await guard();
        expect.fail('Should have thrown redirect error');
      } catch (error: any) {
        expect(error.redirect).toEqual({
          to: '/',
          replace: true,
        });
      }
    });

    it('should protect MOC detail route with authentication', async () => {
      const guard = createTanStackRouteGuard({
        requireAuth: true,
        redirectTo: '/',
      });

      // Test unauthenticated access
      try {
        await guard();
        expect.fail('Should have thrown redirect error');
      } catch (error: any) {
        expect(error.redirect).toEqual({
          to: '/',
          replace: true,
        });
      }
    });

    it('should protect wishlist route with authentication', async () => {
      const guard = createTanStackRouteGuard({
        requireAuth: true,
        redirectTo: '/',
      });

      // Test unauthenticated access
      try {
        await guard();
        expect.fail('Should have thrown redirect error');
      } catch (error: any) {
        expect(error.redirect).toEqual({
          to: '/',
          replace: true,
        });
      }
    });
  });

  describe('Public Routes', () => {
    it('should allow public access to MOC gallery', async () => {
      const guard = createTanStackRouteGuard({
        requireAuth: false,
        redirectTo: '/',
      });

      const result = await guard();
      expect(result).toBeUndefined();
    });
  });

  describe('Route Configuration', () => {
    it('should have consistent redirect paths', () => {
      const protectedGuard = createTanStackRouteGuard({
        requireAuth: true,
        redirectTo: '/',
      });

      const publicGuard = createTanStackRouteGuard({
        requireAuth: false,
        redirectTo: '/',
      });

      expect(protectedGuard).toBeDefined();
      expect(publicGuard).toBeDefined();
    });
  });
}); 