# Story wish-2003: Detail & Edit Pages

## Status

Draft

## Consolidates

- wish-1002: Wishlist API Endpoints (update endpoint)
- wish-1006: Wishlist Detail Page
- wish-1007: Wishlist Edit Page

## Story

**As a** user,
**I want** to view and edit wishlist item details,
**so that** I can see full information and update items as needed.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- CRUD Operations > Read, Update
- User Interface > Detail View

## Dependencies

- **wish-2000**: Database Schema & Shared Types
- **wish-2001**: Wishlist Gallery MVP (provides navigation context)
- **wish-2002**: Add Item Flow (reuse form components)

## Acceptance Criteria

### API Endpoint

1. PATCH /api/wishlist/:id updates item
2. Request validated with UpdateWishlistItemSchema
3. Returns updated item
4. Handles partial updates (only changed fields)
5. Image URL can be updated or cleared

### Detail Page

6. Route `/wishlist/:id` displays item details
7. Shows large product image with fallback
8. Displays all metadata: title, store, price, piece count, release date
9. Shows priority indicator with label
10. Shows notes section (expandable)
11. Shows tags as chips
12. "Got it!" button prominently displayed
13. Edit button navigates to edit page
14. Delete button triggers confirmation (from wish-2004)
15. Back button returns to gallery

### Edit Page

16. Route `/wishlist/:id/edit` loads existing item data
17. Form pre-populated with current values
18. All fields from add form are editable
19. Can update image (upload new or remove existing)
20. Save button updates item via PATCH API
21. Cancel button returns to detail page without saving
22. Success shows toast and navigates to detail page
23. Validation errors displayed inline

### RTK Query Integration

24. useUpdateWishlistItemMutation hook available
25. Cache invalidation on success

## Tasks / Subtasks

### Task 1: Create PATCH Endpoint

- [ ] Create `apps/api/endpoints/wishlist/update/handler.ts`
- [ ] Validate path param (id) is UUID
- [ ] Validate request body with UpdateWishlistItemSchema
- [ ] Verify user owns item
- [ ] Update only provided fields
- [ ] Set updatedAt timestamp
- [ ] Return updated item

### Task 2: Add RTK Query Mutation

- [ ] Add `updateWishlistItem` mutation to wishlist-api.ts
- [ ] Configure request body
- [ ] Set up cache invalidation (item ID + LIST)
- [ ] Export `useUpdateWishlistItemMutation` hook

### Task 3: Create Detail Page

- [ ] Create `apps/web/main-app/src/routes/wishlist/$id.tsx`
- [ ] Configure TanStack Router file-based route
- [ ] Fetch item with useGetWishlistItemQuery
- [ ] Handle loading state with skeleton
- [ ] Handle error/404 state
- [ ] Layout: image left, details right (responsive)
- [ ] Display all metadata fields
- [ ] Action buttons: Got it!, Edit, Delete

### Task 4: Create Edit Page

- [ ] Create `apps/web/main-app/src/routes/wishlist/$id.edit.tsx`
- [ ] Fetch existing item data
- [ ] Initialize form with item values
- [ ] Reuse form fields from add page
- [ ] Handle image: show current, replace, or remove
- [ ] Submit via useUpdateWishlistItemMutation
- [ ] Navigate to detail on success

### Task 5: Shared Components

- [ ] Extract WishlistFormFields component from add page
- [ ] Create PriceDisplay helper component
- [ ] Create PriorityBadge component

## Dev Notes

### API Handler

```typescript
// apps/api/endpoints/wishlist/update/handler.ts
import { APIGatewayProxyEvent } from 'aws-lambda'
import { db } from '@/database'
import { wishlistItems } from '@/database/schema/wishlist'
import { UpdateWishlistItemSchema, WishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { getUserIdFromEvent } from '@/utils/auth'
import { eq, and } from 'drizzle-orm'

export const handler = async (event: APIGatewayProxyEvent) => {
  const userId = getUserIdFromEvent(event)
  const { id } = event.pathParameters!
  const body = UpdateWishlistItemSchema.parse(JSON.parse(event.body!))

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

  // Update item
  const [updated] = await db
    .update(wishlistItems)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(wishlistItems.id, id))
    .returning()

  return {
    statusCode: 200,
    body: JSON.stringify(WishlistItemSchema.parse(updated)),
  }
}
```

### RTK Query Mutation

```typescript
// Add to wishlist-api.ts
updateWishlistItem: builder.mutation<WishlistItem, { id: string; data: UpdateWishlistItem }>({
  query: ({ id, data }) => ({
    url: `/wishlist/${id}`,
    method: 'PATCH',
    body: data,
  }),
  transformResponse: (response) => WishlistItemSchema.parse(response),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Wishlist', id },
    { type: 'Wishlist', id: 'LIST' },
  ],
}),

// Export hook
export const { useUpdateWishlistItemMutation } = wishlistApi
```

### Detail Page Component

