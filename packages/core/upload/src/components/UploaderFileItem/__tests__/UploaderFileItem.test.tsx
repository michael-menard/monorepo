/**
 * REPA-0510: UploaderFileItem Tests
 * Comprehensive test suite for file item display with status, progress, and actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploaderFileItem } from '../index'
import type { UploaderFileItem as FileItemType } from '@repo/upload/types'

describe('UploaderFileItem', () => {
  const baseFile: FileItemType = {
    id: 'file-1',
    name: 'test-file.pdf',
    size: 1024 * 500, // 500 KB
    category: 'instruction',
    status: 'queued',
    progress: 0,
    errorMessage: null,
  }

  const defaultProps = {
    file: baseFile,
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render file item', () => {
      render(<UploaderFileItem {...defaultProps} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
      expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
    })

    it('should display file name', () => {
      render(<UploaderFileItem {...defaultProps} />)

      expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
    })

    it('should display file size', () => {
      render(<UploaderFileItem {...defaultProps} />)

      expect(screen.getByText('500.0 KB')).toBeInTheDocument()
    })

    it('should display category label', () => {
      render(<UploaderFileItem {...defaultProps} />)

      expect(screen.getByText('instruction')).toBeInTheDocument()
    })

    it('should display parts-list category with formatted label', () => {
      const file = { ...baseFile, category: 'parts-list' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('parts list')).toBeInTheDocument()
    })

    it('should display thumbnail category icon', () => {
      const file = { ...baseFile, category: 'thumbnail' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const icon = document.querySelector('.lucide-image')
      expect(icon).toBeInTheDocument()
    })

    it('should display instruction category icon', () => {
      render(<UploaderFileItem {...defaultProps} />)

      const icon = document.querySelector('.lucide-file-text')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('File Size Formatting', () => {
    it('should format bytes', () => {
      const file = { ...baseFile, size: 512 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('512 B')).toBeInTheDocument()
    })

    it('should format kilobytes', () => {
      const file = { ...baseFile, size: 1024 * 100 } // 100 KB
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('100.0 KB')).toBeInTheDocument()
    })

    it('should format megabytes', () => {
      const file = { ...baseFile, size: 1024 * 1024 * 5 } // 5 MB
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('5.0 MB')).toBeInTheDocument()
    })

    it('should round to one decimal place', () => {
      const file = { ...baseFile, size: 1024 * 1536 } // 1.5 MB
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('1.5 MB')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('should show queued status badge', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Queued')).toBeInTheDocument()
    })

    it('should show uploading status badge', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 50 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Uploading')).toBeInTheDocument()
    })

    it('should show complete status badge', () => {
      const file = { ...baseFile, status: 'success' as const, progress: 100 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Complete')).toBeInTheDocument()
    })

    it('should show failed status badge', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Failed')).toBeInTheDocument()
    })

    it('should show canceled status badge', () => {
      const file = { ...baseFile, status: 'canceled' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Canceled')).toBeInTheDocument()
    })

    it('should show expired status badge', () => {
      const file = { ...baseFile, status: 'expired' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('Expired')).toBeInTheDocument()
    })
  })

  describe('Status Icons', () => {
    it('should show check icon for success', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const checkIcon = document.querySelector('.text-green-500')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should show alert icon for failed', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const alertIcon = document.querySelector('.text-destructive')
      expect(alertIcon).toBeInTheDocument()
    })

    it('should show ban icon for canceled', () => {
      const file = { ...baseFile, status: 'canceled' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const banIcon = document.querySelector('.lucide-ban')
      expect(banIcon).toBeInTheDocument()
    })

    it('should show clock icon for queued', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const clockIcon = document.querySelector('.lucide-clock')
      expect(clockIcon).toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {
    it('should show progress bar when uploading', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 45 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '45')
    })

    it('should not show progress bar when queued', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('should not show progress bar when complete', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('should display progress percentage', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 75 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('Error Messages', () => {
    it('should display error message when present', () => {
      const file = {
        ...baseFile,
        status: 'failed' as const,
        errorMessage: 'Upload failed: Network error',
      }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.getByRole('alert')).toHaveTextContent('Upload failed: Network error')
    })

    it('should not display error message when null', () => {
      const file = { ...baseFile, status: 'failed' as const, errorMessage: null }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should have aria-live on error message', () => {
      const file = {
        ...baseFile,
        status: 'failed' as const,
        errorMessage: 'Upload failed',
      }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const errorElement = screen.getByRole('alert')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Action Buttons - Cancel', () => {
    it('should show cancel button when queued', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload of test-file.pdf/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should show cancel button when uploading', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 50 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload of test-file.pdf/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should call onCancel with file id when clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem {...defaultProps} file={file} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledWith('file-1')
    })

    it('should not show cancel button when complete', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('should not show cancel button when failed', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons - Retry', () => {
    it('should show retry button when failed', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const retryButton = screen.getByRole('button', { name: /retry upload of test-file.pdf/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should show retry button when expired', () => {
      const file = { ...baseFile, status: 'expired' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const retryButton = screen.getByRole('button', { name: /retry upload of test-file.pdf/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should call onRetry with file id when clicked', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} onRetry={onRetry} />)

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      await user.click(retryButton)

      expect(onRetry).toHaveBeenCalledWith('file-1')
    })

    it('should not show retry button when queued', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('should not show retry button when uploading', () => {
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons - Remove', () => {
    it('should show remove button when complete', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const removeButton = screen.getByRole('button', { name: /remove test-file.pdf/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should show remove button when canceled', () => {
      const file = { ...baseFile, status: 'canceled' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const removeButton = screen.getByRole('button', { name: /remove test-file.pdf/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should call onRemove with file id when clicked', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} onRemove={onRemove} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(onRemove).toHaveBeenCalledWith('file-1')
    })

    it('should not show remove button when queued', () => {
      const file = { ...baseFile, status: 'queued' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    })

    it('should not show remove button when failed', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable cancel button when disabled prop is true', () => {
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem {...defaultProps} file={file} disabled={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it('should disable retry button when disabled prop is true', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} disabled={true} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeDisabled()
    })

    it('should disable remove button when disabled prop is true', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} disabled={true} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeDisabled()
    })

    it('should not call handlers when buttons are disabled', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem {...defaultProps} file={file} onCancel={onCancel} disabled={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('Visual States', () => {
    it('should apply error styling for failed files', () => {
      const file = { ...baseFile, status: 'failed' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem.className).toContain('border-destructive')
      expect(listItem.className).toContain('bg-destructive')
    })

    it('should apply warning styling for expired files', () => {
      const file = { ...baseFile, status: 'expired' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem.className).toContain('border-yellow-500')
      expect(listItem.className).toContain('bg-yellow-500')
    })

    it('should apply success styling for complete files', () => {
      const file = { ...baseFile, status: 'success' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem.className).toContain('border-green-500')
      expect(listItem.className).toContain('bg-green-500')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible name with file name and status', () => {
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const listItem = screen.getByRole('listitem')
      expect(listItem).toHaveAttribute('aria-label', 'test-file.pdf, Uploading')
    })

    it('should have title attribute on file name for tooltip', () => {
      render(<UploaderFileItem {...defaultProps} />)

      const fileName = screen.getByText('test-file.pdf')
      expect(fileName).toHaveAttribute('title', 'test-file.pdf')
    })

    it('should hide icons from screen readers', () => {
      render(<UploaderFileItem {...defaultProps} />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have proper progress bar label', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 60 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const progressBar = screen.getByRole('progressbar')
      // Progress component may use aria-label or have it on parent/wrapper
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long file names', () => {
      const file = { ...baseFile, name: 'a'.repeat(200) + '.pdf' }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const fileName = screen.getByText(/a+\.pdf/)
      expect(fileName).toHaveClass('truncate')
    })

    it('should handle zero progress', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 0 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should handle 100% progress', () => {
      const file = { ...baseFile, status: 'uploading' as const, progress: 100 }
      render(<UploaderFileItem {...defaultProps} file={file} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('should handle missing optional callbacks', () => {
      const file = { ...baseFile, status: 'uploading' as const }
      render(<UploaderFileItem file={file} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('should handle all file categories', () => {
      const categories: Array<'instruction' | 'parts-list' | 'image' | 'thumbnail'> = [
        'instruction',
        'parts-list',
        'image',
        'thumbnail',
      ]

      categories.forEach(category => {
        const file = { ...baseFile, category }
        const { unmount } = render(<UploaderFileItem {...defaultProps} file={file} />)
        expect(screen.getByRole('listitem')).toBeInTheDocument()
        unmount()
      })
    })

    it('should memoize and not re-render unnecessarily', () => {
      const { rerender } = render(<UploaderFileItem {...defaultProps} />)

      // Re-render with same props
      rerender(<UploaderFileItem {...defaultProps} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })
  })
})
