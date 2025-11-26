import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { createMemoryHistory } from '@tanstack/react-router'
import { RootLayout } from '../RootLayout'
import { authSlice } from '@/store/slices/authSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock TanStack Router
const mockNavigate = jest.fn()
jest.mock('@tanstack/react-router', () => ({
  ...jest.requireActual('@tanstack/react-router'),
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
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
        ...initialState.auth,
      },
      navigation: {
        activeRoute: '/dashboard',
        isMobileMenuOpen: false,
        breadcrumbs: [],
        isLoading: false,
        primaryNavigation: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            href: '/dashboard',
            icon: 'LayoutDashboard',
          },
          {
            id: 'gallery',
            label: 'Gallery',
            href: '/gallery',
            icon: 'Images',
          },
        ],
        secondaryNavigation: [],
        contextualNavigation: [],
        search: {
          query: '',
          results: [],
          recentSearches: [],
          isSearching: false,
        },
        analytics: {
          totalClicks: 0,
          popularItems: [],
          recentlyVisited: [],
        },
        userPreferences: {
          favoriteItems: [],
          hiddenItems: [],
          customOrder: [],
          compactMode: false,
        },
        notifications: [],
        ...initialState.navigation,
      },
    },
  })
}

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState)
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('Layout Integration', () => {
  describe('Loading State', () => {
    it('shows LEGO brick loading animation when auth is loading', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isLoading: true }
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
      expect(screen.getByText('LEGO MOC Instructions')).toBeInTheDocument()
      
      // Sidebar navigation should be present
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Gallery')).toBeInTheDocument()
      
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
        </Provider>
      )
      
      // Find and click mobile menu button
      const mobileMenuButton = screen.getByLabelText('Toggle navigation menu')
      fireEvent.click(mobileMenuButton)
      
      // Check if mobile menu state was updated
      const state = store.getState()
      expect(state.navigation.isMobileMenuOpen).toBe(true)
    })
  })

  describe('Responsive Behavior', () => {
    it('applies correct classes for desktop sidebar layout', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true }
      })
      
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveClass('lg:ml-64')
    })
  })

  describe('LEGO Design System Integration', () => {
    it('applies LEGO-inspired gradient backgrounds', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true }
      })
      
      const rootDiv = screen.getByTestId('outlet').closest('.min-h-screen')
      expect(rootDiv).toHaveClass('bg-gradient-to-br')
    })

    it('shows LEGO-inspired brand elements in sidebar', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true }
      })
      
      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now()
      
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true }
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
        auth: { isAuthenticated: true }
      })
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })

    it('supports keyboard navigation', () => {
      renderWithProviders(<RootLayout />, {
        auth: { isAuthenticated: true }
      })
      
      const dashboardLink = screen.getByText('Dashboard')
      dashboardLink.focus()
      expect(dashboardLink).toHaveFocus()
    })
  })
})
