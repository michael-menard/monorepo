/**
 * Tests for createSetCard factory function
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { Set } from '@repo/api-client'
import { GalleryCard } from '../../components/GalleryCard'
import { createSetCard } from '../create-set-card'

describe('createSetCard', () => {
  const mockSet: Set = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    title: 'Fire Station',
    setNumber: '60320',
    store: 'LEGO Store',
    sourceUrl: 'https://example.com/set',
    pieceCount: 540,
    releaseDate: '2024-01-01T00:00:00Z',
    theme: 'City',
    tags: ['city', 'vehicles'],
    notes: 'Great set',
    isBuilt: true,
    quantity: 1,
    purchasePrice: 49.99,
    tax: 4.5,
    shipping: 0,
    purchaseDate: '2024-02-01T00:00:00Z',
    wishlistItemId: null,
    images: [
      {
        id: 'img-1',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        position: 0,
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  }

  it('returns correct GalleryCardProps for valid set data', () => {
    const cardProps = createSetCard(mockSet)

    expect(cardProps.title).toBe('Fire Station')
    expect(cardProps.subtitle).toBe('Set 60320')
    expect(cardProps.image).toEqual({
      src: 'https://example.com/thumb.jpg',
      alt: 'Fire Station',
    })
  })

  it('uses imageUrl as fallback when thumbnailUrl is missing', () => {
    const setWithoutThumbnail = {
      ...mockSet,
      images: [{ ...mockSet.images[0], thumbnailUrl: null }],
    }

    const cardProps = createSetCard(setWithoutThumbnail)

    expect(cardProps.image).toEqual({
      src: 'https://example.com/image.jpg',
      alt: 'Fire Station',
    })
  })

  it('renders metadata with piece count badge', () => {
    const cardProps = createSetCard(mockSet)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('540 pieces')
  })

  it('renders metadata with theme badge', () => {
    const cardProps = createSetCard(mockSet)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('City')
  })

  it('renders metadata with build status', () => {
    const cardProps = createSetCard(mockSet)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('Built')
  })

  it('shows "Unbuilt" for sets not built', () => {
    const unbuiltSet = { ...mockSet, isBuilt: false }
    const cardProps = createSetCard(unbuiltSet)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('Unbuilt')
  })

  it('respects showPieceCount option', () => {
    const cardProps = createSetCard(mockSet, { showPieceCount: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).not.toContain('pieces')
  })

  it('respects showBuildStatus option', () => {
    const cardProps = createSetCard(mockSet, { showBuildStatus: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).not.toContain('Built')
  })

  it('includes hover overlay when actions are provided', () => {
    const mockActions = [<button key="edit">Edit</button>]

    const cardProps = createSetCard(mockSet, { actions: mockActions })

    expect(cardProps.hoverOverlay).toBeDefined()
  })

  it('passes through base options correctly', () => {
    const onClick = () => console.log('clicked')
    const cardProps = createSetCard(mockSet, {
      onClick,
      selected: true,
      'data-testid': 'set-card-123',
    })

    expect(cardProps.onClick).toBe(onClick)
    expect(cardProps.selected).toBe(true)
    expect(cardProps['data-testid']).toBe('set-card-123')
  })
})
