import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
  createRoute,
} from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { GalleryDataTable } from '../components/GalleryDataTable'
import {
  createGalleryColumns,
  createTextColumn,
  createNumberColumn,
  createDateColumn,
  createPriceColumn,
  createBadgeColumn,
  createImageColumn,
} from '../utils/column-helpers'

// Test data types
type TestItem = {
  id: string
  name: string
  price: number
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  imageUrl?: string
}

type CustomItem = {
  title: string
  value: number | null
  category: string
  priority: number
}

// Mock data
const testItems: TestItem[] = [
  {
    id: '1',
    name: 'Item One',
    price: 99.99,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    imageUrl: 'https://example.com/image1.jpg',
  },
  {
    id: '2',
    name: 'Item Two',
    price: 149.50,
    status: 'inactive',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    name: 'Item Three',
    price: 75.00,
    status: 'pending',
    createdAt: '2024-01-03T00:00:00Z',
    imageUrl: 'https://example.com/image3.jpg',
  },
]

const customItems: CustomItem[] = [
  { title: 'Alpha', value: 100, category: 'A', priority: 1 },
  { title: 'Beta', value: null, category: 'B', priority: 2 },
  { title: 'Gamma', value: 300, category: 'A', priority: 3 },
]

describe('GalleryDataTable - Composable Columns', () => {
  const renderTable = <T extends Record<string, unknown>>(
    items: T[],
    columns: ColumnDef<T>[],
    props = {}
  ) => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <GalleryDataTable
          items={items}
          columns={columns}
          {...props}
        />
      ),
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })

    return render(<RouterProvider router={router} />)
  }

  describe('TanStack ColumnDef Support', () => {
    it('renders with TanStack column definitions', () => {
      const columnHelper = createGalleryColumns<TestItem>()
      
      const columns = [
        columnHelper.accessor('name', {
          header: 'Name',
          size: 300,
        }),
        columnHelper.accessor('price', {
          header: 'Price',
          size: 150,
          cell: (info) => `$${info.getValue().toFixed(2)}`,
        }),
        columnHelper.accessor('status', {
          header: 'Status',
          size: 150,
        }),
      ]

      renderTable(testItems, columns)

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()

      // Check data rendering
      expect(screen.getByText('Item One')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
    })

    it('supports custom cell renderers', () => {
      const columnHelper = createGalleryColumns<TestItem>()
      
      const columns = [
        columnHelper.accessor('status', {
          header: 'Status',
          cell: (info) => (
            <span data-testid={`status-${info.row.original.id}`} className="badge">
              {info.getValue()}
            </span>
          ),
        }),
      ]

      renderTable(testItems, columns)

      const statusBadge = screen.getByTestId('status-1')
      expect(statusBadge).toHaveClass('badge')
      expect(statusBadge).toHaveTextContent('active')
    })

    it('maintains type safety between items and columns', () => {
      const columnHelper = createGalleryColumns<CustomItem>()
      
      const columns: ColumnDef<CustomItem>[] = [
        columnHelper.accessor('title', { header: 'Title' }),
        columnHelper.accessor('value', { 
          header: 'Value',
          cell: (info) => info.getValue() ?? '-',
        }),
        columnHelper.accessor('category', { header: 'Category' }),
        columnHelper.accessor('priority', { header: 'Priority' }),
      ]

      renderTable(customItems, columns)

      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument() // null value
    })
  })

  describe('Column Helper Utilities', () => {
    it('createTextColumn creates proper column definition', () => {
      const column = createTextColumn<TestItem>('name', 'Product Name', 400)
      
      expect(column).toHaveProperty('header', 'Product Name')
      expect(column).toHaveProperty('size', 400)
      expect(column).toHaveProperty('cell')
      
      // Test cell renderer with null
      const cellRenderer = column.cell as any
      const mockInfo = { getValue: () => null }
      expect(cellRenderer(mockInfo)).toBe('-')
      
      // Test cell renderer with value
      const mockInfoWithValue = { getValue: () => 'Test Product' }
      expect(cellRenderer(mockInfoWithValue)).toBe('Test Product')
    })

    it('createNumberColumn formats numbers correctly', () => {
      const column = createNumberColumn<TestItem>(
        'price',
        'Price',
        (value) => `USD ${value.toFixed(2)}`
      )
      
      const cellRenderer = column.cell as any
      
      // Test with formatter
      const mockInfo = { getValue: () => 123.456 }
      expect(cellRenderer(mockInfo)).toBe('USD 123.46')
      
      // Test without formatter (default locale string)
      const columnNoFormat = createNumberColumn<TestItem>('price', 'Price')
      const cellRendererNoFormat = columnNoFormat.cell as any
      expect(cellRendererNoFormat(mockInfo)).toBe('123.456')
      
      // Test with null
      const mockInfoNull = { getValue: () => null }
      expect(cellRenderer(mockInfoNull)).toBe('-')
    })

    it('createDateColumn formats dates correctly', () => {
      const column = createDateColumn<TestItem>('createdAt', 'Created', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      
      const cellRenderer = column.cell as any
      
      // Test with ISO string
      const mockInfo = { getValue: () => '2024-01-15T10:30:00Z' }
      expect(cellRenderer(mockInfo)).toMatch(/01.15.(20)?24/) // Matches MM/DD/YYYY or MM/DD/YY
      
      // Test with Date object
      const mockInfoDate = { getValue: () => new Date('2024-01-15T10:30:00Z') }
      expect(cellRenderer(mockInfoDate)).toMatch(/01.15.(20)?24/)
      
      // Test with null
      const mockInfoNull = { getValue: () => null }
      expect(cellRenderer(mockInfoNull)).toBe('-')
    })

    it('createPriceColumn formats currency correctly', () => {
      const column = createPriceColumn<TestItem>('price', 'Price')
      
      const cellRenderer = column.cell as any
      
      // Test USD formatting
      const mockInfo = {
        getValue: () => 99.99,
        row: { original: {} },
      }
      expect(cellRenderer(mockInfo)).toBe('$99.99')
      
      // Test with currency accessor
      const columnWithCurrency = createPriceColumn<any>('price', 'Price', 'currency')
      const cellRendererCurrency = columnWithCurrency.cell as any
      
      const mockInfoEUR = {
        getValue: () => 99.99,
        row: { original: { currency: 'EUR' } },
      }
      expect(cellRendererCurrency(mockInfoEUR)).toContain('99')
      
      // Test with null
      const mockInfoNull = {
        getValue: () => null,
        row: { original: {} },
      }
      expect(cellRenderer(mockInfoNull)).toBe('-')
    })

    it('createBadgeColumn creates badge with styling', () => {
      const column = createBadgeColumn<TestItem>('status', 'Status', {
        colorMap: {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800',
        },
        formatter: (value) => value.toUpperCase(),
      })
      
      const cellRenderer = column.cell as any
      
      // Test with color mapping and formatter
      const mockInfo = { getValue: () => 'active' }
      const badge = cellRenderer(mockInfo)
      
      expect(badge.props.className).toContain('bg-green-100 text-green-800')
      expect(badge.props.children).toBe('ACTIVE')
      
      // Test without formatter (default formatting)
      const columnNoFormat = createBadgeColumn<TestItem>('status', 'Status')
      const cellRendererNoFormat = columnNoFormat.cell as any
      const mockInfoPending = { getValue: () => 'pending-review' }
      const badgeNoFormat = cellRendererNoFormat(mockInfoPending)
      expect(badgeNoFormat.props.children).toBe('pending review') // Replaces - with space
    })

    it('createImageColumn handles images and fallbacks', () => {
      const column = createImageColumn<TestItem>('imageUrl', 'Image', {
        altAccessor: 'name',
        fallback: 'N/A',
      })
      
      const cellRenderer = column.cell as any
      
      // Test with image URL
      const mockInfo = {
        getValue: () => 'https://example.com/image.jpg',
        row: { original: { name: 'Test Item' } },
      }
      const img = cellRenderer(mockInfo)
      
      expect(img.props.src).toBe('https://example.com/image.jpg')
      expect(img.props.alt).toBe('Test Item')
      expect(img.props.className).toContain('h-10 w-10 rounded object-cover')
      
      // Test with null and fallback
      const mockInfoNull = {
        getValue: () => null,
        row: { original: { name: 'Test Item' } },
      }
      const fallback = cellRenderer(mockInfoNull)
      
      expect(fallback.props.className).toContain('h-10 w-10 rounded bg-muted')
      expect(fallback.props.children).toBe('N/A')
    })
  })

  describe('Integration with Features', () => {
    it('sorting works with custom columns', async () => {
      const user = userEvent.setup()
      const columnHelper = createGalleryColumns<TestItem>()
      
      const columns = [
        columnHelper.accessor('name', {
          header: 'Name',
          enableSorting: true,
        }),
        columnHelper.accessor('price', {
          header: 'Price',
          enableSorting: true,
        }),
      ]

      renderTable(testItems, columns, { enableSorting: true })

      const nameHeader = screen.getByRole('button', { name: /name/i })
      
      // Click to sort
      await user.click(nameHeader)
      
      // Verify rows are sorted alphabetically
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Item One')
      expect(rows[2]).toHaveTextContent('Item Three')
      expect(rows[3]).toHaveTextContent('Item Two')
    })

    it('row click handler works with custom item type', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      const columnHelper = createGalleryColumns<CustomItem>()
      
      const columns = [
        columnHelper.accessor('title', { header: 'Title' }),
        columnHelper.accessor('value', { header: 'Value' }),
      ]

      renderTable(customItems, columns, { onRowClick })

      const rows = screen.getAllByRole('row')
      await user.click(rows[1]) // Click first data row

      expect(onRowClick).toHaveBeenCalledWith(customItems[0])
    })
  })

  describe('Legacy Column Support', () => {
    it('still supports legacy GalleryDataTableColumn format', () => {
      const legacyColumns = [
        {
          field: 'name' as keyof TestItem,
          header: 'Name',
          size: 300,
        },
        {
          field: 'price' as keyof TestItem,
          header: 'Price',
          size: 150,
          render: (item: TestItem) => <span>${item.price}</span>,
        },
        {
          field: 'status' as keyof TestItem,
          header: 'Status',
          className: 'text-center',
        },
      ]

      renderTable(testItems, legacyColumns as any)

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()

      // Check custom render
      expect(screen.getByText('$99.99')).toBeInTheDocument()
    })
  })

  describe('Mixed Column Types', () => {
    it('renders table with various column helper types', () => {
      const columns = [
        createTextColumn<TestItem>('name', 'Name'),
        createNumberColumn<TestItem>('price', 'Price', (v) => `$${v.toFixed(2)}`),
        createBadgeColumn<TestItem>('status', 'Status', {
          colorMap: {
            active: 'text-green-600',
            inactive: 'text-gray-600',
            pending: 'text-yellow-600',
          },
        }),
        createDateColumn<TestItem>('createdAt', 'Created'),
        createImageColumn<TestItem>('imageUrl', 'Image', {
          altAccessor: 'name',
          fallback: '📷',
        }),
      ]

      renderTable(testItems, columns)

      // Verify all column types render
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('Image')).toBeInTheDocument()

      // Verify data
      expect(screen.getByText('Item One')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })
})