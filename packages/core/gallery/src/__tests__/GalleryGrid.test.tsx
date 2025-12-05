import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GalleryGrid } from '../components/GalleryGrid'

describe('GalleryGrid', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <GalleryGrid>
          <div data-testid="child-1">Item 1</div>
          <div data-testid="child-2">Item 2</div>
          <div data-testid="child-3">Item 3</div>
        </GalleryGrid>,
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
      expect(screen.getByTestId('child-3')).toBeInTheDocument()
    })

    it('renders with default data-testid', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(
        <GalleryGrid data-testid="custom-grid">
          <div>Item</div>
        </GalleryGrid>,
      )

      expect(screen.getByTestId('custom-grid')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="list" for accessibility', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('has aria-label for accessibility', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      expect(screen.getByLabelText('Gallery grid')).toBeInTheDocument()
    })
  })

  describe('CSS classes', () => {
    it('applies grid base class', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('grid')
    })

    it('applies default responsive column classes', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
      expect(grid).toHaveClass('xl:grid-cols-4')
    })

    it('applies default gap class', () => {
      render(
        <GalleryGrid>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('gap-4')
    })

    it('applies custom gap class', () => {
      render(
        <GalleryGrid gap={6}>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('gap-6')
    })

    it('applies custom className', () => {
      render(
        <GalleryGrid className="custom-class">
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('custom-class')
    })
  })

  describe('custom columns configuration', () => {
    it('accepts custom column configuration', () => {
      render(
        <GalleryGrid columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('grid-cols-2')
      expect(grid).toHaveClass('sm:grid-cols-3')
      expect(grid).toHaveClass('lg:grid-cols-4')
      expect(grid).toHaveClass('xl:grid-cols-5')
    })

    it('handles partial column configuration with defaults', () => {
      render(
        <GalleryGrid columns={{ lg: 4 }}>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      // sm defaults to 1, so base should be grid-cols-1
      expect(grid).toHaveClass('grid-cols-1')
      // md defaults to 2
      expect(grid).toHaveClass('sm:grid-cols-2')
      // lg is set to 4
      expect(grid).toHaveClass('lg:grid-cols-4')
    })

    it('does not duplicate breakpoint classes when values are same', () => {
      render(
        <GalleryGrid columns={{ sm: 2, md: 2, lg: 2, xl: 2 }}>
          <div>Item</div>
        </GalleryGrid>,
      )

      const grid = screen.getByTestId('gallery-grid')
      expect(grid).toHaveClass('grid-cols-2')
      // Should not have redundant breakpoint classes since all values are the same
      expect(grid.className).not.toContain('sm:grid-cols-2')
      expect(grid.className).not.toContain('lg:grid-cols-2')
      expect(grid.className).not.toContain('xl:grid-cols-2')
    })
  })

  describe('gap values', () => {
    const gapValues = [1, 2, 3, 4, 5, 6, 8, 10, 12] as const

    gapValues.forEach(gap => {
      it(`supports gap value of ${gap}`, () => {
        render(
          <GalleryGrid gap={gap}>
            <div>Item</div>
          </GalleryGrid>,
        )

        const grid = screen.getByTestId('gallery-grid')
        expect(grid).toHaveClass(`gap-${gap}`)
      })
    })
  })
})
