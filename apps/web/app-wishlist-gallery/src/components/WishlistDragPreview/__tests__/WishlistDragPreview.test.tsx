/**
 * WishlistDragPreview Component Tests
 *
 * Story WISH-2005c: Drag preview thumbnail
 *
 * Test coverage for:
 * - AC-1: Preview displays image, title, price at 70% scale with 0.8 opacity
 * - AC-5: Missing image shows Package icon fallback
 * - AC-6: Long titles are truncated with ellipsis
 * - AC-11: Shadow is applied
 * - AC-12: Border highlight is applied
 */

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { WishlistDragPreview } from '../index'

// Mock wishlist item with all fields (title is exactly 28 chars - under 30 limit)
const mockWishlistItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'LEGO Millennium Falcon 75192',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/product/75192',
  imageUrl: 'https://example.com/image.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: '2023-01-01T00:00:00.000Z',
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

// Item with long title (over 30 chars)
const mockItemWithLongTitle: WishlistItem = {
  ...mockWishlistItem,
  id: 'long-title-item',
  title: 'LEGO Star Wars Ultimate Collector Series Millennium Falcon Set',
}

// Item without image
const mockItemWithoutImage: WishlistItem = {
  ...mockWishlistItem,
  id: 'no-image-item',
  imageUrl: null,
}

// Item without price
const mockItemWithoutPrice: WishlistItem = {
  ...mockWishlistItem,
  id: 'no-price-item',
  price: null,
}

describe('WishlistDragPreview', () => {
  describe('AC-1: Preview displays item data', () => {
    it('renders with item image, title, and price', async () => {
      render(<WishlistDragPreview item={mockWishlistItem} />)

      // Wait for lazy-loaded content
      await waitFor(() => {
        expect(screen.getByTestId('wishlist-drag-preview')).toBeInTheDocument()
      })

      // Check image is rendered
      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', mockWishlistItem.imageUrl)
      expect(image).toHaveAttribute('alt', mockWishlistItem.title)

      // Check title is rendered (28 chars, no truncation)
      expect(screen.getByTestId('wishlist-drag-preview-title')).toHaveTextContent(
        'LEGO Millennium Falcon 75192',
      )

      // Check price is rendered
      expect(screen.getByTestId('wishlist-drag-preview-price')).toHaveTextContent('$849.99')
    })

    it('applies 70% scale transform', async () => {
      render(<WishlistDragPreview item={mockWishlistItem} />)

      await waitFor(() => {
        const preview = screen.getByTestId('wishlist-drag-preview')
        expect(preview).toHaveStyle({ transform: 'scale(0.7)' })
      })
    })

    it('shows store name', async () => {
      render(<WishlistDragPreview item={mockWishlistItem} />)

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-drag-preview-store')).toHaveTextContent('LEGO')
      })
    })
  })

  describe('AC-5: Missing image fallback', () => {
    it('shows Package icon when imageUrl is null', async () => {
      render(<WishlistDragPreview item={mockItemWithoutImage} />)

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-drag-preview-fallback')).toBeInTheDocument()
      })

      // Should not have an img element
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('shows Package icon when imageUrl is empty string', async () => {
      const itemWithEmptyImage = { ...mockWishlistItem, imageUrl: '' }
      render(<WishlistDragPreview item={itemWithEmptyImage} />)

      await waitFor(() => {
        expect(screen.getByTestId('wishlist-drag-preview-fallback')).toBeInTheDocument()
      })
    })
  })

  describe('AC-6: Long title truncation', () => {
    it('truncates titles longer than 30 characters with ellipsis', async () => {
      render(<WishlistDragPreview item={mockItemWithLongTitle} />)

      await waitFor(() => {
        const title = screen.getByTestId('wishlist-drag-preview-title')
        // Original is 61 chars, should be truncated to 30 + "..."
        expect(title).toHaveTextContent('LEGO Star Wars Ultimate Collec...')
      })
    })

    it('does not truncate titles under 30 characters', async () => {
      const shortTitleItem = { ...mockWishlistItem, title: 'Short Title' }
      render(<WishlistDragPreview item={shortTitleItem} />)

      await waitFor(() => {
        const title = screen.getByTestId('wishlist-drag-preview-title')
        expect(title).toHaveTextContent('Short Title')
        expect(title.textContent).not.toContain('...')
      })
    })
  })

  describe('AC-11 & AC-12: Shadow and border styling', () => {
    it('applies shadow-xl class for visual lift', async () => {
      render(<WishlistDragPreview item={mockWishlistItem} />)

      await waitFor(() => {
        const preview = screen.getByTestId('wishlist-drag-preview')
        expect(preview).toHaveClass('shadow-xl')
      })
    })

    it('applies ring-2 ring-primary class for border highlight', async () => {
      render(<WishlistDragPreview item={mockWishlistItem} />)

      await waitFor(() => {
        const preview = screen.getByTestId('wishlist-drag-preview')
        expect(preview).toHaveClass('ring-2')
        expect(preview).toHaveClass('ring-primary')
      })
    })
  })

  describe('Edge cases', () => {
    it('renders nothing when item is null', () => {
      render(<WishlistDragPreview item={null} />)

      // Should not render the preview
      expect(screen.queryByTestId('wishlist-drag-preview')).not.toBeInTheDocument()
    })

    it('shows "No price" when price is null', async () => {
      render(<WishlistDragPreview item={mockItemWithoutPrice} />)

      await waitFor(() => {
        expect(screen.getByText('No price')).toBeInTheDocument()
      })
    })
  })
})
