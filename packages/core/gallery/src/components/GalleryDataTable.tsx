import React, { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnOrderState,
  type OnChangeFn,
} from '@tanstack/react-table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Loader2 } from 'lucide-react'
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
import { useColumnOrder } from '../hooks/useColumnOrder'
import { useSortFromURL } from '../hooks/useSortFromURL'
import { ColumnFilterInput } from './ColumnFilterInput'
import { GalleryDataTableSkeleton } from './GalleryDataTableSkeleton'
import { GalleryTableEmpty } from './GalleryTableEmpty'
import { GalleryTableError } from './GalleryTableError'
import { SortableHeader } from './SortableHeader'
import { DraggableTableHeader } from './DraggableTableHeader'

export interface GalleryDataTableColumn<TItem extends Record<string, unknown>> {
  field: keyof TItem
  header: string
  // Optional custom cell renderer for this column
  render?: (item: TItem) => ReactNode
  /** Optional Tailwind classes for the cell */
  className?: string
  /** Optional column width (TanStack size, e.g. 400 for 40% of 1000) */
  size?: number
  /** Whether this column can be sorted (defaults to true) */
  enableSorting?: boolean
}

export interface GalleryDataTableProps<TItem extends Record<string, unknown>> {
  /** Raw items to render in the table */
  items: TItem[]
  /** Column definitions for this table - can be TanStack ColumnDef or legacy GalleryDataTableColumn */
  columns: ColumnDef<TItem>[] | GalleryDataTableColumn<TItem>[]
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
  /** Whether any filters (search, column, etc.) are currently active */
  hasActiveFilters?: boolean
  /** Called when the user clicks "Clear Filters" in the empty state */
  onClearFilters?: () => void
  /** Called when the user clicks "Add Item" in the empty state */
  onAddItem?: () => void
  /** Optional error to show an error state instead of table rows */
  error?: Error | null
  /** Called when the user clicks retry on the error state */
  onRetry?: () => void
  /** Whether a retry is currently in progress */
  isRetrying?: boolean
  /** Whether to enable sorting for the table (defaults to true) */
  enableSorting?: boolean
  /** Whether to persist sort state in URL (defaults to true when enableSorting is true) */
  persistSortInUrl?: boolean
  /** Whether to enable multi-column sorting (defaults to false) */
  enableMultiSort?: boolean
  /** Maximum number of columns that can be sorted simultaneously (defaults to 2) */
  maxMultiSortColCount?: number
  /** Enable column reordering via drag and drop */
  enableColumnReordering?: boolean
  /** Callback when column order changes */
  onColumnOrderChange?: (columnOrder: string[]) => void
  /** Initial column order (column IDs) */
  initialColumnOrder?: string[]
  /** Persist column order in localStorage */
  persistColumnOrder?: boolean
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
  hasActiveFilters = false,
  onClearFilters,
  onAddItem,
  error,
  onRetry,
  isRetrying = false,
  enableSorting = true,
  persistSortInUrl = true,
  enableMultiSort = false,
  maxMultiSortColCount = 2,
  enableColumnReordering = false,
  onColumnOrderChange,
  initialColumnOrder,
  persistColumnOrder = true,
}: GalleryDataTableProps<TItem>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilter<TItem>[]>([])
  const shouldReduceMotion = useReducedMotion()

  // Check if columns are legacy format or TanStack format
  const isLegacyColumns = (
    cols: ColumnDef<TItem>[] | GalleryDataTableColumn<TItem>[],
  ): cols is GalleryDataTableColumn<TItem>[] => {
    if (!cols || cols.length === 0) return false
    // Legacy columns have 'field' and 'header' as required properties
    return 'field' in cols[0] && 'header' in cols[0] && typeof (cols[0] as any).header === 'string'
  }

  // Sorting state management
  const urlSortHook = React.useMemo(() => {
    if (persistSortInUrl && enableSorting) {
      // We can't conditionally call hooks, but we can conditionally use their results
      return { useUrl: true }
    }
    return { useUrl: false }
  }, [persistSortInUrl, enableSorting])

  // Always call the hook but only use it if needed
  const [sortingFromUrl, setSortingFromUrl] = useSortFromURL(maxMultiSortColCount)
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])

  const sorting = urlSortHook.useUrl ? sortingFromUrl : internalSorting
  const setSorting = urlSortHook.useUrl ? setSortingFromUrl : setInternalSorting

  // Column order state management
  const defaultColumnOrder = React.useMemo(() => {
    if (initialColumnOrder) return initialColumnOrder
    // Extract column IDs from column definitions
    if (!isLegacyColumns(columns)) {
      return (columns as ColumnDef<TItem>[])
        .map((col: any) => col.id || (col as any).accessorKey || '')
        .filter(Boolean)
    }
    return columns.map(col => col.field as string)
  }, [columns, initialColumnOrder])

  const { columnOrder, setColumnOrder } = useColumnOrder({
    storageKey: `gallery-table-column-order-${ariaLabel || 'default'}`,
    initialOrder: defaultColumnOrder,
    persist: enableColumnReordering && persistColumnOrder,
  })

  // DnD sensors for keyboard and pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  )

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

  // Handle drag end event for column reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = columnOrder.indexOf(active.id as string)
      const newIndex = columnOrder.indexOf(over?.id as string)
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
      setColumnOrder(newOrder)
      onColumnOrderChange?.(newOrder)
    }
  }

  // Map columns to TanStack Table column definitions
  const columnHelper = createColumnHelper<TItem>()

  const tanstackColumns = React.useMemo(() => {
    // If already TanStack ColumnDef format, use directly with sorting wrapper
    if (!isLegacyColumns(columns)) {
      return (columns as ColumnDef<TItem>[]).map(col => {
        // Wrap headers with SortableHeader if sorting is enabled
        if (enableSorting && typeof col.header === 'string') {
          const headerLabel: string = col.header

          return {
            ...col,
            header: ({ column }) => {
              const headerContent = (
                <SortableHeader
                  column={column}
                  className="px-4 py-3"
                  enableMultiSort={enableMultiSort}
                  maxMultiSortColCount={maxMultiSortColCount}
                >
                  <span className="font-semibold text-sm">{headerLabel}</span>
                </SortableHeader>
              )

              return enableColumnReordering ? (
                <DraggableTableHeader column={column} isDraggingEnabled={enableColumnReordering}>
                  {headerContent}
                </DraggableTableHeader>
              ) : (
                headerContent
              )
            },
          } as ColumnDef<TItem, unknown>
        }
        return col as ColumnDef<TItem, unknown>
      })
    }

    // Convert legacy format to TanStack format
    return columns.map(col =>
      columnHelper.accessor(row => row[col.field], {
        id: col.field as string,
        header: ({ column }) => {
          const filterable = getFilterableColumn(col.field)
          const currentFilter = columnFilters.find(f => f.field === col.field)

          // For sortable columns, use SortableHeader wrapper
          const headerContent = (
            <>
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
            </>
          )

          const sortableContent =
            enableSorting && col.enableSorting !== false ? (
              <SortableHeader
                column={column}
                className="px-4 py-3"
                enableMultiSort={enableMultiSort}
                maxMultiSortColCount={maxMultiSortColCount}
              >
                {headerContent}
              </SortableHeader>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3">{headerContent}</div>
            )

          return enableColumnReordering ? (
            <DraggableTableHeader column={column} isDraggingEnabled={enableColumnReordering}>
              {sortableContent}
            </DraggableTableHeader>
          ) : (
            sortableContent
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
        enableSorting: enableSorting && col.enableSorting !== false,
      }),
    )
  }, [
    columns,
    filterableColumns,
    columnFilters,
    enableSorting,
    enableMultiSort,
    maxMultiSortColCount,
    enableColumnReordering,
  ]) as ColumnDef<TItem, unknown>[]

  const handleSortingChange: OnChangeFn<SortingState> = updater => {
    const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(nextSorting)
  }

  const table = useReactTable<TItem>({
    data: filteredItems,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    state: {
      ...(enableSorting && { sorting }),
      ...(enableColumnReordering && { columnOrder }),
    },
    ...(enableColumnReordering && {
      onColumnOrderChange: updater => {
        const newOrder =
          typeof updater === 'function' ? updater(columnOrder as ColumnOrderState) : updater
        setColumnOrder(newOrder as string[])
        onColumnOrderChange?.(newOrder as string[])
      },
    }),
    ...(enableSorting && {
      onSortingChange: handleSortingChange,
      enableSortingRemoval: true, // Allow toggling back to unsorted
      enableMultiSort: enableMultiSort,
      maxMultiSortColCount: maxMultiSortColCount,
      isMultiSortEvent: (e: unknown) => {
        // Type guard for mouse and keyboard events
        if (!enableMultiSort) return false
        if (typeof e === 'object' && e !== null) {
          if ('shiftKey' in e) {
            return (e as React.MouseEvent | React.KeyboardEvent).shiftKey
          }
        }
        return false
      },
    }),
  })

  // Infinite scroll sentinel (only when onLoadMore/hasMore provided)
  const { sentinelRef } = useInfiniteScroll({
    hasMore: Boolean(hasMore && onLoadMore),
    isLoading,
    onLoadMore: onLoadMore ?? (() => {}),
    threshold: 200,
    enabled: Boolean(hasMore && onLoadMore),
  })

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLElement>, item: TItem) => {
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
          ? (currentRow.nextElementSibling as HTMLElement | null)
          : (currentRow.previousElementSibling as HTMLElement | null)
      nextRow?.focus()
    }
  }

  const rowCount = filteredItems.length
  const colCount = columns.length

  const showSkeleton = isLoading && rowCount === 0

  const emptyVariant = hasActiveFilters ? 'no-results' : 'no-items'

  const showError = Boolean(error)

  // Generate screen reader announcement for sorting
  const sortAnnouncement = React.useMemo(() => {
    if (!enableSorting || sorting.length === 0) return 'Sorting cleared'

    if (!isLegacyColumns(columns)) {
      // Only legacy columns have stable string headers and fields
      return ''
    }

    if (sorting.length === 1) {
      const sort = sorting[0]
      const column = columns.find(col => col.field === sort.id)
      if (!column) return ''
      return `Sorted by ${column.header}, ${sort.desc ? 'descending' : 'ascending'}`
    }

    if (sorting.length === 2) {
      const [primary, secondary] = sorting
      const primaryCol = columns.find(col => col.field === primary.id)
      const secondaryCol = columns.find(col => col.field === secondary.id)
      if (!primaryCol || !secondaryCol) return ''
      return (
        `Sorted by ${primaryCol.header} ${primary.desc ? 'descending' : 'ascending'}, ` +
        `then ${secondaryCol.header} ${secondary.desc ? 'descending' : 'ascending'}`
      )
    }

    return ''
  }, [sorting, columns, enableSorting])

  return (
    <div className={cn('hidden md:block w-full', className)}>
      {showSkeleton ? (
        <GalleryDataTableSkeleton columns={colCount} rows={10} />
      ) : showError ? (
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, x: 0 }}
            animate={{
              opacity: 1,
              x: shouldReduceMotion ? 0 : [0, -10, 10, -10, 10, 0],
            }}
            transition={{
              opacity: { duration: 0.15 },
              x: { duration: 0.3, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
            }}
          >
            <GalleryTableError
              error={error as Error}
              onRetry={onRetry}
              isRetrying={isRetrying}
              className="min-h-[320px]"
            />
          </motion.div>
        </div>
      ) : (
        <Table
          role="table"
          caption={ariaLabel ?? 'Gallery items table'}
          aria-rowcount={rowCount}
          aria-colcount={colCount}
          className="min-w-full text-left text-sm"
        >
          <TableHeader>
            {enableColumnReordering ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead
                          key={header.id}
                          className="border-b border-border bg-muted/40 motion-safe:transition-all motion-safe:duration-100 motion-safe:hover:-translate-y-[1px] motion-safe:hover:shadow-sm"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header as any,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead
                      key={header.id}
                      className="border-b border-border bg-muted/40 motion-safe:transition-all motion-safe:duration-100 motion-safe:hover:-translate-y-[1px] motion-safe:hover:shadow-sm"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header as any, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))
            )}
          </TableHeader>
          <TableBody>
            {rowCount === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="px-4 py-6">
                  <motion.div
                    initial={shouldReduceMotion ? undefined : { opacity: 0, y: 20 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <GalleryTableEmpty
                      variant={emptyVariant}
                      onAddItem={!hasActiveFilters ? onAddItem : undefined}
                      onClearFilters={hasActiveFilters ? onClearFilters : undefined}
                    />
                  </motion.div>
                </TableCell>
              </TableRow>
            )}

            {rowCount > 0 &&
              table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  tabIndex={0}
                  initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: shouldReduceMotion ? 0 : Math.min(index * 0.05, 0.5),
                    ease: 'easeOut',
                  }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  className="border-b transition-colors duration-100 hover:bg-accent/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[44px]"
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={event => handleRowKeyDown(event, row.original)}
                  style={{ willChange: 'transform' }}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="align-middle px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
          </TableBody>
        </Table>
      )}

      {hasMore && onLoadMore ? (
        <div
          ref={sentinelRef}
          className="h-10 flex items-center justify-center text-xs text-muted-foreground"
          aria-live="polite"
          aria-label="Loading more items"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        </div>
      ) : null}

      {/* Screen reader announcements for sorting */}
      {enableSorting ? (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {sortAnnouncement}
        </div>
      ) : null}
    </div>
  )
}
