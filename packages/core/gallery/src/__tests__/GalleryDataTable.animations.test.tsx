import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { GalleryDataTable, type GalleryDataTableColumn } from '../components/GalleryDataTable'
import { GalleryDataTableSkeleton } from '../components/GalleryDataTableSkeleton'

interface WishlistItem {
  id: string
  title: string
  price: string | null
}

const items: WishlistItem[] = [
  { id: '1', title: 'LEGO Castle', price: '99.99' },
]

const columns: GalleryDataTableColumn<WishlistItem>[] = [
  { field: 'title', header: 'Title', size: 400 },
  { field: 'price', header: 'Price', size: 200 },
]

describe('GalleryDataTable animations and micro-interactions', () => {
  it('applies hover and transition classes to data rows', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={items}
        columns={columns}
        ariaLabel="Wishlist items table"
      />,
    )

    const rows = screen.getAllByRole('row')
    const firstDataRow = rows[1] as HTMLTableRowElement

    expect(firstDataRow.className).toContain('transition-colors')
    expect(firstDataRow.className).toContain('duration-100')
    expect(firstDataRow.className).toContain('hover:bg-accent/10')
  })

  it('applies motion-safe hover styles to column headers', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={items}
        columns={columns}
        ariaLabel="Wishlist items table"
      />,
    )

    const header = screen.getByRole('columnheader', { name: /title/i })

    expect(header.className).toContain('motion-safe:transition-all')
    expect(header.className).toContain('motion-safe:hover:-translate-y-[1px]')
  })
})

describe('GalleryDataTableSkeleton animations', () => {
  it('uses motion-safe:animate-pulse for shimmer placeholders', () => {
    render(<GalleryDataTableSkeleton columns={3} rows={2} />)

    const shimmeringElements = document.querySelectorAll('.motion-safe\\:animate-pulse')
    expect(shimmeringElements.length).toBeGreaterThan(0)
  })
})
