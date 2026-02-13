/**
 * Tests for createWishlistCard factory function
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { WishlistItem } from '@repo/api-client'
import { GalleryCard } from '../../components/GalleryCard'
import { createWishlistCard } from '../create-wishlist-card'

describe('createWishlistCard', () => {
  const mockWishlistItem: WishlistItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    title: 'Modular Building',
    store: 'amazon',
    setNumber: '10297',
    sourceUrl: 'https://example.com/item',
    imageUrl: 'https://example.com/image.jpg',
    imageVariants: {
      original: {
        url: 'https://example.com/image.jpg',
        width: 1600,
        height: 1600,
        fileSize: 500000,
        format: 'jpeg',
      },
      large: {
        url: 'https://example.com/large.jpg',
        width: 1600,
        height: 1600,
        fileSize: 400000,
        format: 'jpeg',
      },
      medium: {
        url: 'https://example.com/medium.jpg',
        width: 800,
        height: 800,
        fileSize: 150000,
        format: 'jpeg',
      },
      thumbnail: {
        url: 'https://example.com/thumb.jpg',
        width: 200,
        height: 200,
        fileSize: 30000,
        format: 'jpeg',
      },
    },
    price: '249.99',
    currency: 'USD',
    pieceCount: 2807,
    releaseDate: '2024-01-01T00:00:00Z',
    tags: ['modular', 'buildings'],
    priority: 4,
    notes: 'Must have!',
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    status: 'wishlist',
    statusChangedAt: null,
    purchaseDate: null,
    purchasePrice: null,
    purchaseTax: null,
    purchaseShipping: null,
    buildStatus: null,
  }

  it('returns correct GalleryCardProps for valid wishlist item', () => {
    const cardProps = createWishlistCard(mockWishlistItem)

    expect(cardProps.title).toBe('Modular Building')
    expect(cardProps.subtitle).toBe('amazon')
    expect(cardProps.image).toEqual({
      src: 'https://example.com/thumb.jpg',
      alt: 'Modular Building',
    })
  })

  it('uses imageVariants.medium as fallback when thumbnail is missing', () => {
    const itemWithoutThumbnail = {
      ...mockWishlistItem,
      imageVariants: {
        ...mockWishlistItem.imageVariants!,
        thumbnail: null as any,
      },
    }

    const cardProps = createWishlistCard(itemWithoutThumbnail)

    expect(cardProps.image).toEqual({
      src: 'https://example.com/medium.jpg',
      alt: 'Modular Building',
    })
  })

  it('renders metadata with piece count badge', () => {
    const cardProps = createWishlistCard(mockWishlistItem)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('2,807 pieces')
  })

  it('renders metadata with price badge', () => {
    const cardProps = createWishlistCard(mockWishlistItem)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('$249.99')
  })

  it('renders metadata with priority badge', () => {
    const cardProps = createWishlistCard(mockWishlistItem)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('High Priority')
  })

  it('shows correct priority labels for different levels', () => {
    const lowPriorityItem = { ...mockWishlistItem, priority: 1 }
    const mediumPriorityItem = { ...mockWishlistItem, priority: 3 }
    const highPriorityItem = { ...mockWishlistItem, priority: 5 }

    const lowProps = createWishlistCard(lowPriorityItem)
    const mediumProps = createWishlistCard(mediumPriorityItem)
    const highProps = createWishlistCard(highPriorityItem)

    const { container: lowContainer } = render(<GalleryCard {...lowProps} />)
    const { container: medContainer } = render(<GalleryCard {...mediumProps} />)
    const { container: highContainer } = render(<GalleryCard {...highProps} />)

    expect(lowContainer.textContent).toContain('Low Priority')
    expect(medContainer.textContent).toContain('Medium Priority')
    expect(highContainer.textContent).toContain('High Priority')
  })

  it('respects showPrice option', () => {
    const cardProps = createWishlistCard(mockWishlistItem, { showPrice: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).not.toContain('$249.99')
  })

  it('respects showPriority option', () => {
    const cardProps = createWishlistCard(mockWishlistItem, { showPriority: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).not.toContain('Priority')
  })

  it('includes hover overlay when actions are provided', () => {
    const mockActions = [<button key="remove">Remove</button>]

    const cardProps = createWishlistCard(mockWishlistItem, { actions: mockActions })

    expect(cardProps.hoverOverlay).toBeDefined()
  })

  it('passes through base options correctly', () => {
    const onClick = () => console.log('clicked')
    const cardProps = createWishlistCard(mockWishlistItem, {
      onClick,
      selectable: true,
      'data-testid': 'wishlist-card-123',
    })

    expect(cardProps.onClick).toBe(onClick)
    expect(cardProps.selectable).toBe(true)
    expect(cardProps['data-testid']).toBe('wishlist-card-123')
  })
})
