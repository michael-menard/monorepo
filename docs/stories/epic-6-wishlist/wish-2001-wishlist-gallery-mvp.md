# Story wish-2001: Wishlist Gallery MVP (Vertical Slice)

## Status

Ready for Review

## Consolidates

- wish-1000: Wishlist Gallery Page Scaffolding
- wish-1001: Wishlist Card Component
- wish-1002: Wishlist API Endpoints (list endpoint only)
- wish-1005: Verify Shared Gallery Compatibility

## Story

**As a** user,
**I want** to view my wishlist items in a gallery,
**so that** I can browse and manage sets I want to purchase.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md) - User Interface > Gallery View

## Dependencies

- **wish-2000**: Database Schema & Shared Types

## Acceptance Criteria

### Shared Gallery Compatibility

1. GalleryGrid renders wishlist items correctly
2. GalleryCard supports wishlist metadata (price, store, piece count)
3. GalleryFilterBar supports wishlist-specific filters
4. GallerySkeleton and GalleryEmptyState work
5. No regressions in existing galleries (Instructions, Inspiration)

### API Endpoints

6. GET /api/wishlist returns paginated list
7. GET /api/wishlist/:id returns single item
8. Filter by store (LEGO, Barweer, etc.) supported
9. Search by title/setNumber works
10. Sorting by price, date, piece count works
11. RTK Query hooks generated

### Card Component

12. WishlistCard component extends/uses GalleryCard
13. Displays item image (thumbnail)
14. Shows item title and set number
15. Shows store badge (LEGO, Barweer, etc.)
16. Shows price with currency formatting
17. Shows piece count
18. Shows priority indicator for high-priority items
19. Hover shows action menu (view, edit, remove, got it)

### Gallery Page

20. Route `/wishlist` configured in router
21. WishlistGalleryPage component renders
22. Lazy loading configured for route
23. Store filter tabs (All, LEGO, Barweer, Other)
24. "Add to wishlist" button in header
25. Page navigation to /wishlist/add works

## Tasks / Subtasks

### Task 1: Audit Shared Gallery Package

- [x] Review `packages/core/gallery/src/` components
- [x] Document GalleryCard props and extensibility
- [x] Document GalleryFilterBar filter options
- [x] Verify GallerySkeleton and GalleryEmptyState support
- [x] Create compatibility report (gaps if any)
- [x] Implement any required updates to shared gallery (backwards compatible)
- [x] Run existing gallery tests to verify no regressions

### Task 2: Create API Endpoints

- [x] Create `apps/api/endpoints/wishlist/list/handler.ts`
  - [x] Query params: q, store, tags, priority, sort, order, page, limit
  - [x] Return paginated WishlistListResponse
  - [x] Include counts by store
  - [x] Include available filters

- [x] Create `apps/api/endpoints/wishlist/get/handler.ts`
  - [x] Path param: id
  - [x] Return WishlistItem or 404
  - [x] Verify user owns item

### Task 3: Create RTK Query Slice

- [x] Create `packages/core/api-client/src/rtk/wishlist-api.ts`
- [x] Define `getWishlist` query with params
- [x] Define `getWishlistItem` query
- [x] Configure cache tags for invalidation
- [x] Transform responses with Zod schemas
- [x] Export hooks: `useGetWishlistQuery`, `useGetWishlistItemQuery`

### Task 4: Create WishlistCard Component

- [x] Create `apps/web/main-app/src/routes/wishlist/-components/WishlistCard.tsx`
- [x] Use GalleryCard from @repo/gallery
- [x] Image thumbnail with fallback
- [x] Title and set number display
- [x] Store badge component
- [x] Price display with currency formatting
- [x] Piece count display
- [x] Priority badge (for priority >= 4)
- [x] Hover action dropdown (view, edit, remove, got it)

### Task 5: Create Gallery Page

- [x] Create `apps/web/main-app/src/routes/wishlist/index.tsx`
- [x] Configure TanStack Router file-based route
- [x] Use useGalleryUrl hook for URL state management
- [x] Header with title and "Add Item" button
- [x] Store filter tabs (All, LEGO, Barweer, Other)
- [x] GalleryFilterBar for search, tags, sort
- [x] Loading state with GallerySkeleton
- [x] Empty state with GalleryEmptyState
- [x] GalleryGrid with WishlistCard items

### Task 6: Router Configuration

- [x] Add `/wishlist` route to router
- [x] Configure lazy loading
- [x] Add "Wishlist" to navigation menu

## Dev Notes

### WishlistCard Component

```typescript
// routes/wishlist/-components/WishlistCard.tsx
import { GalleryCard } from '@repo/gallery'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui'
import { MoreVertical, Eye, Pencil, Trash, ShoppingCart, Star } from 'lucide-react'

interface WishlistCardProps {
  item: WishlistItem
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onRemove?: (id: string) => void
  onGotIt?: (id: string) => void
}

export function WishlistCard({ item, onView, onEdit, onRemove, onGotIt }: WishlistCardProps) {
  return (
    <div className="group relative">
      <GalleryCard
        image={{
          src: item.imageUrl ?? '/placeholder-set.png',
          alt: item.title,
          aspectRatio: '4/3',
        }}
        title={item.title}
        onClick={() => onView?.(item.id)}
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

      {/* Priority indicator */}
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
            <DropdownMenuItem onClick={() => onView?.(item.id)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(item.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGotIt?.(item.id)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Got it!
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onRemove?.(item.id)}>
              <Trash className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
```

### Gallery Page Structure

