# Story wish-1007: Wishlist Edit Page

## Status

Draft

## Story

**As a** user,
**I want** to edit an existing wishlist item,
**so that** I can update details like price, notes, or priority.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides UpdateWishlistItemSchema)
- **wish-1002**: API Endpoints (provides useUpdateWishlistItemMutation, useGetWishlistItemQuery)
- **wish-1003**: Add Item Page (reuse form patterns/components)

## Acceptance Criteria

1. Route `/wishlist/:id/edit` loads existing item data
2. Form pre-populated with current values
3. All fields from add form are editable
4. Can update image (upload new or remove existing)
5. Save button updates item via PATCH API
6. Cancel button returns to detail page without saving
7. Success shows toast and navigates to detail page
8. Validation errors displayed inline

## Tasks / Subtasks

- [ ] **Task 1: Create Edit Route** (AC: 1, 6)
  - [ ] Create `routes/wishlist/$id.edit.tsx`
  - [ ] Configure TanStack Router
  - [ ] Add cancel navigation to detail page

- [ ] **Task 2: Load Existing Data** (AC: 2)
  - [ ] Fetch item with `useGetWishlistItemQuery(id)`
  - [ ] Initialize form with item data
  - [ ] Handle loading/error states

- [ ] **Task 3: Reuse Add Form Components** (AC: 3)
  - [ ] Extract form fields from wish-1003 into shared component
  - [ ] Or duplicate with modifications for edit context
  - [ ] Same validation schema as add

- [ ] **Task 4: Image Handling** (AC: 4)
  - [ ] Show current image if exists
  - [ ] "Remove image" button
  - [ ] "Replace image" upload zone
  - [ ] Handle S3 upload for new image

- [ ] **Task 5: Submit Handler** (AC: 5, 7, 8)
  - [ ] Use `useUpdateWishlistItemMutation`
  - [ ] Show loading state on save button
  - [ ] Display validation errors
  - [ ] Success toast and navigate to detail

## Dev Notes

### Route Structure

```typescript
// routes/wishlist/$id.edit.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wishlist/$id/edit')({
  component: EditWishlistItemPage,
})

function EditWishlistItemPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading } = useGetWishlistItemQuery(id)
  const [updateItem, { isLoading: isSaving }] = useUpdateWishlistItemMutation()
  const { success, error: showError } = useToast()

  const form = useForm<UpdateWishlistItem>({
    resolver: zodResolver(UpdateWishlistItemSchema),
    defaultValues: item ? mapItemToFormValues(item) : undefined,
  })

  // Reset form when item loads
  useEffect(() => {
    if (item) {
      form.reset(mapItemToFormValues(item))
    }
  }, [item])

  const onSubmit = async (data: UpdateWishlistItem) => {
    try {
      await updateItem({ id, data }).unwrap()
      success('Wishlist item updated')
      navigate({ to: `/wishlist/${id}` })
    } catch (err) {
      showError('Failed to update item')
    }
  }

  if (isLoading) return <FormSkeleton />
  if (!item) return <NotFoundState />

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: `/wishlist/${id}` })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <h1 className="text-2xl font-bold">Edit Wishlist Item</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Store */}
          <FormField
            control={form.control}
            name="store"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LEGO">LEGO</SelectItem>
                    <SelectItem value="Barweer">Barweer</SelectItem>
                    <SelectItem value="Cata">Cata</SelectItem>
                    <SelectItem value="BrickLink">BrickLink</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Set Number */}
          <FormField
            control={form.control}
            name="setNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Set Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 75192" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price Row */}
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
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
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
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* Piece Count */}
          <FormField
            control={form.control}
            name="pieceCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Piece Count</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ''}
                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={v => field.onChange(parseInt(v))} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    <SelectItem value="1">Low</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">High</SelectItem>
                    <SelectItem value="4">Very High</SelectItem>
                    <SelectItem value="5">Must Have</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Image Section */}
          <div className="space-y-2">
            <Label>Image</Label>
            {item.imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-32 h-32 object-cover rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <ImageUploadZone onImageSelect={handleImageUpload} />
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: `/wishlist/${id}` })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

### Form Value Mapper

```typescript
function mapItemToFormValues(item: WishlistItem): UpdateWishlistItem {
  return {
    title: item.title,
    store: item.store,
    setNumber: item.setNumber ?? undefined,
    sourceUrl: item.sourceUrl ?? undefined,
    price: item.price ?? undefined,
    currency: item.currency,
    pieceCount: item.pieceCount ?? undefined,
    releaseDate: item.releaseDate ?? undefined,
    tags: item.tags,
    priority: item.priority,
    notes: item.notes ?? undefined,
  }
}
```

### Dependencies

- wish-1002: API endpoints (PATCH /api/wishlist/:id)
- wish-1003: Reuse form components/patterns
- wish-1004: Zod schemas for validation

## Testing

- [ ] Form loads with existing item data
- [ ] All fields are editable
- [ ] Validation errors show inline
- [ ] Save button calls PATCH API
- [ ] Success navigates to detail page
- [ ] Cancel navigates without saving
- [ ] Image can be removed
- [ ] New image can be uploaded

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
