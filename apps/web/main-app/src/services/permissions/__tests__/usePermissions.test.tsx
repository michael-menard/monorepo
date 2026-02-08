import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { usePermissions, useHasFeature, useHasQuota, useIsAdmin, useTier } from '../usePermissions'
import { authSlice } from '@/store/slices/authSlice'
import { permissionsApi } from '@repo/api-client/rtk/permissions-api'

// Mock RTK Query hook
const mockUseGetPermissionsQuery = vi.fn()

vi.mock('@/store', () => ({
  useGetPermissionsQuery: (...args: unknown[]) => mockUseGetPermissionsQuery(...args),
}))

describe('usePermissions', () => {
  const createStore = (authState: any) => {
    return configureStore({
      reducer: {
        auth: authSlice.reducer,
        [permissionsApi.reducerPath]: permissionsApi.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(permissionsApi.middleware),
      preloadedState: {
        auth: authState,
      },
    })
  }

  const wrapper =
    (store: ReturnType<typeof createStore>) =>
    ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>

  const mockPermissions = {
    userId: 'user-123',
    tier: 'pro-tier' as const,
    isAdmin: false,
    isAdult: true,
    isSuspended: false,
    suspendedReason: null,
    features: ['moc', 'wishlist', 'profile', 'gallery', 'chat', 'reviews', 'user_discovery'] as const,
    quotas: {
      mocs: { current: 3, limit: 100, remaining: 97 },
      wishlists: { current: 1, limit: 20, remaining: 19 },
      galleries: { current: 5, limit: 20, remaining: 15 },
      setlists: { current: 0, limit: 0, remaining: 0 },
      storage: { current: 50, limit: 1000, remaining: 950 },
    },
    addons: [],
    chatHistoryDays: 30,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePermissions', () => {
    it('should skip fetching when not authenticated', () => {
      const store = createStore({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(mockUseGetPermissionsQuery).toHaveBeenCalledWith(undefined, { skip: true })
    })

    it('should fetch permissions when authenticated', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(mockUseGetPermissionsQuery).toHaveBeenCalledWith(undefined, { skip: false })
    })

    it('should return permissions data when loaded', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.permissions).toEqual(mockPermissions)
      expect(result.current.tier).toBe('pro-tier')
      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isSuspended).toBe(false)
    })

    it('should return loading state', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.permissions).toBeNull()
    })
  })

  describe('hasFeature', () => {
    it('should return true for available features', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('gallery')).toBe(true)
      expect(result.current.hasFeature('chat')).toBe(true)
      expect(result.current.hasFeature('wishlist')).toBe(true)
    })

    it('should return false for unavailable features', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('setlist')).toBe(false)
      expect(result.current.hasFeature('privacy_advanced')).toBe(false)
    })

    it('should return true for all features when admin', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: { ...mockPermissions, isAdmin: true, features: [] },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('setlist')).toBe(true)
      expect(result.current.hasFeature('privacy_advanced')).toBe(true)
    })

    it('should return false for all features when suspended', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: { ...mockPermissions, isSuspended: true },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('gallery')).toBe(false)
      expect(result.current.hasFeature('wishlist')).toBe(false)
    })

    it('should return false when permissions not loaded', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('gallery')).toBe(false)
    })
  })

  describe('hasQuota', () => {
    it('should return true when quota remaining', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasQuota('mocs')).toBe(true)
      expect(result.current.hasQuota('galleries')).toBe(true)
    })

    it('should return false when quota exhausted', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: {
          ...mockPermissions,
          quotas: {
            ...mockPermissions.quotas,
            mocs: { current: 100, limit: 100, remaining: 0 },
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasQuota('mocs')).toBe(false)
    })

    it('should return true for unlimited quota (null remaining)', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: {
          ...mockPermissions,
          quotas: {
            ...mockPermissions.quotas,
            setlists: { current: 100, limit: null, remaining: null },
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasQuota('setlists')).toBe(true)
    })

    it('should return true for all quotas when admin', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: {
          ...mockPermissions,
          isAdmin: true,
          quotas: {
            ...mockPermissions.quotas,
            mocs: { current: 100, limit: 100, remaining: 0 },
          },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasQuota('mocs')).toBe(true)
    })
  })

  describe('convenience hooks', () => {
    it('useHasFeature should return feature access', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useHasFeature('gallery'), { wrapper: wrapper(store) })

      expect(result.current).toBe(true)
    })

    it('useHasQuota should return quota availability', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useHasQuota('mocs'), { wrapper: wrapper(store) })

      expect(result.current).toBe(true)
    })

    it('useIsAdmin should return admin status', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: { ...mockPermissions, isAdmin: true },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useIsAdmin(), { wrapper: wrapper(store) })

      expect(result.current).toBe(true)
    })

    it('useTier should return user tier', () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      })

      mockUseGetPermissionsQuery.mockReturnValue({
        data: mockPermissions,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useTier(), { wrapper: wrapper(store) })

      expect(result.current).toBe('pro-tier')
    })
  })
})
