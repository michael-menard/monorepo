import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { authSlice } from '../../../store/slices/authSlice'
import { themeSlice } from '../../../store/slices/themeSlice'
import { navigationSlice } from '../../../store/slices/navigationSlice'
import { globalUISlice } from '../../../store/slices/globalUISlice'

// Mock TanStack Router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    Link: ({ children, to, className, ...props }: any) => (
      <a href={to} className={className} {...props}>
        {children}
      </a>
    ),
  }
})

// Mock the AuthProvider
vi.mock('../../../services/auth/AuthProvider', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}))

describe('Navigation Integration', () => {
  const createMockStore = (initialState = {}) => {
    const baseNavigationState = navigationSlice.getInitialState()
    const baseAuthState = authSlice.getInitialState()
    const baseThemeState = themeSlice.getInitialState()
    const baseGlobalUIState = globalUISlice.getInitialState()
    const defaultGlobalUIState = {
      ...baseGlobalUIState,
      sidebar: {
        ...baseGlobalUIState.sidebar,
        // Start closed so header toggle behavior is visible in tests
        isOpen: false,
      },
    }

    const overrides = initialState as {
      auth?: Partial<typeof baseAuthState>
      theme?: Partial<typeof baseThemeState>
      navigation?: Partial<typeof baseNavigationState>
      globalUI?: Partial<typeof defaultGlobalUIState>
    }

    return configureStore({
      reducer: {
        auth: authSlice.reducer,
        theme: themeSlice.reducer as any,
        navigation: navigationSlice.reducer,
        globalUI: globalUISlice.reducer,
      },
      preloadedState: {
        auth: {
          ...baseAuthState,
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          ...overrides.auth,
        },
        theme: {
          ...baseThemeState,
          theme: 'system',
          resolvedTheme: 'light',
          systemTheme: 'light',
          ...overrides.theme,
        },
        navigation: {
          ...baseNavigationState,
          primaryNavigation: [
            { id: 'home', label: 'Home', href: '/', icon: 'Home' },
            { id: 'gallery', label: 'Gallery', href: '/gallery', icon: 'Images' },
            { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: 'Heart' },
            {
              id: 'instructions',
              label: 'MOC Instructions',
              href: '/instructions',
              icon: 'BookOpen',
            },
            { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
          ],
          activeRoute: '/',
          isMobileMenuOpen: false,
          breadcrumbs: [],
          isLoading: false,
          ...overrides.navigation,
        },
        globalUI: {
          ...defaultGlobalUIState,
          ...overrides.globalUI,
        },
      },
    })
  }

  type TestStore = ReturnType<typeof createMockStore>
  let store: TestStore

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderNavigation = (storeOverrides = {}) => {
    store = createMockStore(storeOverrides)
    return render(
      <Provider store={store}>
        <div>
          <Header />
          <Sidebar />
        </div>
      </Provider>,
    )
  }

  describe('Header and Sidebar integration', () => {
    it('mobile menu button in header controls sidebar visibility', () => {
      renderNavigation()

      // Initially mobile sidebar should be closed
      expect(store.getState().globalUI.sidebar.isOpen).toBe(false)

      // Click mobile menu button in header
      const mobileMenuButton = screen.getByRole('button', { name: /toggle navigation menu/i })
      fireEvent.click(mobileMenuButton)

      // Mobile sidebar should now be open
      expect(store.getState().globalUI.sidebar.isOpen).toBe(true)
    })

    it('both header and sidebar show same navigation items', () => {
      renderNavigation()

      // Header should show user menu with dashboard link
      const userButton = screen.getByRole('button', { name: /test user/i })
      fireEvent.click(userButton)

      // Should have dashboard links in both header dropdown and sidebar (2 total)
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i })
      expect(dashboardLinks).toHaveLength(2)

      // Sidebar should show all navigation items
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
      // Use exact match for Gallery to avoid also matching "MOC Gallery"
      expect(screen.getByRole('link', { name: /^gallery$/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /wishlist/i })).toBeInTheDocument()
      // Use more specific selector for MOC Instructions to avoid matching the header logo
      expect(screen.getByRole('link', { name: /^moc instructions$/i })).toBeInTheDocument()
    })
  })

  describe('Active route synchronization', () => {
    it('updates active state when route changes', () => {
      renderNavigation({
        navigation: {
          primaryNavigation: [
            { id: 'home', label: 'Home', href: '/', icon: 'Home', isActive: false },
            { id: 'gallery', label: 'Gallery', href: '/gallery', icon: 'Images', isActive: true },
          ],
          activeRoute: '/gallery',
          isMobileMenuOpen: false,
          breadcrumbs: [],
          isLoading: false,
        },
      })

      // Gallery should be marked as active
      const state = store.getState()
      const galleryItem = state.navigation.primaryNavigation.find(item => item.id === 'gallery')
      const homeItem = state.navigation.primaryNavigation.find(item => item.id === 'home')

      expect(galleryItem?.isActive).toBe(true)
      expect(homeItem?.isActive).toBe(false)
    })
  })

  describe('Theme integration', () => {
    it('theme toggle in header updates global theme state', () => {
      renderNavigation()

      // Initially light theme
      expect((store.getState() as any).theme.resolvedTheme).toBe('light')

      // Open theme dropdown
      const themeButton = screen.getByRole('button', { name: /toggle theme/i })
      fireEvent.click(themeButton)

      // Select "Dark" theme from menu
      const darkOption = screen.getByText(/dark/i)
      fireEvent.click(darkOption)

      // Theme should change to dark
      expect((store.getState() as any).theme.theme).toBe('dark')
    })
  })

  describe('Navigation badges', () => {
    it('displays badges on navigation items', () => {
      renderNavigation({
        navigation: {
          primaryNavigation: [
            { id: 'home', label: 'Home', href: '/', icon: 'Home' },
            { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: 'Heart', badge: '3' },
          ],
          activeRoute: '/',
          isMobileMenuOpen: false,
          breadcrumbs: [],
          isLoading: false,
        },
      })

      // Wishlist should show badge
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Responsive behavior', () => {
    it('handles mobile menu state correctly', () => {
      renderNavigation({
        navigation: {
          primaryNavigation: [{ id: 'home', label: 'Home', href: '/', icon: 'Home' }],
          activeRoute: '/',
          isMobileMenuOpen: true,
          breadcrumbs: [],
          isLoading: false,
        },
      })

      // Mobile menu should be open
      expect(store.getState().navigation.isMobileMenuOpen).toBe(true)

      // Should show mobile menu button as active state
      const mobileMenuButton = screen.getByRole('button', { name: /toggle navigation menu/i })
      expect(mobileMenuButton).toBeInTheDocument()
    })
  })

  describe('User authentication integration', () => {
    it('shows different navigation based on auth state', () => {
      // Test unauthenticated state
      const unauthenticatedStore = createMockStore({
        auth: {
          isAuthenticated: false,
          user: null,
        },
      })

      render(
        <Provider store={unauthenticatedStore}>
          <Header />
        </Provider>,
      )

      // Should show sign in button instead of user menu
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /test user/i })).not.toBeInTheDocument()
    })
  })
})
