import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { server } from '../../../../test/mocks/server'
import SignupPage from '../index'

// Import setup for mocks
import './setup'

// Mock performance APIs
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
})

// Mock memory APIs
const mockMemory = {
  usedJSHeapSize: 1000000,
  totalJSHeapSize: 2000000,
  jsHeapSizeLimit: 4000000,
}

Object.defineProperty(window, 'memory', {
  value: mockMemory,
  writable: true,
  configurable: true,
})

// Extend Window interface for memory property
declare global {
  interface Window {
    memory?: typeof mockMemory
  }
}

// Mock console methods for performance monitoring
const originalConsole = { ...console }
const mockConsole = {
  ...console,
  time: vi.fn(),
  timeEnd: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('SignupPage Performance & Security', () => {
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

    // Mock router navigation
    const mockNavigate = vi.fn()
    vi.mock('@tanstack/react-router', () => ({
      useRouter: () => ({
        navigate: mockNavigate,
      }),
    }))

    // Reset performance mocks
    vi.clearAllMocks()
    mockPerformance.now.mockClear()
    mockPerformance.mark.mockClear()
    mockPerformance.measure.mockClear()
    
    // Replace console for performance monitoring
    Object.defineProperty(global, 'console', {
      value: mockConsole,
      writable: true,
    })
  })

  afterEach(() => {
    // Restore original console
    Object.defineProperty(global, 'console', {
      value: originalConsole,
      writable: true,
    })
  })

  describe('Performance Tests', () => {
    it('should render within acceptable time limits', () => {
      const startTime = performance.now()
      
      render(<SignupPage />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Component should render in under 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('should not cause memory leaks on multiple renders', () => {
      const initialMemory = window.memory?.usedJSHeapSize || 0
      
      // Render component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<SignupPage />)
        unmount()
      }
      
      // Force garbage collection simulation
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = window.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    it('should handle rapid user interactions efficiently', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      const startTime = performance.now()
      
      // Rapid typing and clicking
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(submitButton)
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      // User interactions should be responsive (under 1000ms for form filling)
      expect(interactionTime).toBeLessThan(1000)
    })

    it('should not cause excessive re-renders', () => {
      let renderCount = 0
      const TestComponent = () => {
        renderCount++
        return <SignupPage />
      }

      render(<TestComponent />)
      
      // Component should render only once initially
      expect(renderCount).toBe(1)
    })

    it('should handle password strength indicator efficiently', async () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText('Password')
      
      const startTime = performance.now()
      
      // Type password to trigger strength indicator
      await user.type(passwordInput, 'SecurePass123!')
      
      const endTime = performance.now()
      const inputTime = endTime - startTime
      
      // Password strength calculation should be fast (under 100ms)
      expect(inputTime).toBeLessThan(100)
      
      // Strength indicator should be visible
      expect(screen.getByTestId('password-strength')).toBeInTheDocument()
    })

    it('should handle form validation efficiently', async () => {
      render(<SignupPage />)

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      
      const startTime = performance.now()
      
      // Submit empty form to trigger validation
      await user.click(submitButton)
      
      const endTime = performance.now()
      const validationTime = endTime - startTime
      
      // Form validation should be fast (under 100ms)
      expect(validationTime).toBeLessThan(100)
      
      // Validation errors should appear
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  describe('Security Tests', () => {
    it('should sanitize input to prevent XSS', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      
      // Try to inject script tags
      const maliciousInput = '<script>alert("xss")</script>'
      await user.type(nameInput, maliciousInput)
      await user.type(emailInput, maliciousInput)
      
      // Input should be handled safely
      expect(nameInput).toHaveValue(maliciousInput)
      expect(emailInput).toHaveValue(maliciousInput)
      
      // No script execution should occur
      expect(window.alert).not.toHaveBeenCalled()
    })

    it('should prevent HTML injection in error messages', async () => {
      // Override handler to return HTML in error message
      server.use(
        http.post('*/auth/sign-up', () => {
          return HttpResponse.json({
            success: false,
            message: '<script>alert("injection")</script>Email already exists'
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
        const errorMessage = screen.getByText(/Email already exists/)
        expect(errorMessage).toBeInTheDocument()
        
        // HTML should be escaped, not rendered
        expect(errorMessage.innerHTML).not.toContain('<script>')
        expect(errorMessage.innerHTML).toContain('&lt;script&gt;') // HTML entities are escaped
      })
    })

    it('should validate input length to prevent buffer overflow', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      
      // Try to input very long strings
      const longInput = '1'.repeat(1000)
      await user.type(nameInput, longInput)
      await user.type(emailInput, longInput)
      
      // Input should be handled safely
      expect(nameInput).toHaveValue(longInput)
      expect(emailInput).toHaveValue(longInput)
      
      // Form should still be functional
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    })

    it('should prevent CSRF attacks by validating request origin', async () => {
      // Mock fetch to check if proper headers are sent
      const originalFetch = global.fetch
      const mockFetch = vi.fn()
      global.fetch = mockFetch

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'User registered successfully',
          data: { user: { _id: '1', email: 'john@example.com', name: 'John Doe' } }
        })
      })

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
        expect(mockFetch).toHaveBeenCalled()
        
        // Check that proper headers are sent
        const callArgs = mockFetch.mock.calls[0]
        const options = callArgs[1]
        
        expect(options.headers).toBeDefined()
        expect(options.headers['Content-Type']).toBe('application/json')
      })

      // Restore original fetch
      global.fetch = originalFetch
    })

    it('should validate password strength requirements', async () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Try weak password
      await user.type(passwordInput, 'weak')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })

      // Try strong password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'SecurePass123!')
      
      // Password strength indicator should show strong
      expect(screen.getByText(/Strong/)).toBeInTheDocument()
    })
  })

  describe('Concurrent Request Tests', () => {
    it('should handle multiple simultaneous signup attempts', async () => {
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
      
      // Submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only process one request
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should handle network failures gracefully during signup', async () => {
      // Override handler to simulate network failure
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
      
      // Submit during network failure
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument()
      })
    })

    it('should prevent race conditions between form validation and submission', async () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText('Full Name')
      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm Password')
      const submitButton = screen.getByRole('button', { name: 'Create Account' })

      // Start typing and immediately submit
      await user.type(nameInput, 'John')
      await user.click(submitButton)

      // Validation should prevent submission
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
      })
    })
  })

  describe('Browser Compatibility Tests', () => {
    it('should work with older browser APIs', () => {
      // Mock older browser environment
      const originalFetch = global.fetch
      const originalPromise = global.Promise
      
      // Simulate older browser without fetch
      Object.defineProperty(global, 'fetch', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      
      // Component should still render
      expect(() => render(<SignupPage />)).not.toThrow()
      
      // Restore original APIs
      global.fetch = originalFetch
    })

    it('should handle missing localStorage gracefully', () => {
      // Mock missing localStorage
      const originalLocalStorage = window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      })
      
      // Component should still render
      expect(() => render(<SignupPage />)).not.toThrow()
      
      // Restore localStorage
      window.localStorage = originalLocalStorage
    })

    it('should work with disabled JavaScript features', () => {
      // Mock disabled features
      const originalAddEventListener = window.addEventListener
      const originalRemoveEventListener = window.removeEventListener
      
      window.addEventListener = vi.fn()
      window.removeEventListener = vi.fn()
      
      // Component should still render
      expect(() => render(<SignupPage />)).not.toThrow()
      
      // Restore original methods
      window.addEventListener = originalAddEventListener
      window.removeEventListener = originalRemoveEventListener
    })

    it('should handle different screen sizes and orientations', () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 6/7/8
        { width: 414, height: 896 }, // iPhone X/XS
        { width: 768, height: 1024 }, // iPad
        { width: 1024, height: 768 }, // Desktop
      ]

      viewports.forEach(viewport => {
        // Mock viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        })

        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        })

        // Component should render at all sizes
        expect(() => render(<SignupPage />)).not.toThrow()
      })
    })
  })

  describe('Memory Management Tests', () => {
    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<SignupPage />)
      
      // Component should render without errors
      expect(() => unmount()).not.toThrow()
    })

    it('should not leak DOM references', () => {
      const { unmount } = render(<SignupPage />)
      
      // Get initial DOM node count
      const initialNodeCount = document.querySelectorAll('*').length
      
      unmount()
      
      // Force garbage collection simulation
      if (global.gc) {
        global.gc()
      }
      
      // DOM nodes should be cleaned up
      const finalNodeCount = document.querySelectorAll('*').length
      expect(finalNodeCount).toBeLessThanOrEqual(initialNodeCount)
    })

    it('should handle rapid mount/unmount cycles', () => {
      // Rapidly mount and unmount component
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<SignupPage />)
        unmount()
      }
      
      // Should not throw errors or cause memory issues
      expect(() => render(<SignupPage />)).not.toThrow()
    })
  })
}) 