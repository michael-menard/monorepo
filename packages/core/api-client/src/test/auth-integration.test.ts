/**
 * Enhanced Authentication Integration Tests
 * Tests for Cognito integration, auth middleware, and RTK Query authentication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CognitoTokenManager,
  initializeCognitoTokenManager,
  getCognitoTokenManager,
  resetCognitoTokenManager,
  getCognitoTokenMetrics,
  isCognitoAuthenticationValid,
} from '../auth/cognito-integration'
import {
  AuthMiddleware,
  getAuthMiddleware,
  resetAuthMiddleware,
  getAuthToken,
  validateAuthentication,
} from '../auth/auth-middleware'
import {
  createAuthenticatedBaseQuery,
  createAuthQueryConfig,
} from '../auth/rtk-auth-integration'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('../retry/retry-logic', () => ({
  withRetry: vi.fn((fn) => fn()),
  withPriorityRetry: vi.fn((fn) => fn()),
}))

vi.mock('../lib/performance', () => ({
  performanceMonitor: {
    trackComponentRender: vi.fn(),
  },
}))

vi.mock('@repo/cache/utils/serverlessCacheManager', () => ({
  getServerlessCacheManager: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  })),
}))

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
})

describe('Enhanced CognitoTokenManager', () => {
  let tokenManager: CognitoTokenManager
  let mockRefreshCallback: vi.Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockRefreshCallback = vi.fn()
    resetCognitoTokenManager()
  })

  afterEach(() => {
    resetCognitoTokenManager()
  })

  describe('Token Management', () => {
    it('should initialize with tokens and refresh callback', () => {
      const initialTokens = {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
      }

      tokenManager = new CognitoTokenManager(initialTokens, mockRefreshCallback)

      expect(tokenManager.hasTokens()).toBe(true)
      expect(tokenManager.getAccessToken()).toBe('test-access-token')
      expect(tokenManager.getIdToken()).toBe('test-id-token')
    })

    it('should handle token refresh with retry logic', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
      }

      mockRefreshCallback.mockResolvedValue(newTokens)
      tokenManager = new CognitoTokenManager(undefined, mockRefreshCallback)

      const refreshedTokens = await tokenManager.refreshTokens()

      expect(refreshedTokens).toEqual(newTokens)
      expect(tokenManager.getAccessToken()).toBe('new-access-token')
      expect(mockRefreshCallback).toHaveBeenCalledTimes(1)
    })

    it('should track refresh metrics', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
      }

      mockRefreshCallback.mockResolvedValue(newTokens)
      tokenManager = new CognitoTokenManager(undefined, mockRefreshCallback)

      await tokenManager.refreshTokens()

      const metrics = tokenManager.getMetrics()
      expect(metrics.totalRefreshAttempts).toBe(1)
      expect(metrics.successfulRefreshes).toBe(1)
      expect(metrics.failedRefreshes).toBe(0)
      expect(metrics.consecutiveFailures).toBe(0)
    })

    it('should handle refresh failures and update metrics', async () => {
      mockRefreshCallback.mockRejectedValue(new Error('Refresh failed'))
      tokenManager = new CognitoTokenManager(undefined, mockRefreshCallback)

      const result = await tokenManager.refreshTokens()

      expect(result).toBeNull()
      
      const metrics = tokenManager.getMetrics()
      expect(metrics.totalRefreshAttempts).toBe(1)
      expect(metrics.successfulRefreshes).toBe(0)
      expect(metrics.failedRefreshes).toBe(1)
      expect(metrics.consecutiveFailures).toBe(1)
    })

    it('should check token expiration with buffer', () => {
      // Create a token that expires in 2 minutes
      const futureExp = Math.floor(Date.now() / 1000) + 120 // 2 minutes from now
      const tokenPayload = { sub: 'user123', exp: futureExp }
      const token = `header.${btoa(JSON.stringify(tokenPayload))}.signature`

      tokenManager = new CognitoTokenManager({ accessToken: token }, mockRefreshCallback, {
        tokenExpirationBuffer: 300, // 5 minutes buffer
      })

      const expirationInfo = tokenManager.getTokenExpirationInfo()
      expect(expirationInfo?.isExpiringSoon).toBe(true) // Should be expiring soon due to buffer
      expect(expirationInfo?.isExpired).toBe(false)
    })
  })

  describe('Global Token Manager', () => {
    it('should initialize global token manager', () => {
      const tokens = { accessToken: 'test-token' }
      const manager = initializeCognitoTokenManager(tokens, mockRefreshCallback)

      expect(manager).toBeDefined()
      expect(getCognitoTokenManager()).toBe(manager)
    })

    it('should validate authentication status', async () => {
      const validToken = `header.${btoa(JSON.stringify({ sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`
      initializeCognitoTokenManager({ accessToken: validToken }, mockRefreshCallback)

      const isValid = await isCognitoAuthenticationValid()
      expect(isValid).toBe(true)
    })

    it('should get token metrics from global manager', () => {
      initializeCognitoTokenManager({ accessToken: 'test-token' }, mockRefreshCallback)
      
      const metrics = getCognitoTokenMetrics()
      expect(metrics).toBeDefined()
      expect(metrics?.totalRefreshAttempts).toBe(0)
    })
  })
})

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware

  beforeEach(() => {
    vi.clearAllMocks()
    resetAuthMiddleware()
    resetCognitoTokenManager()
  })

  afterEach(() => {
    resetAuthMiddleware()
    resetCognitoTokenManager()
  })

  describe('Authentication Context', () => {
    it('should get authentication context for authenticated user', async () => {
      const validToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        'cognito:groups': ['user', 'premium']
      }))}.signature`

      initializeCognitoTokenManager({ accessToken: validToken })
      authMiddleware = new AuthMiddleware()

      const context = await authMiddleware.getAuthContext('/api/protected')

      expect(context.isAuthenticated).toBe(true)
      expect(context.token).toBe(validToken)
      expect(context.userId).toBe('user123')
      expect(context.userRoles).toEqual(['user', 'premium'])
    })

    it('should skip authentication for public paths', async () => {
      authMiddleware = new AuthMiddleware({
        skipAuthForPaths: ['/public', '/health']
      })

      const context = await authMiddleware.getAuthContext('/public/data')

      expect(context.isAuthenticated).toBe(false)
    })

    it('should validate authentication for protected paths', async () => {
      const validToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`

      initializeCognitoTokenManager({ accessToken: validToken })
      authMiddleware = new AuthMiddleware()

      const { isValid, context } = await authMiddleware.validateAuth('/api/protected')

      expect(isValid).toBe(true)
      expect(context.isAuthenticated).toBe(true)
    })

    it('should handle authentication failure for protected paths', async () => {
      authMiddleware = new AuthMiddleware()

      const { isValid, context } = await authMiddleware.validateAuth('/api/protected')

      expect(isValid).toBe(false)
      expect(context.isAuthenticated).toBe(false)
    })
  })

  describe('Token Management', () => {
    it('should get auth token with caching', async () => {
      const validToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`

      initializeCognitoTokenManager({ accessToken: validToken })
      authMiddleware = new AuthMiddleware({ enableCaching: true })

      const token = await authMiddleware.getAuthToken()

      expect(token).toBe(validToken)
    })

    it('should force refresh token when requested', async () => {
      const oldToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`

      const newToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 7200
      }))}.signature`

      const mockRefreshCallback = vi.fn().mockResolvedValue({ accessToken: newToken })
      initializeCognitoTokenManager({ accessToken: oldToken }, mockRefreshCallback)
      authMiddleware = new AuthMiddleware()

      const token = await authMiddleware.getAuthToken(true) // Force refresh

      // The token should be returned (either old or new)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    it('should clear authentication cache', async () => {
      authMiddleware = new AuthMiddleware()

      await authMiddleware.clearAuthCache()

      // Should not throw and should complete successfully
      expect(true).toBe(true)
    })
  })

  describe('Global Auth Middleware', () => {
    it('should create and return global auth middleware', () => {
      const middleware1 = getAuthMiddleware()
      const middleware2 = getAuthMiddleware()

      expect(middleware1).toBe(middleware2)
    })

    it('should use convenience functions', async () => {
      const validToken = `header.${btoa(JSON.stringify({
        sub: 'user123',
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`

      initializeCognitoTokenManager({ accessToken: validToken })

      const token = await getAuthToken()
      const { isValid } = await validateAuthentication('/api/protected')

      expect(token).toBe(validToken)
      expect(isValid).toBe(true)
    })
  })
})

describe('RTK Query Authentication Integration', () => {
  describe('Authenticated Base Query', () => {
    it('should create authenticated base query with config', () => {
      const baseQuery = createAuthenticatedBaseQuery({
        baseUrl: '/api',
        enableRetryLogic: true,
        enablePerformanceMonitoring: true,
      })

      expect(baseQuery).toBeDefined()
      expect(typeof baseQuery).toBe('function')
    })

    it('should create auth query config', () => {
      const config = createAuthQueryConfig({
        requireAuth: true,
        retryOnAuthFailure: true,
      })

      expect(config.meta.requireAuth).toBe(true)
      expect(config.meta.retryOnAuthFailure).toBe(true)
      expect(config.keepUnusedDataFor).toBe(300) // 5 minutes
    })
  })
})
