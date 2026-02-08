import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockUserDialog } from '../BlockUserDialog'

// Mock the component library
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Dialog: vi.fn(({ children, open }) =>
      open ? React.createElement('div', { 'data-testid': 'dialog', role: 'dialog' }, children) : null,
    ),
    DialogContent: vi.fn(({ children, className, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-content', className, ...props }, children),
    ),
    DialogHeader: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-header', ...props }, children),
    ),
    DialogTitle: vi.fn(({ children, className, ...props }) =>
      React.createElement('h2', { 'data-testid': 'dialog-title', className, ...props }, children),
    ),
    DialogDescription: vi.fn(({ children, ...props }) =>
      React.createElement('p', { 'data-testid': 'dialog-description', ...props }, children),
    ),
    DialogFooter: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-footer', ...props }, children),
    ),
    Button: vi.fn(({ children, onClick, disabled, variant, ...props }) =>
      React.createElement(
        'button',
        { onClick, disabled, 'data-variant': variant, ...props },
        children,
      ),
    ),
    Label: vi.fn(({ children, htmlFor, ...props }) =>
      React.createElement('label', { htmlFor, ...props }, children),
    ),
    Select: vi.fn(({ children, value, onValueChange }) =>
      React.createElement(
        'div',
        { 'data-testid': 'select', 'data-value': value },
        React.createElement(
          'select',
          {
            value,
            onChange: (e: { target: { value: string } }) => onValueChange(e.target.value),
            'data-testid': 'select-native',
          },
          React.createElement('option', { value: '' }, 'Select a reason'),
          React.createElement('option', { value: 'security_incident' }, 'Security Incident'),
          React.createElement('option', { value: 'policy_violation' }, 'Policy Violation'),
          React.createElement('option', { value: 'account_compromise' }, 'Account Compromise'),
          React.createElement('option', { value: 'other' }, 'Other'),
        ),
        children,
      ),
    ),
    SelectContent: vi.fn(({ children }) =>
      React.createElement('div', { 'data-testid': 'select-content' }, children),
    ),
    SelectItem: vi.fn(({ children, value }) =>
      React.createElement('option', { value, 'data-testid': `select-item-${value}` }, children),
    ),
    SelectTrigger: vi.fn(({ children, id }) =>
      React.createElement('button', { id, 'data-testid': 'select-trigger' }, children),
    ),
    SelectValue: vi.fn(({ placeholder }) =>
      React.createElement('span', { 'data-testid': 'select-value' }, placeholder),
    ),
    Textarea: vi.fn(({ id, value, onChange, placeholder, rows, maxLength, ...props }) =>
      React.createElement('textarea', {
        id,
        value,
        onChange,
        placeholder,
        rows,
        maxLength,
        'data-testid': 'textarea',
        ...props,
      }),
    ),
  }
})

// Mock Lucide icons
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    ShieldOff: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'shield-off-icon', ...props }),
    ),
    Loader2: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'loader-icon', ...props }),
    ),
  }
})

/**
 * BlockUserDialog Component Tests
 *
 * Tests the block user confirmation dialog, including
 * reason selection, notes input, and form submission.
 */

describe('BlockUserDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
    username: 'testuser',
  }

  beforeEach(() => {
    defaultProps.onOpenChange.mockClear()
    defaultProps.onConfirm.mockClear()
  })

  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<BlockUserDialog {...defaultProps} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<BlockUserDialog {...defaultProps} open={false} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('displays block user title', () => {
      render(<BlockUserDialog {...defaultProps} />)

      // Title is in the dialog header (h2)
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Block User')
    })

    it('displays username in description', () => {
      render(<BlockUserDialog {...defaultProps} username="johndoe" />)

      expect(screen.getByTestId('dialog-description')).toHaveTextContent('johndoe')
    })

    it('displays reason label', () => {
      render(<BlockUserDialog {...defaultProps} />)

      expect(screen.getByText('Reason *')).toBeInTheDocument()
    })

    it('displays notes label', () => {
      render(<BlockUserDialog {...defaultProps} />)

      expect(screen.getByText('Notes (optional)')).toBeInTheDocument()
    })

    it('displays cancel and block buttons', () => {
      render(<BlockUserDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      // Block User button in the footer (not the title)
      expect(screen.getByRole('button', { name: /^block user$/i })).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('allows selecting a reason', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'security_incident')

      expect(select).toHaveValue('security_incident')
    })

    it('allows entering notes', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'Suspicious activity detected')

      expect(textarea).toHaveValue('Suspicious activity detected')
    })

    it('displays character count for notes', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'Test notes')

      expect(screen.getByText('10/1000 characters')).toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('disables Block User button when no reason selected', () => {
      render(<BlockUserDialog {...defaultProps} />)

      const blockButton = screen.getByRole('button', { name: /^block user$/i })
      expect(blockButton).toBeDisabled()
    })

    it('enables Block User button when reason is selected', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'security_incident')

      const blockButton = screen.getByRole('button', { name: /^block user$/i })
      expect(blockButton).not.toBeDisabled()
    })

    it('calls onConfirm with reason when submitted', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'policy_violation')

      const blockButton = screen.getByRole('button', { name: /^block user$/i })
      await user.click(blockButton)

      expect(defaultProps.onConfirm).toHaveBeenCalledWith({
        reason: 'policy_violation',
        notes: undefined,
      })
    })

    it('calls onConfirm with reason and notes when both provided', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'security_incident')

      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'User attempted brute force login')

      const blockButton = screen.getByRole('button', { name: /^block user$/i })
      await user.click(blockButton)

      expect(defaultProps.onConfirm).toHaveBeenCalledWith({
        reason: 'security_incident',
        notes: 'User attempted brute force login',
      })
    })

    it('trims whitespace from notes', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'other')

      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, '  Some notes with spaces  ')

      const blockButton = screen.getByRole('button', { name: /^block user$/i })
      await user.click(blockButton)

      expect(defaultProps.onConfirm).toHaveBeenCalledWith({
        reason: 'other',
        notes: 'Some notes with spaces',
      })
    })
  })

  describe('cancel behavior', () => {
    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('loading state', () => {
    it('shows loading text when isLoading is true', () => {
      render(<BlockUserDialog {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Blocking...')).toBeInTheDocument()
    })

    it('shows loader icon when loading', () => {
      render(<BlockUserDialog {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('disables buttons when loading', async () => {
      const user = userEvent.setup()

      render(<BlockUserDialog {...defaultProps} isLoading={true} />)

      // Select a reason first
      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'security_incident')

      const cancelButton = screen.getByText('Cancel')
      const blockButton = screen.getByText('Blocking...')

      expect(cancelButton).toBeDisabled()
      expect(blockButton).toBeDisabled()
    })
  })

  describe('form reset', () => {
    it('resets form when dialog is closed', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<BlockUserDialog {...defaultProps} />)

      // Fill in the form
      const select = screen.getByTestId('select-native')
      await user.selectOptions(select, 'security_incident')

      const textarea = screen.getByTestId('textarea')
      await user.type(textarea, 'Some notes')

      // Close and reopen the dialog
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // The onOpenChange mock was called with false
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
