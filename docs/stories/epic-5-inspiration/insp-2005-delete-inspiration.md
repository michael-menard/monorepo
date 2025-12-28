# Story insp-2005: Delete Inspiration

## Status

Draft

## Consolidates

- insp-1012.delete-inspiration-endpoint
- insp-1013.delete-inspiration-ui

## Story

**As a** user,
**I want** to delete inspiration images,
**so that** I can remove items I no longer need from my collection.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Delete, Interaction Patterns > Image Delete Confirmation

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2002**: Inspiration Gallery MVP (for detail page integration)

## Acceptance Criteria

### API Endpoint

1. DELETE /api/inspirations/:id deletes inspiration
2. Hard delete (not soft delete) - removed from database permanently
3. Deletes associated S3 image file
4. Removes inspiration from all albums (junction table entries)
5. Removes MOC links (junction table entries)
6. Only owner can delete their inspirations
7. Returns 204 No Content on success
8. Returns 404 for non-existent inspiration
9. Returns 403 for other user's inspiration

### Delete Confirmation UI

10. Delete button in detail view triggers confirmation modal
11. Modal shows image thumbnail
12. If inspiration is in albums, shows list: "This image is in X albums: [list]"
13. Warning text: "Deleting will remove it from all albums. This cannot be undone."
14. Cancel button closes modal
15. Delete button confirms and deletes
16. Success navigates back to gallery
17. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create DELETE Inspiration Endpoint (AC: 1-9)

- [ ] Create `apps/api/endpoints/inspirations/delete/handler.ts`
- [ ] Path param: id (UUID)
- [ ] Verify user owns inspiration (return 403 if not)
- [ ] Return 404 if inspiration not found
- [ ] Delete S3 image file (and thumbnails)
- [ ] Delete from inspiration_albums junction table
- [ ] Delete from inspiration_mocs junction table
- [ ] Delete from inspirations table
- [ ] Return 204 No Content

### Task 2: Add RTK Mutation (AC: 1)

- [ ] Add deleteInspiration mutation to inspiration-api.ts
- [ ] Invalidate LIST cache on success
- [ ] Remove specific item from cache

### Task 3: Create Delete Confirmation Modal (AC: 10-17)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/DeleteModal/index.tsx`
- [ ] Use AlertDialog from @repo/ui
- [ ] Show image thumbnail
- [ ] Show album membership warning if applicable
- [ ] Confirm/cancel buttons
- [ ] Handle delete and navigation

### Task 4: Integrate with Detail Page (AC: 10, 16)

- [ ] Add modal state to detail page
- [ ] Connect delete button to open modal
- [ ] Navigate to gallery after successful delete

## Dev Notes

### Delete Endpoint

```typescript
// apps/api/endpoints/inspirations/delete/handler.ts
import { db } from '@/database'
import { inspirations, inspirationAlbums, inspirationMocs } from '@/database/schema'
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const id = event.pathParameters?.id
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) }
  }

  // Check ownership
  const existing = await db
    .select()
    .from(inspirations)
    .where(eq(inspirations.id, id))
    .limit(1)
    .then(r => r[0])

  if (!existing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Inspiration not found' }) }
  }

  if (existing.userId !== userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  // Delete S3 files (original + thumbnails)
  try {
    const s3Client = new S3Client({})
    const imageKey = new URL(existing.imageUrl).pathname.slice(1) // Remove leading /

    // Find thumbnail keys (assuming naming convention)
    const thumbnailKeys = [
      imageKey.replace(/(\.[^.]+)$/, '_thumb$1'),
      imageKey.replace(/(\.[^.]+)$/, '_medium$1'),
    ]

    await s3Client.send(new DeleteObjectsCommand({
      Bucket: process.env.INSPIRATIONS_BUCKET,
      Delete: {
        Objects: [
          { Key: imageKey },
          ...thumbnailKeys.map(Key => ({ Key })),
        ],
        Quiet: true,
      },
    }))
  } catch (err) {
    // Log but don't fail if S3 delete fails
    console.error('Failed to delete S3 files:', err)
  }

  // Delete junction table entries
  await db.delete(inspirationAlbums).where(eq(inspirationAlbums.inspirationId, id))
  await db.delete(inspirationMocs).where(eq(inspirationMocs.inspirationId, id))

  // Delete inspiration
  await db.delete(inspirations).where(eq(inspirations.id, id))

  return { statusCode: 204, body: '' }
}
```

