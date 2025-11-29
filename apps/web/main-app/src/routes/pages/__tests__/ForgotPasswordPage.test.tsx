import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

// Clear global mocks and set up local mocks
vi.unmock('@tanstack/react-router')
vi.unmock('@/services/auth/AuthProvider')
vi.unmock('@/components/Navigation/NavigationProvider')
vi.unmock('@/components/Layout/RootLayout')
vi.unmock('@repo/ui')
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
const mockForgotPassword = vi.fn()
vi.mock('@/services/auth/AuthProvider', () => ({
  useAuth: () => ({
    forgotPassword: mockForgotPassword,
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

// Mock AuthLayout
vi.mock('@/components/Layout/RootLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-layout">{children}</div>
  ),
}))

// Mock @repo/ui components
vi.mock('@repo/ui', () => ({
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
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="mail-icon">Mail</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  KeyRound: () => <span data-testid="key-round-icon">KeyRound</span>,
}))

const renderForgotPasswordPage = () => {
  const user = userEvent.setup()

  render(<ForgotPasswordPage />)

  return { user }
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      renderForgotPasswordPage()
      expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    })

    it('renders forgot password form', () => {
      renderForgotPasswordPage()

      expect(screen.getByRole('heading', { name: /Forgot your password\?/i })).toBeInTheDocument()
      expect(screen.getByText(/No worries! Enter your email/)).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
    })

    it('displays LEGO MOC Hub branding', () => {
      renderForgotPasswordPage()
      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })

    it('has navigation links to login and register pages', () => {
      renderForgotPasswordPage()

      expect(screen.getByText('Sign in here')).toHaveAttribute('href', '/login')
      expect(screen.getByText('Sign up here')).toHaveAttribute('href', '/register')
    })

    it('has back to home button', () => {
      renderForgotPasswordPage()

      const backButton = screen.getByRole('link', { name: /Back to Home/i })
      expect(backButton).toHaveAttribute('href', '/')
    })
  })

  describe('Form Validation', () => {
    it('shows validation error for invalid email', async () => {
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent(
          'Please enter a valid email address',
        )
      })
    })

    it('shows validation error for empty email', async () => {
      const { user } = renderForgotPasswordPage()

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toBeInTheDocument()
      })
    })

    it('does not submit form with invalid email', async () => {
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'invalid')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      expect(mockForgotPassword).not.toHaveBeenCalled()
    })
  })

  describe('Successful Submission', () => {
    it('submits form successfully and shows success message', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
      })

      await waitFor(() => {
        expect(screen.getByTestId('success-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(
          screen.getAllByText(/Password reset instructions have been sent/).length,
        ).toBeGreaterThan(0)
      })
    })

    it('shows success section with continue button after successful submission', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('success-section')).toBeInTheDocument()
        expect(screen.getByTestId('continue-to-reset-button')).toBeInTheDocument()
        expect(screen.getByTestId('try-different-email-button')).toBeInTheDocument()
      })
    })

    it('stores email in sessionStorage on success', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(sessionStorage.getItem('pendingResetEmail')).toBe('test@example.com')
      })
    })

    it('navigates to reset password page when continue button is clicked', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('continue-to-reset-button')).toBeInTheDocument()
      })

      const continueButton = screen.getByTestId('continue-to-reset-button')
      await user.click(continueButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/reset-password' })
    })

    it('resets form when try different email button is clicked', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('try-different-email-button')).toBeInTheDocument()
      })

      const tryDifferentButton = screen.getByTestId('try-different-email-button')
      await user.click(tryDifferentButton)

      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
        expect(screen.queryByTestId('success-section')).not.toBeInTheDocument()
      })
    })

    it('tracks forgot password success event', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('forgot_password_success', {
          source: 'forgot_password_page',
        })
      })
    })
  })

  describe('Security - Account Enumeration Prevention', () => {
    it('shows success for UserNotFoundException to prevent account enumeration', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'UserNotFoundException: User does not exist',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'nonexistent@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      // Should show success message, not error, for security reasons
      await waitFor(() => {
        expect(screen.getByTestId('success-alert')).toBeInTheDocument()
        expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument()
      })
    })

    it('handles thrown UserNotFoundException exception with success', async () => {
      const error = new Error('User does not exist')
      error.name = 'UserNotFoundException'
      mockForgotPassword.mockRejectedValue(error)
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'nonexistent@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      // Should show success message, not error, for security reasons
      await waitFor(() => {
        expect(screen.getByTestId('success-alert')).toBeInTheDocument()
        expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error for LimitExceededException (rate limiting)', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'LimitExceededException: Too many requests',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(
          screen.getAllByText(/Too many attempts. Please try again later/).length,
        ).toBeGreaterThan(0)
      })
    })

    it('shows error for InvalidParameterException', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'InvalidParameterException: Invalid email format',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(screen.getAllByText(/Please enter a valid email address/).length).toBeGreaterThan(0)
      })
    })

    it('shows generic error for other failures', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'Some unexpected error',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(screen.getAllByText(/Some unexpected error/).length).toBeGreaterThan(0)
      })
    })

    it('handles thrown LimitExceededException exception with error', async () => {
      const error = new Error('Too many requests')
      error.name = 'LimitExceededException'
      mockForgotPassword.mockRejectedValue(error)
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(
          screen.getAllByText(/Too many attempts. Please try again later/).length,
        ).toBeGreaterThan(0)
      })
    })

    it('shows generic error for unexpected thrown exceptions', async () => {
      const error = new Error('Unexpected error')
      error.name = 'UnexpectedError'
      mockForgotPassword.mockRejectedValue(error)
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-alert')).toBeInTheDocument()
        // Text appears in multiple places (live region + alert), use getAllByText
        expect(screen.getAllByText(/Failed to send reset email/).length).toBeGreaterThan(0)
      })
    })

    it('tracks forgot password error event', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'Some error',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('forgot_password_error', {
          source: 'forgot_password_page',
          error: 'Some error',
        })
      })
    })
  })

  describe('Loading State', () => {
    it('disables submit button during submission', async () => {
      mockForgotPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Sending instructions...')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible form with ARIA attributes', () => {
      renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
    })

    it('has aria-live region for screen reader announcements', () => {
      renderForgotPasswordPage()

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('email input has aria-invalid attribute', () => {
      renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    })

    it('success alert has role="status"', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })

    it('error alert has role="alert"', async () => {
      mockForgotPassword.mockResolvedValue({
        success: false,
        error: 'LimitExceededException: Rate limited',
      })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Tracking', () => {
    it('tracks forgot password attempt on form submit', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockTrackNavigation).toHaveBeenCalledWith('forgot_password_attempt', {
          source: 'forgot_password_page',
          timestamp: expect.any(Number),
        })
      })
    })

    it('tracks continue to reset password navigation', async () => {
      mockForgotPassword.mockResolvedValue({ success: true })
      const { user } = renderForgotPasswordPage()

      const emailInput = screen.getByTestId('email-input')
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('continue-to-reset-button')).toBeInTheDocument()
      })

      const continueButton = screen.getByTestId('continue-to-reset-button')
      await user.click(continueButton)

      expect(mockTrackNavigation).toHaveBeenCalledWith('continue_to_reset_password', {
        source: 'forgot_password_page',
      })
    })

    it('tracks signin link click', async () => {
      const { user } = renderForgotPasswordPage()

      const signinLink = screen.getByText('Sign in here')
      await user.click(signinLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('signin_link', {
        source: 'forgot_password_page',
      })
    })

    it('tracks signup link click', async () => {
      const { user } = renderForgotPasswordPage()

      const signupLink = screen.getByText('Sign up here')
      await user.click(signupLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('signup_link', {
        source: 'forgot_password_page',
      })
    })

    it('tracks back to home link click', async () => {
      const { user } = renderForgotPasswordPage()

      const backToHomeLink = screen.getByText('Back to Home')
      await user.click(backToHomeLink)

      expect(mockTrackNavigation).toHaveBeenCalledWith('back_to_home', {
        source: 'forgot_password_page',
      })
    })
  })
})
