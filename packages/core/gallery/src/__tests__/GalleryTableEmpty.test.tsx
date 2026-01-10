import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { GalleryTableEmpty } from '../components/GalleryTableEmpty'

describe('GalleryTableEmpty', () => {
  it('renders no-items variant with title and description', () => {
    render(<GalleryTableEmpty variant="no-items" />)

    expect(screen.getByTestId('gallery-table-empty')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-table-empty-title')).toHaveTextContent(
      'Your wishlist is empty',
    )
    expect(screen.getByTestId('gallery-table-empty-description')).toBeInTheDocument()
  })

  it('renders no-results variant with title and description', () => {
    render(<GalleryTableEmpty variant="no-results" />)

    expect(screen.getByTestId('gallery-table-empty-title')).toHaveTextContent(
      'No results match your filters',
    )
  })

  it('renders Add Item button and calls onAddItem for no-items variant', () => {
    const handleAddItem = vi.fn()

    render(<GalleryTableEmpty variant="no-items" onAddItem={handleAddItem} />)

    const button = screen.getByTestId('gallery-table-empty-add-item')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleAddItem).toHaveBeenCalledTimes(1)
  })

  it('renders Clear Filters button and calls onClearFilters for no-results variant', () => {
    const handleClearFilters = vi.fn()

    render(
      <GalleryTableEmpty variant="no-results" onClearFilters={handleClearFilters} />,
    )

    const button = screen.getByTestId('gallery-table-empty-clear-filters')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(handleClearFilters).toHaveBeenCalledTimes(1)
  })

  it('is announced politely for accessibility', () => {
    render(<GalleryTableEmpty variant="no-items" />)

    const container = screen.getByTestId('gallery-table-empty')
    expect(container).toHaveAttribute('role', 'status')
    expect(container).toHaveAttribute('aria-live', 'polite')
  })
})
