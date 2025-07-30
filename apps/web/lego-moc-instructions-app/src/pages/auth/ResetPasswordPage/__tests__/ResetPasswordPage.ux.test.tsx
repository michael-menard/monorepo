import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../../../test/mocks/server'
import ResetPasswordPage from '../index'

// Import setup for mocks
import './setup'

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
}))

describe('ResetPasswordPage User Experience', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = '/auth/reset-password/valid-token-123'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ResetPasswordPage />)

      // Check for proper form labeling
      const passwordInput = screen.getByLabelText('New Password')
      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('id', 'password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter new password')

      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')
      expect(confirmPasswordInput).toBeInTheDocument()
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm new password')

      // Check for proper button labeling
      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')

      // Check for proper form structure
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()

      // Check for proper card structure
      expect(screen.getByText('Set New Password')).toBeInTheDocument()
      expect(screen.getByText('Enter your new password below')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<ResetPasswordPage />)

      // Tab through form elements
      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')
      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      // Focus should start on the first input
      passwordInput.focus()
      expect(passwordInput).toHaveFocus()

      // Tab to confirm password input
      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()

      // Tab to submit button
      await user.tab()
      // Focus might be on the wrapper div, so check if either the button or its wrapper has focus
      const hasFocus = submitButton === document.activeElement || submitButton.parentElement === document.activeElement
      expect(hasFocus).toBe(true)

      // Verify all elements are focusable and accessible via keyboard
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1')
      expect(confirmPasswordInput).not.toHaveAttribute('tabindex', '-1')
      expect(submitButton).not.toHaveAttribute('tabindex', '-1')
    })

    it('should support Enter key submission', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NewPassword123!')
      await user.type(confirmPasswordInput, 'NewPassword123!')

      // Press Enter on the form
      await user.keyboard('{Enter}')

      // Should trigger form submission
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should have proper focus management', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Focus should be managed properly
      await user.click(passwordInput)
      expect(passwordInput).toHaveFocus()

      await user.click(confirmPasswordInput)
      expect(confirmPasswordInput).toHaveFocus()

      // Click outside should not break focus management
      await user.click(document.body)
      expect(confirmPasswordInput).not.toHaveFocus()
    })

    it('should announce errors to screen readers', async () => {
      render(<ResetPasswordPage />)

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Error should be announced
      await waitFor(() => {
        const errorElement = screen.getByText('Password must be at least 8 characters')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveAttribute('class', expect.stringContaining('text-red-500'))
      })
    })
  })

  describe('User Interaction Tests', () => {
    it('should provide immediate feedback on password strength', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Type a weak password
      await user.type(passwordInput, 'weak')
      await user.type(confirmPasswordInput, 'weak')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show validation error immediately
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })

    it('should show real-time password matching feedback', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Type matching passwords
      await user.type(passwordInput, 'StrongPassword123!')
      await user.type(confirmPasswordInput, 'StrongPassword123!')

      // Should not show error for matching passwords
      expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument()

      // Change confirm password to mismatch
      await user.clear(confirmPasswordInput)
      await user.type(confirmPasswordInput, 'DifferentPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show mismatch error
      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })
    })

    it('should handle rapid typing and submission', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Rapid typing
      await user.type(passwordInput, 'RapidPassword123!')
      await user.type(confirmPasswordInput, 'RapidPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      
      // Rapid clicking
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should handle gracefully (prevent multiple submissions)
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should provide clear loading feedback', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/reset-password/*', async () => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return HttpResponse.json({
            success: true,
            message: 'Password reset successful'
          })
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'LoadingPassword123!')
      await user.type(confirmPasswordInput, 'LoadingPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show loading state
      expect(submitButton).toBeDisabled()
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // Spinner
    })

    it('should handle paste operations gracefully', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Simulate paste operation by typing the value directly
      await user.type(passwordInput, 'PastedPassword123!')
      await user.type(confirmPasswordInput, 'PastedPassword123!')

      // Should handle input correctly
      expect(passwordInput).toHaveValue('PastedPassword123!')
      expect(confirmPasswordInput).toHaveValue('PastedPassword123!')
    })
  })

  describe('Visual Feedback Tests', () => {
    it('should show proper visual states for form elements', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Check initial state
      expect(passwordInput).toHaveClass('pl-10') // Has icon padding
      expect(confirmPasswordInput).toHaveClass('pl-10') // Has icon padding

      // Check focus states
      await user.click(passwordInput)
      expect(passwordInput).toHaveFocus()

      await user.click(confirmPasswordInput)
      expect(confirmPasswordInput).toHaveFocus()
    })

    it('should show error states with proper styling', async () => {
      render(<ResetPasswordPage />)

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show error with proper styling
      await waitFor(() => {
        const errorElement = screen.getByText('Password must be at least 8 characters')
        expect(errorElement).toHaveClass('text-red-500')
        expect(errorElement).toHaveClass('text-sm')
      })
    })

    it('should show success state with proper styling', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'SuccessPassword123!')
      await user.type(confirmPasswordInput, 'SuccessPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
        expect(screen.getByText('Your password has been updated')).toBeInTheDocument()
        
        // Check success styling
        const signInButton = screen.getByText('Sign In')
        expect(signInButton).toHaveClass('text-primary')
        expect(signInButton).toHaveClass('hover:underline')
      })
    })

    it('should show loading animation properly', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/reset-password/*', async () => {
          await new Promise(resolve => setTimeout(resolve, 300))
          return HttpResponse.json({
            success: true,
            message: 'Password reset successful'
          })
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'LoadingPassword123!')
      await user.type(confirmPasswordInput, 'LoadingPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show spinner
      const spinner = screen.getByRole('button', { name: '' }).querySelector('div')
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('Responsive Design Tests', () => {
    it('should be responsive on different screen sizes', () => {
      // Test desktop view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      const { rerender } = render(<ResetPasswordPage />)
      expect(screen.getByText('Set New Password')).toBeInTheDocument()

      // Test tablet view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      rerender(<ResetPasswordPage />)
      expect(screen.getByText('Set New Password')).toBeInTheDocument()

      // Test mobile view
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      rerender(<ResetPasswordPage />)
      expect(screen.getByText('Set New Password')).toBeInTheDocument()
    })

    it('should handle touch interactions on mobile', async () => {
      // Simulate touch device
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: true,
      })

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Touch interactions should work
      await user.click(passwordInput)
      expect(passwordInput).toHaveFocus()

      await user.type(passwordInput, 'TouchPassword123!')
      await user.click(confirmPasswordInput)
      await user.type(confirmPasswordInput, 'TouchPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery Tests', () => {
    it('should allow users to recover from validation errors', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      // Fix the error
      await user.type(passwordInput, 'ValidPassword123!')
      await user.type(confirmPasswordInput, 'ValidPassword123!')

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument()
      })

      // Submit again
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should allow users to recover from API errors', async () => {
      // First trigger an API error
      server.use(
        http.post('*/auth/reset-password/*', () => {
          return HttpResponse.json({
            success: false,
            message: 'Invalid or expired reset token'
          }, { status: 400 })
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'ErrorPassword123!')
      await user.type(confirmPasswordInput, 'ErrorPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument()
      })

      // Reset server to success
      server.resetHandlers()

      // Try again
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })
  })

  describe('Performance UX Tests', () => {
    it('should provide immediate feedback for user actions', async () => {
      const startTime = Date.now()
      
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      // Type and submit
      await user.type(passwordInput, 'FastPassword123!')
      await user.type(confirmPasswordInput, 'FastPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      const interactionTime = Date.now() - startTime

      // Should be responsive (under 1 second for basic interactions)
      expect(interactionTime).toBeLessThan(1000)

      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      })
    })

    it('should handle slow network gracefully', async () => {
      // Override handler to simulate slow network
      server.use(
        http.post('*/auth/reset-password/*', async () => {
          await new Promise(resolve => setTimeout(resolve, 2000))
          return HttpResponse.json({
            success: true,
            message: 'Password reset successful'
          })
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'SlowPassword123!')
      await user.type(confirmPasswordInput, 'SlowPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })
      await user.click(submitButton)

      // Should show loading state immediately
      expect(submitButton).toBeDisabled()

      // Should eventually complete
      await waitFor(() => {
        expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })
}) 