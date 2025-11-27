import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from '../routes'
import { AuthProvider } from '../services/auth/AuthProvider'
import { NavigationProvider } from '../components/Navigation/NavigationProvider'
import authSlice from '../store/slices/authSlice'
import navigationSlice from '../store/slices/navigationSlice'
import cacheSlice from '../store/slices/cacheSlice'

// Mock store configuration
export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      navigation: navigationSlice,
      cache: cacheSlice,
    },
    preloadedState: initialState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }),
  })
}

// Mock query client
export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Mock router
export const createMockRouter = () => {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    context: {
      auth: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      },
    },
  })
}

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  initialState?: any
  queryClient?: QueryClient
  router?: any
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialState = {},
  queryClient = createMockQueryClient(),
  router = createMockRouter(),
}) => {
  const store = createMockStore(initialState)

  return (
    <div data-testid="test-wrapper">
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationProvider>
              <div data-testid="auth-layout">{children}</div>
            </NavigationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </Provider>
    </div>
  )
}

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & {
    initialState?: any
    queryClient?: QueryClient
    router?: any
  } = {},
) => {
  const { initialState, queryClient, router, ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper initialState={initialState} queryClient={queryClient} router={router}>
      {children}
    </TestWrapper>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user data
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'light' as const,
    notifications: true,
  },
}

// Mock auth states
export const mockAuthStates = {
  authenticated: {
    auth: {
      isAuthenticated: true,
      user: mockUser,
      isLoading: false,
      error: null,
    },
  },
  unauthenticated: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    },
  },
  loading: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: true,
      error: null,
    },
  },
  error: {
    auth: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: 'Authentication failed',
    },
  },
}

// Mock navigation states
export const mockNavigationStates = {
  default: {
    navigation: {
      currentPath: '/',
      breadcrumbs: [],
      searchQuery: '',
      isSearchOpen: false,
      contextualNavigation: [],
      navigationHistory: [],
      preferences: {
        sidebarCollapsed: false,
        showBreadcrumbs: true,
      },
    },
  },
}

// Export everything for easy importing
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
