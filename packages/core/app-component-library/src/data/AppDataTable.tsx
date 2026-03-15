import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '../_primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../_primitives/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../_primitives/table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface SortableRowProps<T> {
  item: T
  index: number
  columns: AppDataTableColumn<T>[]
  onRowClick?: (item: T) => void
  rowClassName?: string
  striped?: boolean
  getResponsiveClasses: (column: AppDataTableColumn<T>) => string
}

function SortableRow<T>({
  item,
  index,
  columns,
  onRowClick,
  rowClassName,
  striped,
  getResponsiveClasses,
}: SortableRowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item && typeof item === 'object' && 'id' in item ? (item as any).id : `row-${index}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      onClick={() => onRowClick?.(item)}
      className={`
        ${rowClassName || ''}
        ${striped && index % 2 === 1 ? 'bg-muted/25' : ''}
        ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
        ${isDragging ? 'bg-muted' : ''}
      `.trim()}
    >
      <TableCell className="w-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      {columns.map(column => (
        <TableCell
          key={column.key}
          className={`${column.className || ''} ${getResponsiveClasses(column)}`}
        >
          {column.render ? column.render(item) : (item as any)[column.key]}
        </TableCell>
      ))}
    </TableRow>
  )
}

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
  draggable?: boolean // Allow dragging this row
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
  onPageSizeChange?: (size: number) => void
  // Drag and drop props
  draggable?: boolean
  onReorder?: (items: Array<{ id: string; index: number }>) => void
  getRowId?: (item: T) => string
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
  draggable = false,
  onReorder,
  getRowId,
  onPageSizeChange,
}: AppDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(pagination.pageSize || 10)
  const [sortKey, setSortKey] = useState(defaultSort?.key || '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    defaultSort?.direction || 'asc',
  )
  const [orderedData, setOrderedData] = useState<Array<T>>(data)

  // Sync orderedData when the data prop changes (e.g. after API re-fetch)
  useEffect(() => {
    setOrderedData(data)
  }, [data])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const getId = useCallback(
    (item: T, index: number) => {
      if (getRowId) return getRowId(item)
      return (item as any).id ?? `row-${index}`
    },
    [getRowId],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!onReorder) return

      if (over && active.id !== over.id) {
        const oldIndex = orderedData.findIndex((item, index) => getId(item, index) === active.id)
        const newIndex = orderedData.findIndex((item, index) => getId(item, index) === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(orderedData, oldIndex, newIndex)
          setOrderedData(reordered)
          onReorder(reordered.map((item, index) => ({ id: getId(item, index), index })))
        }
      }
    },
    [orderedData, getId, onReorder],
  )

  // Responsive column filtering
  const visibleColumns = useMemo(() => {
    return columns.filter(column => {
      if (!column.responsive) return true

      // Simple responsive logic - can be enhanced with actual screen size detection
      // column.responsive.hideAt is available for future breakpoint-based hiding
      // For now, we'll show all columns but add responsive classes
      return true
    })
  }, [columns])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortable || !sortKey) return orderedData

    const sorted = [...orderedData].sort((a, b) => {
      const aValue = (a as any)[sortKey]
      const bValue = (b as any)[sortKey]

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [orderedData, sortable, sortKey, sortDirection])

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

  if (orderedData.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>{emptyMessage}</div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Pagination Controls - Top */}
      {pagination.enabled && (pagination.showPageSizeSelector || pagination.showPageInfo) ? (
        <div className="flex items-center justify-between px-4 py-2">
          {pagination.showPageSizeSelector ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={value => {
                  const size = Number(value)
                  setPageSize(size)
                  onPageSizeChange?.(size)
                }}
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
              <span className="text-sm text-muted-foreground">entries</span>
            </div>
          ) : null}

          {pagination.showPageInfo ? (
            <div className="text-sm text-muted-foreground">
              Showing {startItem} to {endItem} of {sortedData.length} entries
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        {draggable && onReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  {visibleColumns.map(column => (
                    <TableHead
                      key={column.key}
                      className={`${column.className || ''} ${getResponsiveClasses(column)} ${
                        sortable && column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''
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
                <SortableContext
                  items={paginatedData.map((item, index) => getId(item, index))}
                  strategy={verticalListSortingStrategy}
                >
                  {paginatedData.map((item, index) => (
                    <SortableRow
                      key={getId(item, index)}
                      item={item}
                      index={index}
                      columns={visibleColumns}
                      onRowClick={onRowClick}
                      rowClassName={rowClassName}
                      striped={striped}
                      getResponsiveClasses={getResponsiveClasses}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map(column => (
                  <TableHead
                    key={column.key}
                    className={`${column.className || ''} ${getResponsiveClasses(column)} ${
                      sortable && column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''
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
                    ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
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
        )}
      </div>

      {/* Pagination Controls - Bottom */}
      {pagination.enabled && pagination.showNavigationButtons && totalPages > 1 ? (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-sm text-muted-foreground">
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
