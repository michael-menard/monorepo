import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GalleryGrid } from '../GalleryGrid'

type MockItem = {
  id: string
  name: string
}

describe('GalleryGrid', () => {
  const mockItems: MockItem[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ]

  describe('Loading state', () => {
    it('shows spinner when isLoading is true and items is empty', () => {
      const { container } = render(
        <GalleryGrid<MockItem> items={[]} isLoading={true}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner?.tagName).toBe('svg')
    })

    it('does not show spinner when isLoading is false', () => {
      const { container } = render(
        <GalleryGrid<MockItem> items={[]} isLoading={false}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).not.toBeInTheDocument()
    })

    it('renders items even when isLoading is true if items exist', () => {
      render(
        <GalleryGrid items={mockItems} isLoading={true}>
          {item => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        </GalleryGrid>,
      )

      expect(screen.getByTestId('item-1')).toBeInTheDocument()
      expect(screen.getByTestId('item-2')).toBeInTheDocument()
      expect(screen.getByTestId('item-3')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('shows "No sets found" message when not loading and items is empty', () => {
      render(
        <GalleryGrid<MockItem> items={[]} isLoading={false}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      expect(screen.getByText('No sets found')).toBeInTheDocument()
      expect(screen.getByText('Add your first set to get started')).toBeInTheDocument()
    })

    it('renders empty state icon', () => {
      const { container } = render(
        <GalleryGrid<MockItem> items={[]} isLoading={false}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon?.tagName).toBe('svg')
    })
  })

  describe('Items rendering', () => {
    it('renders items using children render prop', () => {
      render(
        <GalleryGrid items={mockItems}>
          {item => (
            <div data-testid={`item-${item.id}`}>
              <span>{item.name}</span>
            </div>
          )}
        </GalleryGrid>,
      )

      expect(screen.getByTestId('item-1')).toHaveTextContent('Item 1')
      expect(screen.getByTestId('item-2')).toHaveTextContent('Item 2')
      expect(screen.getByTestId('item-3')).toHaveTextContent('Item 3')
    })

    it('wraps each item in a div with key', () => {
      const { container } = render(
        <GalleryGrid items={mockItems}>
          {item => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        </GalleryGrid>,
      )

      const grid = container.querySelector('[data-testid="gallery-grid"]')
      expect(grid?.children).toHaveLength(3)
      Array.from(grid?.children || []).forEach(child => {
        expect(child).toHaveClass('relative')
      })
    })
  })

  describe('Layout and styling', () => {
    it('applies default grid classes when className is not provided', () => {
      render(
        <GalleryGrid items={mockItems}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
      expect(grid).toHaveClass('xl:grid-cols-4')
      expect(grid).toHaveClass('gap-4')
    })

    it('applies custom className when provided', () => {
      render(
        <GalleryGrid items={mockItems} className="custom-grid-class">
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('custom-grid-class')
      expect(grid).not.toHaveClass('grid')
    })

    it('has data-testid="gallery-grid" when items exist', () => {
      render(
        <GalleryGrid items={mockItems}>
          {item => <div>{item.name}</div>}
        </GalleryGrid>,
      )

      expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('handles single item', () => {
      render(
        <GalleryGrid items={[mockItems[0]]}>
          {item => <div data-testid="single-item">{item.name}</div>}
        </GalleryGrid>,
      )

      expect(screen.getByTestId('single-item')).toBeInTheDocument()
    })

    it('handles many items', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
      }))

      render(
        <GalleryGrid items={manyItems}>
          {item => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        </GalleryGrid>,
      )

      expect(screen.getByTestId('item-0')).toBeInTheDocument()
      expect(screen.getByTestId('item-19')).toBeInTheDocument()
    })
  })
})
