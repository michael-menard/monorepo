import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { usePermissions, useHasFeature, useHasQuota, useIsAdmin, useTier } from '../usePermissions'
import { permissionsApi } from '@repo/api-client'

// Create a minimal authSlice for testing
const createAuthSlice = () => ({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    tokens: null,
    error: null,
  },
  reducers: {},
})

describe('usePermissions', () => {
  const createStore = (authState: any, preloadedData?: any) => {
    const store = configureStore({
      reducer: {
        auth: (state = authState) => state,
        [permissionsApi.reducerPath]: permissionsApi.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(permissionsApi.middleware),
    })

    // Preload RTK Query cache if data provided
    if (preloadedData) {
      store.dispatch(
        permissionsApi.util.upsertQueryData('getPermissions', undefined, preloadedData)
      )
    }

    return store
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

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.permissions).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('should return permissions data when loaded', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.permissions).toEqual(mockPermissions)
      })
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

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.permissions).toBeNull()
    })
  })

  describe('hasFeature', () => {
    it('should return true for available features', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasFeature('gallery')).toBe(true)
      })
      expect(result.current.hasFeature('chat')).toBe(true)
      expect(result.current.hasFeature('wishlist')).toBe(true)
    })

    it('should return false for unavailable features', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasFeature('setlist')).toBe(false)
      })
      expect(result.current.hasFeature('privacy_advanced')).toBe(false)
    })

    it('should return true for all features when admin', async () => {
      const adminPermissions = {
        ...mockPermissions,
        isAdmin: true,
        features: [],
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, adminPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasFeature('setlist')).toBe(true)
      })
      expect(result.current.hasFeature('privacy_advanced')).toBe(true)
    })

    it('should return false for all features when suspended', async () => {
      const suspendedPermissions = {
        ...mockPermissions,
        isSuspended: true,
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, suspendedPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasFeature('gallery')).toBe(false)
      })
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

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      expect(result.current.hasFeature('gallery')).toBe(false)
    })
  })

  describe('hasQuota', () => {
    it('should return true when quota remaining', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasQuota('mocs')).toBe(true)
      })
      expect(result.current.hasQuota('galleries')).toBe(true)
    })

    it('should return false when quota exhausted', async () => {
      const exhaustedQuotaPermissions = {
        ...mockPermissions,
        quotas: {
          ...mockPermissions.quotas,
          mocs: { current: 100, limit: 100, remaining: 0 },
        },
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, exhaustedQuotaPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasQuota('mocs')).toBe(false)
      })
    })

    it('should return true for unlimited quota (null remaining)', async () => {
      const unlimitedQuotaPermissions = {
        ...mockPermissions,
        quotas: {
          ...mockPermissions.quotas,
          setlists: { current: 100, limit: null, remaining: null },
        },
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, unlimitedQuotaPermissions)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasQuota('setlists')).toBe(true)
      })
    })

    it('should return true for all quotas when admin', async () => {
      const adminWithExhaustedQuota = {
        ...mockPermissions,
        isAdmin: true,
        quotas: {
          ...mockPermissions.quotas,
          mocs: { current: 100, limit: 100, remaining: 0 },
        },
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, adminWithExhaustedQuota)

      const { result } = renderHook(() => usePermissions(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasQuota('mocs')).toBe(true)
      })
    })
  })

  describe('convenience hooks', () => {
    it('useHasFeature should return feature access', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => useHasFeature('gallery'), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('useHasQuota should return quota availability', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => useHasQuota('mocs'), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('useIsAdmin should return admin status', async () => {
      const adminPermissions = {
        ...mockPermissions,
        isAdmin: true,
      }

      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'admin@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, adminPermissions)

      const { result } = renderHook(() => useIsAdmin(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('useTier should return user tier', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => useTier(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current).toBe('pro-tier')
      })
    })
  })
})
