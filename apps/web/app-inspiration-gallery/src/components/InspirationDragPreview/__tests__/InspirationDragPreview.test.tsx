/**
 * InspirationDragPreview Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InspirationDragPreview } from '../index'

describe('InspirationDragPreview', () => {
  const defaultItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Inspiration',
    imageUrl: 'http://example.com/image.jpg',
    thumbnailUrl: null,
  }

  it('renders inspiration title', () => {
    render(<InspirationDragPreview item={defaultItem} />)

    expect(screen.getByText('Test Inspiration')).toBeInTheDocument()
  })

  it('renders image', () => {
    render(<InspirationDragPreview item={defaultItem} />)

    const img = screen.getByRole('img', { name: /Test Inspiration/i })
    expect(img).toHaveAttribute('src', 'http://example.com/image.jpg')
  })

  it('does not render when item is null', () => {
    const { container } = render(<InspirationDragPreview item={null} />)

    expect(container.firstChild).toBeNull()
  })
})
