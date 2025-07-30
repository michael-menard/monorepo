import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTanStackRouteGuard } from '../index.js'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock redirect function
const mockRedirect = vi.fn((options: { to: string; replace?: boolean }) => {
  throw new Error(`Redirect to: ${options.to}`)
})

describe('TanStackRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Checks', () => {
    it('should allow access when user is authenticated', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })

    it('should redirect to login when user is not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/auth/login' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should redirect to custom path when authentication is required', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/custom-login' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /custom-login')
    })

    it('should allow access when authentication is not required', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: false },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })
  })

  describe('Email Verification Checks', () => {
    it('should allow access when email verification is not required', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireVerified: false },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })

    it('should redirect to verify-email when email verification is required but not verified', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireVerified: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/verify-email')
    })

    it('should allow access when email verification is required and verified', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireVerified: true },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })
  })

  describe('Role-Based Access Control', () => {
    it('should allow access when user has required role', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        emailVerified: true,
        role: 'admin',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requiredRole: 'admin' },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })

    it('should redirect to unauthorized when user lacks required role', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        emailVerified: true,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requiredRole: 'admin', unauthorizedTo: '/access-denied' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /access-denied')
    })

    it('should redirect to default unauthorized path when not specified', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        name: 'Regular User',
        emailVerified: true,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requiredRole: 'admin' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/unauthorized')
    })
  })

  describe('Combined Checks', () => {
    it('should pass all checks when user meets all requirements', async () => {
      const mockUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        emailVerified: true,
        role: 'admin',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { 
          requireAuth: true, 
          requireVerified: true, 
          requiredRole: 'admin' 
        },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })

    it('should fail authentication check first when user is not authenticated', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { 
          requireAuth: true, 
          requireVerified: true, 
          requiredRole: 'admin',
          redirectTo: '/auth/login'
        },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed localStorage data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle missing user data in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle expired auth state', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        role: 'user',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })
  })

  describe('Default Values', () => {
    it('should use default values when options are not provided', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard({}, mockRedirect)

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should use provided redirectTo over default', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { redirectTo: '/custom-login' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /custom-login')
    })
  })
}) 