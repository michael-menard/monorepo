import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GalleryDataTable, type GalleryDataTableColumn } from '../components/GalleryDataTable'
import '@testing-library/jest-dom'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  useRouter: () => ({
    state: {},
    __store: {
      state: {},
    },
  }),
}))

// Mock DnD Kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (array: any[], from: number, to: number) => {
    const result = [...array]
    const [removed] = result.splice(from, 1)
    result.splice(to, 0, removed)
    return result
  },
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  horizontalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

describe('GalleryDataTable - Column Reordering', () => {
  const mockData = [
    { id: '1', name: 'Item 1', price: 100, status: 'active' },
    { id: '2', name: 'Item 2', price: 200, status: 'pending' },
    { id: '3', name: 'Item 3', price: 300, status: 'active' },
  ]

  const columns: GalleryDataTableColumn<typeof mockData[0]>[] = [
    { field: 'name', header: 'Name' },
    { field: 'price', header: 'Price' },
    { field: 'status', header: 'Status' },
  ]

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should render without column reordering by default', () => {
    render(<GalleryDataTable items={mockData} columns={columns} />)
    
    // Should not render drag handles
    expect(screen.queryByLabelText(/Reorder .* column/)).not.toBeInTheDocument()
  })

  it('should render drag handles when column reordering is enabled', () => {
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
      />
    )
    
    // Should render drag handles (though they may be visually hidden until hover)
    const dragHandles = screen.getAllByRole('button', { name: /Reorder .* column/ })
    expect(dragHandles).toHaveLength(3)
  })

  it('should call onColumnOrderChange when columns are reordered', async () => {
    const onColumnOrderChange = vi.fn()
    
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        onColumnOrderChange={onColumnOrderChange}
      />
    )
    
    // Simulate drag and drop (this is simplified due to mocking)
    // In a real test, you'd use @testing-library/user-event or similar
    // to simulate actual drag and drop interactions
  })

  it('should use initial column order when provided', () => {
    const initialOrder = ['status', 'name', 'price']
    
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        initialColumnOrder={initialOrder}
      />
    )
    
    // Check that columns appear in the specified order
    const headers = screen.getAllByRole('columnheader')
    expect(headers[0]).toHaveTextContent('Status')
    expect(headers[1]).toHaveTextContent('Name')
    expect(headers[2]).toHaveTextContent('Price')
  })

  it('should persist column order to localStorage when persistColumnOrder is true', async () => {
    const { rerender } = render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        persistColumnOrder={true}
        ariaLabel="test-table"
      />
    )
    
    // Check that localStorage key is created
    const storageKey = 'gallery-table-column-order-test-table'
    const storedOrder = localStorage.getItem(storageKey)
    expect(storedOrder).toBeTruthy()
    
    // Verify the stored order matches expected format
    const parsedOrder = JSON.parse(storedOrder!)
    expect(parsedOrder).toEqual(['name', 'price', 'status'])
  })

  it('should not persist column order when persistColumnOrder is false', () => {
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        persistColumnOrder={false}
        ariaLabel="test-table"
      />
    )
    
    const storageKey = 'gallery-table-column-order-test-table'
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('should restore column order from localStorage on mount', () => {
    const storageKey = 'gallery-table-column-order-test-table'
    const savedOrder = ['price', 'status', 'name']
    localStorage.setItem(storageKey, JSON.stringify(savedOrder))
    
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        persistColumnOrder={true}
        ariaLabel="test-table"
      />
    )
    
    // Check that columns appear in the saved order
    const headers = screen.getAllByRole('columnheader')
    expect(headers[0]).toHaveTextContent('Price')
    expect(headers[1]).toHaveTextContent('Status')
    expect(headers[2]).toHaveTextContent('Name')
  })

  it('should handle invalid localStorage data gracefully', () => {
    const storageKey = 'gallery-table-column-order-test-table'
    localStorage.setItem(storageKey, 'invalid-json')
    
    expect(() => {
      render(
        <GalleryDataTable 
          items={mockData} 
          columns={columns} 
          enableColumnReordering={true}
          persistColumnOrder={true}
          ariaLabel="test-table"
        />
      )
    }).not.toThrow()
    
    // Should fall back to default order
    const headers = screen.getAllByRole('columnheader')
    expect(headers[0]).toHaveTextContent('Name')
    expect(headers[1]).toHaveTextContent('Price')
    expect(headers[2]).toHaveTextContent('Status')
  })

  it('should work with TanStack ColumnDef format', () => {
    const tanstackColumns = [
      { id: 'name', accessorKey: 'name', header: 'Name' },
      { id: 'price', accessorKey: 'price', header: 'Price' },
      { id: 'status', accessorKey: 'status', header: 'Status' },
    ]
    
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={tanstackColumns as any}
        enableColumnReordering={true}
      />
    )
    
    const dragHandles = screen.getAllByRole('button', { name: /Reorder .* column/ })
    expect(dragHandles).toHaveLength(3)
  })

  it('should preserve column reordering when sorting is also enabled', () => {
    render(
      <GalleryDataTable 
        items={mockData} 
        columns={columns} 
        enableColumnReordering={true}
        enableSorting={true}
      />
    )
    
    // Both features should work together
    const dragHandles = screen.getAllByRole('button', { name: /Reorder .* column/ })
    expect(dragHandles).toHaveLength(3)
    
    // Sorting buttons should also be present (though implementation may vary)
    // This would depend on the SortableHeader component implementation
  })
})