# Story insp-2008: Edit Album

## Status

Draft

## Consolidates

- insp-1020.update-album-endpoint
- insp-1021.edit-album-modal

## Story

**As a** user,
**I want** to edit album metadata,
**so that** I can update titles, descriptions, and cover images for my albums.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Update

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2006**: Create Album
- **insp-2007**: Album Gallery & View

## Acceptance Criteria

### API Endpoint

1. PATCH /api/albums/:id updates album
2. Accepts partial updates (title, description, tags, coverImageId)
3. Only owner can update their albums
4. Validates coverImageId is a valid inspiration in the album
5. Updates updatedAt timestamp
6. Returns updated album
7. Returns 404 for non-existent album
8. Returns 403 for other user's album

### Edit Album Modal

9. Modal opens from edit action in album view or card
10. Pre-populates form with current values
11. Editable fields: title, description, tags, cover image selection
12. Cover image picker shows images in album
13. Save button updates album
14. Cancel button discards changes
15. Success closes modal and refreshes view
16. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create PATCH Album Endpoint (AC: 1-8)

- [ ] Create `apps/api/endpoints/albums/update/handler.ts`
- [ ] Path param: id (UUID)
- [ ] Parse body with UpdateAlbumRequestSchema
- [ ] Verify user owns album
- [ ] Validate coverImageId if provided
- [ ] Update only provided fields
- [ ] Update updatedAt timestamp
- [ ] Return updated album

### Task 2: Add RTK Mutation

- [ ] Add updateAlbum mutation to inspiration-api.ts
- [ ] Invalidate album cache on success

### Task 3: Create Edit Album Modal (AC: 9-16)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/EditAlbumModal/index.tsx`
- [ ] Pre-populate form from album data
- [ ] Title, description, tags inputs
- [ ] Cover image selection grid
- [ ] Save/cancel buttons

### Task 4: Integrate with Album View

- [ ] Add modal state to album view page
- [ ] Connect edit button to modal
- [ ] Refresh on success

## Dev Notes

### Update Endpoint

```typescript
// apps/api/endpoints/albums/update/handler.ts
import { db } from '@/database'
import { albums, inspirationAlbums } from '@/database/schema'
import { UpdateAlbumRequestSchema, AlbumSchema } from '@repo/api-client/schemas/inspiration'
import { eq, and } from 'drizzle-orm'

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
    .from(albums)
    .where(eq(albums.id, id))
    .limit(1)
    .then(r => r[0])

  if (!existing) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Album not found' }) }
  }

  if (existing.userId !== userId) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
  }

  const body = UpdateAlbumRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Validate coverImageId if provided
  if (body.coverImageId) {
    const isInAlbum = await db
      .select()
      .from(inspirationAlbums)
      .where(
        and(
          eq(inspirationAlbums.albumId, id),
          eq(inspirationAlbums.inspirationId, body.coverImageId)
        )
      )
      .limit(1)
      .then(r => r.length > 0)

    if (!isInAlbum) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cover image must be in album' }),
      }
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }

  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description || null
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.coverImageId !== undefined) updates.coverImageId = body.coverImageId

  // Update
  const [updated] = await db
    .update(albums)
    .set(updates)
    .where(eq(albums.id, id))
    .returning()

  // Get additional data
  const itemCount = await getItemCount(id)
  const coverImageUrl = await getCoverImageUrl(id, updated.coverImageId)

  return {
    statusCode: 200,
    body: JSON.stringify(
      AlbumSchema.parse({
        ...updated,
        itemCount,
        coverImageUrl,
        parentAlbumIds: [],
        mocIds: [],
      })
    ),
  }
}
```

### Edit Album Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/EditAlbumModal/index.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  RadioGroup,
  RadioGroupItem,
} from '@repo/ui'
import { X, Check } from 'lucide-react'
import { useUpdateAlbumMutation, useGetAlbumContentsQuery } from '@repo/api-client/rtk/inspiration-api'
import type { Album } from '@repo/api-client/schemas/inspiration'

interface EditAlbumModalProps {
  album: Album | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditAlbumModal({ album, open, onOpenChange, onSuccess }: EditAlbumModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [coverImageId, setCoverImageId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [updateAlbum] = useUpdateAlbumMutation()
  const { data: albumContents } = useGetAlbumContentsQuery(album?.id || '', {
    skip: !album || !open,
  })

  // Pre-populate form
  useEffect(() => {
    if (album && open) {
      setTitle(album.title)
      setDescription(album.description || '')
      setTags(album.tags || [])
      setCoverImageId(album.coverImageId || null)
      setError(null)
    }
  }, [album, open])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSave = async () => {
    if (!album || !title.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      await updateAlbum({
        id: album.id,
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
        coverImageId,
      }).unwrap()

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = album && (
    title !== album.title ||
    description !== (album.description || '') ||
    JSON.stringify(tags) !== JSON.stringify(album.tags || []) ||
    coverImageId !== (album.coverImageId || null)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Album</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-album-title">Title *</Label>
            <Input
              id="edit-album-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="edit-album-description">Description</Label>
            <Textarea
              id="edit-album-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div>
            <Label>Tags (max 10)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                disabled={isSaving || tags.length >= 10}
                maxLength={50}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                disabled={isSaving || tags.length >= 10}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} disabled={isSaving}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Cover Image Selection */}
          {albumContents && albumContents.inspirations.length > 0 && (
            <div>
              <Label>Cover Image</Label>
              <div className="grid grid-cols-4 gap-2 mt-2 max-h-40 overflow-y-auto">
                {albumContents.inspirations.map((insp) => (
                  <button
                    key={insp.id}
                    type="button"
                    className={`aspect-square rounded overflow-hidden relative ${
                      coverImageId === insp.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setCoverImageId(insp.id)}
                    disabled={isSaving}
                  >
                    <img
                      src={insp.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {coverImageId === insp.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
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
  update/
    handler.ts               # PATCH endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    EditAlbumModal/
      index.tsx              # Edit album modal
```

## Testing

### API Tests

- [ ] PATCH /api/albums/:id updates album
- [ ] Returns 200 with updated album
- [ ] Only updates provided fields
- [ ] Validates coverImageId is in album
- [ ] Updates updatedAt timestamp
- [ ] Returns 404 for non-existent album
- [ ] Returns 403 for other user's album

### Component Tests

- [ ] Modal pre-populates with current values
- [ ] Title is required
- [ ] Cover image selection works
- [ ] Tags can be added/removed
- [ ] Save button disabled when no changes
- [ ] Modal closes on success

## Definition of Done

- [ ] PATCH endpoint updates albums correctly
- [ ] Edit modal provides good UX
- [ ] Cover image selection works
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1020, insp-1021         | Claude   |
