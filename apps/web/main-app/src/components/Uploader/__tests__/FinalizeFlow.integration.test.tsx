/**
 * Story 3.1.19: Finalize Flow Integration Tests
 *
 * Tests for 409 conflict, 429 rate limit, and per-file validation error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal, type ConflictModalProps } from '../ConflictModal'
import { RateLimitBanner, type RateLimitBannerProps } from '../RateLimitBanner'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('ConflictModal', () => {
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

  it('should render with current title in description', () => {
    render(<ConflictModal {...defaultProps} />)

    expect(screen.getByText(/Title Already Exists/i)).toBeInTheDocument()
    expect(screen.getByText(/My Cool MOC/)).toBeInTheDocument()
  })

  it('should show new title input', () => {
    render(<ConflictModal {...defaultProps} />)

    const input = screen.getByLabelText(/New Title/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('My Cool MOC')
  })

  it('should call onConfirm with new title', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

    const input = screen.getByLabelText(/New Title/i)
    await user.clear(input)
    await user.type(input, 'My New Title')

    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })
    await user.click(saveButton)

    expect(onConfirm).toHaveBeenCalledWith('My New Title')
  })

  it('should show error when title is empty', async () => {
    const user = userEvent.setup()

    render(<ConflictModal {...defaultProps} />)

    const input = screen.getByLabelText(/New Title/i)
    await user.clear(input)

    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })
    await user.click(saveButton)

    expect(screen.getByText(/Title is required/i)).toBeInTheDocument()
  })

  it('should show error when title is unchanged', async () => {
    const user = userEvent.setup()

    render(<ConflictModal {...defaultProps} />)

    const saveButton = screen.getByRole('button', { name: /Save & Retry/i })
    await user.click(saveButton)

    expect(screen.getByText(/Please enter a different title/i)).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(<ConflictModal {...defaultProps} onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })

  it('should disable inputs when loading', () => {
    render(<ConflictModal {...defaultProps} isLoading={true} />)

    expect(screen.getByLabelText(/New Title/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled()
  })

  describe('with suggestedSlug (Story 3.1.19)', () => {
    it('should show suggested slug when provided', () => {
      render(
        <ConflictModal {...defaultProps} suggestedSlug="my-cool-moc-2" onUseSuggested={vi.fn()} />,
      )

      // The slug value should be visible
      expect(screen.getByText('my-cool-moc-2')).toBeInTheDocument()
      // The "Use This" button should be present
      expect(screen.getByRole('button', { name: /Use This/i })).toBeInTheDocument()
    })

    it('should call onUseSuggested when Use This is clicked', async () => {
      const user = userEvent.setup()
      const onUseSuggested = vi.fn()

      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-cool-moc-2"
          onUseSuggested={onUseSuggested}
        />,
      )

      const useButton = screen.getByRole('button', { name: /Use This/i })
      await user.click(useButton)

      expect(onUseSuggested).toHaveBeenCalled()
    })

    it('should show divider between suggested and manual input', () => {
      render(
        <ConflictModal {...defaultProps} suggestedSlug="my-cool-moc-2" onUseSuggested={vi.fn()} />,
      )

      expect(screen.getByText(/Or enter new title/i)).toBeInTheDocument()
    })

    it('should not show suggested section when suggestedSlug not provided', () => {
      render(<ConflictModal {...defaultProps} />)

      // "Use This" button should not be present without suggested slug
      expect(screen.queryByRole('button', { name: /Use This/i })).not.toBeInTheDocument()
      expect(screen.queryByText(/Or enter new title/i)).not.toBeInTheDocument()
    })
  })
})

describe('RateLimitBanner', () => {
  const defaultProps: RateLimitBannerProps = {
    visible: true,
    retryAfterSeconds: 60,
    onRetry: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when visible', () => {
    render(<RateLimitBanner {...defaultProps} />)

    expect(screen.getByText(/Rate Limit Exceeded/i)).toBeInTheDocument()
    expect(screen.getByText(/1:00/)).toBeInTheDocument() // 60 seconds = 1:00
  })

  it('should not render when not visible', () => {
    render(<RateLimitBanner {...defaultProps} visible={false} />)

    expect(screen.queryByText(/Rate Limit Exceeded/i)).not.toBeInTheDocument()
  })

  it('should show countdown text with correct format', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={90} />)

    // 90 seconds = 1:30
    expect(screen.getByText(/1:30/)).toBeInTheDocument()
  })

  it('should show retry button as disabled initially', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={60} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    expect(retryButton).toBeDisabled()
  })

  it('should show retry button as enabled when retryAfterSeconds is 0', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    expect(retryButton).toBeEnabled()
    // There are two elements with "You can now retry" (visible + sr-only)
    expect(screen.getAllByText(/You can now retry/i)).toHaveLength(2)
  })

  it('should call onRetry when retry button is clicked and enabled', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    // Start with 0 seconds so button is enabled
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={0} onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /Retry/i })
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalled()
  })

  it('should call onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()

    render(<RateLimitBanner {...defaultProps} onDismiss={onDismiss} />)

    const dismissButton = screen.getByRole('button', { name: /Dismiss/i })
    await user.click(dismissButton)

    expect(onDismiss).toHaveBeenCalled()
  })

  it('should have accessible timer for screen readers', () => {
    render(<RateLimitBanner {...defaultProps} retryAfterSeconds={30} />)

    // Look for the timer element with proper role
    const timer = screen.getByRole('timer')
    expect(timer).toBeInTheDocument()
  })
})
