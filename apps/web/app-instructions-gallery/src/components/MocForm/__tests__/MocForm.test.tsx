/**
 * MocForm Component Tests
 *
 * Story INST-1102: Create Basic MOC
 * Phase 6: Frontend Form Component Tests
 *
 * Note: Tests avoid direct interaction with Radix Select component due to
 * jsdom limitations. Theme validation is tested via form submission and
 * initial values instead.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MocForm } from '../index'

// Polyfill for Radix UI components (required in jsdom)
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('MocForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockResolvedValue(undefined)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-2: Form renders all fields
  // ───────────────────────────────────────────────────────────────────────────

  describe('Rendering (AC-2)', () => {
    it('renders the form with all required fields', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.getByTestId('moc-form')).toBeInTheDocument()
      expect(screen.getByTestId('title-input')).toBeInTheDocument()
      expect(screen.getByTestId('theme-select')).toBeInTheDocument()
      expect(screen.getByTestId('description-input')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create moc/i })).toBeInTheDocument()
    })

    it('renders title field with label', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/medieval castle moc/i)).toBeInTheDocument()
    })

    it('renders theme select with label', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      // Use getByLabelText for the label
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument()
      expect(screen.getByTestId('theme-select')).toBeInTheDocument()
    })

    it('renders description field with label', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/describe your moc build/i)).toBeInTheDocument()
    })

    it('renders tags field with label', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.getByText(/tags/i)).toBeInTheDocument()
    })

    it('renders cancel button when onCancel is provided', () => {
      render(<MocForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel is not provided', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-3: Auto-focus title on mount
  // ───────────────────────────────────────────────────────────────────────────

  describe('Auto-focus (AC-3)', () => {
    it('auto-focuses title input on mount', async () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      // Wait for the 100ms timeout to focus
      await waitFor(
        () => {
          expect(screen.getByTestId('title-input')).toHaveFocus()
        },
        { timeout: 200 },
      )
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-4: Inline validation errors
  // ───────────────────────────────────────────────────────────────────────────

  describe('Validation Errors (AC-4)', () => {
    it('shows error when title is too short', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} />)

      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'AB')
      await user.tab() // Blur to trigger validation

      await waitFor(() => {
        expect(screen.getByTestId('title-error')).toHaveTextContent(
          'Title must be at least 3 characters',
        )
      })
    })

    it('shows error when theme is not selected after form submission', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} />)

      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'Valid Title')

      // Submit without selecting theme - button is disabled so we submit via form
      const form = screen.getByTestId('moc-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByTestId('theme-error')).toHaveTextContent('Theme is required')
      })
    })

    it('clears title error when valid input is provided', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} />)

      const titleInput = screen.getByTestId('title-input')

      // Type short value and blur
      await user.type(titleInput, 'AB')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('title-error')).toBeInTheDocument()
      })

      // Type more characters
      await user.click(titleInput)
      await user.type(titleInput, 'CDE')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByTestId('title-error')).not.toBeInTheDocument()
      })
    })

    it('displays aria-invalid on invalid fields', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} />)

      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'AB')
      await user.tab()

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-5: Submit disabled when invalid
  // ───────────────────────────────────────────────────────────────────────────

  describe('Submit Button State (AC-5)', () => {
    it('submit button is disabled when form is empty', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('submit button is disabled when only title is filled', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} />)

      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'Valid Title Here')

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
    })

    it('submit button is enabled when title and theme are valid via initialValues', () => {
      // Use initialValues to set theme (avoids Radix Select interaction issues in jsdom)
      render(
        <MocForm
          onSubmit={mockOnSubmit}
          initialValues={{
            title: 'Valid Title Here',
            theme: 'Castle',
          }}
        />,
      )

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
    })

    it('submit button is disabled when isSubmitting is true', () => {
      render(<MocForm onSubmit={mockOnSubmit} isSubmitting={true} />)

      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Creating...')
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Form Submission
  // ───────────────────────────────────────────────────────────────────────────

  describe('Form Submission', () => {
    it('calls onSubmit with correct data when form is valid via initialValues', async () => {
      const user = userEvent.setup()
      // Use initialValues to set theme (avoids Radix Select interaction issues in jsdom)
      render(
        <MocForm
          onSubmit={mockOnSubmit}
          initialValues={{
            theme: 'Castle',
          }}
        />,
      )

      // Fill title using fireEvent.change (more reliable than userEvent.type in jsdom)
      const titleInput = screen.getByTestId('title-input')
      fireEvent.change(titleInput, { target: { value: 'My Castle MOC' } })

      // Fill description using fireEvent.change
      const descriptionInput = screen.getByTestId('description-input')
      fireEvent.change(descriptionInput, { target: { value: 'A medieval castle build' } })

      // Submit
      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'My Castle MOC',
            description: 'A medieval castle build',
            theme: 'Castle',
            type: 'moc',
            status: 'draft',
            visibility: 'private',
          }),
        )
      })
    })

    it('does not call onSubmit when form is invalid', async () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      // Try to submit with empty form via form submit (button is disabled)
      const form = screen.getByTestId('moc-form')
      fireEvent.submit(form)

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<MocForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-13: API errors display in form
  // ───────────────────────────────────────────────────────────────────────────

  describe('API Error Display (AC-13)', () => {
    it('displays API error banner when apiError prop is provided', () => {
      render(<MocForm onSubmit={mockOnSubmit} apiError="Server error occurred" />)

      const errorBanner = screen.getByTestId('api-error-banner')
      expect(errorBanner).toBeInTheDocument()
      expect(errorBanner).toHaveTextContent('Server error occurred')
      expect(errorBanner).toHaveRole('alert')
    })

    it('does not display API error banner when apiError is undefined', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.queryByTestId('api-error-banner')).not.toBeInTheDocument()
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // AC-15: Initial values / localStorage recovery
  // ───────────────────────────────────────────────────────────────────────────

  describe('Initial Values / Recovery (AC-15)', () => {
    it('populates form with initial values', () => {
      render(
        <MocForm
          onSubmit={mockOnSubmit}
          initialValues={{
            title: 'Recovered Title',
            description: 'Recovered Description',
            theme: 'Space',
            tags: ['tag1', 'tag2'],
          }}
        />,
      )

      expect(screen.getByTestId('title-input')).toHaveValue('Recovered Title')
      expect(screen.getByTestId('description-input')).toHaveValue('Recovered Description')
    })

    it('updates form when initialValues change', async () => {
      const { rerender } = render(<MocForm onSubmit={mockOnSubmit} />)

      expect(screen.getByTestId('title-input')).toHaveValue('')

      rerender(<MocForm onSubmit={mockOnSubmit} initialValues={{ title: 'Updated Title' }} />)

      await waitFor(() => {
        expect(screen.getByTestId('title-input')).toHaveValue('Updated Title')
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ───────────────────────────────────────────────────────────────────────────

  describe('Keyboard Shortcuts', () => {
    it('shows keyboard shortcut hint', () => {
      render(<MocForm onSubmit={mockOnSubmit} />)

      // Should show Cmd+Enter or Ctrl+Enter hint (look for the kbd element specifically)
      expect(screen.getByText(/\+enter/i)).toBeInTheDocument()
    })

    it('submits form on Ctrl+Enter when valid', async () => {
      const user = userEvent.setup()
      // Use initialValues to set theme (avoids Radix Select interaction issues in jsdom)
      render(
        <MocForm
          onSubmit={mockOnSubmit}
          initialValues={{
            theme: 'Castle',
          }}
        />,
      )

      // Fill title
      const titleInput = screen.getByTestId('title-input')
      await user.type(titleInput, 'Valid Title')

      // Simulate Ctrl+Enter
      fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  // Field Disable State
  // ───────────────────────────────────────────────────────────────────────────

  describe('Disabled State', () => {
    it('disables all inputs when isSubmitting is true', () => {
      render(<MocForm onSubmit={mockOnSubmit} isSubmitting={true} />)

      expect(screen.getByTestId('title-input')).toBeDisabled()
      expect(screen.getByTestId('description-input')).toBeDisabled()
      expect(screen.getByTestId('theme-select')).toHaveAttribute('data-disabled')
    })
  })
})
