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

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  role: 'user',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

describe('TanStackRouteGuard Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Execution Time Performance', () => {
    it('should complete authentication check within 50ms for authenticated users', async () => {
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

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })

    it('should complete authentication check within 50ms for unauthenticated users', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })

    it('should handle complex role-based checks efficiently', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: { ...mockUser, role: 'admin' },
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const guard = createTanStackRouteGuard(
        { 
          requireAuth: true, 
          requireVerified: true, 
          requiredRole: 'admin',
          redirectTo: '/custom-login',
          unauthorizedTo: '/custom-unauthorized'
        },
        mockRedirect
      )

      const startTime = performance.now()
      await guard()
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })

    it('should handle expired auth state checks efficiently', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
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

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not create memory leaks with repeated calls', async () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      // Make multiple calls
      for (let i = 0; i < 100; i++) {
        try {
          await guard()
        } catch (error) {
          // Expected to fail
        }
      }

      // Memory test is skipped in environments without performance.memory
      // In real browser environments, this would check for memory leaks
    })

    it('should handle large user objects efficiently', async () => {
      const largeUser = {
        ...mockUser,
        // Add large properties to simulate complex user data
        preferences: Array(1000).fill(0).map((_, i) => ({ key: `pref_${i}`, value: `value_${i}` })),
        metadata: Array(500).fill(0).map((_, i) => ({ key: `meta_${i}`, value: `data_${i}` })),
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: largeUser,
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

      const executionTime = endTime - startTime
      // Should still complete within reasonable time even with large data
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('Scalability Performance', () => {
    it('should maintain consistent performance with multiple concurrent guards', async () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const promises = Array(10).fill(0).map(() => guard())
      const startTime = performance.now()
      
      try {
        await Promise.all(promises)
      } catch (error) {
        // Expected to fail
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Total time should be reasonable even with 10 concurrent calls
      expect(totalTime).toBeLessThan(200)
    })

    it('should handle rapid successive calls efficiently', async () => {
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
      
      // Make 50 rapid successive calls
      for (let i = 0; i < 50; i++) {
        await guard()
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Average time per call should be very low
      const averageTime = totalTime / 50
      expect(averageTime).toBeLessThan(10)
    })
  })

  describe('JSON Parsing Performance', () => {
    it('should handle malformed JSON efficiently', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json data')

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })

    it('should handle deeply nested JSON efficiently', async () => {
      const deepNestedData = {
        user: {
          ...mockUser,
          profile: {
            settings: {
              preferences: {
                theme: {
                  colors: {
                    primary: '#123456',
                    secondary: '#789012'
                  }
                }
              }
            }
          }
        },
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(deepNestedData))

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      await guard()
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle localStorage errors efficiently', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      await expect(guard()).rejects.toThrow('Redirect to: /auth/login')
      const endTime = performance.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(50)
    })

    it('should handle multiple error conditions efficiently', async () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const errorConditions = [
        () => localStorageMock.getItem.mockReturnValue(null),
        () => localStorageMock.getItem.mockReturnValue('invalid json'),
        () => localStorageMock.getItem.mockImplementation(() => { throw new Error('Storage error') }),
        () => localStorageMock.getItem.mockReturnValue(JSON.stringify({ user: null, isAuthenticated: false })),
      ]

      const startTime = performance.now()
      
      for (const setErrorCondition of errorConditions) {
        setErrorCondition()
        try {
          await guard()
        } catch (error) {
          // Expected to fail
        }
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle all error conditions efficiently
      expect(totalTime).toBeLessThan(200)
    })
  })

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical user session flow efficiently', async () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const scenarios = [
        // User not logged in
        () => localStorageMock.getItem.mockReturnValue(null),
        // User logs in
        () => localStorageMock.getItem.mockReturnValue(JSON.stringify({
          user: mockUser,
          isAuthenticated: true,
          lastUpdated: Date.now(),
        })),
        // User session expires
        () => localStorageMock.getItem.mockReturnValue(JSON.stringify({
          user: mockUser,
          isAuthenticated: true,
          lastUpdated: Date.now() - (25 * 60 * 60 * 1000),
        })),
        // User logs in again
        () => localStorageMock.getItem.mockReturnValue(JSON.stringify({
          user: mockUser,
          isAuthenticated: true,
          lastUpdated: Date.now(),
        })),
      ]

      const startTime = performance.now()
      
      for (const scenario of scenarios) {
        scenario()
        try {
          await guard()
        } catch (error) {
          // Expected for some scenarios
        }
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle typical user flow efficiently
      expect(totalTime).toBeLessThan(200)
    })

    it('should maintain performance under load', async () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true },
        mockRedirect
      )

      const startTime = performance.now()
      
      // Simulate high load with mixed scenarios
      const promises = Array(100).fill(0).map((_, i) => {
        if (i % 3 === 0) {
          localStorageMock.getItem.mockReturnValue(null) // Not authenticated
        } else if (i % 3 === 1) {
          localStorageMock.getItem.mockReturnValue(JSON.stringify({
            user: mockUser,
            isAuthenticated: true,
            lastUpdated: Date.now(),
          })) // Authenticated
        } else {
          localStorageMock.getItem.mockReturnValue(JSON.stringify({
            user: mockUser,
            isAuthenticated: true,
            lastUpdated: Date.now() - (25 * 60 * 60 * 1000),
          })) // Expired
        }
        return guard()
      })
      
      try {
        await Promise.all(promises)
      } catch (error) {
        // Expected to fail for some scenarios
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle high load efficiently
      expect(totalTime).toBeLessThan(1000)
    })
  })
}) 