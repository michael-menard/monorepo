# Story sets-2001: Sets Gallery MVP (Vertical Slice)

## Status

Draft

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

1. [ ] GET /api/sets returns paginated list of user's sets
2. [ ] Only returns sets owned by authenticated user
3. [ ] Supports search by title and setNumber
4. [ ] Supports filtering by theme, tags, isBuilt
5. [ ] Supports sorting by title, pieceCount, purchaseDate, purchasePrice, createdAt
6. [ ] Returns pagination metadata (page, limit, total, totalPages)
7. [ ] Returns available filters (themes, tags) for filter UI
8. [ ] GET /api/sets/:id returns single set with all fields
9. [ ] Includes all associated images ordered by position
10. [ ] Returns 404 if set not found
11. [ ] Returns 403 if set belongs to different user
12. [ ] RTK Query hooks created and exported

### Gallery Page

13. [ ] Route `/sets` configured with lazy loading
14. [ ] Page uses shared @repo/gallery components
15. [ ] Integrates with useGetSetsQuery for data
16. [ ] Filter bar with search, theme, isBuilt filters
17. [ ] Sort options: title, pieceCount, purchaseDate, purchasePrice
18. [ ] "Add Set" button in header navigates to add page
19. [ ] Loading skeleton while fetching
20. [ ] Navigation link added to app sidebar/nav

### Set Card Component

21. [ ] SetCard component displays set image thumbnail
22. [ ] Shows title and set number
23. [ ] Shows piece count with icon
24. [ ] Shows theme badge
25. [ ] Shows build status indicator (Built/In Pieces) with color AND icon
26. [ ] Shows quantity badge if quantity > 1
27. [ ] Hover shows action menu (view, edit, delete)
28. [ ] Click navigates to detail page

### Detail Page

29. [ ] Route `/sets/:setId` renders detail page
30. [ ] Shows all set images in gallery grid
31. [ ] Lightbox opens on image click
32. [ ] Displays set metadata (title, setNumber, pieceCount, theme, tags)
33. [ ] Displays purchase info section (price, tax, shipping, date, total)
34. [ ] Shows notes if present
35. [ ] Edit button navigates to edit page
36. [ ] Delete button triggers confirmation
37. [ ] Back button returns to gallery
38. [ ] 404 page for non-existent set

## Tasks / Subtasks

### Task 1: Create List Endpoint (AC: 1-7)

- [ ] Create `apps/api/endpoints/sets/list/handler.ts`
- [ ] Parse and validate query params with SetListQuerySchema
- [ ] Build Drizzle query with filters
- [ ] Implement search: ILIKE on title and setNumber
- [ ] Implement theme filter: exact match
- [ ] Implement isBuilt filter: boolean match
- [ ] Implement tags filter: array contains
- [ ] Implement dynamic ORDER BY based on sortField/sortDirection
- [ ] Implement LIMIT/OFFSET pagination
- [ ] Count query for total
- [ ] Query distinct themes and tags for filter options
- [ ] Left join with set_images for thumbnails

### Task 2: Create Get Endpoint (AC: 8-11)

- [ ] Create `apps/api/endpoints/sets/get/handler.ts`
- [ ] Extract setId from path params
- [ ] Query set by ID with images joined
- [ ] Order images by position
- [ ] Verify ownership before returning
- [ ] Return 404 if not found, 403 if unauthorized

### Task 3: Create RTK Query Slice (AC: 12)

- [ ] Create `packages/core/api-client/src/rtk/sets-api.ts`
- [ ] Define `getSets` query with params
- [ ] Define `getSetById` query
- [ ] Configure cache tags for invalidation
- [ ] Transform responses with Zod schemas
- [ ] Export hooks: `useGetSetsQuery`, `useGetSetByIdQuery`

### Task 4: Create SetCard Component (AC: 21-28)

- [ ] Create `routes/sets/-components/SetCard/index.tsx`
- [ ] Image thumbnail (aspect ratio 4:3) with fallback
- [ ] Title with truncation and set number
- [ ] Piece count display with icon
- [ ] Theme badge
- [ ] Build status badge (icon + color per PRD)
- [ ] Quantity badge overlay (if quantity > 1)
- [ ] Hover dropdown menu with actions
- [ ] Click handler for navigation

### Task 5: Create Gallery Page (AC: 13-20)

- [ ] Create `routes/sets/index.tsx`
- [ ] Configure TanStack Router file-based route with lazy loading
- [ ] Header with title and Add Set button
- [ ] Use useGalleryUrl hook for URL state management
- [ ] GalleryFilterBar with search, theme, isBuilt filters
- [ ] Sort dropdown with options
- [ ] Loading state with GallerySkeleton
- [ ] GalleryGrid with SetCard items
- [ ] Pagination component
- [ ] Add /sets to navigation menu

### Task 6: Create Detail Page (AC: 29-38)

- [ ] Create `routes/sets/$setId/index.tsx`
- [ ] Fetch set with useGetSetByIdQuery
- [ ] Header with back button, title, edit/delete actions
- [ ] Two-column layout (images left, metadata right)
- [ ] Image gallery grid with lightbox on click
- [ ] SetDetailsCard component (number, pieces, theme, tags, build status, quantity)
- [ ] PurchaseInfoCard component (price, tax, shipping, date, total)
- [ ] NotesCard component
- [ ] Loading skeleton and 404 states

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

