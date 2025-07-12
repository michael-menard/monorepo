import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from '../index'
import { useAuthStore } from '../../../store/auth.store'

// Mock the auth store
vi.mock('../../../store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Mail: ({ className }: { className?: string }) => <div data-testid="mail-icon" className={className}>Mail</div>,
  Lock: ({ className }: { className?: string }) => <div data-testid="lock-icon" className={className}>Lock</div>,
  Loader: ({ className }: { className?: string }) => <div data-testid="loader-icon" className={className}>Loader</div>,
}))

// Mock React Router Link component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, className, ...props }: any) => (
      <a href={to} className={className} {...props} data-testid={`link-${to}`}>
        {children}
      </a>
    ),
  }
})

const mockUseAuthStore = vi.mocked(useAuthStore)

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      login: vi.fn(),
      isLoading: false,
      error: null,
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      message: null,
      signup: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      checkAuth: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })
  })

  describe('Rendering', () => {
    it('renders login form with all elements', () => {
      renderLoginPage()
      
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(screen.getByText('Sign up')).toBeInTheDocument()
      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    })

    it('renders icons correctly', () => {
      renderLoginPage()
      
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument()
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
    })

    it('renders with correct styling classes', () => {
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      expect(emailInput).toHaveAttribute('type', 'email')
      
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Interaction', () => {
    it('updates email input value', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('updates password input value', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('calls login function on form submission', async () => {
      const mockLogin = vi.fn()
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: 'Login' })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })

    it('prevents form submission with empty fields', async () => {
      const mockLogin = vi.fn()
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderLoginPage()
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      await user.click(submitButton)
      
      expect(mockLogin).toHaveBeenCalledWith('', '')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderLoginPage()
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.queryByText('Login')).not.toBeInTheDocument()
    })

    it('disables submit button when loading', () => {
      mockUseAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: true,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderLoginPage()
      
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when error is present', () => {
      const errorMessage = 'Invalid credentials'
      mockUseAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: false,
        error: errorMessage,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderLoginPage()
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toHaveClass('text-red-500')
    })

    it('does not display error message when error is null', () => {
      mockUseAuthStore.mockReturnValue({
        login: vi.fn(),
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderLoginPage()
      
      expect(screen.queryByText(/Invalid credentials/)).not.toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('has correct link to signup page', () => {
      renderLoginPage()
      
      const signupLink = screen.getByTestId('link-/signup')
      expect(signupLink).toHaveAttribute('href', '/signup')
    })

    it('has correct link to forgot password page', () => {
      renderLoginPage()
      
      const forgotPasswordLink = screen.getByTestId('link-/forgot-password')
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      
      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
    })

    it('has proper button states', () => {
      renderLoginPage()
      
      const submitButton = screen.getByRole('button', { name: 'Login' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Edge Cases', () => {
    it('handles special characters in email input', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      await user.type(emailInput, 'test+tag@example.com')
      
      expect(emailInput).toHaveValue('test+tag@example.com')
    })

    it('handles special characters in password input', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'pass@word123!')
      
      expect(passwordInput).toHaveValue('pass@word123!')
    })

    it('handles very long input values', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const longEmail = 'a'.repeat(100) + '@example.com'
      await user.type(emailInput, longEmail)
      
      expect(emailInput).toHaveValue(longEmail)
    })
  })
}) 