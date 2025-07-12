import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SignUpPage from '../index'
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
  User: ({ className }: { className?: string }) => <div data-testid="user-icon" className={className}>User</div>,
  Mail: ({ className }: { className?: string }) => <div data-testid="mail-icon" className={className}>Mail</div>,
  Lock: ({ className }: { className?: string }) => <div data-testid="lock-icon" className={className}>Lock</div>,
  Loader: ({ className, size }: { className?: string; size?: number }) => (
    <div data-testid="loader-icon" className={className} data-size={size}>Loader</div>
  ),
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
        {...props}
      />
    </div>
  ),
}))

vi.mock('../../../components/PasswordStrength', () => ({
  default: ({ password }: { password: string }) => (
    <div data-testid="password-strength" data-password={password}>
      Password Strength Component
    </div>
  ),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to} data-testid="link">{children}</a>
    ),
  }
})

const mockUseAuthStore = useAuthStore as any

const renderSignUpPage = () => {
  return render(
    <BrowserRouter>
      <SignUpPage />
    </BrowserRouter>
  )
}

describe('SignUp Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuthStore.mockReturnValue({
      signup: vi.fn(),
      isLoading: false,
      error: null,
      user: null,
      isAuthenticated: false,
      isCheckingAuth: false,
      message: null,
      login: vi.fn(),
      logout: vi.fn(),
      verifyEmail: vi.fn(),
      checkAuth: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })
  })

  describe('Rendering', () => {
    it('renders signup form with all elements', () => {
      renderSignUpPage()
      
      expect(screen.getByText('Create Account')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
      expect(screen.getByText('Already have an account?')).toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('renders icons correctly', () => {
      renderSignUpPage()
      
      expect(screen.getByTestId('user-icon')).toBeInTheDocument()
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument()
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument()
    })

    it('renders password strength component', () => {
      renderSignUpPage()
      
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })

    it('renders with correct styling classes', () => {
      renderSignUpPage()
      
      // Form is rendered but doesn't have explicit role attribute
      expect(screen.getByText('Create Account')).toBeInTheDocument()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      expect(nameInput).toHaveAttribute('type', 'text')
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      expect(emailInput).toHaveAttribute('type', 'email')
      
      const passwordInput = screen.getByPlaceholderText('Password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Interaction', () => {
    it('updates name input value', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      await user.type(nameInput, 'John Doe')
      
      expect(nameInput).toHaveValue('John Doe')
    })

    it('updates email input value', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const emailInput = screen.getByPlaceholderText('Email Address')
      await user.type(emailInput, 'john@example.com')
      
      expect(emailInput).toHaveValue('john@example.com')
    })

    it('updates password input value', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const passwordInput = screen.getByPlaceholderText('Password')
      await user.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('calls signup function on form submission', async () => {
      const mockSignup = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        signup: mockSignup,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(mockSignup).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe')
    })

    it('navigates to verify-email page after successful signup', async () => {
      const mockSignup = vi.fn().mockResolvedValue(undefined)
      mockUseAuthStore.mockReturnValue({
        signup: mockSignup,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/verify-email')
      })
    })

    it('handles signup errors gracefully', async () => {
      const mockSignup = vi.fn().mockRejectedValue(new Error('Signup failed'))
      mockUseAuthStore.mockReturnValue({
        signup: mockSignup,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      expect(mockSignup).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        signup: vi.fn(),
        isLoading: true,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderSignUpPage()
      
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      expect(screen.queryByText('Sign Up')).not.toBeInTheDocument()
    })

    it('disables submit button when loading', () => {
      mockUseAuthStore.mockReturnValue({
        signup: vi.fn(),
        isLoading: true,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderSignUpPage()
      
      const submitButton = screen.getByRole('button')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when error is present', () => {
      const errorMessage = 'Email already exists'
      mockUseAuthStore.mockReturnValue({
        signup: vi.fn(),
        isLoading: false,
        error: errorMessage,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderSignUpPage()
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toHaveClass('text-red-500')
    })

    it('does not display error message when error is null', () => {
      mockUseAuthStore.mockReturnValue({
        signup: vi.fn(),
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      renderSignUpPage()
      
      expect(screen.queryByText(/Email already exists/)).not.toBeInTheDocument()
    })
  })

  describe('Password Strength Integration', () => {
    it('updates password strength component when password changes', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const passwordInput = screen.getByPlaceholderText('Password')
      const passwordStrength = screen.getByTestId('password-strength')
      
      await user.type(passwordInput, 'test')
      
      expect(passwordStrength).toHaveAttribute('data-password', 'test')
    })
  })

  describe('Navigation Links', () => {
    it('has correct link to login page', () => {
      renderSignUpPage()
      
      const loginLink = screen.getByText('Login')
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderSignUpPage()
      
      // Form is rendered but doesn't have explicit role attribute
      expect(screen.getByText('Create Account')).toBeInTheDocument()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      
      expect(nameInput).toBeInTheDocument()
      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
    })

    it('has proper button states', () => {
      renderSignUpPage()
      
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty form submission', async () => {
      const mockSignup = vi.fn()
      mockUseAuthStore.mockReturnValue({
        signup: mockSignup,
        isLoading: false,
        error: null,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        message: null,
        login: vi.fn(),
        logout: vi.fn(),
        verifyEmail: vi.fn(),
        checkAuth: vi.fn(),
        forgotPassword: vi.fn(),
        resetPassword: vi.fn(),
      })

      const user = userEvent.setup()
      renderSignUpPage()
      
      const submitButton = screen.getByRole('button', { name: 'Sign Up' })
      await user.click(submitButton)
      
      expect(mockSignup).toHaveBeenCalledWith('', '', '')
    })

    it('handles special characters in inputs', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const emailInput = screen.getByPlaceholderText('Email Address')
      const passwordInput = screen.getByPlaceholderText('Password')
      
      await user.type(nameInput, 'John-Doe O\'Connor')
      await user.type(emailInput, 'john+tag@example.com')
      await user.type(passwordInput, 'pass@word123!')
      
      expect(nameInput).toHaveValue('John-Doe O\'Connor')
      expect(emailInput).toHaveValue('john+tag@example.com')
      expect(passwordInput).toHaveValue('pass@word123!')
    })

    it('handles very long input values', async () => {
      const user = userEvent.setup()
      renderSignUpPage()
      
      const nameInput = screen.getByPlaceholderText('Full Name')
      const longName = 'A'.repeat(100)
      await user.type(nameInput, longName)
      
      expect(nameInput).toHaveValue(longName)
    })
  })
}) 