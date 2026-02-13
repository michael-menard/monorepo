/**
 * ThumbnailUpload Component Tests
 * Story INST-1103: Upload Thumbnail
 * AC38: Unit tests for validation, preview, upload states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as apiClient from '@repo/api-client'
import * as toastUtils from '@repo/app-component-library'
import { ThumbnailUpload } from '../index'

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock dependencies
vi.mock('@repo/api-client', () => ({
  useUploadThumbnailMutation: vi.fn(),
}))

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }
})

describe('ThumbnailUpload', () => {
  const mockMocId = '123e4567-e89b-12d3-a456-426614174000'
  const mockUploadThumbnail = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.useUploadThumbnailMutation).mockReturnValue([
      mockUploadThumbnail,
      { isLoading: false } as any,
    ])
  })

  describe('Rendering', () => {
    it('should render upload zone with proper text', () => {
      render(<ThumbnailUpload mocId={mockMocId} />)

      expect(
        screen.getByText(/drag and drop a thumbnail image here/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/jpeg, png, or webp • max 10mb/i)).toBeInTheDocument()
    })

    it('should render existing thumbnail when provided', () => {
      const existingUrl = 'https://example.com/thumbnail.jpg'
      render(<ThumbnailUpload mocId={mockMocId} existingThumbnailUrl={existingUrl} />)

      const currentThumbnail = screen.getByRole('img', { name: /current thumbnail/i })
      expect(currentThumbnail).toBeInTheDocument()
      expect(currentThumbnail).toHaveAttribute('src', existingUrl)
      expect(screen.getByText(/current thumbnail/i)).toBeInTheDocument()
    })
  })

  describe('File Validation (AC6-7)', () => {
    it('should accept valid JPEG file', () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      render(<ThumbnailUpload mocId={mockMocId} />)

      const file = new File(['x'.repeat(1000)], 'thumbnail.jpg', { type: 'image/jpeg' })
      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(showErrorToast).not.toHaveBeenCalled()
    })

    it('should accept valid PNG file', () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      render(<ThumbnailUpload mocId={mockMocId} />)

      const file = new File(['x'.repeat(1000)], 'thumbnail.png', { type: 'image/png' })
      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(showErrorToast).not.toHaveBeenCalled()
    })

    it('should accept valid WebP file', () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      render(<ThumbnailUpload mocId={mockMocId} />)

      const file = new File(['x'.repeat(1000)], 'thumbnail.webp', { type: 'image/webp' })
      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(showErrorToast).not.toHaveBeenCalled()
    })

    it('should reject invalid file type (AC6)', () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      render(<ThumbnailUpload mocId={mockMocId} />)

      const file = new File(['dummy'], 'document.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement

      fireEvent.change(input, { target: { files: [file] } })

      expect(showErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Invalid file type')
      )
    })

    it('should reject file that is too large (AC7)', () => {
      const showErrorToast = vi.mocked(toastUtils.showErrorToast)
      render(<ThumbnailUpload mocId={mockMocId} />)

      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement
      fireEvent.change(input, { target: { files: [largeFile] } })

      expect(showErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('too large')
      )
    })
  })

  describe('Drag and Drop (AC3, AC5)', () => {
    it('should show visual feedback on drag over (AC5)', () => {
      render(<ThumbnailUpload mocId={mockMocId} />)

      const dropZone = screen.getByRole('button')

      fireEvent.dragOver(dropZone)
      expect(dropZone).toHaveClass('border-primary')

      fireEvent.dragLeave(dropZone)
      expect(dropZone).not.toHaveClass('border-primary')
    })
  })

  describe('Accessibility (AC8)', () => {
    it('should have proper accept attribute on file input', () => {
      render(<ThumbnailUpload mocId={mockMocId} />)

      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
      expect(input).toHaveAttribute('type', 'file')
    })

    it('should be keyboard accessible', () => {
      render(<ThumbnailUpload mocId={mockMocId} />)

      const dropZone = screen.getByRole('button')
      expect(dropZone).toHaveAttribute('tabIndex', '0')
    })

    it('should have proper ARIA label', () => {
      render(<ThumbnailUpload mocId={mockMocId} />)

      const input = screen.getByLabelText(/upload thumbnail image/i)
      expect(input).toBeInTheDocument()
    })
  })

  describe('Loading State (AC13)', () => {
    it('should disable upload zone when loading', () => {
      vi.mocked(apiClient.useUploadThumbnailMutation).mockReturnValue([
        mockUploadThumbnail,
        { isLoading: true } as any,
      ])

      render(<ThumbnailUpload mocId={mockMocId} />)

      const dropZones = screen.getAllByRole('button')
      const uploadZone = dropZones.find(b => b.className.includes('border-dashed'))
      expect(uploadZone).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should disable file input when loading', () => {
      vi.mocked(apiClient.useUploadThumbnailMutation).mockReturnValue([
        mockUploadThumbnail,
        { isLoading: true } as any,
      ])

      render(<ThumbnailUpload mocId={mockMocId} />)

      const input = screen.getByLabelText(/upload thumbnail image/i) as HTMLInputElement
      expect(input).toBeDisabled()
    })
  })
})
