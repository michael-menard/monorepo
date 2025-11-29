import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { Footer } from '../Footer'
import { authSlice } from '@/store/slices/authSlice'
import { navigationSlice } from '@/store/slices/navigationSlice'
import { themeSlice } from '@/store/slices/themeSlice'
import { globalUISlice } from '@/store/slices/globalUISlice'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className} data-testid={`link-${to.replace(/\//g, '-').slice(1) || 'home'}`}>
      {children}
    </a>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}))

// Mock environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_APP_VERSION: '1.2.3',
      VITE_APP_ENVIRONMENT: 'test',
    },
  },
})

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

const renderWithStore = (store: EnhancedStore<TestState>) => {
  return render(
    <Provider store={store}>
      <Footer />
    </Provider>,
  )
}

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('should not render when user is not authenticated', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          tokens: null,
          error: null,
        },
      })
      const { container } = renderWithStore(store)

      expect(container.querySelector('footer')).not.toBeInTheDocument()
    })

    it('should render when user is authenticated', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })
  })

  describe('copyright (AC: 2)', () => {
    it('should display copyright text with current year', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      const currentYear = new Date().getFullYear()
      expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
      expect(screen.getByText(/LEGO MOC Instructions/)).toBeInTheDocument()
      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
    })
  })

  describe('version display (AC: 3)', () => {
    it('should display app version', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText(/Version/)).toBeInTheDocument()
    })

    it('should display environment info', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText(/Environment:/)).toBeInTheDocument()
    })
  })

  describe('legal links (AC: 4)', () => {
    it('should have Privacy Policy link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
      expect(screen.getByTestId('link-privacy')).toHaveAttribute('href', '/privacy')
    })

    it('should have Terms of Service link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Terms of Service')).toBeInTheDocument()
      expect(screen.getByTestId('link-terms')).toHaveAttribute('href', '/terms')
    })

    it('should have Cookie Policy link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Cookie Policy')).toBeInTheDocument()
      expect(screen.getByTestId('link-cookies')).toHaveAttribute('href', '/cookies')
    })
  })

  describe('quick links', () => {
    it('should have Gallery link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Gallery')).toBeInTheDocument()
      expect(screen.getByTestId('link-gallery')).toHaveAttribute('href', '/gallery')
    })

    it('should have Wishlist link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Wishlist')).toBeInTheDocument()
      expect(screen.getByTestId('link-wishlist')).toHaveAttribute('href', '/wishlist')
    })

    it('should have MOC Instructions link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('MOC Instructions')).toBeInTheDocument()
      expect(screen.getByTestId('link-instructions')).toHaveAttribute('href', '/instructions')
    })
  })

  describe('support links', () => {
    it('should have Help Center link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Help Center')).toBeInTheDocument()
      expect(screen.getByTestId('link-help')).toHaveAttribute('href', '/help')
    })

    it('should have Contact Us link', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Contact Us')).toBeInTheDocument()
      expect(screen.getByTestId('link-contact')).toHaveAttribute('href', '/contact')
    })
  })

  describe('responsive layout (AC: 5)', () => {
    it('should have grid layout classes for responsive design', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      const { container } = renderWithStore(store)

      // Check for responsive grid classes
      const gridElement = container.querySelector('.grid')
      expect(gridElement).toBeInTheDocument()
      expect(gridElement?.className).toContain('grid-cols-1')
      expect(gridElement?.className).toContain('md:grid-cols-4')
    })

    it('should have responsive flex layout for bottom bar', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      const { container } = renderWithStore(store)

      // Check for responsive flex classes in bottom bar
      const flexElement = container.querySelector('.flex-col.sm\\:flex-row')
      expect(flexElement).toBeInTheDocument()
    })
  })

  describe('branding', () => {
    it('should display brand name', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })

    it('should display brand description', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText(/Build, share, and discover/)).toBeInTheDocument()
    })
  })

  describe('section headings', () => {
    it('should have Quick Links heading', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Quick Links')).toBeInTheDocument()
    })

    it('should have Support heading', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('should have Legal heading', () => {
      const store = createTestStore({
        auth: {
          isAuthenticated: true,
          isLoading: false,
          user: { id: '1', email: 'test@test.com', name: 'Test User' },
          tokens: null,
          error: null,
        },
      })
      renderWithStore(store)

      expect(screen.getByText('Legal')).toBeInTheDocument()
    })
  })
})
