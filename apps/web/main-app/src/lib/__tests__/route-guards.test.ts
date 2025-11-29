import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTanStackRouteGuard, RouteGuards } from '../route-guards'
import type { AuthState } from '@/store/slices/authSlice'

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