### SetCard Component

```typescript
// routes/sets/-components/SetCard/index.tsx
import { Set } from '@repo/api-client'
import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@repo/ui'
import { MoreVertical, Eye, Pencil, Trash, Package, Blocks, CheckCircle } from 'lucide-react'

interface SetCardProps {
  set: Set
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function SetCard({ set, onClick, onEdit, onDelete }: SetCardProps) {
  return (
    <div
      className="group relative cursor-pointer rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
        {set.images[0] ? (
          <img
            src={set.images[0].thumbnailUrl ?? set.images[0].imageUrl}
            alt={set.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Quantity Badge */}
        {set.quantity > 1 && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            x{set.quantity}
          </Badge>
        )}

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.() }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.() }}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete?.() }}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium truncate">{set.title}</h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {set.setNumber && <span>#{set.setNumber}</span>}
          {set.pieceCount && (
            <span className="flex items-center gap-1">
              <Blocks className="h-3 w-3" />
              {set.pieceCount.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {set.theme && (
            <Badge variant="outline" className="text-xs">
              {set.theme}
            </Badge>
          )}
          <BuildStatusBadge isBuilt={set.isBuilt} />
        </div>
      </div>
    </div>
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
// routes/sets/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GalleryGrid, GalleryFilterBar, GallerySkeleton, useGalleryUrl } from '@repo/gallery'
import { useGetSetsQuery } from '@repo/api-client'
import { Button } from '@repo/ui'
import { Plus } from 'lucide-react'
import { SetCard } from './-components/SetCard'

export const Route = createFileRoute('/sets/')({
  component: SetsGalleryPage,
})

function SetsGalleryPage() {
  const { state, updateUrl } = useGalleryUrl()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useGetSetsQuery({
    search: state.search,
    theme: state.theme,
    isBuilt: state.isBuilt,
    tags: state.tags,
    sortField: state.sortField ?? 'createdAt',
    sortDirection: state.sortDirection ?? 'desc',
    page: state.page ?? 1,
    limit: 20,
  })

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Sets</h1>
        <Button onClick={() => navigate({ to: '/sets/add' })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </div>

      {/* Filter Bar */}
      <GalleryFilterBar
        search={state.search}
        onSearchChange={(s) => updateUrl({ search: s, page: 1 })}
        filters={[
          {
            key: 'theme',
            label: 'Theme',
            options: data?.filters.availableThemes ?? [],
            value: state.theme,
            onChange: (v) => updateUrl({ theme: v, page: 1 }),
          },
          {
            key: 'isBuilt',
            label: 'Status',
            options: [
              { value: 'true', label: 'Built' },
              { value: 'false', label: 'In Pieces' },
            ],
            value: state.isBuilt?.toString(),
            onChange: (v) => updateUrl({ isBuilt: v === 'true', page: 1 }),
          },
        ]}
        sortOptions={[
          { value: 'createdAt', label: 'Date Added' },
          { value: 'title', label: 'Name' },
          { value: 'pieceCount', label: 'Piece Count' },
          { value: 'purchaseDate', label: 'Purchase Date' },
          { value: 'purchasePrice', label: 'Price Paid' },
        ]}
        currentSort={state.sortField}
        currentDirection={state.sortDirection}
        onSortChange={(field, dir) => updateUrl({ sortField: field, sortDirection: dir })}
      />

      {/* Gallery Content */}
      {isLoading ? (
        <GallerySkeleton count={12} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <GalleryGrid>
          {data?.items.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onClick={() => navigate({ to: '/sets/$setId', params: { setId: set.id } })}
              onEdit={() => navigate({ to: '/sets/$setId/edit', params: { setId: set.id } })}
              onDelete={() => handleDelete(set.id)}
            />
          ))}
        </GalleryGrid>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={(p) => updateUrl({ page: p })}
        />
      )}
    </div>
  )
}
```

### Route Structure

```
apps/web/main-app/src/routes/
└── sets/
    ├── index.tsx           # Gallery page
    ├── $setId/
    │   └── index.tsx       # Detail page
    └── -components/
        ├── SetCard/
        │   └── index.tsx
        ├── SetDetailsCard.tsx
        ├── PurchaseInfoCard.tsx
        └── BuildStatusBadge.tsx
```

## Testing

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

- [ ] SetCard renders set title
- [ ] SetCard renders set number with # prefix
- [ ] SetCard renders piece count formatted
- [ ] SetCard shows theme badge
- [ ] SetCard shows "Built" badge when isBuilt=true
- [ ] SetCard shows "In Pieces" badge when isBuilt=false
- [ ] SetCard shows quantity badge when quantity > 1
- [ ] SetCard hides quantity badge when quantity = 1
- [ ] SetCard shows placeholder when no images
- [ ] SetCard dropdown actions call correct handlers
- [ ] SetCard click calls onClick handler

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
- [ ] SetCard displays all required metadata with accessibility
- [ ] Gallery page renders with proper filtering and sorting
- [ ] Detail page shows full set information
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                                     | Author |
| ---------- | ------- | --------------------------------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                                                   | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1002, 1003, 1007, 1008, 1009             | Claude |
