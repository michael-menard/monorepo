# Story insp-2011: Nested Albums & Breadcrumbs

## Status

Draft

## Consolidates

- insp-1028.nested-albums-endpoint
- insp-1029.album-breadcrumb-navigation

## Story

**As a** user,
**I want** to nest albums within other albums and navigate with breadcrumbs,
**so that** I can create hierarchical organization for my inspirations.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Album Navigation, Technical Notes > Many-to-Many Relationships

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2006**: Create Album
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### Nested Album API

1. POST /api/albums/:albumId/parents adds parent album
2. DELETE /api/albums/:albumId/parents/:parentId removes parent
3. Cycle detection prevents circular references
4. Albums can have multiple parents (DAG structure)
5. GET /api/albums/:id/contents includes nested albums

### Breadcrumb Navigation

6. Album view shows breadcrumb trail
7. Breadcrumbs show PATH TAKEN (session-based), not canonical path
8. "Back" button returns to previous location in history
9. Clicking breadcrumb navigates to that album
10. Root gallery shows as first breadcrumb

### Parent Album Display

11. Album detail shows "Also in:" for parent albums
12. Can add to parent from album view
13. Can remove from parent

## Tasks / Subtasks

### Task 1: Create Add Parent Endpoint (AC: 1, 3, 4)

- [ ] Create `apps/api/endpoints/albums/parents/add/handler.ts`
- [ ] Path param: albumId
- [ ] Body: { parentAlbumId }
- [ ] Validate both albums exist and owned by user
- [ ] Check for cycles (would create circular reference)
- [ ] Insert into album_parents

### Task 2: Create Remove Parent Endpoint (AC: 2)

- [ ] Create `apps/api/endpoints/albums/parents/remove/handler.ts`
- [ ] Path params: albumId, parentId
- [ ] Delete from album_parents
- [ ] Return 204

### Task 3: Implement Cycle Detection (AC: 3)

- [ ] Create utility function to detect cycles
- [ ] Traverse from proposed parent up to root
- [ ] If target album found, reject (would create cycle)

### Task 4: Add RTK Mutations

- [ ] Add addAlbumParent mutation
- [ ] Add removeAlbumParent mutation

### Task 5: Implement Session Breadcrumbs (AC: 6-10)

- [ ] Track navigation path in component state or context
- [ ] Store path as array of { id, title }
- [ ] Update path on navigation
- [ ] Render breadcrumb component
- [ ] Handle direct URL access (minimal breadcrumb)

### Task 6: Update Album View (AC: 11-13)

- [ ] Show parent albums in "Also in:" section
- [ ] Add "Add to album" action for albums
- [ ] Handle remove from parent

## Dev Notes

### Add Parent Endpoint with Cycle Detection

```typescript
// apps/api/endpoints/albums/parents/add/handler.ts
import { db } from '@/database'
import { albums, albumParents } from '@/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const AddParentSchema = z.object({
  parentAlbumId: z.string().uuid(),
})

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const albumId = event.pathParameters?.albumId

  const body = AddParentSchema.parse(JSON.parse(event.body || '{}'))

  // Verify child album
  const childAlbum = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!childAlbum) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Album not found' }) }
  }

  // Verify parent album
  const parentAlbum = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, body.parentAlbumId), eq(albums.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!parentAlbum) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Parent album not found' }) }
  }

  // Prevent self-reference
  if (albumId === body.parentAlbumId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot add album as its own parent' }) }
  }

  // Check for cycles: would adding this parent create a cycle?
  // If the child album is an ancestor of the parent, adding parent would create cycle
  const wouldCreateCycle = await isAncestor(albumId, body.parentAlbumId)

  if (wouldCreateCycle) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Cannot add parent: would create circular reference' }),
    }
  }

  // Check if relationship already exists
  const existing = await db
    .select()
    .from(albumParents)
    .where(
      and(
        eq(albumParents.albumId, albumId),
        eq(albumParents.parentAlbumId, body.parentAlbumId)
      )
    )
    .limit(1)
    .then(r => r[0])

  if (existing) {
    return { statusCode: 200, body: JSON.stringify({ message: 'Already a parent' }) }
  }

  // Add parent relationship
  await db.insert(albumParents).values({
    albumId,
    parentAlbumId: body.parentAlbumId,
  })

  return { statusCode: 201, body: JSON.stringify({ message: 'Parent added' }) }
}

// Check if potentialAncestor is an ancestor of album
async function isAncestor(potentialAncestorId: string, albumId: string): Promise<boolean> {
  // BFS from album upward through parents
  const visited = new Set<string>()
  const queue = [albumId]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (visited.has(current)) continue
    visited.add(current)

    if (current === potentialAncestorId) {
      return true
    }

    // Get parents of current
    const parents = await db
      .select({ parentId: albumParents.parentAlbumId })
      .from(albumParents)
      .where(eq(albumParents.albumId, current))

    for (const parent of parents) {
      if (!visited.has(parent.parentId)) {
        queue.push(parent.parentId)
      }
    }
  }

  return false
}
```

