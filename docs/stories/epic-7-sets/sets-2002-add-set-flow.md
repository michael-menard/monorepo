# Story sets-2002: Add Set Flow

## Status

Draft

## Consolidates

- sets-1004: Create Set Endpoint
- sets-1010: Add Set Form (Manual Entry)
- sets-1012: Image Upload for Sets

## Story

**As a** user,
**I want** to add new sets to my collection,
**So that** I can track sets I own with images and purchase details.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - CRUD Operations > Create, User Interface > Add Modal

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for RTK Query slice)

## Acceptance Criteria

### Create Endpoint

1. [ ] POST /api/sets creates a new set
2. [ ] Validates request body with CreateSetSchema
3. [ ] Associates set with authenticated user
4. [ ] Returns created set with generated ID
5. [ ] Sets default values (isBuilt=false, quantity=1)
6. [ ] RTK Query mutation hook created and exported

### Add Flow via Set Detail Page

7. [ ] From Sets Gallery, "Add Set" action creates a new draft set (title required) and navigates to the Set Detail page at `/sets/:id`
8. [ ] Set Detail page is composed of clearly separated sections: Basic Info, Images, Status, Purchase Details, and Notes
9. [ ] Each section is displayed in a read-only state by default with a clear "Edit" affordance
10. [ ] Clicking "Edit" on a section turns that section into an inline form validated with `CreateSetSchema`/`UpdateSetSchema` for that section's fields
11. [ ] Saving a section persists only that section's fields, shows inline or toast success feedback, and returns the section to read-only state
12. [ ] Canceling a section edit discards unsaved changes and returns the section to read-only state
13. [ ] Navigating away from the Set Detail page with unsaved section changes shows a confirmation dialog
14. [ ] After initial creation, the user remains on the Set Detail page and the Sets Gallery reflects the new set entry

### Image Upload

17. [ ] Image upload zone on Add form
18. [ ] Supports multiple image upload (up to 10)
19. [ ] Drag and drop support
20. [ ] Image preview before save
21. [ ] Reorder images by drag
22. [ ] Remove image before save
23. [ ] Upload to S3 via presigned URL
24. [ ] Thumbnail generation
25. [ ] Progress indicator during upload

## Tasks / Subtasks

### Task 1: Create POST Endpoint (AC: 1-6)

- [ ] Create `apps/api/endpoints/sets/create/handler.ts`
- [ ] Validate body with CreateSetSchema
- [ ] Insert into database with defaults
- [ ] Set createdAt and updatedAt
- [ ] Return created set with empty images array

### Task 2: Create Image Presign Endpoint (AC: 17, 23)

- [ ] Create `apps/api/endpoints/sets/images/presign/handler.ts`
- [ ] POST /api/sets/:id/images/presign
- [ ] Verify set ownership
- [ ] Generate presigned S3 URL for PUT
- [ ] Return upload URL, final image URL, and key

### Task 3: Create Image Registration Endpoint (AC: 24)

- [ ] Create `apps/api/endpoints/sets/images/register/handler.ts`
- [ ] POST /api/sets/:id/images
- [ ] Register image after S3 upload
- [ ] Generate thumbnail (Lambda or queue)
- [ ] Assign position based on existing images
- [ ] Return image record

### Task 4: Create Delete Image Endpoint (AC: 22)

- [ ] Create `apps/api/endpoints/sets/images/delete/handler.ts`
- [ ] DELETE /api/sets/:id/images/:imageId
- [ ] Remove from database
- [ ] Delete from S3

### Task 5: RTK Query Mutations (AC: 6)

- [ ] Add `addSet` mutation to setsApi
- [ ] Add `presignSetImage` mutation
- [ ] Add `registerSetImage` mutation
- [ ] Add `deleteSetImage` mutation
- [ ] Configure cache invalidation
- [ ] Export hooks

### Task 6: Integrate ImageUploadZone Component (AC: 17-22, 25)

