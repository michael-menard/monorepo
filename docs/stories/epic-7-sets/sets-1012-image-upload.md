# Story sets-1012: Image Upload for Sets

## Status

Draft

## Story

**As a** user,
**I want** to upload images of my sets,
**So that** I can visually document my collection.

## Acceptance Criteria

1. [ ] Image upload zone on Add and Edit pages
2. [ ] Supports multiple image upload (up to 10)
3. [ ] Drag and drop support
4. [ ] Image preview before save
5. [ ] Reorder images by drag
6. [ ] Remove image before save
7. [ ] Upload to S3 via presigned URL
8. [ ] Thumbnail generation
9. [ ] Progress indicator during upload

## Tasks

- [ ] **Task 1: Create image presign endpoint**
  - [ ] POST /api/sets/:id/images/presign
  - [ ] Generate presigned S3 URL
  - [ ] Return upload URL and final image URL

- [ ] **Task 2: Create image registration endpoint**
  - [ ] POST /api/sets/:id/images
  - [ ] Register image after S3 upload
  - [ ] Generate thumbnail
  - [ ] Return image record

- [ ] **Task 3: Create delete image endpoint**
  - [ ] DELETE /api/sets/:id/images/:imageId
  - [ ] Remove from database
  - [ ] Delete from S3

- [ ] **Task 4: Create ImageUploadZone component**
  - [ ] Drag and drop zone
  - [ ] File picker fallback
  - [ ] Preview grid
  - [ ] Reorder support
  - [ ] Remove button per image

- [ ] **Task 5: Integrate into Add/Edit forms**
  - [ ] Add ImageUploadZone to forms
  - [ ] Handle upload on form submit
  - [ ] Show upload progress

## Dev Notes

### Presign Endpoint

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

### Image Registration Endpoint

```typescript
// apps/api/endpoints/sets/images/register/handler.ts
export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id
  const { imageUrl, key } = JSON.parse(event.body || '{}')

  // Verify set ownership
  const set = await getSetById(setId)
  if (!set || set.userId !== userId) {
    return forbidden()
  }

  // Get current max position
  const maxPosition = await db
    .select({ max: max(setImages.position) })
    .from(setImages)
    .where(eq(setImages.setId, setId))

  // Generate thumbnail (Lambda or queue)
  const thumbnailUrl = await generateThumbnail(key)

  // Insert image record
  const image = await db.insert(setImages).values({
    setId,
    imageUrl,
    thumbnailUrl,
    position: (maxPosition[0]?.max ?? -1) + 1,
  }).returning()

  return created(image[0])
}
```

### ImageUploadZone Component

```typescript
// components/ImageUploadZone/index.tsx
interface ImageUploadZoneProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
  setId?: string // If provided, uploads immediately; otherwise, queues for later
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
  setId,
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
            {isDragActive
              ? 'Drop images here...'
              : 'Drag & drop images, or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {images.length}/{maxImages} images
          </p>
        </div>
      )}

      {/* Preview Grid */}
      {images.length > 0 && (
        <SortableImageGrid
          images={images}
          onRemove={removeImage}
          onMove={moveImage}
        />
      )}
    </div>
  )
}
```

### Upload Flow

**On Add Form Submit:**
1. Form validation passes
2. Create set via API (get setId)
3. For each pending image:
   - Get presigned URL
   - Upload to S3
   - Register with API
4. Navigate to gallery on complete

**On Edit Form:**
- Existing images already uploaded
- New images follow same upload flow
- Removed images deleted via API

## Testing

- [ ] Drop zone accepts images
- [ ] File picker works
- [ ] Preview shows before upload
- [ ] Drag to reorder works
- [ ] Remove image works
- [ ] Max images limit enforced
- [ ] Presign endpoint returns valid URL
- [ ] S3 upload succeeds
- [ ] Image registration creates record
- [ ] Thumbnail generated
- [ ] Delete removes from S3 and database
- [ ] Progress indicator shows during upload

## Dependencies

- sets-1000: Database Schema (set_images table)
- sets-1010: Add Set Form
- sets-1011: Edit Set Form
- S3 bucket configured

## References

- PRD: docs/prd/epic-7-sets-gallery.md (User Interface - Add Modal - Images)
