/**
 * Tests for createInspirationCard factory function
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { Inspiration } from '@repo/api-client'
import { GalleryCard } from '../../components/GalleryCard'
import { createInspirationCard } from '../create-inspiration-card'

describe('createInspirationCard', () => {
  const mockInspiration: Inspiration = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    title: 'Cool MOC Design',
    description: 'An inspiring build idea',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    sourceUrl: 'https://example.com/source',
    tags: ['space', 'starship', 'sci-fi', 'detailed', 'advanced'],
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  }

  it('returns correct GalleryCardProps for valid inspiration data', () => {
    const cardProps = createInspirationCard(mockInspiration)

    expect(cardProps.title).toBe('Cool MOC Design')
    expect(cardProps.subtitle).toBe('An inspiring build idea')
    expect(cardProps.image).toEqual({
      src: 'https://example.com/thumb.jpg',
      alt: 'Cool MOC Design',
    })
  })

  it('uses imageUrl as fallback when thumbnailUrl is missing', () => {
    const inspirationWithoutThumbnail = {
      ...mockInspiration,
      thumbnailUrl: null,
    }

    const cardProps = createInspirationCard(inspirationWithoutThumbnail)

    expect(cardProps.image).toEqual({
      src: 'https://example.com/image.jpg',
      alt: 'Cool MOC Design',
    })
  })

  it('renders metadata with tag badges', () => {
    const cardProps = createInspirationCard(mockInspiration)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('space')
    expect(container.textContent).toContain('starship')
    expect(container.textContent).toContain('sci-fi')
  })

  it('limits tags displayed based on maxTags option', () => {
    const cardProps = createInspirationCard(mockInspiration, { maxTags: 2 })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('space')
    expect(container.textContent).toContain('starship')
    expect(container.textContent).not.toContain('sci-fi')
    expect(container.textContent).toContain('+3 more')
  })

  it('shows all tags when maxTags is set higher than tag count', () => {
    const inspirationWithFewTags = {
      ...mockInspiration,
      tags: ['space', 'starship'],
    }

    const cardProps = createInspirationCard(inspirationWithFewTags, { maxTags: 5 })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('space')
    expect(container.textContent).toContain('starship')
    expect(container.textContent).not.toContain('more')
  })

  it('respects showTags option', () => {
    const cardProps = createInspirationCard(mockInspiration, { showTags: false })

    expect(cardProps.metadata).toBeUndefined()
  })

  it('handles null tags gracefully', () => {
    const inspirationWithoutTags = {
      ...mockInspiration,
      tags: null,
    }

    const cardProps = createInspirationCard(inspirationWithoutTags)

    expect(cardProps.metadata).toBeUndefined()
  })

  it('includes hover overlay when actions are provided', () => {
    const mockActions = [<button key="save">Save</button>]

    const cardProps = createInspirationCard(mockInspiration, { actions: mockActions })

    expect(cardProps.hoverOverlay).toBeDefined()
  })

  it('passes through base options correctly', () => {
    const onClick = () => console.log('clicked')
    const cardProps = createInspirationCard(mockInspiration, {
      onClick,
      draggable: true,
      'data-testid': 'inspiration-card-123',
    })

    expect(cardProps.onClick).toBe(onClick)
    expect(cardProps.draggable).toBe(true)
    expect(cardProps['data-testid']).toBe('inspiration-card-123')
  })
})
