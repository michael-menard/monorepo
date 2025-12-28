# Story wish-2004: Modals & Transitions

## GitHub Issue

- Issue: #TBD
- URL: https://github.com/michael-menard/monorepo/issues/TBD
- Status: Todo

## Status

Approved

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

## Epic Context

This is **Story 4 of Epic 6: Wishlist Gallery**.

## Blocked By

- **wish-2000**: Database Schema & Shared Types (must be complete - provides core types)
- **wish-2001**: Wishlist Gallery MVP (must be complete - provides gallery context for modals)
- **wish-2003**: Detail & Edit Pages (must be complete - provides detail page where modals are triggered)

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP (provides item context)

## Technical Requirements

### Type System

- All types MUST be derived from Zod schemas using `z.infer<>`
- NO TypeScript interfaces - use Zod schemas exclusively
- Import shared types from `@repo/api-client/schemas/wishlist`

### Form Architecture

- Use react-hook-form with zodResolver for all forms
- Validation mode: `mode: 'onBlur'` for optimal UX
- All form schemas defined with Zod

### Target Application

- app-wishlist-gallery standalone app (when created)
- Integration with main-app detail pages

## UX Requirements

### Modal Design

- **Overlay**: Semi-transparent backdrop (bg-black/50) with blur effect
- **Focus Trap**: Focus must be trapped within modal while open
- **Escape to Close**: Pressing Escape key closes modal (unless in loading state)
- **Click Outside**: Clicking overlay closes modal (configurable per modal type)
- **Centered Positioning**: Modals centered vertically and horizontally
- **Responsive Width**: Max-width constraints with mobile-friendly sizing

### Interaction Design

- **Keyboard Navigation**: Full Tab/Shift+Tab navigation within modal
- **Default Focus**: Focus moves to first interactive element on open
- **Focus Return**: Focus returns to trigger element on close
- **Transitions/Animations**:
  - Modal enter: fade-in + scale-up (150ms ease-out)
  - Modal exit: fade-out + scale-down (100ms ease-in)
  - Item removal: fade-out animation before removing from list

### Feedback & States

- **Loading States**: Spinner on action buttons during API calls
- **Button Disable**: Disable buttons during loading to prevent double-submit
- **Confirmation Flows**: Clear visual hierarchy for destructive vs safe actions
- **Success Feedback**: Toast notifications for successful actions
- **Celebration Moment**: Subtle animation/icon for "Got It" success

### Error Handling UX

- **Toast Notifications**: Use @repo/ui toast system for all feedback
- **Error Recovery**: Clear messaging about what went wrong
- **Retry Options**: Where appropriate, offer retry capability
- **Graceful Degradation**: Handle Sets API unavailability gracefully

### Accessibility (WCAG 2.1 AA)

- **Focus Management**: Proper focus trap and return
- **aria-modal="true"**: Required on modal containers
- **role="dialog"** or **role="alertdialog"**: Appropriate role per modal type
- **aria-labelledby**: Modal title connected to dialog
- **aria-describedby**: Modal description connected to dialog
- **Screen Reader Announcements**: Live regions for dynamic content updates
- **Reduced Motion**: Respect prefers-reduced-motion for animations
- **Color Contrast**: All text meets 4.5:1 ratio minimum

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

### UX & Accessibility

27. Both modals trap focus while open (Tab cycles within modal)
28. Escape key closes modal and returns focus to trigger element
29. Modal has appropriate ARIA attributes (aria-modal, role, aria-labelledby)
30. Screen readers announce modal title when opened
31. Loading states prevent interaction during API calls
32. Destructive action button uses destructive/danger styling
33. Animations respect prefers-reduced-motion media query
34. All interactive elements have visible focus indicators
35. Color contrast meets WCAG 2.1 AA (4.5:1 minimum)
36. Toast notifications are announced to screen readers

### E2E Tests

37. E2E test: Delete modal opens from gallery card action menu
38. E2E test: Delete modal opens from detail page
39. E2E test: Cancel closes delete modal without deletion
40. E2E test: Confirm deletes item and shows success toast
41. E2E test: Got It modal opens and displays item summary
42. E2E test: Got It form submission marks item as purchased
43. E2E test: Keyboard navigation works within modals
44. E2E test: Focus returns to trigger after modal closes

