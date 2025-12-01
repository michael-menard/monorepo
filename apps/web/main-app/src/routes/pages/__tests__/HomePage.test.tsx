import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { HomePage } from '../HomePage'
import { authSlice } from '@/store/slices/authSlice'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}))

// Mock UI components
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  BookOpen: () => <span data-testid="book-open-icon">BookOpen</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
  Heart: () => <span data-testid="heart-icon">Heart</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  Star: () => <span data-testid="star-icon">Star</span>,
  Upload: () => <span data-testid="upload-icon">Upload</span>,
  User: () => <span data-testid="user-icon">User</span>,
  Users: () => <span data-testid="users-icon">Users</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}))

const createMockStore = (authState: any) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
    preloadedState: {
      auth: authState,
    },
  })
}

const renderWithProviders = (authState: any) => {
  const store = createMockStore(authState)

  return render(
    <Provider store={store}>
      <HomePage />
    </Provider>,
  )
}

describe('HomePage', () => {
  const mockUnauthenticatedState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    tokens: null,
    error: null,
  }

  const mockAuthenticatedState = {
    isAuthenticated: true,
    isLoading: false,
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
    },
    tokens: {
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
    },
    error: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unauthenticated User', () => {
    it('renders hero section with correct title and description', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
      expect(
        screen.getByText(/Discover, build, and share custom LEGO MOC instructions/),
      ).toBeInTheDocument()
    })

    it('shows unauthenticated call-to-action buttons', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
      expect(screen.queryByText('My Wishlist')).not.toBeInTheDocument()
    })

    it('does not show welcome message', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument()
    })

    it('shows login required for protected features', () => {
      renderWithProviders(mockUnauthenticatedState)

      const loginRequiredButtons = screen.getAllByText('Login Required')
      expect(loginRequiredButtons).toHaveLength(3) // Wishlist, Profile, Upload
    })

    it('shows Create Account button in CTA section', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Create Account')).toBeInTheDocument()
    })
  })

  describe('Authenticated User', () => {
    it('shows authenticated call-to-action buttons', () => {
      renderWithProviders(mockAuthenticatedState)

      expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
      expect(screen.getByText('My Wishlist')).toBeInTheDocument()
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument()
    })

    it('shows welcome message with user name', () => {
      renderWithProviders(mockAuthenticatedState)

      expect(screen.getByText(/Welcome back, Test User!/)).toBeInTheDocument()
      expect(screen.getAllByText('View Profile')).toHaveLength(2) // Welcome link + Feature button
    })

    it('enables all feature buttons for authenticated users', () => {
      renderWithProviders(mockAuthenticatedState)

      expect(screen.queryByText('Login Required')).not.toBeInTheDocument()
      expect(screen.getByText('Browse Gallery')).toBeInTheDocument()
      expect(screen.getByText('View Wishlist')).toBeInTheDocument()
      expect(screen.getAllByText('View Profile')).toHaveLength(2) // Welcome link + Feature button
      expect(screen.getByText('Upload MOC')).toBeInTheDocument()
    })

    it('does not show Create Account button in CTA section', () => {
      renderWithProviders(mockAuthenticatedState)

      expect(screen.queryByText('Create Account')).not.toBeInTheDocument()
    })
  })

  describe('Statistics Section', () => {
    it('displays all statistics with correct values', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('10,000+')).toBeInTheDocument()
      expect(screen.getByText('MOC Instructions')).toBeInTheDocument()
      expect(screen.getByText('5,000+')).toBeInTheDocument()
      expect(screen.getByText('Active Users')).toBeInTheDocument()
      expect(screen.getByText('50,000+')).toBeInTheDocument()
      expect(screen.getByText('Downloads')).toBeInTheDocument()
      expect(screen.getByText('4.8★')).toBeInTheDocument()
      expect(screen.getByText('Community Rating')).toBeInTheDocument()
    })

    it('displays all stat icons', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getAllByTestId('book-open-icon')).toHaveLength(2) // Stats + Features
      expect(screen.getAllByTestId('users-icon')).toHaveLength(2) // Stats + Benefits sections
      expect(screen.getByTestId('download-icon')).toBeInTheDocument()
      expect(screen.getByTestId('star-icon')).toBeInTheDocument()
    })
  })

  describe('Features Section', () => {
    it('displays all feature cards with correct titles', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Browse MOC Instructions')).toBeInTheDocument()
      expect(screen.getByText('Personal Wishlist')).toBeInTheDocument()
      expect(screen.getByText('User Profiles')).toBeInTheDocument()
      expect(screen.getByText('Share Your MOCs')).toBeInTheDocument()
    })

    it('displays feature descriptions', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(
        screen.getByText('Explore thousands of custom LEGO MOC instructions from the community'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Save your favorite MOCs and track your building progress'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Manage your profile, uploads, and building history'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Upload and share your own custom LEGO creations'),
      ).toBeInTheDocument()
    })

    it('displays all feature icons', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
      expect(screen.getAllByTestId('user-icon')).toHaveLength(3) // Hero CTA + Feature + Benefits sections
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument()
    })
  })

  describe('Benefits Section', () => {
    it('displays all benefits with correct titles', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Secure & Reliable')).toBeInTheDocument()
      expect(screen.getByText('Lightning Fast')).toBeInTheDocument()
      expect(screen.getByText('Community Driven')).toBeInTheDocument()
    })

    it('displays benefit descriptions', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(
        screen.getByText('Your MOCs and data are protected with enterprise-grade security'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Optimized performance for quick browsing and seamless building'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Join thousands of builders sharing their amazing creations'),
      ).toBeInTheDocument()
    })

    it('displays all benefit icons', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument()
      // Users icon appears in both stats and benefits sections
    })
  })

  describe('Call-to-Action Section', () => {
    it('displays CTA heading and description', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Ready to Start Building?')).toBeInTheDocument()
      expect(
        screen.getByText('Join our community and discover amazing LEGO MOCs today'),
      ).toBeInTheDocument()
    })

    it('displays Start Browsing button for all users', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Start Browsing')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('includes proper ARIA labels for disabled buttons', () => {
      renderWithProviders(mockUnauthenticatedState)

      const loginRequiredButtons = screen.getAllByText('Login Required')
      loginRequiredButtons.forEach(button => {
        expect(button).toHaveAttribute('disabled')
      })
    })

    it('includes proper ARIA labels for action buttons', () => {
      renderWithProviders(mockAuthenticatedState)

      expect(screen.getByLabelText('Browse Gallery')).toBeInTheDocument()
      expect(screen.getByLabelText('View Wishlist')).toBeInTheDocument()
      expect(screen.getByLabelText('View Profile')).toBeInTheDocument()
      expect(screen.getByLabelText('Upload MOC')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes for mobile-first design', () => {
      renderWithProviders(mockUnauthenticatedState)

      // Check for responsive grid classes
      const statsSection = screen.getByText('10,000+').closest('.grid')
      expect(statsSection).toHaveClass('grid-cols-2', 'md:grid-cols-4')

      // Check for responsive button layout
      const ctaButtons = screen.getByText('Browse MOCs').closest('.flex')
      expect(ctaButtons).toHaveClass('flex-col', 'sm:flex-row')
    })
  })
})
