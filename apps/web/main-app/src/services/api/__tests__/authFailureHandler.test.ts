/**
 * Tests for Auth Failure Handler
 * Story 1.29: Invalid Token Redirect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAuthFailureHandler,
  initializeAuthFailureHandler,
  getAuthFailureHandler,
} from '../authFailureHandler'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { AppDispatch, RootState } from '@/store'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock store slices
vi.mock('@/store/slices/authSlice', () => ({
  setUnauthenticated: vi.fn(() => ({ type: 'auth/setUnauthenticated' })),
}))

describe('authFailureHandler', () => {
  let mockDispatch: AppDispatch
  let mockGetState: () => RootState
  let mockStore: { dispatch: AppDispatch; getState: () => RootState }
  let originalLocation: Location

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

    // Create mock store
    mockDispatch = vi.fn()
    mockGetState = vi.fn(() => ({}) as RootState)
    mockStore = { dispatch: mockDispatch, getState: mockGetState }

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original location
    ;(window as any).location = originalLocation
  })

  describe('createAuthFailureHandler', () => {
    it('should handle 401 errors', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/setUnauthenticated' })
      expect(window.location.href).toBe('/login?redirect=%2Fdashboard&expired=true')
    })

    it('should not handle non-401 errors', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 500, data: undefined }
      handler(error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })

    it('should skip redirect when on auth pages', () => {
      window.location.pathname = '/login'
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })

    it('should skip redirect when on signup page', () => {
      window.location.pathname = '/register'
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })

    it('should skip redirect when on forgot password page', () => {
      window.location.pathname = '/forgot-password'
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })

    it('should skip redirect when on OTP verification page', () => {
      window.location.pathname = '/auth/otp-verification'
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).not.toHaveBeenCalled()
      expect(window.location.href).toBe('')
    })

    it('should include current path in redirect URL', () => {
      window.location.pathname = '/gallery/image/123'
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(window.location.href).toBe('/login?redirect=%2Fgallery%2Fimage%2F123&expired=true')
    })

    it('should clear auth state before redirecting', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = createAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'auth/setUnauthenticated' })
    })
  })

  describe('initializeAuthFailureHandler', () => {
    it('should initialize the handler with store', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = getAuthFailureHandler()

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should allow handler to access store after initialization', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = getAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).toHaveBeenCalled()
    })
  })

  describe('getAuthFailureHandler', () => {
    it('should return initialized handler after initialization', () => {
      initializeAuthFailureHandler(mockStore)
      const handler = getAuthFailureHandler()

      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler(error)

      expect(mockDispatch).toHaveBeenCalled()
    })

    it('should return handlers that delegate to the same underlying instance', () => {
      initializeAuthFailureHandler(mockStore)
      const handler1 = getAuthFailureHandler()
      const handler2 = getAuthFailureHandler()

      // Both handlers should be functions (implementation returns new wrapper each time
      // to solve initialization order issues - the singleton is the internal instance)
      expect(typeof handler1).toBe('function')
      expect(typeof handler2).toBe('function')

      // Both handlers should delegate to the same underlying behavior
      const error: FetchBaseQueryError = { status: 401, data: undefined }
      handler1(error)
      handler2(error)

      // If they share the same underlying instance, dispatch should be called twice
      expect(mockDispatch).toHaveBeenCalledTimes(2)
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
        initializeAuthFailureHandler(mockStore)
        const handler = createAuthFailureHandler()

        const error: FetchBaseQueryError = { status: 401, data: undefined }
        handler(error)

        expect(mockDispatch).not.toHaveBeenCalled()
        expect(window.location.href).toBe('')
      })
    })

    it('should redirect on non-auth pages', () => {
      const nonAuthPages = ['/dashboard', '/gallery', '/wishlist', '/settings', '/profile']

      nonAuthPages.forEach(page => {
        window.location.pathname = page
        window.location.href = ''
        vi.clearAllMocks()

        initializeAuthFailureHandler(mockStore)
        const handler = createAuthFailureHandler()

        const error: FetchBaseQueryError = { status: 401, data: undefined }
        handler(error)

        expect(mockDispatch).toHaveBeenCalled()
        expect(window.location.href).toContain('/login')
        expect(window.location.href).toContain('expired=true')
      })
    })
  })
})
