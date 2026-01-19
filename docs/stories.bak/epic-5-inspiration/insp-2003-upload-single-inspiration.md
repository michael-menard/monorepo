# Story insp-2003: Upload Single Inspiration

## Status

Draft

## Consolidates

- insp-1003.create-inspiration-endpoint
- insp-1009.upload-modal-single-image

## Story

**As a** user,
**I want** to upload a single inspiration image with optional metadata,
**so that** I can add new items to my inspiration collection.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - CRUD Operations > Create

## Dependencies

- **insp-2000**: Database Schema & Shared Types
- **insp-2001**: S3 Upload Infrastructure
- **insp-2002**: Inspiration Gallery MVP (for integration)

## Acceptance Criteria

### API Endpoint

1. POST /api/inspirations creates new inspiration
2. Accepts imageUrl (S3 key or full URL), title, description, sourceUrl, tags
3. Sets sortOrder to place new item at end (or beginning)
4. Returns created inspiration with all fields
5. Validates all input with Zod schema
6. Rejects invalid image URLs

### Upload Modal

7. Modal opens from "Add" button in gallery
8. Drag-and-drop zone for image upload
9. File picker alternative for click-to-browse
10. Shows image preview after selection
11. Optional fields: title, description, source URL, tags
12. Tag input with chips (max 10 tags)
13. Upload progress indicator
14. Cancel button to abort upload
15. Submit creates inspiration and closes modal
16. Success closes modal and refreshes gallery
17. Error shows message with retry option

## Tasks / Subtasks

### Task 1: Create POST Inspiration Endpoint (AC: 1-6)

- [ ] Create `apps/api/endpoints/inspirations/create/handler.ts`
- [ ] Parse body with CreateInspirationRequestSchema
- [ ] Validate imageUrl is a valid S3 key or URL
- [ ] Calculate sortOrder (max + 1 or 0 for first)
- [ ] Insert into database
- [ ] Return created inspiration

### Task 2: Add RTK Mutation (AC: 1)

- [ ] Add createInspiration mutation to inspiration-api.ts
- [ ] Invalidate LIST cache on success
- [ ] Handle optimistic updates if desired

### Task 3: Create Upload Modal Component (AC: 7-17)

- [ ] Create `apps/web/main-app/src/routes/inspiration/-components/UploadModal/index.tsx`
- [ ] Use Dialog from @repo/ui
- [ ] Create DropZone component for drag-and-drop
- [ ] Image preview after file selection
- [ ] Form fields for metadata
- [ ] Tag input with chips

### Task 4: Implement Upload Flow

- [ ] Use useInspirationUpload hook from insp-2001
- [ ] Handle presign → S3 upload → create inspiration flow
- [ ] Show progress during S3 upload
- [ ] Handle errors at each step

### Task 5: Integrate with Gallery Page

- [ ] Add modal state to gallery page
- [ ] Connect "Add" button to open modal
- [ ] Refresh gallery on successful upload

## Dev Notes

### Create Endpoint

