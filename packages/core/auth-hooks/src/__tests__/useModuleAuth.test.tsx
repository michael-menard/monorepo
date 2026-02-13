import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { useModuleAuth } from '../useModuleAuth'
import { permissionsApi } from '@repo/api-client'

describe('useModuleAuth', () => {
  const createStore = (authState: any, preloadedData?: any) => {
    const store = configureStore({
      reducer: {
        auth: (state = authState) => state,
        [permissionsApi.reducerPath]: permissionsApi.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(permissionsApi.middleware),
    })

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
    // Clear mocks if any
  })

  it('should return hasAccess true for authenticated user', async () => {
    const store = createStore({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token' },
      error: null,
    }, mockPermissions)

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(true)
    })
  })

  it('should return hasAccess false for unauthenticated user', () => {
    const store = createStore({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    })

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    expect(result.current.hasAccess).toBe(false)
  })

  it('should return hasAccess false for suspended user', async () => {
    const suspendedPermissions = {
      ...mockPermissions,
      isSuspended: true,
      suspendedReason: 'violation',
    }

    const store = createStore({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token' },
      error: null,
    }, suspendedPermissions)

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(false)
    })
  })

  it('should return all permissions true for admin user', async () => {
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

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.hasAccess).toBe(true)
    })
    expect(result.current.canEdit).toBe(true)
    expect(result.current.canDelete).toBe(true)
    expect(result.current.isAdmin).toBe(true)
  })

  it('should return canEdit true for normal user', async () => {
    const store = createStore({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token' },
      error: null,
    }, mockPermissions)

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.canEdit).toBe(true)
    })
  })

  it('should return canDelete false for normal user', async () => {
    const store = createStore({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token' },
      error: null,
    }, mockPermissions)

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.canDelete).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should check common permissions', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasPermission('view')).toBe(true)
      })
      expect(result.current.hasPermission('edit')).toBe(true)
      expect(result.current.hasPermission('delete')).toBe(false)
      expect(result.current.hasPermission('admin')).toBe(false)
    })

    it('should check feature-based permissions', async () => {
      const store = createStore({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com' },
        tokens: { accessToken: 'token' },
        error: null,
      }, mockPermissions)

      const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasPermission('gallery')).toBe(true)
      })
      expect(result.current.hasPermission('chat')).toBe(true)
      expect(result.current.hasPermission('setlist')).toBe(false)
    })

    it('should return true for all permissions when admin', async () => {
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

      const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

      await waitFor(() => {
        expect(result.current.hasPermission('view')).toBe(true)
      })
      expect(result.current.hasPermission('edit')).toBe(true)
      expect(result.current.hasPermission('delete')).toBe(true)
      expect(result.current.hasPermission('admin')).toBe(true)
      expect(result.current.hasPermission('setlist')).toBe(true)
    })
  })

  it('should provide refreshAuth function', async () => {
    const store = createStore({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token' },
      error: null,
    }, mockPermissions)

    const { result } = renderHook(() => useModuleAuth(), { wrapper: wrapper(store) })

    await waitFor(() => {
      expect(result.current.refreshAuth).toBeDefined()
    })
    expect(typeof result.current.refreshAuth).toBe('function')
  })
})
