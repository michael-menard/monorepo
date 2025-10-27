import './setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../../../__tests__/mocks/server'
import EmailVerificationPage from '../index'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('EmailVerificationPage API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('test@example.com')
  })

  afterEach(() => {
    server.resetHandlers()
  })

  const renderComponent = () => {
    return render(<EmailVerificationPage />)
  }

  describe('Verify Email API Tests', () => {
    it('should handle successful email verification', async () => {
      const user = userEvent.setup()
      renderComponent()

      // Find and fill the verification code input
      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '123456')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText('Email Verified')).toBeInTheDocument()
        expect(screen.getByText('Your email has been successfully verified')).toBeInTheDocument()
        expect(screen.getByText('Go to Home')).toBeInTheDocument()
      })
    })

    it('should handle failed email verification', async () => {
      const user = userEvent.setup()
      renderComponent()

      // Find and fill the verification code input with invalid code
      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '000000')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Invalid or expired verification code')).toBeInTheDocument()
      })

      // Verify the form is still visible (not in success state)
      expect(screen.getByText('Verify Your Email')).toBeInTheDocument()
    })

    it('should handle network error during verification', async () => {
      // Override the default handler to simulate network error
      server.use(
        http.post('*/auth/verify-email', () => {
          return HttpResponse.error()
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '123456')

      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument()
      })
    })

    it('should show loading state during verification', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/verify-email', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: true,
            message: 'Email verified successfully',
            data: {
              user: {
                _id: '1',
                email: 'test@example.com',
                isVerified: true,
                lastLogin: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
          })
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '123456')

      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      // Check for loading spinner - button should be disabled and show spinner
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Resend Verification API Tests', () => {
    it('should handle successful resend verification', async () => {
      const user = userEvent.setup()
      renderComponent()

      // Click resend button
      const resendButton = screen.getByRole('button', { name: 'Resend Code' })
      await user.click(resendButton)

      // Wait for success alert
      await waitFor(
        () => {
          expect(global.alert).toHaveBeenCalledWith('Verification code resent successfully!')
        },
        { timeout: 3000 },
      )
    })

    it('should handle failed resend verification', async () => {
      // Override handler to simulate failure
      server.use(
        http.post('*/auth/resend-verification', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Email is required',
            },
            { status: 400 },
          )
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const resendButton = screen.getByRole('button', { name: 'Resend Code' })
      await user.click(resendButton)

      await waitFor(
        () => {
          expect(global.alert).toHaveBeenCalledWith('Email is required')
        },
        { timeout: 3000 },
      )
    })

    it('should handle missing email in localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const user = userEvent.setup()
      renderComponent()

      const resendButton = screen.getByRole('button', { name: 'Resend Code' })
      await user.click(resendButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Email not found. Please try signing up again.')
      })
    })

    it('should handle network error during resend', async () => {
      server.use(
        http.post('*/auth/resend-verification', () => {
          return HttpResponse.error()
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const resendButton = screen.getByRole('button', { name: 'Resend Code' })
      await user.click(resendButton)

      await waitFor(
        () => {
          expect(global.alert).toHaveBeenCalledWith('Network error. Please check your connection.')
        },
        { timeout: 3000 },
      )
    })
  })

  describe('Form Validation Tests', () => {
    it('should validate 6-character code requirement', async () => {
      const user = userEvent.setup()
      renderComponent()

      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')

      // Try to submit with 5 characters
      await user.type(codeInput, '12345')
      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Verification code must be 6 characters')).toBeInTheDocument()
      })
    })

    it('should validate maximum 6 characters', async () => {
      const user = userEvent.setup()
      renderComponent()

      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')

      // Try to type more than 6 characters
      await user.type(codeInput, '1234567')

      // Check that only 6 characters are accepted
      expect(codeInput).toHaveValue('123456')
    })

    it('should prevent submission with empty code', async () => {
      const user = userEvent.setup()
      renderComponent()

      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Verification code must be 6 characters')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Tests', () => {
    it('should clear error when starting new verification', async () => {
      const user = userEvent.setup()
      renderComponent()

      // First, trigger an error
      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '000000')
      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired verification code')).toBeInTheDocument()
      })

      // Now try with valid code - error should be cleared
      await user.clear(codeInput)
      await user.type(codeInput, '123456')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email Verified')).toBeInTheDocument()
      })
    })

    it('should handle AuthApiError specifically', async () => {
      // Override handler to return AuthApiError format
      server.use(
        http.post('*/auth/verify-email', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Custom auth error message',
            },
            { status: 401 },
          )
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const codeInput = screen.getByPlaceholderText('Enter 6-digit code')
      await user.type(codeInput, '123456')
      const submitButton = screen.getByRole('button', { name: 'Verify Email' })
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(screen.getByText('Custom auth error message')).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })
  })
})