- [ ] Reuse existing `ImageUploadZone` component from `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx` for the Images section on the Set Detail page
- [ ] Ensure drag and drop, file picker fallback, preview grid, remove, and reorder behaviors match the acceptance criteria
- [ ] Ensure max images enforcement (10) is correctly configured for sets images
- [ ] Ensure progress bars for uploads (if/when added) are wired to `@repo/upload-client` (`uploadToPresignedUrl` or `createUploadManager`) for S3 presigned URL uploads, including cancellation support via `AbortController`

### Task 7: Create Add Set Page (AC: 7-16)

- [ ] Create `routes/sets/add.tsx`
- [ ] Form with react-hook-form + zodResolver
- [ ] Basic Info section (title, setNumber, pieceCount, theme)
- [ ] Tags input with TagInput component
- [ ] Status section (isBuilt toggle, quantity stepper)
- [ ] Purchase Details section (optional, collapsible)
- [ ] Notes textarea
- [ ] ImageUploadZone integration
- [ ] Submit handling with image upload flow
- [ ] Cancel button
- [ ] Toast feedback

## Dev Notes

### Create Endpoint Handler

```typescript
// apps/api/endpoints/sets/create/handler.ts
import { CreateSetSchema, SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const body = JSON.parse(event.body || '{}')

  const input = CreateSetSchema.parse(body)

  const now = new Date().toISOString()
  const [set] = await db.insert(sets).values({
    ...input,
    userId,
    isBuilt: input.isBuilt ?? false,
    quantity: input.quantity ?? 1,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  }).returning()

  return created(SetSchema.parse({ ...set, images: [] }))
}
```

### Image Presign Endpoint

```typescript
// apps/api/endpoints/sets/images/presign/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id
  const { filename, contentType } = JSON.parse(event.body || '{}')

  // Verify set ownership
  const set = await getSetById(setId)
  if (!set || set.userId !== userId) {
    return forbidden()
  }

  const key = `sets/${setId}/${uuid()}-${filename}`

  const presignedUrl = await s3.getSignedUrl('putObject', {
    Bucket: process.env.SETS_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: 300, // 5 minutes
  })

  return success({
    uploadUrl: presignedUrl,
    imageUrl: `https://${process.env.SETS_BUCKET}.s3.amazonaws.com/${key}`,
    key,
  })
}
```

### RTK Query Mutations

```typescript
// In sets-api.ts
addSet: builder.mutation<Set, CreateSetInput>({
  query: (data) => ({
    url: '/sets',
    method: 'POST',
    body: data,
  }),
  invalidatesTags: [{ type: 'Set', id: 'LIST' }],
}),

presignSetImage: builder.mutation<
  { uploadUrl: string; imageUrl: string; key: string },
  { setId: string; filename: string; contentType: string }
>({
  query: ({ setId, ...body }) => ({
    url: `/sets/${setId}/images/presign`,
    method: 'POST',
    body,
  }),
}),

registerSetImage: builder.mutation<SetImage, { setId: string; imageUrl: string; key: string }>({
  query: ({ setId, ...body }) => ({
    url: `/sets/${setId}/images`,
    method: 'POST',
    body,
  }),
  invalidatesTags: (result, error, { setId }) => [{ type: 'Set', id: setId }],
}),

