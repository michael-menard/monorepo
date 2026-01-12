# Story wish-2005: UX Polish

## Status

Ready for QA

## Scope Note

This story focuses on **wishlist-specific** UX polish features:
- Drag-and-drop priority reordering for wishlist items
- Empty state messaging tailored to wishlist scenarios
- Loading/error states for wishlist pages

**General gallery package enhancements have been moved to separate stories:**
- **glry-1001**: Custom filters via children prop (supports domain-specific filters in all galleries)
- **glry-1002**: Multi-column sorting (advanced sorting across all galleries)

These gallery stories will benefit all galleries (wishlist, instructions, sets, inspiration) and should be implemented before or alongside this story for maximum reusability.

## Consolidates

- wish-1002: Wishlist API Endpoints (reorder endpoint)
- wish-1010: Drag-and-Drop Priority Reorder
- wish-1011: Empty States

## Story

**As a** user,
**I want** polished user experience features,
**so that** I can efficiently organize my wishlist with intuitive interactions and clear feedback.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- Interaction Patterns > Drag-and-Drop Priority
- User Interface > Empty States
- Loading & Error States

## Dependencies

- **wish-2001**: Wishlist Gallery MVP (gallery page context)
- **wish-2002**: Add Item Flow (empty state CTA)
- **wish-2003**: Detail & Edit Pages
- **wish-2004**: Modals & Transitions

**Optional (for enhanced UX):**
- **glry-1001**: Custom Filters (enables wishlist-specific filtering UI)
- **glry-1002**: Multi-Column Sort (enables advanced sort combinations)

## Acceptance Criteria

### Drag-and-Drop Reorder

1. not supported in the datatable view
2. Items can be dragged to new positions in gallery
3. Visual feedback during drag (ghost image, drop zone highlight)
4. Position saved immediately on drop
5. Undo toast appears after reorder (5-second window)
6. Keyboard alternative: select item, arrow keys, enter to confirm
7. Touch support: long-press (300ms) to initiate drag
8. PATCH /api/wishlist/reorder persists order
9. Optimistic update for instant feedback

### Empty States

9. Empty wishlist (new user): illustration and "Add Item" CTA
10. Empty wishlist (all purchased): celebration message
11. No search/filter results: "No matches" with clear filters button
12. Empty states use GalleryEmptyState from @repo/gallery
13. All empty states have appropriate ARIA labels

### Loading & Error States

14. Gallery shows skeleton while loading
15. Detail page shows skeleton while loading
16. Error states show retry option
17. Network error toast on API failures

## Tasks / Subtasks

### Task 1: Create Reorder Endpoint

- [ ] Create `apps/api/endpoints/wishlist/reorder/handler.ts`
- [ ] Accept array of item IDs in new order
- [ ] Update sortOrder for each item in transaction
- [ ] Validate user owns all items
- [ ] Return success response

### Task 2: Add RTK Query Mutation

- [ ] Add `reorderWishlist` mutation to wishlist-api.ts
- [ ] Configure optimistic update
- [ ] Revert on error
- [ ] Export hook

### Task 3: Install dnd-kit

- [ ] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to main-app
- [ ] Verify no conflicts with existing packages

### Task 4: Create Sortable Gallery

- [ ] Create `components/wishlist/SortableGallery.tsx`
- [ ] Wrap GalleryGrid with DndContext
- [ ] Configure sensors (pointer, touch, keyboard)
- [ ] Handle drag end event

### Task 5: Create Sortable Card Wrapper

- [ ] Create `components/wishlist/SortableWishlistCard.tsx`
- [ ] Apply useSortable hook
- [ ] Visual feedback during drag
- [ ] Drag handle indicator

### Task 6: Undo Toast

- [ ] Show toast after reorder: "Priority updated"
- [ ] Include Undo action button
- [ ] 5-second window for undo
- [ ] Undo reverts to previous order

### Task 7: Create Empty State Components

- [ ] Create `components/wishlist/WishlistEmptyStates.tsx`
- [ ] NewUserEmptyState component
- [ ] AllPurchasedEmptyState component
- [ ] NoResultsEmptyState component
- [ ] ARIA labels for all states

### Task 8: Integrate Empty States

- [ ] Detect empty state type in gallery
- [ ] Render appropriate empty state
- [ ] Wire up CTAs (Add Item, Clear Filters)

### Task 9: Loading States

- [ ] Gallery skeleton (grid of card skeletons)
- [ ] Detail page skeleton
- [ ] Form skeleton

