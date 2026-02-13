import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { useTokenRefresh } from '../useTokenRefresh'
import { authSlice } from '@/store/slices/authSlice'

// Mock dependencies
vi.mock('@repo/app-component-library', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@repo/auth-utils/jwt', () => ({
  isTokenExpired: vi.fn(),
}))

vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    refreshTokens: vi.fn(),
  })),
}))

import { useToast } from '@repo/app-component-library'
import { logger } from '@repo/logger'
import { isTokenExpired } from '@repo/auth-utils/jwt'
import { useAuth } from '@/services/auth/AuthProvider'

describe('useTokenRefresh', () => {
  let store: ReturnType<typeof configureStore>
  let mockRefreshTokens: ReturnType<typeof vi.fn>
  let mockToast: ReturnType<typeof vi.fn>

  const createMockStore = (authState: any) => {
    return configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      preloadedState: {
        auth: authState,
      },
    })
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    mockRefreshTokens = vi.fn()
    mockToast = vi.fn()

    vi.mocked(useAuth).mockReturnValue({
      refreshTokens: mockRefreshTokens,
    } as any)

    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should not run for unauthenticated users', () => {
      store = createMockStore({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      })

      renderHook(() => useTokenRefresh(), { wrapper })

      expect(mockRefreshTokens).not.toHaveBeenCalled()
    })

    it('should not run when tokens are missing', () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: null,
        error: null,
      })

      renderHook(() => useTokenRefresh(), { wrapper })

      expect(mockRefreshTokens).not.toHaveBeenCalled()
    })
  })

  describe('token expiry detection', () => {
    it('should check token expiry immediately on mount', () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(false)

      renderHook(() => useTokenRefresh(), { wrapper })

      expect(isTokenExpired).toHaveBeenCalledWith('valid-token', 300)
    })

    it('should trigger refresh when token expires within threshold', async () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'expiring-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(true)
      mockRefreshTokens.mockResolvedValue({
        accessToken: 'new-token',
        idToken: 'new-id-token',
      })

      renderHook(() => useTokenRefresh(), { wrapper })

      // Wait for async refresh to complete
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockRefreshTokens).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith('Token expiring soon, triggering refresh', {
        threshold: 300,
      })
      expect(logger.info).toHaveBeenCalledWith('Token refresh successful')
    })

    it('should not trigger refresh when token is still valid', () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(false)

      renderHook(() => useTokenRefresh(), { wrapper })

      expect(mockRefreshTokens).not.toHaveBeenCalled()
    })
  })

  describe('interval checking', () => {
    it('should check token expiry every minute', async () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(false)

      renderHook(() => useTokenRefresh(), { wrapper })

      // Initial check
      expect(isTokenExpired).toHaveBeenCalledTimes(1)

      // Advance 1 minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(isTokenExpired).toHaveBeenCalledTimes(2)

      // Advance another minute
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(isTokenExpired).toHaveBeenCalledTimes(3)
    })

    it('should trigger refresh on interval when token expires', async () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      })

      // Token is valid initially, then expires
      vi.mocked(isTokenExpired).mockReturnValueOnce(false).mockReturnValueOnce(true)
      mockRefreshTokens.mockResolvedValue({
        accessToken: 'new-token',
        idToken: 'new-id-token',
      })

      renderHook(() => useTokenRefresh(), { wrapper })

      // Initial check - token is valid
      expect(mockRefreshTokens).not.toHaveBeenCalled()

      // Advance 1 minute - token now expires
      await act(async () => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Wait for async operations
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockRefreshTokens).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should show toast notification when refresh fails', async () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'expiring-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(true)
      const error = new Error('Refresh failed')
      mockRefreshTokens.mockRejectedValue(error)

      renderHook(() => useTokenRefresh(), { wrapper })

      // Wait for async error handling
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Session Expired',
        description: 'Please sign in again.',
        variant: 'destructive',
      })

      expect(logger.error).toHaveBeenCalledWith('Token refresh failed in useTokenRefresh', {
        error,
      })
    })

    it('should handle refresh errors gracefully', async () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'expiring-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(true)
      mockRefreshTokens.mockRejectedValue(new Error('Network error'))

      const { unmount } = renderHook(() => useTokenRefresh(), { wrapper })

      // Wait for async error handling
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockToast).toHaveBeenCalled()

      // Should not throw error
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      store = createMockStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      })

      vi.mocked(isTokenExpired).mockReturnValue(false)

      const { unmount } = renderHook(() => useTokenRefresh(), { wrapper })

      // Initial check
      expect(isTokenExpired).toHaveBeenCalledTimes(1)

      unmount()

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Should not check again after unmount
      expect(isTokenExpired).toHaveBeenCalledTimes(1)
    })

    it('should clear interval when user logs out', () => {
      const initialState = {
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'valid-token', idToken: 'id-token' },
        error: null,
      }

      store = createMockStore(initialState)

      vi.mocked(isTokenExpired).mockReturnValue(false)

      const { rerender } = renderHook(() => useTokenRefresh(), { wrapper })

      // Initial check
      expect(isTokenExpired).toHaveBeenCalledTimes(1)

      // Update store to unauthenticated
      store = createMockStore({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      })

      rerender()

      // Advance time after logout
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Should not check again after logout
      expect(isTokenExpired).toHaveBeenCalledTimes(1)
    })
  })
})
