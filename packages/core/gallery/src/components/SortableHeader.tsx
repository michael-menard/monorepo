import React from 'react'
import { type Column } from '@tanstack/react-table'
import { ArrowUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@repo/app-component-library'

interface SortableHeaderProps<TData> {
  column: Column<TData>
  children: React.ReactNode
  className?: string
  enableMultiSort?: boolean
  maxMultiSortColCount?: number
}

/**
 * SortableHeader component for datatable columns
 *
 * Provides visual indicators and keyboard/mouse interaction for column sorting.
 * Supports single and multi-column sorting with priority indicators.
 * Use Shift+click or Shift+Enter to add secondary sort.
 */
export function SortableHeader<TData>({
  column,
  children,
  className,
  enableMultiSort = false,
  maxMultiSortColCount = 2,
}: SortableHeaderProps<TData>) {
  const sortDirection = column.getIsSorted()
  const canSort = column.getCanSort()
  const sortIndex = column.getSortIndex()

  if (!canSort) {
    return <div className={cn('flex items-center gap-2', className)}>{children}</div>
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (enableMultiSort && e.shiftKey) {
      // Add/toggle as secondary sort (multi-sort mode)
      column.toggleSorting(undefined, true)
    } else {
      // Replace all sorts with this column (single-sort mode)
      column.toggleSorting(undefined, false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (enableMultiSort && e.shiftKey) {
        // Add/toggle as secondary sort
        column.toggleSorting(undefined, true)
      } else {
        // Replace all sorts with this column
        column.toggleSorting(undefined, false)
      }
    }
  }

  // Extract text from children for aria-label
  const childText = React.useMemo(() => {
    if (typeof children === 'string') return children
    if (React.isValidElement(children)) {
      // Try to extract text from the element
      const extractText = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node
        if (typeof node === 'number') return node.toString()
        if (React.isValidElement(node)) {
          const element = node as React.ReactElement
          if (element.props.children) {
            return extractText(element.props.children)
          }
        }
        if (Array.isArray(node)) {
          return node.map(extractText).join('')
        }
        return ''
      }
      return extractText(children)
    }
    return 'Column'
  }, [children])

  // Determine aria-label based on sort state
  const ariaLabel = sortDirection
    ? `${childText}, ${sortIndex === 0 ? 'primary' : 'secondary'} sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`
    : `${childText}, not sorted`

  // Tooltip for multi-sort hint
  const title = enableMultiSort
    ? `Click to sort, Shift+click to add up to ${maxMultiSortColCount} sorted column${maxMultiSortColCount > 1 ? 's' : ''}`
    : 'Click to sort'

  return (
    <div
      className={cn(
        'flex items-center gap-2 cursor-pointer select-none hover:bg-muted/50 rounded-md transition-colors',
        sortDirection && 'bg-accent/10', // Highlight sorted columns
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
      }
      aria-label={ariaLabel}
      title={title}
    >
      {children}
      {sortDirection ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: sortDirection === 'desc' ? 180 : 0,
          }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="ml-auto flex items-center"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          {enableMultiSort && sortIndex > -1 ? (
            <sup className="text-[10px] ml-0.5 font-semibold">{sortIndex + 1}</sup>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  )
}
