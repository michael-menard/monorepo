import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authStateManager } from '../authState.js'

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

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  role: 'user',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

describe('authStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getAuthState', () => {
    it('should return default state when no data is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const state = authStateManager.getAuthState()

      expect(state).toEqual({
        user: null,
        isAuthenticated: false,
        lastUpdated: expect.any(Number),
      })
    })

    it('should return parsed state when valid data is stored', () => {
      const storedData = {
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const state = authStateManager.getAuthState()

      expect(state).toEqual(storedData)
    })

    it('should handle missing lastUpdated and set default', () => {
      const storedData = {
        user: mockUser,
        isAuthenticated: true,
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const state = authStateManager.getAuthState()

      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
      expect(state.lastUpdated).toBeGreaterThan(0)
    })

    it('should handle malformed JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const state = authStateManager.getAuthState()

      expect(state).toEqual({
        user: null,
        isAuthenticated: false,
        lastUpdated: expect.any(Number),
      })
    })

    it('should handle missing user data gracefully', () => {
      const storedData = {
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const state = authStateManager.getAuthState()

      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setAuthState', () => {
    it('should save user data to localStorage', () => {
      authStateManager.setAuthState(mockUser)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_state',
        expect.stringContaining('"user":')
      )

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.user).toEqual(mockUser)
      expect(savedData.isAuthenticated).toBe(true)
      expect(savedData.lastUpdated).toBeGreaterThan(0)
    })

    it('should save null user data to localStorage', () => {
      authStateManager.setAuthState(null)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_state',
        expect.stringContaining('"user":null')
      )

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedData.user).toBeNull()
      expect(savedData.isAuthenticated).toBe(false)
      expect(savedData.lastUpdated).toBeGreaterThan(0)
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      expect(() => authStateManager.setAuthState(mockUser)).not.toThrow()
    })
  })

  describe('clearAuthState', () => {
    it('should remove auth state from localStorage', () => {
      authStateManager.clearAuthState()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_state')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => authStateManager.clearAuthState()).not.toThrow()
    })
  })

  describe('isAuthStateValid', () => {
    it('should return false when user is not authenticated', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: null,
        isAuthenticated: false,
        lastUpdated: Date.now(),
      }))

      const isValid = authStateManager.isAuthStateValid()

      expect(isValid).toBe(false)
    })

    it('should return true when auth state is recent', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const isValid = authStateManager.isAuthStateValid()

      expect(isValid).toBe(true)
    })

    it('should return false when auth state is expired', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }))

      const isValid = authStateManager.isAuthStateValid()

      expect(isValid).toBe(false)
    })

    it('should use custom maxAge when provided', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      }))

      const isValid = authStateManager.isAuthStateValid(1 * 60 * 60 * 1000) // 1 hour max

      expect(isValid).toBe(false)
    })

    it('should return true when auth state is within custom maxAge', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now() - (30 * 60 * 1000), // 30 minutes ago
      }))

      const isValid = authStateManager.isAuthStateValid(1 * 60 * 60 * 1000) // 1 hour max

      expect(isValid).toBe(true)
    })
  })

  describe('getUser', () => {
    it('should return user when authenticated', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const user = authStateManager.getUser()

      expect(user).toEqual(mockUser)
    })

    it('should return null when not authenticated', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: null,
        isAuthenticated: false,
        lastUpdated: Date.now(),
      }))

      const user = authStateManager.getUser()

      expect(user).toBeNull()
    })

    it('should return null when no data is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const user = authStateManager.getUser()

      expect(user).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated and state is valid', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now(),
      }))

      const isAuth = authStateManager.isAuthenticated()

      expect(isAuth).toBe(true)
    })

    it('should return false when user is not authenticated', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: null,
        isAuthenticated: false,
        lastUpdated: Date.now(),
      }))

      const isAuth = authStateManager.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false when auth state is expired', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        user: mockUser,
        isAuthenticated: true,
        lastUpdated: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      }))

      const isAuth = authStateManager.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false when no data is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const isAuth = authStateManager.isAuthenticated()

      expect(isAuth).toBe(false)
    })

    it('should return false when data is malformed', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const isAuth = authStateManager.isAuthenticated()

      expect(isAuth).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should maintain consistency across all methods', () => {
      // Set auth state
      authStateManager.setAuthState(mockUser)

      // Verify all methods return consistent results
      const state = authStateManager.getAuthState()
      const user = authStateManager.getUser()
      const isAuth = authStateManager.isAuthenticated()
      const isValid = authStateManager.isAuthStateValid()

      expect(state.user).toEqual(mockUser)
      expect(user).toEqual(mockUser)
      expect(isAuth).toBe(true)
      expect(isValid).toBe(true)
    })

    it('should handle complete auth lifecycle', () => {
      // Start with no auth
      expect(authStateManager.isAuthenticated()).toBe(false)
      expect(authStateManager.getUser()).toBeNull()

      // Set auth
      authStateManager.setAuthState(mockUser)
      expect(authStateManager.isAuthenticated()).toBe(true)
      expect(authStateManager.getUser()).toEqual(mockUser)

      // Clear auth
      authStateManager.clearAuthState()
      expect(authStateManager.isAuthenticated()).toBe(false)
      expect(authStateManager.getUser()).toBeNull()
    })
  })
}) 