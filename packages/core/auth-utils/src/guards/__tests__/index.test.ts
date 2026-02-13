import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTanStackRouteGuard, RouteGuards, composeMiddleware } from '../index'
import type { AuthState } from '../index'

// Mock the jwt module
vi.mock('../../jwt', () => ({
  isTokenExpired: vi.fn(),
  getTokenScopes: vi.fn(),
}))

// Mock the logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { isTokenExpired, getTokenScopes } from '../../jwt'
import { logger } from '@repo/logger'

// Mock redirect function
const mockRedirect = vi.fn()

// Helper to create mock context
const createMockContext = (authOverrides: Partial<AuthState> = {}) => ({
  auth: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    tokens: null,
    error: null,
    ...authOverrides,
  },
})

// Helper to create mock location
const createMockLocation = (pathname: string) => ({
  pathname,
  search: '',
  hash: '',
})

describe('createTanStackRouteGuard', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
    mockRedirect.mockImplementation(opts => {
      throw { type: 'redirect', ...opts }
    })
  })

  describe('loading state', () => {
    it('should skip guard while auth is loading', () => {
      const guard = createTanStackRouteGuard({ requireAuth: true }, mockRedirect)
      const context = createMockContext({ isLoading: true })
      const location = createMockLocation('/dashboard')

      // Should not throw - just return
      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should not redirect during loading even for protected routes', () => {
      const guard = createTanStackRouteGuard({ requireAuth: true }, mockRedirect)
      const context = createMockContext({ isLoading: true, isAuthenticated: false })
      const location = createMockLocation('/protected')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('requireAuth option', () => {
    it('should redirect unauthenticated users to login', () => {
      const guard = createTanStackRouteGuard({ requireAuth: true }, mockRedirect)
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/dashboard')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect: '/dashboard' },
      })
    })

    it('should allow authenticated users through', () => {
      const guard = createTanStackRouteGuard({ requireAuth: true }, mockRedirect)
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/dashboard')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should use custom redirectTo when specified', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, redirectTo: '/custom-login' },
        mockRedirect,
      )
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/protected')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/custom-login',
        search: { redirect: '/protected' },
      })
    })

    it('should include original URL in redirect search params', () => {
      const guard = createTanStackRouteGuard({ requireAuth: true }, mockRedirect)
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/some/deep/path')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect: '/some/deep/path' },
      })
    })
  })

  describe('guestOnly option', () => {
    it('should redirect authenticated users away from guest routes', () => {
      const guard = createTanStackRouteGuard(
        { guestOnly: true, redirectTo: '/dashboard' },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/login')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/dashboard' })
    })

    it('should allow unauthenticated users to access guest routes', () => {
      const guard = createTanStackRouteGuard(
        { guestOnly: true, redirectTo: '/dashboard' },
        mockRedirect,
      )
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/login')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should skip redirect while loading for guest routes', () => {
      const guard = createTanStackRouteGuard(
        { guestOnly: true, redirectTo: '/dashboard' },
        mockRedirect,
      )
      const context = createMockContext({ isLoading: true, isAuthenticated: true })
      const location = createMockLocation('/login')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('requireRoles option', () => {
    it('should allow users with required role', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireRoles: ['admin'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
      })
      const location = createMockLocation('/admin')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should redirect users without required role to unauthorized', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireRoles: ['admin'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: ['user'] },
      })
      const location = createMockLocation('/admin')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })

    it('should allow users with any of the required roles', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireRoles: ['admin', 'moderator'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'mod@test.com', name: 'Mod', roles: ['moderator'] },
      })
      const location = createMockLocation('/admin')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should handle users with no roles', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireRoles: ['admin'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
      })
      const location = createMockLocation('/admin')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })

    it('should handle users with undefined roles', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requireRoles: ['admin'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User' } as any,
      })
      const location = createMockLocation('/admin')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })
  })

  describe('requirePermissions option (Story 1.27)', () => {
    beforeEach(() => {
      vi.mocked(getTokenScopes).mockClear()
    })

    it('should allow users with required permission', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile', 'custom:gallery.read'])

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requirePermissions: ['custom:gallery.read'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(getTokenScopes).toHaveBeenCalledWith('mock-token')
    })

    it('should block users without required permission', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile'])

      const guard = createTanStackRouteGuard(
        { requireAuth: true, requirePermissions: ['custom:gallery.write'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery/edit')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
      expect(logger.warn).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        expect.objectContaining({
          userId: '1',
          path: '/gallery/edit',
          requiredPermissions: ['custom:gallery.write'],
        }),
      )
    })

    it('should allow users with any of multiple required permissions (OR logic)', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile', 'custom:gallery.read'])

      const guard = createTanStackRouteGuard(
        {
          requireAuth: true,
          requirePermissions: ['custom:gallery.read', 'custom:gallery.write'],
          requireAll: false,
        },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should require all permissions when requireAll is true (AND logic)', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile', 'custom:gallery.read'])

      const guard = createTanStackRouteGuard(
        {
          requireAuth: true,
          requirePermissions: ['custom:gallery.read', 'custom:gallery.write'],
          requireAll: true,
        },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery/admin')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })

    it('should handle missing access token', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, requirePermissions: ['custom:gallery.read'] },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: [] },
        tokens: null,
      })
      const location = createMockLocation('/gallery')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })
  })

  describe('combined role and permission checks (Story 1.27)', () => {
    beforeEach(() => {
      vi.mocked(getTokenScopes).mockClear()
    })

    it('should allow users with required role OR permission (OR logic)', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile'])

      const guard = createTanStackRouteGuard(
        {
          requireAuth: true,
          requireRoles: ['admin'],
          requirePermissions: ['custom:gallery.write'],
          requireAll: false, // OR logic
        },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery/edit')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should require both role AND permission when requireAll is true', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile', 'custom:gallery.write'])

      const guard = createTanStackRouteGuard(
        {
          requireAuth: true,
          requireRoles: ['admin'],
          requirePermissions: ['custom:gallery.write'],
          requireAll: true, // AND logic
        },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: ['user'] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery/admin')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/unauthorized' })
    })

    it('should pass when user has both role AND permission (AND logic)', () => {
      vi.mocked(getTokenScopes).mockReturnValue(['openid', 'profile', 'custom:gallery.write'])

      const guard = createTanStackRouteGuard(
        {
          requireAuth: true,
          requireRoles: ['admin'],
          requirePermissions: ['custom:gallery.write'],
          requireAll: true, // AND logic
        },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
        tokens: { accessToken: 'mock-token' },
      })
      const location = createMockLocation('/gallery/admin')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('allowedPaths option', () => {
    it('should allow access to explicitly allowed paths', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, allowedPaths: ['/public'] },
        mockRedirect,
      )
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/public/something')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('blockedPaths option', () => {
    it('should block access to explicitly blocked paths', () => {
      const guard = createTanStackRouteGuard(
        { blockedPaths: ['/blocked'], redirectTo: '/' },
        mockRedirect,
      )
      const context = createMockContext()
      const location = createMockLocation('/blocked/something')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({ to: '/' })
    })
  })
})

