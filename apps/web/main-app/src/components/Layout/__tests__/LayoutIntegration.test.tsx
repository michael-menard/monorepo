import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { vi, describe, it, expect } from 'vitest'
import { RootLayout } from '../RootLayout'
import { authSlice } from '@/store/slices/authSlice'
import { themeSlice } from '@/store/slices/themeSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'
import { globalUISlice } from '@/store/slices/globalUISlice'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
  Outlet: () => <div data-testid="outlet">Main Content</div>,
  Link: ({ to, children, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

// Test store setup
const createTestStore = (initialState = {}) => {
  const baseNavigationState = navigationSlice.getInitialState()
  const baseAuthState = authSlice.getInitialState()
  const baseThemeState = themeSlice.getInitialState()
  const baseGlobalUIState = globalUISlice.getInitialState()
  const defaultGlobalUIState = {
    ...baseGlobalUIState,
    sidebar: {
      ...baseGlobalUIState.sidebar,
      // For tests, start with sidebar closed so toggle behavior is observable
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
      theme: themeSlice.reducer,
      navigation: navigationSlice.reducer,
      globalUI: globalUISlice.reducer,
    },
    preloadedState: {
      auth: {
        ...baseAuthState,
        // In layout tests we want auth to be non-loading by default
        isLoading: false,
        ...overrides.auth,
      },
      theme: {
        ...baseThemeState,
        ...overrides.theme,
      },
      navigation: {
        ...baseNavigationState,
        ...overrides.navigation,
      },
      globalUI: {
        ...defaultGlobalUIState,
        ...overrides.globalUI,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState)
  return render(<Provider store={store}>{component}</Provider>)
}

describe.skip('Layout Integration', () => {
  describe('Loading State', () => {
    it('shows LEGO brick loading animation when auth is loading', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isLoading: true },
      })

      expect(screen.getByText('Building your LEGO MOC experience...')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated Layout', () => {
    it('shows minimal layout for unauthenticated users on non-public routes', () => {
      renderWithProviders(<RootLayout />)

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })
  })

  describe('Authenticated Layout', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    }

    it('renders full layout with header, sidebar, and footer for authenticated users', () => {
      renderWithProviders(<RootLayout />, authenticatedState)

      // Header should be present
      expect(screen.getByRole('link', { name: /LEGO MOC Instructions/i })).toBeInTheDocument()

      // Sidebar navigation should be present
      expect(screen.getAllByRole('link', { name: /Dashboard/i }).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: /^Gallery$/i }).length).toBeGreaterThan(0)

      // Main content should be present
      expect(screen.getByTestId('outlet')).toBeInTheDocument()
    })

    it('shows legacy navigation routes in sidebar', () => {
      renderWithProviders(<RootLayout />, authenticatedState)

      expect(screen.getByText('MOC Gallery')).toBeInTheDocument()
      expect(screen.getByText('Inspiration')).toBeInTheDocument()
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })

    it('handles mobile menu toggle correctly', async () => {
      const store = createTestStore(authenticatedState)
      render(
        <Provider store={store}>
          <RootLayout />
        </Provider>,
      )

      // Find and click mobile menu button
      const mobileMenuButton = screen.getByRole('button', {
        name: /toggle navigation menu/i,
      })
      fireEvent.click(mobileMenuButton)

      // Check if mobile menu state was updated via global UI slice
      const state = store.getState()
      expect(state.globalUI.sidebar.isOpen).toBe(true)
    })
  })

  describe('Responsive Behavior', () => {
    it('applies correct classes for desktop sidebar layout', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveClass('md:ml-64')
    })
  })

  describe('LEGO Design System Integration', () => {
    it('applies LEGO-inspired gradient backgrounds', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      const rootDiv = screen.getByTestId('outlet').closest('.min-h-screen')
      expect(rootDiv).toHaveClass('bg-gradient-to-br')
    })

    it('shows LEGO-inspired brand elements in sidebar', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      const brandLabels = screen.getAllByText('LEGO MOC Hub')
      expect(brandLabels.length).toBeGreaterThan(0)
    })
  })

  describe('Performance Optimization', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now()

      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA landmarks', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      expect(screen.getByRole('main')).toBeInTheDocument()
      const navigations = screen.getAllByRole('navigation')
      expect(navigations.length).toBeGreaterThan(0)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('supports keyboard navigation', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true },
      })

      const [dashboardElement] = screen.getAllByText('Dashboard')
      dashboardElement.focus()
      expect(dashboardElement).toHaveFocus()
    })
  })
})