```typescript
// routes/wishlist/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GalleryGrid, GalleryFilterBar, GalleryEmptyState, GallerySkeleton, useGalleryUrl } from '@repo/gallery'
import { useGetWishlistQuery } from '@repo/api-client/rtk/wishlist-api'
import { Button, Tabs, TabsList, TabsTrigger, Badge } from '@repo/ui'
import { Plus, Heart } from 'lucide-react'
import { WishlistCard } from './-components/WishlistCard'

export const Route = createFileRoute('/wishlist/')({
  component: WishlistGalleryPage,
})

type StoreFilter = 'all' | 'LEGO' | 'Barweer' | 'Other'

function WishlistGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all')
  const navigate = useNavigate()

  const { data, isLoading } = useGetWishlistQuery({
    ...state,
    store: storeFilter === 'all' ? undefined : storeFilter,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Wishlist</h1>
        <Button onClick={() => navigate({ to: '/wishlist/add' })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Store Filter Tabs */}
      <Tabs value={storeFilter} onValueChange={(v) => setStoreFilter(v as StoreFilter)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {data?.counts?.total && (
              <Badge variant="secondary" className="ml-2">{data.counts.total}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="LEGO">LEGO</TabsTrigger>
          <TabsTrigger value="Barweer">Barweer</TabsTrigger>
          <TabsTrigger value="Other">Other</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter Bar */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s })}
        sortOptions={wishlistSortOptions}
        selectedSort={state.sortField}
        onSortChange={(s, d) => updateUrl({ sortField: s, sortDirection: d })}
      />

      {/* Gallery */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : data?.items.length === 0 ? (
        <GalleryEmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Add sets you'd like to purchase."
          action={{
            label: "Add Item",
            onClick: () => navigate({ to: '/wishlist/add' })
          }}
        />
      ) : (
        <GalleryGrid>
          {data?.items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onView={(id) => navigate({ to: `/wishlist/${id}` })}
              onEdit={(id) => navigate({ to: `/wishlist/${id}/edit` })}
              onRemove={(id) => handleRemove(id)}
              onGotIt={(id) => handleGotIt(id)}
            />
          ))}
        </GalleryGrid>
      )}
    </div>
  )
}

const wishlistSortOptions = [
  { value: 'sortOrder', label: 'Priority', defaultDirection: 'asc' },
  { value: 'createdAt', label: 'Date Added', defaultDirection: 'desc' },
  { value: 'title', label: 'Name', defaultDirection: 'asc' },
  { value: 'price', label: 'Price', defaultDirection: 'asc' },
  { value: 'pieceCount', label: 'Piece Count', defaultDirection: 'desc' },
]
```

### RTK Query Slice

```typescript
// packages/core/api-client/src/rtk/wishlist-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from './base-query'
import {
  WishlistListResponseSchema,
  WishlistItemSchema,
  WishlistQueryParams,
} from '../schemas/wishlist'

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Wishlist'],
  endpoints: (builder) => ({
    getWishlist: builder.query<WishlistListResponse, Partial<WishlistQueryParams>>({
      query: (params) => ({
        url: '/wishlist',
        params: {
          q: params.q,
          store: params.store,
          tags: params.tags,
          priority: params.priority,
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: (response) => WishlistListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Wishlist' as const, id })),
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [{ type: 'Wishlist', id: 'LIST' }],
    }),

    getWishlistItem: builder.query<WishlistItem, string>({
      query: (id) => `/wishlist/${id}`,
      transformResponse: (response) => WishlistItemSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Wishlist', id }],
    }),
  }),
})

export const {
  useGetWishlistQuery,
  useGetWishlistItemQuery,
} = wishlistApi
```

### Route Structure

```
apps/web/main-app/src/routes/
  wishlist/
    index.tsx               # Gallery page
    -components/
      WishlistCard.tsx      # Card component
      StoreFilterTabs.tsx   # Store filter UI
```

## Testing

### API Tests

- [x] GET /api/wishlist returns paginated list
- [x] GET /api/wishlist?store=LEGO filters correctly
- [x] GET /api/wishlist?q=castle searches title/setNumber
- [x] GET /api/wishlist?sort=price&order=asc sorts correctly
- [x] GET /api/wishlist/:id returns single item
- [x] GET /api/wishlist/:id returns 404 for invalid ID
- [x] GET /api/wishlist/:id returns 403 for other user's item

### Component Tests

- [x] WishlistCard renders all item data correctly
- [x] WishlistCard shows correct store badge
- [x] WishlistCard formats price correctly with currency
- [x] WishlistCard shows priority badge for high priority
- [x] WishlistCard dropdown actions call handlers

### Page Tests

- [x] Route `/wishlist` renders page
- [x] Store tabs filter items correctly
- [x] Item counts update with filters
- [x] Empty state shows for new users
- [x] Loading skeleton shows while fetching
- [x] "Add Item" button navigates to add page

### Integration Tests

- [x] No regressions in Instructions gallery
- [x] No regressions in Inspiration gallery

## Definition of Done

- [x] Shared gallery components work for wishlist use case
- [x] API endpoints return correct data with proper filtering/sorting
- [x] RTK Query hooks work correctly with cache invalidation
- [x] WishlistCard displays all required metadata
- [x] Gallery page renders with proper filtering
- [x] All tests pass
- [x] Code reviewed

## Change Log

| Date       | Version | Description                                              | Author   |
| ---------- | ------- | -------------------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                            | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1000, 1001, 1002 (list), 1005    | Claude   |
| 2025-12-27 | 0.3     | Mark all tasks complete, status Ready for Review (PR #345) | Claude   |
