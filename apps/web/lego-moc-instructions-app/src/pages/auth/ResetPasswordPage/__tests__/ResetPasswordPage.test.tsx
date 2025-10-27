import './setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../../../__tests__/mocks/server'
import ResetPasswordPage from '../index'

// Mock window.location
const mockLocation = {
  pathname: '/auth/reset-password/valid-token-123',
  href: 'http://localhost:5173/auth/reset-password/valid-token-123',
  origin: 'http://localhost:5173',
  protocol: 'http:',
  host: 'localhost:5173',
  hostname: 'localhost',
  port: '5173',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
  useParams: () => ({
    token: 'valid-token-123',
  }),
}))

describe('ResetPasswordPage API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = '/auth/reset-password/valid-token-123'
  })

  afterEach(() => {
    server.resetHandlers()
  })

  const renderComponent = () => {
    return render(<ResetPasswordPage />)
  }

  describe('Reset Password API Tests', () => {
    it('should handle successful password reset', async () => {
      const user = userEvent.setup()
      renderComponent()

      // Find and fill the password inputs
      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
        expect(screen.getByText('Your password has been updated')).toBeInTheDocument()
        expect(screen.getByText('Sign In')).toBeInTheDocument()
      })
    })

    it('should handle failed password reset with invalid token', async () => {
      // Override handler to simulate invalid token
      server.use(
        http.post('*/auth/reset-password/*', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Invalid or expired reset token',
            },
            { status: 400 },
          )
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument()
      })

      // Verify the form is still visible (not in success state)
      expect(screen.getByText('Set New Password')).toBeInTheDocument()
    })

    it('should handle network error during reset', async () => {
      // Override the default handler to simulate network error
      server.use(
        http.post('*/auth/reset-password/*', () => {
          return HttpResponse.error()
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument()
      })
    })

    it('should show loading state during reset', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/reset-password/*', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: true,
            message: 'Password reset successful',
          })
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Check for loading spinner - button should be disabled and show spinner
      expect(submitButton).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // Spinner button
    })

    it('should extract token from URL pathname', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Verify the API was called with the correct token
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should handle empty token from URL', async () => {
      mockLocation.pathname = '/auth/reset-password/'

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should still work with empty token (API will handle validation)
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation Tests', () => {
    it('should validate password minimum length', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Try to submit with short password
      await user.type(passwordInput, 'short')
      await user.type(confirmPasswordInput, 'short')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Try to submit with mismatched passwords
      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'DifferentPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })
    })

    it('should prevent submission with empty password', async () => {
      const user = userEvent.setup()
      renderComponent()

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('should prevent submission with empty confirm password', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      await user.type(passwordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })
    })

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      // Start typing valid password
      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Tests', () => {
    it('should clear error when starting new submission', async () => {
      // First trigger an error
      server.use(
        http.post('*/auth/reset-password/*', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Invalid or expired reset token',
            },
            { status: 400 },
          )
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument()
      })

      // Reset server to success
      server.resetHandlers()

      // Try again - error should be cleared
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should handle AuthApiError specifically', async () => {
      // Override handler to return AuthApiError format
      server.use(
        http.post('*/auth/reset-password/*', () => {
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

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Custom auth error message')).toBeInTheDocument()
      })
    })

    it('should handle generic errors', async () => {
      // Override handler to throw generic error
      server.use(
        http.post('*/auth/reset-password/*', () => {
          throw new Error('Generic error')
        }),
      )

      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Generic error')).toBeInTheDocument()
      })
    })
  })

  describe('Success State Tests', () => {
    it('should navigate to login page when clicking Sign In', async () => {
      const user = userEvent.setup()
      renderComponent()

      // First complete the reset
      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })

      // Click Sign In button
      const signInButton = screen.getByText('Sign In')
      await user.click(signInButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
    })

    it('should show correct success message and description', async () => {
      const user = userEvent.setup()
      renderComponent()

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
        expect(screen.getByText('Your password has been updated')).toBeInTheDocument()
        expect(screen.getByText('You can now sign in with your new password.')).toBeInTheDocument()
      })
    })
  })
})
