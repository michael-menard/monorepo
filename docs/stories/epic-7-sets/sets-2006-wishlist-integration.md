# Story sets-2006: Wishlist "Got It" Integration

## Status

Draft

## Consolidates

- sets-1017: Wishlist "Got It" Integration
- sets-1020: Duplicate Set Detection

## Story

**As a** user,
**I want** to move items from my Wishlist to my Sets collection,
**So that** I can track when I've acquired a wanted set.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - Wishlist Integration, Interaction Patterns > Same Set Different Purchase

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2002**: Add Set Flow
- **Epic 6: Wishlist** (cross-epic dependency - must be implemented)

## Pre-Conditions

**This story is conditional on Wishlist (Epic 6) being implemented.**

Before implementing:
- [ ] Verify Wishlist API exists (GET /api/wishlist, DELETE /api/wishlist/:id)
- [ ] Verify Wishlist "Got it" action is stubbed or ready for integration
- [ ] If Wishlist not ready, defer this story

## Acceptance Criteria

### Got It Flow

1. [ ] "Got it" action on Wishlist item triggers integration
2. [ ] Modal pre-fills data from Wishlist item
3. [ ] User enters purchase details (price, tax, shipping, date, quantity)
4. [ ] User selects build status
5. [ ] Atomic transaction: Create Set, then delete Wishlist item
6. [ ] Sets `wishlistItemId` for traceability
7. [ ] Success toast with "View" and "Undo" options
8. [ ] "View" navigates to Sets gallery, highlights new item
9. [ ] "Undo" removes from Sets, restores to Wishlist

### Duplicate Detection

10. [ ] On add, check if setNumber already exists in collection
11. [ ] If duplicate found, show choice dialog
12. [ ] Option 1: Add to existing quantity (no separate purchase tracking)
13. [ ] Option 2: Add as new entry (separate purchase details)
14. [ ] Choice is clear about trade-offs

## Tasks / Subtasks

### Task 1: Create "Got it" Transaction Endpoint (AC: 1, 5, 6)

- [ ] Create `apps/api/endpoints/wishlist/got-it/handler.ts`
- [ ] POST /api/wishlist/:id/got-it
- [ ] Accept purchase details in body
- [ ] Transaction: create Set with wishlistItemId, delete Wishlist item
- [ ] Rollback on failure
- [ ] Copy images from Wishlist to Set

### Task 2: Create Undo Endpoint (AC: 9)

- [ ] Create `apps/api/endpoints/sets/undo-got-it/handler.ts`
- [ ] POST /api/sets/:id/undo-got-it
- [ ] Verify set has wishlistItemId
- [ ] Transaction: restore Wishlist item, delete Set
- [ ] Time-limited availability (track in session/cache)

### Task 3: Create Duplicate Check Endpoint (AC: 10-14)

- [ ] Create `apps/api/endpoints/sets/check-duplicate/handler.ts`
- [ ] GET /api/sets/check-duplicate?setNumber=xxx
- [ ] Returns existing set(s) if found

### Task 4: Create GotItModal Component (AC: 2-4)

- [ ] Pre-filled from Wishlist item data
- [ ] Purchase details form
- [ ] Build status selector
- [ ] Quantity input
- [ ] Confirm button

### Task 5: Create DuplicateSetDialog (AC: 11-14)

- [ ] Shows existing set info
- [ ] Two clear options with explanations
- [ ] Cancel to go back

### Task 6: Implement Success Navigation (AC: 7, 8)

- [ ] Toast with View and Undo actions
- [ ] Navigate to Sets gallery
- [ ] Scroll to and highlight new item

### Task 7: Integrate with Wishlist UI

- [ ] Wire up "Got it" button in Wishlist
- [ ] Coordinate with Epic 6

## Dev Notes

### Got It Transaction Endpoint