describe('RouteGuards presets', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
    mockRedirect.mockImplementation(opts => {
      throw { type: 'redirect', ...opts }
    })
  })

  describe('RouteGuards.public', () => {
    it('should allow anyone to access', () => {
      // Public guard doesn't require auth, so it should pass for everyone
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/home')

      const result = RouteGuards.public({ context, location })
      expect(result).toBeUndefined()
    })
  })

  describe('RouteGuards.protected', () => {
    it('should redirect unauthenticated users to /login', () => {
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/dashboard')

      expect(() => RouteGuards.protected({ context, location })).toThrow()
    })

    it('should allow authenticated users', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/dashboard')

      const result = RouteGuards.protected({ context, location })
      expect(result).toBeUndefined()
    })
  })

  describe('RouteGuards.guestOnly', () => {
    it('should redirect authenticated users to /dashboard', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/login')

      expect(() => RouteGuards.guestOnly({ context, location })).toThrow()
    })

    it('should allow unauthenticated users', () => {
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/login')

      const result = RouteGuards.guestOnly({ context, location })
      expect(result).toBeUndefined()
    })
  })

  describe('RouteGuards.admin', () => {
    it('should redirect non-admin users to /unauthorized', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: ['user'] },
      })
      const location = createMockLocation('/admin')

      expect(() => RouteGuards.admin({ context, location })).toThrow()
    })

    it('should allow admin users', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
      })
      const location = createMockLocation('/admin')

      const result = RouteGuards.admin({ context, location })
      expect(result).toBeUndefined()
    })
  })
})

