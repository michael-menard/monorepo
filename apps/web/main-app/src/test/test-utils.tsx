import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { router } from '../routes'
import { AuthProvider } from '../services/auth/AuthProvider'
import { NavigationProvider } from '../components/Navigation/NavigationProvider'
import { authSlice } from '../store/slices/authSlice'
import { navigationSlice } from '../store/slices/navigationSlice'

// Mock store configuration
export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer,
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

// Get the existing router
export const getMockRouter = () => router

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  initialState?: Record<string, unknown>
}

export function TestWrapper({ children, initialState = {} }: TestWrapperProps) {
  const store = createMockStore(initialState)

  return (
    <div data-testid="test-wrapper">
      <Provider store={store}>
        <AuthProvider>
          <NavigationProvider>
            <div data-testid="auth-layout">{children}</div>
          </NavigationProvider>
        </AuthProvider>
      </Provider>
    </div>
  )
}

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & {
    initialState?: Record<string, unknown>
  } = {},
) => {
  const { initialState, ...renderOptions } = options

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper initialState={initialState}>{children}</TestWrapper>
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
