import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { LoginPage } from '../LoginPage'
import { authSlice } from '@/store/slices/authSlice'

// Clear global mocks and set up local mocks
vi.unmock('@tanstack/react-router')
vi.unmock('@/services/auth/AuthProvider')
vi.unmock('@/components/Navigation/NavigationProvider')
vi.unmock('@/components/Layout/RootLayout')
vi.unmock('@repo/app-component-library')
vi.unmock('react-hook-form')
vi.unmock('@hookform/resolvers/zod')
vi.unmock('lucide-react')
vi.unmock('framer-motion')

// Mock TanStack Router
const mockNavigate = vi.fn()
const mockSearch: { redirect?: string } = {}
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}))

// Mock framer-motion to pass through props correctly
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      transition,
      whileHover,
      whileTap,
      variants,
      style,
      ...props
    }: any) => <div {...props}>{children}</div>,
    p: ({ children, initial, animate, transition, ...props }: any) => <p {...props}>{children}</p>,
  },
}))

// Mock AuthProvider
const mockSignIn = vi.fn()
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}))

// Mock NavigationProvider
const mockTrackNavigation = vi.fn()
vi.mock('@/components/Navigation/NavigationProvider', () => ({
  useNavigation: () => ({
    trackNavigation: mockTrackNavigation,
  }),
}))

// Note: LoginPage is a standalone page component that manages its own layout
// It's rendered directly by the router without an AuthLayout wrapper

// Mock @repo/ui components
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, disabled, type, className, asChild, ...props }: any) => {
    if (asChild) {
      return children
    }
    return (
      <button type={type} disabled={disabled} className={className} {...props}>
        {children}
      </button>
    )
  },
  Input: ({ id, type, placeholder, className, ...props }: any) => (
    <input id={id} type={type} placeholder={placeholder} className={className} {...props} />
  ),
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>
      {children}
    </label>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Alert: ({ children, variant, role, ...props }: any) => (
    <div role={role} data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => <span>{children}</span>,
  Checkbox: ({ id, ...props }: any) => <input type="checkbox" id={id} {...props} />,
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  Mail: () => <span data-testid="mail-icon">Mail</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
}))

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      },
    },
  })
}

