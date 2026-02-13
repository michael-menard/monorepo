/**
 * RateLimitBanner Tests
 * BUGF-013 Phase 1: Error Handling Components
 *
 * Tests for rate limit banner with countdown timer (429 errors).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateLimitBanner } from '../index'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
}))

describe('RateLimitBanner', () => {
  const mockOnRetry = vi.fn()
  const mockOnDismiss = vi.fn()

  const defaultProps = {
    visible: true,
    retryAfterSeconds: 60,
    onRetry: mockOnRetry,
    onDismiss: mockOnDismiss,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render when visible is true', () => {
      render(<RateLimitBanner {...defaultProps} />)

      expect(screen.getByText(/Rate Limit Exceeded/i)).toBeInTheDocument()
    })

    it('should not render when visible is false', () => {
      render(<RateLimitBanner {...defaultProps} visible={false} />)

      expect(screen.queryByText(/Rate Limit Exceeded/i)).not.toBeInTheDocument()
    })

    it('should display countdown timer in MM:SS format', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={90} />)

      expect(screen.getByText(/1:30/)).toBeInTheDocument()
    })

    it('should format countdown correctly (60s -> 1:00, 90s -> 1:30)', () => {
      const { rerender } = render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)
      expect(screen.getByText(/1:00/)).toBeInTheDocument()

      rerender(<RateLimitBanner {...defaultProps} retryAfterSeconds={90} />)
      expect(screen.getByText(/1:30/)).toBeInTheDocument()

      rerender(<RateLimitBanner {...defaultProps} retryAfterSeconds={125} />)
      expect(screen.getByText(/2:05/)).toBeInTheDocument()
    })
  })

  describe('Countdown Timer', () => {
    it('should decrement countdown every second', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={3} />)

      // Initial: 3 seconds (0:03)
      expect(screen.getByText(/0:03/)).toBeInTheDocument()

      // After 1 second: 2 seconds (0:02)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText(/0:02/)).toBeInTheDocument()

      // After 2 seconds: 1 second (0:01)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText(/0:01/)).toBeInTheDocument()

      // After 3 seconds: 0 seconds - retry becomes available
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // Check the retry button is now enabled (countdown reached zero)
      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).not.toBeDisabled()
    })

    it('should disable retry button during countdown', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={5} />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeDisabled()
    })

    it('should enable retry button when countdown reaches zero', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={2} />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeDisabled()

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(retryButton).not.toBeDisabled()
    })
  })

  describe('User Interactions', () => {
    it('should call onRetry when retry button clicked and enabled', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={1} />)

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeDisabled()

      // Advance timer to enable button
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(retryButton).not.toBeDisabled()

      // Use fireEvent instead of userEvent (fake timers conflict with userEvent)
      retryButton.click()

      expect(mockOnRetry).toHaveBeenCalled()
    })

    it('should call onDismiss when dismiss button clicked', () => {
      render(<RateLimitBanner {...defaultProps} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss/i })

      // Use fireEvent instead of userEvent (fake timers conflict with userEvent)
      dismissButton.click()

      expect(mockOnDismiss).toHaveBeenCalled()
    })
  })

  describe('Progress Indicator', () => {
    it('should show progress bar with correct percentage', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={100} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should have progressbar role with aria-valuenow, aria-valuemin, aria-valuemax', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Rate limit countdown progress')
    })
  })

  describe('Accessibility', () => {
    it('should have timer role with aria-live="polite" for screen readers', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const timer = screen.getByRole('timer')
      expect(timer).toBeInTheDocument()
      expect(timer).toHaveAttribute('aria-live', 'polite')
    })

    it('should announce countdown updates to screen readers', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={5} />)

      const timer = screen.getByRole('timer')
      expect(timer).toHaveTextContent(/5 seconds remaining/i)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(timer).toHaveTextContent(/4 seconds remaining/i)
    })

    it('should announce when retry is available', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={1} />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const timer = screen.getByRole('timer')
      expect(timer).toHaveTextContent(/Rate limit expired.*You can now retry/i)
    })
  })
})
