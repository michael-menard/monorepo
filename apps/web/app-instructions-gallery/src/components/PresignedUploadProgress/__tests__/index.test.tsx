/**
 * PresignedUploadProgress Component Tests
 * Story INST-1105: Upload Instructions (Presigned >10MB)
 *
 * Tests for upload progress display including:
 * - AC11: Progress bar updates during upload
 * - AC13: Upload speed displayed
 * - AC14: Cancel button aborts active upload
 * - AC27: Retry button re-attempts failed uploads
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PresignedUploadProgress } from '../index'
import type { PresignedUploadStatus, UploadProgressInfo } from '../../../hooks/usePresignedUpload'

describe('PresignedUploadProgress', () => {
  const mockFile = new File(['content'.repeat(1000000)], 'instructions.pdf', {
    type: 'application/pdf',
  })
  Object.defineProperty(mockFile, 'size', { value: 15728640 }) // 15 MB

  const mockProgress: UploadProgressInfo = {
    loaded: 7864320,
    total: 15728640,
    percent: 50,
    bytesPerSecond: 2621440,
    speedDisplay: '2.5 MB/s',
  }

  const defaultProps = {
    file: mockFile,
    status: 'uploading' as PresignedUploadStatus,
    progress: mockProgress,
    error: null,
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with data-testid', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByTestId('presigned-upload-progress')).toBeInTheDocument()
    })

    it('should display file name', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByText('instructions.pdf')).toBeInTheDocument()
    })

    it('should display file size formatted', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByText('15.0 MB')).toBeInTheDocument()
    })

    it('should have title attribute for truncated file names', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      const fileName = screen.getByText('instructions.pdf')
      expect(fileName).toHaveAttribute('title', 'instructions.pdf')
    })
  })

  describe('Progress Bar (AC11)', () => {
    it('should render progress bar with correct percentage during upload', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    })

    it('should display percentage text', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should update progress bar when percentage changes', () => {
      const { rerender } = render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')

      const updatedProgress = { ...mockProgress, percent: 75 }
      rerender(<PresignedUploadProgress {...defaultProps} progress={updatedProgress} />)

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75')
    })

    it('should have aria-label for accessibility', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-label', 'Upload progress: 50%')
    })

    it('should not render progress bar when idle', () => {
      render(<PresignedUploadProgress {...defaultProps} status="idle" progress={null} />)

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })
  })

  describe('Upload Speed Display (AC13)', () => {
    it('should display upload speed during upload', () => {
      render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByText('2.5 MB/s')).toBeInTheDocument()
    })

    it('should update speed display when it changes', () => {
      const { rerender } = render(<PresignedUploadProgress {...defaultProps} />)

      expect(screen.getByText('2.5 MB/s')).toBeInTheDocument()

      const updatedProgress = { ...mockProgress, speedDisplay: '5.0 MB/s' }
      rerender(<PresignedUploadProgress {...defaultProps} progress={updatedProgress} />)

      expect(screen.getByText('5.0 MB/s')).toBeInTheDocument()
    })
  })

  describe('Cancel Button (AC14)', () => {
    it('should render cancel button during active upload', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn()
      render(<PresignedUploadProgress {...defaultProps} onCancel={onCancel} />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload/i })
      fireEvent.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should render cancel button during creating_session status', () => {
      render(<PresignedUploadProgress {...defaultProps} status="creating_session" progress={null} />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should render cancel button during completing status', () => {
      render(<PresignedUploadProgress {...defaultProps} status="completing" />)

      const cancelButton = screen.getByRole('button', { name: /cancel upload/i })
      expect(cancelButton).toBeInTheDocument()
    })

    it('should not render cancel button when upload is complete', () => {
      render(<PresignedUploadProgress {...defaultProps} status="success" />)

      expect(screen.queryByRole('button', { name: /cancel upload/i })).not.toBeInTheDocument()
    })

    it('should not render cancel button when upload has failed', () => {
      render(<PresignedUploadProgress {...defaultProps} status="error" error="Upload failed" />)

      expect(screen.queryByRole('button', { name: /cancel upload/i })).not.toBeInTheDocument()
    })
  })

  describe('Retry Button (AC27)', () => {
    it('should render retry button when status is failed', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Upload failed" progress={null} />,
      )

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn()
      render(
        <PresignedUploadProgress
          {...defaultProps}
          status="error"
          error="Upload failed"
          progress={null}
          onRetry={onRetry}
        />,
      )

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should render retry button when status is expired', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="expired" error="Session expired" progress={null} />,
      )

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should render retry button when status is canceled', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="canceled" error="Upload canceled" progress={null} />,
      )

      const retryButton = screen.getByRole('button', { name: /retry upload/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should not render retry button during active upload', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      expect(screen.queryByRole('button', { name: /retry upload/i })).not.toBeInTheDocument()
    })

    it('should not render retry button on success', () => {
      render(<PresignedUploadProgress {...defaultProps} status="success" />)

      expect(screen.queryByRole('button', { name: /retry upload/i })).not.toBeInTheDocument()
    })
  })

  describe('Status Icons', () => {
    it('should show loading spinner during uploading', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      // Check for animate-spin class on the loader
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show loading spinner during creating_session', () => {
      render(<PresignedUploadProgress {...defaultProps} status="creating_session" progress={null} />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show loading spinner during completing', () => {
      render(<PresignedUploadProgress {...defaultProps} status="completing" />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show success icon (green) on success', () => {
      render(<PresignedUploadProgress {...defaultProps} status="success" progress={null} />)

      const successIcon = document.querySelector('.text-green-500')
      expect(successIcon).toBeInTheDocument()
    })

    it('should show error icon (destructive) on error', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Upload failed" progress={null} />,
      )

      const errorIcon = document.querySelector('.text-destructive')
      expect(errorIcon).toBeInTheDocument()
    })

    it('should show error icon (destructive) on expired', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="expired" error="Session expired" progress={null} />,
      )

      const errorIcon = document.querySelector('.text-destructive')
      expect(errorIcon).toBeInTheDocument()
    })

    it('should show muted icon on canceled', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="canceled" error="Upload canceled" progress={null} />,
      )

      const mutedIcon = document.querySelector('.text-muted-foreground')
      expect(mutedIcon).toBeInTheDocument()
    })
  })

  describe('Status Text', () => {
    it('should show "Preparing upload..." for creating_session', () => {
      render(<PresignedUploadProgress {...defaultProps} status="creating_session" progress={null} />)

      expect(screen.getByText('Preparing upload...')).toBeInTheDocument()
    })

    it('should show "Uploading... X%" for uploading', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      expect(screen.getByText('Uploading... 50%')).toBeInTheDocument()
    })

    it('should show "Finalizing..." for completing', () => {
      render(<PresignedUploadProgress {...defaultProps} status="completing" />)

      expect(screen.getByText('Finalizing...')).toBeInTheDocument()
    })

    it('should show "Upload complete" for success', () => {
      render(<PresignedUploadProgress {...defaultProps} status="success" progress={null} />)

      expect(screen.getByText('Upload complete')).toBeInTheDocument()
    })

    it('should show error message for error status', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Network timeout" progress={null} />,
      )

      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })

    it('should show "Session expired" for expired status', () => {
      render(<PresignedUploadProgress {...defaultProps} status="expired" progress={null} />)

      expect(screen.getByText('Session expired')).toBeInTheDocument()
    })

    it('should show "Upload canceled" for canceled status', () => {
      render(<PresignedUploadProgress {...defaultProps} status="canceled" progress={null} />)

      expect(screen.getByText('Upload canceled')).toBeInTheDocument()
    })

    it('should have role="alert" for error status', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Upload failed" progress={null} />,
      )

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Upload failed')
    })
  })

  describe('Remove Button', () => {
    it('should render remove button on success', () => {
      render(<PresignedUploadProgress {...defaultProps} status="success" progress={null} />)

      const removeButton = screen.getByRole('button', { name: /remove file/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should render remove button on error', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Failed" progress={null} />,
      )

      const removeButton = screen.getByRole('button', { name: /remove file/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should render remove button on canceled', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="canceled" error="Canceled" progress={null} />,
      )

      const removeButton = screen.getByRole('button', { name: /remove file/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should call onRemove when remove button is clicked', () => {
      const onRemove = vi.fn()
      render(
        <PresignedUploadProgress
          {...defaultProps}
          status="success"
          progress={null}
          onRemove={onRemove}
        />,
      )

      const removeButton = screen.getByRole('button', { name: /remove file/i })
      fireEvent.click(removeButton)

      expect(onRemove).toHaveBeenCalledTimes(1)
    })

    it('should not render remove button during active upload', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      expect(screen.queryByRole('button', { name: /remove file/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      expect(screen.getByRole('button', { name: /cancel upload/i })).toBeInTheDocument()
    })

    it('should have aria-hidden on decorative icons', () => {
      render(<PresignedUploadProgress {...defaultProps} status="uploading" />)

      const hiddenElements = document.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenElements.length).toBeGreaterThan(0)
    })

    it('should announce error state with role="alert"', () => {
      render(
        <PresignedUploadProgress {...defaultProps} status="error" error="Upload failed" progress={null} />,
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
