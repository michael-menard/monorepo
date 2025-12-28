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
2. GalleryCard exports `GalleryCardPropsSchema` for extension
3. GalleryFilterBar accepts `children` prop for custom filter UI (e.g., store tabs)
4. GallerySkeleton and GalleryEmptyState work

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
- [x] Document GalleryCard props and extensibility (must export `GalleryCardPropsSchema`)
- [x] Document GalleryFilterBar filter options
- [x] Verify GallerySkeleton and GalleryEmptyState support
- [x] Create compatibility report (gaps if any)
- [x] **Implement composable filter pattern**:
  - [x] Update `GalleryFilterBar` to accept `children` prop for custom filter UI
  - [x] Custom filters render in a designated slot (e.g., before or after standard filters)
  - [x] Alternatively, create a `GalleryLayout` component that accepts `filters` as a render prop or children

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

- [x] Create `apps/web/app-wishlist-gallery/src/components/WishlistCard.tsx`
- [x] **Extend GalleryCard from @repo/gallery**
  - [x] Import `GalleryCardPropsSchema` from @repo/gallery
  - [x] Create `WishlistCardPropsSchema` that extends `GalleryCardPropsSchema` using `.extend()` or `.merge()`
  - [x] Add wishlist-specific props: `onView`, `onEdit`, `onRemove`, `onGotIt` callbacks
  - [x] Compose WishlistCard using GalleryCard as the base, passing through extended props
- [x] Image thumbnail with fallback
- [x] Title and set number display
- [x] Store badge component
- [x] Price display with currency formatting
- [x] Piece count display
- [x] Priority badge (for priority >= 4)
- [x] **Update MSW handlers for unit tests**
  - [x] Update `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts`
  - [x] Add `GET /api/wishlist` handler with mock list response
  - [x] Add `GET /api/wishlist/:id` handler with mock item response
  - [x] Add error scenario handlers (404, 500)
- [ ] Hover action dropdown (view, edit, remove, got it) - *deferred to future story*
- [ ] **Create Storybook story** - *deferred to future story*
  - [ ] Create `WishlistCard.stories.tsx`
  - [ ] Default story with typical item data
  - [ ] High priority variant (priority >= 4)
  - [ ] Different store badges (LEGO, Barweer, Other)
  - [ ] With/without optional fields (price, pieceCount, setNumber)

### Task 5: Implement Gallery in app-wishlist-gallery Module

**Note**: The wishlist gallery is its own micro-app at `apps/web/app-wishlist-gallery/` that gets imported into main-app via workspace dependency.

- [x] Update `apps/web/app-wishlist-gallery/src/Module.tsx`
  - [x] Define `WishlistGalleryModulePropsSchema` using Zod
  - [x] Export `WishlistGalleryModule` component for lazy-loading
- [x] Create `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`
  - [x] Use useGalleryUrl hook for URL state management
  - [x] Header with title and "Add Item" button
  - [x] Store filter tabs (All, LEGO, Barweer, Other)
  - [x] GalleryFilterBar for search, tags, sort
  - [x] Loading state with GallerySkeleton
  - [x] Empty state with GalleryEmptyState
  - [x] GalleryGrid with WishlistCard items
- [x] Create `apps/web/app-wishlist-gallery/src/components/WishlistCard.tsx`
  - [x] Move WishlistCard component here (from Task 4)

### Task 6: Main-App Integration & Router Configuration

- [x] Add workspace dependency to `apps/web/main-app/package.json`:
  ```json
  "@repo/app-wishlist-gallery": "workspace:*"
  ```
- [x] Create `apps/web/main-app/src/routes/modules/WishlistModule.tsx`
  - [x] Lazy-load `@repo/app-wishlist-gallery` module
  - [x] Wrap with Suspense and loading fallback
- [x] Configure TanStack Router route for `/wishlist`
- [x] Add "Wishlist" to navigation menu

### Task 7: E2E Tests with Mocked API

**Note**: Tests run against mocked API endpoints - no backend deployment required.

- [x] Create `apps/web/playwright/utils/wishlist-mocks.ts`
  - [x] Define `wishlistMockResponses` (list, single item, empty, errors)
  - [x] Create `setupWishlistMocks(page, options)` function
  - [x] Support scenarios: success, empty, error, filtered results
