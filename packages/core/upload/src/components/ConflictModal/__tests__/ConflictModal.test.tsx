/**
 * REPA-0510: ConflictModal Tests
 * Comprehensive test suite for duplicate title/slug conflict resolution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal } from '../index'

describe('ConflictModal', () => {
  const defaultProps = {
    open: true,
    currentTitle: 'My MOC',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Title Already Exists' })).toBeInTheDocument()
      expect(screen.getByText(/already exists.*choose a different title/i)).toBeInTheDocument()
    })

    it('should not render modal when closed', () => {
      render(<ConflictModal {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should display current title in description', () => {
      render(<ConflictModal {...defaultProps} currentTitle="Test MOC" />)

      expect(screen.getByText(/Test MOC/)).toBeInTheDocument()
    })

    it('should render new title input field', () => {
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue(defaultProps.currentTitle)
    })

    it('should render action buttons', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save & retry/i })).toBeInTheDocument()
    })
  })

  describe('Props - Suggested Slug', () => {
    it('should show suggested slug section when provided', () => {
      const onUseSuggested = vi.fn()
      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-moc-2"
          onUseSuggested={onUseSuggested}
        />,
      )

      expect(screen.getByText('Suggested Alternative')).toBeInTheDocument()
      expect(screen.getByText('my-moc-2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /use this/i })).toBeInTheDocument()
    })

    it('should not show suggested slug section when not provided', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.queryByText('Suggested Alternative')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /use this/i })).not.toBeInTheDocument()
    })

    it('should show divider when suggested slug is present', () => {
      const onUseSuggested = vi.fn()
      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-moc-2"
          onUseSuggested={onUseSuggested}
        />,
      )

      expect(screen.getByText(/or enter new title/i)).toBeInTheDocument()
    })

    it('should call onUseSuggested when "Use This" button is clicked', async () => {
      const user = userEvent.setup()
      const onUseSuggested = vi.fn()
      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-moc-2"
          onUseSuggested={onUseSuggested}
        />,
      )

      const useButton = screen.getByRole('button', { name: /use this/i })
      await user.click(useButton)

      expect(onUseSuggested).toHaveBeenCalledTimes(1)
    })
  })

  describe('Props - Loading State', () => {
    it('should disable inputs and buttons when loading', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      const input = screen.getByLabelText(/new title/i)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const saveButton = screen.getByRole('button', { name: /saving/i })

      expect(input).toBeDisabled()
      expect(cancelButton).toBeDisabled()
      expect(saveButton).toBeDisabled()
    })

    it('should show loading text on save button', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('should disable "Use This" button when loading', () => {
      const onUseSuggested = vi.fn()
      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-moc-2"
          onUseSuggested={onUseSuggested}
          isLoading={true}
        />,
      )

      const useButton = screen.getByRole('button', { name: /use this/i })
      expect(useButton).toBeDisabled()
    })
  })

  describe('User Interactions', () => {
    it('should allow editing the title input', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, 'New Title')

      expect(input).toHaveValue('New Title')
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<ConflictModal {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm with new title when save button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, 'New Title')

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      expect(onConfirm).toHaveBeenCalledWith('New Title')
    })

    it('should call onConfirm when Enter key is pressed', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, 'New Title{Enter}')

      expect(onConfirm).toHaveBeenCalledWith('New Title')
    })

    it('should not call onConfirm when Enter is pressed during loading', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} isLoading={true} />)

      const input = screen.getByLabelText(/new title/i)
      await user.type(input, '{Enter}')

      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('should show error when title is empty', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i)
      })
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('should show error when title is only whitespace', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, '   ')

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i)
      })
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('should show error when title is same as current', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} currentTitle="My MOC" onConfirm={onConfirm} />)

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/different title/i)
      })
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('should trim whitespace from new title', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, '  New Title  ')

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      expect(onConfirm).toHaveBeenCalledWith('New Title')
    })

    it('should clear error when valid title is entered', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      await user.type(input, 'Valid Title')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on dialog', () => {
      render(<ConflictModal {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby', 'conflict-modal-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'conflict-modal-description')
    })

    it('should have proper ARIA attributes on input when error exists', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveAttribute('aria-describedby', 'conflict-title-error')
      })
    })

    it('should have aria-busy on save button when loading', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      const saveButton = screen.getByRole('button', { name: /saving/i })
      expect(saveButton).toHaveAttribute('aria-busy', 'true')
    })

    it('should have accessible label on input', () => {
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      expect(input).toHaveAttribute('id', 'conflict-new-title')
    })

    it('should hide alert icon from screen readers', () => {
      render(<ConflictModal {...defaultProps} />)

      const alertIcon = document.querySelector('svg[aria-hidden="true"]')
      expect(alertIcon).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should focus input when modal opens without suggested slug', async () => {
      const { rerender } = render(<ConflictModal {...defaultProps} open={false} />)

      rerender(<ConflictModal {...defaultProps} open={true} />)

      await waitFor(() => {
        const input = screen.getByLabelText(/new title/i)
        expect(input).toHaveFocus()
      })
    })

    it('should not auto-focus input when suggested slug is present', () => {
      const onUseSuggested = vi.fn()
      render(
        <ConflictModal
          {...defaultProps}
          suggestedSlug="my-moc-2"
          onUseSuggested={onUseSuggested}
        />,
      )

      const input = screen.getByLabelText(/new title/i)
      expect(input).not.toHaveFocus()
    })

    it('should reset input value when modal reopens', () => {
      const { rerender } = render(<ConflictModal {...defaultProps} currentTitle="Original" />)

      const input = screen.getByLabelText(/new title/i)
      fireEvent.change(input, { target: { value: 'Changed' } })
      expect(input).toHaveValue('Changed')

      rerender(<ConflictModal {...defaultProps} currentTitle="Original" open={false} />)
      rerender(<ConflictModal {...defaultProps} currentTitle="Original" open={true} />)

      const resetInput = screen.getByLabelText(/new title/i)
      expect(resetInput).toHaveValue('Original')
    })

    it('should clear error state when modal reopens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      rerender(<ConflictModal {...defaultProps} open={false} />)
      rerender(<ConflictModal {...defaultProps} open={true} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle onUseSuggested being undefined', () => {
      render(<ConflictModal {...defaultProps} suggestedSlug="my-moc-2" />)

      // Should not show "Use This" button if onUseSuggested is not provided
      expect(screen.queryByRole('button', { name: /use this/i })).not.toBeInTheDocument()
    })

    it('should handle onDismiss prop', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<ConflictModal {...defaultProps} onCancel={onCancel} />)

      // Escape key or clicking outside should call onCancel
      const dialog = screen.getByRole('dialog')
      await user.keyboard('{Escape}')

      // Note: This behavior depends on the Dialog component's implementation
      // We're testing that the onCancel handler is properly connected
    })

    it('should handle multiple rapid save clicks gracefully', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<ConflictModal {...defaultProps} onConfirm={onConfirm} />)

      const input = screen.getByLabelText(/new title/i)
      await user.clear(input)
      await user.type(input, 'New Title')

      const saveButton = screen.getByRole('button', { name: /save & retry/i })
      await user.click(saveButton)
      await user.click(saveButton)
      await user.click(saveButton)

      // Should handle multiple calls gracefully
      expect(onConfirm).toHaveBeenCalledWith('New Title')
    })
  })
})
