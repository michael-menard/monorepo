import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UploadBatchState, UploaderFileItem } from '@repo/upload/types'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Progress: vi.fn(({ value, showValue, valueText, className, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'progress', 'data-value': value, className, role: 'progressbar', ...props },
        showValue && valueText,
      ),
    ),
    Card: vi.fn(({ children, className, ...props }) =>
      React.createElement('div', { 'data-testid': 'card', className, ...props }, children),
    ),
    CardContent: vi.fn(({ children, className, ...props }) =>
      React.createElement('div', { className, ...props }, children),
    ),
    CardHeader: vi.fn(({ children, className, ...props }) =>
      React.createElement('div', { className, ...props }, children),
    ),
    CardTitle: vi.fn(({ children, className, ...props }) =>
      React.createElement('h3', { className, ...props }, children),
    ),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    FileText: vi.fn(props => React.createElement('svg', { 'data-testid': 'file-text-icon', ...props })),
    Image: vi.fn(props => React.createElement('svg', { 'data-testid': 'image-icon', ...props })),
    List: vi.fn(props => React.createElement('svg', { 'data-testid': 'list-icon', ...props })),
    ImageIcon: vi.fn(props => React.createElement('svg', { 'data-testid': 'image-icon-icon', ...props })),
  }
})

vi.mock('@/components/Uploader/UploaderFileItem', () => ({
  UploaderFileItem: vi.fn(({ file }) =>
    React.createElement('div', { 'data-testid': `file-item-${file.id}` }, file.name),
  ),
}))

// Import after mocks are set up
const { UploaderList } = await import('../index')
const { UploaderFileItem: mockUploaderFileItem } = await import('@/components/Uploader/UploaderFileItem')

