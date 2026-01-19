# Story insp-2009: Delete Album

## Status

Draft

## Consolidates

- insp-1022.delete-album-endpoint
- insp-1023.delete-album-ui

## Story

**As a** user,
**I want** to delete albums,
**so that** I can remove organizational structures I no longer need.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Delete, Interaction Patterns > Album Delete Confirmation

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2006**: Create Album
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### API Endpoint

1. DELETE /api/albums/:id deletes album
2. Accepts query param: deleteContents=true to delete all contents
3. Default behavior (deleteContents=false): only delete album, contents become orphaned
4. With deleteContents=true: cascade delete all inspirations and nested albums
5. Removes album from parent relationships
6. Only owner can delete their albums
7. Returns 204 No Content on success
8. Returns 404 for non-existent album
9. Returns 403 for other user's album

### Delete Confirmation UI

10. Delete button triggers confirmation modal
11. Modal shows album preview (name, item count)
12. Two radio options:
    - "Delete album only" (default) - images/sub-albums remain
    - "Delete album and all contents" - everything deleted permanently
13. Warning text for each option
14. Cancel and Delete buttons
15. Success navigates to gallery (or parent album)
16. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create DELETE Album Endpoint (AC: 1-9)

- [ ] Create `apps/api/endpoints/albums/delete/handler.ts`
- [ ] Path param: id (UUID)
- [ ] Query param: deleteContents (boolean)
- [ ] Verify user owns album
- [ ] If deleteContents=false:
  - [ ] Remove from album_parents (both as child and parent)
  - [ ] Remove from inspiration_albums (but keep inspirations)
  - [ ] Delete album
- [ ] If deleteContents=true:
  - [ ] Recursively delete nested albums
  - [ ] Delete all inspirations in album (and their S3 files)
  - [ ] Delete album
- [ ] Return 204

### Task 2: Add RTK Mutation

- [ ] Add deleteAlbum mutation to inspiration-api.ts
- [ ] Accept id and deleteContents option
- [ ] Invalidate caches

### Task 3: Create Delete Album Modal (AC: 10-16)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/DeleteAlbumModal/index.tsx`
- [ ] Use AlertDialog from @repo/ui
- [ ] Radio options for delete mode
- [ ] Warning text for each option
- [ ] Handle deletion and navigation

### Task 4: Integrate with Album View

- [ ] Add modal state to album view
- [ ] Connect delete button
- [ ] Navigate after success

## Dev Notes

### Delete Endpoint

```typescript
// apps/api/endpoints/albums/delete/handler.ts
import { db } from '@/database'
import { albums, inspirations, inspirationAlbums, albumParents, inspirationMocs, albumMocs } from '@/database/schema'
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { eq, inArray } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const id = event.pathParameters?.id
  const deleteContents = event.queryStringParameters?.deleteContents === 'true'

  // Check ownership
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

  if (deleteContents) {
    // Recursively collect all albums to delete
    const albumsToDelete = await collectNestedAlbums(id)

    // Get all inspirations in these albums
    const inspirationsToDelete = await db
      .select({ id: inspirations.id, imageUrl: inspirations.imageUrl })
      .from(inspirations)
      .innerJoin(inspirationAlbums, eq(inspirations.id, inspirationAlbums.inspirationId))
      .where(inArray(inspirationAlbums.albumId, albumsToDelete))

    // Delete S3 files
    if (inspirationsToDelete.length > 0) {
      const s3Client = new S3Client({})
      const keys = inspirationsToDelete.map(i => {
        try {
          return new URL(i.imageUrl).pathname.slice(1)
        } catch {
          return null
        }
      }).filter(Boolean) as string[]

      if (keys.length > 0) {
        await s3Client.send(new DeleteObjectsCommand({
          Bucket: process.env.INSPIRATIONS_BUCKET,
          Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true },
        }))
      }
    }

    // Delete inspirations
    const inspirationIds = inspirationsToDelete.map(i => i.id)
    if (inspirationIds.length > 0) {
      await db.delete(inspirationMocs).where(inArray(inspirationMocs.inspirationId, inspirationIds))
      await db.delete(inspirationAlbums).where(inArray(inspirationAlbums.inspirationId, inspirationIds))
      await db.delete(inspirations).where(inArray(inspirations.id, inspirationIds))
    }

    // Delete albums
    await db.delete(albumMocs).where(inArray(albumMocs.albumId, albumsToDelete))
    await db.delete(albumParents).where(inArray(albumParents.albumId, albumsToDelete))
    await db.delete(albumParents).where(inArray(albumParents.parentAlbumId, albumsToDelete))
    await db.delete(inspirationAlbums).where(inArray(inspirationAlbums.albumId, albumsToDelete))
    await db.delete(albums).where(inArray(albums.id, albumsToDelete))
  } else {
    // Delete album only - contents become orphaned
    await db.delete(albumMocs).where(eq(albumMocs.albumId, id))
    await db.delete(albumParents).where(eq(albumParents.albumId, id))
    await db.delete(albumParents).where(eq(albumParents.parentAlbumId, id))
    await db.delete(inspirationAlbums).where(eq(inspirationAlbums.albumId, id))
    await db.delete(albums).where(eq(albums.id, id))
  }

  return { statusCode: 204, body: '' }
}

async function collectNestedAlbums(albumId: string): Promise<string[]> {
  const result = [albumId]

  const children = await db
    .select({ id: albumParents.albumId })
    .from(albumParents)
    .where(eq(albumParents.parentAlbumId, albumId))

  for (const child of children) {
    const nested = await collectNestedAlbums(child.id)
    result.push(...nested)
  }

  return result
}
```

