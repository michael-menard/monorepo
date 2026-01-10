import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@repo/app-component-library'
import type { Column } from '@tanstack/react-table'

interface DraggableTableHeaderProps<TData> {
  column: Column<TData>
  children: React.ReactNode
  className?: string
  isDraggingEnabled?: boolean
}

export function DraggableTableHeader<TData>({
  column,
  children,
  className,
  isDraggingEnabled = true,
}: DraggableTableHeaderProps<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !isDraggingEnabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 group relative',
        isDragging && 'z-50',
        className
      )}
    >
      {isDraggingEnabled && (
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'touch-none p-1 rounded hover:bg-muted/60 transition-all',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'md:opacity-0 md:group-hover:opacity-100',
            'cursor-grab active:cursor-grabbing',
            isDragging && 'opacity-100'
          )}
          aria-label={`Reorder ${column.id} column`}
          aria-roledescription="sortable column"
          type="button"
        >
          <GripVertical 
            className="h-4 w-4 text-muted-foreground" 
            aria-hidden="true"
          />
        </button>
      )}
      <div className="flex-1">{children}</div>
    </div>
  )
}