import React from 'react'
import { GalleryDataTable, type GalleryDataTableColumn } from '../components/GalleryDataTable'

/**
 * Example demonstrating column reordering functionality
 */
export function GalleryDataTableReorderingExample() {
  // Sample data
  const items = [
    {
      id: '1',
      name: 'LEGO Classic Bricks',
      pieces: 1500,
      price: 49.99,
      status: 'In Stock',
      category: 'Classic',
    },
    {
      id: '2',
      name: 'LEGO Technic Buggy',
      pieces: 374,
      price: 34.99,
      status: 'In Stock',
      category: 'Technic',
    },
    {
      id: '3',
      name: 'LEGO City Fire Station',
      pieces: 509,
      price: 79.99,
      status: 'Low Stock',
      category: 'City',
    },
    {
      id: '4',
      name: 'LEGO Creator Expert Car',
      pieces: 1458,
      price: 149.99,
      status: 'Out of Stock',
      category: 'Creator',
    },
    {
      id: '5',
      name: 'LEGO Star Wars X-Wing',
      pieces: 1949,
      price: 239.99,
      status: 'In Stock',
      category: 'Star Wars',
    },
  ]

  type Item = (typeof items)[0]

  // Column definitions
  const columns: GalleryDataTableColumn<Item>[] = [
    {
      field: 'name',
      header: 'Product Name',
      size: 300,
    },
    {
      field: 'category',
      header: 'Category',
      size: 150,
    },
    {
      field: 'pieces',
      header: 'Piece Count',
      size: 120,
      render: item => item.pieces.toLocaleString(),
    },
    {
      field: 'price',
      header: 'Price',
      size: 100,
      render: item => `$${item.price.toFixed(2)}`,
    },
    {
      field: 'status',
      header: 'Stock Status',
      size: 150,
      render: item => (
        <span
          className={`
            inline-flex items-center rounded-md px-2 py-1 text-xs font-medium
            ${item.status === 'In Stock' ? 'bg-green-50 text-green-700' : ''}
            ${item.status === 'Low Stock' ? 'bg-yellow-50 text-yellow-700' : ''}
            ${item.status === 'Out of Stock' ? 'bg-red-50 text-red-700' : ''}
          `}
        >
          {item.status}
        </span>
      ),
    },
  ]

  const [columnOrder, setColumnOrder] = React.useState<string[]>()

  const handleColumnOrderChange = (newOrder: string[]) => {
    // Column order changed - update state
    setColumnOrder(newOrder)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-2">Column Reordering Example</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Drag the grip handles (⋮⋮) next to column headers to reorder columns. The order is
          automatically saved to localStorage.
        </p>

        {columnOrder ? (
          <div className="mb-4 p-2 bg-muted rounded text-xs">
            Current order: {columnOrder.join(' → ')}
          </div>
        ) : null}

        <GalleryDataTable
          items={items}
          columns={columns}
          enableColumnReordering={true}
          persistColumnOrder={true}
          onColumnOrderChange={handleColumnOrderChange}
          ariaLabel="LEGO products table"
          enableSorting={true}
          enableMultiSort={true}
        />
      </div>

      <div className="rounded-lg border p-4 bg-muted/30">
        <h3 className="text-sm font-medium mb-2">Features Demonstrated:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
          <li>Drag and drop column headers to reorder</li>
          <li>Drag handles appear on hover (desktop) or always visible (touch)</li>
          <li>Column order persists in localStorage</li>
          <li>Works alongside sorting and filtering</li>
          <li>Keyboard navigation support (Space to grab, arrows to move)</li>
          <li>Accessible with screen reader announcements</li>
        </ul>
      </div>
    </div>
  )
}
