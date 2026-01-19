# Story insp-2014: Drag-and-Drop Reorder

## Status

Draft

## Consolidates

- insp-1033.drag-and-drop-reorder
- insp-1034.keyboard-reorder

## Story

**As a** user,
**I want** to drag items to reorder them in the gallery,
**so that** I can organize my inspirations in my preferred order.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Interaction Patterns > Drag-and-Drop Reorder

## Dependencies

- **insp-2002**: Inspiration Gallery MVP
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### Visual Feedback

1. Line indicator appears between items showing drop position
2. Dragged item shows as semi-transparent
3. Drop target area highlights
4. Cursor changes during drag
5. Smooth animation when items reorder

### Mouse Drag

6. Click and drag to initiate
7. Items shift to show insertion point
8. Release drops at new position
9. Escape cancels drag

### Keyboard Reorder

10. Select item with Space
11. Arrow keys move selection
12. Enter confirms new position
13. Escape cancels and reverts
14. Screen reader announces position changes

### Touch Support

15. Long-press (300ms) initiates drag on touch
16. Visual feedback during long-press
17. Can scroll while dragging (near edges)

### API Integration

18. PATCH /api/inspirations/reorder updates sortOrder
19. Debounced API call after reorder
20. Optimistic update for instant feedback
21. Rollback on API failure

## Tasks / Subtasks

### Task 1: Install and Configure dnd-kit (AC: 1-9)

- [ ] Install @dnd-kit/core and @dnd-kit/sortable
- [ ] Create DraggableGalleryGrid component
- [ ] Implement line indicator overlay
- [ ] Configure sensors (mouse, touch)

### Task 2: Create Reorder API Endpoint (AC: 18)

- [ ] Create `apps/api/endpoints/inspirations/reorder/handler.ts`
- [ ] Accept { id, newIndex } or { orderedIds: string[] }
- [ ] Update sortOrder for affected items
- [ ] Return updated items

### Task 3: Implement Keyboard Reorder (AC: 10-14)

- [ ] Add keyboard sensors to dnd-kit
- [ ] Implement keyboard-based navigation
- [ ] Add live region for announcements
- [ ] Handle Enter to confirm, Escape to cancel

### Task 4: Add Touch Support (AC: 15-17)

- [ ] Configure long-press delay
- [ ] Add visual feedback for long-press
- [ ] Handle scroll during drag

### Task 5: RTK Integration (AC: 19-21)

- [ ] Add reorderInspirations mutation
- [ ] Implement optimistic update
- [ ] Handle rollback on error
- [ ] Debounce API calls

## Dev Notes

### Draggable Gallery Grid

```typescript
// apps/web/main-app/src/routes/inspiration/-components/DraggableGalleryGrid/index.tsx
import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useReorderInspirationsMutation } from '@repo/api-client/rtk/inspiration-api'
import { InspirationCard } from '../InspirationCard'
import type { Inspiration } from '@repo/api-client/schemas/inspiration'

interface DraggableGalleryGridProps {
  items: Inspiration[]
  onItemsChange: (items: Inspiration[]) => void
}

export function DraggableGalleryGrid({ items, onItemsChange }: DraggableGalleryGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [reorderInspirations] = useReorderInspirationsMutation()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // 300ms long-press
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex(item => item.id === active.id)
    const newIndex = items.findIndex(item => item.id === over.id)

    // Optimistic update
    const newItems = arrayMove(items, oldIndex, newIndex)
    onItemsChange(newItems)

    try {
      // API call
      await reorderInspirations({
        orderedIds: newItems.map(item => item.id),
      }).unwrap()
    } catch (error) {
      // Rollback on failure
      onItemsChange(items)
      console.error('Failed to reorder:', error)
    }
  }, [items, onItemsChange, reorderInspirations])

  const activeItem = activeId ? items.find(item => item.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          role="listbox"
          aria-label="Reorderable inspiration gallery"
        >
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay adjustScale style={{ transformOrigin: '0 0' }}>
        {activeItem && (
          <div className="opacity-80 shadow-xl">
            <InspirationCard inspiration={activeItem} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface SortableItemProps {
  item: Inspiration
}

function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="option"
      aria-selected={isDragging}
    >
      <InspirationCard inspiration={item} />
    </div>
  )
}
```

