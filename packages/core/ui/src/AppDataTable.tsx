import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './index'

export interface AppDataTableColumn<T> {
  key: string
  header: string | ((column: AppDataTableColumn<T>) => React.ReactNode)
  render?: (item: T) => React.ReactNode
  className?: string
  responsive?: {
    hideAt?: 'sm' | 'md' | 'lg' | 'xl'
    priority?: number // Higher priority = more likely to show on smaller screens
  }
  sortable?: boolean
}

export interface AppDataTableProps<T> {
  data: Array<T>
  columns: Array<AppDataTableColumn<T>>
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
  rowClassName?: string
  striped?: boolean // Add striped rows option
  // Pagination props
  pagination?: {
    enabled?: boolean
    pageSize?: number
    pageSizeOptions?: Array<number>
    showPageSizeSelector?: boolean
    showPageInfo?: boolean
    showNavigationButtons?: boolean
  }
  // Sorting props
  sortable?: boolean
  defaultSort?: {
    key: string
    direction: 'asc' | 'desc'
  }
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void
}

export function AppDataTable<T>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  rowClassName = '',
  striped = false,
  pagination = {},
  sortable = false,
  defaultSort,
  onSortChange,
}: AppDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(pagination.pageSize || 10)
  const [sortKey, setSortKey] = useState(defaultSort?.key || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSort?.direction || 'asc',
  )

  // Responsive column filtering
  const visibleColumns = useMemo(() => {
    return columns.filter(column => {
      if (!column.responsive) return true

      // Simple responsive logic - can be enhanced with actual screen size detection
      const hideAt = column.responsive.hideAt
      // For now, we'll show all columns but add responsive classes
      return true
    })
  }, [columns])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortable || !sortKey) return data

    const sorted = [...data].sort((a, b) => {
      const aValue = (a as any)[sortKey]
      const bValue = (b as any)[sortKey]

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [data, sortable, sortKey, sortDirection])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination.enabled) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize, pagination.enabled])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, sortedData.length)

  const handleSort = (key: string) => {
    if (!sortable) return

    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(newDirection)
    onSortChange?.(key, newDirection)
  }

  const renderHeader = (column: AppDataTableColumn<T>) => {
    if (typeof column.header === 'function') {
      return column.header(column)
    }
    return column.header
  }

  const getResponsiveClasses = (column: AppDataTableColumn<T>) => {
    if (!column.responsive) return ''

    const hideAt = column.responsive.hideAt
    switch (hideAt) {
      case 'sm':
        return 'hidden sm:table-cell'
      case 'md':
        return 'hidden md:table-cell'
      case 'lg':
        return 'hidden lg:table-cell'
      case 'xl':
        return 'hidden xl:table-cell'
      default:
        return ''
    }
  }

  if (data.length === 0) {
    return <div className={`text-center py-8 text-gray-500 ${className}`}>{emptyMessage}</div>
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Pagination Controls - Top */}
      {pagination.enabled && (pagination.showPageSizeSelector || pagination.showPageInfo) ? (
        <div className="flex items-center justify-between">
          {pagination.showPageSizeSelector ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={value => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(pagination.pageSizeOptions || [5, 10, 20, 50]).map(size => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
          ) : null}

          {pagination.showPageInfo ? (
            <div className="text-sm text-gray-600">
              Showing {startItem} to {endItem} of {sortedData.length} entries
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map(column => (
                <TableHead
                  key={column.key}
                  className={`${column.className || ''} ${getResponsiveClasses(column)} ${
                    sortable && column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {renderHeader(column)}
                    {sortable && column.sortable && sortKey === column.key ? (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    ) : null}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(item)}
                className={`
                  ${rowClassName}
                  ${striped && index % 2 === 1 ? 'bg-muted/25' : ''}
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                `.trim()}
              >
                {visibleColumns.map(column => (
                  <TableCell
                    key={column.key}
                    className={`${column.className || ''} ${getResponsiveClasses(column)}`}
                  >
                    {column.render ? column.render(item) : (item as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - Bottom */}
      {pagination.enabled && pagination.showNavigationButtons && totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
