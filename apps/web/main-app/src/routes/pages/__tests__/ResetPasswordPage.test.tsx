import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResetPasswordPage } from '../ResetPasswordPage'

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
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    navigate: mockNavigate,
  }),
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
const mockConfirmResetPassword = vi.fn()
const mockForgotPassword = vi.fn()
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: () => ({
    confirmResetPassword: mockConfirmResetPassword,
    forgotPassword: mockForgotPassword,
    isLoading: false,
  }),
}))

// Mock NavigationProvider
const mockTrackNavigation = vi.fn()
const mockNavigationContext = {
  trackNavigation: mockTrackNavigation,
}
vi.mock('@/components/Navigation/NavigationProvider', () => ({
  useNavigation: () => mockNavigationContext,
  useNavigationOptional: () => mockNavigationContext,
}))

// Mock AuthLayout
vi.mock('@/components/Layout/RootLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}))

// Mock OTPInput component
vi.mock('@/components/Auth/OTPInput', () => ({
  OTPInput: ({ value, onChange, disabled, error, ...props }: any) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      data-error={error}
      data-testid="otp-input"
      maxLength={6}
      {...props}
    />
  ),
}))

// Mock @repo/ui components - consolidated into a single mock
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, disabled, type, className, asChild, variant, ...props }: any) => {
    if (asChild) {
      return children
    }
    return (
      <button
        type={type}
        disabled={disabled}
        className={className}
        data-variant={variant}
        {...props}
      >
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
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="mail-icon">Mail</span>,
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  KeyRound: () => <span data-testid="key-round-icon">KeyRound</span>,
}))

