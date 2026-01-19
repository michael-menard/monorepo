# Story insp-2006: Create Album

## Status

Draft

## Consolidates

- insp-1014.create-album-endpoint
- insp-1015.create-album-modal

## Story

**As a** user,
**I want** to create albums to organize my inspiration images,
**so that** I can group related images together.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Create > Create Album

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2002**: Inspiration Gallery MVP

## Acceptance Criteria

### API Endpoint

1. POST /api/albums creates new album
2. Accepts title (required), description, tags, parentAlbumId, inspirationIds
3. Sets sortOrder to place new album at end
4. If parentAlbumId provided, validates it exists and is owned by user
5. If inspirationIds provided, adds inspirations to album
6. Returns created album with itemCount
7. Returns 400 if title is missing
8. Returns 404 if parentAlbumId doesn't exist

### Create Album Modal

9. Modal accessible from gallery header menu or context action
10. Title field (required)
11. Description field (optional)
12. Tags input (optional, max 10)
13. Create button creates album
14. Cancel button closes modal
15. Success closes modal and optionally navigates to new album
16. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create POST Album Endpoint (AC: 1-8)

- [ ] Create `apps/api/endpoints/albums/create/handler.ts`
- [ ] Parse body with CreateAlbumRequestSchema
- [ ] Validate title is provided
- [ ] If parentAlbumId, verify it exists and user owns it
- [ ] Calculate sortOrder (max + 1)
- [ ] Insert album
- [ ] If inspirationIds provided, insert junction entries
- [ ] Return created album

### Task 2: Add RTK Mutation (AC: 1)

- [ ] Add createAlbum mutation to inspiration-api.ts
- [ ] Invalidate Album LIST cache
- [ ] Return created album

### Task 3: Create Album Modal Component (AC: 9-16)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/CreateAlbumModal/index.tsx`
- [ ] Use Dialog from @repo/ui
- [ ] Title input (required)
- [ ] Description textarea
- [ ] Tags input component
- [ ] Create/cancel buttons

### Task 4: Integrate with Gallery (AC: 9, 15)

- [ ] Add "Create Album" option to gallery header menu
- [ ] Add modal state management
- [ ] Handle successful creation (refresh or navigate)

## Dev Notes

### Create Endpoint

```typescript
// apps/api/endpoints/albums/create/handler.ts
import { db } from '@/database'
import { albums, inspirationAlbums, albumParents } from '@/database/schema'
import { CreateAlbumRequestSchema, AlbumSchema } from '@repo/api-client/schemas/inspiration'
import { eq, sql } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const body = CreateAlbumRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Validate parentAlbumId if provided
  if (body.parentAlbumId) {
    const parent = await db
      .select()
      .from(albums)
      .where(eq(albums.id, body.parentAlbumId))
      .limit(1)
      .then(r => r[0])

    if (!parent) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Parent album not found' }) }
    }
    if (parent.userId !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Cannot add to album you do not own' }) }
    }
  }

  // Calculate sortOrder
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(albums)
    .where(eq(albums.userId, userId))
    .then(r => r[0].max)

  const now = new Date().toISOString()

  // Create album
  const [created] = await db
    .insert(albums)
    .values({
      userId,
      title: body.title,
      description: body.description || null,
      tags: body.tags || [],
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  // Add to parent album if specified
  if (body.parentAlbumId) {
    await db.insert(albumParents).values({
      albumId: created.id,
      parentAlbumId: body.parentAlbumId,
    })
  }

  // Add initial inspirations if specified
  if (body.inspirationIds && body.inspirationIds.length > 0) {
    await db.insert(inspirationAlbums).values(
      body.inspirationIds.map((inspirationId, index) => ({
        inspirationId,
        albumId: created.id,
        sortOrder: index,
      }))
    )
  }

  const itemCount = body.inspirationIds?.length || 0

  return {
    statusCode: 201,
    body: JSON.stringify(
      AlbumSchema.parse({
        ...created,
        coverImageUrl: null,
        parentAlbumIds: body.parentAlbumId ? [body.parentAlbumId] : [],
        mocIds: [],
        itemCount,
      })
    ),
  }
}
```

### Create Album Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/CreateAlbumModal/index.tsx
import { useState } from 'react'
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
} from '@repo/ui'
import { X } from 'lucide-react'
import { useCreateAlbumMutation } from '@repo/api-client/rtk/inspiration-api'

interface CreateAlbumModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (albumId: string) => void
  parentAlbumId?: string
  initialInspirationIds?: string[]
}

export function CreateAlbumModal({
  open,
  onOpenChange,
  onSuccess,
  parentAlbumId,
  initialInspirationIds,
}: CreateAlbumModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createAlbum] = useCreateAlbumMutation()

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

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const result = await createAlbum({
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
        parentAlbumId,
        inspirationIds: initialInspirationIds,
      }).unwrap()

      onOpenChange(false)
      resetForm()
      onSuccess?.(result.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create album')
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTags([])
    setTagInput('')
    setError(null)
  }

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false)
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Album</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info about initial items */}
          {initialInspirationIds && initialInspirationIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Creating album with {initialInspirationIds.length} image{initialInspirationIds.length !== 1 ? 's' : ''}.
            </p>
          )}

          <div>
            <Label htmlFor="album-title">Title *</Label>
            <Input
              id="album-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Album name"
              disabled={isCreating}
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="album-description">Description (optional)</Label>
            <Textarea
              id="album-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this album about?"
              disabled={isCreating}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div>
            <Label>Tags (optional, max 10)</Label>
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
                placeholder="Add a tag"
                disabled={isCreating || tags.length >= 10}
                maxLength={50}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                disabled={isCreating || tags.length >= 10}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                      disabled={isCreating}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create Album'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### RTK Mutation

```typescript
// Add to packages/core/api-client/src/rtk/inspiration-api.ts
createAlbum: builder.mutation<Album, CreateAlbumRequest>({
  query: (body) => ({
    url: '/albums',
    method: 'POST',
    body,
  }),
  transformResponse: (response) => AlbumSchema.parse(response),
  invalidatesTags: [
    { type: 'Album', id: 'LIST' },
    { type: 'Inspiration', id: 'LIST' }, // Item counts may change
  ],
}),
```

### File Locations

```
apps/api/endpoints/albums/
  create/
    handler.ts               # POST endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    CreateAlbumModal/
      index.tsx              # Create album modal
      __tests__/
        CreateAlbumModal.test.tsx
```

## Testing

### API Tests

- [ ] POST /api/albums creates new album
- [ ] Returns 201 with created album
- [ ] Title is required (returns 400 if missing)
- [ ] Sets sortOrder correctly
- [ ] Adds to parent album if parentAlbumId provided
- [ ] Adds inspirations if inspirationIds provided
- [ ] Returns 404 for invalid parentAlbumId
- [ ] Returns 403 for parent album not owned by user

### Component Tests

- [ ] Modal opens when triggered
- [ ] Title field is required
- [ ] Tags can be added and removed
- [ ] Max 10 tags enforced
- [ ] Create button disabled without title
- [ ] Creating state shows during request
- [ ] Error displays on failure
- [ ] Modal closes on success
- [ ] onSuccess callback receives albumId

### Integration Tests

- [ ] Create album from gallery menu
- [ ] Create album with initial inspirations
- [ ] Create nested album

## Definition of Done

- [ ] POST endpoint creates albums correctly
- [ ] Modal provides good UX for album creation
- [ ] Nested album creation works
- [ ] Initial inspiration assignment works
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1014, insp-1015         | Claude   |
