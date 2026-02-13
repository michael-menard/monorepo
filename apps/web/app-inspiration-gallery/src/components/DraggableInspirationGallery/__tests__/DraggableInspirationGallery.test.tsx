/**
 * DraggableInspirationGallery Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { DraggableInspirationGallery } from '../index'

// Mock @dnd-kit
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal()
  const { mockDndContext } = await import('@/test/mocks/dnd-kit')
  return {
    ...actual,
    ...mockDndContext(),
  }
})

vi.mock('@dnd-kit/sortable', async () => {
  const { mockSortable } = await import('@/test/mocks/dnd-kit')
  return mockSortable()
})

describe('DraggableInspirationGallery', () => {
  const mockInspirations = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Inspiration 1',
      imageUrl: 'http://example.com/1.jpg',
      thumbnailUrl: null,
      sourceUrl: null,
      description: null,
      tags: [],
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Inspiration 2',
      imageUrl: 'http://example.com/2.jpg',
      thumbnailUrl: null,
      sourceUrl: null,
      description: null,
      tags: [],
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]

  const defaultProps = {
    items: mockInspirations,
    isDraggingEnabled: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all inspirations', () => {
    render(<DraggableInspirationGallery {...defaultProps} />)

    expect(screen.getByText('Inspiration 1')).toBeInTheDocument()
    expect(screen.getByText('Inspiration 2')).toBeInTheDocument()
  })

  it('renders nothing when no inspirations', () => {
    const { container } = render(<DraggableInspirationGallery {...defaultProps} items={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('passes correct props to inspiration cards', () => {
    render(<DraggableInspirationGallery {...defaultProps} />)

    expect(screen.getByText('Inspiration 1')).toBeInTheDocument()
    expect(screen.getByText('Inspiration 2')).toBeInTheDocument()
  })
})
