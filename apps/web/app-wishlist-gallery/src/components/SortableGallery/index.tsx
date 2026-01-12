import type { ReactNode } from 'react'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { GalleryGrid } from '@repo/gallery'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

export interface SortableGalleryProps {
  items: WishlistItem[]
  onReorder: (items: WishlistItem[]) => void
  renderItem: (item: WishlistItem, index: number) => ReactNode
  /** Optional responsive column configuration passed through to GalleryGrid */
  columns?: Record<string, number>
  /** Optional gap size passed through to GalleryGrid */
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12
}

/**
 * SortableGallery
 *
 * Wraps GalleryGrid with @dnd-kit DndContext so wishlist items can be
 * reordered via drag-and-drop, keyboard, and touch (long-press).
 */
export function SortableGallery({
  items,
  onReorder,
  renderItem,
  columns,
  gap,
}: SortableGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drags from small pointer movement
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // Long-press to start drag on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(item => item.id === active.id)
    const newIndex = items.findIndex(item => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    onReorder(reordered)
  }

  const itemIds = items.map(item => item.id)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <GalleryGrid columns={columns} gap={gap}>
          {items.map((item, index) => renderItem(item, index))}
        </GalleryGrid>
      </SortableContext>
    </DndContext>
  )
}

export default SortableGallery
