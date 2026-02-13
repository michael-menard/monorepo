import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { getCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'

/**
 * BUGF-010 Fix: Hub.listen mocking in AuthProvider tests
 *
 * Root Cause: Global mock in setup.ts (lines 503-516) mocks the entire AuthProvider component,
 * preventing its useEffect (which calls Hub.listen) from executing in tests.
 *
 * Solution: Use vi.unmock() to opt-out of the global mock and test the real AuthProvider implementation.
 * This must be called BEFORE any imports to ensure the real component is used.
 */
vi.unmock('@/services/auth/AuthProvider')

// Mock Hub from aws-amplify/utils BEFORE importing AuthProvider
vi.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: vi.fn(() => vi.fn()),
  },
}))

// Import Hub and AuthProvider AFTER the mock is set up
import { Hub } from 'aws-amplify/utils'
import { authSlice } from '@/store/slices/authSlice'

import { AuthProvider } from '../AuthProvider'

vi.mock('@repo/api-client/auth/cognito-integration', () => ({
  initializeCognitoTokenManager: vi.fn(),
  getCognitoTokenManager: vi.fn(() => ({
    clearTokens: vi.fn(),
    setTokens: vi.fn(),
  })),
  getCognitoTokenMetrics: vi.fn(),
}))

vi.mock('@repo/api-client/auth/auth-middleware', () => ({
  getAuthMiddleware: vi.fn(),
}))

vi.mock('@repo/api-client/rtk/gallery-api', () => ({
  enhancedGalleryApi: {
    util: { resetApiState: vi.fn() },
  },
}))

vi.mock('@repo/api-client/rtk/wishlist-api', () => ({
  enhancedWishlistApi: {
    util: { resetApiState: vi.fn() },
  },
}))

vi.mock('@repo/api-client/rtk/dashboard-api', () => ({
  dashboardApi: {
    util: { resetApiState: vi.fn() },
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('AuthProvider Hub Event Listeners', () => {
  let store: ReturnType<typeof configureStore>
  let hubListenerCallback: ((data: { payload: { event: string } }) => void) | null = null
  let cleanupFunction: ReturnType<typeof vi.fn>

  beforeEach(() => {
    hubListenerCallback = null
    cleanupFunction = vi.fn()

    // Clear all mocks
    vi.clearAllMocks()

    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
    })

    // Mock getCurrentUser to reject (unauthenticated state for initial check)
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'))

    // Mock fetchAuthSession to resolve with no tokens
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: null } as any)

    // Mock Hub.listen to capture the callback
    vi.mocked(Hub.listen).mockImplementation((channel, callback) => {
      if (channel === 'auth') {
        hubListenerCallback = callback as typeof hubListenerCallback
      }
      return cleanupFunction as any
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should register Hub listener on mount', async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    // Wait for Hub.listen to be called (replaced arbitrary timeout with explicit assertion)
    await waitFor(() => expect(Hub.listen).toHaveBeenCalled())

    expect(Hub.listen).toHaveBeenCalledWith('auth', expect.any(Function))
  })

  it('should dispatch setUnauthenticated on signedOut event', async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'signedOut' } })

    await waitFor(() => {
      const state = store.getState() as { auth: { isAuthenticated: boolean } }
      expect(state.auth.isAuthenticated).toBe(false)
    })
  })

  it('should clear Cognito token manager on signedOut event', async () => {
    const mockClearTokens = vi.fn()
    vi.mocked(getCognitoTokenManager).mockReturnValue({
      clearTokens: mockClearTokens,
      setTokens: vi.fn(),
    } as any)

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'signedOut' } })

    await waitFor(() => {
      expect(mockClearTokens).toHaveBeenCalled()
    })
  })

  it('should dispatch updateTokens on tokenRefresh event', async () => {
    const mockTokens = {
      accessToken: { toString: () => 'new-access-token' },
      idToken: { toString: () => 'new-id-token' },
      refreshToken: { toString: () => 'new-refresh-token' },
    }

    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: mockTokens as any,
    } as any)

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'tokenRefresh' } })

    await waitFor(() => {
      const state = store.getState() as {
        auth: { tokens: { accessToken: string } | null }
      }
      expect(state.auth.tokens?.accessToken).toBe('new-access-token')
    })
  })

  it('should update Cognito token manager on tokenRefresh event', async () => {
    const mockSetTokens = vi.fn()
    vi.mocked(getCognitoTokenManager).mockReturnValue({
      clearTokens: vi.fn(),
      setTokens: mockSetTokens,
    } as any)

    const mockTokens = {
      accessToken: { toString: () => 'new-access-token' },
      idToken: { toString: () => 'new-id-token' },
      refreshToken: { toString: () => 'new-refresh-token' },
    }

    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: mockTokens as any,
    } as any)

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'tokenRefresh' } })

    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith({
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
      })
    })
  })

  it('should dispatch setUnauthenticated on tokenRefresh_failure event', async () => {
    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'tokenRefresh_failure' } })

    await waitFor(() => {
      const state = store.getState() as { auth: { isAuthenticated: boolean } }
      expect(state.auth.isAuthenticated).toBe(false)
    })
  })

  it('should handle tokenRefresh event when fetchAuthSession fails', async () => {
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('Session fetch failed'))

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    hubListenerCallback!({ payload: { event: 'tokenRefresh' } })

    // Wait for Hub.listen to be called (replaced arbitrary timeout with explicit assertion)
    await waitFor(() => expect(Hub.listen).toHaveBeenCalled())

    const state = store.getState() as { auth: { tokens: null } }
    expect(state.auth.tokens).toBeNull()
  })

  it('should cleanup Hub listener on unmount', async () => {
    const { unmount } = render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    await waitFor(() => {
      expect(hubListenerCallback).not.toBeNull()
    })

    unmount()

    expect(cleanupFunction).toHaveBeenCalled()
  })
})
