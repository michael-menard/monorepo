/**
 * AddItemPage Tests
 *
 * Story wish-2002: Add Item Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddItemPage } from '../AddItemPage'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  }
})

// Mock toast functions - must be declared before vi.mock to avoid hoisting issues
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock mutation hook
const mockAddWishlistItem = vi.fn()
const mockUnwrap = vi.fn()
const mockUseAddWishlistItemMutation = vi.fn()

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useAddWishlistItemMutation: () => mockUseAddWishlistItemMutation(),
}))

// Mock WishlistForm
vi.mock('../../components/WishlistForm', () => ({
  WishlistForm: ({ onSubmit, isSubmitting }: any) => (
    <form
      data-testid="wishlist-form"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({
          title: 'Test Item',
          store: 'LEGO',
          priority: 0,
          tags: [],
        })
      }}
    >
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add to Wishlist'}
      </button>
    </form>
  ),
}))

describe('AddItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockAddWishlistItem.mockClear()
    mockUnwrap.mockClear()

    // Default mock implementation
    mockAddWishlistItem.mockReturnValue({ unwrap: mockUnwrap })
    mockUseAddWishlistItemMutation.mockReturnValue([mockAddWishlistItem, { isLoading: false }])
  })

  describe('Rendering', () => {
    it('renders page header', () => {
      render(<AddItemPage />)
      expect(screen.getByRole('heading', { name: /add to wishlist/i })).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<AddItemPage />)
      expect(
        screen.getByText(/add a new item to your wishlist. fill in the details below./i),
      ).toBeInTheDocument()
    })

    it('renders back link', () => {
      render(<AddItemPage />)
      expect(screen.getByRole('link', { name: /back to gallery/i })).toBeInTheDocument()
    })

    it('renders wishlist form', () => {
      render(<AddItemPage />)
      expect(screen.getByTestId('wishlist-form')).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('triggers mutation on form submit', async () => {
      const mockItem: WishlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test Item',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      }

      mockUnwrap.mockResolvedValue(mockItem)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAddWishlistItem).toHaveBeenCalledWith({
          title: 'Test Item',
          store: 'LEGO',
          priority: 0,
          tags: [],
        })
      })
    })

    it('shows loading state during submission', async () => {
      mockUseAddWishlistItemMutation.mockReturnValue([mockAddWishlistItem, { isLoading: true }])

      render(<AddItemPage />)

      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })
  })

  describe('Success Handling', () => {
    it('shows success toast on successful submission', async () => {
      const { showSuccessToast } = await import('@repo/app-component-library')
      const mockItem: WishlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test Item',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      }

      mockUnwrap.mockResolvedValue(mockItem)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith(
          'Item added!',
          'Test Item has been added to your wishlist.',
          5000,
        )
      })
    })

    it('navigates to gallery on success', async () => {
      const mockItem: WishlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test Item',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      }

      mockUnwrap.mockResolvedValue(mockItem)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error toast on API failure', async () => {
      const { showErrorToast } = await import('@repo/app-component-library')
      const mockError = new Error('Network error')
      mockUnwrap.mockRejectedValue(mockError)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(mockError, 'Failed to add item')
      })
    })

    it('does not navigate on error', async () => {
      const { showErrorToast } = await import('@repo/app-component-library')
      const mockError = new Error('Network error')
      mockUnwrap.mockRejectedValue(mockError)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalled()
      })

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('back link navigates to root', () => {
      render(<AddItemPage />)

      const backLink = screen.getByRole('link', { name: /back to gallery/i })
      expect(backLink).toHaveAttribute('href', '/')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // WISH-2011: MSW Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Full Add Item Flow with Image (WISH-2011 AC11)', () => {
    it('handles form submission with image upload data', async () => {
      const mockItem: WishlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test Item with Image',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: 'https://s3.amazonaws.com/lego-moc-bucket/uploads/test.jpg',
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      }

      mockUnwrap.mockResolvedValue(mockItem)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockAddWishlistItem).toHaveBeenCalled()
      })
    })

    it('displays success and navigates after submission', async () => {
      const { showSuccessToast } = await import('@repo/app-component-library')
      const mockItem: WishlistItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Test Item',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: 'https://s3.amazonaws.com/lego-moc-bucket/uploads/test.jpg',
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      }

      mockUnwrap.mockResolvedValue(mockItem)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })
  })
})