## Dev Notes

### Reorder Endpoint

```typescript
// apps/api/endpoints/wishlist/reorder/handler.ts
import { z } from 'zod'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, and, inArray } from 'drizzle-orm'

const ReorderRequestSchema = z.object({
  itemIds: z.array(z.string().uuid()),
})

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const { itemIds } = ReorderRequestSchema.parse(JSON.parse(event.body!))

  // Verify all items belong to user
  const items = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.userId, userId),
      inArray(wishlistItems.id, itemIds)
    ))

  if (items.length !== itemIds.length) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Invalid items' }),
    }
  }

  // Update sortOrder in transaction
  await db.transaction(async (tx) => {
    for (let i = 0; i < itemIds.length; i++) {
      await tx
        .update(wishlistItems)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(wishlistItems.id, itemIds[i]))
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  }
}
```

### RTK Query Mutation with Optimistic Update

```typescript
// Add to wishlist-api.ts
reorderWishlist: builder.mutation<void, string[]>({
  query: (itemIds) => ({
    url: '/wishlist/reorder',
    method: 'PATCH',
    body: { itemIds },
  }),
  async onQueryStarted(itemIds, { dispatch, queryFulfilled }) {
    // Optimistically update the cache
    const patchResult = dispatch(
      wishlistApi.util.updateQueryData('getWishlist', {}, (draft) => {
        if (!draft.items) return
        const reorderedItems = itemIds
          .map(id => draft.items.find(item => item.id === id))
          .filter(Boolean) as WishlistItem[]
        draft.items = reorderedItems
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

### SortableGallery Component

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
  arrayMove,
} from '@dnd-kit/sortable'
import { GalleryGrid } from '@repo/gallery'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'

interface SortableGalleryProps {
  items: WishlistItem[]
  onReorder: (items: WishlistItem[]) => void
  renderItem: (item: WishlistItem, index: number) => React.ReactNode
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
      const newItems = arrayMove(items, oldIndex, newIndex)
      onReorder(newItems)
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
          {items.map((item, index) => renderItem(item, index))}
        </GalleryGrid>
      </SortableContext>
    </DndContext>
  )
}
```

### SortableWishlistCard Component

```typescript
// components/wishlist/SortableWishlistCard.tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@repo/ui/lib/utils'

interface SortableWishlistCardProps {
  id: string
  children: React.ReactNode
}

export function SortableWishlistCard({ id, children }: SortableWishlistCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'opacity-50 z-50'
      )}
      {...attributes}
    >
      {/* Drag Handle */}
      <div
        className="absolute top-2 left-2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 rounded"
        {...listeners}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  )
}
```

### Empty State Components

```typescript
// components/wishlist/WishlistEmptyStates.tsx
import { GalleryEmptyState } from '@repo/gallery'
import { Heart, PartyPopper, Search } from 'lucide-react'

interface EmptyStateProps {
  onAddItem: () => void
  onClearFilters?: () => void
  filterSummary?: string
}

export function NewUserEmptyState({ onAddItem }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={Heart}
      title="Nothing on your wishlist yet"
      description="Start adding sets you're dreaming about!"
      action={{
        label: 'Add Item',
        onClick: onAddItem,
      }}
      aria-label="Your wishlist is empty. Click Add Item to start building your wishlist."
    />
  )
}

export function AllPurchasedEmptyState({ onAddItem }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={PartyPopper}
      title="You got everything on your list!"
      description="Time to dream bigger."
      action={{
        label: 'Add More',
        onClick: onAddItem,
      }}
      aria-label="Congratulations! You've purchased all items. Click Add More to add new items."
    />
  )
}

export function NoResultsEmptyState({ onClearFilters, filterSummary }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={Search}
      title="No wishlist items match your filters"
      description={filterSummary || 'Try adjusting your search or filters.'}
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters!,
        variant: 'outline',
      }}
      aria-label="No items match your filters. Click Clear Filters to see all items."
    />
  )
}
```

### Gallery Integration with Reorder

