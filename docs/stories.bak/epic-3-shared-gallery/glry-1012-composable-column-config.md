# Story glry-1012: Composable Column Configuration

## Status

Draft

## Story

**As a** developer integrating datatable into a new gallery,
**I want** to pass custom column definitions instead of hardcoded wishlist columns,
**so that** I can reuse the datatable component for sets, MOCs, and inspiration galleries.

## Dependencies

- **glry-1006**: Datatable Foundation - Wishlist Only (REQUIRED - refactors this)
- **glry-1011**: Multi-Column Sort (OPTIONAL - ensures sorting works with custom columns)

## Acceptance Criteria

1. `GalleryDataTable` accepts generic `TItem` type parameter
2. `columns` prop accepts array of TanStack Table column definitions
3. Component no longer hardcodes wishlist-specific columns
4. Column definitions support custom cell renderers
5. Sorting, filtering, and infinite scroll work with any column configuration
6. Export `createGalleryColumns` helper function for common column patterns
7. TypeScript enforces type safety between `items` and `columns`
8. Documentation shows example for wishlist, sets, and MOCs galleries

## Tasks / Subtasks

### Task 1: Make GalleryDataTable Generic (AC: 1, 2, 3, 7)

- [ ] Update component signature to accept type parameter:
  ```typescript
  interface GalleryDataTableProps<TItem> {
    items: TItem[]
    columns: ColumnDef<TItem>[]
    isLoading?: boolean
    onRowClick?: (item: TItem) => void
    // ... other props
  }

  export function GalleryDataTable<TItem>({
    items,
    columns,
    ...
  }: GalleryDataTableProps<TItem>) { ... }
  ```
- [ ] Remove hardcoded `wishlistColumns` from component
- [ ] Update `useReactTable` to use passed columns
- [ ] Ensure TypeScript infers correct type from items/columns

### Task 2: Create Column Helper Utilities (AC: 4, 6)

- [ ] Export `createGalleryColumns` helper from @repo/gallery:
  ```typescript
  export function createGalleryColumns<TItem>() {
    return createColumnHelper<TItem>()
  }
  ```
- [ ] Create common cell renderer utilities:
  - `createTextColumn(accessor, header, size?)`
  - `createNumberColumn(accessor, header, format?)`
  - `createDateColumn(accessor, header, format?)`
  - `createImageColumn(accessor, header)`
  - `createBadgeColumn(accessor, header, colorMap?)`

### Task 3: Update Wishlist Gallery to Use Custom Columns (AC: 5, 8)

- [ ] Move column definitions to wishlist gallery component:
  ```typescript
  // apps/web/app-wishlist-gallery/src/columns/wishlist-columns.ts
  import { createGalleryColumns } from '@repo/gallery'
  import { WishlistItem } from '@repo/api-client/schemas/wishlist'

  const columnHelper = createGalleryColumns<WishlistItem>()

  export const wishlistColumns = [
    columnHelper.accessor('title', { ... }),
    columnHelper.accessor('price', { ... }),
    columnHelper.accessor('store', { ... }),
    columnHelper.accessor('priority', { ... }),
  ]
  ```
- [ ] Pass columns to GalleryDataTable as prop
- [ ] Verify sorting and filtering still work

### Task 4: Create Example Columns for Sets Gallery (AC: 8)

- [ ] Create `sets-columns.ts` example in Dev Notes:
  ```typescript
  const columnHelper = createGalleryColumns<SetItem>()

  export const setsColumns = [
    columnHelper.accessor('setNumber', { header: 'Set #', size: 150 }),
    columnHelper.accessor('name', { header: 'Name', size: 400 }),
    columnHelper.accessor('pieceCount', { header: 'Pieces', size: 150 }),
    columnHelper.accessor('buildStatus', { header: 'Status', size: 200 }),
  ]
  ```

### Task 5: Create Example Columns for MOCs Gallery (AC: 8)

- [ ] Create `mocs-columns.ts` example in Dev Notes:
  ```typescript
  const columnHelper = createGalleryColumns<MocItem>()

  export const mocsColumns = [
    columnHelper.accessor('title', { header: 'Title', size: 400 }),
    columnHelper.accessor('difficulty', { header: 'Difficulty', size: 150 }),
    columnHelper.accessor('status', { header: 'Status', size: 200 }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      size: 200,
      cell: (info) => formatDate(info.getValue()),
    }),
  ]
  ```

### Task 6: Update Tests (AC: 1-7)

- [ ] Test GalleryDataTable renders with custom columns
- [ ] Test TypeScript type inference (items type matches column accessors)
- [ ] Test column helper utilities create valid column defs
- [ ] Test sorting works with custom columns
- [ ] Test row clicks work with generic type
- [ ] Achieve 80% coverage

## Dev Notes

### Generic Component Pattern

