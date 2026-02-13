import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConflictModal } from '../index'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Dialog: vi.fn(({ children, open }) =>
      open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
    ),
    DialogContent: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children),
    ),
    DialogHeader: vi.fn(({ children }) => React.createElement('div', {}, children)),
    DialogTitle: vi.fn(({ children, ...props }) =>
      React.createElement('h2', { ...props }, children),
    ),
    DialogDescription: vi.fn(({ children, ...props }) =>
      React.createElement('p', { ...props }, children),
    ),
    DialogFooter: vi.fn(({ children }) => React.createElement('div', {}, children)),
    Button: vi.fn(({ children, onClick, disabled, ...props }) =>
      React.createElement('button', { onClick, disabled, ...props }, children),
    ),
    Input: vi.fn(props => React.createElement('input', props)),
    Label: vi.fn(({ children, ...props }) => React.createElement('label', props, children)),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    AlertTriangle: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'alert-triangle-icon', ...props }),
    ),
  }
})

describe('ConflictModal', () => {
  const mockHandlers = {
    onConfirm: vi.fn(),
    onUseSuggested: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('does not render when closed', () => {
      render(
        <ConflictModal
          open={false}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('renders when open', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('displays title and alert icon', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.getByText('Title Already Exists')).toBeInTheDocument()
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    })

    it('displays current title in description', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(
        screen.getByText(/A MOC with the title "My MOC" already exists/),
      ).toBeInTheDocument()
    })

    it('displays new title input', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.getByLabelText('New Title')).toBeInTheDocument()
    })

    it('displays suggested slug option when provided', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          suggestedSlug="my-moc-2"
          onConfirm={mockHandlers.onConfirm}
          onUseSuggested={mockHandlers.onUseSuggested}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.getByText('Suggested Alternative')).toBeInTheDocument()
      expect(screen.getByText('my-moc-2')).toBeInTheDocument()
      expect(screen.getByText('Use This')).toBeInTheDocument()
    })

    it('does not display suggested slug section when not provided', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.queryByText('Suggested Alternative')).not.toBeInTheDocument()
    })

    it('displays Save & Retry and Cancel buttons', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      expect(screen.getByText('Save & Retry')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('initializes input with current title when opened', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title') as HTMLInputElement
      expect(input.value).toBe('My MOC')
    })

    it('allows editing the new title', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)
      await user.type(input, 'My Updated MOC')

      expect(input).toHaveValue('My Updated MOC')
    })

    it('shows validation error when title is empty', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)

      const saveButton = screen.getByText('Save & Retry')
      await user.click(saveButton)

      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(mockHandlers.onConfirm).not.toHaveBeenCalled()
    })

    it('shows validation error when title is the same as current', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const saveButton = screen.getByText('Save & Retry')
      await user.click(saveButton)

      expect(screen.getByText('Please enter a different title')).toBeInTheDocument()
      expect(mockHandlers.onConfirm).not.toHaveBeenCalled()
    })

    it('calls onConfirm with new title when valid', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)
      await user.type(input, 'My Updated MOC')

      const saveButton = screen.getByText('Save & Retry')
      await user.click(saveButton)

      expect(mockHandlers.onConfirm).toHaveBeenCalledWith('My Updated MOC')
    })

    it('trims whitespace from new title', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)
      await user.type(input, '  My Updated MOC  ')

      const saveButton = screen.getByText('Save & Retry')
      await user.click(saveButton)

      expect(mockHandlers.onConfirm).toHaveBeenCalledWith('My Updated MOC')
    })

    it('calls onUseSuggested when Use This button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          suggestedSlug="my-moc-2"
          onConfirm={mockHandlers.onConfirm}
          onUseSuggested={mockHandlers.onUseSuggested}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const useThisButton = screen.getByText('Use This')
      await user.click(useThisButton)

      expect(mockHandlers.onUseSuggested).toHaveBeenCalledTimes(1)
    })

    it('calls onCancel when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1)
    })

    it('submits on Enter key press', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)
      await user.type(input, 'My Updated MOC')
      await user.keyboard('{Enter}')

      expect(mockHandlers.onConfirm).toHaveBeenCalledWith('My Updated MOC')
    })

    it('does not submit on Enter when loading', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
          isLoading={true}
        />,
      )

      // Verify the save button shows loading state and is disabled
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...')).toBeDisabled()

      // Verify onConfirm was not called
      expect(mockHandlers.onConfirm).not.toHaveBeenCalled()
    })

    it('disables inputs and buttons when loading', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          suggestedSlug="my-moc-2"
          onConfirm={mockHandlers.onConfirm}
          onUseSuggested={mockHandlers.onUseSuggested}
          onCancel={mockHandlers.onCancel}
          isLoading={true}
        />,
      )

      expect(screen.getByLabelText('New Title')).toBeDisabled()
      expect(screen.getByText('Use This')).toBeDisabled()
      expect(screen.getByText('Cancel')).toBeDisabled()
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...')).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('accessibility', () => {
    it('has proper aria labels', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toHaveAttribute('aria-labelledby', 'conflict-modal-title')
      expect(dialogContent).toHaveAttribute('aria-describedby', 'conflict-modal-description')
    })

    it('associates error message with input', async () => {
      const user = userEvent.setup()
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      await user.clear(input)

      const saveButton = screen.getByText('Save & Retry')
      await user.click(saveButton)

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveAttribute('aria-describedby', 'conflict-title-error')
      })

      const errorMessage = screen.getByText('Title is required')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('has label for input field', () => {
      render(
        <ConflictModal
          open={true}
          currentTitle="My MOC"
          onConfirm={mockHandlers.onConfirm}
          onCancel={mockHandlers.onCancel}
        />,
      )

      const input = screen.getByLabelText('New Title')
      expect(input).toHaveAttribute('id', 'conflict-new-title')
    })
  })
})
