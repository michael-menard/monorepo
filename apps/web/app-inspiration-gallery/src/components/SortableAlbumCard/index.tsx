/**
 * SortableAlbumCard Component
 *
 * Wraps AlbumCard with dnd-kit sortable behavior for drag-and-drop reordering.
 * Adds a drag handle with proper ARIA attributes for accessibility.
 *
 * INSP-011-A: Drag-and-Drop (dnd-kit)
 * INSP-019: Keyboard Navigation & A11y
 */

import { forwardRef } from 'react'
import { z } from 'zod'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@repo/app-component-library'
import { AlbumCard } from '../AlbumCard'

/**
 * SortableAlbumCard props schema
 */
export const SortableAlbumCardPropsSchema = z.object({
  /** Unique identifier */
  id: z.string().uuid(),
  /** Display title */
  title: z.string(),
  /** Description */
  description: z.string().nullable().optional(),
  /** Cover image URL */
  coverImageUrl: z.string().nullable().optional(),
  /** Number of items in the album */
  itemCount: z.number().int().optional().default(0),
  /** Number of child albums */
  childAlbumCount: z.number().int().optional().default(0),
  /** Tags for categorization */
  tags: z.array(z.string()).nullable().optional(),
  /** Position in the list (0-indexed) */
  index: z.number().int().min(0),
  /** Total number of items in the list */
  totalItems: z.number().int().min(1),
  /** Whether dragging is enabled */
  isDraggingEnabled: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Tab index for keyboard navigation */
  tabIndex: z.number().optional(),
  /** Whether this item is currently selected */
  isSelected: z.boolean().optional(),
})

export type SortableAlbumCardProps = z.infer<typeof SortableAlbumCardPropsSchema> & {
  /** Click handler for card click */
  onClick?: () => void
  /** Called when more menu is opened */
  onMenuClick?: (event: React.MouseEvent) => void
}

/**
 * SortableAlbumCard Component
 *
 * Renders an album card that can be dragged and dropped to reorder.
 *
 * Features:
 * - Drag handle with GripVertical icon
 * - Visual feedback during drag (opacity, cursor)
 * - ARIA attributes for accessibility (role, aria-setsize, aria-posinset)
 * - Touch target 44x44px for WCAG 2.5.5 compliance
 */
export const SortableAlbumCard = forwardRef<HTMLDivElement, SortableAlbumCardProps>(
  function SortableAlbumCard(
    {
      id,
      title,
      description,
      coverImageUrl,
      itemCount = 0,
      childAlbumCount = 0,
      tags,
      index,
      totalItems,
      onClick,
      onMenuClick,
      isDraggingEnabled = true,
      className,
      tabIndex,
      isSelected,
    },
    ref,
  ) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
      disabled: !isDraggingEnabled,
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn('relative group', isDragging && 'z-50', className)}
        role="listitem"
        aria-setsize={totalItems}
        aria-posinset={index + 1}
        data-testid={`sortable-album-card-${id}`}
      >
        {/* Drag Handle */}
        {isDraggingEnabled ? (
          <button
            {...attributes}
            {...listeners}
            className={cn(
              // Base styles - 44x44px touch target (WCAG 2.5.5)
              'absolute -right-1 top-1/2 -translate-y-1/2 z-10',
              'flex items-center justify-center w-11 h-11',
              'touch-none rounded-lg transition-all',
              // Color tokens only - no hardcoded colors
              'text-muted-foreground hover:bg-muted/60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              // Desktop: hidden until hover/focus
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
              // Mobile: always visible
              'md:opacity-0 md:group-hover:opacity-100',
              // Cursor states
              'cursor-grab active:cursor-grabbing',
              // Always visible when dragging
              isDragging && 'opacity-100 cursor-grabbing',
            )}
            aria-label={`Reorder ${title}`}
            aria-roledescription="sortable item"
            aria-describedby={`sortable-instructions-${id}`}
            type="button"
            data-testid={`drag-handle-${id}`}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}

        {/* Hidden instructions for screen readers */}
        <span id={`sortable-instructions-${id}`} className="sr-only">
          Press Space to start dragging. Use arrow keys to move. Press Space again to drop, or
          Escape to cancel.
        </span>

        {/* The actual card - offset to make room for drag handle */}
        <div
          className={cn(
            isDraggingEnabled && 'mr-10',
            'focus:outline-none focus:ring-2 focus:ring-primary rounded-lg',
          )}
          ref={ref}
          tabIndex={tabIndex}
        >
          <AlbumCard
            id={id}
            title={title}
            description={description}
            coverImageUrl={coverImageUrl}
            itemCount={itemCount}
            childAlbumCount={childAlbumCount}
            tags={tags}
            isSelected={isSelected}
            onClick={onClick}
            onMenuClick={onMenuClick}
          />
        </div>
      </div>
    )
  },
)

export default SortableAlbumCard