```typescript
// packages/core/gallery/src/components/GalleryDataTable.tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { z } from 'zod'

const GalleryDataTablePropsSchema = <TItem extends Record<string, unknown>>() =>
  z.object({
    items: z.array(z.custom<TItem>()),
    columns: z.array(z.custom<ColumnDef<TItem>>()),
    isLoading: z.boolean().optional(),
    onRowClick: z.function().args(z.custom<TItem>()).returns(z.void()).optional(),
    className: z.string().optional(),
  })

type GalleryDataTableProps<TItem extends Record<string, unknown>> = z.infer<
  ReturnType<typeof GalleryDataTablePropsSchema<TItem>>
>

export function GalleryDataTable<TItem extends Record<string, unknown>>({
  items,
  columns,
  isLoading = false,
  onRowClick,
  className,
}: GalleryDataTableProps<TItem>) {
  const [sorting, setSorting] = useSortFromURL()

  const table = useReactTable({
    data: items,
    columns, // Use passed columns instead of hardcoded
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
    maxMultiSortColCount: 2,
  })

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <SortableHeader key={header.id} column={header.column}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </SortableHeader>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className="border-b hover:bg-muted/50 cursor-pointer"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Column Helper Utilities

```typescript
// packages/core/gallery/src/utils/column-helpers.ts
import { createColumnHelper, ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'

export function createGalleryColumns<TItem>() {
  return createColumnHelper<TItem>()
}

export function createTextColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  size = 300
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor, {
    header,
    size,
    cell: (info) => info.getValue() || '-',
  })
}

export function createNumberColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  formatter?: (value: number) => string
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor, {
    header,
    size: 150,
    cell: (info) => {
      const value = info.getValue() as number | null
      if (value == null) return '-'
      return formatter ? formatter(value) : value.toString()
    },
  })
}

export function createDateColumn<TItem>(
  accessor: keyof TItem & string,
  header: string,
  dateFormat = 'MMM d, yyyy'
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor, {
    header,
    size: 200,
    cell: (info) => {
      const value = info.getValue() as string | Date | null
      if (!value) return '-'
      const date = typeof value === 'string' ? new Date(value) : value
      return format(date, dateFormat)
    },
  })
}

export function createPriceColumn<TItem>(
  accessor: keyof TItem & string,
  currencyAccessor?: keyof TItem & string
): ColumnDef<TItem> {
  const helper = createColumnHelper<TItem>()
  return helper.accessor(accessor, {
    header: 'Price',
    size: 150,
    cell: (info) => {
      const price = info.getValue() as number | null
      if (price == null) return '-'

      const currency = currencyAccessor
        ? (info.row.original[currencyAccessor] as string)
        : 'USD'

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(price)
    },
  })
}
```

### Wishlist Columns Example

```typescript
// apps/web/app-wishlist-gallery/src/columns/wishlist-columns.tsx
import { createGalleryColumns } from '@repo/gallery'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { PriorityBadge } from '../components/PriorityBadge'

const columnHelper = createGalleryColumns<WishlistItem>()

