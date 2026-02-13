/**
 * Tests for UploaderFileItem component (Phase 4)
 * 
 * Tests display component for individual file upload items:
 * - File info display (name, size, category)
 * - Status badges and icons
 * - Progress bar
 * - Action buttons (cancel, retry, remove)
 * - Accessibility attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploaderFileItem } from '../index'
import type { UploaderFileItem as FileItemType } from '@repo/upload/types'

// Helper to create mock file item
const createMockFileItem = (overrides?: Partial<FileItemType>): FileItemType => ({
  id: 'file-123',
  name: 'test-file.pdf',
  size: 1024 * 1024,  // 1 MB
  type: 'application/pdf',
  category: 'instruction',
  status: 'queued',
  progress: 0,
  uploadUrl: 'https://s3.mock.com/upload',
  errorMessage: null,
  ...overrides,
})

describe('UploaderFileItem', () => {
  const mockOnCancel = vi.fn()
  const mockOnRetry = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('File Information Display', () => {
    it('should render file name, size, and category', () => {
      const file = createMockFileItem({
        name: 'my-instructions.pdf',
        size: 2048 * 1024,  // 2 MB
        category: 'instruction',
      })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('my-instructions.pdf')).toBeInTheDocument()
      expect(screen.getByText('2.0 MB')).toBeInTheDocument()
      // Category is rendered lowercase with CSS capitalize class
      expect(screen.getByText('instruction')).toBeInTheDocument()
    })

    it('should format file size in bytes', () => {
      const file = createMockFileItem({ size: 512 })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('512 B')).toBeInTheDocument()
    })

    it('should format file size in KB', () => {
      const file = createMockFileItem({ size: 1536 })  // 1.5 KB
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('1.5 KB')).toBeInTheDocument()
    })

    it('should format file size in MB', () => {
      const file = createMockFileItem({ size: 2.5 * 1024 * 1024 })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('2.5 MB')).toBeInTheDocument()
    })

    it('should have role="listitem"', () => {
      const file = createMockFileItem()
      
      const { container } = render(<UploaderFileItem file={file} />)
      
      const listItem = container.querySelector('[role="listitem"]')
      expect(listItem).toBeInTheDocument()
    })
  })

  describe('File Type Icons', () => {
    it('should display PDF icon for instruction category', () => {
      const file = createMockFileItem({ category: 'instruction' })
      
      const { container } = render(<UploaderFileItem file={file} />)
      
      // FileText icon should be present
      const fileIcon = container.querySelector('svg')
      expect(fileIcon).toBeInTheDocument()
    })

    it('should display image icon for image category', () => {
      const file = createMockFileItem({ category: 'image' })
      
      const { container } = render(<UploaderFileItem file={file} />)
      
      const imageIcon = container.querySelector('svg')
      expect(imageIcon).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    it('should show status badge with correct variant for queued', () => {
      const file = createMockFileItem({ status: 'queued' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Queued')).toBeInTheDocument()
    })

    it('should show status badge with correct variant for uploading', () => {
      const file = createMockFileItem({ status: 'uploading' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Uploading')).toBeInTheDocument()
    })

    it('should show status badge with correct variant for success', () => {
      const file = createMockFileItem({ status: 'success' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    it('should show status badge with correct variant for failed', () => {
      const file = createMockFileItem({ status: 'failed' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should show status badge with correct variant for expired', () => {
      const file = createMockFileItem({ status: 'expired' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Expired')).toBeInTheDocument()
    })

    it('should show status badge with correct variant for canceled', () => {
      const file = createMockFileItem({ status: 'canceled' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('Canceled')).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should show progress bar when status is "uploading"', () => {
      const file = createMockFileItem({ status: 'uploading', progress: 50 })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      const file = createMockFileItem({ status: 'uploading', progress: 75 })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should not show progress bar when status is not "uploading"', () => {
      const file = createMockFileItem({ status: 'success' })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('Error Messages', () => {
    it('should show error message when present', () => {
      const file = createMockFileItem({
        status: 'failed',
        errorMessage: 'Upload failed due to network error',
      })
      
      render(<UploaderFileItem file={file} />)
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toHaveTextContent('Upload failed due to network error')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
    })

    it('should not show error message when null', () => {
      const file = createMockFileItem({ errorMessage: null })
      
      render(<UploaderFileItem file={file} />)
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show cancel button when status is "uploading"', () => {
      const file = createMockFileItem({ status: 'uploading', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onCancel={mockOnCancel} />)
      
      expect(screen.getByLabelText('Cancel upload of test.pdf')).toBeInTheDocument()
    })

    it('should show cancel button when status is "queued"', () => {
      const file = createMockFileItem({ status: 'queued', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onCancel={mockOnCancel} />)
      
      expect(screen.getByLabelText('Cancel upload of test.pdf')).toBeInTheDocument()
    })

    it('should show retry button when status is "failed"', () => {
      const file = createMockFileItem({ status: 'failed', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRetry={mockOnRetry} />)
      
      expect(screen.getByLabelText('Retry upload of test.pdf')).toBeInTheDocument()
    })

    it('should show retry button when status is "expired"', () => {
      const file = createMockFileItem({ status: 'expired', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRetry={mockOnRetry} />)
      
      expect(screen.getByLabelText('Retry upload of test.pdf')).toBeInTheDocument()
    })

    it('should show remove button when status is "success"', () => {
      const file = createMockFileItem({ status: 'success', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRemove={mockOnRemove} />)
      
      expect(screen.getByLabelText('Remove test.pdf')).toBeInTheDocument()
    })

    it('should show remove button when status is "canceled"', () => {
      const file = createMockFileItem({ status: 'canceled', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRemove={mockOnRemove} />)
      
      expect(screen.getByLabelText('Remove test.pdf')).toBeInTheDocument()
    })

    it('should call onCancel with fileId when cancel clicked', async () => {
      const user = userEvent.setup()
      const file = createMockFileItem({ id: 'file-456', status: 'uploading', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByLabelText('Cancel upload of test.pdf')
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledWith('file-456')
    })

    it('should call onRetry with fileId when retry clicked', async () => {
      const user = userEvent.setup()
      const file = createMockFileItem({ id: 'file-789', status: 'failed', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRetry={mockOnRetry} />)
      
      const retryButton = screen.getByLabelText('Retry upload of test.pdf')
      await user.click(retryButton)
      
      expect(mockOnRetry).toHaveBeenCalledWith('file-789')
    })

    it('should call onRemove with fileId when remove clicked', async () => {
      const user = userEvent.setup()
      const file = createMockFileItem({ id: 'file-999', status: 'success', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onRemove={mockOnRemove} />)
      
      const removeButton = screen.getByLabelText('Remove test.pdf')
      await user.click(removeButton)
      
      expect(mockOnRemove).toHaveBeenCalledWith('file-999')
    })

    it('should disable all buttons when disabled prop is true', () => {
      const file = createMockFileItem({ status: 'uploading', name: 'test.pdf' })
      
      render(<UploaderFileItem file={file} onCancel={mockOnCancel} disabled={true} />)
      
      const cancelButton = screen.getByLabelText('Cancel upload of test.pdf')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on all buttons', () => {
      const file = createMockFileItem({ status: 'uploading', name: 'my-file.pdf' })
      
      render(<UploaderFileItem file={file} onCancel={mockOnCancel} />)
      
      const cancelButton = screen.getByLabelText('Cancel upload of my-file.pdf')
      expect(cancelButton).toHaveAttribute('aria-label')
    })

    it('should have aria-label on listitem with file name and status', () => {
      const file = createMockFileItem({ name: 'document.pdf', status: 'success' })
      
      const { container } = render(<UploaderFileItem file={file} />)
      
      const listItem = container.querySelector('[role="listitem"]')
      expect(listItem).toHaveAttribute('aria-label', 'document.pdf, Complete')
    })
  })
})