```typescript
// apps/api/endpoints/wishlist/got-it/handler.ts
import { GotItRequestSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const wishlistItemId = event.pathParameters?.id
  const body = GotItRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Fetch wishlist item
  const wishlistItem = await getWishlistItemById(wishlistItemId)
  if (!wishlistItem || wishlistItem.userId !== userId) {
    return notFound()
  }

  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Create set from wishlist data + purchase details
    const [set] = await tx.insert(sets).values({
      userId,
      title: wishlistItem.title,
      setNumber: wishlistItem.setNumber,
      store: wishlistItem.store,
      sourceUrl: wishlistItem.sourceUrl,
      pieceCount: wishlistItem.pieceCount,
      releaseDate: wishlistItem.releaseDate,
      theme: wishlistItem.theme,
      tags: wishlistItem.tags,
      isBuilt: body.isBuilt ?? false,
      quantity: body.quantity ?? 1,
      purchasePrice: body.purchasePrice,
      tax: body.tax,
      shipping: body.shipping,
      purchaseDate: body.purchaseDate ?? new Date().toISOString(),
      wishlistItemId: wishlistItemId, // Traceability
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning()

    // Copy images from wishlist to set
    const wishlistImages = await tx.select()
      .from(wishlistItemImages)
      .where(eq(wishlistItemImages.wishlistItemId, wishlistItemId))

    if (wishlistImages.length > 0) {
      await tx.insert(setImages).values(
        wishlistImages.map((img, idx) => ({
          setId: set.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          position: idx,
        }))
      )
    }

    // Delete wishlist item
    await tx.delete(wishlistItems).where(eq(wishlistItems.id, wishlistItemId))

    return set
  })

  return created({
    set: result,
    wishlistItemId,
  })
}
```

### GotItRequestSchema

```typescript
export const GotItRequestSchema = z.object({
  purchasePrice: z.number().positive().optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  purchaseDate: z.string().datetime().optional(),
  quantity: z.number().int().min(1).default(1),
  isBuilt: z.boolean().default(false),
})
```

### Undo Endpoint

```typescript
// apps/api/endpoints/sets/undo-got-it/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id

  const set = await getSetById(setId)
  if (!set || set.userId !== userId) {
    return notFound()
  }

  if (!set.wishlistItemId) {
    return badRequest('This set was not created from a wishlist item')
  }

  // Transaction: restore wishlist, delete set
  await db.transaction(async (tx) => {
    // Restore wishlist item
    await tx.insert(wishlistItems).values({
      id: set.wishlistItemId,
      userId,
      title: set.title,
      setNumber: set.setNumber,
      store: set.store,
      sourceUrl: set.sourceUrl,
      pieceCount: set.pieceCount,
      releaseDate: set.releaseDate,
      theme: set.theme,
      tags: set.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Copy images back
    const setImgs = await tx.select()
      .from(setImages)
      .where(eq(setImages.setId, setId))

    if (setImgs.length > 0) {
      await tx.insert(wishlistItemImages).values(
        setImgs.map((img, idx) => ({
          wishlistItemId: set.wishlistItemId,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          position: idx,
        }))
      )
    }

    // Delete set (cascades to images)
    await tx.delete(sets).where(eq(sets.id, setId))
  })

  return success({ restored: true })
}
```

### Duplicate Check Endpoint

```typescript
// apps/api/endpoints/sets/check-duplicate/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setNumber = event.queryStringParameters?.setNumber

  if (!setNumber) {
    return badRequest('setNumber required')
  }

  const existingSets = await db
    .select()
    .from(sets)
    .where(and(
      eq(sets.userId, userId),
      eq(sets.setNumber, setNumber)
    ))

  return success({
    hasDuplicate: existingSets.length > 0,
    existingSets: existingSets.map(s => ({
      id: s.id,
      title: s.title,
      setNumber: s.setNumber,
      quantity: s.quantity,
      purchaseDate: s.purchaseDate,
      purchasePrice: s.purchasePrice,
    })),
  })
}
```

### GotItModal Component

