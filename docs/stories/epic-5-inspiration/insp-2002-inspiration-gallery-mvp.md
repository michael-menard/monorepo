# Story insp-2002: Inspiration Gallery MVP (Vertical Slice)

## Status

Draft

## Consolidates

- insp-1004.list-inspirations-endpoint
- insp-1005.gallery-page-scaffolding
- insp-1006.inspiration-card-component
- insp-1007.get-inspiration-endpoint
- insp-1008.inspiration-detail-view

## Story

**As a** user,
**I want** to view my inspiration images in a gallery and see details for each,
**so that** I can browse my collection of visual references.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Gallery View, Detail View

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2001**: S3 Upload Infrastructure

## Acceptance Criteria

### API Endpoints

1. GET /api/inspirations returns paginated list of user's inspirations
2. Supports query params: q (search), tags, albumId, sort, order, page, limit
3. GET /api/inspirations/:id returns single inspiration with full details
4. Response includes albumIds and mocIds for each inspiration
5. Returns 404 for non-existent or other user's inspirations

### Gallery Page

6. Route /inspiration configured in router
7. InspirationGalleryPage component renders
8. Lazy loading configured for route
9. Page header with title and "Add" button (button links to upload modal in later story)
10. Integrates with shared gallery components if available
11. Grid layout displays InspirationCard components
12. Loading skeleton shows during fetch
13. Error state handled gracefully

### Card Component

14. InspirationCard displays image thumbnail with aspect ratio
15. Shows title (or "Untitled" fallback)
16. Shows tag chips (max 3 visible with +N overflow)
17. Click navigates to detail view
18. Lazy loads images for performance
19. Visual distinction from album cards (single image, not stacked)

### Detail View

20. Route /inspiration/:id renders detail page
21. Full-size image display
22. Metadata panel shows title, description, tags, source URL
23. "Also in:" section shows albums this image belongs to
24. Navigation back to gallery
25. Edit and Delete action buttons (functionality in later stories)

## Tasks / Subtasks

### Task 1: Create List Inspirations Endpoint (AC: 1, 2, 4)

- [ ] Create `apps/api/endpoints/inspirations/list/handler.ts`
- [ ] Parse query params with InspirationQueryParamsSchema
- [ ] Query database with filters:
  - q: search in title, description
  - tags: filter by any matching tag
  - albumId: filter by album membership
  - sort/order: apply ordering
  - page/limit: apply pagination
- [ ] Join to get albumIds and mocIds for each inspiration
- [ ] Return InspirationListResponseSchema

### Task 2: Create Get Inspiration Endpoint (AC: 3, 4, 5)

- [ ] Create `apps/api/endpoints/inspirations/get/handler.ts`
- [ ] Path param: id (UUID)
- [ ] Verify user owns inspiration
- [ ] Return full inspiration with albumIds, mocIds
- [ ] Return 404 if not found or not owned

### Task 3: Create RTK Query Slice (AC: 1, 3)

- [ ] Create `packages/core/api-client/src/rtk/inspiration-api.ts`
- [ ] Define getInspirations query with params
- [ ] Define getInspiration query for single item
- [ ] Configure cache tags for invalidation
- [ ] Transform responses with Zod schemas
- [ ] Export hooks

### Task 4: Create InspirationCard Component (AC: 14-19)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/InspirationCard/index.tsx`
- [ ] Use Card from @repo/ui
- [ ] Aspect ratio container for image (square or 4:3)
- [ ] Title with truncation and "Untitled" fallback
- [ ] Tag chips with overflow
- [ ] Click handler for navigation
- [ ] loading="lazy" for images
- [ ] Skeleton variant for loading state

### Task 5: Create Gallery Page (AC: 6-13)

- [ ] Create `apps/web/main-app/src/routes/inspiration/index.tsx`
- [ ] Configure TanStack Router file-based route
- [ ] Page header with title
- [ ] "Add" button placeholder (will open upload modal later)
- [ ] Filter/sort controls (or integrate with shared gallery)
- [ ] Loading state with skeleton cards
- [ ] Error state handling
- [ ] GalleryGrid with InspirationCard items
- [ ] Add to navigation menu

### Task 6: Create Detail Page (AC: 20-25)

- [ ] Create `apps/web/main-app/src/routes/inspiration/$id.tsx`
- [ ] Fetch inspiration with useGetInspirationQuery
- [ ] Full-size image display
- [ ] Metadata panel:
  - Title (editable in later story)
  - Description
  - Tags as chips
  - Source URL as link
- [ ] "Also in:" badges showing album memberships
- [ ] Back navigation link
- [ ] Edit button (placeholder for later story)
- [ ] Delete button (placeholder for later story)

## Dev Notes

### List Endpoint