- [x] Create `apps/web/playwright/features/wishlist/wishlist-gallery.feature`
  - [x] Feature: Wishlist Gallery scenarios (BDD/Gherkin)
- [x] Create `apps/web/playwright/steps/wishlist.steps.ts`
  - [x] Step definitions for wishlist scenarios
  - [x] Use `page.route()` to mock `/api/wishlist` endpoints

## Dev Notes

### GalleryFilterBar Composable Pattern (Task 1)

The `GalleryFilterBar` in `@repo/gallery` must be updated to accept a `children` prop, allowing each gallery to inject custom filter UI while reusing the standard search/sort functionality.

```typescript
// packages/core/gallery/src/components/GalleryFilterBar.tsx
import { z } from 'zod'
import { ReactNode } from 'react'

const GalleryFilterBarPropsSchema = z.object({
  search: z.string().optional(),
  onSearchChange: z.function().args(z.string()).returns(z.void()),
  sortOptions: z.array(z.object({
    value: z.string(),
    label: z.string(),
    defaultDirection: z.enum(['asc', 'desc']),
  })),
  selectedSort: z.string().optional(),
  onSortChange: z.function().args(z.string(), z.enum(['asc', 'desc'])).returns(z.void()),
  children: z.custom<ReactNode>().optional(), // Custom filter UI slot
})

type GalleryFilterBarProps = z.infer<typeof GalleryFilterBarPropsSchema>

export function GalleryFilterBar({
  search,
  onSearchChange,
  sortOptions,
  selectedSort,
  onSortChange,
  children, // Render custom filters here
}: GalleryFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Custom filters slot - renders gallery-specific UI like store tabs */}
      {children && <div className="custom-filters">{children}</div>}

      {/* Standard search and sort controls */}
      <div className="flex items-center gap-4">
        <SearchInput value={search} onChange={onSearchChange} />
        <SortSelect options={sortOptions} value={selectedSort} onChange={onSortChange} />
      </div>
    </div>
  )
}

// Export schema for extension
export { GalleryFilterBarPropsSchema }
```

**Key Points:**
- `children` prop allows custom filter UI (e.g., store tabs, priority filters)
- Standard search/sort remains reusable across all galleries
- Each gallery app controls its own filter UI via composition

---

### WishlistCard Component

```typescript
// apps/web/app-wishlist-gallery/src/components/WishlistCard.tsx
import { z } from 'zod'
import { GalleryCard, GalleryCardPropsSchema } from '@repo/gallery'
import { WishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui'
import { MoreVertical, Eye, Pencil, Trash, ShoppingCart, Star } from 'lucide-react'

// Extend the base GalleryCardPropsSchema with wishlist-specific props
const WishlistCardPropsSchema = GalleryCardPropsSchema.extend({
  item: WishlistItemSchema,
  onView: z.function().args(z.string()).returns(z.void()).optional(),
  onEdit: z.function().args(z.string()).returns(z.void()).optional(),
  onRemove: z.function().args(z.string()).returns(z.void()).optional(),
  onGotIt: z.function().args(z.string()).returns(z.void()).optional(),
})

type WishlistCardProps = z.infer<typeof WishlistCardPropsSchema>

export function WishlistCard({ item, onView, onEdit, onRemove, onGotIt, ...galleryCardProps }: WishlistCardProps) {
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

### Module Entry Point

```typescript
// apps/web/app-wishlist-gallery/src/Module.tsx
import { z } from 'zod'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'

const WishlistGalleryModulePropsSchema = z.object({
  className: z.string().optional(),
})

export type WishlistGalleryModuleProps = z.infer<typeof WishlistGalleryModulePropsSchema>

export function WishlistGalleryModule({ className }: WishlistGalleryModuleProps) {
  return (
    <ModuleLayout className={className}>
      <MainPage />
    </ModuleLayout>
  )
}

export default WishlistGalleryModule
```

### Gallery Page (Main Page)

```typescript
// apps/web/app-wishlist-gallery/src/pages/main-page.tsx
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { GalleryGrid, GalleryFilterBar, GalleryEmptyState, GallerySkeleton, useGalleryUrl } from '@repo/gallery'
import { useGetWishlistQuery } from '@repo/api-client/rtk/wishlist-api'
import { Button, Tabs, TabsList, TabsTrigger, Badge } from '@repo/ui'
import { Plus, Heart } from 'lucide-react'
import { WishlistCard } from '../components/WishlistCard'

