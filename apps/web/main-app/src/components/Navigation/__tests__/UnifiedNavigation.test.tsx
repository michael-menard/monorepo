import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { UnifiedNavigation } from '../UnifiedNavigation'
import { NavigationProvider } from '../NavigationProvider'
import { authSlice } from '@/store/slices/authSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/' }),
  useRouter: () => ({ navigate: mockNavigate }),
  Link: ({ to, children, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

// Test store setup
interface TestStoreState {
  auth?: Partial<ReturnType<typeof authSlice.getInitialState>>
  navigation?: Partial<ReturnType<typeof navigationSlice.getInitialState>>
}

const createTestStore = (initialState: TestStoreState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      navigation: navigationSlice.reducer as any,
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
        activeRoute: '/',
        isMobileMenuOpen: false,
        breadcrumbs: [],
        isLoading: false,
        primaryNavigation: [],
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

const renderWithProviders = (component: React.ReactElement, initialState: TestStoreState = {}) => {
  const store = createTestStore(initialState)
  return render(
    <Provider store={store}>
      <NavigationProvider>{component}</NavigationProvider>
    </Provider>,
  )
}

describe.skip('UnifiedNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  describe('Unauthenticated State', () => {
    it('renders sign in and sign up buttons when not authenticated', () => {
      renderWithProviders(<UnifiedNavigation />)

      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    it('does not show private navigation links when not authenticated', () => {
      renderWithProviders(<UnifiedNavigation />)

      expect(screen.queryByText('Wishlist')).not.toBeInTheDocument()
    })

    it('shows public navigation links when not authenticated', () => {
      renderWithProviders(<UnifiedNavigation />)

      expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
      expect(screen.getByText('Inspiration')).toBeInTheDocument()
    })
  })

  describe('Authenticated State', () => {
    const authenticatedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      },
    }

    it('renders user avatar and menu when authenticated', () => {
      renderWithProviders(<UnifiedNavigation />, authenticatedState)

      expect(screen.getByLabelText('User menu')).toBeInTheDocument()
      expect(screen.getByText('JD')).toBeInTheDocument() // Avatar fallback
    })

    it('shows private navigation links when authenticated', () => {
      renderWithProviders(<UnifiedNavigation />, authenticatedState)

      expect(screen.getByText('Wishlist')).toBeInTheDocument()
    })

    it('opens user dropdown menu on click', async () => {
      renderWithProviders(<UnifiedNavigation />, authenticatedState)

      const userMenuButton = screen.getByLabelText('User menu')
      fireEvent.click(userMenuButton)

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('Account Settings')).toBeInTheDocument()
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })
    })

    it('handles logout correctly', async () => {
      renderWithProviders(<UnifiedNavigation />, authenticatedState)

      const userMenuButton = screen.getByLabelText('User menu')
      fireEvent.click(userMenuButton)

      await waitFor(() => {
        const logoutButton = screen.getByText('Logout')
        fireEvent.click(logoutButton)
      })

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  describe('Mobile Navigation', () => {
    it('shows mobile menu button', () => {
      renderWithProviders(<UnifiedNavigation />)

      expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument()
    })

    it('toggles mobile menu state on button click', () => {
      const store = createTestStore()
      render(
        <Provider store={store}>
          <NavigationProvider>
            <UnifiedNavigation />
          </NavigationProvider>
        </Provider>,
      )

      const mobileMenuButton = screen.getByLabelText('Toggle mobile menu')
      fireEvent.click(mobileMenuButton)

      // Check if the store state was updated
      const state = store.getState() as any
      expect(state.navigation.isMobileMenuOpen).toBe(true)
    })
  })

  describe('Navigation Analytics', () => {
    it('tracks navigation clicks', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      renderWithProviders(<UnifiedNavigation />)

      const browseLink = screen.getByText('Browse MOCs')
      fireEvent.click(browseLink)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Navigation Analytics:',
        expect.objectContaining({
          itemId: '/gallery',
          route: '/',
        }),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<UnifiedNavigation />)

      expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument()
    })

    it('supports keyboard navigation', () => {
      renderWithProviders(<UnifiedNavigation />)

      const browseLink = screen.getByText('Browse MOCs')
      browseLink.focus()
      expect(browseLink).toHaveFocus()
    })
  })
})
