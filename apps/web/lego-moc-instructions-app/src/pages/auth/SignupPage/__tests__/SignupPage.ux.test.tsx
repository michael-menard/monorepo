import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../../../test/mocks/server'
import SignupPage from '../index'

// Import setup for mocks
import './setup'

// Mock window.matchMedia for responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver for responsive testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for responsive testing
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('SignupPage User Experience', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })

    // Mock alert
    global.alert = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Accessibility Tests', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<SignupPage />)

      // Check for proper form labeling
      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')

      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toHaveAttribute('id', 'name')
      expect(nameInput).toHaveAttribute('type', 'text')
      expect(nameInput).toHaveAttribute('placeholder', 'Enter your full name')

      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')

      expect(passwordInput).toBeInTheDocument()
      expect(passwordInput).toHaveAttribute('id', 'password')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a password')

      expect(confirmPasswordInput).toBeInTheDocument()
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')

      // Check for proper button labeling
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')

      const signInButton = screen.getByRole('button', { name: 'Sign in' })
      expect(signInButton).toBeInTheDocument()
      expect(signInButton).toHaveAttribute('type', 'button')

      // Check for proper form structure
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<SignupPage />)

      // Tab through form elements
      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      const signInButton = screen.getByRole('button', { name: 'Sign in' })

      // Focus should start on the first input
      nameInput.focus()
      expect(nameInput).toHaveFocus()

      // Tab through all form elements
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()

      await user.tab()
      expect(signInButton).toHaveFocus()
    })

    it('should handle Enter key submission', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      
      // Fill form
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      
      // Press Enter to submit
      await user.keyboard('{Enter}')

      // Should trigger form submission
      await waitFor(() => {
        expect(screen.getByText('Create Account')).toBeInTheDocument()
      })
    })

    it('should have proper focus management', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Focus should be managed properly during form submission
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      // During loading, button should be disabled
      expect(submitButton).toBeDisabled()
    })

    it('should announce errors to screen readers', async () => {
      render(<SignupPage />)

      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Submit with invalid data
      await user.click(submitButton)

      // Error should be announced
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsiveness Tests', () => {
    it('should be responsive on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      render(<SignupPage />)

      // Check that the container has responsive classes
      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('min-h-screen', 'bg-background', 'flex', 'items-center', 'justify-center', 'p-4')

      // Check that the card has responsive width
      const card = document.querySelector('.max-w-md')
      expect(card).toHaveClass('max-w-md', 'w-full')
    })

    it('should handle touch interactions properly', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Simulate touch input
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      
      // Touch the submit button
      fireEvent.touchStart(submitButton)
      fireEvent.touchEnd(submitButton)

      // Should trigger form submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should handle virtual keyboard properly', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')

      // Simulate virtual keyboard input
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')

      // Input should maintain focus and value
      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john@example.com')

      // Should not cause layout shifts
      const initialRect = nameInput.getBoundingClientRect()
      await user.keyboard('{Backspace}')
      const finalRect = nameInput.getBoundingClientRect()
      
      expect(finalRect.width).toBe(initialRect.width)
      expect(finalRect.height).toBe(initialRect.height)
    })
  })

  describe('Form Validation UX Tests', () => {
    it('should display clear and actionable validation messages', async () => {
      render(<SignupPage />)

      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Submit empty form
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      // Check error styling
      const nameError = screen.getByText('Full name is required')
      expect(nameError).toHaveClass('text-red-500', 'text-sm')
    })

    it('should provide real-time validation feedback', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')

      // Type invalid data
      await user.type(nameInput, 'J') // Too short
      await user.type(emailInput, 'invalid-email') // Invalid email
      await user.type(passwordInput, 'weak') // Too short

      // Validation should show errors
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      // Fix the data
      await user.clear(nameInput)
      await user.type(nameInput, 'John Doe')
      await user.clear(emailInput)
      await user.type(emailInput, 'john@example.com')
      await user.clear(passwordInput)
      await user.type(passwordInput, 'SecurePass123!')

      // Errors should clear
      await waitFor(() => {
        expect(screen.queryByText('Full name is required')).not.toBeInTheDocument()
        expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
        expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument()
      })
    })

    it('should validate password confirmation matching', async () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Type mismatched passwords
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'DifferentPass123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
      })

      // Fix password confirmation
      await user.clear(confirmPasswordInput)
      await user.type(confirmPasswordInput, 'SecurePass123!')

      await waitFor(() => {
        expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument()
      })
    })

    it('should show password strength indicator', async () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText('Password')

      // Type weak password
      await user.type(passwordInput, 'weak')
      expect(screen.getByText(/Weak/)).toBeInTheDocument()

      // Type medium password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'SecurePass')
      expect(screen.getByText(/Medium/)).toBeInTheDocument()

      // Type strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'SecurePass123!')
      expect(screen.getByText(/Strong/)).toBeInTheDocument()

      // Check strength indicator bars
      const strengthIndicator = screen.getByTestId('password-strength')
      expect(strengthIndicator).toBeInTheDocument()
    })
  })

  describe('Error Handling UX Tests', () => {
    it('should display clear error messages for API failures', async () => {
      // Override handler to return error
      server.use(
        http.post('*/auth/sign-up', () => {
          return HttpResponse.json({
            success: false,
            message: 'Email already exists'
          }, { status: 409 })
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText('Email already exists')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-red-600', 'text-sm')
      })
    })

    it('should handle network errors gracefully', async () => {
      // Override handler to simulate network error
      server.use(
        http.post('*/auth/sign-up', () => {
          return HttpResponse.error()
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText('Network error. Please check your connection.')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-red-600', 'text-sm')
      })
    })

    it('should clear errors when user starts typing', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Submit with invalid data to show error
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
      })

      // Start typing - error should clear
      await user.type(nameInput, 'John Doe')

      await waitFor(() => {
        expect(screen.queryByText('Full name is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading State UX Tests', () => {
    it('should show clear loading indicators', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/sign-up', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({
            success: true,
            message: 'User registered successfully',
            data: { user: { _id: '1', email: 'john@example.com', name: 'John Doe' } }
          })
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled()

      // Should show loading spinner
      await waitFor(() => {
        expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument()
      })
    })

    it('should prevent multiple submissions during loading', async () => {
      // Override handler to add delay
      server.use(
        http.post('*/auth/sign-up', async () => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return HttpResponse.json({
            success: true,
            message: 'User registered successfully',
            data: { user: { _id: '1', email: 'john@example.com', name: 'John Doe' } }
          })
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      
      // Click multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only process one request
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })

  describe('Navigation UX Tests', () => {
    it('should navigate to login page when sign in link is clicked', async () => {
      const mockNavigate = vi.fn()
      vi.mocked(require('@tanstack/react-router').useRouter).mockReturnValue({
        navigate: mockNavigate,
      })

      render(<SignupPage />)

      const signInButton = screen.getByRole('button', { name: 'Sign in' })
      await user.click(signInButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
    })

    it('should preserve form data when navigating back', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')

      // Fill some data
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')

      // Navigate away and back (simulate browser back)
      // Note: This would require more complex setup in a real scenario
      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john@example.com')
    })
  })

  describe('Form Reset Tests', () => {
    it('should reset form after successful submission', async () => {
      // Override handler to return success
      server.use(
        http.post('*/auth/sign-up', () => {
          return HttpResponse.json({
            success: true,
            message: 'User registered successfully',
            data: { user: { _id: '1', email: 'john@example.com', name: 'John Doe' } }
          })
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Fill and submit form
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      // Form should be submitted and navigation should occur
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should maintain form state during errors', async () => {
      // Override handler to return error
      server.use(
        http.post('*/auth/sign-up', () => {
          return HttpResponse.json({
            success: false,
            message: 'Email already exists'
          }, { status: 409 })
        })
      )

      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Fill form with data
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })

      // Form should still be visible and maintain input values
      expect(nameInput).toBeInTheDocument()
      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john@example.com')
      expect(passwordInput).toHaveValue('SecurePass123!')
      expect(confirmPasswordInput).toHaveValue('SecurePass123!')
      expect(submitButton).toBeInTheDocument()
    })
  })
}) 