const StoreFilterSchema = z.enum(['all', 'LEGO', 'Barweer', 'Other'])
type StoreFilter = z.infer<typeof StoreFilterSchema>

export function MainPage() {
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

      {/* Filter Bar with Custom Store Tabs as Children */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s })}
        sortOptions={wishlistSortOptions}
        selectedSort={state.sortField}
        onSortChange={(s, d) => updateUrl({ sortField: s, sortDirection: d })}
      >
        {/* Custom filter UI passed as children */}
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
      </GalleryFilterBar>

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

### Main-App Module Integration

```typescript
// apps/web/main-app/src/routes/modules/WishlistModule.tsx
import { lazy, Suspense } from 'react'
import { GallerySkeleton } from '@repo/gallery'

// Lazy-load the wishlist gallery module from @repo/app-wishlist-gallery
const WishlistGalleryModule = lazy(() => import('@repo/app-wishlist-gallery'))

export function WishlistModule() {
  return (
    <Suspense fallback={<GallerySkeleton count={12} />}>
      <WishlistGalleryModule />
    </Suspense>
  )
}
```

### Project Structure

```
apps/web/app-wishlist-gallery/        # Micro-app (workspace package)
  src/
    Module.tsx                        # Main export for lazy-loading
    pages/
      main-page.tsx                   # Gallery page
    components/
      WishlistCard.tsx                # Card component
      module-layout.tsx               # Layout wrapper

apps/web/main-app/                    # Shell app
  src/routes/
    modules/
      WishlistModule.tsx              # Lazy-loads @repo/app-wishlist-gallery
    pages/
      WishlistPage.tsx                # Route page using WishlistModule
```

### MSW Handlers for Unit Tests (Task 4)

Update the existing MSW handlers in `app-wishlist-gallery` to mock wishlist API endpoints:

```typescript
// apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Mock data matching Zod schemas from @repo/api-client
const mockWishlistItems = [
  {
    id: 'wish-001',
    title: 'Millennium Falcon',
    setNumber: '75192',
    store: 'LEGO',
    price: 849.99,
    currency: 'USD',
    pieceCount: 7541,
    priority: 5,
    imageUrl: '/mock-images/falcon.jpg',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'wish-002',
    title: 'Star Destroyer',
    setNumber: '75252',
    store: 'Barweer',
    price: 159.99,
    currency: 'USD',
    pieceCount: 4784,
    priority: 3,
    imageUrl: '/mock-images/star-destroyer.jpg',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
]

export const handlers = [
  // GET /api/wishlist - List items
  http.get(`${API_BASE_URL}/api/wishlist`, ({ request }) => {
    const url = new URL(request.url)
    const store = url.searchParams.get('store')
    const q = url.searchParams.get('q')

    let items = [...mockWishlistItems]

    // Filter by store
    if (store) {
      items = items.filter(item => item.store === store)
    }

    // Filter by search query
    if (q) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(q.toLowerCase()) ||
        item.setNumber?.includes(q)
      )
    }

    return HttpResponse.json({
      items,
      total: items.length,
      page: 1,
      limit: 20,
      counts: { total: mockWishlistItems.length, LEGO: 1, Barweer: 1 },
    })
  }),

  // GET /api/wishlist/:id - Get single item
  http.get(`${API_BASE_URL}/api/wishlist/:id`, ({ params }) => {
    const item = mockWishlistItems.find(i => i.id === params.id)
    if (item) {
      return HttpResponse.json(item)
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),

  // Error simulation
  http.get(`${API_BASE_URL}/api/wishlist/error`, () => {
    return HttpResponse.json({ error: 'Server error' }, { status: 500 })
  }),
]
```

**Usage in tests:**
```typescript
import { server } from '../test/mocks/server'
import { http, HttpResponse } from 'msw'

// Override for specific test scenario
server.use(
  http.get('*/api/wishlist', () => {
    return HttpResponse.json({ items: [], total: 0 }) // Empty state
  })
)
```

---

### E2E Mocks (Task 7)

