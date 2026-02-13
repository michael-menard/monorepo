/**
 * ConflictModal Tests
 * BUGF-013 Phase 1: Error Handling Components
 *
 * Tests for conflict resolution modal (409 errors).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal } from '../index'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
}))

describe('ConflictModal', () => {
  const mockOnConfirm = vi.fn()
  const mockOnUseSuggested = vi.fn()
  const mockOnCancel = vi.fn()

  const defaultProps = {
    open: true,
    currentTitle: 'My Test MOC',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with current title in description', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.getByText(/Title Already Exists/i)).toBeInTheDocument()
      expect(screen.getByText(/My Test MOC/i)).toBeInTheDocument()
    })

    it('should show new title input field initialized with current title', () => {
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('My Test MOC')
    })

    it('should show suggested slug section when suggestedSlug provided', () => {
      render(<ConflictModal {...defaultProps} suggestedSlug="my-test-moc-2" onUseSuggested={mockOnUseSuggested} />)

      expect(screen.getByText('my-test-moc-2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Use This/i })).toBeInTheDocument()
    })

    it('should not show suggested slug section when suggestedSlug not provided', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.queryByText('my-test-moc-2')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Use This/i })).not.toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should validate new title differs from original', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      // Click save without changing title
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Please enter a different title/i)).toBeInTheDocument()
      })
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should show error when title is empty', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      // Clear the input
      await user.clear(input)
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Title is required/i)).toBeInTheDocument()
      })
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it('should show error when title matches original', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      // Type the same title
      await user.clear(input)
      await user.type(input, 'My Test MOC')
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Please enter a different title/i)).toBeInTheDocument()
      })
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('User Interactions', () => {
    it('should call onConfirm with new title on submit', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      await user.clear(input)
      await user.type(input, 'New Different Title')
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('New Different Title')
      })
    })

    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should call onUseSuggested when "Use This" button clicked', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} suggestedSlug="my-test-moc-2" onUseSuggested={mockOnUseSuggested} />)

      const useThisButton = screen.getByRole('button', { name: /Use This/i })
      await user.click(useThisButton)

      expect(mockOnUseSuggested).toHaveBeenCalled()
    })

    it('should submit on Enter key press', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)

      await user.clear(input)
      await user.type(input, 'New Title Via Enter{Enter}')

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('New Title Via Enter')
      })
    })
  })

  describe('Loading State', () => {
    it('should disable inputs when isLoading is true', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Saving.../i })
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })

      expect(input).toBeDisabled()
      expect(saveButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })

    it('should show "Saving..." text when loading', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument()
    })

    it('should not submit when loading and Enter pressed', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      const input = screen.getByLabelText(/New Title/i)
      await user.type(input, '{Enter}')

      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<ConflictModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText(/New Title/i)).toBeInTheDocument()
    })

    it('should link error messages with aria-describedby', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      await user.click(saveButton)

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
        expect(input).toHaveAttribute('aria-describedby', 'conflict-title-error')
      })
    })

    it('should have aria-invalid on input with error', async () => {
      const user = userEvent.setup()
      render(<ConflictModal {...defaultProps} />)

      const input = screen.getByLabelText(/New Title/i)
      const saveButton = screen.getByRole('button', { name: /Save & Retry/i })

      // Initially no error
      expect(input).toHaveAttribute('aria-invalid', 'false')

      await user.click(saveButton)

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should have aria-busy on save button when loading', () => {
      render(<ConflictModal {...defaultProps} isLoading={true} />)

      const saveButton = screen.getByRole('button', { name: /Saving.../i })
      expect(saveButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Focus Management', () => {
    it('should focus input field on mount', async () => {
      render(<ConflictModal {...defaultProps} />)

      await waitFor(() => {
        const input = screen.getByLabelText(/New Title/i)
        expect(input).toHaveFocus()
      }, { timeout: 100 })
    })
  })
})