```typescript
// routes/wishlist/$id.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useGetWishlistItemQuery } from '@repo/api-client/rtk/wishlist-api'
import { Button, Badge, Skeleton } from '@repo/ui'
import { ArrowLeft, Pencil, Trash, ShoppingCart, Package } from 'lucide-react'

export const Route = createFileRoute('/wishlist/$id')({
  component: WishlistDetailPage,
})

function WishlistDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useGetWishlistItemQuery(id)

  // State for modals (Got It and Delete from wish-2004)
  const [gotItModalOpen, setGotItModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  if (isLoading) return <DetailSkeleton />
  if (error || !item) return <NotFoundState />

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate({ to: '/wishlist' })}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Wishlist
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Title & Store */}
          <div>
            <Badge variant="secondary">{item.store}</Badge>
            <h1 className="text-3xl font-bold mt-2">{item.title}</h1>
            {item.setNumber && (
              <p className="text-muted-foreground">Set #{item.setNumber}</p>
            )}
          </div>

          {/* Price */}
          {item.price && (
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(item.price, item.currency)}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {item.pieceCount && (
              <div>
                <span className="text-muted-foreground">Pieces</span>
                <p className="font-medium">{item.pieceCount.toLocaleString()}</p>
              </div>
            )}
            {item.releaseDate && (
              <div>
                <span className="text-muted-foreground">Release Date</span>
                <p className="font-medium">{formatDate(item.releaseDate)}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Priority</span>
              <p className="font-medium">{getPriorityLabel(item.priority)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Added</span>
              <p className="font-medium">{formatDate(item.createdAt)}</p>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map(tag => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Source URL */}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on {item.store}
            </a>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button size="lg" className="flex-1" onClick={() => setGotItModalOpen(true)}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Got it!
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: `/wishlist/${id}/edit` })}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals (from wish-2004) */}
      <GotItModal
        open={gotItModalOpen}
        onOpenChange={setGotItModalOpen}
        item={item}
      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        itemTitle={item.title}
        onConfirm={() => handleDelete(id)}
      />
    </div>
  )
}

// Helper functions
function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPriorityLabel(priority: number) {
  const labels = ['None', 'Low', 'Medium', 'High', 'Very High', 'Must Have']
  return labels[priority] || 'None'
}

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
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Edit Page Component

```typescript
// routes/wishlist/$id.edit.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateWishlistItemSchema, UpdateWishlistItem } from '@repo/api-client/schemas/wishlist'
import {
  useGetWishlistItemQuery,
  useUpdateWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-api'
import { Button, Form } from '@repo/ui'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@repo/ui/hooks/use-toast'

export const Route = createFileRoute('/wishlist/$id/edit')({
  component: EditWishlistItemPage,
})

function EditWishlistItemPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: item, isLoading: isLoadingItem } = useGetWishlistItemQuery(id)
  const [updateItem, { isLoading: isSaving }] = useUpdateWishlistItemMutation()

  const form = useForm<UpdateWishlistItem>({
    resolver: zodResolver(UpdateWishlistItemSchema),
    defaultValues: item ? mapItemToFormValues(item) : undefined,
  })

  // Reset form when item loads
  useEffect(() => {
    if (item) {
      form.reset(mapItemToFormValues(item))
    }
  }, [item, form])

  const onSubmit = async (data: UpdateWishlistItem) => {
    try {
      // Handle image changes if needed
      let imageUrl = data.imageUrl
      if (newImageFile) {
        imageUrl = await uploadImageToS3(newImageFile)
      } else if (removeImage) {
        imageUrl = undefined
      }

      await updateItem({
        id,
        data: { ...data, imageUrl },
      }).unwrap()

      toast({
        title: 'Success',
        description: 'Wishlist item updated',
      })
      navigate({ to: `/wishlist/${id}` })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      })
    }
  }

  if (isLoadingItem) return <FormSkeleton />
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
          {/* Reuse form fields from add page - extract to shared component */}
          <WishlistFormFields form={form} />

          {/* Image Section with current image display */}
          <div className="space-y-2">
            <Label>Image</Label>
            {item.imageUrl && !removeImage ? (
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
                  onClick={() => setRemoveImage(true)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <ImageUploadField
                file={newImageFile}
                preview={imagePreview}
                onFileChange={handleImageChange}
                onRemove={() => {
                  setNewImageFile(null)
                  setImagePreview(null)
                }}
              />
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
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

function mapItemToFormValues(item: WishlistItem): UpdateWishlistItem {
  return {
    title: item.title,
    store: item.store,
    setNumber: item.setNumber ?? undefined,
    sourceUrl: item.sourceUrl ?? undefined,
    imageUrl: item.imageUrl ?? undefined,
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

### Route Structure

```
apps/web/main-app/src/routes/
  wishlist/
    $id.tsx           # Detail page
    $id.edit.tsx      # Edit page
    -components/
      WishlistFormFields.tsx  # Shared form fields (extracted)
```

## Testing

### API Tests

- [ ] PATCH /api/wishlist/:id updates item with valid data
- [ ] PATCH /api/wishlist/:id returns 400 for invalid data
- [ ] PATCH /api/wishlist/:id returns 404 for nonexistent item
- [ ] PATCH /api/wishlist/:id returns 403 for other user's item
- [ ] Partial updates work (only provided fields change)

### Detail Page Tests

- [ ] Route renders with valid item ID
- [ ] Shows loading skeleton while fetching
- [ ] Shows 404 for invalid ID
- [ ] All metadata fields display correctly
- [ ] Image fallback shows when no image
- [ ] "Got it!" button opens modal (from wish-2004)
- [ ] Edit button navigates correctly
- [ ] Delete button opens confirmation (from wish-2004)
- [ ] Back button returns to gallery

### Edit Page Tests

- [ ] Form loads with existing item data
- [ ] All fields are editable
- [ ] Validation errors show inline
- [ ] Save button calls PATCH API
- [ ] Success navigates to detail page with toast
- [ ] Cancel navigates without saving
- [ ] Image can be removed
- [ ] New image can be uploaded

## Definition of Done

- [ ] PATCH endpoint updates items correctly
- [ ] Detail page displays all item information
- [ ] Edit page allows updating all fields
- [ ] RTK Query cache invalidates correctly
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                            | Author   |
| ---------- | ------- | ------------------------------------------------------ | -------- |
| 2025-12-27 | 0.1     | Initial draft                                          | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1002 (update), wish-1006, 1007 | Claude   |
