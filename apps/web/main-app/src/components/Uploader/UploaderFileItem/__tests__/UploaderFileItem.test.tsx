import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UploaderFileItem as FileItemType } from '@repo/upload/types'
import { UploaderFileItem } from '../index'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Button: vi.fn(({ children, onClick, disabled, className, ...props }) =>
      React.createElement('button', { onClick, disabled, className, ...props }, children),
    ),
    Progress: vi.fn(({ value, showValue, valueText, className, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'progress', 'data-value': value, className, role: 'progressbar', ...props },
        showValue && valueText,
      ),
    ),
    AppBadge: vi.fn(({ children, variant, className, ...props }) =>
      React.createElement('span', { 'data-variant': variant, className, ...props }, children),
    ),
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    X: vi.fn(props => React.createElement('svg', { 'data-testid': 'x-icon', ...props })),
    RefreshCw: vi.fn(props => React.createElement('svg', { 'data-testid': 'refresh-cw-icon', ...props })),
    Check: vi.fn(props => React.createElement('svg', { 'data-testid': 'check-icon', ...props })),
    AlertCircle: vi.fn(props => React.createElement('svg', { 'data-testid': 'alert-circle-icon', ...props })),
    Clock: vi.fn(props => React.createElement('svg', { 'data-testid': 'clock-icon', ...props })),
    Ban: vi.fn(props => React.createElement('svg', { 'data-testid': 'ban-icon', ...props })),
    FileText: vi.fn(props => React.createElement('svg', { 'data-testid': 'file-text-icon', ...props })),
    Image: vi.fn(props => React.createElement('svg', { 'data-testid': 'image-icon', ...props })),
  }
})