```typescript
// apps/api/endpoints/inspirations/list/handler.ts
import { db } from '@/database'
import { inspirations, inspirationAlbums, inspirationMocs } from '@/database/schema'
import { InspirationQueryParamsSchema, InspirationListResponseSchema } from '@repo/api-client/schemas/inspiration'
import { eq, and, ilike, or, sql } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const params = InspirationQueryParamsSchema.parse(
    Object.fromEntries(new URLSearchParams(event.queryStringParameters || {}))
  )

  // Build query
  let query = db
    .select()
    .from(inspirations)
    .where(eq(inspirations.userId, userId))

  // Apply search
  if (params.q) {
    query = query.where(
      or(
        ilike(inspirations.title, `%${params.q}%`),
        ilike(inspirations.description, `%${params.q}%`)
      )
    )
  }

  // Apply tag filter
  if (params.tags) {
    const tagList = params.tags.split(',')
    query = query.where(
      sql`${inspirations.tags} && ${tagList}::text[]`
    )
  }

  // Apply album filter
  if (params.albumId) {
    query = query
      .innerJoin(inspirationAlbums, eq(inspirations.id, inspirationAlbums.inspirationId))
      .where(eq(inspirationAlbums.albumId, params.albumId))
  }

  // Apply sorting
  const orderDir = params.order === 'desc' ? 'desc' : 'asc'
  query = query.orderBy(
    orderDir === 'desc'
      ? sql`${inspirations[params.sort]} DESC`
      : sql`${inspirations[params.sort]} ASC`
  )

  // Apply pagination
  const offset = (params.page - 1) * params.limit
  query = query.limit(params.limit).offset(offset)

  const items = await query
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspirations)
    .where(eq(inspirations.userId, userId))
    .then(r => r[0].count)

  // Get album IDs for each inspiration
  const itemsWithAlbums = await Promise.all(
    items.map(async (item) => {
      const albums = await db
        .select({ albumId: inspirationAlbums.albumId })
        .from(inspirationAlbums)
        .where(eq(inspirationAlbums.inspirationId, item.id))
      const mocs = await db
        .select({ mocId: inspirationMocs.mocId })
        .from(inspirationMocs)
        .where(eq(inspirationMocs.inspirationId, item.id))
      return {
        ...item,
        albumIds: albums.map(a => a.albumId),
        mocIds: mocs.map(m => m.mocId),
      }
    })
  )

  return {
    statusCode: 200,
    body: JSON.stringify(
      InspirationListResponseSchema.parse({
        items: itemsWithAlbums,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit),
        },
      })
    ),
  }
}
```

### InspirationCard Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/InspirationCard/index.tsx
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, Badge } from '@repo/ui'
import type { Inspiration } from '@repo/api-client/schemas/inspiration'

interface InspirationCardProps {
  inspiration: Inspiration
}

