import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RevokeTokensDialog } from '../RevokeTokensDialog'

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
    KeyRound: vi.fn(props => React.createElement('svg', { 'data-testid': 'keyround-icon', ...props })),
    Loader2: vi.fn(props => React.createElement('svg', { 'data-testid': 'loader-icon', ...props })),
    AlertTriangle: vi.fn(props => React.createElement('svg', { 'data-testid': 'alert-icon', ...props })),
  }
})

describe('RevokeTokensDialog', () => {
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
      render(<RevokeTokensDialog {...defaultProps} />)
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(<RevokeTokensDialog {...defaultProps} open={false} />)
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('displays username in description', () => {
      render(<RevokeTokensDialog {...defaultProps} username="johndoe" />)
      expect(screen.getByTestId('dialog-description')).toHaveTextContent('johndoe')
    })

    it('displays warning message', () => {
      render(<RevokeTokensDialog {...defaultProps} />)
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    })

    it('displays alert icon for warning', () => {
      render(<RevokeTokensDialog {...defaultProps} />)
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onConfirm when revoke button is clicked', async () => {
      const user = userEvent.setup()
      render(<RevokeTokensDialog {...defaultProps} />)
      const confirmButton = screen.getByRole('button', { name: /revoke tokens/i })
      await user.click(confirmButton)
      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })

    it('calls onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<RevokeTokensDialog {...defaultProps} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('loading state', () => {
    it('shows loading text when isLoading is true', () => {
      render(<RevokeTokensDialog {...defaultProps} isLoading={true} />)
      expect(screen.getByText(/revoking/i)).toBeInTheDocument()
    })

    it('disables buttons when loading', () => {
      render(<RevokeTokensDialog {...defaultProps} isLoading={true} />)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const confirmButton = screen.getByRole('button', { name: /revoking/i })
      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('renders dialog with proper role', () => {
      render(<RevokeTokensDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