describe('UploaderFileItem', () => {
  const mockFile: FileItemType = {
    id: 'file-1',
    name: 'test-file.pdf',
    size: 1024000,
    type: 'application/pdf',
    lastModified: Date.now(),
    category: 'instruction',
    status: 'queued',
    progress: 0,
    expired: false,
  }

  const mockHandlers = {
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders file name and size', () => {
      render(<UploaderFileItem file={mockFile} />)

      expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
      expect(screen.getByText('1000.0 KB')).toBeInTheDocument()
    })

    it('renders file category', () => {
      render(<UploaderFileItem file={mockFile} />)

      expect(screen.getByText('instruction')).toBeInTheDocument()
    })

    it('renders queued status badge', () => {
      render(<UploaderFileItem file={mockFile} />)

      expect(screen.getByText('Queued')).toBeInTheDocument()
    })

    it('renders uploading status with progress bar', () => {
      const uploadingFile = { ...mockFile, status: 'uploading' as const, progress: 45 }
      render(<UploaderFileItem file={uploadingFile} />)

      expect(screen.getByText('Uploading')).toBeInTheDocument()
      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-value', '45')
      expect(progress).toHaveTextContent('45%')
    })

    it('renders success status', () => {
      const successFile = { ...mockFile, status: 'success' as const }
      render(<UploaderFileItem file={successFile} />)

      expect(screen.getByText('Complete')).toBeInTheDocument()
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })

    it('renders failed status', () => {
      const failedFile = { ...mockFile, status: 'failed' as const }
      render(<UploaderFileItem file={failedFile} />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('renders canceled status', () => {
      const canceledFile = { ...mockFile, status: 'canceled' as const }
      render(<UploaderFileItem file={canceledFile} />)

      expect(screen.getByText('Canceled')).toBeInTheDocument()
      expect(screen.getByTestId('ban-icon')).toBeInTheDocument()
    })

    it('renders expired status', () => {
      const expiredFile = { ...mockFile, status: 'expired' as const }
      render(<UploaderFileItem file={expiredFile} />)

      expect(screen.getByText('Expired')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('renders error message when present', () => {
      const fileWithError = { ...mockFile, errorMessage: 'Upload failed due to network error' }
      render(<UploaderFileItem file={fileWithError} />)

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveTextContent('Upload failed due to network error')
    })

    it('renders image icon for image category', () => {
      const imageFile = { ...mockFile, category: 'image' as const }
      render(<UploaderFileItem file={imageFile} />)

      expect(screen.getByTestId('image-icon')).toBeInTheDocument()
    })

    it('renders file icon for instruction category', () => {
      render(<UploaderFileItem file={mockFile} />)

      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('shows cancel button for queued files', () => {
      render(<UploaderFileItem file={mockFile} {...mockHandlers} />)

      const cancelButton = screen.getByLabelText('Cancel upload of test-file.pdf')
      expect(cancelButton).toBeInTheDocument()
    })

    it('shows cancel button for uploading files', () => {
      const uploadingFile = { ...mockFile, status: 'uploading' as const }
      render(<UploaderFileItem file={uploadingFile} {...mockHandlers} />)

      const cancelButton = screen.getByLabelText('Cancel upload of test-file.pdf')
      expect(cancelButton).toBeInTheDocument()
    })

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<UploaderFileItem file={mockFile} {...mockHandlers} />)

      const cancelButton = screen.getByLabelText('Cancel upload of test-file.pdf')
      await user.click(cancelButton)

      expect(mockHandlers.onCancel).toHaveBeenCalledWith('file-1')
      expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1)
    })

    it('shows retry button for failed files', () => {
      const failedFile = { ...mockFile, status: 'failed' as const }
      render(<UploaderFileItem file={failedFile} {...mockHandlers} />)

      const retryButton = screen.getByLabelText('Retry upload of test-file.pdf')
      expect(retryButton).toBeInTheDocument()
    })

    it('shows retry button for expired files', () => {
      const expiredFile = { ...mockFile, status: 'expired' as const }
      render(<UploaderFileItem file={expiredFile} {...mockHandlers} />)

      const retryButton = screen.getByLabelText('Retry upload of test-file.pdf')
      expect(retryButton).toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const failedFile = { ...mockFile, status: 'failed' as const }
      render(<UploaderFileItem file={failedFile} {...mockHandlers} />)

      const retryButton = screen.getByLabelText('Retry upload of test-file.pdf')
      await user.click(retryButton)

      expect(mockHandlers.onRetry).toHaveBeenCalledWith('file-1')
      expect(mockHandlers.onRetry).toHaveBeenCalledTimes(1)
    })

    it('shows remove button for successful files', () => {
      const successFile = { ...mockFile, status: 'success' as const }
      render(<UploaderFileItem file={successFile} {...mockHandlers} />)

      const removeButton = screen.getByLabelText('Remove test-file.pdf')
      expect(removeButton).toBeInTheDocument()
    })

    it('shows remove button for canceled files', () => {
      const canceledFile = { ...mockFile, status: 'canceled' as const }
      render(<UploaderFileItem file={canceledFile} {...mockHandlers} />)

      const removeButton = screen.getByLabelText('Remove test-file.pdf')
      expect(removeButton).toBeInTheDocument()
    })

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const successFile = { ...mockFile, status: 'success' as const }
      render(<UploaderFileItem file={successFile} {...mockHandlers} />)

      const removeButton = screen.getByLabelText('Remove test-file.pdf')
      await user.click(removeButton)

      expect(mockHandlers.onRemove).toHaveBeenCalledWith('file-1')
      expect(mockHandlers.onRemove).toHaveBeenCalledTimes(1)
    })

    it('disables cancel button when disabled prop is true', () => {
      render(<UploaderFileItem file={mockFile} {...mockHandlers} disabled />)

      const cancelButton = screen.getByLabelText('Cancel upload of test-file.pdf')
      expect(cancelButton).toBeDisabled()
    })

    it('disables retry button when disabled prop is true', () => {
      const failedFile = { ...mockFile, status: 'failed' as const }
      render(<UploaderFileItem file={failedFile} {...mockHandlers} disabled />)

      const retryButton = screen.getByLabelText('Retry upload of test-file.pdf')
      expect(retryButton).toBeDisabled()
    })

    it('disables remove button when disabled prop is true', () => {
      const successFile = { ...mockFile, status: 'success' as const }
      render(<UploaderFileItem file={successFile} {...mockHandlers} disabled />)

      const removeButton = screen.getByLabelText('Remove test-file.pdf')
      expect(removeButton).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has role listitem', () => {
      const { container } = render(<UploaderFileItem file={mockFile} />)

      const listItem = container.querySelector('[role="listitem"]')
      expect(listItem).toBeInTheDocument()
    })

    it('has aria-label with file name and status', () => {
      render(<UploaderFileItem file={mockFile} />)

      const listItem = screen.getByLabelText('test-file.pdf, Queued')
      expect(listItem).toBeInTheDocument()
    })

    it('error message has role alert and aria-live polite', () => {
      const fileWithError = { ...mockFile, errorMessage: 'Upload failed' }
      render(<UploaderFileItem file={fileWithError} />)

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('progress bar has proper label', () => {
      const uploadingFile = { ...mockFile, status: 'uploading' as const, progress: 45 }
      render(<UploaderFileItem file={uploadingFile} />)

      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('role', 'progressbar')
    })

    it('action buttons have descriptive aria-labels', () => {
      const uploadingFile = { ...mockFile, status: 'uploading' as const }
      render(<UploaderFileItem file={uploadingFile} {...mockHandlers} />)

      const cancelButton = screen.getByLabelText('Cancel upload of test-file.pdf')
      expect(cancelButton).toBeInTheDocument()
    })
  })
})
