# Story 3.2.4: Inspiration Image Upload Page

## Status

Draft

## Story

**As a** user,
**I want** to upload inspiration images,
**so that** I can save ideas for future builds.

## Acceptance Criteria

1. ⬜ Route `/inspiration/upload` configured
2. ⬜ Drag-and-drop upload zone
3. ⬜ Multi-file upload support
4. ⬜ Image preview before upload
5. ⬜ Optional caption per image
6. ⬜ Collection selection (optional)
7. ⬜ Upload progress indicator
8. ⬜ Success/error feedback via toast

## Tasks / Subtasks

- [ ] **Task 1: Create Upload Route**
  - [ ] Create `routes/inspiration/upload.tsx`
  - [ ] Configure route

- [ ] **Task 2: Upload Form**
  - [ ] Drag-and-drop zone component
  - [ ] File input fallback
  - [ ] Multi-file selection
  - [ ] File type validation (images only)

- [ ] **Task 3: Preview & Metadata**
  - [ ] Image thumbnail preview
  - [ ] Caption input per image
  - [ ] Collection selector
  - [ ] Remove image from queue

- [ ] **Task 4: Upload Process**
  - [ ] Upload progress bar
  - [ ] Parallel or sequential upload
  - [ ] Success toast
  - [ ] Error handling

## Dev Notes

### Page Component

```typescript
// routes/inspiration/upload.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/inspiration/upload')({
  component: InspirationUploadPage,
})

interface QueuedImage {
  id: string
  file: File
  preview: string
  caption: string
  collectionId: string | null
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

function InspirationUploadPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<QueuedImage[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const { data: collections } = useGetCollectionsQuery()
  const [uploadImage] = useUploadInspirationImageMutation()
  const { success, error } = useToast()

  const handleFilesSelected = (files: FileList) => {
    const newImages: QueuedImage[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      collectionId: selectedCollection,
      status: 'pending',
      progress: 0,
    }))
    setQueue(prev => [...prev, ...newImages])
  }

  const handleUploadAll = async () => {
    for (const image of queue.filter(i => i.status === 'pending')) {
      setQueue(prev => prev.map(i =>
        i.id === image.id ? { ...i, status: 'uploading' } : i
      ))

      try {
        const formData = new FormData()
        formData.append('file', image.file)
        formData.append('caption', image.caption)
        if (image.collectionId) {
          formData.append('collectionId', image.collectionId)
        }

        await uploadImage(formData).unwrap()

        setQueue(prev => prev.map(i =>
          i.id === image.id ? { ...i, status: 'success', progress: 100 } : i
        ))
      } catch (err) {
        setQueue(prev => prev.map(i =>
          i.id === image.id ? { ...i, status: 'error', error: 'Upload failed' } : i
        ))
      }
    }

    const successCount = queue.filter(i => i.status === 'success').length
    if (successCount > 0) {
      success(`Uploaded ${successCount} images successfully`)
      navigate({ to: '/inspiration' })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate({ to: '/inspiration' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Upload Inspiration Images</h1>
      </div>

      {/* Collection Selection */}
      <Card>
        <CardContent className="pt-6">
          <Label>Add to Collection (optional)</Label>
          <Select
            value={selectedCollection ?? ''}
            onValueChange={(v) => setSelectedCollection(v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="No collection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No collection</SelectItem>
              {collections?.items.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <DropZone onFilesSelected={handleFilesSelected} />

      {/* Image Queue */}
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images to Upload ({queue.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {queue.map(image => (
                <ImageQueueItem
                  key={image.id}
                  image={image}
                  onCaptionChange={(caption) => {
                    setQueue(prev => prev.map(i =>
                      i.id === image.id ? { ...i, caption } : i
                    ))
                  }}
                  onRemove={() => {
                    URL.revokeObjectURL(image.preview)
                    setQueue(prev => prev.filter(i => i.id !== image.id))
                  }}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUploadAll} disabled={queue.every(i => i.status !== 'pending')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload All
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
```

### Drop Zone Component

```typescript
interface DropZoneProps {
  onFilesSelected: (files: FileList) => void
}

function DropZone({ onFilesSelected }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
        isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <ImagePlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium">Drag and drop images here</p>
      <p className="text-muted-foreground">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
    </div>
  )
}
```

## Testing

- [ ] Route renders upload page
- [ ] Drag-and-drop adds files to queue
- [ ] File input adds files to queue
- [ ] Preview images display correctly
- [ ] Caption can be edited
- [ ] Upload processes all queued images
- [ ] Success navigates back to gallery

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-11-30 | 0.1     | Initial draft | SM Agent |
