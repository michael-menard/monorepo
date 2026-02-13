/**
 * Tests for createInstructionCard factory function
 *
 * Story REPA-020: Domain Card Factories for @repo/gallery
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { MocInstructions } from '@repo/api-client'
import { GalleryCard } from '../../components/GalleryCard'
import { createInstructionCard } from '../create-instruction-card'

describe('createInstructionCard', () => {
  const mockInstruction: MocInstructions = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-1',
    title: 'Awesome MOC Building',
    description: 'A detailed medieval build',
    type: 'moc',
    mocId: 'moc-001',
    slug: 'awesome-moc-building',
    author: 'Builder Bob',
    partsCount: 1500,
    minifigCount: 4,
    theme: 'Castle',
    themeId: 42,
    subtheme: 'Medieval',
    uploadedDate: new Date('2024-01-15'),
    brand: null,
    setNumber: null,
    releaseYear: null,
    designer: null,
    difficulty: 'intermediate',
    status: 'published',
    visibility: 'public',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    category: null,
    tags: ['castle', 'medieval'],
    instructionsMetadata: {
      instructionType: 'pdf',
      hasInstructions: true,
      pageCount: 120,
      fileSize: 15000000,
      previewImages: [],
    },
    dimensions: null,
    features: [],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
    publishedAt: new Date('2024-01-15'),
    archivedAt: null,
  } as MocInstructions

  it('returns correct GalleryCardProps for valid instruction data', () => {
    const cardProps = createInstructionCard(mockInstruction)

    expect(cardProps.title).toBe('Awesome MOC Building')
    expect(cardProps.subtitle).toBe('Builder Bob')
    expect(cardProps.image).toEqual({
      src: 'https://example.com/thumbnail.jpg',
      alt: 'Awesome MOC Building',
    })
    expect(cardProps.hoverOverlay).toBeUndefined()
  })

  it('returns undefined image when thumbnailUrl is missing', () => {
    const instructionWithoutThumbnail = {
      ...mockInstruction,
      thumbnailUrl: null,
    }

    const cardProps = createInstructionCard(instructionWithoutThumbnail)

    expect(cardProps.image).toBeUndefined()
  })

  it('renders metadata with piece count badge', () => {
    const cardProps = createInstructionCard(mockInstruction)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('1,500 pieces')
  })

  it('renders metadata with theme badge', () => {
    const cardProps = createInstructionCard(mockInstruction)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('Castle')
  })

  it('renders metadata with status badge', () => {
    const cardProps = createInstructionCard(mockInstruction)
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).toContain('published')
  })

  it('respects showPieceCount option', () => {
    const cardProps = createInstructionCard(mockInstruction, { showPieceCount: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    expect(container.textContent).not.toContain('pieces')
  })

  it('respects showTheme option', () => {
    const cardProps = createInstructionCard(mockInstruction, { showTheme: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    // Theme badge should not be present (check for badge variant pattern)
    const badges = container.querySelectorAll('[class*="badge"]')
    const themeBadge = Array.from(badges).find(badge =>
      badge.textContent?.toLowerCase().includes('castle'),
    )
    expect(themeBadge).toBeUndefined()
  })

  it('respects showStatus option', () => {
    const cardProps = createInstructionCard(mockInstruction, { showStatus: false })
    const { container } = render(<GalleryCard {...cardProps} />)

    // Check if we have badges but not the status one
    const badges = container.querySelectorAll('[class*="badge"]')
    const statusBadge = Array.from(badges).find(badge =>
      badge.textContent?.toLowerCase().includes('published'),
    )
    expect(statusBadge).toBeUndefined()
  })

  it('includes hover overlay when actions are provided', () => {
    const mockActions = [<button key="edit">Edit</button>, <button key="delete">Delete</button>]

    const cardProps = createInstructionCard(mockInstruction, { actions: mockActions })

    expect(cardProps.hoverOverlay).toBeDefined()
  })

  it('passes through base options correctly', () => {
    const onClick = () => console.log('clicked')
    const cardProps = createInstructionCard(mockInstruction, {
      onClick,
      selected: true,
      draggable: true,
      'data-testid': 'instruction-card-123',
    })

    expect(cardProps.onClick).toBe(onClick)
    expect(cardProps.selected).toBe(true)
    expect(cardProps.draggable).toBe(true)
    expect(cardProps['data-testid']).toBe('instruction-card-123')
  })
})
