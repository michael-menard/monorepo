import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

// Mock console methods to test logging
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
}

// Mock redirect function
const mockRedirect = vi.fn((options: { to: string; replace?: boolean }) => {
  throw new Error(`Redirect to: ${options.to}`)
})

describe('TanStackRouteGuard UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Feedback and Logging', () => {
    it('should log authentication success for debugging', async () => {
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

      await guard()

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Authentication check passed - allowing access'
      )
    })

    it('should log authentication failure with redirect path', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/auth/login' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Authentication required - redirecting to:',
        '/auth/login'
      )
    })

    it('should log email verification requirement', async () => {
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

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Email verification required - redirecting to verify-email'
      )
    })

    it('should log role-based access denial', async () => {
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

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Insufficient role - redirecting to unauthorized'
      )
    })
  })

  describe('Error Handling UX', () => {
    it('should handle localStorage errors gracefully without crashing', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle malformed JSON data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json data')

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle missing user data gracefully', async () => {
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
  })

  describe('Performance UX', () => {
    it('should complete authentication check quickly', async () => {
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

      const startTime = performance.now()
      await guard()
      const endTime = performance.now()

      // Should complete within 100ms for good UX
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle expired auth state efficiently', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: { id: '1', email: 'test@example.com' },
        isAuthenticated: true,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
      const endTime = performance.now()

      // Should complete within 100ms even for expired state
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Accessibility UX', () => {
    it('should provide clear error messages for screen readers', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/auth/login' },
        mockRedirect
      )

      try {
        await guard()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Redirect to: /auth/login')
      }
    })

    it('should handle role-based access with descriptive messages', async () => {
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

      try {
        await guard()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Redirect to: /auth/unauthorized')
      }
    })
  })

  describe('User Journey UX', () => {
    it('should provide smooth transition for authenticated users', async () => {
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
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Authentication check passed - allowing access'
      )
    })

    it('should redirect unauthenticated users to appropriate login page', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/auth/login' },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle email verification flow gracefully', async () => {
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
  })

  describe('Edge Cases UX', () => {
    it('should handle empty user object gracefully', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: {},
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })

    it('should handle future timestamps gracefully', async () => {
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
        lastUpdated: Date.now() + (24 * 60 * 60 * 1000), // 24 hours in future
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const result = await guard()
      expect(result).toBeUndefined()
    })

    it('should handle very old timestamps gracefully', async () => {
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
        lastUpdated: 0, // Very old timestamp
      }))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
    })
  })
}) 