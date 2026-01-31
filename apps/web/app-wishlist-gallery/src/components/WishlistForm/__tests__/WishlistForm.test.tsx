/**
 * WishlistForm Component Tests
 *
 * Story wish-2002: Add Item Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WishlistForm, type WishlistFormProps } from '../index'
import type { CreateWishlistItem } from '@repo/api-client/schemas/wishlist'

// Setup mocks before imports
const mockUpload = vi.fn()
const mockReset = vi.fn()
const mockValidateFile = vi.fn()
const mockCancel = vi.fn()

let mockUploadState: {
  state: string
  progress: number
  error: string | null
  imageUrl: string | null
  imageKey: string | null
} = {
  state: 'idle',
  progress: 0,
  error: null,
  imageUrl: null,
  imageKey: null,
}

vi.mock('../../../hooks/useS3Upload', () => ({
  useS3Upload: () => ({
    ...mockUploadState,
    upload: mockUpload,
    cancel: mockCancel,
    reset: mockReset,
    validateFile: mockValidateFile,
  }),
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}))

// Mock TagInput component
vi.mock('../../TagInput', () => ({
  TagInput: ({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) => (
    <div data-testid="tag-input">
      <label htmlFor="tag-input-field">Tags</label>
      <input
        id="tag-input-field"
        data-testid="tag-input-field"
        value=""
        onChange={e => {
          if (e.target.value) {
            onChange([...value, e.target.value])
          }
        }}
      />
      {value.map(tag => (
        <span key={tag} data-testid={`tag-${tag}`}>
          {tag}
        </span>
      ))}
    </div>
  ),
}))

describe('WishlistForm', () => {
  const defaultProps: WishlistFormProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateFile.mockReturnValue(null)
    mockUploadState.state = 'idle'
    mockUploadState.progress = 0
    mockUploadState.error = null
    mockUploadState.imageUrl = null
    mockUploadState.imageKey = null
  })

  describe('Field Rendering', () => {
    it('renders all required fields', () => {
      render(<WishlistForm {...defaultProps} />)

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/store/i)).toBeInTheDocument()
    })

    it('renders all optional fields', () => {
      render(<WishlistForm {...defaultProps} />)

      expect(screen.getByLabelText(/set number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/source url/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/piece count/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('renders image upload area', () => {
      render(<WishlistForm {...defaultProps} />)

      expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<WishlistForm {...defaultProps} />)

      expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('validates required title field', async () => {
      const onSubmit = vi.fn()
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('validates source URL format', async () => {
      const onSubmit = vi.fn()
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      const sourceUrlInput = screen.getByLabelText(/source url/i)
      await userEvent.type(sourceUrlInput, 'not-a-valid-url')

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Item')

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      // Verify form was not submitted due to validation error
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled()
      })
    })

    it('validates price format', async () => {
      render(<WishlistForm {...defaultProps} />)

      const priceInput = screen.getByLabelText(/price/i)
      await userEvent.type(priceInput, 'abc')

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Item')

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/price must be a valid decimal/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit with correct payload', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill in required fields
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'LEGO Star Wars')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'LEGO Star Wars',
            store: 'LEGO',
          }),
        )
      })
    })

    it('includes optional fields in payload when provided', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill in fields
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'LEGO Star Wars')

      const setNumberInput = screen.getByLabelText(/set number/i)
      await userEvent.type(setNumberInput, '75192')

      const priceInput = screen.getByLabelText(/price/i)
      await userEvent.type(priceInput, '849.99')

      const pieceCountInput = screen.getByLabelText(/piece count/i)
      await userEvent.type(pieceCountInput, '7541')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'LEGO Star Wars',
            store: 'LEGO',
            setNumber: '75192',
            price: '849.99',
            pieceCount: 7541,
          }),
        )
      })
    })

    it('shows submitting state', async () => {
      render(<WishlistForm {...defaultProps} isSubmitting={true} />)

      expect(screen.getByText(/adding.../i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })

    it('disables all fields when submitting', () => {
      render(<WishlistForm {...defaultProps} isSubmitting={true} />)

      expect(screen.getByLabelText(/title/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })
  })

  describe('Upload State', () => {
    it('shows upload error when error state', () => {
      mockUploadState.error = 'Upload failed'
      mockUploadState.state = 'error'

      render(<WishlistForm {...defaultProps} />)
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays validation errors', async () => {
      render(<WishlistForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })
    })

    it('clears errors on valid input', async () => {
      render(<WishlistForm {...defaultProps} />)

      // Submit to trigger validation
      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      // Fill in title to clear error
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Item')

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('submits form on Cmd+Enter', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Item')

      // Simulate Cmd+Enter
      fireEvent.keyDown(document, { key: 'Enter', metaKey: true })

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })

    it('submits form on Ctrl+Enter', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      render(<WishlistForm {...defaultProps} onSubmit={onSubmit} />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Item')

      // Simulate Ctrl+Enter
      fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true })

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Initial Values', () => {
    it('populates form with initial values', () => {
      const initialValues: Partial<CreateWishlistItem> = {
        title: 'Initial Title',
        store: 'BrickLink',
        setNumber: '12345',
        price: '99.99',
        priority: 3,
        tags: ['tag1', 'tag2'],
      }

      render(<WishlistForm {...defaultProps} initialValues={initialValues} />)

      expect(screen.getByLabelText(/title/i)).toHaveValue('Initial Title')
      expect(screen.getByLabelText(/set number/i)).toHaveValue('12345')
      expect(screen.getByLabelText(/price/i)).toHaveValue('99.99')
    })
  })
})
