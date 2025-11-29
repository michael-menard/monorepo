import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { Header } from '../Header'
import { authSlice } from '@/store/slices/authSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'
import { themeSlice } from '@/store/slices/themeSlice'
import { globalUISlice } from '@/store/slices/globalUISlice'

// Mock useAuth hook
const mockSignOut = vi.fn()
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}))

// Store type for tests
interface TestState {
  auth: ReturnType<typeof authSlice.getInitialState>
  navigation: ReturnType<typeof navigationSlice.getInitialState>
  theme: ReturnType<typeof themeSlice.getInitialState>
  globalUI: ReturnType<typeof globalUISlice.getInitialState>
}

const createTestStore = (preloadedState?: Partial<TestState>) =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer,
      theme: themeSlice.reducer,
      globalUI: globalUISlice.reducer,
    },
    preloadedState: preloadedState as TestState,
  })

const renderWithStore = (
  store: EnhancedStore<TestState>,
) => {
  return render(
    <Provider store={store}>
      <Header />
    </Provider>,
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('renders correctly', () => {
    it('should render the header element', () => {
      const store = createTestStore()
      renderWithStore(store)

      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('should have sticky positioning class', () => {
      const store = createTestStore()
      renderWithStore(store)

      const header = screen.getByRole('banner')
      expect(header.className).toContain('sticky')
      expect(header.className).toContain('top-0')
    })

    it('should render the logo text', () => {
      const store = createTestStore()
      renderWithStore(store)

      expect(screen.getByText('LEGO MOC Instructions')).toBeInTheDocument()
    })

    it('should render logo with link to home', () => {
      const store = createTestStore()
      renderWithStore(store)

      // Logo letter "L" should be present
      expect(screen.getByText('L')).toBeInTheDocument()
    })
  })

  describe('unauthenticated state', () => {
    it('should show Sign In button when not authenticated', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('should not show hamburger menu when not authenticated', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument()
    })

    it('should not show notifications bell when not authenticated', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.queryByTestId('bell-icon')).not.toBeInTheDocument()
    })
  })

  describe('authenticated state', () => {
    const authenticatedState: Partial<TestState> = {
      auth: {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
        tokens: { accessToken: 'token' },
        error: null,
      },
    }

    it('should show user avatar when authenticated', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      // Avatar component should render
      const avatarImage = screen.getByAltText('Test User')
      expect(avatarImage).toBeInTheDocument()
    })

    it('should show notifications bell when authenticated', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
    })

    it('should show hamburger menu button on mobile when authenticated', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByTestId('menu-icon')).toBeInTheDocument()
    })

    it('should show user initials in avatar fallback', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('T')).toBeInTheDocument()
    })

    it('should not show Sign In button when authenticated', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
    })
  })

  describe('theme toggle', () => {
    it('should render theme toggle button', () => {
      const store = createTestStore()
      renderWithStore(store)

      expect(screen.getByText('Toggle theme')).toBeInTheDocument()
    })

    it('should show moon icon when in dark mode', () => {
      const store = createTestStore({
        theme: {
          theme: 'dark',
          resolvedTheme: 'dark',
          systemTheme: 'light',
        },
      })
      renderWithStore(store)

      // Moon icon appears in toggle button AND in dropdown menu options
      const moonIcons = screen.getAllByTestId('moon-icon')
      expect(moonIcons.length).toBeGreaterThanOrEqual(1)
    })

    it('should show monitor icon when theme is system', () => {
      const store = createTestStore({
        theme: {
          theme: 'system',
          resolvedTheme: 'light',
          systemTheme: 'light',
        },
      })
      renderWithStore(store)

      // Monitor icon appears in toggle button AND in dropdown menu options
      const monitorIcons = screen.getAllByTestId('monitor-icon')
      expect(monitorIcons.length).toBeGreaterThanOrEqual(1)
    })

    it('should show theme options in dropdown', () => {
      const store = createTestStore()
      renderWithStore(store)

      // Theme options should be in the dropdown
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('should dispatch setTheme action when theme option is clicked', () => {
      const store = createTestStore({
        theme: {
          theme: 'light',
          resolvedTheme: 'light',
          systemTheme: 'light',
        },
      })
      renderWithStore(store)

      const darkOption = screen.getByText('Dark')
      fireEvent.click(darkOption)

      const state = store.getState()
      expect(state.theme.theme).toBe('dark')
    })
  })

  describe('user menu', () => {
    const authenticatedState: Partial<TestState> = {
      auth: {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        tokens: null,
        error: null,
      },
    }

    it('should show Dashboard link in user menu', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should show Settings link in user menu', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should show Sign out option in user menu', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByText('Sign out')).toBeInTheDocument()
    })

    it('should display user name and email in menu', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should call signOut when Sign out is clicked', () => {
      const store = createTestStore(authenticatedState)
      renderWithStore(store)

      const signOutButton = screen.getByText('Sign out')
      fireEvent.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('notifications', () => {
    it('should show notification count when there are notifications', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
        navigation: {
          ...navigationSlice.getInitialState(),
          notifications: [
            { itemId: 'gallery', count: 3, type: 'info' as const },
            { itemId: 'wishlist', count: 2, type: 'warning' as const },
          ],
        },
      })
      renderWithStore(store)

      // Total count should be 5
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should show 99+ when notification count exceeds 99', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
        navigation: {
          ...navigationSlice.getInitialState(),
          notifications: [{ itemId: 'gallery', count: 150, type: 'info' as const }],
        },
      })
      renderWithStore(store)

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should not show badge when no notifications', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
        navigation: {
          ...navigationSlice.getInitialState(),
          notifications: [],
        },
      })
      renderWithStore(store)

      // No notification badge should be present
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument()
    })
  })

  describe('mobile menu toggle', () => {
    it('should dispatch toggleSidebar when hamburger is clicked', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
        globalUI: {
          sidebar: { isOpen: false, isCollapsed: false },
          loading: { isNavigating: false, isPageLoading: false },
          modal: { activeModal: null, modalProps: {} },
        },
      })
      renderWithStore(store)

      // Verify sidebar starts closed
      expect(store.getState().globalUI.sidebar.isOpen).toBe(false)

      const menuButton = screen.getByTestId('menu-icon').closest('button')
      if (menuButton) {
        fireEvent.click(menuButton)
      }

      // Verify sidebar is now open after toggle
      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('should have accessible name for theme toggle', () => {
      const store = createTestStore()
      renderWithStore(store)

      expect(screen.getByText('Toggle theme')).toBeInTheDocument()
    })

    it('should have accessible name for mobile menu button', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Toggle navigation menu')).toBeInTheDocument()
    })

    it('should have accessible notification count in sr-only text', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          tokens: null,
          error: null,
        },
        navigation: {
          ...navigationSlice.getInitialState(),
          notifications: [{ itemId: 'gallery', count: 5, type: 'info' as const }],
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Notifications (5)')).toBeInTheDocument()
    })
  })
})