```typescript
// In wishlist gallery page
function WishlistGalleryPage() {
  const navigate = useNavigate()
  const { state, updateUrl, clearFilters } = useGalleryUrl()
  const { data, isLoading } = useGetWishlistQuery(state)
  const [reorderWishlist] = useReorderWishlistMutation()
  const { toast } = useToast()

  const [localItems, setLocalItems] = useState<WishlistItem[]>([])
  const [previousOrder, setPreviousOrder] = useState<string[]>([])

  useEffect(() => {
    if (data?.items) {
      setLocalItems(data.items)
    }
  }, [data?.items])

  const hasFilters = state.search || state.tags?.length || state.store

  const handleReorder = async (newItems: WishlistItem[]) => {
    const prevIds = localItems.map(i => i.id)
    const newIds = newItems.map(i => i.id)

    // Update local state immediately
    setLocalItems(newItems)
    setPreviousOrder(prevIds)

    // Show undo toast
    toast({
      title: 'Priority updated',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUndo(prevIds)}
        >
          Undo
        </Button>
      ),
      duration: 5000,
    })

    // Persist to backend
    await reorderWishlist(newIds)
  }

  const handleUndo = async (previousIds: string[]) => {
    const restoredItems = previousIds
      .map(id => localItems.find(i => i.id === id))
      .filter(Boolean) as WishlistItem[]
    setLocalItems(restoredItems)
    await reorderWishlist(previousIds)
  }

  const getEmptyStateType = () => {
    if (!data || localItems.length > 0) return null
    if (!hasFilters && data.pagination.total === 0) return 'new-user'
    if (hasFilters) return 'no-results'
    return 'new-user'
  }

  const emptyStateType = getEmptyStateType()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ... header and filters ... */}

      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : emptyStateType === 'new-user' ? (
        <NewUserEmptyState onAddItem={() => navigate({ to: '/wishlist/add' })} />
      ) : emptyStateType === 'all-purchased' ? (
        <AllPurchasedEmptyState onAddItem={() => navigate({ to: '/wishlist/add' })} />
      ) : emptyStateType === 'no-results' ? (
        <NoResultsEmptyState
          onClearFilters={clearFilters}
          filterSummary={getFilterSummary(state)}
        />
      ) : (
        <SortableGallery
          items={localItems}
          onReorder={handleReorder}
          renderItem={(item) => (
            <SortableWishlistCard key={item.id} id={item.id}>
              <WishlistCard
                item={item}
                onView={(id) => navigate({ to: `/wishlist/${id}` })}
                onEdit={(id) => navigate({ to: `/wishlist/${id}/edit` })}
                onRemove={(id) => handleRemove(id)}
                onGotIt={(id) => handleGotIt(id)}
              />
            </SortableWishlistCard>
          )}
        />
      )}
    </div>
  )
}
```

### Skeleton Components

```typescript
// GallerySkeleton from @repo/gallery should handle this
// Detail page skeleton:
function DetailSkeleton() {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Skeleton className="h-8 w-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

### File Structure

```
apps/web/main-app/src/components/wishlist/
  SortableGallery.tsx
  SortableWishlistCard.tsx
  WishlistEmptyStates.tsx

apps/api/endpoints/wishlist/
  reorder/handler.ts
```

## Testing

### Reorder API Tests

- [ ] PATCH /api/wishlist/reorder updates sortOrder
- [ ] Returns 403 if item doesn't belong to user
- [ ] Handles empty array gracefully
- [ ] Transaction ensures all-or-nothing update

### Drag-and-Drop Tests

- [ ] Drag and drop works with mouse
- [ ] Drag and drop works with touch (long-press)
- [ ] Keyboard reordering works (Tab, Space, Arrow, Enter)
- [ ] Visual feedback during drag
- [ ] Order persists after page refresh
- [ ] Undo reverts to previous order
- [ ] Optimistic update provides instant feedback
- [ ] Error reverts to previous order

### Empty State Tests

- [ ] New user empty state shows for empty wishlist
- [ ] "Add Item" button navigates to add page
- [ ] No results empty state shows with filters active
- [ ] "Clear Filters" button resets all filters
- [ ] ARIA labels announced by screen readers

### Loading State Tests

- [ ] Gallery skeleton shows while loading
- [ ] Detail page skeleton shows while loading
- [ ] Skeletons have appropriate count/layout

## Definition of Done

- [ ] Drag-and-drop reordering works on all platforms
- [ ] Undo functionality works within 5 seconds
- [ ] Empty states cover all scenarios
- [ ] Loading states provide good feedback
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                            | Author   |
| ---------- | ------- | ------------------------------------------------------ | -------- |
| 2025-12-27 | 0.1     | Initial draft                                          | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (reorder), wish-1010, 1011 | Claude   |
| 2025-12-28 | 0.3     | Scope clarified: moved gallery enhancements to glry-1001, glry-1002 | SM Agent |
