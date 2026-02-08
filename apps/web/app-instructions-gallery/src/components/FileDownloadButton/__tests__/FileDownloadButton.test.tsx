/**
 * FileDownloadButton Component Tests
 * Story INST-1107: Download Files
 * AC-60: Frontend component unit tests ≥80% coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileDownloadButton } from '../index'
import * as apiClient from '@repo/api-client'
import * as toastUtils from '@repo/app-component-library'

// Mock window.location
const mockLocation = { href: '' }
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock dependencies
vi.mock('@repo/api-client', () => ({
  useLazyGetFileDownloadUrlQuery: vi.fn(() => [vi.fn(), {} as any, {} as any]),
}))

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showErrorToast: vi.fn(),
  }
})

describe('FileDownloadButton', () => {
  const mockMocId = '123e4567-e89b-12d3-a456-426614174000'
  const mockFileId = '987e6543-e21b-12d3-a456-426614174111'
  const mockFileName = 'castle-instructions.pdf'
  const mockDownloadUrl = 'https://s3.amazonaws.com/bucket/file.pdf?signature=abc'
  const mockExpiresAt = '2026-02-07T15:45:00.000Z'

  const mockGetFileDownloadUrl = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
    vi.mocked(apiClient.useLazyGetFileDownloadUrlQuery).mockReturnValue([
      mockGetFileDownloadUrl,
      { isLoading: false } as any,
      { lastPromiseInfo: {} } as any,
    ])
  })

  describe('Rendering (AC-16, AC-18, AC-30)', () => {
    it('should render button with Download icon and text', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Download')
    })

    it('should accept additional className prop', () => {
      render(
        <FileDownloadButton
          mocId={mockMocId}
          fileId={mockFileId}
          fileName={mockFileName}
          className="custom-class"
        />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('Accessibility (AC-21, AC-22, AC-23, AC-28, AC-29)', () => {
    it('should have aria-label with filename (AC-21)', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toHaveAttribute('aria-label', `Download ${mockFileName}`)
    })

    it('should have aria-busy=false when not loading (AC-22)', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toHaveAttribute('aria-busy', 'false')
    })

    it('should be keyboard accessible - focusable (AC-28)', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('should have minimum touch target size (AC-29)', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })

    it('should have focus ring classes (AC-23)', () => {
      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-primary')
    })
  })

  describe('Download Flow (AC-24, AC-25)', () => {
    it('should call getFileDownloadUrl when clicked (AC-24)', async () => {
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          downloadUrl: mockDownloadUrl,
          expiresAt: mockExpiresAt,
        }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockGetFileDownloadUrl).toHaveBeenCalledWith({
          mocId: mockMocId,
          fileId: mockFileId,
        })
      })
    })

    it('should trigger browser download via window.location.href (AC-25)', async () => {
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          downloadUrl: mockDownloadUrl,
          expiresAt: mockExpiresAt,
        }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockLocation.href).toBe(mockDownloadUrl)
      })
    })
  })

  describe('Loading State (AC-19, AC-20, AC-22)', () => {
    it('should show loading spinner during download (AC-19)', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockReturnValue(promise),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      // Check loading state is active
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-busy', 'true')
      })

      // Resolve to clean up
      resolvePromise!({ downloadUrl: mockDownloadUrl, expiresAt: mockExpiresAt })
    })

    it('should disable button during loading (AC-20)', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockReturnValue(promise),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })

      resolvePromise!({ downloadUrl: mockDownloadUrl, expiresAt: mockExpiresAt })
    })
  })

  describe('Error Handling (AC-26, AC-27)', () => {
    it('should show error toast on API failure (AC-26)', async () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({ data: { error: 'PRESIGN_FAILED' } }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('Download failed. Please try again.')
      })
    })

    it('should show specific error for NOT_FOUND', async () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({ data: { error: 'NOT_FOUND' } }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          'File not found. It may have been removed.',
        )
      })
    })

    it('should show specific error for UNAUTHORIZED', async () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({ data: { error: 'UNAUTHORIZED' } }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          'You are not authorized to download this file.',
        )
      })
    })

    it('should return to ready state after error (AC-27)', async () => {
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockRejectedValue({ data: { error: 'PRESIGN_FAILED' } }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).toHaveAttribute('aria-busy', 'false')
      })
    })

    it('should return to ready state after success (AC-27)', async () => {
      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          downloadUrl: mockDownloadUrl,
          expiresAt: mockExpiresAt,
        }),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).not.toBeDisabled()
        expect(button).toHaveAttribute('aria-busy', 'false')
      })
    })
  })

  describe('Multiple Downloads (AC-34, AC-35)', () => {
    it('should prevent double-click during download', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      mockGetFileDownloadUrl.mockReturnValue({
        unwrap: vi.fn().mockReturnValue(promise),
      })

      render(
        <FileDownloadButton mocId={mockMocId} fileId={mockFileId} fileName={mockFileName} />,
      )

      const button = screen.getByTestId('file-download-button')

      // Click once
      fireEvent.click(button)

      // Try clicking again while loading
      fireEvent.click(button)

      // Should only have been called once
      expect(mockGetFileDownloadUrl).toHaveBeenCalledTimes(1)

      resolvePromise!({ downloadUrl: mockDownloadUrl, expiresAt: mockExpiresAt })
    })
  })
})
