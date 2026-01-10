/**
 * Story 3.1.20: Accessibility Tests for Uploader Components
 *
 * Tests keyboard operability, ARIA attributes, focus management, and screen reader support.
 * Validates WCAG AA compliance for the uploader flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal, type ConflictModalProps } from '../ConflictModal'
import { RateLimitBanner, type RateLimitBannerProps } from '../RateLimitBanner'
import { SessionExpiredBanner, type SessionExpiredBannerProps } from '../SessionExpiredBanner'
import { UnsavedChangesDialog, type UnsavedChangesDialogProps } from '../UnsavedChangesDialog'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('ConflictModal Accessibility', () => {
  const defaultProps: ConflictModalProps = {
    open: true,
    currentTitle: 'My Cool MOC',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have proper dialog with labelledby and describedby', () => {
    render(<ConflictModal {...defaultProps} />)

    // The DialogContent receives the aria attributes
    const dialogContent = screen.getByTestId('dialog-content')
    expect(dialogContent).toHaveAttribute('aria-labelledby', 'conflict-modal-title')
    expect(dialogContent).toHaveAttribute('aria-describedby', 'conflict-modal-description')
  })

  it('should have title with correct id', () => {
    render(<ConflictModal {...defaultProps} />)

    const title = screen.getByText('Title Already Exists')
    expect(title).toHaveAttribute('id', 'conflict-modal-title')
  })

  it('should have description with correct id', () => {
    render(<ConflictModal {...defaultProps} />)

    const description = screen.getByText(/A MOC with the title/i)
    expect(description).toHaveAttribute('id', 'conflict-modal-description')
  })

  it('should have accessible input with label', () => {
    render(<ConflictModal {...defaultProps} />)

    const input = screen.getByLabelText(/New Title/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'conflict-new-title')
  })

  it('should announce errors via alert role', async () => {
    const user = userEvent.setup()
    render(<ConflictModal {...defaultProps} />)

    const input = screen.getByLabelText(/New Title/i)
    await user.clear(input)

    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })
    await user.click(saveButton)

    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Title is required')
    expect(error).toHaveAttribute('id', 'conflict-title-error')
  })

  it('should have aria-busy on loading button', () => {
    render(<ConflictModal {...defaultProps} isLoading={true} />)

    const saveButton = screen.getByRole('button', { name: /Saving.../i })
    expect(saveButton).toHaveAttribute('aria-busy', 'true')
  })

  it('should have aria-invalid on input with error', async () => {
    const user = userEvent.setup()
    render(<ConflictModal {...defaultProps} />)

    const input = screen.getByLabelText(/New Title/i)
    await user.clear(input)

    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })
    await user.click(saveButton)

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'conflict-title-error')
  })

  it('should be keyboard navigable with Enter to submit', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByLabelText(/New Title/i)
    await user.clear(input)
    await user.type(input, 'New Unique Title')
    await user.keyboard('{Enter}')

    expect(onConfirm).toHaveBeenCalledWith('New Unique Title')
  })

  it('should have all interactive elements keyboard focusable', async () => {
    render(<ConflictModal {...defaultProps} />)

    // Verify all interactive elements are present and have no tabindex=-1
    const input = screen.getByLabelText(/New Title/i)
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

    expect(input).not.toHaveAttribute('tabindex', '-1')
    expect(cancelButton).not.toHaveAttribute('tabindex', '-1')
    expect(saveButton).not.toHaveAttribute('tabindex', '-1')
  })
})

describe('RateLimitBanner Accessibility', () => {
  const defaultProps: RateLimitBannerProps = {
    visible: true,
    retryAfterSeconds: 60,
    onRetry: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have timer role for countdown', () => {
    render(<RateLimitBanner {...defaultProps} />)

    const timer = screen.getByRole('timer')
    expect(timer).toBeInTheDocument()
    expect(timer).toHaveAttribute('aria-live', 'polite')
  })

  it('should have alert role for the banner', () => {
    render(<RateLimitBanner {...defaultProps} />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('should have progressbar with proper ARIA attributes', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(progressbar).toHaveAttribute('aria-label', 'Rate limit countdown progress')
  })

  it('should have disabled retry button during countdown', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    expect(retryButton).toBeDisabled()
  })

  it('should have enabled retry button when countdown is 0', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    expect(retryButton).toBeEnabled()
  })

  it('should be keyboard operable', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    await user.tab()
    expect(retryButton).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('SessionExpiredBanner Accessibility', () => {
  const defaultProps: SessionExpiredBannerProps = {
    visible: true,
    expiredCount: 2,
    onRefreshSession: vi.fn(),
    isRefreshing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have assertive alert for screen readers', () => {
    render(<SessionExpiredBanner {...defaultProps} />)

    // The sr-only alert has aria-live="assertive"
    const alerts = screen.getAllByRole('alert')
    const srAlert = alerts.find(el => el.getAttribute('aria-live') === 'assertive')
    expect(srAlert).toBeInTheDocument()
  })

  it('should have aria-busy on refresh button when loading', () => {
    render(<SessionExpiredBanner {...defaultProps} isRefreshing={true} />)

    const refreshButton = screen.getByRole('button', { name: /Refreshing.../i })
    expect(refreshButton).toHaveAttribute('aria-busy', 'true')
    expect(refreshButton).toBeDisabled()
  })

  it('should be keyboard operable', async () => {
    const user = userEvent.setup()
    const onRefreshSession = vi.fn()

    render(<SessionExpiredBanner {...defaultProps} onRefreshSession={onRefreshSession} />)

    const refreshButton = screen.getByRole('button', { name: /Refresh Session/i })
    await user.tab()
    expect(refreshButton).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onRefreshSession).toHaveBeenCalled()
  })

  it('should announce correct count in sr-only text', () => {
    render(<SessionExpiredBanner {...defaultProps} expiredCount={3} />)

    // The sr-only alert has the count
    const alerts = screen.getAllByRole('alert')
    const srAlert = alerts.find(el => el.classList.contains('sr-only'))
    expect(srAlert).toHaveTextContent('3')
    expect(srAlert).toHaveTextContent('files')
  })
})

describe('UnsavedChangesDialog Accessibility', () => {
  const defaultProps: UnsavedChangesDialogProps = {
    open: true,
    onStay: vi.fn(),
    onLeave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have alertdialog with labelledby and describedby', () => {
    render(<UnsavedChangesDialog {...defaultProps} />)

    // The AlertDialogContent receives the aria attributes
    const dialogContent = screen.getByTestId('alert-dialog-content')
    expect(dialogContent).toHaveAttribute('aria-labelledby', 'unsaved-changes-title')
    expect(dialogContent).toHaveAttribute('aria-describedby', 'unsaved-changes-description')
  })

  it('should have title with correct id', () => {
    render(<UnsavedChangesDialog {...defaultProps} />)

    const title = screen.getByText('Unsaved changes')
    expect(title).toHaveAttribute('id', 'unsaved-changes-title')
  })

  it('should have description with correct id', () => {
    render(<UnsavedChangesDialog {...defaultProps} />)

    const description = screen.getByText(/You have unsaved changes/i)
    expect(description).toHaveAttribute('id', 'unsaved-changes-description')
  })

  it('should focus stay button by default (safer action)', async () => {
    render(<UnsavedChangesDialog {...defaultProps} />)

    // Wait for focus to be set
    await new Promise(resolve => setTimeout(resolve, 10))

    const stayButton = screen.getByRole('button', { name: /Stay on page/i })
    expect(stayButton).toHaveFocus()
  })

  it('should be keyboard navigable between buttons', async () => {
    const user = userEvent.setup()
    const onLeave = vi.fn()

    render(<UnsavedChangesDialog {...defaultProps} onLeave={onLeave} />)

    // Wait for initial focus
    await new Promise(resolve => setTimeout(resolve, 10))

    const stayButton = screen.getByRole('button', { name: /Stay on page/i })
    expect(stayButton).toHaveFocus()

    // Tab to leave button
    await user.tab()
    const leaveButton = screen.getByRole('button', { name: /Leave page/i })
    expect(leaveButton).toHaveFocus()

    // Enter to leave
    await user.keyboard('{Enter}')
    expect(onLeave).toHaveBeenCalled()
  })

  it('should have buttons with clear semantic meaning', () => {
    render(<UnsavedChangesDialog {...defaultProps} />)

    // Stay button should be a cancel action
    const stayButton = screen.getByRole('button', { name: /Stay on page/i })
    expect(stayButton).toBeInTheDocument()

    // Leave button should be a destructive action
    const leaveButton = screen.getByRole('button', { name: /Leave page/i })
    expect(leaveButton).toBeInTheDocument()
    expect(leaveButton).toHaveClass('bg-destructive')
  })
})

describe('Keyboard Navigation Patterns', () => {
  it('ConflictModal: All interactive elements have correct tab indices', () => {
    render(<ConflictModal open={true} currentTitle="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />)

    // All interactive elements should be in the tab order (not tabindex="-1")
    const input = screen.getByLabelText(/New Title/i)
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

    expect(input).not.toHaveAttribute('tabindex', '-1')
    expect(cancelButton).not.toHaveAttribute('tabindex', '-1')
    expect(saveButton).not.toHaveAttribute('tabindex', '-1')
  })

  it('RateLimitBanner: All buttons should be focusable', async () => {
    const user = userEvent.setup()

    render(
      <RateLimitBanner
        visible={true}
        retryAfterSeconds={0}
        onRetry={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    await user.tab()
    expect(screen.getByRole('button', { name: /Retry/i })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: /Dismiss/i })).toHaveFocus()
  })
})

describe('Screen Reader Support', () => {
  it('ConflictModal: Should have hidden decorative icon', () => {
    render(<ConflictModal open={true} currentTitle="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />)

    // The warning icon should be hidden from screen readers
    const dialogContent = screen.getByTestId('dialog-content')
    const icon = dialogContent.querySelector('[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('RateLimitBanner: Timer should be screen-reader only', () => {
    render(<RateLimitBanner visible={true} retryAfterSeconds={60} onRetry={vi.fn()} />)

    const timer = screen.getByRole('timer')
    expect(timer).toHaveClass('sr-only')
  })

  it('SessionExpiredBanner: Has sr-only alert for screen readers', () => {
    render(<SessionExpiredBanner visible={true} expiredCount={1} onRefreshSession={vi.fn()} />)

    // The sr-only alert should exist
    const alerts = screen.getAllByRole('alert')
    const srAlert = alerts.find(el => el.classList.contains('sr-only'))
    expect(srAlert).toBeInTheDocument()
    expect(srAlert).toHaveAttribute('aria-live', 'assertive')
  })
})
