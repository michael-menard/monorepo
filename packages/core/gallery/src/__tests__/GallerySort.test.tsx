import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  GallerySort,
  GallerySortOption,
  defaultGallerySortOptions,
} from '../components/GallerySort'

describe('GallerySort', () => {
  const sortOptions: GallerySortOption[] = [
    { value: 'name', label: 'Name', defaultDirection: 'asc' },
    { value: 'date', label: 'Date', defaultDirection: 'desc' },
    { value: 'count', label: 'Count', defaultDirection: 'desc' },
  ]

  it('renders sort component', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-sort')).toBeInTheDocument()
  })

  it('renders select dropdown', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
      />,
    )

    // AppSelect renders as a combobox button
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders direction toggle button', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-sort-direction')).toBeInTheDocument()
  })

  it('displays custom placeholder', () => {
    render(
      <GallerySort
        options={sortOptions}
        value=""
        direction="asc"
        onChange={() => {}}
        placeholder="Choose sort..."
      />,
    )

    expect(screen.getByText('Choose sort...')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
        label="Sort items"
      />,
    )

    expect(screen.getByText('Sort items')).toBeInTheDocument()
  })

  it('toggles direction from asc to desc when direction button clicked', () => {
    const handleChange = vi.fn()
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-sort-direction'))

    expect(handleChange).toHaveBeenCalledWith('name', 'desc')
  })

  it('toggles direction from desc to asc when direction button clicked', () => {
    const handleChange = vi.fn()
    render(
      <GallerySort
        options={sortOptions}
        value="date"
        direction="desc"
        onChange={handleChange}
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-sort-direction'))

    expect(handleChange).toHaveBeenCalledWith('date', 'asc')
  })

  it('has accessible aria-label on direction button for ascending', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-sort-direction')).toHaveAttribute(
      'aria-label',
      'Sort ascending. Click to toggle.',
    )
  })

  it('has accessible aria-label on direction button for descending', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="desc"
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-sort-direction')).toHaveAttribute(
      'aria-label',
      'Sort descending. Click to toggle.',
    )
  })

  it('applies rotate class to icon when direction is desc', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="desc"
        onChange={() => {}}
      />,
    )

    // Get the SVG inside the direction button (not the select chevron)
    const directionButton = screen.getByTestId('gallery-sort-direction')
    const svg = directionButton.querySelector('svg')
    expect(svg).toHaveClass('rotate-180')
  })

  it('does not apply rotate class to icon when direction is asc', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
      />,
    )

    // Get the SVG inside the direction button (not the select chevron)
    const directionButton = screen.getByTestId('gallery-sort-direction')
    const svg = directionButton.querySelector('svg')
    expect(svg).not.toHaveClass('rotate-180')
  })

  it('applies custom className', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
        className="custom-class"
      />,
    )

    expect(screen.getByTestId('gallery-sort')).toHaveClass('custom-class')
  })

  it('renders with custom data-testid', () => {
    render(
      <GallerySort
        options={sortOptions}
        value="name"
        direction="asc"
        onChange={() => {}}
        data-testid="custom-sort"
      />,
    )

    expect(screen.getByTestId('custom-sort')).toBeInTheDocument()
    // AppSelect doesn't forward data-testid, so just check direction button
    expect(screen.getByTestId('custom-sort-direction')).toBeInTheDocument()
  })

  it('exports defaultGallerySortOptions with expected values', () => {
    expect(defaultGallerySortOptions).toHaveLength(4)
    expect(defaultGallerySortOptions).toEqual([
      { value: 'name', label: 'Name', defaultDirection: 'asc' },
      { value: 'dateAdded', label: 'Date Added', defaultDirection: 'desc' },
      { value: 'dateModified', label: 'Date Modified', defaultDirection: 'desc' },
      { value: 'pieceCount', label: 'Piece Count', defaultDirection: 'desc' },
    ])
  })
})