export function InspirationCard({ inspiration }: InspirationCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
      onClick={() => navigate({ to: '/inspiration/$id', params: { id: inspiration.id } })}
    >
      <div className="aspect-square relative bg-muted">
        <img
          src={inspiration.imageUrl}
          alt={inspiration.title || 'Inspiration image'}
          className="object-cover w-full h-full"
          loading="lazy"
        />
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium truncate text-sm">
          {inspiration.title || 'Untitled'}
        </h3>
        {inspiration.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {inspiration.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {inspiration.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{inspiration.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function InspirationCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-muted animate-pulse" />
      <CardContent className="p-3 space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="flex gap-1">
          <div className="h-5 w-12 bg-muted animate-pulse rounded" />
          <div className="h-5 w-10 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
```

### Gallery Page

```typescript
// apps/web/main-app/src/routes/inspiration/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useGetInspirationsQuery } from '@repo/api-client/rtk/inspiration-api'
import { Button } from '@repo/ui'
import { Plus, Image } from 'lucide-react'
import { InspirationCard, InspirationCardSkeleton } from './-components/InspirationCard'

export const Route = createFileRoute('/inspiration/')({
  component: InspirationGalleryPage,
})

function InspirationGalleryPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useGetInspirationsQuery({
    page: 1,
    limit: 50,
    sort: 'sortOrder',
    order: 'asc',
  })

  if (error) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-destructive">Failed to load inspirations</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inspiration Gallery</h1>
        <Button onClick={() => {/* Opens upload modal - later story */}}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <InspirationCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-12">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">Start your inspiration collection</h2>
          <p className="text-muted-foreground mb-4">
            Upload images to collect ideas for your builds.
          </p>
          <Button onClick={() => {/* Opens upload modal */}}>
            <Plus className="w-4 h-4 mr-2" />
            Upload your first image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data?.items.map((item) => (
            <InspirationCard key={item.id} inspiration={item} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Detail Page

```typescript
// apps/web/main-app/src/routes/inspiration/$id.tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useGetInspirationQuery } from '@repo/api-client/rtk/inspiration-api'
import { Button, Badge } from '@repo/ui'
import { ArrowLeft, Pencil, Trash, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/inspiration/$id')({
  component: InspirationDetailPage,
})

function InspirationDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: inspiration, isLoading, error } = useGetInspirationQuery(id)

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-muted rounded mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted rounded" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !inspiration) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-destructive mb-4">Inspiration not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/inspiration' })}>
          Back to Gallery
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* Back Link */}
      <Link to="/inspiration" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Gallery
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          <img
            src={inspiration.imageUrl}
            alt={inspiration.title || 'Inspiration image'}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Metadata Panel */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">
              {inspiration.title || 'Untitled'}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => {/* Edit - later story */}}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="text-destructive" onClick={() => {/* Delete - later story */}}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {inspiration.description && (
            <p className="text-muted-foreground">{inspiration.description}</p>
          )}

          {inspiration.sourceUrl && (
            <a
              href={inspiration.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Source
            </a>
          )}

          {inspiration.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {inspiration.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {inspiration.albumIds.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Also in:</h3>
              <div className="flex flex-wrap gap-2">
                {/* Album badges - would need to fetch album titles */}
                {inspiration.albumIds.map((albumId) => (
                  <Link key={albumId} to="/inspiration/album/$id" params={{ id: albumId }}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      Album {/* Would show actual title */}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Added {new Date(inspiration.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### RTK Query

```typescript
// packages/core/api-client/src/rtk/inspiration-api.ts
import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithAuth } from './base-query'
import {
  InspirationListResponseSchema,
  InspirationSchema,
  InspirationQueryParams,
  Inspiration,
  InspirationListResponse,
} from '../schemas/inspiration'

export const inspirationApi = createApi({
  reducerPath: 'inspirationApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Inspiration', 'Album'],
  endpoints: (builder) => ({
    getInspirations: builder.query<InspirationListResponse, Partial<InspirationQueryParams>>({
      query: (params) => ({
        url: '/inspirations',
        params,
      }),
      transformResponse: (response) => InspirationListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Inspiration' as const, id })),
              { type: 'Inspiration', id: 'LIST' },
            ]
          : [{ type: 'Inspiration', id: 'LIST' }],
    }),

    getInspiration: builder.query<Inspiration, string>({
      query: (id) => `/inspirations/${id}`,
      transformResponse: (response) => InspirationSchema.parse(response),
      providesTags: (result, error, id) => [{ type: 'Inspiration', id }],
    }),
  }),
})

export const {
  useGetInspirationsQuery,
  useGetInspirationQuery,
} = inspirationApi
```

### Route Structure

```
apps/web/main-app/src/routes/
  inspiration/
    index.tsx                    # Gallery page
    $id.tsx                      # Detail page
    -components/
      InspirationCard/
        index.tsx                # Card component
        __tests__/
          InspirationCard.test.tsx
```

## Testing

### API Tests

- [ ] GET /api/inspirations returns paginated list
- [ ] GET /api/inspirations?q=castle searches title/description
- [ ] GET /api/inspirations?tags=medieval filters by tag
- [ ] GET /api/inspirations?albumId=xxx filters by album
- [ ] GET /api/inspirations?sort=createdAt&order=desc sorts correctly
- [ ] GET /api/inspirations/:id returns single item with albumIds
- [ ] GET /api/inspirations/:id returns 404 for invalid ID
- [ ] GET /api/inspirations/:id returns 403 for other user's item

### Component Tests

- [ ] InspirationCard renders image
- [ ] InspirationCard shows title or "Untitled" fallback
- [ ] InspirationCard shows max 3 tags with overflow
- [ ] InspirationCard click navigates to detail
- [ ] InspirationCardSkeleton renders loading state

### Page Tests

- [ ] Route /inspiration renders gallery
- [ ] Loading skeleton shows while fetching
- [ ] Empty state shows for new users
- [ ] Grid displays cards correctly
- [ ] Route /inspiration/:id renders detail
- [ ] Detail shows all metadata fields
- [ ] Back button navigates to gallery

### Integration Tests

- [ ] End-to-end: visit gallery → click card → see detail → go back
- [ ] Filtering updates displayed items
- [ ] Pagination works correctly

## Definition of Done

- [ ] List endpoint returns correct data with filtering
- [ ] Get endpoint returns single item with relations
- [ ] RTK Query hooks work with caching
- [ ] Gallery page renders with filtering/sorting
- [ ] Card component displays all required info
- [ ] Detail page shows full metadata
- [ ] Loading and error states handled
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1004, 1005, 1006, 1007, 1008 | Claude |
