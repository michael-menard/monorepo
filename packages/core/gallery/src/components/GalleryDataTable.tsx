import React, { type ReactNode } from 'react'
import { cn } from '@repo/app-component-library'
import type { ColumnFilter, FilterableColumn } from '../__types__/columnFilter'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { ColumnFilterInput } from './ColumnFilterInput'

export interface GalleryDataTableColumn<TItem extends Record<string, unknown>> {
  field: keyof TItem
  header: string
  // Optional custom cell renderer
  render?: (item: TItem) => ReactNode
  className?: string
}

export interface GalleryDataTableProps<TItem extends Record<string, unknown>> {
  items: TItem[]
  columns: GalleryDataTableColumn<TItem>[]
  filterableColumns?: FilterableColumn<TItem>[]
  className?: string
  /** Optional callback to observe active column filters */
  onColumnFiltersChange?: (filters: ColumnFilter<TItem>[]) => void
}

export function GalleryDataTable<TItem extends Record<string, unknown>>({
  items,
  columns,
  filterableColumns = [],
  className,
  onColumnFiltersChange,
}: GalleryDataTableProps<TItem>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFilter<TItem>[]>([])

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

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            {columns.map(col => {
              const filterable = getFilterableColumn(col.field)
              const currentFilter = columnFilters.find(f => f.field === col.field)

              return (
                <th key={String(col.field)} className="px-4 py-2 align-bottom">
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
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
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-muted-foreground">
                No results match the current filters.
              </td>
            </tr>
          ) : (
            filteredItems.map((item, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border">
                {columns.map(col => (
                  <td
                    key={String(col.field)}
                    className={cn('px-4 py-2 align-middle', col.className)}
                  >
                    {col.render ? col.render(item) : String(item[col.field] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