export const wishlistColumns = [
  columnHelper.accessor('title', {
    header: 'Title',
    size: 400,
    cell: (info) => (
      <div className="font-medium text-sm">{info.getValue()}</div>
    ),
  }),

  columnHelper.accessor('price', {
    header: 'Price',
    size: 150,
    cell: (info) => {
      const price = info.getValue()
      const currency = info.row.original.currency || 'USD'
      if (!price) return <span className="text-muted-foreground">-</span>

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(price)
    },
  }),

  columnHelper.accessor('store', {
    header: 'Store',
    size: 200,
    cell: (info) => {
      const store = info.getValue()
      return store ? (
        <span className="text-sm">{store}</span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
  }),

  columnHelper.accessor('priority', {
    header: 'Priority',
    size: 150,
    cell: (info) => <PriorityBadge priority={info.getValue()} />,
  }),
]
```

### Sets Columns Example

```typescript
// apps/web/app-sets-gallery/src/columns/sets-columns.tsx
import { createGalleryColumns } from '@repo/gallery'
import { SetItem } from '@repo/api-client/schemas/sets'
import { Badge } from '@repo/ui'

const columnHelper = createGalleryColumns<SetItem>()

export const setsColumns = [
  columnHelper.accessor('setNumber', {
    header: 'Set #',
    size: 150,
    cell: (info) => (
      <span className="font-mono text-sm">{info.getValue()}</span>
    ),
  }),

  columnHelper.accessor('name', {
    header: 'Name',
    size: 400,
    cell: (info) => (
      <div className="font-medium text-sm">{info.getValue()}</div>
    ),
  }),

  columnHelper.accessor('pieceCount', {
    header: 'Pieces',
    size: 150,
    cell: (info) => {
      const count = info.getValue()
      return count ? (
        <span className="text-sm">{count.toLocaleString()}</span>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )
    },
  }),

  columnHelper.accessor('buildStatus', {
    header: 'Status',
    size: 200,
    cell: (info) => {
      const status = info.getValue()
      const variants = {
        complete: 'default',
        'in-progress': 'secondary',
        planned: 'outline',
      }
      return (
        <Badge variant={variants[status] || 'outline'}>
          {status?.replace('-', ' ')}
        </Badge>
      )
    },
  }),
]
```

### MOCs Columns Example

```typescript
// apps/web/app-instructions-gallery/src/columns/mocs-columns.tsx
import { createGalleryColumns, createDateColumn } from '@repo/gallery'
import { MocItem } from '@repo/api-client/schemas/mocs'
import { Badge } from '@repo/ui'

const columnHelper = createGalleryColumns<MocItem>()

export const mocsColumns = [
  columnHelper.accessor('title', {
    header: 'Title',
    size: 400,
    cell: (info) => (
      <div className="font-medium text-sm">{info.getValue()}</div>
    ),
  }),

  columnHelper.accessor('difficulty', {
    header: 'Difficulty',
    size: 150,
    cell: (info) => {
      const difficulty = info.getValue()
      const colors = {
        beginner: 'bg-green-100 text-green-800',
        intermediate: 'bg-yellow-100 text-yellow-800',
        advanced: 'bg-red-100 text-red-800',
      }
      return (
        <Badge className={colors[difficulty] || ''}>
          {difficulty}
        </Badge>
      )
    },
  }),

  columnHelper.accessor('status', {
    header: 'Status',
    size: 200,
    cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
  }),

  createDateColumn<MocItem>('createdAt', 'Created', 'MMM d, yyyy'),
]
```

### Type Safety Example

```typescript
// TypeScript enforces matching types
type WishlistItem = {
  id: string
  title: string
  price: number | null
  store: string | null
  priority: number
}

const columns: ColumnDef<WishlistItem>[] = [
  columnHelper.accessor('title', { ... }), // ✅ Valid
  columnHelper.accessor('price', { ... }), // ✅ Valid
  columnHelper.accessor('foo', { ... }),   // ❌ TypeScript error: 'foo' not in WishlistItem
]

const items: WishlistItem[] = [...]

<GalleryDataTable
  items={items}       // ✅ Matches column type
  columns={columns}
/>
```

## Testing

```typescript
describe('GalleryDataTable - Composable Columns', () => {
  it('renders with custom column configuration', () => {
    const customColumns = [
      columnHelper.accessor('name', { header: 'Name', size: 300 }),
      columnHelper.accessor('value', { header: 'Value', size: 200 }),
    ]

    const items = [
      { name: 'Item 1', value: 100 },
      { name: 'Item 2', value: 200 },
    ]

    render(<GalleryDataTable items={items} columns={customColumns} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })

  it('enforces type safety between items and columns', () => {
    type TestItem = { id: string; name: string }

    const columns: ColumnDef<TestItem>[] = [
      columnHelper.accessor('id', { header: 'ID' }),
      columnHelper.accessor('name', { header: 'Name' }),
    ]

    const items: TestItem[] = [{ id: '1', name: 'Test' }]

    render(<GalleryDataTable items={items} columns={columns} />)

    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('supports custom cell renderers', () => {
    const columns = [
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <Badge>{info.getValue()}</Badge>,
      }),
    ]

    const items = [{ status: 'active' }]

    render(<GalleryDataTable items={items} columns={columns} />)

    expect(screen.getByRole('status')).toHaveTextContent('active')
  })

  it('column helpers create valid column definitions', () => {
    const textCol = createTextColumn<{ name: string }>('name', 'Name', 400)
    const numberCol = createNumberColumn<{ price: number }>('price', 'Price')
    const dateCol = createDateColumn<{ date: Date }>('date', 'Date')

    expect(textCol.header).toBe('Name')
    expect(numberCol.size).toBe(150)
    expect(dateCol).toHaveProperty('cell')
  })
})
```

## Definition of Done

- [ ] All tasks completed
- [ ] `GalleryDataTable` is generic with `TItem` type parameter
- [ ] Hardcoded wishlist columns removed
- [ ] `columns` prop accepts TanStack Table column definitions
- [ ] `createGalleryColumns` and helper utilities exported
- [ ] TypeScript enforces type safety between items and columns
- [ ] Wishlist gallery updated to use custom columns
- [ ] Example columns documented for sets and MOCs
- [ ] All tests passing (80% coverage)
- [ ] TypeScript compilation succeeds

---

## Change Log

| Date       | Version | Description | Author |
| ---------- | ------- | ----------- | ------ |
| 2025-12-28 | 0.1     | Initial draft | Bob (SM) |
