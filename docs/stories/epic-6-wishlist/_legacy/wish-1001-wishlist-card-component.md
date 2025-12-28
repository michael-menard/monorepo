# Story wish-1001: Wishlist Card Component

## Status

Draft

## Story

**As a** user,
**I want** wishlist items displayed in informative cards,
**so that** I can see key details about items I want to purchase.

## Dependencies

- **wish-1004**: Database Schema & Zod Types (provides WishlistItem type)
- **wish-1005**: Verify Shared Gallery Compatibility (confirms GalleryCard works)

## Acceptance Criteria

1. ⬜ WishlistCard component extends GalleryCard
2. ⬜ Displays item image (thumbnail)
3. ⬜ Shows item name/title
4. ⬜ Shows store badge (LEGO, Barweer, etc.)
5. ⬜ Shows price if set
6. ⬜ Shows piece count if available
7. ⬜ Shows priority indicator (1-5 scale)
8. ⬜ Hover shows actions (view, edit, remove, mark purchased)

## Tasks / Subtasks

- [ ] **Task 1: Create WishlistCard Component**
  - [ ] Create `routes/wishlist/-components/WishlistCard.tsx`
  - [ ] Extend GalleryCard from @repo/gallery
  - [ ] Import WishlistItem type from @repo/api-client/schemas/wishlist

- [ ] **Task 2: Card Content**
  - [ ] Image thumbnail (from imageUrl)
  - [ ] Item title
  - [ ] Store badge (LEGO, Barweer, etc.)
  - [ ] Price display with currency
  - [ ] Piece count
  - [ ] Priority indicator (0-5 scale)

- [ ] **Task 3: Card Actions**
  - [ ] View details
  - [ ] Edit item
  - [ ] Remove from wishlist
  - [ ] Mark as purchased (moves to Sets/Instructions)

## Dev Notes

### Component API

```typescript
// Import from @repo/api-client/schemas/wishlist (defined in wish-1004)
import { WishlistItem } from '@repo/api-client/schemas/wishlist'

// WishlistItem has these fields:
// - id: string (uuid)
// - userId: string (uuid)
// - title: string
// - store: string (LEGO, Barweer, Cata, etc.)
// - setNumber: string | null
// - sourceUrl: string | null
// - imageUrl: string | null (S3 URL)
// - price: number | null
// - currency: string (default 'USD')
// - pieceCount: number | null
// - releaseDate: string | null
// - tags: string[]
// - priority: number (0-5)
// - notes: string | null
// - sortOrder: number
// - createdAt: string
// - updatedAt: string

interface WishlistCardProps {
  item: WishlistItem
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  onMarkPurchased?: (id: string) => void
}

function WishlistCard({ item, ...handlers }: WishlistCardProps) {
  return (
    <div className="group relative">
      <GalleryCard
        image={{
          src: item.imageUrl ?? '/placeholder-set.png',
          alt: item.title,
          aspectRatio: '4/3',
        }}
        title={item.title}
        onClick={() => handlers.onView?.(item.id)}
        metadata={
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{item.store}</Badge>
              {item.setNumber && (
                <span className="text-sm text-muted-foreground">#{item.setNumber}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              {item.pieceCount && (
                <span className="text-sm text-muted-foreground">
                  {item.pieceCount.toLocaleString()} pieces
                </span>
              )}
              {item.price && (
                <span className="font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: item.currency || 'USD',
                  }).format(item.price)}
                </span>
              )}
            </div>
          </div>
        }
      />

      {/* Priority indicator (show for priority >= 4) */}
      {item.priority >= 4 && (
        <div className="absolute top-2 left-2">
          <Badge variant="destructive" className="text-xs">
            <Star className="w-3 h-3 mr-1 fill-current" />
            {item.priority === 5 ? 'Must Have' : 'High Priority'}
          </Badge>
        </div>
      )}

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handlers.onView?.(item.id)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onEdit?.(item.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlers.onMarkPurchased?.(item.id)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mark as Purchased
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handlers.onRemove?.(item.id)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Remove from Wishlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

### Price Display Component

```typescript
function PriceDisplay({ price, currency = 'USD' }: { price: number; currency?: string }) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)

  return <span className="font-semibold text-primary">{formatted}</span>
}
```

### Theme Badge

```typescript
{item.theme && (
  <Badge variant="outline" className="text-xs">
    {item.theme}
  </Badge>
)}
```

## Testing

- [ ] Unit test: renders all item data correctly
- [ ] Unit test: shows correct type badge
- [ ] Unit test: formats price correctly
- [ ] Unit test: dropdown actions call handlers
- [ ] Unit test: priority badge shows when high

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
