/**
 * AppDataTable drag-and-drop regression tests
 *
 * Covers regressions that were fixed:
 * - Drag handles were hidden unless a priority filter was active (now always visible)
 * - DragOverlay caused row to appear far from cursor (overlay removed; CSS transform used)
 * - orderedData stays in sync when the `data` prop changes
 */

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppDataTable } from '@repo/app-component-library'

type Item = { id: string; name: string }

const columns = [{ key: 'name', header: 'Name' }]

const makeItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: `item-${i + 1}`, name: `Item ${i + 1}` }))

describe('AppDataTable – drag handles (regression: handles were gated behind priority filter)', () => {
  it('renders a drag grip button for every row when draggable=true', () => {
    render(
      <AppDataTable
        data={makeItems(3)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )
    // SortableRow renders one grip button per row
    const grips = screen.getAllByRole('button')
    expect(grips.length).toBeGreaterThanOrEqual(3)
  })

  it('does not render drag grip buttons when draggable is not set', () => {
    render(<AppDataTable data={makeItems(3)} columns={columns} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('renders grip buttons for all rows regardless of item count', () => {
    render(
      <AppDataTable
        data={makeItems(5)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )
    const grips = screen.getAllByRole('button')
    expect(grips.length).toBeGreaterThanOrEqual(5)
  })

  it('grip buttons are keyboard-accessible (tabIndex=0) via dnd-kit attributes', () => {
    render(
      <AppDataTable
        data={makeItems(2)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )
    const grips = screen.getAllByRole('button')
    // dnd-kit injects tabIndex so keyboard drag works
    grips.forEach(grip => {
      expect(grip).toHaveAttribute('tabindex', '0')
    })
  })
})

describe('AppDataTable – no DragOverlay (regression: row appeared far from cursor)', () => {
  it('does not duplicate row content outside the table (no DragOverlay clone)', () => {
    render(
      <AppDataTable
        data={makeItems(3)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )
    // The old DragOverlay would clone the full row into a separate portal table,
    // so "Item 1" would appear twice in the document. Without the overlay it appears once.
    const allItem1 = screen.getAllByText('Item 1')
    expect(allItem1).toHaveLength(1)
  })
})

describe('AppDataTable – orderedData syncs with data prop', () => {
  it('shows updated rows when the data prop is replaced', () => {
    const { rerender } = render(
      <AppDataTable
        data={makeItems(2)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()

    const newItems: Item[] = [
      { id: 'item-99', name: 'Replaced Item A' },
      { id: 'item-100', name: 'Replaced Item B' },
    ]

    act(() => {
      rerender(
        <AppDataTable
          data={newItems}
          columns={columns}
          draggable
          onReorder={vi.fn()}
          getRowId={item => item.id}
        />,
      )
    })

    expect(screen.queryByText('Item 1')).toBeNull()
    expect(screen.getByText('Replaced Item A')).toBeInTheDocument()
    expect(screen.getByText('Replaced Item B')).toBeInTheDocument()
  })

  it('preserves row count after data prop replacement', () => {
    const { rerender } = render(
      <AppDataTable
        data={makeItems(3)}
        columns={columns}
        draggable
        onReorder={vi.fn()}
        getRowId={item => item.id}
      />,
    )

    act(() => {
      rerender(
        <AppDataTable
          data={makeItems(5)}
          columns={columns}
          draggable
          onReorder={vi.fn()}
          getRowId={item => item.id}
        />,
      )
    })

    expect(screen.getByText('Item 5')).toBeInTheDocument()
    expect(screen.queryByText('Item 3')).toBeInTheDocument()
  })
})
