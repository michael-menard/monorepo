import type { ReactNode, CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@repo/app-component-library'

export interface SortableWishlistCardProps {
  id: string
  children: ReactNode
}

/**
 * SortableWishlistCard
 *
 * Wraps a WishlistCard with @dnd-kit sortable behaviour and a drag handle.
 * Only used in grid (gallery) view – datatable view does not support reordering.
 */
export function SortableWishlistCard({ id, children }: SortableWishlistCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative group', isDragging && 'opacity-50 z-50')}
      {...attributes}
    >
      {/* Drag handle - keyboard & pointer accessible */}
      <button
        type="button"
        aria-label="Reorder wishlist item"
        className="absolute top-2 left-2 z-10 inline-flex items-center justify-center rounded bg-background/80 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity focus-visible:opacity-100 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  )
}

export default SortableWishlistCard
