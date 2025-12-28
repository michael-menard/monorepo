# Story insp-2007: Album Gallery & View

## Status

Draft

## Consolidates

- insp-1016.list-albums-endpoint
- insp-1017.album-card-component
- insp-1018.get-album-contents-endpoint
- insp-1019.album-view-page

## Story

**As a** user,
**I want** to see my albums in the gallery and view their contents,
**so that** I can browse my organized collections of inspirations.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Gallery View, Album Navigation

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2002**: Inspiration Gallery MVP
- **insp-2006**: Create Album

## Acceptance Criteria

### API Endpoints

1. GET /api/albums returns paginated list of user's albums
2. Supports query params: q (search), tags, parentId, isRoot, sort, order, page, limit
3. Response includes itemCount for each album
4. GET /api/albums/:id returns single album
5. GET /api/albums/:id/contents returns album with inspirations and nested albums
6. Contents response includes breadcrumbs for navigation
7. Returns 404 for non-existent or other user's album

### Album Card Component

8. AlbumCard displays visual distinction from InspirationCard (stacked/folder appearance)
9. Shows album title
10. Shows item count badge
11. Shows cover image (first image or user-selected)
12. Click navigates to album view
13. Hover shows action menu (view, edit, delete)

### Gallery Integration

14. Albums appear mixed with inspirations in gallery (albums first or user preference)
15. Filter to show only albums or only inspirations
16. Album sorting options work

### Album View Page

17. Route /inspiration/album/:id renders album view
18. Shows album title and description
19. Displays inspirations in album as cards
20. Displays nested albums as cards
21. Back navigation to parent or gallery
22. Actions: edit album, delete album, add items

## Tasks / Subtasks

### Task 1: Create List Albums Endpoint (AC: 1-3)

- [ ] Create `apps/api/endpoints/albums/list/handler.ts`
- [ ] Parse query params with AlbumQueryParamsSchema
- [ ] Query database with filters
- [ ] Include itemCount (count of inspirations in album)
- [ ] Include cover image URL
- [ ] Return paginated AlbumListResponse

### Task 2: Create Get Album Endpoint (AC: 4)

- [ ] Create `apps/api/endpoints/albums/get/handler.ts`
- [ ] Return single album with full details
- [ ] Verify user ownership

### Task 3: Create Get Album Contents Endpoint (AC: 5, 6, 7)

- [ ] Create `apps/api/endpoints/albums/contents/handler.ts`
- [ ] Return album details
- [ ] Return inspirations in album (with sortOrder)
- [ ] Return nested albums
- [ ] Build breadcrumb trail
- [ ] Handle 404 cases

### Task 4: Add RTK Queries

- [ ] Add getAlbums query
- [ ] Add getAlbum query
- [ ] Add getAlbumContents query
- [ ] Configure cache tags

### Task 5: Create AlbumCard Component (AC: 8-13)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/AlbumCard/index.tsx`
- [ ] Stacked/folder visual design
- [ ] Title and item count
- [ ] Cover image with fallback
- [ ] Click navigation
- [ ] Action menu dropdown

### Task 6: Update Gallery to Show Albums (AC: 14-16)

- [ ] Fetch albums alongside inspirations
- [ ] Render AlbumCard for albums
- [ ] Add filter: All / Images / Albums
- [ ] Position albums first or by sortOrder

### Task 7: Create Album View Page (AC: 17-22)

- [ ] Create `apps/web/main-app/src/routes/inspiration/album/$id.tsx`
- [ ] Fetch album contents
- [ ] Render album header (title, description, actions)
- [ ] Grid of InspirationCard and AlbumCard
- [ ] Back navigation
- [ ] Loading and error states

## Dev Notes

### Album List Endpoint