### Delete Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/DeleteModal/index.tsx
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
  Badge,
} from '@repo/ui'
import { useDeleteInspirationMutation } from '@repo/api-client/rtk/inspiration-api'
import type { Inspiration } from '@repo/api-client/schemas/inspiration'

interface DeleteModalProps {
  inspiration: Inspiration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteModal({ inspiration, open, onOpenChange, onSuccess }: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteInspiration] = useDeleteInspirationMutation()

  const handleDelete = async () => {
    if (!inspiration) return

    setIsDeleting(true)
    setError(null)

    try {
      await deleteInspiration(inspiration.id).unwrap()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  const albumCount = inspiration?.albumIds?.length || 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this image?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Image Preview */}
              {inspiration && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden max-w-xs mx-auto">
                  <img
                    src={inspiration.imageUrl}
                    alt={inspiration.title || 'Inspiration'}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Album Warning */}
              {albumCount > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    This image is in {albumCount} album{albumCount !== 1 ? 's' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {/* Would need to fetch album names */}
                    {inspiration?.albumIds?.map((albumId) => (
                      <Badge key={albumId} variant="secondary">
                        Album
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {albumCount > 0
                  ? 'Deleting will remove it from all albums. This cannot be undone.'
                  : 'This cannot be undone.'}
              </p>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### RTK Mutation

```typescript
// Add to packages/core/api-client/src/rtk/inspiration-api.ts
deleteInspiration: builder.mutation<void, string>({
  query: (id) => ({
    url: `/inspirations/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, id) => [
    { type: 'Inspiration', id },
    { type: 'Inspiration', id: 'LIST' },
    { type: 'Album', id: 'LIST' }, // Albums may have different item counts now
  ],
}),
```

### Detail Page Integration

```typescript
// Update apps/web/main-app/src/routes/inspiration/$id.tsx
import { useNavigate } from '@tanstack/react-router'
import { DeleteModal } from './-components/DeleteModal'

function InspirationDetailPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const navigate = useNavigate()
  const { id } = Route.useParams()
  const { data: inspiration } = useGetInspirationQuery(id)

  const handleDeleteSuccess = () => {
    navigate({ to: '/inspiration' })
  }

  return (
    <div>
      {/* ... existing content */}

      <Button
        variant="outline"
        size="icon"
        className="text-destructive"
        onClick={() => setDeleteModalOpen(true)}
      >
        <Trash className="w-4 h-4" />
      </Button>

      <DeleteModal
        inspiration={inspiration || null}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
```

### File Locations

```
apps/api/endpoints/inspirations/
  delete/
    handler.ts               # DELETE endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    DeleteModal/
      index.tsx              # Delete confirmation modal
      __tests__/
        DeleteModal.test.tsx
```

## Testing

### API Tests

- [ ] DELETE /api/inspirations/:id removes inspiration
- [ ] Returns 204 No Content on success
- [ ] Deletes S3 image files
- [ ] Removes from inspiration_albums junction table
- [ ] Removes from inspiration_mocs junction table
- [ ] Returns 404 for non-existent inspiration
- [ ] Returns 403 for other user's inspiration
- [ ] Returns 401 for unauthenticated request

### Component Tests

- [ ] Modal opens when triggered
- [ ] Shows image thumbnail
- [ ] Shows album count warning when applicable
- [ ] Cancel button closes modal
- [ ] Delete button triggers deletion
- [ ] Deleting state shows during request
- [ ] Error displays on failure
- [ ] Modal closes on success
- [ ] onSuccess callback called

### Integration Tests

- [ ] Full flow: detail page → delete → confirm → navigates to gallery
- [ ] Deleted inspiration no longer appears in gallery
- [ ] Deleted inspiration removed from album views
- [ ] S3 files actually deleted

## Definition of Done

- [ ] DELETE endpoint removes inspiration and S3 files
- [ ] Junction table entries cleaned up
- [ ] Delete modal shows appropriate warnings
- [ ] Navigation to gallery after delete
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1012, insp-1013         | Claude   |
