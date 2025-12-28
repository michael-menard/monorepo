# Story insp-2010: Add/Remove from Album

## Status

Draft

## Consolidates

- insp-1024.add-inspiration-to-album-endpoint
- insp-1025.add-to-album-ui
- insp-1026.remove-from-album-endpoint
- insp-1027.remove-from-album-ui

## Story

**As a** user,
**I want** to add inspirations to albums and remove them,
**so that** I can organize my images into collections.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Update > Move to Album, Remove from Album

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2002**: Inspiration Gallery MVP
- **insp-2006**: Create Album
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### Add to Album API

1. POST /api/albums/:albumId/items adds inspirations to album
2. Accepts array of inspirationIds
3. Inspirations can be in multiple albums (many-to-many)
4. Sets sortOrder for new items (at end)
5. Validates all inspirationIds exist and are owned by user
6. Returns updated album with new itemCount
7. Idempotent: adding already-present items is no-op

### Remove from Album API

8. DELETE /api/albums/:albumId/items/:inspirationId removes from album
9. Inspiration remains in database (just removed from album)
10. Returns 204 No Content
11. No error if item not in album

### Add to Album UI

12. "Add to album" action accessible from inspiration detail view
13. Opens album picker dialog
14. Shows user's albums with search/filter
15. Can select multiple albums
16. Shows which albums item is already in
17. Save adds to selected albums
18. Can create new album from picker

### Remove from Album UI

19. "Remove from this album" action in album view context
20. Confirmation not required (can be undone by re-adding)
21. Item disappears from album view immediately
22. Optional: toast with undo action

### "Also in" Display

23. Detail view shows "Also in:" section with album badges
24. Clicking badge navigates to that album
25. "+ Add to album" link opens picker

## Tasks / Subtasks

### Task 1: Create Add to Album Endpoint (AC: 1-7)

- [ ] Create `apps/api/endpoints/albums/items/add/handler.ts`
- [ ] Path param: albumId
- [ ] Body: { inspirationIds: string[] }
- [ ] Validate user owns album
- [ ] Validate user owns all inspirations
- [ ] Insert into inspiration_albums (skip duplicates)
- [ ] Return updated album

### Task 2: Create Remove from Album Endpoint (AC: 8-11)

- [ ] Create `apps/api/endpoints/albums/items/remove/handler.ts`
- [ ] Path params: albumId, inspirationId
- [ ] Delete from inspiration_albums
- [ ] Return 204

### Task 3: Add RTK Mutations

- [ ] Add addToAlbum mutation
- [ ] Add removeFromAlbum mutation
- [ ] Invalidate relevant caches

### Task 4: Create Album Picker Modal (AC: 12-18)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/AlbumPickerModal/index.tsx`
- [ ] Fetch user's albums
- [ ] Search/filter albums
- [ ] Multi-select with checkboxes
- [ ] Show current membership
- [ ] "Create new album" option
- [ ] Save button

### Task 5: Implement Remove from Album (AC: 19-22)

- [ ] Add remove action to album view cards
- [ ] Call mutation on click
- [ ] Optimistic update (remove from list)
- [ ] Optional: show undo toast

### Task 6: Update Detail View (AC: 23-25)

- [ ] Fetch album names for albumIds
- [ ] Render "Also in:" section
- [ ] Add "Add to album" trigger

## Dev Notes

### Add to Album Endpoint

