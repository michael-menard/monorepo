# Story insp-2004: Edit Inspiration

## Status

Draft

## Consolidates

- insp-1010.update-inspiration-endpoint
- insp-1011.edit-inspiration-modal

## Story

**As a** user,
**I want** to edit the metadata of my inspiration images,
**so that** I can update titles, descriptions, tags, and source URLs.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Update

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2002**: Inspiration Gallery MVP (for detail page integration)

## Acceptance Criteria

### API Endpoint

1. PATCH /api/inspirations/:id updates inspiration
2. Accepts partial updates (only provided fields updated)
3. Validates input with UpdateInspirationRequestSchema
4. Only owner can update their inspirations
5. Returns updated inspiration with all fields
6. Returns 404 for non-existent inspiration
7. Returns 403 for other user's inspiration
8. Updates updatedAt timestamp

### Edit Modal

9. Modal opens from edit button in detail view
10. Pre-populates form with current values
11. Editable fields: title, description, source URL, tags
12. Image is NOT editable (user must delete and re-upload)
13. Tag input matches upload modal behavior
14. Save button updates inspiration
15. Cancel button discards changes
16. Success closes modal and refreshes detail view
17. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create PATCH Inspiration Endpoint (AC: 1-8)

- [ ] Create `apps/api/endpoints/inspirations/update/handler.ts`
- [ ] Path param: id (UUID)
- [ ] Parse body with UpdateInspirationRequestSchema
- [ ] Verify user owns inspiration (return 403 if not)
- [ ] Return 404 if inspiration not found
- [ ] Update only provided fields
- [ ] Update updatedAt timestamp
- [ ] Return updated inspiration

### Task 2: Add RTK Mutation (AC: 1)

- [ ] Add updateInspiration mutation to inspiration-api.ts
- [ ] Invalidate specific inspiration and LIST cache
- [ ] Handle optimistic updates if desired

### Task 3: Create Edit Modal Component (AC: 9-17)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/EditModal/index.tsx`
- [ ] Use Dialog from @repo/ui
- [ ] Pre-populate form from inspiration data
- [ ] Same form fields as upload (minus image)
- [ ] Tag input component
- [ ] Handle save and cancel

### Task 4: Integrate with Detail Page (AC: 9, 16)

- [ ] Add modal state to detail page
- [ ] Connect edit button to open modal
- [ ] Pass current inspiration data
- [ ] Refresh detail on success

## Dev Notes

### Update Endpoint

```typescript
// apps/api/endpoints/inspirations/update/handler.ts
import { db } from '@/database'
import { inspirations } from '@/database/schema'
import { UpdateInspirationRequestSchema, InspirationSchema } from '@repo/api-client/schemas/inspiration'
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

  // Parse and validate update
  const body = UpdateInspirationRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Build update object
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }

  if (body.title !== undefined) updates.title = body.title || null
  if (body.description !== undefined) updates.description = body.description || null
  if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl || null
  if (body.tags !== undefined) updates.tags = body.tags

  // Update
  const [updated] = await db
    .update(inspirations)
    .set(updates)
    .where(eq(inspirations.id, id))
    .returning()

  // Get album/moc IDs
  const albumIds = await getAlbumIds(id)
  const mocIds = await getMocIds(id)

  return {
    statusCode: 200,
    body: JSON.stringify(
      InspirationSchema.parse({
        ...updated,
        albumIds,
        mocIds,
      })
    ),
  }
}
```

### Edit Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/EditModal/index.tsx
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
} from '@repo/ui'
import { X } from 'lucide-react'
import { useUpdateInspirationMutation } from '@repo/api-client/rtk/inspiration-api'
import type { Inspiration } from '@repo/api-client/schemas/inspiration'

interface EditModalProps {
  inspiration: Inspiration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditModal({ inspiration, open, onOpenChange, onSuccess }: EditModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [updateInspiration] = useUpdateInspirationMutation()

  // Pre-populate form when modal opens
  useEffect(() => {
    if (inspiration && open) {
      setTitle(inspiration.title || '')
      setDescription(inspiration.description || '')
      setSourceUrl(inspiration.sourceUrl || '')
      setTags(inspiration.tags || [])
      setError(null)
    }
  }, [inspiration, open])

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
    if (!inspiration) return

    setIsSaving(true)
    setError(null)

    try {
      await updateInspiration({
        id: inspiration.id,
        title: title || undefined,
        description: description || undefined,
        sourceUrl: sourceUrl || undefined,
        tags,
      }).unwrap()

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false)
    }
  }

  const hasChanges = inspiration && (
    title !== (inspiration.title || '') ||
    description !== (inspiration.description || '') ||
    sourceUrl !== (inspiration.sourceUrl || '') ||
    JSON.stringify(tags) !== JSON.stringify(inspiration.tags || [])
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Inspiration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview (read-only) */}
          {inspiration && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={inspiration.imageUrl}
                alt={inspiration.title || 'Inspiration'}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this inspiration a name"
                disabled={isSaving}
                maxLength={200}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or context"
                disabled={isSaving}
                maxLength={2000}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-sourceUrl">Source URL</Label>
              <Input
                id="edit-sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/original"
                disabled={isSaving}
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
                  placeholder="Add a tag"
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
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                        disabled={isSaving}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
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
updateInspiration: builder.mutation<Inspiration, { id: string } & UpdateInspirationRequest>({
  query: ({ id, ...body }) => ({
    url: `/inspirations/${id}`,
    method: 'PATCH',
    body,
  }),
  transformResponse: (response) => InspirationSchema.parse(response),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Inspiration', id },
    { type: 'Inspiration', id: 'LIST' },
  ],
}),
```

### Detail Page Integration

```typescript
// Update apps/web/main-app/src/routes/inspiration/$id.tsx
import { EditModal } from './-components/EditModal'

function InspirationDetailPage() {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const { id } = Route.useParams()
  const { data: inspiration, refetch } = useGetInspirationQuery(id)

  return (
    <div>
      {/* ... existing content */}

      <Button variant="outline" size="icon" onClick={() => setEditModalOpen(true)}>
        <Pencil className="w-4 h-4" />
      </Button>

      <EditModal
        inspiration={inspiration || null}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
```

### File Locations

```
apps/api/endpoints/inspirations/
  update/
    handler.ts               # PATCH endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    EditModal/
      index.tsx              # Edit modal
      __tests__/
        EditModal.test.tsx
```

## Testing

### API Tests

- [ ] PATCH /api/inspirations/:id updates inspiration
- [ ] Returns 200 with updated inspiration
- [ ] Only updates provided fields (partial update)
- [ ] Updates updatedAt timestamp
- [ ] Returns 404 for non-existent inspiration
- [ ] Returns 403 for other user's inspiration
- [ ] Validates input data
- [ ] Clears fields when set to empty string

### Component Tests

- [ ] Modal opens when triggered
- [ ] Form pre-populates with current values
- [ ] Form fields update correctly
- [ ] Tags can be added and removed
- [ ] Max 10 tags enforced
- [ ] Save button disabled when no changes
- [ ] Save button enabled when changes made
- [ ] Saving state shows during request
- [ ] Error displays on failure
- [ ] Modal closes on success

### Integration Tests

- [ ] Full flow: open edit → modify → save → see updated values
- [ ] Edit only title
- [ ] Edit only tags
- [ ] Clear description
- [ ] Cancel discards changes

## Definition of Done

- [ ] PATCH endpoint updates inspirations correctly
- [ ] Edit modal pre-populates and saves changes
- [ ] Partial updates work (only changed fields)
- [ ] Detail view refreshes after edit
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1010, insp-1011         | Claude   |
