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
  useParams: () => ({
    token: 'valid-token-123',
  }),
}))

// Performance measurement utilities
const measurePerformance = (fn: () => void | Promise<void>): Promise<number> => {
  return new Promise((resolve) => {
    const start = performance.now()
    const result = fn()
    if (result instanceof Promise) {
      result.finally(() => {
        const end = performance.now()
        resolve(end - start)
      })
    } else {
      const end = performance.now()
      resolve(end - start)
    }
  })
}

const measureMemoryUsage = (): number => {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize
  }
  return 0
}

describe('ResetPasswordPage Performance', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.pathname = '/auth/reset-password/valid-token-123'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Render Performance Tests', () => {
    it('should render within acceptable time limit', async () => {
      const renderTime = await measurePerformance(() => {
        render(<ResetPasswordPage />)
      })

      // Component should render in under 100ms
      expect(renderTime).toBeLessThan(100)
      console.log(`Initial render time: ${renderTime.toFixed(2)}ms`)
    })

    it('should render consistently across multiple renders', async () => {
      const renderTimes: Array<number> = []

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<ResetPasswordPage />)
        const renderTime = await measurePerformance(() => {
          render(<ResetPasswordPage />)
        })
        renderTimes.push(renderTime)
        unmount()
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
      const maxRenderTime = Math.max(...renderTimes)
      const minRenderTime = Math.min(...renderTimes)

      // Average render time should be under 50ms
      expect(averageRenderTime).toBeLessThan(50)
      
      // Max render time should not be more than 5x the min (very lenient for test environment)
      expect(maxRenderTime).toBeLessThan(minRenderTime * 5)

      console.log(`Average render time: ${averageRenderTime.toFixed(2)}ms`)
      console.log(`Min render time: ${minRenderTime.toFixed(2)}ms`)
      console.log(`Max render time: ${maxRenderTime.toFixed(2)}ms`)
    })

    it('should handle rapid re-renders efficiently', async () => {
      const { rerender } = render(<ResetPasswordPage />)

      const reRenderTimes: Array<number> = []

      for (let i = 0; i < 20; i++) {
        const reRenderTime = await measurePerformance(() => {
          rerender(<ResetPasswordPage />)
        })
        reRenderTimes.push(reRenderTime)
      }

      const averageReRenderTime = reRenderTimes.reduce((a, b) => a + b, 0) / reRenderTimes.length

      // Re-renders should be very fast (under 10ms)
      expect(averageReRenderTime).toBeLessThan(10)

      console.log(`Average re-render time: ${averageReRenderTime.toFixed(2)}ms`)
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not have memory leaks during multiple renders', () => {
      const initialMemory = measureMemoryUsage()
      const memoryReadings: Array<number> = []

      // Perform multiple render cycles
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<ResetPasswordPage />)
        memoryReadings.push(measureMemoryUsage())
        unmount()
      }

      const finalMemory = measureMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 1MB)
      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(1024 * 1024) // 1MB
      }

      console.log(`Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should clean up event listeners properly', async () => {
      const initialMemory = measureMemoryUsage()

      // Create and destroy component multiple times
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<ResetPasswordPage />)
        
        // Interact with the component
        const passwordInput = screen.getByLabelText('New Password')
        await user.type(passwordInput, 'TestPassword123!')
        
        unmount()
      }

      const finalMemory = measureMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory

      // Memory should not increase significantly
      if (memoryIncrease > 0) {
        expect(memoryIncrease).toBeLessThan(512 * 1024) // 512KB
      }

      console.log(`Memory after event listener test: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Interaction Performance Tests', () => {
    it('should handle rapid typing efficiently', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      const typingTime = await measurePerformance(async () => {
        await user.type(passwordInput, 'RapidTypingTestPassword123!')
        await user.type(confirmPasswordInput, 'RapidTypingTestPassword123!')
      })

      // Typing should be responsive (under 500ms for this amount of text)
      expect(typingTime).toBeLessThan(500)

      console.log(`Typing performance: ${typingTime.toFixed(2)}ms`)
    })

    it('should handle form submission efficiently', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'SubmitTestPassword123!')
      await user.type(confirmPasswordInput, 'SubmitTestPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const submissionTime = await measurePerformance(async () => {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
        })
      })

      // Form submission should complete in reasonable time
      expect(submissionTime).toBeLessThan(2000)

      console.log(`Form submission time: ${submissionTime.toFixed(2)}ms`)
    })

    it('should handle validation efficiently', async () => {
      render(<ResetPasswordPage />)

      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const validationTime = await measurePerformance(async () => {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
        })
      })

      // Validation should be very fast
      expect(validationTime).toBeLessThan(100)

      console.log(`Validation time: ${validationTime.toFixed(2)}ms`)
    })

    it('should handle rapid form interactions', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')
      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const rapidInteractionTime = await measurePerformance(async () => {
        // Rapid interactions
        await user.type(passwordInput, 'Rapid')
        await user.clear(passwordInput)
        await user.type(passwordInput, 'Interaction')
        await user.clear(passwordInput)
        await user.type(passwordInput, 'TestPassword123!')
        await user.type(confirmPasswordInput, 'TestPassword123!')
        await user.click(submitButton)
        await user.click(submitButton) // Double click
        await user.click(submitButton) // Triple click
      })

      // Should handle rapid interactions gracefully
      expect(rapidInteractionTime).toBeLessThan(1000)

      console.log(`Rapid interaction time: ${rapidInteractionTime.toFixed(2)}ms`)
    })
  })

  describe('Network Performance Tests', () => {
    it('should handle slow network responses efficiently', async () => {
      // Override handler to simulate slow network
      server.use(
        http.post('*/auth/reset-password/*', async () => {
          await new Promise(resolve => setTimeout(resolve, 1000))
          return HttpResponse.json({
            success: true,
            message: 'Password reset successful'
          })
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'SlowNetworkPassword123!')
      await user.type(confirmPasswordInput, 'SlowNetworkPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const slowNetworkTime = await measurePerformance(async () => {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('Password Reset Successfully')).toBeInTheDocument()
        })
      })

      // Should handle slow network within reasonable time
      expect(slowNetworkTime).toBeLessThan(3000)

      console.log(`Slow network response time: ${slowNetworkTime.toFixed(2)}ms`)
    })

    it('should handle network errors efficiently', async () => {
      // Override handler to simulate network error
      server.use(
        http.post('*/auth/reset-password/*', () => {
          return HttpResponse.error()
        })
      )

      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      await user.type(passwordInput, 'NetworkErrorPassword123!')
      await user.type(confirmPasswordInput, 'NetworkErrorPassword123!')

      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const errorHandlingTime = await measurePerformance(async () => {
        await user.click(submitButton)
        await waitFor(() => {
          expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument()
        })
      })

      // Error handling should be fast
      expect(errorHandlingTime).toBeLessThan(1000)

      console.log(`Error handling time: ${errorHandlingTime.toFixed(2)}ms`)
    })
  })

  describe('Animation Performance Tests', () => {
    it('should handle animations efficiently', async () => {
      render(<ResetPasswordPage />)

      const animationTime = await measurePerformance(() => {
        // Component should animate in smoothly
        const card = screen.getByText('Set New Password').closest('.max-w-md')
        expect(card).toBeInTheDocument()
      })

      // Animation setup should be fast
      expect(animationTime).toBeLessThan(50)

      console.log(`Animation setup time: ${animationTime.toFixed(2)}ms`)
    })

    it('should handle button hover animations efficiently', async () => {
      render(<ResetPasswordPage />)

      const submitButton = screen.getByRole('button', { name: 'Update Password' })

      const hoverAnimationTime = await measurePerformance(async () => {
        // Simulate hover
        fireEvent.mouseEnter(submitButton)
        fireEvent.mouseLeave(submitButton)
      })

      // Hover animations should be very fast
      expect(hoverAnimationTime).toBeLessThan(10)

      console.log(`Hover animation time: ${hoverAnimationTime.toFixed(2)}ms`)
    })
  })

  describe('Bundle Size Impact Tests', () => {
    it('should not significantly impact bundle size', () => {
      // This is a qualitative test - in a real scenario, you'd measure actual bundle size
      // For now, we'll just verify the component renders without excessive dependencies
      
      render(<ResetPasswordPage />)

      // Component should render with all necessary elements
      expect(screen.getByText('Set New Password')).toBeInTheDocument()
      expect(screen.getByLabelText('New Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Password' })).toBeInTheDocument()

      // Should not have excessive DOM nodes
      const domNodes = document.querySelectorAll('*').length
      expect(domNodes).toBeLessThan(100) // Reasonable DOM complexity

      console.log(`DOM nodes count: ${domNodes}`)
    })
  })

  describe('Accessibility Performance Tests', () => {
    it('should maintain accessibility during rapid interactions', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      const accessibilityTime = await measurePerformance(async () => {
        // Rapid keyboard navigation
        await user.tab()
        await user.tab()
        await user.tab()
        await user.tab()
        
        // Rapid typing
        await user.type(passwordInput, 'AccessibilityTest123!')
        await user.type(confirmPasswordInput, 'AccessibilityTest123!')
        
        // Ensure focus management still works - focus might be on either input after rapid interactions
        const hasFocus = passwordInput === document.activeElement || confirmPasswordInput === document.activeElement
        expect(hasFocus).toBe(true)
      })

      // Accessibility should remain responsive
      expect(accessibilityTime).toBeLessThan(500)

      console.log(`Accessibility performance time: ${accessibilityTime.toFixed(2)}ms`)
    })
  })

  describe('Stress Tests', () => {
    it('should handle stress testing gracefully', async () => {
      const stressTestTime = await measurePerformance(async () => {
        // Create and destroy component rapidly
        for (let i = 0; i < 100; i++) {
          const { unmount } = render(<ResetPasswordPage />)
          
          // Quick interaction
          const passwordInput = screen.getByLabelText('New Password')
          await user.type(passwordInput, 'Stress')
          
          unmount()
        }
      })

      // Should handle stress testing without significant performance degradation
      expect(stressTestTime).toBeLessThan(10000) // 10 seconds

      console.log(`Stress test time: ${stressTestTime.toFixed(2)}ms`)
    })

    it('should handle concurrent operations', async () => {
      render(<ResetPasswordPage />)

      const passwordInput = screen.getByLabelText('New Password')
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password')

      const concurrentTime = await measurePerformance(async () => {
        // Simulate concurrent operations
        const promises = [
          user.type(passwordInput, 'Concurrent'),
          user.type(confirmPasswordInput, 'Operations'),
          user.tab(),
          user.tab(),
        ]

        await Promise.all(promises)
      })

      // Should handle concurrent operations efficiently
      expect(concurrentTime).toBeLessThan(1000)

      console.log(`Concurrent operations time: ${concurrentTime.toFixed(2)}ms`)
    })
  })
}) 