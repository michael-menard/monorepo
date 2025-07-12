import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'
import { useAuthStore } from '../store/auth.store'

// Mock the auth store
vi.mock('../store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

// Mock page components
vi.mock('../pages/SignUp', () => ({
  default: () => <div data-testid="signup-page">SignUp Page</div>,
}))

vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}))

vi.mock('../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}))

vi.mock('../pages/EmailVerification', () => ({
  default: () => <div data-testid="email-verification-page">Email Verification Page</div>,
}))

vi.mock('../pages/ForgotPassword', () => ({
  default: () => <div data-testid="forgot-password-page">Forgot Password Page</div>,
}))

vi.mock('../pages/ResetPassword', () => ({
  default: () => <div data-testid="reset-password-page">Reset Password Page</div>,
}))

const mockUseAuthStore = useAuthStore as any

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      isLoading: false,
      error: null,
      message: null,
      signup: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      checkAuth: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })
  })

  describe('Initial Loading State', () => {
    it('shows loading spinner when checking auth', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: true,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('calls checkAuth on mount', () => {
      const mockCheckAuth = vi.fn()
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: mockCheckAuth,
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      expect(mockCheckAuth).toHaveBeenCalled()
    })
  })

  describe('Authentication States', () => {
    it('redirects to login when not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      // Should show login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })

    it('shows dashboard when authenticated and verified', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          isVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      // Should show dashboard content
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    })

    it('redirects to email verification when authenticated but not verified', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          isVerified: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      // Should show email verification page
      expect(screen.getByTestId('email-verification-page')).toBeInTheDocument()
    })
  })

  describe('Route Protection', () => {
    it('protects dashboard route when not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      // Navigate to dashboard
      window.history.pushState({}, '', '/')
      renderApp()
      
      // Should show navigate component with login path
      const navigateElements = screen.getAllByTestId('navigate')
      const loginNavigate = navigateElements.find(el => el.getAttribute('data-to') === '/login')
      expect(loginNavigate).toBeInTheDocument()
    })

    it('allows access to public routes when not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      // Navigate to login page
      window.history.pushState({}, '', '/login')
      renderApp()
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('redirects authenticated users away from auth pages', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          isVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      // Try to navigate to login page
      window.history.pushState({}, '', '/login')
      renderApp()
      
      // Should show navigate component with dashboard path
      const navigateElements = screen.getAllByTestId('navigate')
      const dashboardNavigate = navigateElements.find(el => el.getAttribute('data-to') === '/')
      expect(dashboardNavigate).toBeInTheDocument()
    })
  })

  describe('UI Elements', () => {
    it('renders floating shapes', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      // Should have floating shapes (they have specific classes)
      const shapes = document.querySelectorAll('[class*="bg-green-500"], [class*="bg-emerald-500"], [class*="bg-lime-500"]')
      expect(shapes.length).toBeGreaterThan(0)
    })

    it('renders toaster component', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      expect(screen.getByTestId('toaster')).toBeInTheDocument()
    })

    it('has correct background styling', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: null,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      const mainContainer = document.querySelector('.min-h-screen')
      expect(mainContainer).toHaveClass(
        'min-h-screen',
        'bg-gradient-to-br',
        'from-gray-900',
        'via-green-900',
        'to-emerald-900'
      )
    })
  })

  describe('Error Handling', () => {
    it('handles authentication errors gracefully', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
        error: 'Authentication failed',
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderApp()
      
      // Should still render without crashing
      expect(screen.getByTestId('toaster')).toBeInTheDocument()
    })
  })
}) 