const renderLoginPage = () => {
  const store = createMockStore()
  const user = userEvent.setup()

  render(
    <Provider store={store}>
      <LoginPage />
    </Provider>,
  )

  return { store, user }
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockReset()
    mockNavigate.mockReset()
    mockTrackNavigation.mockReset()
    // Reset search params
    mockSearch.redirect = undefined
  })

  describe('Rendering', () => {
    it('renders the login page container', () => {
      renderLoginPage()
      // LoginPage is a standalone component that manages its own centered layout
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })

    it('displays the login form title', () => {
      renderLoginPage()
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })

    it('displays the login form description', () => {
      renderLoginPage()
      expect(
        screen.getByText('Sign in to your account to continue building amazing MOCs'),
      ).toBeInTheDocument()
    })

    it('displays email input field with label', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    })

    it('displays password input field with label', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    })

    it('displays remember me checkbox', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Remember me')).toBeInTheDocument()
    })

    it('displays Sign In button', () => {
      renderLoginPage()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('displays forgot password link', () => {
      renderLoginPage()
      const link = screen.getByText('Forgot password?')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/forgot-password')
    })

    it('displays sign up link', () => {
      renderLoginPage()
      const link = screen.getByText('Sign up here')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/register')
    })

    it('displays back to home button', () => {
      renderLoginPage()
      const link = screen.getByText('Back to Home')
      expect(link).toHaveAttribute('href', '/')
    })

    it('displays LEGO MOC Hub branding', () => {
      renderLoginPage()
      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })
  })

  describe('Password Visibility Toggle', () => {
    it('password input is hidden by default', () => {
      renderLoginPage()
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('toggles password visibility when button is clicked', async () => {
      const { user } = renderLoginPage()

      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const toggleButton = screen.getByLabelText('Show password')

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)

      expect(passwordInput).toHaveAttribute('type', 'text')
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument()
    })

    it('hides password when toggle is clicked again', async () => {
      const { user } = renderLoginPage()

      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const toggleButton = screen.getByLabelText('Show password')

      await user.click(toggleButton)
      await user.click(screen.getByLabelText('Hide password'))

      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Validation', () => {
    it('shows email validation error for invalid email', async () => {
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      })
    })

    it('shows password validation error for short password', async () => {
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'short')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('does not submit form with empty fields', async () => {
      const { user } = renderLoginPage()

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      expect(mockSignIn).not.toHaveBeenCalled()
    })
  })

  describe('Successful Login', () => {
    it('calls signIn with correct credentials', async () => {
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'validPassword123',
        })
      })
    })

    it('navigates to dashboard on successful login', async () => {
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
      })
    })

    it('tracks login success navigation event', async () => {
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('login_success', {
          source: 'login_page',
          redirectTo: '/dashboard',
        })
      })
    })
  })

  describe('MFA Challenge Flow', () => {
    it('navigates to OTP page when MFA is required', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        requiresChallenge: true,
        challenge: { challengeName: 'SMS_MFA' },
      })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/otp-verification' })
      })
    })

    it('tracks MFA challenge navigation event', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        requiresChallenge: true,
        challenge: { challengeName: 'SOFTWARE_TOKEN_MFA' },
      })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('login_challenge_required', {
          source: 'login_page',
          challengeType: 'SOFTWARE_TOKEN_MFA',
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when login fails', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })
    })

    it('displays generic error when signIn throws', async () => {
      mockSignIn.mockRejectedValue(new Error('Network error'))
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument()
      })
    })

    it('tracks login error event', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('login_error', {
          source: 'login_page',
          error: 'Invalid credentials',
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('email input has aria-invalid attribute set up', () => {
      renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      // Initially should be false (no error)
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('password input has aria-invalid attribute set up', () => {
      renderLoginPage()

      const passwordInput = screen.getByPlaceholderText('Enter your password')
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('password toggle button has appropriate aria-label', () => {
      renderLoginPage()
      expect(screen.getByLabelText('Show password')).toBeInTheDocument()
    })

    it('error alert has role="alert" when displayed', async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: 'Login failed',
      })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('has aria-live region for error announcements', () => {
      renderLoginPage()
      // The aria-live region should always be present (even when empty)
      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('all form inputs have associated labels', () => {
      renderLoginPage()

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Remember me')).toBeInTheDocument()
    })
  })

  describe('Navigation Tracking', () => {
    it('tracks login attempt on form submit', async () => {
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('login_attempt', {
          source: 'login_page',
          timestamp: expect.any(Number),
        })
      })
    })

    it('tracks forgot password link click', async () => {
      const { user } = renderLoginPage()

      const forgotPasswordLink = screen.getByText('Forgot password?')
      await user.click(forgotPasswordLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('forgot_password_link', {
        source: 'login_page',
      })
    })

    it('tracks signup link click', async () => {
      const { user } = renderLoginPage()

      const signupLink = screen.getByText('Sign up here')
      await user.click(signupLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('signup_link', {
        source: 'login_page',
      })
    })

    it('tracks back to home link click', async () => {
      const { user } = renderLoginPage()

      const backToHomeLink = screen.getByText('Back to Home')
      await user.click(backToHomeLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('back_to_home', {
        source: 'login_page',
      })
    })
  })

  describe('Protected Route Redirect', () => {
    it('redirects to dashboard by default on successful login', async () => {
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
      })
    })

    it('redirects to specified URL from search params on successful login', async () => {
      mockSearch.redirect = '/wishlist'
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/wishlist' })
      })
    })

    it('tracks correct redirect URL in navigation event', async () => {
      mockSearch.redirect = '/instructions'
      mockSignIn.mockResolvedValue({ success: true })
      const { user } = renderLoginPage()

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('login_success', {
          source: 'login_page',
          redirectTo: '/instructions',
        })
      })
    })
  })
})
