import React from 'react'
import { describe, it, expect, vi } from 'vitest'
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
  { id: '3', title: 'Charlie Set', price: '50.00', store: 'Target', priority: 1 },
  { id: '4', title: 'Delta Set', price: '75.00', store: 'LEGO Store', priority: 4 },
  { id: '5', title: 'Echo Set', price: '30.00', store: 'Walmart', priority: 2 },
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

describe('GalleryDataTable - Multi-Column Sort', () => {
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
          enableMultiSort={true}
          maxMultiSortColCount={2}
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

  it('sets primary sort on regular click', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })

    // Click to sort by price
    await user.click(priceHeader)

    await waitFor(() => {
      expect(priceHeader).toHaveAttribute('aria-sort', 'ascending')
      // Should show priority indicator "1"
      expect(priceHeader).toHaveTextContent('1')
      expect(priceHeader).toHaveAttribute('aria-label', expect.stringContaining('primary'))
    })
  })

  it('adds secondary sort on Shift+click', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Primary sort
    await user.click(priceHeader)

    // Secondary sort with Shift+click
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      expect(priceHeader).toHaveTextContent('1')
      expect(priceHeader).toHaveAttribute('aria-label', expect.stringContaining('primary'))
      expect(titleHeader).toHaveTextContent('2')
      expect(titleHeader).toHaveAttribute('aria-label', expect.stringContaining('secondary'))
    })

    // Verify sort order: items with same price should be sorted by title
    const rows = screen.getAllByRole('row')
    // Items with price 30.00: Beta Set and Echo Set
    // Should be sorted by title: Beta before Echo
    const rowTexts = rows.slice(1).map(row => row.textContent)
    const betaIndex = rowTexts.findIndex(text => text?.includes('Beta Set'))
    const echoIndex = rowTexts.findIndex(text => text?.includes('Echo Set'))
    expect(betaIndex).toBeLessThan(echoIndex)
  })

  it('enforces maximum 2 columns', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })
    const storeHeader = screen.getByRole('button', { name: /store/i })

    // Add primary sort
    await user.click(priceHeader)
    
    // Add secondary sort
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    
    // Try to add third sort (should replace secondary)
    await user.click(storeHeader)
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      expect(priceHeader).toHaveTextContent('1') // Still primary
      expect(storeHeader).toHaveTextContent('2') // New secondary
      expect(titleHeader).not.toHaveTextContent('2') // No longer sorted
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
    })
  })

  it('resets to single sort on regular click', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })
    const storeHeader = screen.getByRole('button', { name: /store/i })

    // Set up multi-sort
    await user.click(priceHeader)
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    // Regular click resets to single sort
    await user.click(storeHeader)

    await waitFor(() => {
      expect(storeHeader).toHaveTextContent('1')
      expect(storeHeader).toHaveAttribute('aria-sort', 'ascending')
      expect(priceHeader).not.toHaveTextContent('1')
      expect(priceHeader).toHaveAttribute('aria-sort', 'none')
      expect(titleHeader).not.toHaveTextContent('2')
      expect(titleHeader).toHaveAttribute('aria-sort', 'none')
    })
  })

  it('removes primary sort on Shift+click and promotes secondary', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Set up multi-sort
    await user.click(priceHeader)
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    // Shift+click on primary to cycle it (asc -> desc -> none)
    await user.keyboard('{Shift>}')
    await user.click(priceHeader) // Changes to descending
    await user.click(priceHeader) // Removes price sort
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      // Title should now be primary
      expect(titleHeader).toHaveTextContent('1')
      expect(titleHeader).toHaveAttribute('aria-label', expect.stringContaining('primary'))
      // Price should no longer be sorted
      expect(priceHeader).not.toHaveTextContent('1')
      expect(priceHeader).toHaveAttribute('aria-sort', 'none')
    })
  })

  it('persists multi-sort to URL', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Add primary sort
    await user.click(priceHeader)
    
    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.get('sort')).toBe('price:asc')
    })

    // Add secondary sort
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      const url = new URL(window.location.href)
      expect(url.searchParams.get('sort')).toBe('price:asc,title:asc')
    })
  })

  it('initializes from URL with multiple sorts', () => {
    renderTable({}, '/?sort=price:desc,title:asc')

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    expect(priceHeader).toHaveAttribute('aria-sort', 'descending')
    expect(priceHeader).toHaveTextContent('1')
    expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(titleHeader).toHaveTextContent('2')
  })

  it('supports keyboard multi-sort with Shift+Enter', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Primary sort with Enter
    priceHeader.focus()
    await user.keyboard('{Enter}')

    // Secondary sort with Shift+Enter
    titleHeader.focus()
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    await waitFor(() => {
      expect(priceHeader).toHaveTextContent('1')
      expect(titleHeader).toHaveTextContent('2')
    })
  })

  it('announces multi-sort state to screen readers', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Add primary sort
    await user.click(priceHeader)

    // Check for single sort announcement
    await waitFor(() => {
      const announcement = screen.getByRole('status', { hidden: true })
      expect(announcement).toHaveTextContent('Sorted by Price, ascending')
    })

    // Add secondary sort
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    // Check for multi-sort announcement
    await waitFor(() => {
      const announcement = screen.getByRole('status', { hidden: true })
      expect(announcement).toHaveTextContent('Sorted by Price ascending, then Title ascending')
    })
  })

  it('shows visual indicators for sort priority', async () => {
    const user = userEvent.setup()
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Set up multi-sort
    await user.click(priceHeader)
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      // Check for priority numbers
      const priceSup = priceHeader.querySelector('sup')
      const titleSup = titleHeader.querySelector('sup')
      
      expect(priceSup).toHaveTextContent('1')
      expect(titleSup).toHaveTextContent('2')
      
      // Check for highlighted background on sorted columns
      expect(priceHeader).toHaveClass('bg-accent/10')
      expect(titleHeader).toHaveClass('bg-accent/10')
    })
  })

  it('displays tooltip hint for multi-sort', () => {
    renderTable()

    const priceHeader = screen.getByRole('button', { name: /price/i })
    
    expect(priceHeader).toHaveAttribute('title', 'Click to sort, Shift+click to add secondary sort')
  })

  it('respects enableMultiSort=false', async () => {
    const user = userEvent.setup()
    
    renderTable({ enableMultiSort: false })

    const priceHeader = screen.getByRole('button', { name: /price/i })
    const titleHeader = screen.getByRole('button', { name: /title/i })

    // Primary sort
    await user.click(priceHeader)

    // Try to add secondary sort with Shift+click
    await user.keyboard('{Shift>}')
    await user.click(titleHeader)
    await user.keyboard('{/Shift}')

    await waitFor(() => {
      // Should replace primary sort instead of adding secondary
      expect(titleHeader).toHaveAttribute('aria-sort', 'ascending')
      expect(priceHeader).toHaveAttribute('aria-sort', 'none')
      // No priority numbers in single-sort mode
      expect(titleHeader.querySelector('sup')).toBeNull()
    })
  })
})