deleteSetImage: builder.mutation<void, { setId: string; imageId: string }>({
  query: ({ setId, imageId }) => ({
    url: `/sets/${setId}/images/${imageId}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, { setId }) => [{ type: 'Set', id: setId }],
}),
```

### ImageUploadZone Component

```typescript
// components/ImageUploadZone/index.tsx
interface ImageUploadZoneProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
}

interface UploadedImage {
  id?: string
  file?: File
  preview: string
  imageUrl?: string
  thumbnailUrl?: string
  uploading?: boolean
  progress?: number
}

export function ImageUploadZone({
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remaining = maxImages - images.length
    const filesToAdd = acceptedFiles.slice(0, remaining)

    const newImages = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }))

    onImagesChange([...images, ...newImages])
  }, [images, maxImages, onImagesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: maxImages - images.length,
    disabled: images.length >= maxImages,
  })

  const removeImage = (index: number) => {
    const newImages = [...images]
    const removed = newImages.splice(index, 1)[0]
    if (removed.preview && removed.file) {
      URL.revokeObjectURL(removed.preview)
    }
    onImagesChange(newImages)
  }

  const moveImage = (from: number, to: number) => {
    const newImages = [...images]
    const [moved] = newImages.splice(from, 1)
    newImages.splice(to, 0, moved)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Drop images here...' : 'Drag & drop images, or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {images.length}/{maxImages} images
          </p>
        </div>
      )}

      {/* Preview Grid with Drag Reorder */}
      {images.length > 0 && (
        <SortableImageGrid images={images} onRemove={removeImage} onMove={moveImage} />
      )}
    </div>
  )
}
```

### Add Flow via Set Detail Page

The "Add Set" experience reuses the Set Detail page instead of a separate `/sets/add` form route.

- The Sets Gallery provides an "Add Set" action that creates a new draft set (with minimal required data, e.g. title) and immediately navigates to the Set Detail page at `/sets/:id`.
- The Set Detail page is responsible for rendering all sections (Basic Info, Images, Status, Purchase Details, Notes) in read-only mode with inline edit controls.
- Each section manages its own form state and submission lifecycle (loading, success, error) and calls the appropriate API mutation for that subset of fields.
- The initial create call can either:
  - be triggered by a lightweight inline form in the Basic Info section, or
  - be triggered by an "Add Set" CTA that opens the detail page in a "new set" state and creates the record on first save.
- After the record exists, all subsequent changes are incremental section-level updates rather than a single large form submit.

### Upload Flow

**In Images section:**
1. User selects or drops images into the Images section on the Set Detail page
2. For each new image:
   - Get presigned URL via `presignSetImage`
   - Upload to S3 using the presigned URL
   - Register with API via `registerSetImage`
3. Images list updates in-place on the Set Detail page (no full-page navigation)
4. Deleting or reordering images happens inline and updates the API accordingly

### Theme Options

```typescript
const THEMES = [
  'Architecture',
  'Castle',
  'City',
  'Creator',
  'Creator Expert',
  'Disney',
  'Friends',
  'Harry Potter',
  'Icons',
  'Ideas',
  'Marvel',
  'Minecraft',
  'Ninjago',
  'Speed Champions',
  'Star Wars',
  'Technic',
  'Other',
]
```

## Testing

### API Tests

- [ ] POST /api/sets creates set with all fields
- [ ] POST /api/sets creates set with only required fields
- [ ] Applies default values correctly
- [ ] Validates required title field
- [ ] Rejects invalid price (negative)
- [ ] Rejects invalid quantity (0 or negative)
- [ ] Associates with authenticated user
- [ ] Unauthenticated request returns 401
- [ ] Image presign returns valid URL
- [ ] Image registration creates record
- [ ] Image delete removes from DB and S3

### Component Tests

- [ ] ImageUploadZone accepts dropped files
- [ ] ImageUploadZone accepts selected files
- [ ] Preview shows before upload
- [ ] Drag to reorder works
- [ ] Remove image works
- [ ] Max images limit enforced
- [ ] Progress shows during upload

### Page Tests

- [ ] From gallery, "Add Set" action creates a draft set and navigates to `/sets/:id` detail page
- [ ] Set Detail page renders all sections (Basic Info, Images, Status, Purchase Details, Notes)
- [ ] Each section shows read-only content with an "Edit" control
- [ ] Clicking "Edit" on a section switches that section into an inline form state
- [ ] Section-level save calls the correct mutation and returns the section to read-only state on success
- [ ] Section-level validation errors are shown inline for that section only
- [ ] Section-level cancel discards unsaved changes and restores original values
- [ ] Navigating away with unsaved section changes shows confirmation dialog
- [ ] Images section supports add, remove, and reorder inline
- [ ] Images upload and register successfully from the detail page
- [ ] Success feedback is shown after initial create and after section saves
- [ ] Errors from API are surfaced with user-friendly messaging

## Definition of Done

- [ ] Set can be created with all fields
- [ ] Images can be uploaded and associated
- [ ] Form validates all inputs correctly
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author |
| ---------- | ------- | ---------------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                                  | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1004, 1010, 1012        | Claude |
