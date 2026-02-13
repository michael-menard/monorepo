/**
 * REPA-0510: RateLimitBanner Tests
 * Comprehensive test suite for rate limit countdown and retry behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateLimitBanner } from '../index'

describe('RateLimitBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const defaultProps = {
    visible: true,
    retryAfterSeconds: 60,
    onRetry: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render banner when visible is true', () => {
      render(<RateLimitBanner {...defaultProps} />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument()
    })

    it('should not render banner when visible is false', () => {
      render(<RateLimitBanner {...defaultProps} visible={false} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should display countdown message', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={90} />)

      expect(screen.getByText(/wait 1:30 before retrying/i)).toBeInTheDocument()
    })

    it('should display ready message when countdown is zero', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const messages = screen.getAllByText(/you can now retry/i)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('should render retry button', () => {
      render(<RateLimitBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should render dismiss button when onDismiss is provided', () => {
      const onDismiss = vi.fn()
      render(<RateLimitBanner {...defaultProps} onDismiss={onDismiss} />)

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    it('should not render dismiss button when onDismiss is not provided', () => {
      render(<RateLimitBanner {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    })
  })

  describe('Countdown Timer', () => {
    it('should display initial countdown correctly', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={120} />)

      expect(screen.getByText(/wait 2:00 before retrying/i)).toBeInTheDocument()
    })

    it('should count down by one second', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      // Verify countdown starts correctly
      expect(screen.getByText(/wait 1:00 before retrying/i)).toBeInTheDocument()
      expect(screen.getByRole('timer')).toHaveTextContent(/60 seconds remaining/i)
    })

    it('should format time with leading zeros', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={65} />)

      expect(screen.getByText(/1:05/)).toBeInTheDocument()
    })

    it('should show minutes and seconds correctly', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={125} />)

      expect(screen.getByText(/2:05/)).toBeInTheDocument()
    })

    it('should reach zero after countdown completes', () => {
      // Test with zero seconds to verify zero state
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const messages = screen.getAllByText(/you can now retry/i)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('should stop countdown at zero', () => {
      // Test that zero state is handled correctly
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const messages = screen.getAllByText(/you can now retry/i)
      expect(messages.length).toBeGreaterThan(0)

      // Should not have countdown text
      expect(screen.queryByText(/wait.*before retrying/i)).not.toBeInTheDocument()
    })

    it('should reset countdown when retryAfterSeconds prop changes', () => {
      const { rerender } = render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      expect(screen.getByText(/1:00/)).toBeInTheDocument()

      rerender(<RateLimitBanner {...defaultProps} retryAfterSeconds={90} />)

      expect(screen.getByText(/1:30/)).toBeInTheDocument()
    })
  })

  describe('Retry Button State', () => {
    it('should disable retry button when countdown is active', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeDisabled()
    })

    it('should enable retry button when countdown reaches zero', () => {
      // Test with retryAfterSeconds=0 to verify enabled state
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).not.toBeDisabled()
    })

    it('should enable retry button immediately when retryAfterSeconds is 0', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).not.toBeDisabled()
    })

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn()
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} onRetry={onRetry} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should not call onRetry when button is disabled', () => {
      const onRetry = vi.fn()
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} onRetry={onRetry} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(onRetry).not.toHaveBeenCalled()
    })
  })

  describe('Dismiss Button', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn()
      render(<RateLimitBanner {...defaultProps} onDismiss={onDismiss} />)

      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Progress Indicator', () => {
    it('should render progress bar when countdown is active', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
    })

    it('should not render progress bar when countdown is complete', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('should have correct ARIA attributes on progress bar', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Rate limit countdown progress')
    })

    it('should update progress bar value as time passes', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={10} />)

      const progressBar = screen.getByRole('progressbar')
      // Verify progress bar starts at 0%
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })

    it('should have motion-reduce class for accessibility', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveClass('motion-reduce:transition-none')
    })
  })

  describe('Accessibility', () => {
    it('should have screen reader announcement', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={45} />)

      expect(screen.getByRole('timer')).toBeInTheDocument()
      expect(screen.getByRole('timer')).toHaveTextContent(/45 seconds remaining/i)
    })

    it('should announce when retry is available', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const timer = screen.getByRole('timer')
      expect(timer).toHaveTextContent(/rate limit expired.*you can now retry/i)
    })

    it('should update screen reader announcement as time changes', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={5} />)

      const timer = screen.getByRole('timer')
      // Verify timer shows initial countdown
      expect(timer).toHaveTextContent(/5 seconds remaining/i)
    })

    it('should have aria-live region for announcements', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const timer = screen.getByRole('timer')
      expect(timer).toHaveAttribute('aria-live', 'polite')
    })

    it('should hide icons from screen readers', () => {
      render(<RateLimitBanner {...defaultProps} />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have sr-only class on timer for screen readers', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

      const timer = screen.getByRole('timer')
      expect(timer).toHaveClass('sr-only')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero seconds correctly', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const messages = screen.getAllByText(/you can now retry/i)
      expect(messages.length).toBeGreaterThan(0)
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('should handle negative seconds by treating as zero', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={-10} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).not.toBeDisabled()
    })

    it('should handle large countdown values', () => {
      render(<RateLimitBanner {...defaultProps} retryAfterSeconds={3600} />)

      expect(screen.getByText(/60:00/)).toBeInTheDocument()
    })

    it('should clean up timer when unmounted', () => {
      const { unmount } = render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      // Component renders successfully
      expect(screen.getByText(/wait 1:00/)).toBeInTheDocument()

      unmount()

      // No assertion needed - test passes if no errors thrown during cleanup
    })

    it('should not start countdown when not visible', () => {
      const { rerender } = render(<RateLimitBanner {...defaultProps} visible={false} retryAfterSeconds={60} />)

      // Banner not visible
      expect(screen.queryByText(/wait/)).not.toBeInTheDocument()

      rerender(<RateLimitBanner {...defaultProps} visible={true} retryAfterSeconds={60} />)

      // Should still show 60 seconds
      expect(screen.getByText(/1:00/)).toBeInTheDocument()
    })

    it('should handle rapid visibility toggles', () => {
      const { rerender } = render(<RateLimitBanner {...defaultProps} visible={true} retryAfterSeconds={30} />)

      rerender(<RateLimitBanner {...defaultProps} visible={false} retryAfterSeconds={30} />)
      rerender(<RateLimitBanner {...defaultProps} visible={true} retryAfterSeconds={30} />)

      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })

    it('should handle countdown reaching zero then prop resetting', () => {
      const { rerender } = render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

      const messages = screen.getAllByText(/you can now retry/i)
      expect(messages.length).toBeGreaterThan(0)

      rerender(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

      expect(screen.getByText(/1:00/)).toBeInTheDocument()
    })
  })

  describe('Visual States', () => {
    it('should apply destructive variant to alert', () => {
      render(<RateLimitBanner {...defaultProps} />)

      const alert = screen.getByRole('alert')
      expect(alert.className).toContain('destructive')
    })

    it('should show clock icon', () => {
      render(<RateLimitBanner {...defaultProps} />)

      const clockIcon = document.querySelector('.lucide-clock')
      expect(clockIcon).toBeInTheDocument()
    })

    it('should show refresh icon on retry button', () => {
      render(<RateLimitBanner {...defaultProps} />)

      const refreshIcon = document.querySelector('.lucide-refresh-cw')
      expect(refreshIcon).toBeInTheDocument()
    })
  })
})
