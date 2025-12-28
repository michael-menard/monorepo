# Story wish-1010: Drag-and-Drop Priority Reorder

## Status

Draft

## Story

**As a** user,
**I want** to drag and drop wishlist items to reorder them,
**so that** I can prioritize items by their position in the gallery.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem with sortOrder)
- **wish-1002**: API Endpoints (add reorder endpoint)
- **wish-1000**: Gallery Page (where drag-drop is integrated)
- **wish-1001**: Card Component (wrap with sortable)

## Acceptance Criteria

1. Items can be dragged to new positions in gallery
2. Visual feedback during drag (ghost image, drop zone highlight)
3. Position saved immediately on drop
4. Undo toast appears after reorder
5. Keyboard alternative: select item, arrow keys, enter to confirm
6. Touch support: long-press (300ms) to initiate drag
7. Auto-save persists order to backend
8. Optimistic update for instant feedback

## Tasks / Subtasks

- [ ] **Task 1: Install dnd-kit** (AC: 1)
  - [ ] Add `@dnd-kit/core` and `@dnd-kit/sortable` to main-app
  - [ ] Verify no conflicts with existing packages

- [ ] **Task 2: Create Sortable Gallery Wrapper** (AC: 1, 2)
  - [ ] Create `components/wishlist/SortableGallery.tsx`
  - [ ] Wrap GalleryGrid with DndContext
  - [ ] Make WishlistCard sortable with useSortable hook

- [ ] **Task 3: Visual Feedback** (AC: 2)
  - [ ] Ghost/preview during drag
  - [ ] Drop zone highlighting
  - [ ] Drag handle indicator on cards

- [ ] **Task 4: Save Reorder** (AC: 3, 7, 8)
  - [ ] Create PATCH /api/wishlist/reorder endpoint
  - [ ] Optimistic update on drop
  - [ ] Revert on API error

- [ ] **Task 5: Undo Toast** (AC: 4)
  - [ ] Show toast: "Priority updated"
  - [ ] Undo action reverts to previous order
  - [ ] 5-second window for undo

- [ ] **Task 6: Keyboard Support** (AC: 5)
  - [ ] Tab to focus card
  - [ ] Space/Enter to select for moving
  - [ ] Arrow keys to move
  - [ ] Enter to confirm, Escape to cancel

- [ ] **Task 7: Touch Support** (AC: 6)
  - [ ] Long-press detection (300ms)
  - [ ] Touch sensors for dnd-kit
  - [ ] Prevent scroll during drag

## Dev Notes

### Package Installation

```bash
pnpm --filter main-app add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Sortable Gallery Implementation

```typescript
// components/wishlist/SortableGallery.tsx
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
} from '@dnd-kit/sortable'

interface SortableGalleryProps {
  items: WishlistItem[]
  onReorder: (oldIndex: number, newIndex: number) => void
  renderItem: (item: WishlistItem) => React.ReactNode
}

export function SortableGallery({ items, onReorder, renderItem }: SortableGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // Long-press delay
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      onReorder(oldIndex, newIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(item => item.id)}
        strategy={rectSortingStrategy}
      >
        <GalleryGrid>
          {items.map(item => (
            <SortableWishlistCard key={item.id} item={item}>
              {renderItem(item)}
            </SortableWishlistCard>
          ))}
        </GalleryGrid>
      </SortableContext>
    </DndContext>
  )
}
```

### Sortable Card Wrapper

```typescript
// components/wishlist/SortableWishlistCard.tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableWishlistCardProps {
  item: WishlistItem
  children: React.ReactNode
}

export function SortableWishlistCard({ item, children }: SortableWishlistCardProps) {
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
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag Handle */}
      <div
        className="absolute top-2 left-2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  )
}
```

### Reorder API Endpoint

```typescript
// apps/api/endpoints/wishlist/reorder/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserId(event)
  const { itemIds } = JSON.parse(event.body!) as { itemIds: string[] }

  // Update sortOrder for each item
  await db.transaction(async tx => {
    for (let i = 0; i < itemIds.length; i++) {
      await tx
        .update(wishlistItems)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(wishlistItems.id, itemIds[i]),
            eq(wishlistItems.userId, userId)
          )
        )
    }
  })

  return { statusCode: 200, body: JSON.stringify({ success: true }) }
}
```

### RTK Query Mutation

```typescript
// Add to wishlistApi
reorderWishlist: builder.mutation<void, string[]>({
  query: (itemIds) => ({
    url: '/wishlist/reorder',
    method: 'PATCH',
    body: { itemIds },
  }),
  // Optimistic update
  async onQueryStarted(itemIds, { dispatch, queryFulfilled, getState }) {
    // Store previous order for undo
    const previousItems = selectWishlistItems(getState())

    // Optimistically update cache
    const patchResult = dispatch(
      wishlistApi.util.updateQueryData('getWishlist', undefined, draft => {
        const reordered = itemIds.map(id =>
          draft.items.find(item => item.id === id)!
        )
        draft.items = reordered
      })
    )

    try {
      await queryFulfilled
    } catch {
      // Revert on error
      patchResult.undo()
    }
  },
  invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
}),
```

### Undo Toast

```typescript
// In gallery component
const handleReorder = async (oldIndex: number, newIndex: number) => {
  const newOrder = arrayMove(items, oldIndex, newIndex)
  const itemIds = newOrder.map(item => item.id)
  const previousOrder = items.map(item => item.id)

  // Optimistic update happens via RTK Query

  toast({
    title: 'Priority updated',
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={() => reorderWishlist(previousOrder)}
      >
        Undo
      </Button>
    ),
    duration: 5000,
  })

  await reorderWishlist(itemIds)
}
```

### Dependencies

- wish-1000: Gallery page (where drag-drop is used)
- wish-1002: Add reorder endpoint
- @dnd-kit packages

## Testing

- [ ] Drag and drop works with mouse
- [ ] Drag and drop works with touch (long-press)
- [ ] Keyboard reordering works
- [ ] Visual feedback during drag
- [ ] Order persists after page refresh
- [ ] Undo reverts to previous order
- [ ] Optimistic update provides instant feedback
- [ ] Error reverts to previous order

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