```typescript
// apps/api/endpoints/albums/items/add/handler.ts
import { db } from '@/database'
import { albums, inspirations, inspirationAlbums } from '@/database/schema'
import { eq, inArray, and, sql } from 'drizzle-orm'
import { z } from 'zod'

const AddToAlbumSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1),
})

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const albumId = event.pathParameters?.albumId

  // Verify album ownership
  const album = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!album) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Album not found' }) }
  }

  const body = AddToAlbumSchema.parse(JSON.parse(event.body || '{}'))

  // Verify all inspirations exist and are owned by user
  const validInspirations = await db
    .select({ id: inspirations.id })
    .from(inspirations)
    .where(
      and(
        inArray(inspirations.id, body.inspirationIds),
        eq(inspirations.userId, userId)
      )
    )

  const validIds = validInspirations.map(i => i.id)
  const invalidIds = body.inspirationIds.filter(id => !validIds.includes(id))

  if (invalidIds.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Invalid inspiration IDs: ${invalidIds.join(', ')}` }),
    }
  }

  // Get existing memberships to avoid duplicates
  const existing = await db
    .select({ inspirationId: inspirationAlbums.inspirationId })
    .from(inspirationAlbums)
    .where(
      and(
        eq(inspirationAlbums.albumId, albumId),
        inArray(inspirationAlbums.inspirationId, validIds)
      )
    )

  const existingIds = new Set(existing.map(e => e.inspirationId))
  const newIds = validIds.filter(id => !existingIds.has(id))

  if (newIds.length > 0) {
    // Get max sortOrder
    const maxSort = await db
      .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(inspirationAlbums)
      .where(eq(inspirationAlbums.albumId, albumId))
      .then(r => r[0].max)

    // Insert new memberships
    await db.insert(inspirationAlbums).values(
      newIds.map((inspirationId, index) => ({
        inspirationId,
        albumId,
        sortOrder: maxSort + 1 + index,
      }))
    )
  }

  // Return updated album with new count
  const itemCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(inspirationAlbums)
    .where(eq(inspirationAlbums.albumId, albumId))
    .then(r => r[0].count)

  return {
    statusCode: 200,
    body: JSON.stringify({
      albumId,
      added: newIds.length,
      skipped: existingIds.size,
      itemCount,
    }),
  }
}
```

### Remove from Album Endpoint

```typescript
// apps/api/endpoints/albums/items/remove/handler.ts
import { db } from '@/database'
import { albums, inspirationAlbums } from '@/database/schema'
import { eq, and } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  const { albumId, inspirationId } = event.pathParameters

  // Verify album ownership
  const album = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.userId, userId)))
    .limit(1)
    .then(r => r[0])

  if (!album) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Album not found' }) }
  }

  // Remove membership (no error if not present)
  await db.delete(inspirationAlbums).where(
    and(
      eq(inspirationAlbums.albumId, albumId),
      eq(inspirationAlbums.inspirationId, inspirationId)
    )
  )

  return { statusCode: 204, body: '' }
}
```

### Album Picker Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/AlbumPickerModal/index.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Checkbox,
  ScrollArea,
} from '@repo/ui'
import { Search, Plus, Folder, Check } from 'lucide-react'
import { useGetAlbumsQuery, useAddToAlbumMutation } from '@repo/api-client/rtk/inspiration-api'

interface AlbumPickerModalProps {
  inspirationId: string
  currentAlbumIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onCreateAlbum?: () => void
}

export function AlbumPickerModal({
  inspirationId,
  currentAlbumIds,
  open,
  onOpenChange,
  onSuccess,
  onCreateAlbum,
}: AlbumPickerModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const { data: albums } = useGetAlbumsQuery({ limit: 100 }, { skip: !open })
  const [addToAlbum] = useAddToAlbumMutation()

  // Initialize selection with current albums
  useEffect(() => {
    if (open) {
      setSelected(new Set(currentAlbumIds))
    }
  }, [open, currentAlbumIds])

  const filteredAlbums = albums?.items.filter(
    album => album.title.toLowerCase().includes(search.toLowerCase())
  ) || []

  const toggleAlbum = (albumId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(albumId)) {
      newSelected.delete(albumId)
    } else {
      newSelected.add(albumId)
    }
    setSelected(newSelected)
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Find albums to add to (new selections)
      const toAdd = [...selected].filter(id => !currentAlbumIds.includes(id))

      // Add to each album
      await Promise.all(
        toAdd.map(albumId => addToAlbum({ albumId, inspirationIds: [inspirationId] }).unwrap())
      )

      // Note: Removing from albums would need separate handling
      // For now, this only handles adding

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to update album membership:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = [...selected].some(id => !currentAlbumIds.includes(id)) ||
                     currentAlbumIds.some(id => !selected.has(id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Album</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search albums..."
              className="pl-10"
            />
          </div>

          {/* Album List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredAlbums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  onClick={() => toggleAlbum(album.id)}
                >
                  <Checkbox
                    checked={selected.has(album.id)}
                    onCheckedChange={() => toggleAlbum(album.id)}
                  />
                  <Folder className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{album.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {album.itemCount} item{album.itemCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {currentAlbumIds.includes(album.id) && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}

              {filteredAlbums.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {search ? 'No albums match your search' : 'No albums yet'}
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Create New Album */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false)
              onCreateAlbum?.()
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Album
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### File Locations

```
apps/api/endpoints/albums/
  items/
    add/
      handler.ts             # POST add items
    remove/
      handler.ts             # DELETE remove item

apps/web/main-app/src/routes/inspiration/
  -components/
    AlbumPickerModal/
      index.tsx              # Album picker
```

## Testing

### API Tests

- [ ] POST /api/albums/:id/items adds inspirations
- [ ] Validates all inspiration IDs
- [ ] Handles duplicates idempotently
- [ ] Sets correct sortOrder
- [ ] DELETE /api/albums/:id/items/:id removes item
- [ ] Returns 204 even if not in album
- [ ] Returns 404 for invalid album

### Component Tests

- [ ] Album picker shows all albums
- [ ] Search filters albums
- [ ] Shows current membership
- [ ] Multi-select works
- [ ] Save button disabled when no changes
- [ ] Create album option works

## Definition of Done

- [ ] Add/remove endpoints working
- [ ] Album picker provides good UX
- [ ] "Also in:" display implemented
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1024-1027               | Claude   |
