# Story wish-1009: "Got It" Flow Modal

## Status

Draft

## Story

**As a** user,
**I want** to mark a wishlist item as purchased with a modal flow,
**so that** I can record purchase details and move it to my Sets collection.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem type)
- **wish-1002**: API Endpoints (provides useMarkAsPurchasedMutation)

## Acceptance Criteria

1. "Got it!" button opens modal
2. Modal shows item summary (image, title, set number)
3. Pre-fills price from wishlist item
4. Purchase details form: price paid, tax, shipping, quantity, date
5. Purchase date defaults to today
6. "Keep on wishlist" checkbox for wanting multiples
7. Cancel closes modal without action
8. Confirm creates Set record and removes from wishlist (if checkbox unchecked)
9. Success toast with "View in Sets" action (if Sets API exists)
10. Graceful handling if Sets API not yet implemented
11. Item fades from gallery list

## Tasks / Subtasks

- [ ] **Task 1: Create GotItModal Component** (AC: 1-6)
  - [ ] Create `components/wishlist/GotItModal.tsx`
  - [ ] Use Dialog from @repo/ui
  - [ ] Item summary header (image, title)
  - [ ] Purchase details form with Zod validation
  - [ ] "Keep on wishlist" checkbox

- [ ] **Task 2: Form Fields** (AC: 3-5)
  - [ ] Price paid (pre-filled from item.price)
  - [ ] Tax amount (optional)
  - [ ] Shipping cost (optional)
  - [ ] Quantity (default 1, increment/decrement)
  - [ ] Purchase date (date picker, default today)

- [ ] **Task 3: Submit Handler** (AC: 7-10)
  - [ ] Use `useMarkAsPurchasedMutation`
  - [ ] Handle "Keep on wishlist" logic
  - [ ] Success toast with View action
  - [ ] Error handling for API failures
  - [ ] Graceful fallback if Sets API unavailable

- [ ] **Task 4: Visual Polish** (AC: 11)
  - [ ] Celebration moment (confetti or icon)
  - [ ] Item removal animation in gallery

## Dev Notes

### Modal Component

```typescript
// components/wishlist/GotItModal.tsx
import { z } from 'zod'

const PurchaseDetailsSchema = z.object({
  pricePaid: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().datetime(),
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
  const { success, error } = useToast()
  const navigate = useNavigate()

  const form = useForm<PurchaseDetails>({
    resolver: zodResolver(PurchaseDetailsSchema),
    defaultValues: {
      pricePaid: item.price ?? 0,
      tax: undefined,
      shipping: undefined,
      quantity: 1,
      purchaseDate: new Date().toISOString(),
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
          purchaseDate: data.purchaseDate,
          keepOnWishlist: data.keepOnWishlist,
        },
      }).unwrap()

      onOpenChange(false)

      success(
        <div className="flex items-center gap-2">
          <span>Added to your collection!</span>
          {result.newItemId && (
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate({ to: `/sets/${result.newItemId}` })}
            >
              View
            </Button>
          )}
        </div>
      )
    } catch (err) {
      // Check if it's a "Sets API not implemented" error
      if (err?.data?.code === 'SETS_API_NOT_AVAILABLE') {
        error('Sets collection not yet available. Item will remain on wishlist.')
      } else {
        error('Failed to mark as purchased. Your wishlist item is safe.')
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
                  <FormMessage />
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
                    <DatePicker
                      value={field.value ? new Date(field.value) : new Date()}
                      onChange={date => field.onChange(date?.toISOString())}
                    />
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

### API Handler Update

The existing `POST /api/wishlist/:id/purchased` from wish-1002 needs to handle:
- `keepOnWishlist` flag (if true, don't delete wishlist item)
- Return error code if Sets API not available
- Additional purchase fields (tax, shipping, quantity)

### Dependencies

- wish-1002: POST /api/wishlist/:id/purchased endpoint
- Sets API: If available, creates Set record; if not, graceful error
- @repo/ui: Dialog, Form components, DatePicker

## Testing

- [ ] Modal opens from "Got it!" button
- [ ] Item summary displays correctly
- [ ] Price pre-filled from wishlist item
- [ ] Date defaults to today
- [ ] Quantity increment/decrement works
- [ ] "Keep on wishlist" checkbox works
- [ ] Submit calls API with correct data
- [ ] Success toast appears
- [ ] "View" link navigates to Sets (if available)
- [ ] Graceful error if Sets API unavailable
- [ ] Item removed from gallery (if not kept)
- [ ] Cancel closes without action

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
