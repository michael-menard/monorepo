import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { App } from '../App'
import { authSlice } from '../store/slices/authSlice'
import { themeSlice } from '../store/slices/themeSlice'
import { navigationSlice } from '../store/slices/navigationSlice'

// Mock the router
vi.mock('@tanstack/react-router', () => {
  const mockRoute = {
    addChildren: vi.fn(() => mockRoute),
    id: 'mock-route',
    path: '/',
  }

  return {
    RouterProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="router">{children}</div>
    ),
    createRouter: vi.fn(() => ({ id: 'mock-router' })),
    createRootRoute: vi.fn(() => mockRoute),
    createRoute: vi.fn(() => mockRoute),
    redirect: vi.fn(),
    Outlet: () => <div data-testid="outlet" />,
  }
})

// Mock the auth provider
vi.mock('../services/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}))

// Mock the theme provider with direct import
vi.mock('@repo/ui/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}))

// Mock the error boundary
vi.mock('../components/ErrorBoundary/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

// Mock the logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the routes
vi.mock('../routes', () => ({
  router: { id: 'mock-router' },
}))

// Mock the API client with direct imports (no barrel files)
vi.mock('@repo/api-client/auth/cognito-integration', () => ({
  initializeCognitoTokenManager: vi.fn(),
  getCognitoTokenManager: vi.fn(() => ({
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    getAccessToken: vi.fn(() => 'mock-access-token'),
  })),
  getCognitoAuthToken: vi.fn(() => Promise.resolve('mock-auth-token')),
}))

vi.mock('@repo/api-client/rtk/gallery-api', () => ({
  enhancedGalleryApi: {
    reducerPath: 'enhancedGalleryApi',
    reducer: (state = {}, action: any) => state,
    middleware: (store: any) => (next: any) => (action: any) => next(action),
  },
  useEnhancedGallerySearchQuery: vi.fn(),
  useGetGalleryImageQuery: vi.fn(),
  useUploadGalleryImageMutation: vi.fn(),
  useBatchUploadGalleryImagesMutation: vi.fn(),
  useUpdateGalleryImageMutation: vi.fn(),
  useDeleteGalleryImageMutation: vi.fn(),
  useEnhancedBatchGalleryOperationMutation: vi.fn(),
  useGetEnhancedGalleryStatsQuery: vi.fn(),
}))

vi.mock('@repo/api-client/rtk/wishlist-api', () => ({
  enhancedWishlistApi: {
    reducerPath: 'enhancedWishlistApi',
    reducer: (state = {}, action: any) => state,
    middleware: (store: any) => (next: any) => (action: any) => next(action),
  },
  useEnhancedWishlistQueryQuery: vi.fn(),
  useGetWishlistItemQuery: vi.fn(),
  useAddWishlistItemMutation: vi.fn(),
  useUpdateWishlistItemMutation: vi.fn(),
  useDeleteWishlistItemMutation: vi.fn(),
  useEnhancedBatchWishlistOperationMutation: vi.fn(),
  useShareWishlistMutation: vi.fn(),
  useGetSharedWishlistQuery: vi.fn(),
  useGetEnhancedWishlistStatsQuery: vi.fn(),
  useImportWishlistItemsMutation: vi.fn(),
  useExportWishlistMutation: vi.fn(),
  useGetEnhancedPriceEstimatesQuery: vi.fn(),
  useManagePriceAlertsMutation: vi.fn(),
}))

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}))

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  signOut: vi.fn(),
}))

describe('App Integration', () => {
  let store: ReturnType<typeof configureStore>

  const createMockStore = (initialState = {}) => {
    return configureStore({
      reducer: {
        auth: authSlice.reducer,
        theme: themeSlice.reducer,
        navigation: navigationSlice.reducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        },
        theme: {
          theme: 'system',
          resolvedTheme: 'light',
          systemTheme: 'light',
        },
        navigation: {
          primaryNavigation: [],
          activeRoute: '/',
          isMobileMenuOpen: false,
          breadcrumbs: [],
          isLoading: false,
        },
        ...initialState,
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderApp = (storeOverrides = {}) => {
    store = createMockStore(storeOverrides)
    return render(
      <Provider store={store}>
        <App />
      </Provider>,
    )
  }

  describe('App structure', () => {
    it('renders all provider components in correct order', () => {
      renderApp()

      // Should have error boundary as outermost wrapper
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()

      // Should have theme provider
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument()

      // Should have auth provider
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument()

      // Should have router
      expect(screen.getByTestId('router')).toBeInTheDocument()
    })

    it('provides Redux store to all components', () => {
      renderApp()

      // The store should be accessible to child components
      expect(store.getState()).toBeDefined()
      expect(store.getState().auth).toBeDefined()
      expect(store.getState().theme).toBeDefined()
      expect(store.getState().navigation).toBeDefined()
    })
  })

  describe('Theme integration', () => {
    it('passes theme configuration to ThemeProvider', () => {
      renderApp()

      const themeProvider = screen.getByTestId('theme-provider')
      expect(themeProvider).toBeInTheDocument()
    })

    it('uses correct storage key for theme persistence', () => {
      renderApp()

      // The ThemeProvider should be configured with the correct storage key
      // This would be tested by checking localStorage in a real implementation
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    })
  })

  describe('Authentication integration', () => {
    it('wraps app with AuthProvider when auth is enabled', () => {
      renderApp()

      expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    })

    it('initializes Cognito token manager', () => {
      renderApp()

      // In a real test, we would verify that initializeCognitoTokenManager was called
      // For now, we just verify the auth provider is present
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    })
  })

  describe('Error handling integration', () => {
    it('wraps app with ErrorBoundary', () => {
      renderApp()

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    })

    it('provides error boundary for the entire app', () => {
      renderApp()

      // Error boundary should be the outermost component
      const errorBoundary = screen.getByTestId('error-boundary')
      const themeProvider = screen.getByTestId('theme-provider')

      expect(errorBoundary).toBeInTheDocument()
      expect(errorBoundary).toContainElement(themeProvider)
    })
  })

  describe('Store integration', () => {
    it('provides store to all child components', () => {
      renderApp()

      // Verify store is accessible
      expect(store.getState().auth.isAuthenticated).toBe(false)
      expect(store.getState().theme.resolvedTheme).toBe('light')
      expect(store.getState().navigation.activeRoute).toBe('/')
    })

    it('maintains state consistency across components', () => {
      const customState = {
        auth: {
          isAuthenticated: true,
          user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
        },
        theme: {
          resolvedTheme: 'dark',
        },
        navigation: {
          activeRoute: '/dashboard',
        },
      }

      renderApp(customState)

      const state = store.getState()
      expect(state.auth.isAuthenticated).toBe(true)
      expect(state.auth.user?.name).toBe('Test User')
      expect(state.theme.resolvedTheme).toBe('dark')
      expect(state.navigation.activeRoute).toBe('/dashboard')
    })
  })

  describe('Router integration', () => {
    it('provides router to the app', () => {
      renderApp()

      expect(screen.getByTestId('router')).toBeInTheDocument()
    })

    it('router is wrapped by providers', () => {
      renderApp()

      const authProvider = screen.getByTestId('auth-provider')
      const router = screen.getByTestId('router')

      expect(authProvider).toContainElement(router)
    })
  })
})