```typescript
// apps/api/endpoints/albums/list/handler.ts
import { db } from '@/database'
import { albums, inspirationAlbums, inspirations } from '@/database/schema'
import { AlbumQueryParamsSchema, AlbumListResponseSchema } from '@repo/api-client/schemas/inspiration'
import { eq, sql, and, ilike, isNull } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const params = AlbumQueryParamsSchema.parse(
    Object.fromEntries(new URLSearchParams(event.queryStringParameters || {}))
  )

  // Build base query with item counts
  let query = db
    .select({
      album: albums,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM inspiration_albums
        WHERE inspiration_albums.album_id = ${albums.id}
      )`,
      coverImageUrl: sql<string | null>`(
        SELECT i.image_url FROM inspirations i
        JOIN inspiration_albums ia ON i.id = ia.inspiration_id
        WHERE ia.album_id = ${albums.id}
        ORDER BY ia.sort_order ASC
        LIMIT 1
      )`,
    })
    .from(albums)
    .where(eq(albums.userId, userId))

  // Apply search
  if (params.q) {
    query = query.where(
      ilike(albums.title, `%${params.q}%`)
    )
  }

  // Apply tag filter
  if (params.tags) {
    const tagList = params.tags.split(',')
    query = query.where(
      sql`${albums.tags} && ${tagList}::text[]`
    )
  }

  // Apply isRoot filter (albums with no parents)
  if (params.isRoot === 'true') {
    query = query.where(
      sql`NOT EXISTS (
        SELECT 1 FROM album_parents
        WHERE album_parents.album_id = ${albums.id}
      )`
    )
  }

  // Apply sorting and pagination
  const offset = (params.page - 1) * params.limit
  const items = await query.limit(params.limit).offset(offset)

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(albums)
    .where(eq(albums.userId, userId))
    .then(r => r[0].count)

  return {
    statusCode: 200,
    body: JSON.stringify(
      AlbumListResponseSchema.parse({
        items: items.map(r => ({
          ...r.album,
          itemCount: r.itemCount,
          coverImageUrl: r.coverImageUrl,
          parentAlbumIds: [],
          mocIds: [],
        })),
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

### Album Contents Endpoint

```typescript
// apps/api/endpoints/albums/contents/handler.ts
import { db } from '@/database'
import { albums, inspirations, inspirationAlbums, albumParents } from '@/database/schema'
import { AlbumContentsSchema } from '@repo/api-client/schemas/inspiration'
import { eq, sql } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const id = event.pathParameters?.id

  // Get album
  const album = await db
    .select()
    .from(albums)
    .where(eq(albums.id, id))
    .limit(1)
    .then(r => r[0])

  if (!album) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Album not found' }) }
  }
  if (album.userId !== userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  // Get inspirations in album
  const albumInspirations = await db
    .select({
      inspiration: inspirations,
      sortOrder: inspirationAlbums.sortOrder,
    })
    .from(inspirations)
    .innerJoin(inspirationAlbums, eq(inspirations.id, inspirationAlbums.inspirationId))
    .where(eq(inspirationAlbums.albumId, id))
    .orderBy(inspirationAlbums.sortOrder)

  // Get nested albums
  const nestedAlbums = await db
    .select({
      album: albums,
      itemCount: sql<number>`(
        SELECT COUNT(*) FROM inspiration_albums
        WHERE inspiration_albums.album_id = ${albums.id}
      )`,
    })
    .from(albums)
    .innerJoin(albumParents, eq(albums.id, albumParents.albumId))
    .where(eq(albumParents.parentAlbumId, id))
    .orderBy(albums.sortOrder)

  // Build breadcrumbs (simplified - would need session-based tracking for full PRD implementation)
  const breadcrumbs = [{ id: album.id, title: album.title }]

  return {
    statusCode: 200,
    body: JSON.stringify(
      AlbumContentsSchema.parse({
        album: {
          ...album,
          itemCount: albumInspirations.length,
          coverImageUrl: albumInspirations[0]?.inspiration.imageUrl || null,
          parentAlbumIds: [],
          mocIds: [],
        },
        inspirations: albumInspirations.map(r => ({
          ...r.inspiration,
          albumIds: [id],
          mocIds: [],
        })),
        nestedAlbums: nestedAlbums.map(r => ({
          id: r.album.id,
          title: r.album.title,
          coverImageUrl: null,
          itemCount: r.itemCount,
          sortOrder: r.album.sortOrder,
        })),
        breadcrumbs,
      })
    ),
  }
}
```

### Album Card Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/AlbumCard/index.tsx
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui'
import { Folder, MoreVertical, Eye, Pencil, Trash } from 'lucide-react'
import type { Album } from '@repo/api-client/schemas/inspiration'

interface AlbumCardProps {
  album: Album
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function AlbumCard({ album, onEdit, onDelete }: AlbumCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all relative"
      onClick={() => navigate({ to: '/inspiration/album/$id', params: { id: album.id } })}
    >
      {/* Stacked appearance */}
      <div className="aspect-square relative bg-muted">
        {/* Background stack effect */}
        <div className="absolute inset-1 -top-1 -left-1 bg-muted-foreground/10 rounded transform -rotate-2" />
        <div className="absolute inset-1 -top-0.5 -left-0.5 bg-muted-foreground/20 rounded transform rotate-1" />

        {/* Cover image or folder icon */}
        <div className="relative w-full h-full rounded overflow-hidden">
          {album.coverImageUrl ? (
            <img
              src={album.coverImageUrl}
              alt={album.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Folder className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Item count badge */}
        <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground">
          {album.itemCount} item{album.itemCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      <CardContent className="p-3">
        <h3 className="font-medium truncate text-sm">
          {album.title}
        </h3>
      </CardContent>

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              navigate({ to: '/inspiration/album/$id', params: { id: album.id } })
            }}>
              <Eye className="w-4 h-4 mr-2" />
              View Album
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              onEdit?.(album.id)
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(album.id)
              }}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
```

### Album View Page

```typescript
// apps/web/main-app/src/routes/inspiration/album/$id.tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useGetAlbumContentsQuery } from '@repo/api-client/rtk/inspiration-api'
import { Button } from '@repo/ui'
import { ArrowLeft, Plus, Pencil, Trash } from 'lucide-react'
import { InspirationCard } from '../-components/InspirationCard'
import { AlbumCard } from '../-components/AlbumCard'

export const Route = createFileRoute('/inspiration/album/$id')({
  component: AlbumViewPage,
})

function AlbumViewPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useGetAlbumContentsQuery(id)

  if (isLoading) {
    return <div className="container mx-auto py-6">Loading...</div>
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-destructive mb-4">Album not found</p>
        <Button variant="outline" onClick={() => navigate({ to: '/inspiration' })}>
          Back to Gallery
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back Link */}
      <Link to="/inspiration" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Gallery
      </Link>

      {/* Album Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.album.title}</h1>
          {data.album.description && (
            <p className="text-muted-foreground mt-1">{data.album.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {data.inspirations.length} image{data.inspirations.length !== 1 ? 's' : ''}
            {data.nestedAlbums.length > 0 && `, ${data.nestedAlbums.length} album${data.nestedAlbums.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="text-destructive">
            <Trash className="w-4 h-4" />
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {data.nestedAlbums.length === 0 && data.inspirations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This album is empty</p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add images
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Nested albums first */}
          {data.nestedAlbums.map((album) => (
            <AlbumCard key={album.id} album={album as any} />
          ))}
          {/* Then inspirations */}
          {data.inspirations.map((inspiration) => (
            <InspirationCard key={inspiration.id} inspiration={inspiration} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### File Locations

```
apps/api/endpoints/albums/
  list/
    handler.ts               # GET /albums
  get/
    handler.ts               # GET /albums/:id
  contents/
    handler.ts               # GET /albums/:id/contents

apps/web/main-app/src/routes/inspiration/
  album/
    $id.tsx                  # Album view page
  -components/
    AlbumCard/
      index.tsx              # Album card component
```

## Testing

### API Tests

- [ ] GET /api/albums returns paginated list
- [ ] GET /api/albums?isRoot=true filters to root albums
- [ ] GET /api/albums?q=castle searches by title
- [ ] GET /api/albums/:id returns single album
- [ ] GET /api/albums/:id/contents returns album with items
- [ ] Contents includes correct itemCount
- [ ] Contents includes nested albums
- [ ] Returns 404 for invalid album ID
- [ ] Returns 403 for other user's album

### Component Tests

- [ ] AlbumCard shows stacked visual design
- [ ] AlbumCard shows title and item count
- [ ] AlbumCard shows cover image or fallback
- [ ] AlbumCard click navigates to album view
- [ ] Action menu works correctly

### Page Tests

- [ ] Route /inspiration/album/:id renders
- [ ] Shows album title and description
- [ ] Shows nested albums
- [ ] Shows inspirations in album
- [ ] Empty state when album is empty
- [ ] Back navigation works

## Definition of Done

- [ ] Album list and detail endpoints working
- [ ] AlbumCard visually distinct from InspirationCard
- [ ] Album view page shows contents correctly
- [ ] Nested albums display and navigate properly
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1016, 1017, 1018, 1019  | Claude   |
