import React, { type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  cn,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@repo/app-component-library'
import type { ColumnFilter, FilterableColumn } from '../__types__/columnFilter'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { ColumnFilterInput } from './ColumnFilterInput'

export interface GalleryDataTableColumn<TItem extends Record<string, unknown>> {
  field: keyof TItem
  header: string
  // Optional custom cell renderer for this column
  render?: (item: TItem) => ReactNode
  /** Optional Tailwind classes for the cell */
  className?: string
  /** Optional column width (TanStack size, e.g. 400 for 40% of 1000) */
  size?: number
}

export interface GalleryDataTableProps<TItem extends Record<string, unknown>> {
  /** Raw items to render in the table */
  items: TItem[]
  /** Column definitions for this table */
  columns: GalleryDataTableColumn<TItem>[]
  /** Optional configuration for per-column filters */
  filterableColumns?: FilterableColumn<TItem>[]
  /** Optional loading flag (used for infinite scroll indicator) */
  isLoading?: boolean
  /** Optional callback fired when a row is activated via click or keyboard */
  onRowClick?: (item: TItem) => void
  /** Infinite scroll: whether more items are available */
  hasMore?: boolean
  /** Infinite scroll: callback to load the next page */
  onLoadMore?: () => void
  /** Optional ARIA label for the table (defaults to "Gallery items table") */
  ariaLabel?: string
  /** Additional CSS classes for the outer container */
  className?: string
  /** Optional callback to observe active column filters */
  onColumnFiltersChange?: (filters: ColumnFilter<TItem>[]) => void
}

export function GalleryDataTable<TItem extends Record<string, unknown>>({
  items,
  columns,
  filterableColumns = [],
  isLoading = false,
  onRowClick,
  hasMore = false,
  onLoadMore,
  ariaLabel,
  className,
  onColumnFiltersChange,
}: GalleryDataTableProps<TItem>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilter<TItem>[]>([])

  // Apply column filters before passing data to TanStack Table
  const filteredItems = useColumnFilters(items, columnFilters)

  const handleFilterChange = (field: keyof TItem, filter: ColumnFilter<TItem> | null) => {
    setColumnFilters(prev => {
      const next = filter
        ? (() => {
            const existingIndex = prev.findIndex(f => f.field === field)
            if (existingIndex >= 0) {
              const copy = [...prev]
              copy[existingIndex] = filter
              return copy
            }
            return [...prev, filter]
          })()
        : prev.filter(f => f.field !== field)

      onColumnFiltersChange?.(next)
      return next
    })
  }

  const getFilterableColumn = (field: keyof TItem) =>
    filterableColumns.find(fc => fc.field === field)

  // Map lightweight column config into TanStack Table column definitions
  const columnHelper = createColumnHelper<TItem>()

  const tanstackColumns = React.useMemo<ColumnDef<TItem, unknown>[]>(
    () =>
      columns.map(col =>
        columnHelper.accessor(col.field as string & keyof TItem, {
          header: () => {
            const filterable = getFilterableColumn(col.field)
            const currentFilter = columnFilters.find(f => f.field === col.field)

            return (
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="font-semibold text-sm">{col.header}</span>
                {filterable ? (
                  <ColumnFilterInput<TItem>
                    field={col.field}
                    label={col.header}
                    type={filterable.type}
                    currentFilter={currentFilter}
                    onChange={filter => handleFilterChange(col.field, filter)}
                    operators={filterable.operators ?? []}
                  />
                ) : null}
              </div>
            )
          },
          cell: info => {
            const item = info.row.original as TItem
            if (col.render) return col.render(item)
            const value = item[col.field]
            return (
              <div className={cn('px-4 py-3 align-middle', col.className)}>
                {value != null ? String(value) : ''}
              </div>
            )
          },
          size: col.size,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, filterableColumns, columnFilters],
  )

  const table = useReactTable<TItem>({
    data: filteredItems,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Infinite scroll sentinel (only when onLoadMore/hasMore provided)
  const { sentinelRef } = useInfiniteScroll({
    hasMore: Boolean(hasMore && onLoadMore),
    isLoading,
    onLoadMore: onLoadMore ?? (() => {}),
    threshold: 200,
    enabled: Boolean(hasMore && onLoadMore),
  })

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    item: TItem,
  ) => {
    if (!onRowClick) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(item)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const currentRow = event.currentTarget
      const nextRow =
        event.key === 'ArrowDown'
          ? (currentRow.nextElementSibling as HTMLTableRowElement | null)
          : (currentRow.previousElementSibling as HTMLTableRowElement | null)
      nextRow?.focus()
    }
  }

  const rowCount = filteredItems.length
  const colCount = columns.length

  return (
    <div className={cn('hidden md:block w-full', className)}>
      <Table
        role="table"
        caption={ariaLabel ?? 'Gallery items table'}
        aria-rowcount={rowCount}
        aria-colcount={colCount}
        className="min-w-full text-left text-sm"
      >
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} className="border-b border-border bg-muted/40">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rowCount === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colCount}
                className="px-4 py-6 text-center text-muted-foreground"
              >
                No results match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                tabIndex={0}
                className="hover:bg-accent/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors min-h-[44px]"
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={event => handleRowKeyDown(event, row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {hasMore && onLoadMore ? (
        <div
          ref={sentinelRef}
          className="h-10 flex items-center justify-center text-xs text-muted-foreground"
          aria-live="polite"
        >
          {isLoading ? 'Loading more items…' : null}
        </div>
      ) : null}
    </div>
  )
}
