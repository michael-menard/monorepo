/**
 * Tests for Auth Failure Handler (Dependency Injection API)
 * Story REPA-019: Add Error Mapping to @repo/api-client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAuthFailureHandler, AUTH_PAGES } from '../auth-failure'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('auth-failure (dependency injection API)', () => {
  let originalLocation: Location
  let onAuthFailureMock: ReturnType<typeof vi.fn>
  let isAuthPageMock: ReturnType<typeof vi.fn>
  let resetApiStateMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Save original location
    originalLocation = window.location

    // Mock window.location
    delete (window as any).location
    ;(window as any).location = {
      ...originalLocation,
      href: '',
      pathname: '/dashboard',
    }

    // Create mock callbacks
    onAuthFailureMock = vi.fn()
    isAuthPageMock = vi.fn((path: string) =>
      AUTH_PAGES.some(authPath => path.startsWith(authPath)),
    )
    resetApiStateMock = vi.fn()

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original location
    ;(window as any).location = originalLocation
  })

  describe('createAuthFailureHandler', () => {
    it('should handle 401 errors and call onAuthFailure callback', () => {
      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(isAuthPageMock).toHaveBeenCalledWith('/dashboard')
      expect(onAuthFailureMock).toHaveBeenCalledWith('/dashboard')
    })

    it('should not handle non-401 errors', () => {
      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 500, data: undefined }
      handler(error)

      expect(isAuthPageMock).not.toHaveBeenCalled()
      expect(onAuthFailureMock).not.toHaveBeenCalled()
    })

    it('should skip redirect when on auth pages', () => {
      window.location.pathname = '/login'

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(isAuthPageMock).toHaveBeenCalledWith('/login')
      expect(onAuthFailureMock).not.toHaveBeenCalled()
    })

    it('should skip redirect when on signup page', () => {
      window.location.pathname = '/register'

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(onAuthFailureMock).not.toHaveBeenCalled()
    })

    it('should skip redirect when on forgot password page', () => {
      window.location.pathname = '/forgot-password'

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(onAuthFailureMock).not.toHaveBeenCalled()
    })

    it('should skip redirect when on OTP verification page', () => {
      window.location.pathname = '/auth/otp-verification'

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(onAuthFailureMock).not.toHaveBeenCalled()
    })

    it('should pass current path to onAuthFailure callback', () => {
      window.location.pathname = '/gallery/image/123'

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(onAuthFailureMock).toHaveBeenCalledWith('/gallery/image/123')
    })

    it('should call resetApiState callback if provided', () => {
      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
        resetApiState: resetApiStateMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(resetApiStateMock).toHaveBeenCalled()
      expect(onAuthFailureMock).toHaveBeenCalled()
    })

    it('should not fail if resetApiState is not provided', () => {
      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }

      expect(() => handler(error)).not.toThrow()
      expect(onAuthFailureMock).toHaveBeenCalled()
    })

    it('should handle resetApiState callback errors gracefully', () => {
      resetApiStateMock.mockImplementation(() => {
        throw new Error('Reset failed')
      })

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
        resetApiState: resetApiStateMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }

      expect(() => handler(error)).not.toThrow()
      expect(resetApiStateMock).toHaveBeenCalled()
      expect(onAuthFailureMock).toHaveBeenCalled()
    })

    it('should handle onAuthFailure callback errors gracefully', () => {
      onAuthFailureMock.mockImplementation(() => {
        throw new Error('Auth failure failed')
      })

      const handler = createAuthFailureHandler({
        onAuthFailure: onAuthFailureMock,
        isAuthPage: isAuthPageMock,
      })

      const error: FetchBaseQueryError = { status: 401, data: undefined }

      expect(() => handler(error)).not.toThrow()
      expect(onAuthFailureMock).toHaveBeenCalled()
    })
  })

  describe('auth page detection', () => {
    const authPages = [
      '/login',
      '/register',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/auth/otp-verification',
      '/auth/verify-email',
      '/auth/new-password',
    ]

    authPages.forEach(page => {
      it(`should skip redirect on ${page}`, () => {
        window.location.pathname = page

        const handler = createAuthFailureHandler({
          onAuthFailure: onAuthFailureMock,
          isAuthPage: isAuthPageMock,
        })

        const error: FetchBaseQueryError = { status: 401, data: undefined }
        handler(error)

        expect(onAuthFailureMock).not.toHaveBeenCalled()
      })
    })

    it('should redirect on non-auth pages', () => {
      const nonAuthPages = ['/dashboard', '/gallery', '/wishlist', '/settings', '/profile']

      nonAuthPages.forEach(page => {
        window.location.pathname = page
        vi.clearAllMocks()

        const handler = createAuthFailureHandler({
          onAuthFailure: onAuthFailureMock,
          isAuthPage: isAuthPageMock,
        })

        const error: FetchBaseQueryError = { status: 401, data: undefined }
        handler(error)

        expect(onAuthFailureMock).toHaveBeenCalledWith(page)
      })
    })
  })

  describe('AUTH_PAGES constant', () => {
    it('should export AUTH_PAGES for reference', () => {
      expect(AUTH_PAGES).toBeDefined()
      expect(Array.isArray(AUTH_PAGES)).toBe(true)
      expect(AUTH_PAGES.length).toBeGreaterThan(0)
    })

    it('should include all documented auth pages', () => {
      const expectedPages = [
        '/login',
        '/register',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/auth/otp-verification',
        '/auth/verify-email',
        '/auth/new-password',
      ]

      expectedPages.forEach(page => {
        expect(AUTH_PAGES).toContain(page)
      })
    })
  })
})
