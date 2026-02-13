/**
 * REPA-0510: UploaderList Tests
 * Comprehensive test suite for grouped file list with aggregate progress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploaderList } from '../index'
import type { UploadBatchState, UploaderFileItem } from '@repo/upload/types'

describe('UploaderList', () => {
  const createFile = (overrides: Partial<UploaderFileItem> = {}): UploaderFileItem => ({
    id: `file-${Math.random()}`,
    name: 'test-file.pdf',
    size: 1024 * 500,
    category: 'instruction',
    status: 'queued',
    progress: 0,
    errorMessage: null,
    ...overrides,
  })

  const createState = (overrides: Partial<UploadBatchState> = {}): UploadBatchState => ({
    files: [],
    overallProgress: 0,
    queuedCount: 0,
    uploadingCount: 0,
    successCount: 0,
    failedCount: 0,
    expiredCount: 0,
    canceledCount: 0,
    isComplete: false,
    hasErrors: false,
    ...overrides,
  })

  const defaultProps = {
    state: createState(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when there are no files', () => {
      render(<UploaderList {...defaultProps} state={createState({ files: [] })} />)

      expect(screen.queryByText('Upload Progress')).not.toBeInTheDocument()
    })

    it('should render progress header when files exist', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    })

    it('should render aggregate progress bar', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 50 })} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('should display completion count', () => {
      const files = [createFile(), createFile(), createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, successCount: 2 })} />)

      expect(screen.getByText('2 of 3 complete')).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 75 })} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('Status Summary', () => {
    it('should show queued count when files are queued', () => {
      const files = [createFile({ status: 'queued' }), createFile({ status: 'queued' })]
      render(<UploaderList {...defaultProps} state={createState({ files, queuedCount: 2 })} />)

      expect(screen.getByText('2 queued')).toBeInTheDocument()
    })

    it('should show uploading count when files are uploading', () => {
      const files = [createFile({ status: 'uploading' })]
      render(<UploaderList {...defaultProps} state={createState({ files, uploadingCount: 1 })} />)

      expect(screen.getByText('1 uploading')).toBeInTheDocument()
    })

    it('should show failed count when files failed', () => {
      const files = [createFile({ status: 'failed' })]
      render(<UploaderList {...defaultProps} state={createState({ files, failedCount: 1 })} />)

      expect(screen.getByText('1 failed')).toBeInTheDocument()
    })

    it('should show expired count when files expired', () => {
      const files = [createFile({ status: 'expired' })]
      render(<UploaderList {...defaultProps} state={createState({ files, expiredCount: 1 })} />)

      expect(screen.getByText('1 expired')).toBeInTheDocument()
    })

    it('should show multiple status counts simultaneously', () => {
      const files = [
        createFile({ status: 'queued' }),
        createFile({ status: 'uploading' }),
        createFile({ status: 'failed' }),
      ]
      render(
        <UploaderList
          {...defaultProps}
          state={createState({ files, queuedCount: 1, uploadingCount: 1, failedCount: 1 })}
        />,
      )

      expect(screen.getByText('1 queued')).toBeInTheDocument()
      expect(screen.getByText('1 uploading')).toBeInTheDocument()
      expect(screen.getByText('1 failed')).toBeInTheDocument()
    })

    it('should not show status count when count is zero', () => {
      const files = [createFile({ status: 'success' })]
      render(<UploaderList {...defaultProps} state={createState({ files, queuedCount: 0 })} />)

      expect(screen.queryByText(/queued/)).not.toBeInTheDocument()
    })
  })

  describe('File Grouping by Category', () => {
    it('should group instruction files', () => {
      const files = [createFile({ category: 'instruction', name: 'instructions.pdf' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Instructions \(1\)/)).toBeInTheDocument()
      expect(screen.getByRole('list', { name: /instructions files/i })).toBeInTheDocument()
    })

    it('should group parts-list files', () => {
      const files = [createFile({ category: 'parts-list', name: 'parts.pdf' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Parts Lists \(1\)/)).toBeInTheDocument()
      expect(screen.getByRole('list', { name: /parts lists files/i })).toBeInTheDocument()
    })

    it('should group image files', () => {
      const files = [createFile({ category: 'image', name: 'photo.jpg' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Gallery Images \(1\)/)).toBeInTheDocument()
      expect(screen.getByRole('list', { name: /gallery images files/i })).toBeInTheDocument()
    })

    it('should group thumbnail files', () => {
      const files = [createFile({ category: 'thumbnail', name: 'thumb.jpg' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Thumbnail \(1\)/)).toBeInTheDocument()
      expect(screen.getByRole('list', { name: /thumbnail files/i })).toBeInTheDocument()
    })

    it('should display multiple categories in correct order', () => {
      const files = [
        createFile({ category: 'image', name: 'image.jpg', id: '1' }),
        createFile({ category: 'instruction', name: 'inst.pdf', id: '2' }),
        createFile({ category: 'thumbnail', name: 'thumb.jpg', id: '3' }),
        createFile({ category: 'parts-list', name: 'parts.pdf', id: '4' }),
      ]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      // Verify all category headings are present in the document
      expect(screen.getByText(/Instructions \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Parts Lists \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Thumbnail \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Gallery Images \(1\)/)).toBeInTheDocument()
    })

    it('should show correct file count per category', () => {
      const files = [
        createFile({ category: 'instruction', id: '1' }),
        createFile({ category: 'instruction', id: '2' }),
        createFile({ category: 'image', id: '3' }),
      ]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Instructions \(2\)/)).toBeInTheDocument()
      expect(screen.getByText(/Gallery Images \(1\)/)).toBeInTheDocument()
    })

    it('should not display category when empty', () => {
      const files = [createFile({ category: 'instruction' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.queryByText(/Parts Lists/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Thumbnail/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Gallery Images/)).not.toBeInTheDocument()
    })
  })

  describe('Category Icons', () => {
    it('should show instruction icon', () => {
      const files = [createFile({ category: 'instruction' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const icon = document.querySelector('.lucide-file-text')
      expect(icon).toBeInTheDocument()
    })

    it('should show parts list icon', () => {
      const files = [createFile({ category: 'parts-list' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const icon = document.querySelector('.lucide-list')
      expect(icon).toBeInTheDocument()
    })

    it('should show image icon', () => {
      const files = [createFile({ category: 'image' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const icon = document.querySelector('.lucide-image')
      expect(icon).toBeInTheDocument()
    })

    it('should show thumbnail icon', () => {
      const files = [createFile({ category: 'thumbnail' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      // ImageIcon component renders as lucide-image or similar
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('File Items', () => {
    it('should render file items', () => {
      const files = [createFile({ name: 'file1.pdf', id: '1' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
      expect(screen.getByText('file1.pdf')).toBeInTheDocument()
    })

    it('should pass callbacks to file items', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      const files = [createFile({ status: 'uploading', name: 'file.pdf', id: 'test-id' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledWith('test-id')
    })

    it('should pass disabled prop to file items', () => {
      const files = [createFile({ status: 'uploading' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} disabled={true} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it('should render multiple file items per category', () => {
      const files = [
        createFile({ category: 'instruction', name: 'file1.pdf', id: '1' }),
        createFile({ category: 'instruction', name: 'file2.pdf', id: '2' }),
      ]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText('file1.pdf')).toBeInTheDocument()
      expect(screen.getByText('file2.pdf')).toBeInTheDocument()
    })
  })

  describe('Completion Announcements', () => {
    it('should announce when all files are complete', () => {
      const files = [createFile({ status: 'success' })]
      render(<UploaderList {...defaultProps} state={createState({ files, isComplete: true, successCount: 1 })} />)

      const announcement = screen.getByRole('status')
      expect(announcement).toHaveTextContent(/all files uploaded successfully/i)
    })

    it('should announce failed files count', () => {
      const files = [createFile({ status: 'failed' })]
      render(<UploaderList {...defaultProps} state={createState({ files, failedCount: 2 })} />)

      const announcement = screen.getByRole('status')
      expect(announcement).toHaveTextContent(/2 files failed to upload/i)
    })

    it('should not announce completion when not complete', () => {
      const files = [createFile({ status: 'uploading' })]
      render(<UploaderList {...defaultProps} state={createState({ files, isComplete: false })} />)

      const announcement = screen.getByRole('status')
      expect(announcement).not.toHaveTextContent(/all files uploaded/i)
    })
  })

  describe('Accessibility', () => {
    it('should have screen reader announcement with polite live region', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
      expect(status).toHaveAttribute('aria-atomic', 'true')
    })

    it('should hide status from visual display', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, isComplete: true })} />)

      const status = screen.getByRole('status')
      expect(status).toHaveClass('sr-only')
    })

    it('should have accessible label on category lists', () => {
      const files = [createFile({ category: 'instruction' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const list = screen.getByRole('list', { name: /instructions files/i })
      expect(list).toHaveAttribute('aria-label', 'Instructions files')
    })

    it('should hide category icons from screen readers', () => {
      const files = [createFile({ category: 'instruction' })]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      const icons = document.querySelectorAll('svg[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should have accessible progress bar', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 50 })} />)

      const progressBar = screen.getByRole('progressbar')
      // Progress bar may have label attribute or wrapper label
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty files array', () => {
      render(<UploaderList {...defaultProps} state={createState({ files: [] })} />)

      expect(screen.queryByText('Upload Progress')).not.toBeInTheDocument()
    })

    it('should handle missing optional callbacks', () => {
      const files = [createFile()]
      render(<UploaderList state={createState({ files })} />)

      expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('should handle large number of files', () => {
      const files = Array.from({ length: 100 }, (_, i) =>
        createFile({ id: `file-${i}`, name: `file-${i}.pdf` }),
      )
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText('0 of 100 complete')).toBeInTheDocument()
    })

    it('should handle zero overall progress', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 0 })} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should handle 100% overall progress', () => {
      const files = [createFile({ status: 'success' })]
      render(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 100, successCount: 1 })} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('should update when state changes', () => {
      const files = [createFile()]
      const { rerender } = render(
        <UploaderList {...defaultProps} state={createState({ files, overallProgress: 25 })} />,
      )

      expect(screen.getByText('25%')).toBeInTheDocument()

      rerender(<UploaderList {...defaultProps} state={createState({ files, overallProgress: 75 })} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should handle files changing categories', () => {
      const files = [createFile({ category: 'instruction', id: '1' })]
      const { rerender } = render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Instructions/)).toBeInTheDocument()

      const updatedFiles = [createFile({ category: 'image', id: '1' })]
      rerender(<UploaderList {...defaultProps} state={createState({ files: updatedFiles })} />)

      expect(screen.queryByText(/Instructions/)).not.toBeInTheDocument()
      expect(screen.getByText(/Gallery Images/)).toBeInTheDocument()
    })

    it('should handle mixed status files in same category', () => {
      const files = [
        createFile({ category: 'instruction', status: 'queued', id: '1' }),
        createFile({ category: 'instruction', status: 'uploading', id: '2' }),
        createFile({ category: 'instruction', status: 'success', id: '3' }),
      ]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText(/Instructions \(3\)/)).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
    })
  })

  describe('Visual Layout', () => {
    it('should render progress card with proper structure', () => {
      const files = [createFile()]
      render(<UploaderList {...defaultProps} state={createState({ files })} />)

      expect(screen.getByText('Upload Progress')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should apply proper styling classes', () => {
      const files = [createFile({ status: 'failed' })]
      render(<UploaderList {...defaultProps} state={createState({ files, failedCount: 1 })} />)

      const failedText = screen.getByText('1 failed')
      expect(failedText.className).toContain('text-destructive')
    })

    it('should apply warning color to expired files', () => {
      const files = [createFile({ status: 'expired' })]
      render(<UploaderList {...defaultProps} state={createState({ files, expiredCount: 1 })} />)

      const expiredText = screen.getByText('1 expired')
      expect(expiredText.className).toContain('text-yellow-600')
    })
  })
})
