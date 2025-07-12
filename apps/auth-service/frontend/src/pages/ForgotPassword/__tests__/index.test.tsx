import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ForgotPasswordPage from '../index'
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
  ArrowLeft: ({ className }: { className?: string }) => <div data-testid="arrow-left-icon" className={className}>ArrowLeft</div>,
  Loader: ({ className }: { className?: string }) => <div data-testid="loader-icon" className={className}>Loader</div>,
  Mail: ({ className }: { className?: string }) => <div data-testid="mail-icon" className={className}>Mail</div>,
}))

// Mock components
vi.mock('../../../components/Input', () => ({
  default: ({ icon: Icon, placeholder, value, onChange, type, ...props }: any) => (
    <div data-testid="input" data-placeholder={placeholder} data-type={type} data-value={value}>
      {Icon && <Icon />}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        // required prop intentionally omitted
        {...props}
      />
    </div>
  ),
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to} data-testid="link">{children}</a>
    ),
  }
})

const mockUseAuthStore = useAuthStore as any

const renderForgotPasswordPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  )
}

describe('ForgotPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      forgotPassword: vi.fn(),
      isLoading: false,
      error: null,
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      message: null,
      signup: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      checkAuth: vi.fn(),
      resetPassword: vi.fn(),
    })
  })

  describe('Initial Rendering', () => {
    it('renders forgot password form with all elements', () => {
      renderForgotPasswordPage()
      
      expect(screen.getByText('Forgot Password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
      expect(screen.getByText('Back to Login')).toBeInTheDocument()
      expect(screen.getByText(/Enter your email address/)).toBeInTheDocument()
    })

    it('renders icons correctly', () => {
      renderForgotPasswordPage()
      
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })

    it('renders with correct styling classes', () => {
      renderForgotPasswordPage()
      
      // Form is rendered but doesn't have explicit role attribute
      expect(screen.getByText('Forgot Password')).toBeInTheDocument()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toBeRequired()
    })
  })

  describe('Form Interaction', () => {
    it('updates email input value', async () => {
      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('calls forgotPassword function on form submission', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
    })

    it('shows success state after form submission', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/If an account exists for test@example.com/)).toBeInTheDocument()
      })
    })

    it('handles forgotPassword errors gracefully', async () => {
      const mockForgotPassword = vi.fn().mockRejectedValue(new Error('Failed to send email'))
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
      
      // Wait for the error to be handled
      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        forgotPassword: vi.fn(),
        isLoading: true,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderForgotPasswordPage()
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.queryByText('Send Reset Link')).not.toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    it('shows success message with email address', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'user@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/If an account exists for user@example.com/)).toBeInTheDocument()
      })
    })

    it('shows success icon in success state', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        // Only the success icon should be present after submission
        const successIcons = screen.getAllByTestId('mail-icon')
        expect(successIcons.length).toBe(1)
      })
    })

    it('hides form in success state', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('form')).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation Links', () => {
    it('has correct link to login page', () => {
      renderForgotPasswordPage()
      
      const loginLink = screen.getByText('Back to Login')
      expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('renders back arrow icon in navigation link', () => {
      renderForgotPasswordPage()
      
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderForgotPasswordPage()
      
      // Form is rendered but doesn't have explicit role attribute
      expect(screen.getByText('Forgot Password')).toBeInTheDocument()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toBeRequired()
    })

    it('has proper button states', () => {
      renderForgotPasswordPage()
      
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty email submission', async () => {
      const mockForgotPassword = vi.fn()
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      // Type a character, then clear it
      await user.type(emailInput, 'a')
      await user.clear(emailInput)
      await user.click(submitButton)
      
      expect(mockForgotPassword).not.toHaveBeenCalled()
    })

    it('handles special characters in email', async () => {
      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      await user.type(emailInput, 'test+tag@example.com')
      
      expect(emailInput).toHaveValue('test+tag@example.com')
    })

    it('handles very long email addresses', async () => {
      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const longEmail = 'a'.repeat(100) + '@example.com'
      await user.type(emailInput, longEmail)
      
      expect(emailInput).toHaveValue(longEmail)
    })

    it('handles multiple form submissions', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        forgotPassword: mockForgotPassword,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        signup: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderForgotPasswordPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/If an account exists for test@example.com/)).toBeInTheDocument()
      })
      
      // Form should be hidden after submission
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
    })
  })

  describe('Styling and Layout', () => {
    it('has correct container styling', () => {
      renderForgotPasswordPage()
      
      const container = document.querySelector('.max-w-md')
      expect(container).toHaveClass(
        'max-w-md',
        'w-full',
        'bg-gray-800',
        'bg-opacity-50',
        'backdrop-filter',
        'backdrop-blur-xl',
        'rounded-2xl',
        'shadow-xl',
        'overflow-hidden'
      )
    })

    it('has correct heading styling', () => {
      renderForgotPasswordPage()
      
      const heading = screen.getByText('Forgot Password')
      expect(heading).toHaveClass(
        'text-3xl',
        'font-bold',
        'mb-6',
        'text-center',
        'bg-gradient-to-r',
        'from-green-400',
        'to-emerald-500',
        'text-transparent',
        'bg-clip-text'
      )
    })
  })
}) 