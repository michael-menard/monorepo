import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EmailVerificationForm from '../index'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockVerifyEmail = vi.fn()
const mockResendVerificationCode = vi.fn()
const mockUseAuth = vi.fn(() => ({
  verifyEmail: mockVerifyEmail,
  resendVerificationCode: mockResendVerificationCode,
  isLoading: false,
  error: null,
  message: null,
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('EmailVerificationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      resendVerificationCode: mockResendVerificationCode,
      isLoading: false,
      error: null,
      message: null,
    })
  })

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <EmailVerificationForm />
      </MemoryRouter>,
    )

  it('renders correctly', () => {
    renderComponent()
    expect(screen.getByRole('heading', { name: 'Verify Email' })).toBeInTheDocument()
    expect(screen.getByText(/please check your email/i)).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Verify Email' })).toBeInTheDocument()
  })

  it('handles OTP input correctly', async () => {
    renderComponent()
    const inputs = screen.getAllByRole('textbox')
    const form = screen.getByRole('form')

    // Type in each input
    inputs.forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(index + 1) } })
      fireEvent.input(input, { target: { value: String(index + 1) } })
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({ code: '123456' })
    })
  })

  it('handles paste event correctly', async () => {
    renderComponent()
    const firstInput = screen.getAllByRole('textbox')[0]
    const form = screen.getByRole('form')

    const clipboardData = {
      getData: () => '123456',
    }

    fireEvent.paste(firstInput, {
      clipboardData,
      preventDefault: vi.fn(),
    })

    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({ code: '123456' })
    })
  })

  it('handles resend code correctly', async () => {
    renderComponent()

    const resendButton = screen.getByRole('button', { name: /didn't receive the code/i })
    fireEvent.click(resendButton)

    expect(mockResendVerificationCode).toHaveBeenCalled()

    // Wait for state update
    await waitFor(() => {
      expect(resendButton).toHaveTextContent('Resend code in 60s')
      expect(resendButton).toHaveAttribute('disabled')
    })
  })

  it('displays error message when verification fails', async () => {
    const errorMessage = 'Invalid verification code'
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      resendVerificationCode: mockResendVerificationCode,
      isLoading: false,
      error: errorMessage,
      message: null,
    })

    renderComponent()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('navigates to login on cancel', () => {
    renderComponent()
    const backButton = screen.getByRole('button', { name: 'Back to Login' })
    fireEvent.click(backButton)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('shows loading state during verification', () => {
    mockUseAuth.mockReturnValue({
      verifyEmail: mockVerifyEmail,
      resendVerificationCode: mockResendVerificationCode,
      isLoading: true,
      error: null,
      message: null,
    })

    renderComponent()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