## Tasks / Subtasks

### Task 1: Create DELETE Endpoint

- [ ] Create `apps/api/endpoints/wishlist/delete/handler.ts`
- [ ] Validate path param (id) is UUID
- [ ] Verify user owns item
- [ ] Perform hard delete
- [ ] Return success response

### Task 2: Create Purchased Endpoint

- [ ] Create `apps/api/endpoints/wishlist/purchased/handler.ts`
- [ ] Validate path param and request body
- [ ] Verify user owns wishlist item
- [ ] If Sets API available: create Set record with purchase details
- [ ] If "keepOnWishlist" is false: delete wishlist item
- [ ] Return new Set ID (if created) or stub response

### Task 3: Add RTK Query Mutations

- [ ] Add `removeFromWishlist` mutation
- [ ] Add `markAsPurchased` mutation
- [ ] Configure cache invalidation
- [ ] Export hooks

### Task 4: Create DeleteConfirmationModal

- [ ] Create `apps/web/main-app/src/components/wishlist/DeleteConfirmationModal.tsx`
- [ ] Use AlertDialog from @repo/ui (provides built-in accessibility)
- [ ] Show item title in message
- [ ] Clear warning about permanent deletion
- [ ] Cancel and Confirm buttons with proper styling (destructive variant for confirm)
- [ ] Loading state during deletion (spinner, disabled buttons)
- [ ] Handle API errors with toast notifications
- [ ] Ensure focus trap is active while modal is open
- [ ] Implement Escape key to close (disabled during loading)
- [ ] Add aria-describedby linking to warning message
- [ ] Ensure focus returns to trigger element on close
- [ ] Add prefers-reduced-motion support for animations

### Task 5: Create GotItModal

- [ ] Create `apps/web/main-app/src/components/wishlist/GotItModal.tsx`
- [ ] Use Dialog from @repo/ui (provides built-in accessibility)
- [ ] Item summary header (image, title, set number)
- [ ] Purchase details form with Zod validation (react-hook-form + zodResolver, mode: 'onBlur')
- [ ] "Keep on wishlist" checkbox with accessible label
- [ ] Date picker for purchase date (keyboard accessible)
- [ ] Quantity stepper with +/- buttons (keyboard accessible)
- [ ] Celebration moment (PartyPopper icon with subtle animation)
- [ ] Loading state during submission (spinner, disabled buttons)
- [ ] Focus trap active while modal is open
- [ ] Escape key to close (disabled during loading)
- [ ] aria-labelledby connected to dialog title
- [ ] Form field labels properly associated with inputs
- [ ] Error messages announced to screen readers
- [ ] Focus returns to trigger element on close
- [ ] Reduced motion: disable celebration animation if preferred

### Task 6: Wire Up to Detail & Gallery

- [ ] Integrate DeleteConfirmationModal in detail page
- [ ] Integrate DeleteConfirmationModal in gallery card action menu
- [ ] Integrate GotItModal in detail page
- [ ] Integrate GotItModal in gallery card action menu
- [ ] Handle navigation after success (gallery refresh or navigate to gallery)
- [ ] Ensure focus management when navigating after modal closes
- [ ] Add fade-out animation for deleted/purchased items in gallery

### Task 7: Undo Toast for Got It

- [ ] Show success toast with Undo action button
- [ ] 5-second window for undo (visible countdown optional)
- [ ] Undo restores wishlist item, removes Set (if created)
- [ ] Toast announced to screen readers via live region
- [ ] Undo button keyboard accessible

### Task 8: E2E Tests (Playwright)

- [ ] Create `apps/web/playwright/tests/wishlist-modals.spec.ts`
- [ ] Set up API mocking for wishlist endpoints
- [ ] Test: Delete modal opens from gallery card action menu
- [ ] Test: Delete modal opens from detail page delete button
- [ ] Test: Cancel button closes delete modal without API call
- [ ] Test: Confirm button calls DELETE API and shows success toast
- [ ] Test: Got It modal opens and displays item summary
- [ ] Test: Got It form pre-fills price from wishlist item
- [ ] Test: Got It form submission calls purchased API
- [ ] Test: Keyboard navigation (Tab, Escape) works within modals
- [ ] Test: Focus returns to trigger element after modal closes
- [ ] Test: Error states display appropriate toast messages

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
// components/wishlist/DeleteConfirmationModal.tsx
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
// components/wishlist/GotItModal.tsx
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
apps/web/main-app/src/components/wishlist/
  DeleteConfirmationModal.tsx
  GotItModal.tsx

