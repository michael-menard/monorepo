/**
 * SortableWishlistCard Component
 *
 * Wraps WishlistCard with dnd-kit sortable behavior for drag-and-drop reordering.
 * Adds a drag handle with proper ARIA attributes for accessibility.
 *
 * Story WISH-2005a: Drag-and-drop reordering with dnd-kit
 */

import { z } from 'zod'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@repo/app-component-library'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { WishlistCard } from '../WishlistCard'

/**
 * SortableWishlistCard props schema
 */
export const SortableWishlistCardPropsSchema = z.object({
  /** Wishlist item data */
  item: z.custom<WishlistItem>(),
  /** Position in the list (1-indexed for ARIA) */
  index: z.number().int().min(0),
  /** Total number of items in the list */
  totalItems: z.number().int().min(1),
  /** Click handler for card click */
  onClick: z.function().optional(),
  /** Got It button handler (WISH-2042) */
  onGotIt: z.function().optional(),
  /** Delete button handler (WISH-2041) */
  onDelete: z.function().optional(),
  /** Whether dragging is enabled */
  isDraggingEnabled: z.boolean().optional(),
  /** Additional CSS classes */
  className: z.string().optional(),
})

export type SortableWishlistCardProps = z.infer<typeof SortableWishlistCardPropsSchema>

/**
 * SortableWishlistCard Component
 *
 * Renders a wishlist card that can be dragged and dropped to reorder.
 *
 * Features:
 * - Drag handle with GripVertical icon
 * - Visual feedback during drag (opacity, cursor)
 * - ARIA attributes for accessibility (role, aria-setsize, aria-posinset)
 * - Touch target 44x44px for WCAG 2.5.5 compliance
 * - Visible on hover for desktop, always visible on mobile
 */
export function SortableWishlistCard({
  item,
  index,
  totalItems,
  onClick,
  onGotIt,
  onDelete,
  isDraggingEnabled = true,
  className,
}: SortableWishlistCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
      data-testid={`sortable-wishlist-card-${item.id}`}
    >
      {/* Drag Handle */}
      {isDraggingEnabled ? (
        <button
          {...attributes}
          {...listeners}
          className={cn(
            // Base styles - 44x44px touch target (WCAG 2.5.5)
            'absolute -left-1 top-1/2 -translate-y-1/2 z-10',
            'flex items-center justify-center w-11 h-11',
            'touch-none rounded-lg transition-all',
            // Color tokens only - no hardcoded colors
            'text-muted-foreground hover:bg-muted/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            // Desktop: hidden until hover/focus
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            // Mobile: always visible (detected by touch capability in CSS)
            'md:opacity-0 md:group-hover:opacity-100',
            '@supports (hover: none) { opacity-100 }',
            // Cursor states
            'cursor-grab active:cursor-grabbing',
            // Always visible when dragging
            isDragging && 'opacity-100 cursor-grabbing',
          )}
          style={{
            // Force visibility on touch devices using CSS custom property
            // This is detected by media query in DraggableWishlistGallery
            opacity: 'var(--drag-handle-opacity, undefined)',
          }}
          aria-label={`Reorder ${item.title}`}
          aria-roledescription="sortable item"
          aria-describedby={`sortable-instructions-${item.id}`}
          type="button"
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}

      {/* Hidden instructions for screen readers */}
      <span id={`sortable-instructions-${item.id}`} className="sr-only">
        Press Space to start dragging. Use arrow keys to move. Press Space again to drop, or Escape
        to cancel.
      </span>

      {/* The actual card - offset to make room for drag handle */}
      <div className={cn(isDraggingEnabled && 'ml-10')}>
        <WishlistCard
          item={item}
          onClick={onClick}
          onGotIt={onGotIt}
          onDelete={onDelete}
          index={index}
          totalItems={totalItems}
        />
      </div>
    </div>
  )
}

export default SortableWishlistCard