### Reorder Endpoint

```typescript
// apps/api/endpoints/inspirations/reorder/handler.ts
import { db } from '@/database'
import { inspirations } from '@/database/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
})

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const body = ReorderSchema.parse(JSON.parse(event.body || '{}'))

  // Verify all items belong to user
  const existingItems = await db
    .select({ id: inspirations.id })
    .from(inspirations)
    .where(
      and(
        eq(inspirations.userId, userId),
        inArray(inspirations.id, body.orderedIds)
      )
    )

  if (existingItems.length !== body.orderedIds.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Some items not found or not owned' }),
    }
  }

  // Update sort orders
  await Promise.all(
    body.orderedIds.map((id, index) =>
      db
        .update(inspirations)
        .set({ sortOrder: index, updatedAt: new Date().toISOString() })
        .where(eq(inspirations.id, id))
    )
  )

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
```

### Keyboard Accessibility

```typescript
// Keyboard navigation announcements
const announcements = {
  onDragStart: ({ active }) => {
    return `Grabbed ${active.data.current?.title || 'item'}. Use arrow keys to move, Enter to drop, Escape to cancel.`
  },
  onDragOver: ({ active, over }) => {
    if (over) {
      return `${active.data.current?.title} is over ${over.data.current?.title}`
    }
    return `${active.data.current?.title} is no longer over a droppable area`
  },
  onDragEnd: ({ active, over }) => {
    if (over) {
      return `${active.data.current?.title} was dropped on ${over.data.current?.title}`
    }
    return `Drag cancelled`
  },
  onDragCancel: ({ active }) => {
    return `Dragging cancelled. ${active.data.current?.title} was dropped.`
  },
}

// Usage in DndContext
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  accessibility={{
    announcements,
    screenReaderInstructions: {
      draggable: 'Press Space to start dragging, then use arrow keys to move the item.',
    },
  }}
>
```

### RTK Mutation with Optimistic Update

```typescript
// packages/core/api-client/src/rtk/inspiration-api.ts
reorderInspirations: builder.mutation<void, { orderedIds: string[] }>({
  query: (body) => ({
    url: '/inspirations/reorder',
    method: 'PATCH',
    body,
  }),
  // Optimistic update
  async onQueryStarted({ orderedIds }, { dispatch, queryFulfilled, getState }) {
    // Patch the cache optimistically
    const patchResult = dispatch(
      inspirationApi.util.updateQueryData('getInspirations', { page: 1 }, (draft) => {
        // Reorder items in cache based on orderedIds
        draft.items.sort((a, b) => {
          return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
        })
      })
    )

    try {
      await queryFulfilled
    } catch {
      // Rollback on failure
      patchResult.undo()
    }
  },
}),
```

## Testing

### Drag Tests

- [ ] Mouse drag initiates on 8px movement
- [ ] Touch drag initiates on 300ms hold
- [ ] Dragged item shows overlay
- [ ] Drop indicator appears at target
- [ ] Items animate to new positions
- [ ] Escape cancels drag

### Keyboard Tests

- [ ] Space starts drag mode
- [ ] Arrow keys move selection
- [ ] Enter confirms position
- [ ] Escape cancels
- [ ] Screen reader announcements work

### API Tests

- [ ] PATCH /api/inspirations/reorder updates order
- [ ] Validates all IDs belong to user
- [ ] Optimistic update shows immediately
- [ ] Rollback on API failure

## Definition of Done

- [ ] Drag and drop working with visual feedback
- [ ] Keyboard reorder accessible
- [ ] Touch support with long-press
- [ ] API persists new order
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1033, insp-1034         | Claude   |
