# Story 3.3.4: Wishlist Add Item Page

## Status

Draft

## Story

**As a** user,
**I want** to add items to my wishlist,
**so that** I can track sets and instructions I want to purchase.

## Acceptance Criteria

1. ⬜ Route `/wishlist/add` configured
2. ⬜ Form to enter item details
3. ⬜ Type selection (Set or Instructions)
4. ⬜ Image upload support
5. ⬜ Price and source fields
6. ⬜ Priority selection
7. ⬜ Success redirects to wishlist gallery

## Tasks / Subtasks

- [ ] **Task 1: Create Add Route**
  - [ ] Create `routes/wishlist/add.tsx`
  - [ ] Configure route

- [ ] **Task 2: Add Item Form**
  - [ ] Type selection (radio)
  - [ ] Name input (required)
  - [ ] Set number input (conditional)
  - [ ] Piece count input
  - [ ] Theme selector
  - [ ] Tags input
  - [ ] Price and currency
  - [ ] Source and URL
  - [ ] Priority selector
  - [ ] Notes textarea

- [ ] **Task 3: Image Upload**
  - [ ] Image upload zone
  - [ ] Multiple images support
  - [ ] Image preview

- [ ] **Task 4: Form Submission**
  - [ ] Validation with Zod
  - [ ] Submit to API
  - [ ] Success toast and redirect

## Dev Notes

### Page Component

```typescript
// routes/wishlist/add.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export const Route = createFileRoute('/wishlist/add')({
  component: AddWishlistItemPage,
})

const wishlistItemSchema = z.object({
  type: z.enum(['set', 'instruction']),
  name: z.string().min(1, 'Name is required'),
  setNumber: z.string().optional(),
  pieceCount: z.number().int().positive().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).default([]),
  price: z.number().positive().optional(),
  currency: z.string().default('USD'),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

type WishlistItemFormData = z.infer<typeof wishlistItemSchema>

function AddWishlistItemPage() {
  const navigate = useNavigate()
  const [addToWishlist, { isLoading }] = useAddToWishlistMutation()
  const { success, error } = useToast()
  const [images, setImages] = useState<File[]>([])

  const form = useForm<WishlistItemFormData>({
    resolver: zodResolver(wishlistItemSchema),
    defaultValues: {
      type: 'set',
      priority: 'medium',
      currency: 'USD',
      tags: [],
    },
  })

  const itemType = form.watch('type')

  const onSubmit = async (data: WishlistItemFormData) => {
    try {
      const item = await addToWishlist(data).unwrap()

      // Upload images if any
      if (images.length > 0) {
        for (const image of images) {
          const formData = new FormData()
          formData.append('file', image)
          await uploadWishlistImage({ itemId: item.id, formData })
        }
      }

      success('Item added to wishlist')
      navigate({ to: '/wishlist' })
    } catch (err) {
      error('Failed to add item')
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/wishlist' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add to Wishlist</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Type Selection */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="set" id="type-set" />
                      <Label htmlFor="type-set">LEGO Set</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="instruction" id="type-instruction" />
                      <Label htmlFor="type-instruction">MOC Instructions</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Medieval Castle" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Set Number (conditional) */}
          {itemType === 'set' && (
            <FormField
              control={form.control}
              name="setNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 10305" {...field} />
                  </FormControl>
                  <FormDescription>Official LEGO set number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Piece Count & Theme Row */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pieceCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Piece Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2500"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Price & Currency Row */}
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 199.99"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Images */}
          <div className="space-y-2">
            <Label>Images</Label>
            <ImageUploadZone
              images={images}
              onImagesChange={setImages}
              maxImages={5}
            />
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate({ to: '/wishlist' })}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Wishlist
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

## Testing

- [ ] Form validates required fields
- [ ] Set number field appears only for set type
- [ ] Images can be uploaded and previewed
- [ ] Form submits successfully
- [ ] Success redirects to wishlist gallery
- [ ] Error toast on failure

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
