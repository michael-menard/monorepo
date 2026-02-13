/**
 * SessionExpiredBanner Tests
 * BUGF-013 Phase 1: Error Handling Components
 *
 * Tests for session expired banner with refresh action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionExpiredBanner } from '../index'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert-circle">AlertCircle</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
}))

describe('SessionExpiredBanner', () => {
  const mockOnRefreshSession = vi.fn()

  const defaultProps = {
    visible: true,
    expiredCount: 2,
    onRefreshSession: mockOnRefreshSession,
    isRefreshing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when visible is true', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      expect(screen.getByText('Upload Session Expired')).toBeInTheDocument()
    })

    it('should not render when visible is false', () => {
      render(<SessionExpiredBanner {...defaultProps} visible={false} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should not render when expiredCount is 0', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={0} />)

      expect(screen.queryByText('Upload Session Expired')).not.toBeInTheDocument()
    })

    it('should display correct expired count (singular)', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={1} />)

      expect(screen.getByText(/1 file needs a new upload session/i)).toBeInTheDocument()
    })

    it('should display correct expired count (plural)', () => {
      render(<SessionExpiredBanner {...defaultProps} expiredCount={5} />)

      expect(screen.getByText(/5 files need new upload sessions/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onRefreshSession when refresh button clicked', async () => {
      const user = userEvent.setup()
      render(<SessionExpiredBanner {...defaultProps} />)

      const refreshButton = screen.getByRole('button', { name: /Refresh Session/i })
      await user.click(refreshButton)

      expect(mockOnRefreshSession).toHaveBeenCalled()
    })

    it('should disable refresh button when isRefreshing is true', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const refreshButton = screen.getByRole('button', { name: /Refreshing.../i })
      expect(refreshButton).toBeDisabled()
    })

    it('should show "Refreshing..." text when isRefreshing is true', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      expect(screen.getByRole('button', { name: /Refreshing.../i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have alert role with aria-live="assertive" for screen readers', () => {
      render(<SessionExpiredBanner {...defaultProps} />)

      // The component has two alert elements - main banner and sr-only announcement
      // Get the sr-only alert specifically for aria-live check
      const alerts = screen.getAllByRole('alert')
      const srOnlyAlert = alerts.find(alert => alert.className.includes('sr-only'))
      
      expect(srOnlyAlert).toBeInTheDocument()
      expect(srOnlyAlert).toHaveAttribute('aria-live', 'assertive')
    })

    it('should have aria-busy on refresh button when loading', () => {
      render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

      const refreshButton = screen.getByRole('button', { name: /Refreshing.../i })
      expect(refreshButton).toHaveAttribute('aria-busy', 'true')
    })
  })
})
