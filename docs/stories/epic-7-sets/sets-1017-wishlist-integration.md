# Story sets-1017: Wishlist "Got It" Integration

## Status

Draft

## Story

**As a** user,
**I want** to move items from my Wishlist to my Sets collection,
**So that** I can track when I've acquired a wanted set.

## Acceptance Criteria

1. [ ] "Got it" action on Wishlist item triggers integration
2. [ ] Modal pre-fills data from Wishlist item
3. [ ] User enters purchase details (price, tax, shipping, date, quantity)
4. [ ] User selects build status
5. [ ] Atomic transaction: Create Set, then delete Wishlist item
6. [ ] Sets `wishlistItemId` for traceability
7. [ ] Success toast with "View" and "Undo" options
8. [ ] "View" navigates to Sets gallery, highlights new item
9. [ ] "Undo" removes from Sets, restores to Wishlist

## Pre-Conditions

**This story is conditional on Wishlist (Epic 6) being implemented.**

Before implementing:
- [ ] Verify Wishlist API exists
- [ ] Verify Wishlist "Got it" action is stubbed or ready for integration
- [ ] If Wishlist not ready, defer this story

## Tasks

- [ ] **Task 1: Create "Got it" transaction endpoint**
  - [ ] POST /api/wishlist/:id/got-it
  - [ ] Accepts purchase details in body
  - [ ] Creates Set with wishlistItemId reference
  - [ ] Deletes Wishlist item on success
  - [ ] Rollback on failure

- [ ] **Task 2: Create GotItModal component**
  - [ ] Pre-filled from Wishlist item data
  - [ ] Purchase details form
  - [ ] Build status selector
  - [ ] Quantity input
  - [ ] Confirm button

- [ ] **Task 3: Implement undo functionality**
  - [ ] Toast with Undo button
  - [ ] Undo endpoint: delete Set, restore Wishlist item
  - [ ] Time-limited (5 seconds or until dismissed)

- [ ] **Task 4: Success navigation**
  - [ ] Navigate to Sets gallery
  - [ ] Scroll to and highlight new item
  - [ ] Brief animation (2 seconds)

- [ ] **Task 5: Integrate with Wishlist UI**
  - [ ] Wire up "Got it" button in Wishlist
  - [ ] (Coordinate with Epic 6)

## Dev Notes

### Transaction Endpoint

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
      .from(wishlistImages)
      .where(eq(wishlistImages.wishlistItemId, wishlistItemId))

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
    // Restore wishlist item (simplified - may need full data)
    await tx.insert(wishlistItems).values({
      id: set.wishlistItemId,
      userId,
      title: set.title,
      setNumber: set.setNumber,
      // ... other fields
    })

    // Copy images back
    // ...

    // Delete set
    await tx.delete(sets).where(eq(sets.id, setId))
  })

  return success({ restored: true })
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
                await undoGotIt(result.set.id)
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
              <img
                src={wishlistItem.thumbnail}
                alt={wishlistItem.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div>
                <p className="font-medium">{wishlistItem.title}</p>
                <p className="text-sm text-muted-foreground">
                  #{wishlistItem.setNumber} • {wishlistItem.pieceCount} pieces
                </p>
              </div>
            </div>

            {/* Purchase Details */}
            <PurchaseDetailsFields control={form.control} />

            {/* Quantity and Build Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField name="quantity" control={form.control} render={...} />
              <FormField name="isBuilt" control={form.control} render={...} />
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

## Dependencies

- sets-1000: Database Schema
- sets-1004: Create Set Endpoint
- **Epic 6: Wishlist** (must be implemented)

## References

- PRD: docs/prd/epic-7-sets-gallery.md (Wishlist Integration)
- PRD: "The 'Got it' flow must be atomic"
