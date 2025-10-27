import React from 'react'

export interface AppDataTableColumn<T> {
  key: string
  header: string | ((column: AppDataTableColumn<T>) => React.ReactNode)
  render?: (item: T) => React.ReactNode
  className?: string
  responsive?: {
    hideAt?: 'sm' | 'md' | 'lg' | 'xl'
    priority?: number
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
  pagination?: {
    enabled?: boolean
    pageSize?: number
    pageSizeOptions?: Array<number>
    showPageSizeSelector?: boolean
    showPageInfo?: boolean
    showNavigationButtons?: boolean
  }
  sortable?: boolean
  defaultSort?: {
    key: string
    direction: 'asc' | 'desc'
  }
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void
}
export declare function AppDataTable<T>({
  data,
  columns,
  onRowClick,
  emptyMessage,
  className,
  rowClassName,
  pagination,
  sortable,
  defaultSort,
  onSortChange,
}: AppDataTableProps<T>): import('react/jsx-runtime').JSX.Element
//# sourceMappingURL=AppDataTable.d.ts.map
