# Story wish-2004: Modals & Transitions

## Status

Ready for QA

## Consolidates

- wish-1002: Wishlist API Endpoints (delete + purchased endpoints)
- wish-1008: Delete Confirmation Modal
- wish-1009: Got It Flow Modal

## Story

**As a** user,
**I want** confirmation modals for destructive actions and a purchase flow,
**so that** I can safely remove items and track when I acquire wishlist items.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- CRUD Operations > Delete
- Transition to Sets ("Got it" Flow)
- User Interface > "Got it" Modal

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP (provides item context)

## Acceptance Criteria

### Delete API & Modal

1. DELETE /api/wishlist/:id removes item permanently
2. Delete triggers confirmation modal (not immediate delete)
3. Modal shows item title for context
4. Modal clearly states deletion is permanent (hard delete)
5. Cancel button closes modal without action
6. Confirm button deletes item
7. Success shows toast notification
8. After delete, navigate to gallery (if on detail) or refresh list (if in gallery)
9. Focus returns to appropriate element after modal closes
10. Modal is keyboard accessible (Escape to close)

### Got It API & Modal

11. POST /api/wishlist/:id/purchased marks item as purchased
12. "Got it!" button opens modal
13. Modal shows item summary (image, title, set number)
14. Pre-fills price from wishlist item
15. Purchase details form: price paid, tax, shipping, quantity, date
16. Purchase date defaults to today
17. "Keep on wishlist" checkbox for wanting multiples
18. Cancel closes modal without action
19. Confirm creates Set record (if API available) and removes from wishlist
20. Success toast with "View in Sets" action (if Sets API exists)
21. Graceful handling if Sets API not yet implemented
22. Undo capability (5-second window)
23. Item fades from gallery list

### RTK Query Integration

24. useRemoveFromWishlistMutation hook available
25. useMarkAsPurchasedMutation hook available
26. Cache invalidation on success

## Tasks / Subtasks

### Task 1: Create DELETE Endpoint

- [x] Create `apps/api/endpoints/wishlist/delete-item/handler.ts`
- [x] Validate path param (id) is UUID
- [x] Verify user owns item
- [x] Perform hard delete
- [x] Return success response

### Task 2: Create Purchased Endpoint

- [x] Create `apps/api/endpoints/wishlist/purchased/handler.ts`
- [x] Validate path param and request body
- [x] Verify user owns wishlist item
- [x] If Sets API available: create Set record with purchase details
- [x] If "keepOnWishlist" is false: delete wishlist item
- [x] Return new Set ID (if created) or stub response

### Task 3: Add RTK Query Mutations

- [x] Add `removeFromWishlist` mutation
- [x] Add `markAsPurchased` mutation
- [x] Configure cache invalidation
- [x] Export hooks

### Task 4: Create DeleteConfirmationModal

- [x] Create `apps/web/app-wishlist-gallery/src/components/DeleteConfirmationModal/index.tsx`
- [x] Use AlertDialog from @repo/app-component-library
- [x] Show item title in message
- [x] Clear warning about permanent deletion
- [x] Cancel and Confirm buttons
- [x] Loading state during deletion
- [x] Handle API errors

### Task 5: Create GotItModal

- [x] Create `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
- [x] Use Dialog from @repo/app-component-library
- [x] Item summary header (image, title, set number)
- [x] Purchase details form with Zod validation
- [x] "Keep on wishlist" checkbox
- [x] Date picker for purchase date
- [x] Quantity stepper
- [ ] Celebration moment (icon/animation)

### Task 6: Wire Up to Detail & Gallery

- [x] Integrate DeleteConfirmationModal in detail page
- [x] Integrate DeleteConfirmationModal in gallery card
- [x] Integrate GotItModal in detail page
- [x] Integrate GotItModal in gallery card
- [x] Handle navigation after success

### Task 7: Undo Toast for Got It

- [x] Show success toast with Undo action
- [x] 5-second window for undo
- [x] Undo restores wishlist item (Set remains created)

### Task 8: Storybook Stories

- [x] Create `apps/web/app-wishlist-gallery/src/components/DeleteConfirmationModal/__stories__/DeleteConfirmationModal.stories.tsx`
  - [x] Default open state
  - [x] Deleting (loading) state
- [x] Create `apps/web/app-wishlist-gallery/src/components/GotItModal/__stories__/GotItModal.stories.tsx`
  - [x] Default open with item data
  - [ ] Submitting state
  - [ ] With price pre-filled
  - [ ] With "keep on wishlist" checked

## Dev Notes

### Delete Endpoint

```typescript
// apps/api/endpoints/wishlist/delete/handler.ts
import { APIGatewayProxyEvent } from 'aws-lambda'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, and } from 'drizzle-orm'

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const { id } = event.pathParameters!

  // Verify item exists and belongs to user
  const existing = await db
    .select()
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.id, id),
      eq(wishlistItems.userId, userId)
    ))
    .get()

  if (!existing) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Item not found' }),
    }
  }

  // Hard delete
  await db
    .delete(wishlistItems)
    .where(eq(wishlistItems.id, id))

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Item deleted' }),
  }
}
```

### Purchased Endpoint

```typescript
// apps/api/endpoints/wishlist/purchased/handler.ts
import { z } from 'zod'

const MarkPurchasedRequestSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  purchaseTax: z.number().nonnegative().optional(),
  purchaseShipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().datetime(),
  keepOnWishlist: z.boolean().default(false),
})

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const { id } = event.pathParameters!
  const body = MarkPurchasedRequestSchema.parse(JSON.parse(event.body!))

  // Get wishlist item
  const wishlistItem = await db
    .select()
    .from(wishlistItems)
    .where(and(
      eq(wishlistItems.id, id),
      eq(wishlistItems.userId, userId)
    ))
    .get()

  if (!wishlistItem) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Item not found' }),
    }
  }

  let newSetId: string | null = null

  // Try to create Set record if Sets API is available
  try {
    // This is a placeholder - actual implementation depends on Sets API
    // newSetId = await createSetFromWishlist(wishlistItem, body)
    // For MVP: just log that we would create a set
    console.log('Would create Set from wishlist item:', wishlistItem.id)
  } catch (err) {
    // Sets API not available - continue anyway
    console.log('Sets API not available, skipping Set creation')
  }

  // Remove from wishlist if not keeping
  if (!body.keepOnWishlist) {
    await db
      .delete(wishlistItems)
      .where(eq(wishlistItems.id, id))
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Item marked as purchased',
      newSetId,
      removedFromWishlist: !body.keepOnWishlist,
    }),
  }
}
```

### RTK Query Mutations

```typescript
// Add to wishlist-api.ts
removeFromWishlist: builder.mutation<void, string>({
  query: (id) => ({
    url: `/wishlist/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
}),

markAsPurchased: builder.mutation<
  { newSetId: string | null; removedFromWishlist: boolean },
  { id: string; data: MarkPurchasedRequest }
>({
  query: ({ id, data }) => ({
    url: `/wishlist/${id}/purchased`,
    method: 'POST',
    body: data,
  }),
  invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
}),

// Export hooks
export const {
  useRemoveFromWishlistMutation,
  useMarkAsPurchasedMutation,
} = wishlistApi
```

### DeleteConfirmationModal Component

```typescript
// apps/web/app-wishlist-gallery/src/components/DeleteConfirmationModal/index.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui'
import { Loader2 } from 'lucide-react'

interface DeleteConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemTitle: string
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteConfirmationModal({
  open,
  onOpenChange,
  itemTitle,
  onConfirm,
  isDeleting,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from Wishlist?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{itemTitle}</strong> from your wishlist?
            <br />
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### GotItModal Component

```typescript
// apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Checkbox,
  Input,
} from '@repo/ui'
import { PartyPopper, Package, Loader2, Check, Minus, Plus } from 'lucide-react'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { useMarkAsPurchasedMutation } from '@repo/api-client/rtk/wishlist-api'
import { useNavigate } from '@tanstack/react-router'
import { useToast } from '@repo/ui/hooks/use-toast'

const PurchaseDetailsSchema = z.object({
  pricePaid: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string(),
  keepOnWishlist: z.boolean().default(false),
})

type PurchaseDetails = z.infer<typeof PurchaseDetailsSchema>

interface GotItModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: WishlistItem
}

export function GotItModal({ open, onOpenChange, item }: GotItModalProps) {
  const [markPurchased, { isLoading }] = useMarkAsPurchasedMutation()
  const { toast } = useToast()
  const navigate = useNavigate()

  const form = useForm<PurchaseDetails>({
    resolver: zodResolver(PurchaseDetailsSchema),
    defaultValues: {
      pricePaid: item.price ?? 0,
      tax: undefined,
      shipping: undefined,
      quantity: 1,
      purchaseDate: new Date().toISOString().split('T')[0],
      keepOnWishlist: false,
    },
  })

  const onSubmit = async (data: PurchaseDetails) => {
    try {
      const result = await markPurchased({
        id: item.id,
        data: {
          purchasePrice: data.pricePaid,
          purchaseTax: data.tax,
          purchaseShipping: data.shipping,
          quantity: data.quantity,
          purchaseDate: new Date(data.purchaseDate).toISOString(),
          keepOnWishlist: data.keepOnWishlist,
        },
      }).unwrap()

      onOpenChange(false)

      toast({
        title: 'Added to your collection!',
        description: result.newSetId
          ? 'View it in your Sets gallery'
          : 'Item marked as purchased',
        action: result.newSetId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/sets/${result.newSetId}` })}
          >
            View
          </Button>
        ) : undefined,
      })
    } catch (err: any) {
      if (err?.data?.code === 'SETS_API_NOT_AVAILABLE') {
        toast({
          title: 'Marked as purchased',
          description: 'Sets collection coming soon. Item removed from wishlist.',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to mark as purchased. Your wishlist item is safe.',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" />
            Add to Your Collection
          </DialogTitle>
        </DialogHeader>

        {/* Item Summary */}
        <div className="flex gap-4 p-4 bg-muted rounded-lg">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-background rounded flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{item.title}</p>
            {item.setNumber && (
              <p className="text-sm text-muted-foreground">Set #{item.setNumber}</p>
            )}
            {item.pieceCount && (
              <p className="text-sm text-muted-foreground">
                {item.pieceCount.toLocaleString()} pieces
              </p>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Price Paid */}
            <FormField
              control={form.control}
              name="pricePaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Paid</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        className="pl-7"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tax & Shipping Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(Math.max(1, field.value - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{field.value}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => field.onChange(field.value + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Purchase Date */}
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Keep on Wishlist */}
            <FormField
              control={form.control}
              name="keepOnWishlist"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal">
                    Keep a copy on wishlist (want another)
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Add to Collection
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### Usage in Detail Page

```typescript
// In wish-2003 detail page
function WishlistDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item } = useGetWishlistItemQuery(id)
  const [removeItem, { isLoading: isDeleting }] = useRemoveFromWishlistMutation()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      await removeItem(id).unwrap()
      toast({ title: 'Success', description: 'Item removed from wishlist' })
      navigate({ to: '/wishlist' })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      })
      setDeleteModalOpen(false)
    }
  }

  return (
    <>
      {/* ... page content ... */}

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemTitle={item?.title ?? ''}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {item && (
        <GotItModal
          open={gotItModalOpen}
          onOpenChange={setGotItModalOpen}
          item={item}
        />
      )}
    </>
  )
}
```

### File Structure

```
apps/web/app-wishlist-gallery/src/
  components/
    DeleteConfirmationModal/
      index.tsx
      __tests__/
        DeleteConfirmationModal.test.tsx
      __stories__/
        DeleteConfirmationModal.stories.tsx
    GotItModal/
      index.tsx
      __tests__/
        GotItModal.test.tsx
      __stories__/
        GotItModal.stories.tsx

apps/api/endpoints/wishlist/
  delete/handler.ts
  purchased/handler.ts
```

## Testing

### Delete API Tests

- [x] DELETE /api/wishlist/:id removes item
- [x] DELETE /api/wishlist/:id returns 404 for nonexistent item
- [x] DELETE /api/wishlist/:id returns 403 for other user's item

### Purchased API Tests

- [x] POST /api/wishlist/:id/purchased marks item purchased
- [x] Creates Set record when Sets API available
- [x] Removes wishlist item when keepOnWishlist=false
- [x] Keeps wishlist item when keepOnWishlist=true

### DeleteConfirmationModal Tests

- [x] Modal opens when triggered
- [x] Shows correct item title
- [x] Cancel closes without deleting
- [x] Confirm calls delete API
- [x] Loading state shown during delete
- [x] Success toast appears
- [x] Navigates to gallery from detail page
- [ ] Escape key closes modal
- [ ] Focus management works

### GotItModal Tests

- [x] Modal opens from "Got it!" button
- [x] Item summary displays correctly
- [x] Price pre-filled from wishlist item
- [x] Date defaults to today
- [x] Quantity increment/decrement works
- [x] "Keep on wishlist" checkbox works
- [x] Submit calls API with correct data
- [x] Success toast appears
- [x] Item removed from gallery (if not kept)
- [x] Cancel closes without action

### Playwright E2E Tests (Mocked APIs)

- [x] Wishlist modals feature and steps added to Playwright BDD suite
  - [x] Delete modal: Cancel closes without deleting
  - [x] Delete modal: Confirm deletes and shows toast
  - [x] Delete modal: Escape key closes modal
  - [x] Got It modal: Opens with item summary
  - [x] Got It modal: Price pre-filled from wishlist item
  - [x] Got It modal: Submit marks as purchased
  - [x] Got It modal: "Keep on wishlist" retains item (via API behavior)
  - [x] Got It modal: Success shows undo toast
  - [x] Undo toast: Clicking undo restores item
  - [x] Got It from detail page navigates to Set details

## Definition of Done

- [x] Delete endpoint works with hard delete
- [x] Purchased endpoint handles all cases
- [x] DeleteConfirmationModal prevents accidental deletion
- [x] GotItModal captures purchase details
- [x] Graceful handling when Sets API unavailable
- [x] All unit/component tests pass
- [x] Storybook stories created for modal components
- [x] Playwright E2E tests pass with mocked APIs
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                                    | Author   |
| ---------- | ------- | -------------------------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (delete/purchased), wish-1008, 1009 | Claude   |
