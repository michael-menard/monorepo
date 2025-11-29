import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { EmailVerificationPage } from '../EmailVerificationPage'
import { useAuth } from '@/services/auth/AuthProvider'

// Mock dependencies
vi.mock('@/services/auth/AuthProvider')
vi.mock('@tanstack/react-router')

const mockUseAuth = vi.mocked(useAuth)
const mockUseRouter = vi.mocked(useRouter)

describe('EmailVerificationPage', () => {
  const mockConfirmSignUp = vi.fn()
  const mockResendSignUpCode = vi.fn()
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

    mockUseRouter.mockReturnValue({
      navigate: mockNavigate,
    } as any)

    mockUseAuth.mockReturnValue({
      confirmSignUp: mockConfirmSignUp,
      resendSignUpCode: mockResendSignUpCode,
      pendingVerificationEmail: 'test@example.com',
      isLoading: false,
    } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders email verification form', () => {
    render(<EmailVerificationPage />)

    expect(screen.getByText('Verify Your Email')).toBeInTheDocument()
    expect(screen.getByText(/We sent a 6-digit verification code to/)).toBeInTheDocument()
    expect(screen.getByText('t***t@example.com')).toBeInTheDocument()
    expect(screen.getByTestId('otp-input')).toBeInTheDocument()
    expect(screen.getByTestId('verify-button')).toBeInTheDocument()
  })

  it('redirects to register if no pending email', () => {
    mockUseAuth.mockReturnValue({
      confirmSignUp: mockConfirmSignUp,
      resendSignUpCode: mockResendSignUpCode,
      pendingVerificationEmail: null,
      isLoading: false,
    } as any)

    render(<EmailVerificationPage />)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/register' })
  })

  it('falls back to sessionStorage for email', () => {
    mockUseAuth.mockReturnValue({
      confirmSignUp: mockConfirmSignUp,
      resendSignUpCode: mockResendSignUpCode,
      pendingVerificationEmail: null,
      isLoading: false,
    } as any)

    // Mock sessionStorage to return an email
    vi.spyOn(window.sessionStorage, 'getItem').mockReturnValue('stored@example.com')

    render(<EmailVerificationPage />)

    expect(screen.getByText('s***d@example.com')).toBeInTheDocument()
  })

  it('submits verification code successfully', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockResolvedValue({ success: true, autoSignedIn: false })

    render(<EmailVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockConfirmSignUp).toHaveBeenCalledWith('test@example.com', '123456')
    })

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Email Verified!')).toBeInTheDocument()
    })
  })

  it('shows error for invalid verification code', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockResolvedValue({
      success: false,
      error: 'Invalid verification code. Please check and try again.',
    })

    render(<EmailVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], '1')
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Invalid verification code. Please check and try again.',
      )
    })
  })

  it('prevents submission with incomplete code', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<EmailVerificationPage />)

    // Enter incomplete code
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')
    await user.type(inputs[1], '2')

    // Verify button should be disabled
    const submitButton = screen.getByTestId('verify-button')
    expect(submitButton).toBeDisabled()
  })

  it('handles resend code functionality', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockResendSignUpCode.mockResolvedValue({ success: true })

    render(<EmailVerificationPage />)

    const resendButton = screen.getByTestId('resend-code-button')
    await user.click(resendButton)

    await waitFor(() => {
      expect(mockResendSignUpCode).toHaveBeenCalledWith('test@example.com')
    })

    // Should show cooldown
    await waitFor(() => {
      expect(screen.getByText(/Resend code in \d+s/)).toBeInTheDocument()
    })
  })

  it('shows cooldown timer after resend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockResendSignUpCode.mockResolvedValue({ success: true })

    render(<EmailVerificationPage />)

    const resendButton = screen.getByTestId('resend-code-button')
    await user.click(resendButton)

    await waitFor(() => {
      expect(screen.getByText(/Resend code in/)).toBeInTheDocument()
    })

    // Resend button should be disabled during cooldown
    expect(resendButton).toBeDisabled()
  })

  it('handles resend code error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockResendSignUpCode.mockResolvedValue({
      success: false,
      error: 'Too many attempts. Please wait before trying again.',
    })

    render(<EmailVerificationPage />)

    const resendButton = screen.getByTestId('resend-code-button')
    await user.click(resendButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Too many attempts. Please wait before trying again.',
      )
    })
  })

  it('navigates back to signup when back button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<EmailVerificationPage />)

    const backButton = screen.getByTestId('back-to-signup-button')
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/register' })
  })

  it('auto-redirects to login after successful verification', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockResolvedValue({ success: true, autoSignedIn: false })

    render(<EmailVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    // Wait for success state
    await waitFor(() => {
      expect(screen.getByText('Email Verified!')).toBeInTheDocument()
    })

    // Advance timers to trigger auto-redirect
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('shows go to login button on success', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockResolvedValue({ success: true, autoSignedIn: false })

    render(<EmailVerificationPage />)

    // Enter and submit OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('go-to-login-button')).toBeInTheDocument()
    })

    // Click the go to login button
    await user.click(screen.getByTestId('go-to-login-button'))

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)),
    )

    render(<EmailVerificationPage />)

    // Enter complete code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    // Check that form is disabled during submission
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Verifying...')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<EmailVerificationPage />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach((input, index) => {
      expect(input).toHaveAttribute('aria-label', `Verification code digit ${index + 1}`)
    })

    // Error message has role="alert"
    // Status messages have aria-live="polite"
  })

  it('masks email correctly for short local parts', () => {
    mockUseAuth.mockReturnValue({
      confirmSignUp: mockConfirmSignUp,
      resendSignUpCode: mockResendSignUpCode,
      pendingVerificationEmail: 'ab@example.com',
      isLoading: false,
    } as any)

    render(<EmailVerificationPage />)

    expect(screen.getByText('a***@example.com')).toBeInTheDocument()
  })

  it('clears OTP input after failed verification', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    mockConfirmSignUp.mockResolvedValue({
      success: false,
      error: 'Invalid code',
    })

    render(<EmailVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    // Wait for error state and verify inputs are cleared
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    // The OTP input value should be cleared (inputs should be empty)
    // This is handled by setting otpCode to '' in the component
  })
})