```typescript
// apps/web/playwright/utils/wishlist-mocks.ts
import { Page, Route } from '@playwright/test'
import { z } from 'zod'

// Mock data following the Zod schemas from @repo/api-client
export const wishlistMockData = {
  items: [
    {
      id: 'wish-001',
      title: 'Millennium Falcon',
      setNumber: '75192',
      store: 'LEGO',
      price: 849.99,
      currency: 'USD',
      pieceCount: 7541,
      priority: 5,
      imageUrl: '/mock-images/falcon.jpg',
    },
    // ... more items
  ],
}

export const wishlistMockResponses = {
  list: (items = wishlistMockData.items) => ({
    items,
    total: items.length,
    page: 1,
    limit: 20,
    counts: { total: items.length, LEGO: 5, Barweer: 3, Other: 2 },
  }),
  empty: () => ({ items: [], total: 0, page: 1, limit: 20, counts: {} }),
  error: (status: number, message: string) => ({ error: message, status }),
}

export async function setupWishlistMocks(page: Page, options: { scenario?: 'success' | 'empty' | 'error' } = {}) {
  const { scenario = 'success' } = options

  await page.route('**/api/wishlist', async (route: Route) => {
    if (scenario === 'error') {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    } else if (scenario === 'empty') {
      await route.fulfill({ status: 200, body: JSON.stringify(wishlistMockResponses.empty()) })
    } else {
      await route.fulfill({ status: 200, body: JSON.stringify(wishlistMockResponses.list()) })
    }
  })

  await page.route('**/api/wishlist/*', async (route: Route) => {
    const id = route.request().url().split('/').pop()
    const item = wishlistMockData.items.find(i => i.id === id)
    if (item) {
      await route.fulfill({ status: 200, body: JSON.stringify(item) })
    } else {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) })
    }
  })
}
```

## Testing

### API Tests

- [ ] GET /api/wishlist returns paginated list
- [ ] GET /api/wishlist?store=LEGO filters correctly
- [ ] GET /api/wishlist?q=castle searches title/setNumber
- [ ] GET /api/wishlist?sort=price&order=asc sorts correctly
- [ ] GET /api/wishlist/:id returns single item
- [ ] GET /api/wishlist/:id returns 404 for invalid ID
- [ ] GET /api/wishlist/:id returns 403 for other user's item

### Component Tests (with MSW)

**Note**: Component and integration tests use MSW (Mock Service Worker) to mock API endpoints at the network level.

- [ ] WishlistCard renders all item data correctly
- [ ] WishlistCard shows correct store badge
- [ ] WishlistCard formats price correctly with currency
- [ ] WishlistCard shows priority badge for high priority
- [ ] WishlistCard dropdown actions call handlers
- [ ] RTK Query hooks return mocked data correctly
- [ ] Error states render when MSW returns error responses

### Page Tests

- [ ] Route `/wishlist` renders page
- [ ] Store tabs filter items correctly
- [ ] Item counts update with filters
- [ ] Empty state shows for new users
- [ ] Loading skeleton shows while fetching
- [ ] "Add Item" button navigates to add page

### E2E Tests (Playwright with Mocked API)

**Note**: E2E tests use Playwright's `page.route()` to mock all API endpoints, allowing full UI testing without deploying the backend.

- [ ] Gallery displays mocked wishlist items
- [ ] Store filter tabs filter items correctly
- [ ] Search filters items by title/setNumber
- [ ] Sort dropdown changes item order
- [ ] Empty state displays when no items
- [ ] Loading skeleton displays during fetch
- [ ] WishlistCard hover shows action menu
- [ ] "Add Item" button navigates to /wishlist/add
- [ ] Error state displays on API failure (mocked 500)

## Definition of Done

- [ ] Shared gallery components work for wishlist use case
- [ ] API endpoints return correct data with proper filtering/sorting
- [ ] RTK Query hooks work correctly with cache invalidation
- [ ] WishlistCard displays all required metadata
- [ ] Gallery page renders with proper filtering
- [ ] Unit and component tests pass
- [ ] E2E tests pass (with mocked API - no backend deployment required)
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                              | Author   |
| ---------- | ------- | -------------------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                            | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from wish-1000, 1001, 1002 (list), 1005    | Claude   |
| 2025-12-27 | 0.3     | Zod-first types, monorepo architecture, composable gallery filters, MSW/Playwright mocks, Storybook | SM Agent |