apps/api/endpoints/wishlist/
  delete/handler.ts
  purchased/handler.ts
```

## Testing

### Delete API Tests

- [ ] DELETE /api/wishlist/:id removes item
- [ ] DELETE /api/wishlist/:id returns 404 for nonexistent item
- [ ] DELETE /api/wishlist/:id returns 403 for other user's item

### Purchased API Tests

- [ ] POST /api/wishlist/:id/purchased marks item purchased
- [ ] Creates Set record when Sets API available (future)
- [ ] Removes wishlist item when keepOnWishlist=false
- [ ] Keeps wishlist item when keepOnWishlist=true

### DeleteConfirmationModal Tests

- [ ] Modal opens when triggered
- [ ] Shows correct item title
- [ ] Cancel closes without deleting
- [ ] Confirm calls delete API
- [ ] Loading state shown during delete
- [ ] Success toast appears
- [ ] Navigates to gallery from detail page
- [ ] Escape key closes modal
- [ ] Focus management works

### GotItModal Tests

- [ ] Modal opens from "Got it!" button
- [ ] Item summary displays correctly
- [ ] Price pre-filled from wishlist item
- [ ] Date defaults to today
- [ ] Quantity increment/decrement works
- [ ] "Keep on wishlist" checkbox works
- [ ] Submit calls API with correct data
- [ ] Success toast appears
- [ ] Item removed from gallery (if not kept)
- [ ] Cancel closes without action

## Definition of Done

### Functional

- [ ] Delete endpoint works with hard delete
- [ ] Purchased endpoint handles all cases
- [ ] DeleteConfirmationModal prevents accidental deletion
- [ ] GotItModal captures purchase details
- [ ] Graceful handling when Sets API unavailable

### UX & Accessibility

- [ ] Focus trap works correctly in both modals
- [ ] Escape key closes modals appropriately
- [ ] Focus returns to trigger element on modal close
- [ ] All ARIA attributes properly configured
- [ ] Screen reader announcements verified
- [ ] Animations respect prefers-reduced-motion
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Keyboard navigation fully functional

### Testing & Quality

- [ ] Unit tests pass with adequate coverage
- [ ] E2E tests pass (Playwright)
- [ ] Accessibility audit passed (axe-core)
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] No ESLint warnings

## Change Log

| Date       | Version | Description                                                    | Author       |
| ---------- | ------- | -------------------------------------------------------------- | ------------ |
| 2025-12-27 | 0.1     | Initial draft                                                  | SM Agent     |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (delete/purchased), wish-1008, 1009 | Claude       |
| 2025-12-27 | 0.3     | Added GitHub Issue section                                     | Bob (SM)     |
| 2025-12-27 | 0.3     | Added Epic Context section                                     | Bob (SM)     |
| 2025-12-27 | 0.3     | Added Blocked By section with prerequisite stories             | Bob (SM)     |
| 2025-12-27 | 0.3     | Added Technical Requirements (Zod types, form arch, target app)| Bob (SM)     |
| 2025-12-27 | 0.3     | Added UX Requirements section (modal design, interactions, a11y)| Sally (UX)   |
| 2025-12-27 | 0.3     | Added UX & Accessibility acceptance criteria (AC 27-36)        | Sally (UX)   |
| 2025-12-27 | 0.3     | Added E2E Tests acceptance criteria (AC 37-44)                 | Bob (SM)     |
| 2025-12-27 | 0.3     | Updated Task 4-7 with UX details (focus, keyboard, loading)    | Bob (SM)     |
| 2025-12-27 | 0.3     | Added Task 8: E2E Tests with Playwright and API mocking        | Bob (SM)     |
| 2025-12-27 | 0.3     | Updated Definition of Done with UX/A11y and Testing sections   | Bob (SM)     |
| 2025-12-27 | 0.4     | Story draft checklist validated - all 5 categories PASS        | Bob (SM)     |
| 2025-12-27 | 0.4     | Status changed from Draft to Approved                          | Bob (SM)     |
