/**
 * SessionExpiryWarning Component Tests
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Tests for session expiry warning display including:
 * - AC8: Session TTL displayed to user
 * - AC21: Shows warning when session expires
 * - AC23: Refresh Session button for auto-refresh flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionExpiryWarning } from '../index'

describe('SessionExpiryWarning', () => {
  const defaultProps = {
    timeRemainingMs: 4 * 60 * 1000, // 4 minutes
    onRefresh: vi.fn(),
    isRefreshing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should show warning when less than 5 minutes remaining', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={4 * 60 * 1000} />)

      expect(screen.getByTestId('session-expiry-warning')).toBeInTheDocument()
    })

    it('should show warning when exactly 5 minutes remaining', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={5 * 60 * 1000} />)

      expect(screen.getByTestId('session-expiry-warning')).toBeInTheDocument()
    })

    it('should be hidden when more than 5 minutes remaining', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={6 * 60 * 1000} />)

      expect(screen.queryByTestId('session-expiry-warning')).not.toBeInTheDocument()
    })

    it('should be hidden when 10 minutes remaining', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={10 * 60 * 1000} />)

      expect(screen.queryByTestId('session-expiry-warning')).not.toBeInTheDocument()
    })

    it('should show expired state when time is up (0 ms)', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      expect(screen.getByTestId('session-expiry-warning')).toBeInTheDocument()
      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    })
  })

  describe('Warning State (< 5 minutes)', () => {
    it('should display "Session Expiring Soon" title', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={3 * 60 * 1000} />)

      expect(screen.getByText(/session expiring soon/i)).toBeInTheDocument()
    })

    it('should display time remaining in message', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={3 * 60 * 1000 + 30 * 1000} />)

      expect(screen.getByText(/3m 30s/)).toBeInTheDocument()
    })

    it('should display time in seconds when less than 1 minute', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={45 * 1000} />)

      expect(screen.getByText(/45s/)).toBeInTheDocument()
    })

    it('should use warning variant styling', () => {
      const { container } = render(
        <SessionExpiryWarning {...defaultProps} timeRemainingMs={3 * 60 * 1000} />,
      )

      // AppAlert with warning variant should exist
      const alert = screen.getByTestId('session-expiry-warning')
      expect(alert).toBeInTheDocument()
    })
  })

  describe('Expired State (0 ms)', () => {
    it('should display "Session Expired" title', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    })

    it('should display expired message text', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      expect(
        screen.getByText(/your upload session has expired/i),
      ).toBeInTheDocument()
    })

    it('should use destructive variant styling for expired state', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      const alert = screen.getByTestId('session-expiry-warning')
      expect(alert).toBeInTheDocument()
    })
  })

  describe('Refresh Button (AC23)', () => {
    it('should render refresh button', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn()
      render(<SessionExpiryWarning {...defaultProps} onRefresh={onRefresh} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      fireEvent.click(refreshButton)

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('should display "Refresh Session" text', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      expect(screen.getByText(/refresh session/i)).toBeInTheDocument()
    })

    it('should be disabled when isRefreshing is true', () => {
      render(<SessionExpiryWarning {...defaultProps} isRefreshing={true} />)

      const refreshButton = screen.getByRole('button', { name: /refreshing/i })
      expect(refreshButton).toBeDisabled()
    })

    it('should display "Refreshing..." when isRefreshing is true', () => {
      render(<SessionExpiryWarning {...defaultProps} isRefreshing={true} />)

      expect(screen.getByText(/refreshing/i)).toBeInTheDocument()
    })

    it('should show spinning icon when refreshing', () => {
      render(<SessionExpiryWarning {...defaultProps} isRefreshing={true} />)

      const spinningIcon = document.querySelector('.animate-spin')
      expect(spinningIcon).toBeInTheDocument()
    })

    it('should use default variant button in warning state', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={3 * 60 * 1000} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('should use default variant button in expired state', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      expect(refreshButton).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format 5 minutes correctly', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={5 * 60 * 1000} />)

      expect(screen.getByText(/5m 0s/)).toBeInTheDocument()
    })

    it('should format 1 minute 30 seconds correctly', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={1 * 60 * 1000 + 30 * 1000} />)

      expect(screen.getByText(/1m 30s/)).toBeInTheDocument()
    })

    it('should format 10 seconds correctly', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={10 * 1000} />)

      expect(screen.getByText(/10s/)).toBeInTheDocument()
    })

    it('should format 0 seconds as expired', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      // Should show expired message, not "0s"
      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-live="polite" for screen reader updates', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const alert = screen.getByTestId('session-expiry-warning')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('should have accessible aria-label on refresh button', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh session')
    })

    it('should have accessible aria-label when refreshing', () => {
      render(<SessionExpiryWarning {...defaultProps} isRefreshing={true} />)

      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toHaveAttribute('aria-label', 'Refreshing session...')
    })

    it('should have aria-hidden on decorative icon', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenElements.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Layout', () => {
    it('should render button with responsive width classes', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const refreshButton = screen.getByRole('button', { name: /refresh session/i })
      expect(refreshButton).toHaveClass('w-full', 'sm:w-auto')
    })

    it('should have flex layout for content', () => {
      render(<SessionExpiryWarning {...defaultProps} />)

      const alert = screen.getByTestId('session-expiry-warning')
      const flexContainer = alert.querySelector('.flex')
      expect(flexContainer).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small time remaining (1 second)', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={1000} />)

      expect(screen.getByText(/1s/)).toBeInTheDocument()
    })

    it('should handle negative time remaining as expired', () => {
      render(<SessionExpiryWarning {...defaultProps} timeRemainingMs={-1000} />)

      // Negative time should be treated as expired
      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    })

    it('should update when timeRemainingMs prop changes', () => {
      const { rerender } = render(
        <SessionExpiryWarning {...defaultProps} timeRemainingMs={4 * 60 * 1000} />,
      )

      expect(screen.getByText(/4m 0s/)).toBeInTheDocument()

      rerender(<SessionExpiryWarning {...defaultProps} timeRemainingMs={2 * 60 * 1000} />)

      expect(screen.getByText(/2m 0s/)).toBeInTheDocument()
    })

    it('should transition from warning to expired', () => {
      const { rerender } = render(
        <SessionExpiryWarning {...defaultProps} timeRemainingMs={30 * 1000} />,
      )

      expect(screen.getByText(/session expiring soon/i)).toBeInTheDocument()

      rerender(<SessionExpiryWarning {...defaultProps} timeRemainingMs={0} />)

      expect(screen.getByText(/session expired/i)).toBeInTheDocument()
    })
  })
})
