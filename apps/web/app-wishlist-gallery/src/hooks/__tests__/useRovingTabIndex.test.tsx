/**
 * Tests for useRovingTabIndex Hook
 *
 * Story WISH-2006: Accessibility
 */

import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useRef } from 'react'
import { useRovingTabIndex } from '../useRovingTabIndex'

// Test component that uses the hook
function TestGrid({
  itemCount,
  columns,
  wrapHorizontal = true,
  wrapVertical = false,
}: {
  itemCount: number
  columns?: number
  wrapHorizontal?: boolean
  wrapVertical?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { activeIndex, getItemProps, containerProps } = useRovingTabIndex(itemCount, containerRef, {
    columns,
    wrapHorizontal,
    wrapVertical,
  })

  return (
    <div ref={containerRef} {...containerProps} data-testid="grid">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div
          key={index}
          {...getItemProps(index)}
          data-testid={`item-${index}`}
          data-active={index === activeIndex}
        >
          Item {index}
        </div>
      ))}
    </div>
  )
}

describe('useRovingTabIndex', () => {
  describe('tabIndex management', () => {
    it('should set tabIndex 0 on first item by default', () => {
      render(<TestGrid itemCount={5} columns={3} />)

      const item0 = screen.getByTestId('item-0')
      const item1 = screen.getByTestId('item-1')

      expect(item0).toHaveAttribute('tabindex', '0')
      expect(item1).toHaveAttribute('tabindex', '-1')
    })

    it('should have only one item with tabIndex 0', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const items = screen.getAllByRole('gridcell')
      const tabIndexZeroCount = items.filter(item => item.getAttribute('tabindex') === '0').length

      expect(tabIndexZeroCount).toBe(1)
    })

    it('should update tabIndex when navigating', () => {
      render(<TestGrid itemCount={5} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowRight' })

      const item0 = screen.getByTestId('item-0')
      const item1 = screen.getByTestId('item-1')

      expect(item0).toHaveAttribute('tabindex', '-1')
      expect(item1).toHaveAttribute('tabindex', '0')
    })
  })

  describe('arrow key navigation', () => {
    it('should move right on ArrowRight', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowRight' })

      expect(screen.getByTestId('item-1')).toHaveAttribute('data-active', 'true')
    })

    it('should move left on ArrowLeft', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowRight' }) // Move to index 1
      fireEvent.keyDown(grid, { key: 'ArrowLeft' }) // Move back to 0

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })

    it('should move down on ArrowDown (by column count)', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowDown' })

      expect(screen.getByTestId('item-3')).toHaveAttribute('data-active', 'true')
    })

    it('should move up on ArrowUp (by column count)', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowDown' }) // Move to index 3
      fireEvent.keyDown(grid, { key: 'ArrowUp' }) // Move back to 0

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('Home and End keys', () => {
    it('should jump to first item on Home', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowRight' })
      fireEvent.keyDown(grid, { key: 'ArrowRight' })
      fireEvent.keyDown(grid, { key: 'ArrowDown' })
      fireEvent.keyDown(grid, { key: 'Home' })

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })

    it('should jump to last item on End', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'End' })

      expect(screen.getByTestId('item-8')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('horizontal wrapping', () => {
    it('should wrap from last to first on ArrowRight when wrapHorizontal is true', () => {
      render(<TestGrid itemCount={3} columns={3} wrapHorizontal={true} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'End' }) // Go to last
      fireEvent.keyDown(grid, { key: 'ArrowRight' })

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })

    it('should wrap from first to last on ArrowLeft when wrapHorizontal is true', () => {
      render(<TestGrid itemCount={3} columns={3} wrapHorizontal={true} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowLeft' })

      expect(screen.getByTestId('item-2')).toHaveAttribute('data-active', 'true')
    })

    it('should NOT wrap when wrapHorizontal is false', () => {
      render(<TestGrid itemCount={3} columns={3} wrapHorizontal={false} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowLeft' })

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('vertical wrapping', () => {
    it('should NOT wrap vertically by default', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowUp' }) // Try to go up from index 0

      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })

    it('should wrap vertically when wrapVertical is true', () => {
      render(<TestGrid itemCount={9} columns={3} wrapVertical={true} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowUp' }) // Try to go up from index 0

      // Should wrap to last row, same column (index 6)
      expect(screen.getByTestId('item-6')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('edge cases', () => {
    it('should handle single item', () => {
      render(<TestGrid itemCount={1} columns={1} />)

      const grid = screen.getByTestId('grid')
      fireEvent.keyDown(grid, { key: 'ArrowRight' })
      fireEvent.keyDown(grid, { key: 'ArrowDown' })

      // Should stay on the only item (with wrapping it goes back to 0)
      expect(screen.getByTestId('item-0')).toHaveAttribute('data-active', 'true')
    })

    it('should handle empty grid gracefully', () => {
      render(<TestGrid itemCount={0} columns={3} />)

      const grid = screen.getByTestId('grid')
      // Should not throw
      expect(() => {
        fireEvent.keyDown(grid, { key: 'ArrowRight' })
      }).not.toThrow()
    })

    it('should handle partial last row', () => {
      render(<TestGrid itemCount={7} columns={3} />)

      const grid = screen.getByTestId('grid')
      // Navigate to bottom right of full area
      fireEvent.keyDown(grid, { key: 'End' }) // index 6
      fireEvent.keyDown(grid, { key: 'ArrowDown' }) // Should stay on 6

      expect(screen.getByTestId('item-6')).toHaveAttribute('data-active', 'true')
    })
  })

  describe('container props', () => {
    it('should have role="grid"', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      expect(grid).toHaveAttribute('role', 'grid')
    })

    it('should have aria-label', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const grid = screen.getByTestId('grid')
      expect(grid).toHaveAttribute('aria-label', 'Wishlist items')
    })
  })

  describe('item props', () => {
    it('should have role="gridcell"', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const item = screen.getByTestId('item-0')
      expect(item).toHaveAttribute('role', 'gridcell')
    })

    it('should have aria-selected', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const item0 = screen.getByTestId('item-0')
      const item1 = screen.getByTestId('item-1')

      expect(item0).toHaveAttribute('aria-selected', 'true')
      expect(item1).toHaveAttribute('aria-selected', 'false')
    })

    it('should have data-index', () => {
      render(<TestGrid itemCount={9} columns={3} />)

      const item5 = screen.getByTestId('item-5')
      expect(item5).toHaveAttribute('data-index', '5')
    })
  })
})
