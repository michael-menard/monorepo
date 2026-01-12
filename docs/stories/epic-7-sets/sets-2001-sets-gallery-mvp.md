# Story sets-2001: Sets Gallery MVP (Vertical Slice)

## Status

In Progress

## Consolidates

- sets-1002: List Sets Endpoint
- sets-1003: Get Single Set Endpoint
- sets-1007: Gallery Page Scaffolding
- sets-1008: Set Card Component
- sets-1009: Set Detail Page

## Story

**As a** user,
**I want** to view my set collection in a gallery and see set details,
**So that** I can browse and manage my owned sets.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - User Interface > Gallery View, Detail View

## Dependencies

- **sets-2000**: Database Schema & Shared Types

## Acceptance Criteria

### API Endpoints

1. [x] GET /api/sets returns paginated list of user's sets
2. [x] Only returns sets owned by authenticated user
3. [x] Supports search by title and setNumber
4. [x] Supports filtering by theme, tags, isBuilt
5. [x] Supports sorting by title, pieceCount, purchaseDate, purchasePrice, createdAt
6. [x] Returns pagination metadata (page, limit, total, totalPages)
7. [x] Returns available filters (themes, tags) for filter UI
8. [x] GET /api/sets/:id returns single set with all fields
9. [x] Includes all associated images ordered by position
10. [x] Returns 404 if set not found
11. [x] Returns 403 if set belongs to different user
12. [x] RTK Query hooks created and exported

### Gallery Page

13. [x] Route `/sets` configured with lazy loading
14. [x] Page uses shared @repo/gallery components
15. [x] Integrates with useGetSetsQuery for data
16. [x] Filter bar with search, theme, isBuilt filters
17. [x] Sort options: title, pieceCount, purchaseDate, purchasePrice
18. [x] "Add Set" button in header navigates to add page
19. [x] Loading skeleton while fetching
20. [ ] Navigation link added to app sidebar/nav

### Set Card Component

21. [x] SetGalleryCard component is implemented as a thin wrapper around `AppGalleryCard` from `@repo/app-component-library`
22. [x] Displays set image thumbnail (using first image or fallback)
23. [x] Shows title and set number
24. [x] Shows piece count with icon
25. [x] Shows theme badge
26. [x] Shows build status indicator (Built/In Pieces) with color AND icon
27. [x] Shows quantity badge if quantity > 1
28. [x] Hover shows action menu (view, edit, delete)
29. [x] Click navigates to detail page

### Detail Page

29. [x] Route `/sets/:id` renders detail page
30. [x] Shows all set images in gallery grid
31. [x] Lightbox opens on image click
32. [x] Displays set metadata (title, setNumber, pieceCount, theme, tags)
33. [x] Displays purchase info section (price, tax, shipping, date, total)
34. [x] Shows notes if present
35. [x] Edit button navigates to edit page
36. [x] Delete button triggers confirmation
37. [x] Back button returns to gallery
38. [x] 404 page for non-existent set

## Tasks / Subtasks

### Task 1: Create List Endpoint (AC: 1-7)

- [x] Create `apps/api/endpoints/sets/list/handler.ts`
- [x] Parse and validate query params with SetListQuerySchema
- [x] Build Drizzle query with filters
- [x] Implement search: ILIKE on title and setNumber
- [x] Implement theme filter: exact match
- [x] Implement isBuilt filter: boolean match
- [x] Implement tags filter: array contains
- [x] Implement dynamic ORDER BY based on sortField/sortDirection
- [x] Implement LIMIT/OFFSET pagination
- [x] Count query for total
- [x] Query distinct themes and tags for filter options
- [x] Left join with set_images for thumbnails

### Task 2: Create Get Endpoint (AC: 8-11)

- [x] Create `apps/api/endpoints/sets/get/handler.ts`
- [x] Extract setId from path params
- [x] Query set by ID with images joined
- [x] Order images by position
- [x] Verify ownership before returning
- [x] Return 404 if not found, 403 if unauthorized

### Task 3: Create RTK Query Slice (AC: 12)

- [x] Create `packages/core/api-client/src/rtk/sets-api.ts`
- [x] Define `getSets` query with params
- [x] Define `getSetById` query
- [x] Configure cache tags for invalidation
- [x] Transform responses with Zod schemas
- [x] Export hooks: `useGetSetsQuery`, `useGetSetByIdQuery`

### Task 3.5: Extract GalleryCard into app-component-library

