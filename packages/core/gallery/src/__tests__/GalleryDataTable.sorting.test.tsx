import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { GalleryDataTable, type GalleryDataTableColumn } from '../components/GalleryDataTable'

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(() => ({})),
  useNavigate: vi.fn(() => vi.fn()),
}))

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
  const renderTable = (props: Partial<Parameters<typeof GalleryDataTable>[0]> = {}) => {
    return render(
      <GalleryDataTable
        items={mockItems}
        columns={(props.columns as any) ?? mockColumns}
        enableSorting={true}
        persistSortInUrl={false}
        {...props}
      />,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSearch).mockReturnValue({} as any)
    vi.mocked(useNavigate).mockReturnValue(vi.fn())
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
    const mockNavigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)

    renderTable({ persistSortInUrl: true })

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort ascending — navigate should be called with sort=title:asc
    await user.click(titleHeader)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })

    const ascCall = mockNavigate.mock.calls[0][0]
    expect(ascCall.replace).toBe(true)
    expect(ascCall.search({})).toMatchObject({ sort: 'title:asc' })

    // Sort descending — navigate called with sort=title:desc
    mockNavigate.mockClear()
    vi.mocked(useSearch).mockReturnValue({ sort: 'title:asc' } as any)
    await user.click(titleHeader)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
    expect(mockNavigate.mock.calls[0][0].search({ sort: 'title:asc' })).toMatchObject({
      sort: 'title:desc',
    })

    // Remove sort — navigate called with no sort param
    mockNavigate.mockClear()
    vi.mocked(useSearch).mockReturnValue({ sort: 'title:desc' } as any)
    await user.click(titleHeader)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
    const noSortResult = mockNavigate.mock.calls[0][0].search({ sort: 'title:desc' })
    expect(noSortResult.sort).toBeUndefined()
  })

  it('initializes from URL sort parameter', async () => {
    vi.mocked(useSearch).mockReturnValue({ sort: 'price:desc' } as any)

    renderTable({ persistSortInUrl: true })

    const priceHeader = screen.getByRole('button', { name: /price/i })
    expect(priceHeader).toHaveAttribute('aria-sort', 'descending')

    // TanStack Table uses alphanumeric sort for strings.
    // For price strings: '75.00' sorts higher than '50.00' (first numeric chunk 75 > 50)
    // Descending: 100.00 (Charlie), 75.00 (Delta), 50.00 (Alpha)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('100.00') // Charlie Set (highest numeric value)
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
    renderTable()

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Check for hover-related classes
    expect(titleHeader).toHaveClass('cursor-pointer')
    expect(titleHeader).toHaveClass('select-none')
  })

  it('respects enableSorting prop on columns', async () => {
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

    renderTable({ columns: columnsWithDisabledSort, enableSorting: true })

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

  it('respects global enableSorting=false prop', async () => {
    renderTable({ enableSorting: false })

    // No sortable headers should exist
    const buttons = screen.queryAllByRole('button')
    const sortableHeaders = buttons.filter(btn => btn.hasAttribute('aria-sort'))
    expect(sortableHeaders).toHaveLength(0)
  })

  it('works without URL persistence when persistSortInUrl=false', async () => {
    const user = userEvent.setup()

    renderTable({ enableSorting: true, persistSortInUrl: false })

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort by title
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // navigate should NOT have been called (internal state only)
    const mockNavigate = vi.mocked(useNavigate)()
    expect(mockNavigate).not.toHaveBeenCalled()
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

    let externalSetItems: React.Dispatch<React.SetStateAction<typeof mockItems>>

    function ItemTable() {
      const [items, setItems] = React.useState([...mockItems])
      externalSetItems = setItems
      return (
        <GalleryDataTable
          items={items}
          columns={mockColumns}
          enableSorting={true}
          persistSortInUrl={false}
        />
      )
    }

    render(<ItemTable />)

    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Sort by title ascending
    await user.click(titleHeader)
    await waitFor(() => {
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    // Add a new item via state update
    const newItem = { id: '6', title: 'Aardvark Set', price: '45.00', store: 'Target', priority: 3 }
    act(() => {
      externalSetItems!(prev => [...prev, newItem])
    })

    // New item should appear first due to alphabetical sorting
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Aardvark Set')
      expect(rows[2]).toHaveTextContent('Alpha Set')
    })
  })
})