```typescript
interface GotItModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wishlistItem: WishlistItem
}

function GotItModal({ open, onOpenChange, wishlistItem }: GotItModalProps) {
  const [gotIt, { isLoading }] = useGotItMutation()
  const [undoGotIt] = useUndoGotItMutation()
  const { toast, dismiss } = useToast()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: {
      purchasePrice: undefined,
      tax: undefined,
      shipping: undefined,
      purchaseDate: new Date().toISOString().split('T')[0],
      quantity: 1,
      isBuilt: false,
    },
  })

  const onSubmit = async (data: GotItRequest) => {
    try {
      const result = await gotIt({
        wishlistItemId: wishlistItem.id,
        ...data,
      }).unwrap()

      onOpenChange(false)

      // Toast with View and Undo
      const { id: toastId } = toast({
        title: 'Added to Sets!',
        action: (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dismiss(toastId)
                navigate({
                  to: '/sets',
                  search: { highlight: result.set.id },
                })
              }}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await undoGotIt(result.set.id).unwrap()
                dismiss(toastId)
                toast({ title: 'Restored to Wishlist' })
              }}
            >
              Undo
            </Button>
          </div>
        ),
        duration: 10000, // Longer for undo option
      })
    } catch (error) {
      toast({ title: 'Failed to add to Sets', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Got it!</DialogTitle>
          <DialogDescription>
            Add "{wishlistItem.title}" to your collection
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Pre-filled preview */}
            <div className="flex gap-4 p-4 bg-muted rounded-lg">
              {wishlistItem.thumbnail && (
                <img
                  src={wishlistItem.thumbnail}
                  alt={wishlistItem.title}
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div>
                <p className="font-medium">{wishlistItem.title}</p>
                <p className="text-sm text-muted-foreground">
                  #{wishlistItem.setNumber} {wishlistItem.pieceCount && `• ${wishlistItem.pieceCount} pieces`}
                </p>
              </div>
            </div>

            {/* Purchase Details */}
            <PurchaseDetailsFields control={form.control} />

            {/* Quantity and Build Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="quantity"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="isBuilt"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Build Status</FormLabel>
                    <FormControl>
                      <SegmentedControl
                        value={field.value ? 'built' : 'pieces'}
                        onChange={(v) => field.onChange(v === 'built')}
                        options={[
                          { value: 'pieces', label: 'In Pieces' },
                          { value: 'built', label: 'Built' },
                        ]}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add to Collection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### DuplicateSetDialog

```typescript
interface DuplicateSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSet: {
    id: string
    title: string
    setNumber: string
    quantity: number
    purchasePrice?: number
  }
  onAddToQuantity: () => void
  onCreateNew: () => void
}

function DuplicateSetDialog({
  open,
  onOpenChange,
  existingSet,
  onAddToQuantity,
  onCreateNew,
}: DuplicateSetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>You already own this set!</DialogTitle>
          <DialogDescription>
            You have {existingSet.quantity} of Set #{existingSet.setNumber} in your collection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Option 1: Add to quantity */}
          <button
            className="w-full p-4 border rounded-lg text-left hover:bg-muted transition-colors"
            onClick={onAddToQuantity}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Add to existing quantity (+1 = {existingSet.quantity + 1} total)
                </p>
                <p className="text-sm text-muted-foreground">
                  Purchase details won't be tracked separately
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Create new entry */}
          <button
            className="w-full p-4 border rounded-lg text-left hover:bg-muted transition-colors"
            onClick={onCreateNew}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-secondary p-2">
                <Copy className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Add as new entry</p>
                <p className="text-sm text-muted-foreground">
                  Track separate purchase details for this copy
                </p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Highlight New Item

```typescript
// In SetsGalleryPage
const { highlight } = Route.useSearch()

useEffect(() => {
  if (highlight && data?.items) {
    const element = document.getElementById(`set-${highlight}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('ring-2', 'ring-primary', 'animate-pulse')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'animate-pulse')
      }, 2000)
    }
  }
}, [highlight, data])
```

## Testing

### Got It Flow Tests

- [ ] "Got it" button opens modal with pre-filled data
- [ ] Purchase details form validates correctly
- [ ] Submit creates Set and deletes Wishlist item
- [ ] Transaction rollback on failure
- [ ] Toast shows with View and Undo
- [ ] View navigates to Sets and highlights item
- [ ] Undo restores to Wishlist and removes Set
- [ ] wishlistItemId stored for traceability
- [ ] Images copied from Wishlist to Set
- [ ] API test: transaction is atomic

### Duplicate Detection Tests

- [ ] Duplicate check called on submit with setNumber
- [ ] Dialog shows when duplicate found
- [ ] "Add to quantity" increments existing set
- [ ] "Add as new entry" creates separate set
- [ ] Cancel closes dialog without action
- [ ] No dialog when no setNumber provided
- [ ] No dialog when setNumber is unique
- [ ] Toast confirms action taken

## Definition of Done

- [ ] "Got it" flow creates Set from Wishlist atomically
- [ ] Undo functionality works within time window
- [ ] Duplicate detection provides clear choices
- [ ] Cross-epic integration works correctly
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1017, 1020        | Claude |