### Session-Based Breadcrumbs

```typescript
// apps/web/main-app/src/routes/inspiration/-context/NavigationContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface BreadcrumbItem {
  id: string | null // null for root gallery
  title: string
  path: string
}

interface NavigationContextType {
  breadcrumbs: BreadcrumbItem[]
  pushBreadcrumb: (item: BreadcrumbItem) => void
  navigateTo: (index: number) => void
  resetBreadcrumbs: () => void
}

const NavigationContext = createContext<NavigationContextType | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, title: 'Gallery', path: '/inspiration' }
  ])

  const pushBreadcrumb = useCallback((item: BreadcrumbItem) => {
    setBreadcrumbs(prev => {
      // Check if we're going back to an existing breadcrumb
      const existingIndex = prev.findIndex(b => b.id === item.id)
      if (existingIndex !== -1) {
        // Truncate to that point
        return prev.slice(0, existingIndex + 1)
      }
      // Add new breadcrumb
      return [...prev, item]
    })
  }, [])

  const navigateTo = useCallback((index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1))
  }, [])

  const resetBreadcrumbs = useCallback(() => {
    setBreadcrumbs([{ id: null, title: 'Gallery', path: '/inspiration' }])
  }, [])

  return (
    <NavigationContext.Provider value={{ breadcrumbs, pushBreadcrumb, navigateTo, resetBreadcrumbs }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
```

### Breadcrumb Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/Breadcrumbs/index.tsx
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useNavigation } from '../-context/NavigationContext'

export function Breadcrumbs() {
  const { breadcrumbs, navigateTo } = useNavigation()

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {breadcrumbs.map((item, index) => (
        <div key={item.id || 'root'} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="w-4 h-4" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{item.title}</span>
          ) : (
            <Link
              to={item.path}
              params={item.id ? { id: item.id } : undefined}
              onClick={() => navigateTo(index)}
              className="hover:text-foreground transition-colors"
            >
              {item.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
```

### Album View with Breadcrumbs

```typescript
// apps/web/main-app/src/routes/inspiration/album/$id.tsx
import { useEffect } from 'react'
import { useNavigation } from '../-context/NavigationContext'
import { Breadcrumbs } from '../-components/Breadcrumbs'

function AlbumViewPage() {
  const { id } = Route.useParams()
  const { pushBreadcrumb } = useNavigation()
  const { data } = useGetAlbumContentsQuery(id)

  // Update breadcrumbs when album loads
  useEffect(() => {
    if (data?.album) {
      pushBreadcrumb({
        id: data.album.id,
        title: data.album.title,
        path: `/inspiration/album/${data.album.id}`,
      })
    }
  }, [data?.album, pushBreadcrumb])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumbs />

      {/* Album content */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data?.album.title}</h1>
          {/* Parent albums "Also in:" section */}
          {data?.album.parentAlbumIds && data.album.parentAlbumIds.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Also in:</span>
              {/* Would need to fetch parent album names */}
            </div>
          )}
        </div>
        {/* ... actions */}
      </div>

      {/* ... rest of content */}
    </div>
  )
}
```

### File Locations

```
apps/api/endpoints/albums/
  parents/
    add/
      handler.ts             # POST add parent
    remove/
      handler.ts             # DELETE remove parent

apps/web/main-app/src/routes/inspiration/
  -context/
    NavigationContext.tsx    # Breadcrumb state management
  -components/
    Breadcrumbs/
      index.tsx              # Breadcrumb display
```

## Testing

### API Tests

- [ ] POST /api/albums/:id/parents adds parent
- [ ] Rejects self-reference
- [ ] Detects cycles (A->B->A)
- [ ] Detects longer cycles (A->B->C->A)
- [ ] Allows multiple parents
- [ ] DELETE /api/albums/:id/parents/:id removes parent
- [ ] Returns 404 for invalid albums

### Component Tests

- [ ] Breadcrumbs render correctly
- [ ] Clicking breadcrumb truncates path
- [ ] Navigation updates breadcrumbs
- [ ] Direct URL access shows minimal breadcrumbs
- [ ] Back button returns to previous

### Integration Tests

- [ ] Navigate: Gallery -> Album A -> Album B (nested)
- [ ] Click Gallery breadcrumb returns to gallery
- [ ] Breadcrumbs show path taken, not canonical path

## Definition of Done

- [ ] Parent add/remove endpoints working
- [ ] Cycle detection prevents circular refs
- [ ] Session-based breadcrumbs implemented
- [ ] Navigation experience is intuitive
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1028, insp-1029         | Claude   |