describe('Token Expiration Checking (Story 1.26)', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
    mockRedirect.mockImplementation(opts => {
      throw { type: 'redirect', ...opts }
    })
    vi.mocked(isTokenExpired).mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkTokenExpiry option', () => {
    it('should redirect when token is expired', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, checkTokenExpiry: true },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/dashboard')

      expect(() => guard({ context, location })).toThrow()
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/login',
        search: { redirect: '/dashboard', expired: true },
      })
    })

    it('should allow through when token is valid', () => {
      vi.mocked(isTokenExpired).mockReturnValue(false)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, checkTokenExpiry: true },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/dashboard')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(isTokenExpired).toHaveBeenCalledWith('valid-token')
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should skip token check when checkTokenExpiry is false', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, checkTokenExpiry: false },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'any-token' },
      })
      const location = createMockLocation('/dashboard')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(isTokenExpired).not.toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should skip token check when user is not authenticated', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: false, checkTokenExpiry: true },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: false,
        tokens: null,
      })
      const location = createMockLocation('/public')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(isTokenExpired).not.toHaveBeenCalled()
    })

    it('should skip token check when no access token exists', () => {
      const guard = createTanStackRouteGuard(
        { requireAuth: true, checkTokenExpiry: true },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: undefined },
      })
      const location = createMockLocation('/dashboard')

      const result = guard({ context, location })
      expect(result).toBeUndefined()
      expect(isTokenExpired).not.toHaveBeenCalled()
    })

    it('should use custom redirectTo when token is expired', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const guard = createTanStackRouteGuard(
        { requireAuth: true, checkTokenExpiry: true, redirectTo: '/custom-login' },
        mockRedirect,
      )
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/protected')

      expect(() => guard({ context, location })).toThrow()
      expect(mockRedirect).toHaveBeenCalledWith({
        to: '/custom-login',
        search: { redirect: '/protected', expired: true },
      })
    })
  })

  describe('RouteGuards with token checking', () => {
    it('RouteGuards.protected should check token expiry by default', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/dashboard')

      expect(() => RouteGuards.protected({ context, location })).toThrow()
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
    })

    it('RouteGuards.verified should check token expiry by default', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/profile')

      expect(() => RouteGuards.verified({ context, location })).toThrow()
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
    })

    it('RouteGuards.admin should check token expiry by default', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/admin')

      expect(() => RouteGuards.admin({ context, location })).toThrow()
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
    })
  })

  describe('RouteGuards.public', () => {
    beforeEach(() => {
      vi.mocked(isTokenExpired).mockClear()
      vi.mocked(isTokenExpired).mockReturnValue(false)
    })

    it('should allow unauthenticated users', () => {
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/about')

      const result = RouteGuards.public({ context, location })
      expect(result).toBeUndefined()
    })

    it('should allow authenticated users', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/about')

      const result = RouteGuards.public({ context, location })
      expect(result).toBeUndefined()
    })

    it('should check token expiry by default even for public routes', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/about')

      // Public routes still check token expiry for authenticated users
      try {
        RouteGuards.public({ context, location })
        expect.fail('Expected guard to throw redirect')
      } catch (error: any) {
        expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
      }
    })
  })

  describe('RouteGuards.guestOnly', () => {
    it('should allow unauthenticated users', () => {
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/login')

      const result = RouteGuards.guestOnly({ context, location })
      expect(result).toBeUndefined()
    })

    it('should redirect authenticated users to dashboard', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/login')

      // The guard should throw a redirect Response
      expect(() => RouteGuards.guestOnly({ context, location })).toThrow()
    })

    it('should skip redirect while loading', () => {
      const context = createMockContext({
        isLoading: true,
        isAuthenticated: true,
        user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      })
      const location = createMockLocation('/login')

      const result = RouteGuards.guestOnly({ context, location })
      expect(result).toBeUndefined()
    })
  })

  describe('RouteGuards.moderator', () => {
    beforeEach(() => {
      vi.mocked(isTokenExpired).mockClear()
      vi.mocked(isTokenExpired).mockReturnValue(false)
    })

    it('should allow users with moderator role', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'mod@test.com', name: 'Mod', roles: ['moderator'] },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/moderate')

      const result = RouteGuards.moderator({ context, location })
      expect(result).toBeUndefined()
    })

    it('should allow users with admin role', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/moderate')

      const result = RouteGuards.moderator({ context, location })
      expect(result).toBeUndefined()
    })

    it('should allow users with both admin and moderator roles', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: {
          id: '1',
          email: 'superuser@test.com',
          name: 'Super',
          roles: ['admin', 'moderator'],
        },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/moderate')

      const result = RouteGuards.moderator({ context, location })
      expect(result).toBeUndefined()
    })

    it('should block users without moderator or admin role', () => {
      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'user@test.com', name: 'User', roles: ['user'] },
        tokens: { accessToken: 'valid-token' },
      })
      const location = createMockLocation('/moderate')

      expect(() => RouteGuards.moderator({ context, location })).toThrow()
    })

    it('should block unauthenticated users', () => {
      const context = createMockContext({ isAuthenticated: false })
      const location = createMockLocation('/moderate')

      expect(() => RouteGuards.moderator({ context, location })).toThrow()
    })

    it('should check token expiry by default', () => {
      vi.mocked(isTokenExpired).mockReturnValue(true)

      const context = createMockContext({
        isAuthenticated: true,
        user: { id: '1', email: 'mod@test.com', name: 'Mod', roles: ['moderator'] },
        tokens: { accessToken: 'expired-token' },
      })
      const location = createMockLocation('/moderate')

      expect(() => RouteGuards.moderator({ context, location })).toThrow()
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
    })
  })
})

