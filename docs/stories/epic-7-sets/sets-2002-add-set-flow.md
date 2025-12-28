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

### Add Form

7. [ ] Route `/sets/add` renders add form
8. [ ] Form validates with CreateSetSchema
9. [ ] Required field: title
10. [ ] Optional fields: setNumber, pieceCount, theme, tags, purchase details, notes
11. [ ] Build status toggle (default: In Pieces)
12. [ ] Quantity field (default: 1, minimum: 1)
13. [ ] Submit creates set and navigates to gallery
14. [ ] Cancel returns to gallery
15. [ ] Success toast on creation
16. [ ] Error handling with user feedback

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

### Task 6: Create ImageUploadZone Component (AC: 17-22, 25)

- [ ] Create reusable ImageUploadZone component
- [ ] Drag and drop zone with react-dropzone
- [ ] File picker fallback
- [ ] Preview grid with SortableJS
- [ ] Remove button per image
- [ ] Max images enforcement (10)
- [ ] Progress bars for uploads

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

### Add Set Page

```typescript
// routes/sets/add.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateSetSchema, CreateSetInput, useAddSetMutation, usePresignSetImageMutation, useRegisterSetImageMutation } from '@repo/api-client'

export const Route = createFileRoute('/sets/add')({
  component: AddSetPage,
})

function AddSetPage() {
  const navigate = useNavigate()
  const [addSet] = useAddSetMutation()
  const [presignImage] = usePresignSetImageMutation()
  const [registerImage] = useRegisterSetImageMutation()
  const { toast } = useToast()
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateSetInput>({
    resolver: zodResolver(CreateSetSchema),
    defaultValues: {
      title: '',
      setNumber: '',
      pieceCount: undefined,
      theme: '',
      tags: [],
      isBuilt: false,
      quantity: 1,
      purchasePrice: undefined,
      tax: undefined,
      shipping: undefined,
      purchaseDate: undefined,
      notes: '',
    },
  })

  const onSubmit = async (data: CreateSetInput) => {
    setIsSubmitting(true)
    try {
      // Create set first
      const set = await addSet(data).unwrap()

      // Upload images
      for (const image of images.filter(i => i.file)) {
        // Get presigned URL
        const { uploadUrl, imageUrl, key } = await presignImage({
          setId: set.id,
          filename: image.file!.name,
          contentType: image.file!.type,
        }).unwrap()

        // Upload to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          body: image.file,
          headers: { 'Content-Type': image.file!.type },
        })

        // Register image
        await registerImage({
          setId: set.id,
          imageUrl,
          key,
        }).unwrap()
      }

      toast({ title: 'Set added to collection' })
      navigate({ to: '/sets' })
    } catch (error) {
      toast({
        title: 'Failed to add set',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate({ to: '/sets' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add Set</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <SetInfoSection control={form.control} />

          {/* Images Card */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploadZone images={images} onImagesChange={setImages} />
            </CardContent>
          </Card>

          {/* Status Card */}
          <SetStatusSection control={form.control} />

          {/* Purchase Details Card */}
          <PurchaseDetailsSection control={form.control} />

          {/* Notes Card */}
          <NotesSection control={form.control} />

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate({ to: '/sets' })}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Collection
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

### Upload Flow

**On Form Submit:**
1. Form validation passes
2. Create set via API (get setId)
3. For each pending image:
   - Get presigned URL
   - Upload to S3
   - Register with API
4. Navigate to gallery on complete

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

- [ ] Route renders add form
- [ ] Title field is required
- [ ] Form validates on submit
- [ ] Invalid form shows error messages
- [ ] Valid form submits successfully
- [ ] Images upload after set creation
- [ ] Success toast shows on creation
- [ ] Navigates to gallery after success
- [ ] Error toast on API failure
- [ ] Cancel button returns to gallery
- [ ] Default values applied correctly
- [ ] Quantity minimum is 1

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
