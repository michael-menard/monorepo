import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { AuthProvider } from '../AuthProvider'
import { authSlice, selectAuth } from '@/store/slices/authSlice'
// Import AuthProvider directly using relative path to avoid the global mock

// Unmock AuthProvider so we test the real implementation
vi.unmock('@/services/auth/AuthProvider')

// Mock Cognito integration
vi.mock('@repo/api-client/auth/cognito-integration', () => ({
  getCognitoTokenManager: vi.fn(() => null),
  initializeCognitoTokenManager: vi.fn(),
  getAuthMiddleware: vi.fn(),
}))

// Mock API clients
vi.mock('@repo/api-client/rtk/gallery-api', () => ({
  enhancedGalleryApi: {
    reducerPath: 'enhancedGalleryApi',
    reducer: (state = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (a: unknown) => next(a),
  },
}))

vi.mock('@repo/api-client/rtk/wishlist-api', () => ({
  enhancedWishlistApi: {
    reducerPath: 'enhancedWishlistApi',
    reducer: (state = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (a: unknown) => next(a),
  },
}))

vi.mock('@repo/api-client/rtk/dashboard-api', () => ({
  dashboardApi: {
    reducerPath: 'dashboardApi',
    reducer: (state = {}) => state,
    middleware: () => (next: (a: unknown) => unknown) => (a: unknown) => next(a),
  },
}))

// Mock Hub from aws-amplify/utils
vi.mock('aws-amplify/utils', () => ({
  Hub: {
    listen: vi.fn(() => vi.fn()),
  },
}))

describe('AuthProvider - checkAuthState Integration', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    vi.clearAllMocks()

    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
    })
  })

  it('should dispatch setAuthenticated when user is authenticated', async () => {
    // Mock authenticated user
    const mockUser = {
      userId: 'user-123',
      username: 'testuser',
      signInDetails: {
        loginId: 'test@example.com',
      },
    }

    const mockTokens = {
      accessToken: {
        toString: () => 'mock-access-token',
        payload: {
          'cognito:groups': ['user', 'admin'],
        },
      },
      idToken: {
        toString: () => 'mock-id-token',
      },
    }

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as any)
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: mockTokens as any,
    } as any)

    // Render AuthProvider - this triggers checkAuthState on mount
    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    // Wait for checkAuthState to complete
    await waitFor(() => {
      const state = store.getState()
      expect(selectAuth(state).isAuthenticated).toBe(true)
    })

    // Verify the state was updated correctly
    const finalState = store.getState()
    const auth = selectAuth(finalState)

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.isLoading).toBe(false)
    expect(auth.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'test@example.com',
      roles: ['user', 'admin'],
    })
    expect(auth.tokens?.accessToken).toBe('mock-access-token')
    expect(auth.tokens?.idToken).toBe('mock-id-token')
  })

  it('should dispatch setUnauthenticated when getCurrentUser fails', async () => {
    // Mock unauthenticated user
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'))
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: null } as any)

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      </Provider>,
    )

    // Wait for checkAuthState to complete
    await waitFor(() => {
      const state = store.getState()
      expect(selectAuth(state).isLoading).toBe(false)
    })

    // Verify the state was updated correctly
    const finalState = store.getState()
    const auth = selectAuth(finalState)

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isLoading).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.tokens).toBeNull()
  })
})
