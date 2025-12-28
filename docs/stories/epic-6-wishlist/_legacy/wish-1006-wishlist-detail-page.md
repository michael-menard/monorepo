# Story wish-1006: Wishlist Detail Page

## Status

Draft

## Story

**As a** user,
**I want** to view the full details of a wishlist item,
**so that** I can see all information and take actions on it.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem type)
- **wish-1002**: API Endpoints (provides useGetWishlistItemQuery hook)
- **wish-1008**: Delete Confirmation Modal (used from this page)
- **wish-1009**: Got It Flow Modal (used from this page)

## Acceptance Criteria

1. Route `/wishlist/:id` displays item details
2. Shows large product image
3. Displays all metadata: title, store, price, piece count, release date
4. Shows priority indicator
5. Shows notes section
6. Shows tags
7. "Got it!" button prominently displayed
8. Edit button navigates to edit page
9. Delete button triggers confirmation
10. Back button returns to gallery

## Tasks / Subtasks

- [ ] **Task 1: Create Detail Route** (AC: 1, 10)
  - [ ] Create `routes/wishlist/$id.tsx`
  - [ ] Configure TanStack Router file-based route
  - [ ] Add back navigation

- [ ] **Task 2: Fetch Item Data** (AC: 1)
  - [ ] Use `useGetWishlistItemQuery(id)` from RTK Query
  - [ ] Handle loading state with skeleton
  - [ ] Handle error state (404, network error)

- [ ] **Task 3: Display Item Details** (AC: 2-6)
  - [ ] Large image display with fallback
  - [ ] Title and set number
  - [ ] Store badge
  - [ ] Price with currency
  - [ ] Piece count
  - [ ] Release date (formatted)
  - [ ] Priority indicator
  - [ ] Notes section (expandable if long)
  - [ ] Tags as chips

- [ ] **Task 4: Action Buttons** (AC: 7-9)
  - [ ] "Got it!" primary button (triggers wish-1009 modal)
  - [ ] Edit button (navigates to /wishlist/:id/edit)
  - [ ] Delete button (triggers wish-1008 confirmation)

## Dev Notes

### Route Structure

```typescript
// routes/wishlist/$id.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wishlist/$id')({
  component: WishlistDetailPage,
})

function WishlistDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading, error } = useGetWishlistItemQuery(id)

  if (isLoading) return <WishlistDetailSkeleton />
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
            <Button size="lg" className="flex-1" onClick={() => openGotItModal()}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Got it!
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: `/wishlist/${id}/edit` })}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="text-destructive" onClick={() => openDeleteModal()}>
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Helper Functions

```typescript
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
```

### Dependencies

- wish-1002: API endpoints (GET /api/wishlist/:id)
- wish-1008: Delete confirmation modal (opens from here)
- wish-1009: "Got it" flow modal (opens from here)

## Testing

- [ ] Route renders with valid item ID
- [ ] Shows loading skeleton while fetching
- [ ] Shows 404 for invalid ID
- [ ] All metadata fields display correctly
- [ ] Image fallback shows when no image
- [ ] "Got it!" button opens modal
- [ ] Edit button navigates correctly
- [ ] Delete button opens confirmation
- [ ] Back button returns to gallery

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