### Delete Album Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/DeleteAlbumModal/index.tsx
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  RadioGroup,
  RadioGroupItem,
  Label,
} from '@repo/ui'
import { useDeleteAlbumMutation } from '@repo/api-client/rtk/inspiration-api'
import type { Album } from '@repo/api-client/schemas/inspiration'

interface DeleteAlbumModalProps {
  album: Album | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteAlbumModal({ album, open, onOpenChange, onSuccess }: DeleteAlbumModalProps) {
  const [deleteContents, setDeleteContents] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteAlbum] = useDeleteAlbumMutation()

  const handleDelete = async () => {
    if (!album) return

    setIsDeleting(true)
    setError(null)

    try {
      await deleteAlbum({ id: album.id, deleteContents }).unwrap()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{album?.title}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm">
                This album contains {album?.itemCount || 0} image{album?.itemCount !== 1 ? 's' : ''}.
              </p>

              <RadioGroup
                value={deleteContents ? 'contents' : 'album'}
                onValueChange={(v) => setDeleteContents(v === 'contents')}
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border">
                  <RadioGroupItem value="album" id="delete-album" />
                  <div className="space-y-1">
                    <Label htmlFor="delete-album" className="font-medium cursor-pointer">
                      Delete album only
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Images and sub-albums will remain in the gallery.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50 bg-destructive/5">
                  <RadioGroupItem value="contents" id="delete-contents" />
                  <div className="space-y-1">
                    <Label htmlFor="delete-contents" className="font-medium cursor-pointer text-destructive">
                      Delete album and all contents
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {album?.itemCount || 0} image{album?.itemCount !== 1 ? 's' : ''} will be permanently deleted.
                      This cannot be undone.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className={deleteContents ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### File Locations

```
apps/api/endpoints/albums/
  delete/
    handler.ts               # DELETE endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    DeleteAlbumModal/
      index.tsx              # Delete album modal
```

## Testing

### API Tests

- [ ] DELETE /api/albums/:id (album only) removes album
- [ ] Contents remain as orphans when deleteContents=false
- [ ] DELETE /api/albums/:id?deleteContents=true cascades
- [ ] Nested albums deleted with contents
- [ ] S3 files deleted when deleteContents=true
- [ ] Returns 204 on success
- [ ] Returns 404 for invalid ID
- [ ] Returns 403 for other user's album

### Component Tests

- [ ] Modal shows album info
- [ ] Radio options work correctly
- [ ] Default is "album only"
- [ ] Delete button style changes with option
- [ ] Modal closes on success

## Definition of Done

- [ ] DELETE endpoint handles both modes
- [ ] Cascade delete works correctly
- [ ] Modal provides clear options
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1022, insp-1023         | Claude   |