const renderResetPasswordPage = () => {
  const user = userEvent.setup()
  render(<ResetPasswordPage />)
  return { user }
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirmResetPassword.mockReset()
    mockForgotPassword.mockReset()
    mockNavigate.mockReset()
    mockTrackNavigation.mockReset()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe('Rendering', () => {
    it('renders within AuthLayout', () => {
      renderResetPasswordPage()
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    })

    it('renders reset password form', () => {
      renderResetPasswordPage()

      expect(screen.getByRole('heading', { name: /Reset Your Password/i })).toBeInTheDocument()
      expect(screen.getByText(/Enter the code from your email/)).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('otp-input')).toBeInTheDocument()
      expect(screen.getByTestId('new-password-input')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('displays LEGO MOC Hub branding', () => {
      renderResetPasswordPage()
      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })

    it('has navigation links to login and forgot password pages', () => {
      renderResetPasswordPage()

      expect(screen.getByText('Sign in here')).toHaveAttribute('href', '/login')
      expect(screen.getByText('Request new code')).toHaveAttribute('href', '/forgot-password')
    })

    it('has back to home button', () => {
      renderResetPasswordPage()

      const backButton = screen.getByRole('link', { name: /Back to Home/i })
      expect(backButton).toHaveAttribute('href', '/')
    })

    it('has resend code button', () => {
      renderResetPasswordPage()

      expect(screen.getByTestId('resend-code-button')).toBeInTheDocument()
      expect(screen.getByText(/Didn't receive the code\?/)).toBeInTheDocument()
    })

    it('pre-fills email from sessionStorage', () => {
      sessionStorage.setItem('pendingResetEmail', 'prefilled@example.com')
      renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveValue('prefilled@example.com')
    })
  })

  describe('Form Validation', () => {
    it('shows validation error for invalid email', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent(
          'Please enter a valid email address',
        )
      })
    })

    it('shows validation error for invalid code length', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123') // Too short

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('code-error')).toHaveTextContent(
          'Verification code must be 6 digits',
        )
      })
    })

    it('shows validation error for weak password', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'weak')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'weak')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('new-password-error')).toHaveTextContent(
          'Password must be at least 8 characters',
        )
      })
    })

    it('shows validation error when passwords do not match', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'DifferentPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent(
          'Passwords do not match',
        )
      })
    })

    it('validates password requirements', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      // Password without uppercase
      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'validpass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'validpass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('new-password-error')).toHaveTextContent(
          'Password must contain at least one uppercase letter',
        )
      })
    })
  })

  describe('Password Strength Indicator', () => {
    it('shows password strength indicator when password is entered', async () => {
      const { user } = renderResetPasswordPage()

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'Test')

      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument()
        expect(screen.getByText(/Password strength:/)).toBeInTheDocument()
      })
    })

    it('does not show password strength indicator when password is empty', () => {
      renderResetPasswordPage()

      expect(screen.queryByTestId('password-strength-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Successful Submission', () => {
    it('submits form successfully and shows success message', async () => {
      mockConfirmResetPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockConfirmResetPassword).toHaveBeenCalledWith(
          'test@example.com',
          '123456',
          'ValidPass1!',
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Password Reset Complete!')).toBeInTheDocument()
        expect(screen.getByTestId('go-to-login-button')).toBeInTheDocument()
      })
    })

    it('clears sessionStorage on success', async () => {
      sessionStorage.setItem('pendingResetEmail', 'test@example.com')
      mockConfirmResetPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(sessionStorage.getItem('pendingResetEmail')).toBeNull()
      })
    })

    it('navigates to login when go to login button is clicked', async () => {
      mockConfirmResetPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('go-to-login-button')).toBeInTheDocument()
      })

      const goToLoginButton = screen.getByTestId('go-to-login-button')
      await user.click(goToLoginButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
    })

    it('tracks reset password success event', async () => {
      mockConfirmResetPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('reset_password_success', {
          source: 'reset_password_page',
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error for CodeMismatchException', async () => {
      mockConfirmResetPassword.mockResolvedValue({
        success: false,
        error: 'Invalid verification code. Please check and try again.',
      })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/Invalid verification code/).length).toBeGreaterThan(0)
      })
    })

    it('shows error for ExpiredCodeException', async () => {
      mockConfirmResetPassword.mockResolvedValue({
        success: false,
        error: 'This code has expired. Please request a new one.',
      })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/This code has expired/).length).toBeGreaterThan(0)
      })
    })

    it('shows generic error for unexpected failures', async () => {
      mockConfirmResetPassword.mockRejectedValue(new Error('Unexpected error'))
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/Failed to reset password/).length).toBeGreaterThan(0)
      })
    })

    it('tracks reset password error event', async () => {
      mockConfirmResetPassword.mockResolvedValue({
        success: false,
        error: 'Some error',
      })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('reset_password_error', {
          source: 'reset_password_page',
          error: 'Some error',
        })
      })
    })
  })

  describe('Resend Code', () => {
    it('resends code when resend button is clicked', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const resendButton = screen.getByTestId('resend-code-button')
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
      })

      await waitFor(() => {
        expect(screen.getByTestId('resend-success-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/A new verification code has been sent/).length).toBeGreaterThan(
          0,
        )
      })
    })

    it('shows error when email is empty and resend is clicked', async () => {
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.clear(emailInput)

      const resendButton = screen.getByTestId('resend-code-button')
      await user.click(resendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/Please enter your email address first/).length).toBeGreaterThan(
          0,
        )
      })
    })

    it('shows error when resend fails', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
      })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const resendButton = screen.getByTestId('resend-code-button')
      await user.click(resendButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        expect(screen.getAllByText(/Rate limit exceeded/).length).toBeGreaterThan(0)
      })
    })

    it('tracks resend code event', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const resendButton = screen.getByTestId('resend-code-button')
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('reset_password_resend_code', {
          source: 'reset_password_page',
        })
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('toggles new password visibility', async () => {
      const { user } = renderResetPasswordPage()

      const passwordInput = screen.getByTestId('new-password-input')
      expect(passwordInput).toHaveAttribute('type', 'password')

      const toggleButton = screen.getByTestId('toggle-password-visibility')
      await user.click(toggleButton)

      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)

      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('toggles confirm password visibility', async () => {
      const { user } = renderResetPasswordPage()

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      const toggleButton = screen.getByTestId('toggle-confirm-password-visibility')
      await user.click(toggleButton)

      expect(confirmPasswordInput).toHaveAttribute('type', 'text')
    })
  })

  describe('Loading State', () => {
    it('disables submit button during submission', async () => {
      mockConfirmResetPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)),
      )
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Resetting Password...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible form with ARIA attributes', () => {
      renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')

      const passwordInput = screen.getByTestId('new-password-input')
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password')
    })

    it('has aria-live region for screen reader announcements', () => {
      renderResetPasswordPage()

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('email input has aria-invalid attribute', () => {
      renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('error alert has role="alert"', async () => {
      mockConfirmResetPassword.mockResolvedValue({
        success: false,
        error: 'Some error',
      })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('password toggle buttons have aria-labels', () => {
      renderResetPasswordPage()

      const toggleButtons = screen.getAllByLabelText(/password/i)
      expect(toggleButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Navigation Tracking', () => {
    it('tracks reset password attempt on form submit', async () => {
      mockConfirmResetPassword.mockResolvedValue({ success: true })
      const { user } = renderResetPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const codeInput = screen.getByTestId('otp-input')
      await user.type(codeInput, '123456')

      const passwordInput = screen.getByTestId('new-password-input')
      await user.type(passwordInput, 'ValidPass1!')

      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      await user.type(confirmPasswordInput, 'ValidPass1!')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('reset_password_attempt', {
          source: 'reset_password_page',
          timestamp: expect.any(Number),
        })
      })
    })

    it('tracks signin link click', async () => {
      const { user } = renderResetPasswordPage()

      const signinLink = screen.getByText('Sign in here')
      await user.click(signinLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('signin_link', {
        source: 'reset_password_page',
      })
    })

    it('tracks forgot password link click', async () => {
      const { user } = renderResetPasswordPage()

      const forgotPasswordLink = screen.getByText('Request new code')
      await user.click(forgotPasswordLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('forgot_password_link', {
        source: 'reset_password_page',
      })
    })

    it('tracks back to home link click', async () => {
      const { user } = renderResetPasswordPage()

      const backToHomeLink = screen.getByText('Back to Home')
      await user.click(backToHomeLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('back_to_home', {
        source: 'reset_password_page',
      })
    })
  })
})
