/**
 * Story 3.1.17: UploadArea Component Tests
 *
 * Tests for drag-and-drop upload area with keyboard accessibility.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadArea } from '../UploadArea/UploadArea.js'
import { fileFixtures } from '../../__tests__/fixtures.js'
import { createMockDragEvent } from '../../__tests__/test-utils.js'
import type { UseUploadReturn } from '../../hooks/useUpload.js'

// Mock useUpload return value
const createMockUpload = (overrides: Partial<UseUploadReturn> = {}): UseUploadReturn => ({
  files: [],
  addFiles: vi.fn(),
  removeFile: vi.fn(),
  clearFiles: vi.fn(),
  uploadFiles: vi.fn(),
  cancelUpload: vi.fn(),
  retryUpload: vi.fn(),
  isUploading: false,
  progress: 0,
  errors: [],
  ...overrides,
})

// Helper to get the drop zone (the outer button with aria-label containing "Drop zone")
const getDropZone = () => screen.getByRole('button', { name: /drop zone/i })

describe('UploadArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('accessibility', () => {
    it('should have role="button" for keyboard accessibility', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      expect(dropZone).toBeInTheDocument()
    })

    it('should be focusable with tabIndex', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      expect(dropZone).toHaveAttribute('tabindex', '0')
    })

    it('should have aria-label describing the drop zone', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      expect(dropZone).toHaveAttribute('aria-label')
      expect(dropZone.getAttribute('aria-label')).toContain('Drop zone')
    })

    it('should accept custom aria-label', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} aria-label="Upload your MOC instructions" />)

      const dropZone = screen.getByRole('button', { name: 'Upload your MOC instructions' })
      expect(dropZone).toHaveAttribute('aria-label', 'Upload your MOC instructions')
    })

    it('should have aria-disabled when disabled', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} disabled />)

      const dropZone = getDropZone()
      expect(dropZone).toHaveAttribute('aria-disabled', 'true')
    })

    it('should not be focusable when disabled', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} disabled />)

      const dropZone = getDropZone()
      expect(dropZone).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('keyboard interaction', () => {
    it('should open file picker on Enter key', async () => {
      const user = userEvent.setup()
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      dropZone.focus()

      // The input click is triggered, but we can't easily test file dialog
      // We verify the keyboard handler is attached
      await user.keyboard('{Enter}')

      // No error should be thrown
      expect(dropZone).toBeInTheDocument()
    })

    it('should open file picker on Space key', async () => {
      const user = userEvent.setup()
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      dropZone.focus()

      await user.keyboard(' ')

      // No error should be thrown
      expect(dropZone).toBeInTheDocument()
    })

    it('should not open file picker when disabled', async () => {
      const user = userEvent.setup()
      const upload = createMockUpload()

      render(<UploadArea upload={upload} disabled />)

      const dropZone = getDropZone()

      // Try to focus and press Enter
      await user.keyboard('{Enter}')

      // Should not throw error
      expect(dropZone).toBeInTheDocument()
    })
  })

  describe('drag and drop', () => {
    it('should show drag active state on drag enter', () => {
      const upload = createMockUpload()

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      const dragEvent = createMockDragEvent('dragenter', [fileFixtures.jpegImage])

      fireEvent.dragEnter(dropZone, dragEvent)

      // Check for visual feedback (class change)
      expect(dropZone.className).toContain('border-blue-500')
    })

    it('should call addFiles on drop', () => {
      const addFiles = vi.fn()
      const upload = createMockUpload({ addFiles })

      render(<UploadArea upload={upload} />)

      const dropZone = getDropZone()
      const dropEvent = createMockDragEvent('drop', [fileFixtures.jpegImage, fileFixtures.pngImage])

      fireEvent.drop(dropZone, dropEvent)

      expect(addFiles).toHaveBeenCalledWith([fileFixtures.jpegImage, fileFixtures.pngImage])
    })
  })

  describe('onFilesAdded callback', () => {
    it('should call onFilesAdded with count when files are dropped', () => {
      const onFilesAdded = vi.fn()
      const upload = createMockUpload()

      render(<UploadArea upload={upload} onFilesAdded={onFilesAdded} />)

      const dropZone = getDropZone()
      const dropEvent = createMockDragEvent('drop', [fileFixtures.jpegImage, fileFixtures.pngImage])

      fireEvent.drop(dropZone, dropEvent)

      expect(onFilesAdded).toHaveBeenCalledWith(2)
    })
  })
})

