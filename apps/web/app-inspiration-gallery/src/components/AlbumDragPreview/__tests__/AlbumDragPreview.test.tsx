/**
 * AlbumDragPreview Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlbumDragPreview } from '../index'

describe('AlbumDragPreview', () => {
  const defaultItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Album',
    coverImageUrl: null,
    itemCount: 5,
  }

  it('renders album title', () => {
    render(<AlbumDragPreview item={defaultItem} />)

    expect(screen.getByText('Test Album')).toBeInTheDocument()
  })

  it('shows item count', () => {
    render(<AlbumDragPreview item={defaultItem} />)

    expect(screen.getByText(/5 items/i)).toBeInTheDocument()
  })

  it('does not render when item is null', () => {
    const { container } = render(<AlbumDragPreview item={null} />)

    expect(container.firstChild).toBeNull()
  })
})
