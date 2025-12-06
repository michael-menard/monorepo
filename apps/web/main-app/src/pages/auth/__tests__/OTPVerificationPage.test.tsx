import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OTPVerificationPage } from '../OTPVerificationPage'
import { useAuth } from '@/services/auth/AuthProvider'
import { useRouter } from '@tanstack/react-router'

// Mock dependencies
vi.mock('@/services/auth/AuthProvider')
vi.mock('@tanstack/react-router')

const mockUseAuth = vi.mocked(useAuth)
const mockUseRouter = vi.mocked(useRouter)

describe('OTPVerificationPage', () => {
  const mockConfirmSignIn = vi.fn()
  const mockNavigate = vi.fn()

  const mockClearChallenge = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseRouter.mockReturnValue({
      navigate: mockNavigate,
    } as any)

    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: {
        challengeName: 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE',
        challengeParameters: {},
      },
      isLoading: false,
    } as any)
  })

  it('renders OTP verification form', () => {
    render(<OTPVerificationPage />)

    expect(screen.getByText('Enter Email Code')).toBeInTheDocument()
    expect(screen.getByText(/We sent a 6-digit code to your email/)).toBeInTheDocument()
    expect(screen.getByTestId('otp-input')).toBeInTheDocument()
    expect(screen.getByTestId('verify-button')).toBeInTheDocument()
  })

  it('shows correct title and description for CONFIRM_SIGN_IN_WITH_SMS_CODE challenge', () => {
    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: {
        challengeName: 'CONFIRM_SIGN_IN_WITH_SMS_CODE',
        challengeParameters: {},
      },
      isLoading: false,
    } as any)

    render(<OTPVerificationPage />)

    expect(screen.getByText('Enter SMS Code')).toBeInTheDocument()
    expect(screen.getByText(/We sent a 6-digit code to your phone/)).toBeInTheDocument()
  })

  it('shows correct title and description for CONFIRM_SIGN_IN_WITH_TOTP_CODE challenge', () => {
    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: {
        challengeName: 'CONFIRM_SIGN_IN_WITH_TOTP_CODE',
        challengeParameters: {},
      },
      isLoading: false,
    } as any)

    render(<OTPVerificationPage />)

    expect(screen.getByText('Enter Authenticator Code')).toBeInTheDocument()
    expect(screen.getByText(/Open your authenticator app/)).toBeInTheDocument()
  })

  it('redirects to login if no current challenge', () => {
    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: null,
      isLoading: false,
    } as any)

    render(<OTPVerificationPage />)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('submits OTP code successfully', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({ success: true })

    render(<OTPVerificationPage />)

    // Enter OTP code - get individual inputs for typing
    const inputs = screen.getAllByRole('textbox')

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockConfirmSignIn).toHaveBeenCalledWith('123456')
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('shows error for invalid OTP code', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({
      success: false,
      error: 'Invalid verification code',
    })

    render(<OTPVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], '1')
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid verification code')
    })
  })

  it('prevents submission with incomplete code', async () => {
    const user = userEvent.setup()

    render(<OTPVerificationPage />)

    // Enter incomplete code
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')
    await user.type(inputs[1], '2')

    // Try to submit
    const submitButton = screen.getByTestId('verify-button')
    expect(submitButton).toBeDisabled()
  })

  it('shows error for incomplete code on form submit', async () => {
    const user = userEvent.setup()

    render(<OTPVerificationPage />)

    // Enter incomplete code
    const inputs = screen.getAllByRole('textbox')
    await user.type(inputs[0], '1')

    // Force submit by directly triggering form submission
    const form = document.querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Please enter a complete 6-digit code',
      )
    })
  })

  it('navigates back to login when back button is clicked', async () => {
    const user = userEvent.setup()

    render(<OTPVerificationPage />)

    const backButton = screen.getByTestId('back-to-login-button')
    await user.click(backButton)

    expect(mockClearChallenge).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
  })

  it('handles additional challenge step without showing error', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({
      success: false,
      error: 'Additional challenge required',
    })

    render(<OTPVerificationPage />)

    // Enter OTP code
    const inputs = screen.getAllByRole('textbox')
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i], (i + 1).toString())
    }

    // Submit form
    const submitButton = screen.getByTestId('verify-button')
    await user.click(submitButton)

    // Should not show error message for additional challenge
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<OTPVerificationPage />)

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
})
