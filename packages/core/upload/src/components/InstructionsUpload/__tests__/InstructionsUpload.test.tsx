/**
 * InstructionsUpload Component Tests
 * Story INST-1104: Upload Instructions (Direct ≤10MB)
 *
 * Test Coverage:
 * - AC51: Component renders correctly
 * - AC52: File validation (type, size)
 * - AC53: File queue management
 * - AC54: Upload flow
 * - AC55: Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Helper function to simulate file input change
function simulateFileSelection(input: HTMLInputElement, files: File[]) {
  // Create a mock FileList
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    ...files,
  }

  // Override the files property
  Object.defineProperty(input, 'files', {
    value: fileList,
    writable: false,
    configurable: true,
  })

  // Dispatch the change event
  fireEvent.change(input)
}

// Mock dependencies - MUST be before component imports
vi.mock('@repo/api-client', async () => {
  const actual = await vi.importActual('@repo/api-client')
  return {
    ...actual,
    useUploadInstructionFileMutation: vi.fn(),
  }
})

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    showWarningToast: vi.fn(),
  }
})

// Import component AFTER mocks are defined
import { InstructionsUpload } from '../index'
import { MAX_FILE_SIZE } from '../__types__'

import { useUploadInstructionFileMutation } from '@repo/api-client'
import {
  showSuccessToast,
  showErrorToast,
} from '@repo/app-component-library'

describe('InstructionsUpload', () => {
  const mockMocId = '123e4567-e89b-12d3-a456-426614174000'
  const mockOnSuccess = vi.fn()
  const mockUploadMutation = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUploadInstructionFileMutation).mockReturnValue([
      mockUploadMutation,
      { isLoading: false, data: undefined, error: undefined },
    ] as any)
  })

  // AC51: Component renders correctly
  describe('Rendering', () => {
    it('should render upload button', () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      expect(screen.getByRole('button', { name: /select pdf files/i })).toBeInTheDocument()
    })

    it('should render hidden file input with correct attributes', () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      const fileInput = screen.getByLabelText(/upload instruction pdf files/i)
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf')
      expect(fileInput).toHaveAttribute('multiple')
    })

    it('should not show file queue initially', () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      expect(screen.queryByText(/files to upload/i)).not.toBeInTheDocument()
    })
  })

  // AC52: File validation
  describe('File Validation', () => {
    it('should reject non-PDF files (AC6)', async () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          expect.stringContaining('Only PDF files are allowed'),
        )
      })

      expect(screen.queryByText(/files to upload/i)).not.toBeInTheDocument()
    })

    it('should reject files larger than 10MB (AC7)', async () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      // Create a large file object
      const largeContent = 'a'.repeat(MAX_FILE_SIZE + 1000)
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          expect.stringContaining('File is too large'),
        )
      })

      expect(screen.queryByText(/files to upload/i)).not.toBeInTheDocument()
    })

    it('should accept valid PDF files', async () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'instructions.pdf', {
        type: 'application/pdf',
      })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText(/files to upload/i)).toBeInTheDocument()
        expect(screen.getByText('instructions.pdf')).toBeInTheDocument()
      })
    })

    it('should accept multiple valid PDF files', async () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      const files = [
        new File(['PDF 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['PDF 2'], 'file2.pdf', { type: 'application/pdf' }),
      ]
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, files)

      await waitFor(() => {
        expect(screen.getByText(/files to upload \(2\)/i)).toBeInTheDocument()
        expect(screen.getByText('file1.pdf')).toBeInTheDocument()
        expect(screen.getByText('file2.pdf')).toBeInTheDocument()
      })
    })
  })

  // AC53: File queue management
  describe('File Queue Management', () => {
    it('should display file metadata (AC9-12)', async () => {
      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
        expect(screen.getByText(/B|KB|MB/)).toBeInTheDocument() // File size
      })
    })

    it('should allow removing files from queue (AC13)', async () => {
      const user = userEvent.setup()
      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      // Find and click remove button (X icon button in the file row)
      const removeButtons = screen.getAllByRole('button')
      const removeButton = removeButtons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg && btn.textContent === ''
      })

      expect(removeButton).toBeDefined()
      if (removeButton) {
        await user.click(removeButton)
      }

      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })

    it('should allow clearing all files (AC18)', async () => {
      const user = userEvent.setup()
      render(<InstructionsUpload mocId={mockMocId} />)

      const files = [
        new File(['PDF 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['PDF 2'], 'file2.pdf', { type: 'application/pdf' }),
      ]
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, files)

      await waitFor(() => {
        expect(screen.getByText('file1.pdf')).toBeInTheDocument()
        expect(screen.getByText('file2.pdf')).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /clear all/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.queryByText('file1.pdf')).not.toBeInTheDocument()
        expect(screen.queryByText('file2.pdf')).not.toBeInTheDocument()
        expect(screen.queryByText(/files to upload/i)).not.toBeInTheDocument()
      })
    })
  })

  // AC54: Upload flow
  describe('Upload Flow', () => {
    it('should upload files sequentially (AC14)', async () => {
      const user = userEvent.setup()
      mockUploadMutation.mockResolvedValue({
        unwrap: () => Promise.resolve({ id: 'file-id', fileUrl: 'https://example.com/file.pdf' }),
      })

      render(<InstructionsUpload mocId={mockMocId} onSuccess={mockOnSuccess} />)

      const files = [
        new File(['PDF 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['PDF 2'], 'file2.pdf', { type: 'application/pdf' }),
      ]
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, files)

      await waitFor(() => {
        expect(screen.getByText('file1.pdf')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload 2 file\(s\)/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(mockUploadMutation).toHaveBeenCalledTimes(2)
        expect(showSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining('file1.pdf uploaded successfully'),
        )
        expect(showSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining('file2.pdf uploaded successfully'),
        )
      })
    })

    it('should show progress indicator during upload (AC15-16)', async () => {
      const user = userEvent.setup()
      let resolveUpload: any
      mockUploadMutation.mockReturnValue({
        unwrap: () =>
          new Promise(resolve => {
            resolveUpload = resolve
          }),
      })

      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload 1 file\(s\)/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText(/uploading/i)).toBeInTheDocument()
      })

      // Resolve upload
      resolveUpload({ id: 'file-id', fileUrl: 'https://example.com/file.pdf' })
    })

    it('should call onSuccess callback after successful upload', async () => {
      const user = userEvent.setup()
      mockUploadMutation.mockResolvedValue({
        unwrap: () => Promise.resolve({ id: 'file-id', fileUrl: 'https://example.com/file.pdf' }),
      })

      render(<InstructionsUpload mocId={mockMocId} onSuccess={mockOnSuccess} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload 1 file\(s\)/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  // AC55: Error handling
  describe('Error Handling', () => {
    it('should show error toast on upload failure (AC20)', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Upload failed'
      mockUploadMutation.mockRejectedValue({
        data: { message: errorMessage },
      })

      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload 1 file\(s\)/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          expect.stringContaining(errorMessage),
        )
      })
    })

    it('should mark failed files in the queue', async () => {
      const user = userEvent.setup()
      mockUploadMutation.mockRejectedValue({
        data: { message: 'Upload failed' },
      })

      render(<InstructionsUpload mocId={mockMocId} />)

      const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/upload instruction pdf files/i) as HTMLInputElement

      simulateFileSelection(input, [file])

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      const uploadButton = screen.getByRole('button', { name: /upload 1 file\(s\)/i })
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument()
      })
    })
  })
})
