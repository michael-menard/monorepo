import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  GalleryDataTable,
  type GalleryDataTableColumn,
} from '../components/GalleryDataTable'

interface WishlistItem {
  id: string
  title: string
  price: string | null
  currency: string
  store: string
  priority: number
}

const mockItems: WishlistItem[] = [
  {
    id: '1',
    title: 'LEGO Castle',
    price: '99.99',
    currency: 'USD',
    store: 'LEGO',
    priority: 5,
  },
  {
    id: '2',
    title: 'Modular Building',
    price: '149.99',
    currency: 'USD',
    store: 'Barweer',
    priority: 3,
  },
]

const columns: GalleryDataTableColumn<WishlistItem>[] = [
  { field: 'title', header: 'Title', size: 400 },
  { field: 'price', header: 'Price', size: 200, className: 'text-right' },
  { field: 'store', header: 'Store', size: 200, className: 'text-center' },
  { field: 'priority', header: 'Priority', size: 200, className: 'text-center' },
]

describe('GalleryDataTable', () => {
  it('renders table with items', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    expect(screen.getByRole('table', { name: /wishlist items table/i })).toBeInTheDocument()
    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()
    expect(screen.getByText('Modular Building')).toBeInTheDocument()
  })

  it('displays column headers', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Store')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('calls onRowClick when row clicked', async () => {
    const user = userEvent.setup()
    const handleRowClick = vi.fn<(item: WishlistItem) => void>()

    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={handleRowClick}
        ariaLabel="Wishlist items table"
      />,
    )

    const firstRow = screen.getByText('LEGO Castle').closest('tr')
    expect(firstRow).not.toBeNull()

    await user.click(firstRow as HTMLTableRowElement)

    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick.mock.calls[0][0].id).toBe('1')
  })

  it('triggers onRowClick on Enter key press', async () => {
    const user = userEvent.setup()
    const handleRowClick = vi.fn<(item: WishlistItem) => void>()

    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={handleRowClick}
        ariaLabel="Wishlist items table"
      />,
    )

    const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
    firstRow.focus()

    await user.keyboard('{Enter}')

    expect(handleRowClick).toHaveBeenCalledTimes(1)
    expect(handleRowClick.mock.calls[0][0].id).toBe('1')
  })

  it('applies responsive classes (hidden on mobile)', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    const table = screen.getByRole('table')
    // Table is wrapped by the Table container div, which is itself wrapped by the responsive container
    const tableContainer = table.parentElement as HTMLElement
    const responsiveWrapper = tableContainer.parentElement as HTMLElement

    expect(responsiveWrapper.className).toContain('hidden')
    expect(responsiveWrapper.className).toContain('md:block')
  })

  it('sets ARIA attributes for accessibility', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    const table = screen.getByRole('table', { name: /wishlist items table/i })

    expect(table).toHaveAttribute('aria-rowcount', mockItems.length.toString())
    expect(table).toHaveAttribute('aria-colcount', columns.length.toString())
  })

  it('renders a skeleton when loading with no items', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={[]}
        columns={columns}
        isLoading
        onRowClick={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    const columnHeaders = screen.getAllByRole('columnheader')
    expect(columnHeaders).toHaveLength(columns.length)

    const rows = screen.getAllByRole('row')
    // 1 header row + skeleton rows
    expect(rows.length).toBeGreaterThan(1)
  })

  it('shows no-items empty state when there are no items and no active filters', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={[]}
        columns={columns}
        ariaLabel="Wishlist items table"
      />,
    )

    expect(screen.getByTestId('gallery-table-empty-title')).toHaveTextContent(
      'Your wishlist is empty',
    )
  })

  it('shows no-results empty state when there are no items and active filters', () => {
    const handleClearFilters = vi.fn()

    render(
      <GalleryDataTable<WishlistItem>
        items={[]}
        columns={columns}
        ariaLabel="Wishlist items table"
        hasActiveFilters
        onClearFilters={handleClearFilters}
      />,
    )

    expect(screen.getByTestId('gallery-table-empty-title')).toHaveTextContent(
      'No results match your filters',
    )
  })
})

describe('GalleryDataTable infinite scroll', () => {
  let mockIntersectionObserver: ReturnType<typeof vi.fn>
  let observerCallback: IntersectionObserverCallback

  beforeEach(() => {
    mockIntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
      observerCallback = callback
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(),
        root: null,
        rootMargin: '0px',
        thresholds: [],
      } as unknown as IntersectionObserver
    })

    vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls onLoadMore when sentinel intersects', () => {
    const handleLoadMore = vi.fn()

    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        hasMore
        onLoadMore={handleLoadMore}
        ariaLabel="Wishlist items table"
      />,
    )

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(handleLoadMore).toHaveBeenCalledTimes(1)
  })

  it('renders loading spinner in footer when loading more items', () => {
    render(
      <GalleryDataTable<WishlistItem>
        items={mockItems}
        columns={columns}
        onRowClick={vi.fn()}
        hasMore
        isLoading
        onLoadMore={vi.fn()}
        ariaLabel="Wishlist items table"
      />,
    )

    const loadingRegion = screen.getByLabelText('Loading more items')
    expect(loadingRegion).toBeInTheDocument()
  })
})