describe('composeMiddleware (Story 1.26 - AC 5)', () => {
  beforeEach(() => {
    mockRedirect.mockClear()
    mockRedirect.mockImplementation(opts => {
      throw { type: 'redirect', ...opts }
    })
    vi.mocked(isTokenExpired).mockClear()
    vi.mocked(isTokenExpired).mockReturnValue(false)
  })

  it('should execute all guards in order when all pass', () => {
    const guard1 = vi.fn(() => undefined)
    const guard2 = vi.fn(() => undefined)
    const guard3 = vi.fn(() => undefined)

    const composed = composeMiddleware(guard1, guard2, guard3)
    const context = createMockContext()
    const location = createMockLocation('/test')

    const result = composed({ context, location })

    expect(result).toBeUndefined()
    expect(guard1).toHaveBeenCalledWith({ context, location })
    expect(guard2).toHaveBeenCalledWith({ context, location })
    expect(guard3).toHaveBeenCalledWith({ context, location })
  })

  it('should stop execution when a guard throws (redirects)', () => {
    const guard1 = vi.fn(() => undefined)
    const guard2 = vi.fn(() => {
      throw { type: 'redirect', to: '/login' }
    })
    const guard3 = vi.fn(() => undefined)

    const composed = composeMiddleware(guard1, guard2, guard3)
    const context = createMockContext()
    const location = createMockLocation('/test')

    expect(() => composed({ context, location })).toThrow()
    expect(guard1).toHaveBeenCalled()
    expect(guard2).toHaveBeenCalled()
    expect(guard3).not.toHaveBeenCalled()
  })

  it('should work with real RouteGuards', () => {
    const customGuard = vi.fn(() => undefined)

    const composed = composeMiddleware(RouteGuards.protected, customGuard)

    const context = createMockContext({
      isAuthenticated: true,
      user: { id: '1', email: 'test@test.com', name: 'Test', roles: [] },
      tokens: { accessToken: 'valid-token' },
    })
    const location = createMockLocation('/dashboard')

    const result = composed({ context, location })

    expect(result).toBeUndefined()
    expect(customGuard).toHaveBeenCalled()
  })

  it('should compose auth guard with role guard', () => {
    const roleGuard = createTanStackRouteGuard(
      { requireAuth: true, requireRoles: ['admin'] },
      mockRedirect,
    )

    const composed = composeMiddleware(RouteGuards.protected, roleGuard)

    // Non-admin user should be blocked by role guard
    const context = createMockContext({
      isAuthenticated: true,
      user: { id: '1', email: 'user@test.com', name: 'User', roles: ['user'] },
      tokens: { accessToken: 'valid-token' },
    })
    const location = createMockLocation('/admin')

    expect(() => composed({ context, location })).toThrow()
  })

  it('should handle empty guard list', () => {
    const composed = composeMiddleware()
    const context = createMockContext()
    const location = createMockLocation('/test')

    const result = composed({ context, location })
    expect(result).toBeUndefined()
  })

  it('should propagate return value from guard', () => {
    const guard1 = vi.fn(() => undefined)
    const guard2 = vi.fn(() => ({ some: 'value' })) as any
    const guard3 = vi.fn(() => undefined)

    const composed = composeMiddleware(guard1, guard2, guard3)
    const context = createMockContext()
    const location = createMockLocation('/test')

    const result = composed({ context, location })

    expect(result).toEqual({ some: 'value' })
    expect(guard1).toHaveBeenCalled()
    expect(guard2).toHaveBeenCalled()
    expect(guard3).not.toHaveBeenCalled() // Stopped after guard2 returned value
  })
})
