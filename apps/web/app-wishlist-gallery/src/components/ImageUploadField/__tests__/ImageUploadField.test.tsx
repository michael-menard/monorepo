/**
 * ImageUploadField Component Tests
 *
 * Story wish-2002: Add Item Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploadField } from '../index'

describe('ImageUploadField', () => {
  const mockOnFileChange = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    file: null,
    preview: null,
    onFileChange: mockOnFileChange,
    onRemove: mockOnRemove,
  }

  describe('Empty State', () => {
    it('renders upload prompt when no file is selected', () => {
      render(<ImageUploadField {...defaultProps} />)

      expect(screen.getByText('Click to upload image')).toBeInTheDocument()
      expect(screen.getByText(/or drag and drop/)).toBeInTheDocument()
    })

    it('has correct accessibility attributes', () => {
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')
      expect(uploadArea).toHaveAttribute('role', 'button')
      expect(uploadArea).toHaveAttribute('aria-label', 'Upload image')
      expect(uploadArea).toHaveAttribute('tabIndex', '0')
    })

    it('opens file dialog when clicked', async () => {
      const user = userEvent.setup()
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')
      const fileInput = screen.getByTestId('file-input')

      // Spy on input click
      const clickSpy = vi.spyOn(fileInput, 'click')

      await user.click(uploadArea)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('opens file dialog when Enter key is pressed', async () => {
      const user = userEvent.setup()
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')
      const fileInput = screen.getByTestId('file-input')

      // Spy on input click
      const clickSpy = vi.spyOn(fileInput, 'click')

      uploadArea.focus()
      await user.keyboard('{Enter}')

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('File Selection', () => {
    it('calls onFileChange when a valid image file is selected', async () => {
      const user = userEvent.setup()
      render(<ImageUploadField {...defaultProps} />)

      const fileInput = screen.getByTestId('file-input')
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await user.upload(fileInput, file)

      expect(mockOnFileChange).toHaveBeenCalledWith(file)
    })

    it('validates file type for non-image files', () => {
      // Test the internal validation logic by simulating a drop event
      // since the file input's accept attribute prevents non-images in upload
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      // Simulate dropping a non-image file
      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      })

      expect(screen.getByText('Please upload an image file')).toBeInTheDocument()
      expect(mockOnFileChange).not.toHaveBeenCalled()
    })

    it('shows error for files exceeding max size', async () => {
      const user = userEvent.setup()
      render(<ImageUploadField {...defaultProps} maxSize={1024} />) // 1KB limit

      const fileInput = screen.getByTestId('file-input')
      const largeContent = new Array(2048).fill('a').join('')
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' })

      await user.upload(fileInput, file)

      expect(screen.getByTestId('upload-error')).toBeInTheDocument()
      expect(mockOnFileChange).not.toHaveBeenCalled()
    })
  })

  describe('Preview State', () => {
    it('shows image preview when preview URL is provided', () => {
      render(
        <ImageUploadField
          {...defaultProps}
          file={new File(['test'], 'test.jpg', { type: 'image/jpeg' })}
          preview="blob:http://localhost/test-image"
        />,
      )

      expect(screen.getByTestId('image-preview')).toBeInTheDocument()
      expect(screen.getByTestId('image-preview')).toHaveAttribute(
        'src',
        'blob:http://localhost/test-image',
      )
    })

    it('shows remove button when preview is shown', () => {
      render(
        <ImageUploadField
          {...defaultProps}
          file={new File(['test'], 'test.jpg', { type: 'image/jpeg' })}
          preview="blob:http://localhost/test-image"
        />,
      )

      expect(screen.getByTestId('remove-image-button')).toBeInTheDocument()
    })

    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ImageUploadField
          {...defaultProps}
          file={new File(['test'], 'test.jpg', { type: 'image/jpeg' })}
          preview="blob:http://localhost/test-image"
        />,
      )

      await user.click(screen.getByTestId('remove-image-button'))

      expect(mockOnRemove).toHaveBeenCalled()
    })

    it('shows filename when file is selected', () => {
      render(
        <ImageUploadField
          {...defaultProps}
          file={new File(['test'], 'my-image.jpg', { type: 'image/jpeg' })}
          preview="blob:http://localhost/test-image"
        />,
      )

      expect(screen.getByText('my-image.jpg')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<ImageUploadField {...defaultProps} isLoading />)

      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })

    it('disables interaction when loading', async () => {
      const user = userEvent.setup()
      render(<ImageUploadField {...defaultProps} isLoading />)

      const uploadArea = screen.getByTestId('image-upload-field')
      const fileInput = screen.getByTestId('file-input')

      const clickSpy = vi.spyOn(fileInput, 'click')

      await user.click(uploadArea)

      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('Drag and Drop', () => {
    it('shows drop indicator on drag over', () => {
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')

      fireEvent.dragOver(uploadArea, { dataTransfer: { files: [] } })

      expect(screen.getByText('Drop your image here')).toBeInTheDocument()
    })

    it('hides drop indicator on drag leave', () => {
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')

      fireEvent.dragOver(uploadArea, { dataTransfer: { files: [] } })
      fireEvent.dragLeave(uploadArea)

      expect(screen.getByText('Click to upload image')).toBeInTheDocument()
    })

    it('calls onFileChange when a valid file is dropped', () => {
      render(<ImageUploadField {...defaultProps} />)

      const uploadArea = screen.getByTestId('image-upload-field')
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      fireEvent.drop(uploadArea, {
        dataTransfer: {
          files: [file],
        },
      })

      expect(mockOnFileChange).toHaveBeenCalledWith(file)
    })
  })
})