describe('UploaderList', () => {
  const mockFiles: UploaderFileItem[] = [
    {
      id: 'file-1',
      name: 'instructions.pdf',
      size: 1024000,
      type: 'application/pdf',
      lastModified: Date.now(),
      category: 'instruction',
      status: 'uploading',
      progress: 50,
      expired: false,
    },
    {
      id: 'file-2',
      name: 'parts-list.pdf',
      size: 512000,
      type: 'application/pdf',
      lastModified: Date.now(),
      category: 'parts-list',
      status: 'queued',
      progress: 0,
      expired: false,
    },
    {
      id: 'file-3',
      name: 'thumbnail.jpg',
      size: 256000,
      type: 'image/jpeg',
      lastModified: Date.now(),
      category: 'thumbnail',
      status: 'success',
      progress: 100,
      expired: false,
    },
    {
      id: 'file-4',
      name: 'image1.jpg',
      size: 1024000,
      type: 'image/jpeg',
      lastModified: Date.now(),
      category: 'image',
      status: 'success',
      progress: 100,
      expired: false,
    },
  ]

  const mockState: UploadBatchState = {
    files: mockFiles,
    successCount: 2,
    overallProgress: 75,
    queuedCount: 1,
    uploadingCount: 1,
    failedCount: 0,
    canceledCount: 0,
    expiredCount: 0,
    isUploading: true,
    isComplete: false,
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
    it('returns null when files array is empty', () => {
      const emptyState: UploadBatchState = {
        files: [],
        successCount: 0,
        overallProgress: 0,
        queuedCount: 0,
        uploadingCount: 0,
        failedCount: 0,
        canceledCount: 0,
        expiredCount: 0,
        isUploading: false,
        isComplete: false,
      }

      const { container } = render(<UploaderList state={emptyState} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders aggregate progress card', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByText('Upload Progress')).toBeInTheDocument()
      expect(screen.getByText('2 of 4 complete')).toBeInTheDocument()
    })

    it('displays overall progress bar with correct value', () => {
      render(<UploaderList state={mockState} />)

      const progress = screen.getByTestId('progress')
      expect(progress).toHaveAttribute('data-value', '75')
      expect(progress).toHaveTextContent('75%')
    })

    it('displays queued count in status summary', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByText('1 queued')).toBeInTheDocument()
    })

    it('displays uploading count in status summary', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByText('1 uploading')).toBeInTheDocument()
    })

    it('displays failed count in status summary', () => {
      const stateWithFailures = { ...mockState, failedCount: 2 }
      render(<UploaderList state={stateWithFailures} />)

      expect(screen.getByText('2 failed')).toBeInTheDocument()
    })

    it('displays expired count in status summary', () => {
      const stateWithExpired = { ...mockState, expiredCount: 1 }
      render(<UploaderList state={stateWithExpired} />)

      expect(screen.getByText('1 expired')).toBeInTheDocument()
    })

    it('groups files by category', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByText('Instructions (1)')).toBeInTheDocument()
      expect(screen.getByText('Parts Lists (1)')).toBeInTheDocument()
      expect(screen.getByText('Thumbnail (1)')).toBeInTheDocument()
      expect(screen.getByText('Gallery Images (1)')).toBeInTheDocument()
    })

    it('renders files in correct category groups', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByTestId('file-item-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-2')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-3')).toBeInTheDocument()
      expect(screen.getByTestId('file-item-file-4')).toBeInTheDocument()
    })

    it('displays category icons', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument()
      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('image-icon-icon')).toBeInTheDocument()
      expect(screen.getByTestId('image-icon')).toBeInTheDocument()
    })

    it('only displays non-empty categories', () => {
      const stateWithoutImages: UploadBatchState = {
        ...mockState,
        files: mockFiles.slice(0, 3),
      }

      render(<UploaderList state={stateWithoutImages} />)

      expect(screen.getByText('Instructions (1)')).toBeInTheDocument()
      expect(screen.getByText('Parts Lists (1)')).toBeInTheDocument()
      expect(screen.getByText('Thumbnail (1)')).toBeInTheDocument()
      expect(screen.queryByText(/Gallery Images/)).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('passes onCancel handler to file items', () => {
      render(<UploaderList state={mockState} {...mockHandlers} />)

      // Check that the mock was called with props containing onCancel
      const calls = vi.mocked(mockUploaderFileItem).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toHaveProperty('onCancel', mockHandlers.onCancel)
    })

    it('passes onRetry handler to file items', () => {
      render(<UploaderList state={mockState} {...mockHandlers} />)

      // Check that the mock was called with props containing onRetry
      const calls = vi.mocked(mockUploaderFileItem).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toHaveProperty('onRetry', mockHandlers.onRetry)
    })

    it('passes onRemove handler to file items', () => {
      render(<UploaderList state={mockState} {...mockHandlers} />)

      // Check that the mock was called with props containing onRemove
      const calls = vi.mocked(mockUploaderFileItem).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toHaveProperty('onRemove', mockHandlers.onRemove)
    })

    it('passes disabled prop to file items', () => {
      render(<UploaderList state={mockState} disabled />)

      // Check that the mock was called with props containing disabled
      const calls = vi.mocked(mockUploaderFileItem).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toHaveProperty('disabled', true)
    })
  })

  describe('accessibility', () => {
    it('has role list for each category', () => {
      const { container } = render(<UploaderList state={mockState} />)

      const lists = container.querySelectorAll('[role="list"]')
      expect(lists.length).toBeGreaterThan(0)
    })

    it('has aria-label for each category list', () => {
      render(<UploaderList state={mockState} />)

      expect(screen.getByLabelText('Instructions files')).toBeInTheDocument()
      expect(screen.getByLabelText('Parts Lists files')).toBeInTheDocument()
      expect(screen.getByLabelText('Thumbnail files')).toBeInTheDocument()
      expect(screen.getByLabelText('Gallery Images files')).toBeInTheDocument()
    })

    it('announces completion for screen readers', () => {
      const completeState: UploadBatchState = {
        ...mockState,
        isComplete: true,
        successCount: 4,
        uploadingCount: 0,
        queuedCount: 0,
      }

      const { container } = render(<UploaderList state={completeState} />)

      const announcement = container.querySelector('[role="status"]')
      expect(announcement).toHaveTextContent('All files uploaded successfully.')
    })

    it('announces failures for screen readers', () => {
      const stateWithFailures: UploadBatchState = {
        ...mockState,
        failedCount: 2,
      }

      const { container } = render(<UploaderList state={stateWithFailures} />)

      const announcement = container.querySelector('[role="status"]')
      expect(announcement).toHaveTextContent('2 files failed to upload.')
    })

    it('has aria-live polite on status announcement', () => {
      const { container } = render(<UploaderList state={mockState} />)

      const announcement = container.querySelector('[role="status"]')
      expect(announcement).toHaveAttribute('aria-live', 'polite')
    })

    it('has aria-atomic true on status announcement', () => {
      const { container } = render(<UploaderList state={mockState} />)

      const announcement = container.querySelector('[role="status"]')
      expect(announcement).toHaveAttribute('aria-atomic', 'true')
    })
  })
})
