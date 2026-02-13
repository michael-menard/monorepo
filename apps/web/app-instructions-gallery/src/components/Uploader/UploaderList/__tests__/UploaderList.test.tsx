/**
 * Tests for UploaderList component (Phase 4)
 * 
 * Tests list composition component:
 * - Aggregate progress display
 * - File grouping by category
 * - Category headers
 * - Status summaries
 * - Screen reader announcements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploaderList } from '../index'
import type { UploadBatchState, UploaderFileItem } from '@repo/upload/types'

// Helper to create mock batch state
const createMockState = (overrides?: Partial<UploadBatchState>): UploadBatchState => ({
  files: [],
  isUploading: false,
  isComplete: false,
  isPaused: false,
  overallProgress: 0,
  queuedCount: 0,
  uploadingCount: 0,
  successCount: 0,
  failedCount: 0,
  canceledCount: 0,
  expiredCount: 0,
  totalSize: 0,
  uploadedSize: 0,
  ...overrides,
})

// Helper to create mock file
const createMockFile = (overrides?: Partial<UploaderFileItem>): UploaderFileItem => ({
  id: `file-${Math.random()}`,
  name: 'test.pdf',
  size: 1024,
  type: 'application/pdf',
  category: 'instruction',
  status: 'queued',
  progress: 0,
  uploadUrl: 'https://s3.mock.com/upload',
  errorMessage: null,
  ...overrides,
})

describe('UploaderList', () => {
  const mockOnCancel = vi.fn()
  const mockOnRetry = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should render nothing when files array is empty', () => {
      const state = createMockState({ files: [] })
      
      const { container } = render(<UploaderList state={state} />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Aggregate Progress Card', () => {
    it('should render aggregate progress card', () => {
      const state = createMockState({
        files: [createMockFile()],
        overallProgress: 50,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    })

    it('should show overall progress percentage', () => {
      const state = createMockState({
        files: [createMockFile()],
        overallProgress: 75,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should show file count summary (X of Y complete)', () => {
      const state = createMockState({
        files: [
          createMockFile({ status: 'success' }),
          createMockFile({ status: 'success' }),
          createMockFile({ status: 'uploading' }),
        ],
        successCount: 2,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('2 of 3 complete')).toBeInTheDocument()
    })
  })

  describe('Status Summary', () => {
    it('should show queued count when files are queued', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'queued' })],
        queuedCount: 1,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('1 queued')).toBeInTheDocument()
    })

    it('should show uploading count when files are uploading', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'uploading' })],
        uploadingCount: 1,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('1 uploading')).toBeInTheDocument()
    })

    it('should show failed count when files have failed', () => {
      const state = createMockState({
        files: [
          createMockFile({ status: 'failed' }),
          createMockFile({ status: 'failed' }),
        ],
        failedCount: 2,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('2 failed')).toBeInTheDocument()
    })

    it('should show expired count when files have expired', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'expired' })],
        expiredCount: 1,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('1 expired')).toBeInTheDocument()
    })

    it('should not show status summary for zero counts', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'success' })],
        successCount: 1,
        queuedCount: 0,
        uploadingCount: 0,
        failedCount: 0,
        expiredCount: 0,
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.queryByText(/queued/)).not.toBeInTheDocument()
      expect(screen.queryByText(/uploading/)).not.toBeInTheDocument()
      expect(screen.queryByText(/failed/)).not.toBeInTheDocument()
      expect(screen.queryByText(/expired/)).not.toBeInTheDocument()
    })
  })

  describe('File Grouping', () => {
    it('should group files by category', () => {
      const state = createMockState({
        files: [
          createMockFile({ category: 'instruction', name: 'instruction.pdf' }),
          createMockFile({ category: 'image', name: 'image1.jpg' }),
          createMockFile({ category: 'image', name: 'image2.jpg' }),
          createMockFile({ category: 'thumbnail', name: 'thumb.jpg' }),
        ],
      })
      
      render(<UploaderList state={state} />)
      
      // Check category headers
      expect(screen.getByText(/Instructions \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Gallery Images \(2\)/)).toBeInTheDocument()
      expect(screen.getByText(/Thumbnail \(1\)/)).toBeInTheDocument()
    })

    it('should render category headers with icons', () => {
      const state = createMockState({
        files: [createMockFile({ category: 'instruction' })],
      })
      
      const { container } = render(<UploaderList state={state} />)
      
      // Icon should be present in header
      const header = screen.getByText(/Instructions/)
      expect(header).toBeInTheDocument()
      
      const icon = container.querySelector('[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
    })

    it('should render file count in category header', () => {
      const state = createMockState({
        files: [
          createMockFile({ category: 'image', name: 'img1.jpg' }),
          createMockFile({ category: 'image', name: 'img2.jpg' }),
          createMockFile({ category: 'image', name: 'img3.jpg' }),
        ],
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('Gallery Images (3)')).toBeInTheDocument()
    })
  })

  describe('File Items', () => {
    it('should render UploaderFileItem for each file', () => {
      const state = createMockState({
        files: [
          createMockFile({ name: 'file1.pdf' }),
          createMockFile({ name: 'file2.pdf' }),
        ],
      })
      
      render(<UploaderList state={state} />)
      
      expect(screen.getByText('file1.pdf')).toBeInTheDocument()
      expect(screen.getByText('file2.pdf')).toBeInTheDocument()
    })

    it('should pass callbacks to UploaderFileItem', async () => {
      const user = userEvent.setup()
      const state = createMockState({
        files: [createMockFile({ id: 'file-123', name: 'test.pdf', status: 'uploading' })],
      })
      
      render(
        <UploaderList
          state={state}
          onCancel={mockOnCancel}
          onRetry={mockOnRetry}
          onRemove={mockOnRemove}
        />
      )
      
      const cancelButton = screen.getByLabelText('Cancel upload of test.pdf')
      await user.click(cancelButton)
      
      expect(mockOnCancel).toHaveBeenCalledWith('file-123')
    })

    it('should pass disabled prop to UploaderFileItem', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'uploading', name: 'test.pdf' })],
      })
      
      render(<UploaderList state={state} onCancel={mockOnCancel} disabled={true} />)
      
      const cancelButton = screen.getByLabelText('Cancel upload of test.pdf')
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have role="list" with aria-label on category groups', () => {
      const state = createMockState({
        files: [createMockFile({ category: 'instruction' })],
      })
      
      render(<UploaderList state={state} />)
      
      const list = screen.getByRole('list', { name: 'Instructions files' })
      expect(list).toBeInTheDocument()
    })

    it('should announce completion to screen readers', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'success' })],
        isComplete: true,
      })
      
      render(<UploaderList state={state} />)
      
      const announcement = screen.getByText('All files uploaded successfully.')
      expect(announcement).toHaveAttribute('role', 'status')
      expect(announcement).toHaveAttribute('aria-live', 'polite')
    })

    it('should announce failure count to screen readers', () => {
      const state = createMockState({
        files: [
          createMockFile({ status: 'failed' }),
          createMockFile({ status: 'failed' }),
        ],
        failedCount: 2,
      })
      
      render(<UploaderList state={state} />)
      
      const announcement = screen.getByText('2 files failed to upload.')
      expect(announcement).toBeInTheDocument()
    })

    it('should have aria-atomic on status announcements', () => {
      const state = createMockState({
        files: [createMockFile({ status: 'success' })],
        isComplete: true,
      })
      
      const { container } = render(<UploaderList state={state} />)
      
      const statusElement = container.querySelector('[aria-atomic="true"]')
      expect(statusElement).toBeInTheDocument()
    })

    it('should hide announcements visually with sr-only class', () => {
      const state = createMockState({
        files: [createMockFile()],
        isComplete: true,
      })
      
      const { container } = render(<UploaderList state={state} />)
      
      const srOnly = container.querySelector('.sr-only')
      expect(srOnly).toBeInTheDocument()
    })
  })

  describe('Multiple Categories', () => {
    it('should render all categories in correct order', () => {
      const state = createMockState({
        files: [
          createMockFile({ category: 'thumbnail' }),
          createMockFile({ category: 'instruction' }),
          createMockFile({ category: 'image' }),
          createMockFile({ category: 'parts-list' }),
        ],
      })
      
      render(<UploaderList state={state} />)
      
      // All categories should be rendered
      expect(screen.getByText(/Instructions/)).toBeInTheDocument()
      expect(screen.getByText(/Parts Lists/)).toBeInTheDocument()
      expect(screen.getByText(/Thumbnail/)).toBeInTheDocument()
      expect(screen.getByText(/Gallery Images/)).toBeInTheDocument()
    })
  })
})