- [x] Extract `GalleryCard` from `@repo/gallery` into `@repo/app-component-library` as `AppGalleryCard` (shared primitive for gallery-style cards).
- [x] Ensure `@repo/app-component-library` exports `AppGalleryCard` for use across apps.
- [x] Update sets gallery components to import and use `AppGalleryCard` from `@repo/app-component-library` instead of `GalleryCard` from `@repo/gallery`.

### Task 4: Create SetGalleryCard Component (AC: 21-29)

- [x] Create `apps/web/app-sets-gallery/src/components/SetCard.tsx` (SetGalleryCard) as the Sets-specific adapter
- [x] Implement as a thin adapter over `AppGalleryCard` from `@repo/app-component-library`
- [x] Map `Set` image(s) into `AppGalleryCard.image` with 4:3 aspect ratio and fallback
- [x] Map title/setNumber into `AppGalleryCard.title` / `subtitle`
- [x] Render piece count, theme, build status, and quantity badges via `metadata` slot
- [x] Render view/edit/delete actions via `actions` slot (hover overlay)
- [x] Expose `onClick`, `onEdit`, `onDelete` callbacks
- [x] Ensure keyboard accessibility via `AppGalleryCard` (Enter/Space) is preserved

### Task 5: Create Gallery Page (AC: 13-20)

- [x] Create `apps/web/app-sets-gallery/src/pages/main-page.tsx`
- [x] Implement `MainPage` using React Router inside the feature module
- [x] Expose `AppSetsGalleryModule` from `apps/web/app-sets-gallery/src/Module.tsx`
- [x] Wire `/sets` route in main-app TanStack Router to lazy-load the Sets Gallery module (similar to `InstructionsModule`)
- [x] Header with title and Add Set button
- [x] GalleryFilterBar with search, theme, isBuilt filters
- [x] Sort dropdown with options
- [x] Loading state with GalleryGrid/GalleryDataTable while fetching
- [x] GalleryGrid with SetGalleryCard items
- [x] Pagination controls for multi-page results
- [x] Add /sets to navigation menu in the shell app

### Task 6: Create Detail Page (AC: 29-38)

- [x] Create (and reuse) `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` as the canonical Sets detail page
- [x] Migrate existing SetDetailPage implementation to load data via `useGetSetByIdQuery` from `@repo/api-client/rtk/sets-api`
- [x] Header with back button, title, edit/delete actions
- [x] Two-column layout (images left, metadata right)
- [x] Image gallery area (grid or carousel) with lightbox on click
- [x] SetDetailsCard-style section (number, pieces, theme, tags, build status, quantity)
- [x] PurchaseInfoCard-style section (price, tax, shipping, date, total)
- [x] Notes section, only when notes are present
- [x] Loading skeleton and 404 states

## Dev Notes

### List Endpoint Handler

```typescript
// apps/api/endpoints/sets/list/handler.ts
import { SetListQuerySchema, SetListResponseSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const query = SetListQuerySchema.parse(parseQueryParams(event))

  const { items, total } = await listSets(userId, query)
  const filters = await getAvailableFilters(userId)

  const response = SetListResponseSchema.parse({
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
    filters,
  })

  return success(response)
}
```

### Database Query with Filters

```typescript
async function listSets(userId: string, query: SetListQuery) {
  const conditions = [eq(sets.userId, userId)]

  if (query.search) {
    conditions.push(
      or(
        ilike(sets.title, `%${query.search}%`),
        ilike(sets.setNumber, `%${query.search}%`)
      )
    )
  }

  if (query.theme) {
    conditions.push(eq(sets.theme, query.theme))
  }

  if (query.isBuilt !== undefined) {
    conditions.push(eq(sets.isBuilt, query.isBuilt))
  }

  if (query.tags?.length) {
    conditions.push(arrayContains(sets.tags, query.tags))
  }

  const orderColumn = sets[query.sortField]
  const orderDirection = query.sortDirection === 'asc' ? asc : desc

  const [items, countResult] = await Promise.all([
    db.select()
      .from(sets)
      .leftJoin(setImages, eq(sets.id, setImages.setId))
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    db.select({ count: count() })
      .from(sets)
      .where(and(...conditions)),
  ])

  return { items: aggregateImages(items), total: countResult[0].count }
}
```

### RTK Query Slice

