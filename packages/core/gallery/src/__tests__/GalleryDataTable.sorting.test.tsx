import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  createRoute,
} from '@tanstack/react-router'
import { GalleryDataTable, type GalleryDataTableColumn } from '../components/GalleryDataTable'

// Mock data for testing
const mockItems = [
  { id: '1', title: 'Alpha Set', price: '50.00', store: 'LEGO Store', priority: 3 },
  { id: '2', title: 'Beta Set', price: '30.00', store: 'Amazon', priority: 5 },
  { id: '3', title: 'Charlie Set', price: '100.00', store: 'Target', priority: 1 },
  { id: '4', title: 'Delta Set', price: '75.00', store: 'LEGO Store', priority: 4 },
  { id: '5', title: 'Echo Set', price: '25.00', store: 'Walmart', priority: 2 },
]

const mockColumns: GalleryDataTableColumn<typeof mockItems[0]>[] = [
  {
    field: 'title',
    header: 'Title',
    enableSorting: true,
  },
  {
    field: 'price',
    header: 'Price',
    enableSorting: true,
  },
  {
    field: 'store',
    header: 'Store',
    enableSorting: true,
  },
  {
    field: 'priority',
    header: 'Priority',
    enableSorting: true,
  },
]

describe('GalleryDataTable - Single Column Sort', () => {
  const renderTable = (props = {}, initialPath = '/') => {
    // Create a test router with TanStack Router
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <GalleryDataTable
          items={mockItems}
          columns={mockColumns}
          enableSorting={true}
          persistSortInUrl={true}
          {...props}
        />
      ),
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: [initialPath] }),
    })

    return render(<RouterProvider router={router} />)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cycles through sort states on header click', async () => {
    const user = userEvent.setup()
    renderTable()

    // Get the title header button using aria-label since it's more specific
    const titleHeader = screen.getByRole('button', { name: /title, not sorted/i })

    // Initial state: no sorting
    expect(titleHeader).toHaveAttribute('aria-sort', 'none')

    // First click: ascending
    await user.click(titleHeader)
    
    // Wait for the button to update its aria attributes
    await waitFor(() => {
      const updatedHeader = screen.getByRole('button', { name: /title.*ascending/i })
      expect(updatedHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // Verify ascending order
    const rows = screen.getAllByRole('row')
    // Skip header row (index 0), data rows start at index 1
    expect(rows[1]).toHaveTextContent('Alpha Set')
    expect(rows[2]).toHaveTextContent('Beta Set')
    expect(rows[3]).toHaveTextContent('Charlie Set')

    // Second click: descending
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'descending')
    })

    // Verify descending order
    const rowsDesc = screen.getAllByRole('row')
    expect(rowsDesc[1]).toHaveTextContent('Echo Set')
    expect(rowsDesc[2]).toHaveTextContent('Delta Set')
    expect(rowsDesc[3]).toHaveTextContent('Charlie Set')

    // Third click: removed
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
    })
  })

  it('clears sort from previous column when sorting new column', async () => {
    const user = userEvent.setup()
    renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })
    const priceHeader = screen.getByRole('button', { name: /price/i })

    // Sort by title
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
      expect(priceHeader).toHaveAttribute('aria-sort', 'none')
    })

    // Sort by price - should clear title sort
    await user.click(priceHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
      expect(priceHeader).toHaveAttribute('aria-sort', 'ascending')
    })
  })

  it('syncs sort state to URL', async () => {
    const user = userEvent.setup()
    const { container } = renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort ascending
    await user.click(titleHeader)
    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.get('sort')).toBe('title:asc')
    })

    // Sort descending
    await user.click(titleHeader)
    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.get('sort')).toBe('title:desc')
    })

    // Remove sort
    await user.click(titleHeader)
    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.has('sort')).toBe(false)
    })
  })

  it('initializes from URL sort parameter', () => {
    renderTable({}, '/?sort=price:desc')

    const priceHeader = screen.getByRole('button', { name: /price/i })
    expect(priceHeader).toHaveAttribute('aria-sort', 'descending')

    // Verify descending price order
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('100.00') // Charlie Set
    expect(rows[2]).toHaveTextContent('75.00') // Delta Set
    expect(rows[3]).toHaveTextContent('50.00') // Alpha Set
  })

  it('supports keyboard navigation (Enter and Space)', async () => {
    const user = userEvent.setup()
    renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })
    titleHeader.focus()

    // Test Enter key
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // Test Space key
    await user.keyboard(' ')
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'descending')
    })

    // Test Enter again
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
    })
  })

  it('shows visual sort indicators', async () => {
    const user = userEvent.setup()
    renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // No arrow initially
    let arrow = titleHeader.querySelector('[aria-hidden="true"]')
    expect(arrow).toBeNull()

    // Arrow appears when sorted
    await user.click(titleHeader)
    await waitFor(() => {
      arrow = titleHeader.querySelector('[aria-hidden="true"]')
      expect(arrow).toBeInTheDocument()
      expect(arrow).toHaveClass('h-4', 'w-4')
    })
  })

  it('applies hover state to sortable headers', async () => {
    const user = userEvent.setup()
    renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Check for hover-related classes
    expect(titleHeader).toHaveClass('cursor-pointer')
    expect(titleHeader).toHaveClass('select-none')
  })

  it('respects enableSorting prop on columns', async () => {
    const user = userEvent.setup()
    
    const columnsWithDisabledSort: GalleryDataTableColumn<typeof mockItems[0]>[] = [
      {
        field: 'title',
        header: 'Title',
        enableSorting: true,
      },
      {
        field: 'price',
        header: 'Price',
        enableSorting: false, // Sorting disabled for this column
      },
    ]

    render(
      <MemoryRouter>
        <GalleryDataTable
          items={mockItems}
          columns={columnsWithDisabledSort}
          enableSorting={true}
        />
      </MemoryRouter>,
    )

    // Title header should be sortable
    const titleHeader = screen.getByRole('button', { name: /title/i })
    expect(titleHeader).toBeInTheDocument()
    expect(titleHeader).toHaveAttribute('aria-sort', 'none')

    // Price header should not be a button (not sortable)
    const priceHeaders = screen.queryAllByText(/price/i)
    const priceButton = screen.queryByRole('button', { name: /price/i })
    expect(priceHeaders.length).toBeGreaterThan(0) // Header text exists
    expect(priceButton).toBeNull() // But not as a button
  })

  it('respects global enableSorting=false prop', () => {
    render(
      <MemoryRouter>
        <GalleryDataTable
          items={mockItems}
          columns={mockColumns}
          enableSorting={false}
        />
      </MemoryRouter>,
    )

    // No sortable headers should exist
    const buttons = screen.queryAllByRole('button')
    const sortableHeaders = buttons.filter(btn => 
      btn.hasAttribute('aria-sort')
    )
    expect(sortableHeaders).toHaveLength(0)
  })

  it('works without URL persistence when persistSortInUrl=false', async () => {
    const user = userEvent.setup()
    
    render(
      <MemoryRouter>
        <GalleryDataTable
          items={mockItems}
          columns={mockColumns}
          enableSorting={true}
          persistSortInUrl={false}
        />
      </MemoryRouter>,
    )

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort by title
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // URL should not change
    const url = new URL(window.location.href)
    expect(url.searchParams.has('sort')).toBe(false)
  })

  it('sorts numeric values correctly', async () => {
    const user = userEvent.setup()
    renderTable()

    const priorityHeader = screen.getByRole('button', { name: /priority/i })

    // Sort by priority ascending
    await user.click(priorityHeader)
    await waitFor(() => {
      expect(priorityHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    const rows = screen.getAllByRole('row')
    // Should be sorted by priority: 1, 2, 3, 4, 5
    expect(rows[1]).toHaveTextContent('Charlie Set') // priority 1
    expect(rows[2]).toHaveTextContent('Echo Set') // priority 2
    expect(rows[3]).toHaveTextContent('Alpha Set') // priority 3
  })

  it('maintains sort during data updates', async () => {
    const user = userEvent.setup()
    const { rerender } = renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort by title ascending
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // Add a new item and re-render
    const newItems = [
      ...mockItems,
      { id: '6', title: 'Aardvark Set', price: '45.00', store: 'Target', priority: 3 },
    ]

    rerender(
      <MemoryRouter>
        <GalleryDataTable
          items={newItems}
          columns={mockColumns}
          enableSorting={true}
          persistSortInUrl={true}
        />
      </MemoryRouter>,
    )

    // New item should appear first due to alphabetical sorting
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Aardvark Set')
    expect(rows[2]).toHaveTextContent('Alpha Set')
  })
})