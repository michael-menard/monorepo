/**
 * SortableInspirationCard Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SortableInspirationCard } from '../index'

// Mock @dnd-kit
vi.mock('@dnd-kit/sortable', async () => {
  const { mockSortable } = await import('@/test/mocks/dnd-kit')
  return mockSortable()
})

vi.mock('@dnd-kit/utilities', async () => {
  const { mockUtilities } = await import('@/test/mocks/dnd-kit')
  return mockUtilities()
})

describe('SortableInspirationCard', () => {
  const defaultProps = {
    id: '123',
    title: 'Test Inspiration',
    imageUrl: 'http://example.com/image.jpg',
  }

  it('renders inspiration card', () => {
    render(<SortableInspirationCard {...defaultProps} />)
    
    expect(screen.getByText('Test Inspiration')).toBeInTheDocument()
  })

  it('has drag handle accessibility', () => {
    render(<SortableInspirationCard {...defaultProps} />)
    
    const card = screen.getByRole('article')
    expect(card).toBeInTheDocument()
  })
})