```typescript
// packages/core/api-client/src/rtk/sets-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from './base-query'
import { SetListResponseSchema, SetSchema, SetListQuery, Set } from '../schemas/sets'

export const setsApi = createApi({
  reducerPath: 'setsApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Set'],
  endpoints: (builder) => ({
    getSets: builder.query<SetListResponse, Partial<SetListQuery>>({
      query: (params) => ({
        url: '/sets',
        params,
      }),
      transformResponse: (response) => SetListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Set' as const, id })),
              { type: 'Set', id: 'LIST' },
            ]
          : [{ type: 'Set', id: 'LIST' }],
    }),

    getSetById: builder.query<Set, string>({
      query: (id) => `/sets/${id}`,
      transformResponse: (response) => SetSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Set', id }],
    }),
  }),
})

export const { useGetSetsQuery, useGetSetByIdQuery } = setsApi
```

### SetGalleryCard Component (adapter over GalleryCard)

```typescript
// apps/web/app-sets-gallery/src/components/SetGalleryCard.tsx
import type { Set } from '@repo/api-client'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@repo/app-component-library'
import { GalleryCard } from '@repo/gallery'
import { MoreVertical, Eye, Pencil, Trash, Blocks, CheckCircle } from 'lucide-react'

interface SetGalleryCardProps {
  set: Set
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function SetGalleryCard({ set, onClick, onEdit, onDelete }: SetGalleryCardProps) {
  const primaryImage = set.images[0]

  return (
    <GalleryCard
      image={{
        src: primaryImage?.thumbnailUrl ?? primaryImage?.imageUrl ?? '/images/set-placeholder.png',
        alt: set.title,
        aspectRatio: '4/3',
      }}
      title={set.title}
      subtitle={set.setNumber ? `#${set.setNumber}` : undefined}
      metadata={
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {set.pieceCount ? (
            <span className="flex items-center gap-1">
              <Blocks className="h-3 w-3" />
              {set.pieceCount.toLocaleString()}
            </span>
          ) : null}
          {set.theme ? (
            <Badge variant="outline" className="text-xs">
              {set.theme}
            </Badge>
          ) : null}
          <BuildStatusBadge isBuilt={set.isBuilt} />
          {set.quantity > 1 ? (
            <Badge variant="secondary" className="text-xs">
              x{set.quantity}
            </Badge>
          ) : null}
        </div>
      }
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                onClick?.()
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                onEdit?.()
              }}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={e => {
                e.stopPropagation()
                onDelete?.()
              }}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      onClick={onClick}
      selected={false}
      data-testid="set-gallery-card"
    />
  )
}

function BuildStatusBadge({ isBuilt }: { isBuilt: boolean }) {
  return (
    <Badge variant={isBuilt ? 'default' : 'secondary'} className="text-xs">
      {isBuilt ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Built
        </>
      ) : (
        <>
          <Blocks className="h-3 w-3 mr-1" />
          In Pieces
        </>
      )}
    </Badge>
  )
}
```

### Gallery Page

```typescript
// apps/web/app-sets-gallery/src/pages/main-page.tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { useViewMode, GalleryViewToggle, GalleryDataTable } from '@repo/gallery'
import { useGetSetsQuery } from '@repo/api-client'
import { GalleryFilterBar } from '../components/GalleryFilterBar'
import { GalleryGrid } from '../components/GalleryGrid'
import { SetGalleryCard } from '../components/SetGalleryCard'

function SetsGalleryMainPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('sets')
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error, refetch } = useGetSetsQuery({
    search: searchTerm,
    // Additional filters (theme, isBuilt, tags, sort, page, limit) wired from future stories
  })

  const sets = data?.items ?? []

  const filteredSets = useMemo(
    () =>
      sets.filter(set => {
        const query = searchTerm.toLowerCase()
        return (
          set.title.toLowerCase().includes(query) ||
          (set.setNumber ?? '').toLowerCase().includes(query) ||
          (set.theme ?? '').toLowerCase().includes(query)
        )
      }),
    [sets, searchTerm],
  )

  const handleSetClick = (setId: string) => {
    navigate(`/sets/${setId}`)
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Sets Collection</h1>
          <p className="text-muted-foreground mt-1">Manage and track your LEGO sets</p>
        </div>
        <Button onClick={() => navigate('/sets/add')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Set
        </Button>
      </div>

      {/* Filter Bar with View Toggle */}
      <GalleryFilterBar searchTerm={searchTerm} onSearchChange={setSearchTerm}>
        <GalleryViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </GalleryFilterBar>

      {/* Gallery Content */}
      {isLoading ? (
        <GalleryGrid items={[]} isLoading />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-2">Error loading sets</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <GalleryGrid items={filteredSets}>
          {set => <SetGalleryCard set={set} onClick={() => handleSetClick(set.id)} />}
        </GalleryGrid>
      ) : (
        <GalleryDataTable
          items={filteredSets}
          // Column definition provided by app-sets-gallery (setsColumns)
          // and wired in the actual implementation
          columns={[] as any}
          isLoading={false}
          onRowClick={set => handleSetClick(set.id)}
          ariaLabel="Sets collection table"
          enableSorting
          enableMultiSort
          maxMultiSortColCount={2}
        />
      )}
    </div>
  )
}
```

### Route & Module Structure

```
apps/web/app-sets-gallery/
  src/
    Module.tsx                    # Feature module entry (lazy-loaded by main-app)
    pages/
      main-page.tsx               # Sets gallery page (/sets)
      set-detail-page.tsx         # Detail page (/sets/:id)
      add-set-page.tsx            # Add set page (sets-2002)
    components/
      SetGalleryCard.tsx          # Set-specific adapter over GalleryCard
      GalleryGrid.tsx             # Grid wrapper for sets
      GalleryFilterBar.tsx        # Search + view toggle bar
```

## Testing

### Test Infrastructure (MSW)

- UI and page components MUST call real RTK Query hooks from `@repo/api-client` (no direct imports from mock API modules).
- Network mocking for frontend tests MUST be implemented with MSW handlers for `/api/sets` and `/api/sets/:id`.
- MSW handlers should live in shared test setup so all suites reuse the same mocked server behavior.

### API Tests

- [ ] GET /api/sets returns only authenticated user's sets
- [ ] Unauthenticated request returns 401
- [ ] Search filters by title
- [ ] Search filters by setNumber
- [ ] Theme filter works
- [ ] isBuilt filter works
- [ ] Tags filter works
- [ ] Sorting works for all fields
- [ ] Pagination returns correct page/total
- [ ] Empty collection returns empty array
- [ ] GET /api/sets/:id returns set with images
- [ ] GET /api/sets/:id returns 404 for non-existent ID
- [ ] GET /api/sets/:id returns 403 for other user's set
- [ ] Images ordered by position

### Component Tests

- [ ] SetGalleryCard renders set title
- [ ] SetGalleryCard renders set number with # prefix
- [ ] SetGalleryCard renders piece count formatted
- [ ] SetGalleryCard shows theme badge
- [ ] SetGalleryCard shows "Built" badge when isBuilt=true
- [ ] SetGalleryCard shows "In Pieces" badge when isBuilt=false
- [ ] SetGalleryCard shows quantity badge when quantity > 1
- [ ] SetGalleryCard hides quantity badge when quantity = 1
- [ ] SetGalleryCard shows placeholder when no images (via GalleryCard fallback)
- [ ] SetGalleryCard dropdown actions call correct handlers
- [ ] SetGalleryCard click calls onClick handler (propagated through GalleryCard)

### Page Tests

- [ ] Route /sets renders page
- [ ] Loading skeleton shows while fetching
- [ ] Sets display in grid after load
- [ ] Search filters sets
- [ ] Theme filter works
- [ ] isBuilt filter works
- [ ] Sorting changes order
- [ ] Pagination works
- [ ] Add Set button navigates to /sets/add
- [ ] Navigation menu includes Sets link
- [ ] Detail page renders with valid set ID
- [ ] Detail page shows 404 for invalid ID
- [ ] Detail page displays all metadata
- [ ] Lightbox opens on image click
- [ ] Back button navigates to gallery

## Definition of Done

- [ ] All API endpoints return correct data with proper filtering/sorting
- [ ] RTK Query hooks work correctly with cache invalidation
- [ ] UI components call `useGetSetsQuery` / `useGetSetByIdQuery` from `@repo/api-client` (no in-app mock API usage)
- [ ] Frontend tests use MSW to mock `/api/sets` and `/api/sets/:id` instead of mock API modules
- [ ] SetGalleryCard (GalleryCard adapter) displays all required metadata with accessibility
- [ ] Gallery page renders with proper filtering and sorting
- [ ] Detail page shows full set information
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                                     | Author |
| ---------- | ------- | --------------------------------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                                                   | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1002, 1003, 1007, 1008, 1009             | Claude |
