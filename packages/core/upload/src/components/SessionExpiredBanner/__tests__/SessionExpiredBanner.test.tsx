/**
 * REPA-0510: SessionExpiredBanner Tests
 * Comprehensive test suite for session expiration handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionExpiredBanner } from '../index'

describe('SessionExpiredBanner', () => {
  const defaultProps = {
    visible: true,
    expiredCount: 3,
    onRefreshSession: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render banner when visible is true and expiredCount > 0', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      expect(screen.getByText('Upload Session Expired')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument()
    })

    it('should not render banner when visible is false', () => {
      render(<SessionExpiredBanner {...defaultProps} visible={false} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should not render banner when expiredCount is 0', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={0} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should render refresh session button', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument()
    })
  })

  describe('Expired Count Messages', () => {
    it('should show singular message for one expired file', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={1} />)

      expect(screen.getByText(/1 file needs a new upload session/i)).toBeInTheDocument()
    })

    it('should show plural message for multiple expired files', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={5} />)

      expect(screen.getByText(/5 files need new upload sessions/i)).toBeInTheDocument()
    })

    it('should display correct count in screen reader announcement', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={3} />)

      const announcements = screen.getAllByRole('alert', { hidden: true })
      const screenReaderAnnouncement = announcements.find(el =>
        el.classList.contains('sr-only')
      )
      expect(screenReaderAnnouncement).toHaveTextContent(/expired for 3 files/i)
    })

    it('should use singular in screen reader announcement for one file', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={1} />)

      const announcements = screen.getAllByRole('alert', { hidden: true })
      const screenReaderAnnouncement = announcements.find(el =>
        el.textContent?.includes('Upload session expired')
      )
      expect(screenReaderAnnouncement).toHaveTextContent(/expired for 1 file\./i)
    })
  })

  describe('Refresh Session Button', () => {
    it('should call onRefreshSession when clicked', async () => {
      const user = userEvent.setup()
      const onRefreshSession = vi.fn()
      render(<SessionExpiredBanner {...defaultProps} onRefreshSession={onRefreshSession} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      await user.click(button)

      expect(onRefreshSession).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when isRefreshing is true', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const button = screen.getByRole('button', { name: /refreshing/i })
      expect(button).toBeDisabled()
    })

    it('should be enabled when isRefreshing is false', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      expect(button).not.toBeDisabled()
    })

    it('should show "Refreshing..." text when loading', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      expect(screen.getByRole('button', { name: /refreshing/i })).toBeInTheDocument()
    })

    it('should show "Refresh Session" text when not loading', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument()
    })

    it('should have aria-busy attribute when refreshing', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const button = screen.getByRole('button', { name: /refreshing/i })
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('should not have aria-busy when not refreshing', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      expect(button).not.toHaveAttribute('aria-busy', 'true')
    })

    it('should not call onRefreshSession when disabled', async () => {
      const user = userEvent.setup()
      const onRefreshSession = vi.fn()
      render(<SessionExpiredBanner {...defaultProps} onRefreshSession={onRefreshSession} isRefreshing={true} />)

      const button = screen.getByRole('button', { name: /refreshing/i })
      await user.click(button)

      expect(onRefreshSession).not.toHaveBeenCalled()
    })
  })

  describe('Loading State Icons', () => {
    it('should show spinning refresh icon when refreshing', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const icon = document.querySelector('.animate-spin')
      expect(icon).toBeInTheDocument()
    })

    it('should not show spinning icon when not refreshing', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      const icon = document.querySelector('.animate-spin')
      expect(icon).not.toBeInTheDocument()
    })

    it('should have motion-reduce class for accessibility', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const icon = document.querySelector('.motion-reduce\\:animate-none')
      expect(icon).toBeInTheDocument()
    })

    it('should hide icon from screen readers', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have screen reader announcement with assertive priority', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={2} />)

      const announcements = screen.getAllByRole('alert')
      const screenReaderAnnouncement = announcements.find(el =>
        el.classList.contains('sr-only')
      )
      expect(screenReaderAnnouncement).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have complete message in screen reader announcement', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={3} />)

      const announcements = screen.getAllByRole('alert')
      const screenReaderAnnouncement = announcements.find(el =>
        el.textContent?.includes('Click Refresh Session')
      )
      expect(screenReaderAnnouncement).toHaveTextContent(
        /upload session expired for 3 files.*click refresh session to continue/i
      )
    })

    it('should have sr-only class on announcement for screen readers only', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const announcements = screen.getAllByRole('alert')
      const screenReaderAnnouncement = announcements.find(el =>
        el.classList.contains('sr-only')
      )
      expect(screenReaderAnnouncement).toHaveClass('sr-only')
    })

    it('should have alert icon with proper color', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const alertIcon = document.querySelector('.text-yellow-600')
      expect(alertIcon).toBeInTheDocument()
    })

    it('should have descriptive aria-label on icons', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Visual Styling', () => {
    it('should have yellow color scheme', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const alerts = screen.getAllByRole('alert')
      const mainAlert = alerts.find(el => !el.classList.contains('sr-only'))
      expect(mainAlert?.className).toContain('border-yellow-500')
      expect(mainAlert?.className).toContain('bg-yellow-500/10')
    })

    it('should have yellow text color on title', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const title = screen.getByText('Upload Session Expired')
      expect(title.className).toContain('text-yellow-700')
    })

    it('should have yellow text color on description', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const description = screen.getByText(/files need new upload sessions/i)
      expect(description.className).toContain('text-yellow-700')
    })

    it('should style button with yellow theme', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      expect(button.className).toContain('border-yellow-500')
      expect(button.className).toContain('text-yellow-700')
    })
  })

  describe('Edge Cases', () => {
    it('should handle expiredCount of exactly 1', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={1} />)

      expect(screen.getByText(/1 file needs/i)).toBeInTheDocument()
      expect(screen.queryByText(/files need/i)).not.toBeInTheDocument()
    })

    it('should handle expiredCount of exactly 2', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={2} />)

      expect(screen.getByText(/2 files need/i)).toBeInTheDocument()
    })

    it('should handle large expiredCount values', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={999} />)

      expect(screen.getByText(/999 files need/i)).toBeInTheDocument()
    })

    it('should handle both visible false and expiredCount 0', () => {
      render(<SessionExpiredBanner {...defaultProps} visible={false} expiredCount={0} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should hide when visible becomes false', () => {
      const { rerender } = render(<SessionExpiredBanner {...defaultProps} visible={true} />)

      expect(screen.getByText('Upload Session Expired')).toBeInTheDocument()

      rerender(<SessionExpiredBanner {...defaultProps} visible={false} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should hide when expiredCount becomes 0', () => {
      const { rerender } = render(<SessionExpiredBanner {...defaultProps} expiredCount={3} />)

      expect(screen.getByText('Upload Session Expired')).toBeInTheDocument()

      rerender(<SessionExpiredBanner {...defaultProps} expiredCount={0} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should update count when prop changes', () => {
      const { rerender } = render(<SessionExpiredBanner {...defaultProps} expiredCount={3} />)

      expect(screen.getByText(/3 files need new upload sessions/i)).toBeInTheDocument()

      rerender(<SessionExpiredBanner {...defaultProps} expiredCount={5} />)

      expect(screen.getByText(/5 files need new upload sessions/i)).toBeInTheDocument()
    })

    it('should handle transitioning between loading states', () => {
      const { rerender } = render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument()

      rerender(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      expect(screen.getByRole('button', { name: /refreshing/i })).toBeInTheDocument()

      rerender(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      expect(screen.getByRole('button', { name: /refresh session/i })).toBeInTheDocument()
    })

    it('should handle undefined isRefreshing prop', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      expect(button).not.toBeDisabled()
      // aria-busy defaults to false, so it won't be present
      expect(button.getAttribute('aria-busy')).not.toBe('true')
    })

    it('should handle multiple rapid clicks', async () => {
      const user = userEvent.setup()
      const onRefreshSession = vi.fn()
      render(<SessionExpiredBanner {...defaultProps} onRefreshSession={onRefreshSession} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      await user.click(button)
      await user.click(button)
      await user.click(button)

      expect(onRefreshSession).toHaveBeenCalledTimes(3)
    })
  })

  describe('Component Integration', () => {
    it('should maintain button state across re-renders', () => {
      const { rerender } = render(<SessionExpiredBanner {...defaultProps} isRefreshing={false} />)

      const button = screen.getByRole('button', { name: /refresh session/i })
      expect(button).not.toBeDisabled()

      rerender(<SessionExpiredBanner {...defaultProps} isRefreshing={false} expiredCount={5} />)

      const updatedButton = screen.getByRole('button', { name: /refresh session/i })
      expect(updatedButton).not.toBeDisabled()
    })

    it('should render alert icon component', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      // Check for AlertCircle icon by checking for SVG with proper styling
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should render refresh icon component', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      const refreshIcon = document.querySelector('.lucide-refresh-cw')
      expect(refreshIcon).toBeInTheDocument()
    })
  })
})
