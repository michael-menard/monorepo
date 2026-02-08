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
  },
}))

// Mock UI components
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon">ArrowRight</span>,
  LogIn: () => <span data-testid="login-icon">LogIn</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
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

  describe('Hero Section', () => {
    it('renders hero section with correct title', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Build Your')).toBeInTheDocument()
      expect(screen.getByText('LEGO Dreams')).toBeInTheDocument()
    })

    it('renders hero description', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(
        screen.getByText(/Discover, organize your custom LEGO MOCs instructions/),
      ).toBeInTheDocument()
    })

    it('renders Browse MOCs button', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
    })

    it('renders Login button', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByText('Login')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('Browse MOCs links to login when unauthenticated', () => {
      renderWithProviders(mockUnauthenticatedState)

      const browseMocsLink = screen.getByText('Browse MOCs').closest('a')
      expect(browseMocsLink).toHaveAttribute('href', '/login')
    })

    it('Browse MOCs links to gallery when authenticated', () => {
      renderWithProviders(mockAuthenticatedState)

      const browseMocsLink = screen.getByText('Browse MOCs').closest('a')
      expect(browseMocsLink).toHaveAttribute('href', '/gallery')
    })

    it('Login button links to login page', () => {
      renderWithProviders(mockUnauthenticatedState)

      const loginLink = screen.getByText('Login').closest('a')
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Icons', () => {
    it('renders Search icon in Browse MOCs button', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    it('renders ArrowRight icon in Browse MOCs button', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByTestId('arrow-right-icon')).toBeInTheDocument()
    })

    it('renders LogIn icon in Login button', () => {
      renderWithProviders(mockUnauthenticatedState)

      expect(screen.getByTestId('login-icon')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes for button layout', () => {
      renderWithProviders(mockUnauthenticatedState)

      const buttonContainer = screen.getByText('Browse MOCs').closest('.flex')
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row')
    })
  })
})