```typescript
// apps/api/endpoints/inspirations/create/handler.ts
import { db } from '@/database'
import { inspirations, inspirationAlbums } from '@/database/schema'
import { CreateInspirationRequestSchema, InspirationSchema } from '@repo/api-client/schemas/inspiration'
import { eq, sql } from 'drizzle-orm'

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const body = CreateInspirationRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Validate imageUrl is from our S3 bucket
  if (!body.imageUrl.startsWith(`https://${process.env.INSPIRATIONS_BUCKET}`) &&
      !body.imageUrl.startsWith(`users/${userId}/inspirations/`)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid image URL' }),
    }
  }

  // Convert S3 key to full URL if needed
  const imageUrl = body.imageUrl.startsWith('http')
    ? body.imageUrl
    : `https://${process.env.INSPIRATIONS_BUCKET}.s3.amazonaws.com/${body.imageUrl}`

  // Calculate sortOrder (place at end)
  const maxSort = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(inspirations)
    .where(eq(inspirations.userId, userId))
    .then(r => r[0].max)

  const now = new Date().toISOString()

  const [created] = await db
    .insert(inspirations)
    .values({
      userId,
      imageUrl,
      title: body.title || null,
      description: body.description || null,
      sourceUrl: body.sourceUrl || null,
      tags: body.tags || [],
      sortOrder: maxSort + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  // If albumId provided, add to album
  if (body.albumId) {
    await db.insert(inspirationAlbums).values({
      inspirationId: created.id,
      albumId: body.albumId,
      sortOrder: 0, // Will be adjusted by album
    })
  }

  return {
    statusCode: 201,
    body: JSON.stringify(
      InspirationSchema.parse({
        ...created,
        albumIds: body.albumId ? [body.albumId] : [],
        mocIds: [],
      })
    ),
  }
}
```

### Upload Modal

```typescript
// apps/web/main-app/src/routes/inspiration/-components/UploadModal/index.tsx
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
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
  Progress,
} from '@repo/ui'
import { Upload, X, Image } from 'lucide-react'
import { useInspirationUpload } from '@/hooks/useInspirationUpload'
import { useCreateInspirationMutation } from '@repo/api-client/rtk/inspiration-api'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UploadModal({ open, onOpenChange, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { upload } = useInspirationUpload()
  const [createInspiration] = useCreateInspirationMutation()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

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

  const handleSubmit = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      // 1. Upload to S3
      const s3Key = await upload(file, (progress) => {
        setUploadProgress(progress.percent)
      })

      // 2. Create inspiration
      await createInspiration({
        imageUrl: s3Key,
        title: title || undefined,
        description: description || undefined,
        sourceUrl: sourceUrl || undefined,
        tags,
      }).unwrap()

      // 3. Success
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const resetForm = () => {
    setFile(null)
    setPreview(null)
    setTitle('')
    setDescription('')
    setSourceUrl('')
    setTags([])
    setTagInput('')
    setError(null)
  }

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false)
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Inspiration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone / Preview */}
          {!preview ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Drop the image here...'
                  : 'Drag & drop an image, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 10MB. JPEG, PNG, GIF, or WebP.
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full aspect-video object-contain bg-muted rounded-lg"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Metadata Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this inspiration a name"
                disabled={isUploading}
                maxLength={200}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or context"
                disabled={isUploading}
                maxLength={2000}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sourceUrl">Source URL (optional)</Label>
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/original"
                disabled={isUploading}
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
                  disabled={isUploading || tags.length >= 10}
                  maxLength={50}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  disabled={isUploading || tags.length >= 10}
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
                        disabled={isUploading}
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
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading ? 'Uploading...' : 'Add Inspiration'}
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
createInspiration: builder.mutation<Inspiration, CreateInspirationRequest>({
  query: (body) => ({
    url: '/inspirations',
    method: 'POST',
    body,
  }),
  transformResponse: (response) => InspirationSchema.parse(response),
  invalidatesTags: [{ type: 'Inspiration', id: 'LIST' }],
}),
```

### Gallery Integration

```typescript
// Update apps/web/main-app/src/routes/inspiration/index.tsx
import { UploadModal } from './-components/UploadModal'

function InspirationGalleryPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  // ... rest of component

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inspiration Gallery</h1>
        <Button onClick={() => setUploadModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* ... gallery content */}

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  )
}
```

### File Locations

```
apps/api/endpoints/inspirations/
  create/
    handler.ts               # POST endpoint

apps/web/main-app/src/routes/inspiration/
  -components/
    UploadModal/
      index.tsx              # Upload modal
      __tests__/
        UploadModal.test.tsx
```

## Testing

### API Tests

- [ ] POST /api/inspirations creates new inspiration
- [ ] Returns 201 with created inspiration
- [ ] Sets sortOrder correctly (at end)
- [ ] Validates required imageUrl
- [ ] Rejects invalid image URLs
- [ ] Saves optional fields correctly
- [ ] Adds to album if albumId provided
- [ ] Unauthorized request returns 401

### Component Tests

- [ ] Modal opens when triggered
- [ ] Drop zone accepts valid image types
- [ ] Drop zone rejects invalid file types
- [ ] Preview displays after file selection
- [ ] Can remove selected file
- [ ] Form fields update correctly
- [ ] Tags can be added and removed
- [ ] Max 10 tags enforced
- [ ] Submit button disabled without file
- [ ] Progress shows during upload
- [ ] Error displays on failure
- [ ] Modal closes on success

### Integration Tests

- [ ] Full flow: select file → fill metadata → submit → see in gallery
- [ ] Upload with all optional fields
- [ ] Upload with no optional fields
- [ ] Retry after failure

## Definition of Done

- [ ] POST endpoint creates inspirations correctly
- [ ] Upload modal provides good UX
- [ ] Progress feedback during upload
- [ ] Error handling at all steps
- [ ] Gallery refreshes after upload
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1003, insp-1009         | Claude   |
