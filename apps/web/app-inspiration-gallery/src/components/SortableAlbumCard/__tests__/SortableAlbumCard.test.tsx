/**
 * SortableAlbumCard Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SortableAlbumCard } from '../index'

// Mock @dnd-kit
vi.mock('@dnd-kit/sortable', async () => {
  const { mockSortable } = await import('@/test/mocks/dnd-kit')
  return mockSortable()
})

vi.mock('@dnd-kit/utilities', async () => {
  const { mockUtilities } = await import('@/test/mocks/dnd-kit')
  return mockUtilities()
})

describe('SortableAlbumCard', () => {
  const defaultProps = {
    id: '123',
    title: 'Test Album',
    itemCount: 5,
  }

  it('renders album card', () => {
    render(<SortableAlbumCard {...defaultProps} />)
    
    expect(screen.getByText('Test Album')).toBeInTheDocument()
  })

  it('shows item count', () => {
    render(<SortableAlbumCard {...defaultProps} />)
    
    expect(screen.getByText(/5 items/i)).toBeInTheDocument()
  })
})
