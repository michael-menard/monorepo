import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnblockUserDialog } from '../UnblockUserDialog'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Dialog: vi.fn(({ children, open }) =>
      open ? React.createElement('div', { 'data-testid': 'dialog', role: 'dialog' }, children) : null
    ),
    DialogContent: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-content', ...props }, children)
    ),
    DialogHeader: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-header', ...props }, children)
    ),
    DialogTitle: vi.fn(({ children, ...props }) =>
      React.createElement('h2', { 'data-testid': 'dialog-title', ...props }, children)
    ),
    DialogDescription: vi.fn(({ children, ...props }) =>
      React.createElement('p', { 'data-testid': 'dialog-description', ...props }, children)
    ),
    DialogFooter: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'dialog-footer', ...props }, children)
    ),
    Button: vi.fn(({ children, onClick, disabled, ...props }) =>
      React.createElement('button', { onClick, disabled, ...props }, children)
    ),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Shield: vi.fn(props => React.createElement('svg', { 'data-testid': 'shield-icon', ...props })),
    Loader2: vi.fn(props => React.createElement('svg', { 'data-testid': 'loader-icon', ...props })),
    CheckCircle: vi.fn(props => React.createElement('svg', { 'data-testid': 'check-icon', ...props })),
  }
})

describe('UnblockUserDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
    username: 'testuser',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<UnblockUserDialog {...defaultProps} />)
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<UnblockUserDialog {...defaultProps} open={false} />)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('displays username in description', () => {
      render(<UnblockUserDialog {...defaultProps} username="johndoe" />)
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('johndoe')
    })

    it('displays unblock confirmation message', () => {
      render(<UnblockUserDialog {...defaultProps} />)
      expect(screen.getByText(/account will be restored/i)).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onConfirm when unblock button is clicked', async () => {
      const user = userEvent.setup()
      render(<UnblockUserDialog {...defaultProps} />)
      const confirmButton = screen.getByRole('button', { name: /unblock user/i })
      await user.click(confirmButton)
      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })

    it('calls onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<UnblockUserDialog {...defaultProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('loading state', () => {
    it('shows loading text when isLoading is true', () => {
      render(<UnblockUserDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByText(/unblocking/i)).toBeInTheDocument()
    })

    it('disables buttons when loading', () => {
      render(<UnblockUserDialog {...defaultProps} isLoading={true} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const confirmButton = screen.getByRole('button', { name: /unblocking/i })
      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('renders dialog with proper role', () => {
      render(<UnblockUserDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
