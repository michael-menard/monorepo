/**
 * Story 3.1.17: FilePreview Component Tests
 *
 * Tests for file preview component including HEIC placeholder support.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilePreview } from '../FilePreview/FilePreview.js'
import { fileFixtures, uploadFileFixtures } from '../../__tests__/fixtures.js'
import { createMockUploadFile } from '../../__tests__/test-utils.js'

describe('FilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render file name and size', () => {
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} />)

      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
      expect(screen.getByText('2.00 MB')).toBeInTheDocument()
    })

    it('should have accessible role and label', () => {
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} />)

      const item = screen.getByRole('listitem')
      expect(item).toHaveAttribute('aria-label', expect.stringContaining('photo.jpg'))
    })

    it('should show status text', () => {
      const file = createMockUploadFile(fileFixtures.jpegImage, 'completed')

      render(<FilePreview file={file} />)

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('image preview', () => {
    it('should show image preview for JPEG files', () => {
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} />)

      // URL.createObjectURL is mocked in setup.ts
      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'mock-object-url')
    })

    it('should show image preview for PNG files', () => {
      const file = createMockUploadFile(fileFixtures.pngImage, 'pending')

      render(<FilePreview file={file} />)

      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
    })

    it('should show image preview for WebP files', () => {
      const file = createMockUploadFile(fileFixtures.webpImage, 'pending')

      render(<FilePreview file={file} />)

      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
    })
  })

  describe('HEIC placeholder', () => {
    it('should show placeholder for HEIC files', () => {
      const file = createMockUploadFile(fileFixtures.heicImage, 'pending')

      render(<FilePreview file={file} />)

      // Should NOT show an image
      const img = document.querySelector('img')
      expect(img).not.toBeInTheDocument()

      // Should show HEIC label and "Preview N/A" text
      expect(screen.getByText('HEIC')).toBeInTheDocument()
      expect(screen.getByText('Preview N/A')).toBeInTheDocument()
    })

    it('should show placeholder for HEIF files', () => {
      const file = createMockUploadFile(fileFixtures.heifImage, 'pending')

      render(<FilePreview file={file} />)

      // Should NOT show an image
      const img = document.querySelector('img')
      expect(img).not.toBeInTheDocument()

      // Should show HEIC label (we display HEIC for both)
      expect(screen.getByText('HEIC')).toBeInTheDocument()
    })

    it('should detect HEIC by file extension when MIME type is missing', () => {
      // Create a file with generic MIME type but .heic extension
      const heicByExtension = new File(['content'], 'photo.heic', {
        type: 'application/octet-stream',
      })
      Object.defineProperty(heicByExtension, 'size', { value: 2 * 1024 * 1024 })
      const file = createMockUploadFile(heicByExtension, 'pending')

      render(<FilePreview file={file} />)

      // Should show HEIC placeholder
      expect(screen.getByText('HEIC')).toBeInTheDocument()
      expect(screen.getByText('Preview N/A')).toBeInTheDocument()
    })
  })

  describe('non-image files', () => {
    it('should show extension for PDF files', () => {
      const file = createMockUploadFile(fileFixtures.pdfDocument, 'pending')

      render(<FilePreview file={file} />)

      // Should NOT show an image
      const img = document.querySelector('img')
      expect(img).not.toBeInTheDocument()

      // Should show PDF extension
      expect(screen.getByText('PDF')).toBeInTheDocument()
    })
  })

  describe('remove button', () => {
    it('should render remove button when onRemove is provided', async () => {
      const onRemove = vi.fn()
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} onRemove={onRemove} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeInTheDocument()
    })

    it('should call onRemove with file id when clicked', async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn()
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} onRemove={onRemove} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(onRemove).toHaveBeenCalledWith(file.id)
    })

    it('should not render remove button when onRemove is not provided', () => {
      const file = createMockUploadFile(fileFixtures.jpegImage, 'pending')

      render(<FilePreview file={file} />)

      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    })
  })
})

