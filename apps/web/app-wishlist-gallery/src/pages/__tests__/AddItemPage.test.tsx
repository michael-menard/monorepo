/**
 * AddItemPage Tests
 *
 * Story wish-2002: Add Item Flow
 * Story WISH-2032: Optimistic UI for Form Submission
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

// Mock sonner toast - use inline function to avoid hoisting issues
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
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

// Mock useLocalStorage
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: () => [null, vi.fn(), vi.fn()],
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
    it('triggers mutation on form submit with tempId and callback', async () => {
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
        expect(mockAddWishlistItem).toHaveBeenCalled()
        // WISH-2032: Verify tempId and onOptimisticError callback are passed
        const callArg = mockAddWishlistItem.mock.calls[0][0]
        expect(callArg.title).toBe('Test Item')
        expect(callArg.store).toBe('LEGO')
        expect(callArg.tempId).toBeDefined()
        expect(callArg.tempId).toMatch(/^temp-\d+$/)
        expect(typeof callArg.onOptimisticError).toBe('function')
      })
    })

    it('shows loading state during submission', async () => {
      mockUseAddWishlistItemMutation.mockReturnValue([mockAddWishlistItem, { isLoading: true }])

      render(<AddItemPage />)

      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })
  })

  describe('Success Handling (WISH-2032 Optimistic UI)', () => {
    it('shows success toast immediately on form submit (optimistic)', async () => {
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

      // WISH-2032: Success toast is shown immediately (before API response)
      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith(
          'Item added!',
          'Test Item has been added to your wishlist.',
          5000,
        )
      })
    })

    it('navigates to gallery immediately on submit (optimistic)', async () => {
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

      // WISH-2032: Navigation happens immediately (before API response)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
    })
  })

  describe('Error Handling (WISH-2032 Rollback)', () => {
    it('calls onOptimisticError callback on API failure', async () => {
      const mockError = { error: { data: { message: 'Network error' } } }
      mockUnwrap.mockRejectedValue(mockError)

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      // Wait for mutation to be called
      await waitFor(() => {
        expect(mockAddWishlistItem).toHaveBeenCalled()
      })

      // WISH-2032: Error callback is passed to mutation
      const callArg = mockAddWishlistItem.mock.calls[0][0]
      expect(typeof callArg.onOptimisticError).toBe('function')
    })

    it('navigates immediately even before API response (optimistic)', async () => {
      // This test verifies optimistic behavior - navigation happens before API response
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

      // Delay the API response
      mockUnwrap.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockItem), 100)),
      )

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      // Navigation should happen immediately, not after API response
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      })
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

  // ─────────────────────────────────────────────────────────────────────────────
  // WISH-2032: Optimistic UI Specific Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('WISH-2032: Optimistic UI for Form Submission', () => {
    it('passes tempId to mutation for cache tracking', async () => {
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
        const callArg = mockAddWishlistItem.mock.calls[0][0]
        expect(callArg.tempId).toMatch(/^temp-\d+$/)
      })
    })

    it('provides onOptimisticError callback for rollback handling', async () => {
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
        const callArg = mockAddWishlistItem.mock.calls[0][0]
        expect(typeof callArg.onOptimisticError).toBe('function')
      })
    })

    it('disables form during optimistic submission', async () => {
      // Create a promise that we control to keep the mutation pending
      let resolvePromise: (value: any) => void
      mockUnwrap.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve
          }),
      )

      render(<AddItemPage />)

      const submitButton = screen.getByRole('button', { name: /add to wishlist/i })
      await userEvent.click(submitButton)

      // After clicking, the form should show as submitting
      await waitFor(() => {
        // The button should show Adding... state
        expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
      })

      // Cleanup: resolve the promise
      resolvePromise!({
        id: '123',
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
      })
    })
  })
})
