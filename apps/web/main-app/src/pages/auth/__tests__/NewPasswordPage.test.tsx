import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouter } from '@tanstack/react-router'
import { NewPasswordPage } from '../NewPasswordPage'
import { useAuth } from '@/services/auth/AuthProvider'

// Mock dependencies but unmock react-hook-form to use real validation
vi.mock('@/services/auth/AuthProvider')
vi.mock('@tanstack/react-router')

// Unmock react-hook-form and zod resolver to use real implementations
vi.unmock('react-hook-form')
vi.unmock('@hookform/resolvers/zod')

const mockUseAuth = vi.mocked(useAuth)
const mockUseRouter = vi.mocked(useRouter)

describe('NewPasswordPage', () => {
  const mockConfirmSignIn = vi.fn()
  const mockClearChallenge = vi.fn()
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseRouter.mockReturnValue({
      navigate: mockNavigate,
    } as any)

    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: {
        challengeName: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
        challengeParameters: {},
      },
      isLoading: false,
    } as any)
  })

  it('renders new password form', () => {
    render(<NewPasswordPage />)

    expect(screen.getByRole('heading', { name: 'Set New Password' })).toBeInTheDocument()
    expect(screen.getByText(/Your account requires a new password/)).toBeInTheDocument()
    expect(screen.getByTestId('new-password-input')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('redirects to login if no current challenge', () => {
    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: null,
      isLoading: false,
    } as any)

    render(<NewPasswordPage />)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
  })

  it('redirects to OTP page if wrong challenge type', () => {
    mockUseAuth.mockReturnValue({
      confirmSignIn: mockConfirmSignIn,
      clearChallenge: mockClearChallenge,
      currentChallenge: {
        challengeName: 'CONFIRM_SIGN_IN_WITH_SMS_CODE',
        challengeParameters: {},
      },
      isLoading: false,
    } as any)

    render(<NewPasswordPage />)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/otp-verification' })
  })

  it('shows validation errors for weak password on submit', async () => {
    const user = userEvent.setup()

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'weak')
    await user.type(confirmPasswordInput, 'weak')

    // Submit form to trigger validation
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument()
    })
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'ValidPass1!')
    await user.type(confirmPasswordInput, 'DifferentPass1!')

    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('submits new password successfully', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({ success: true })

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'ValidPass1!')
    await user.type(confirmPasswordInput, 'ValidPass1!')

    // Submit form by clicking submit button
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockConfirmSignIn).toHaveBeenCalledWith('ValidPass1!')
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('handles additional challenge after password change', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({
      success: false,
      error: 'Additional challenge required',
    })

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'ValidPass1!')
    await user.type(confirmPasswordInput, 'ValidPass1!')

    // Submit form by clicking submit button
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/otp-verification' })
    })
  })

  it('shows error message on failed password change', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockResolvedValue({
      success: false,
      error: 'Password does not meet requirements',
    })

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'ValidPass1!')
    await user.type(confirmPasswordInput, 'ValidPass1!')

    // Submit form by clicking submit button
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('password-error')).toHaveTextContent(
        'Password does not meet requirements',
      )
    })
  })

  it('clears challenge and navigates back to login', async () => {
    const user = userEvent.setup()

    render(<NewPasswordPage />)

    const backButton = screen.getByTestId('back-to-login-button')
    await user.click(backButton)

    expect(mockClearChallenge).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
  })

  it('disables form during submission', async () => {
    const user = userEvent.setup()
    mockConfirmSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    const confirmPasswordInput = screen.getByTestId('confirm-password-input')

    await user.type(passwordInput, 'ValidPass1!')
    await user.type(confirmPasswordInput, 'ValidPass1!')

    // Submit form
    const submitButton = screen.getByTestId('submit-button')
    await user.click(submitButton)

    // Check that button shows loading state
    expect(screen.getByText('Setting Password...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()

    render(<NewPasswordPage />)

    const passwordInput = screen.getByTestId('new-password-input')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find toggle button by aria-label
    const toggleButtons = screen.getAllByLabelText('Show password')
    await user.click(toggleButtons[0])

    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
