import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordForm from '../index'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockResetPassword = vi.fn()
const mockUseAuth = vi.fn(() => ({
  resetPassword: mockResetPassword,
  isLoading: false,
  error: null,
  message: null,
}))

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
      message: null,
    })
  })

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ResetPasswordForm />
      </MemoryRouter>,
    )

  it('renders the form correctly', () => {
    renderComponent()
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Email' })).toBeInTheDocument()
  })

  it('validates email format', async () => {
    renderComponent()
    const emailInput = screen.getByPlaceholderText('Email Address')
    const form = screen.getByRole('form')

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('submits the form with valid email', async () => {
    renderComponent()
    const emailInput = screen.getByPlaceholderText('Email Address')
    const form = screen.getByRole('form')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({ email: 'test@example.com' })
    })
  })

  it('navigates back to login when clicking back button', () => {
    renderComponent()
    const backButton = screen.getByRole('button', { name: 'Back to Login' })
    fireEvent.click(backButton)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('shows loading state during submission', () => {
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: true,
      error: null,
      message: null,
    })

    renderComponent()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays error message from server', () => {
    const errorMessage = 'Email not found'
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: errorMessage,
      message: null,
    })

    renderComponent()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('displays success message', () => {
    const successMessage = 'Reset email sent'
    mockUseAuth.mockReturnValue({
      resetPassword: mockResetPassword,
      isLoading: false,
      error: null,
      message: successMessage,
    })

    renderComponent()
    expect(screen.getByText(successMessage)).toBeInTheDocument()
  })
})
