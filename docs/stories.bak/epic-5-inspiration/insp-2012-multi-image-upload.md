# Story insp-2012: Multi-Image Upload Modal

## Status

Draft

## Consolidates

- insp-1030.multi-image-upload-modal
- insp-1031.create-as-album-flow

## Story

**As a** user,
**I want** to upload multiple images at once,
**so that** I can quickly add many inspirations to my collection.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Upload Modal

## Dependencies

- **insp-2001**: S3 Upload Infrastructure
- **insp-2003**: Upload Single Inspiration
- **insp-2006**: Create Album

## Acceptance Criteria

### Multi-File Selection

1. Upload modal accepts multiple files via drag-and-drop
2. Upload modal accepts multiple files via file picker
3. Shows preview thumbnails for all selected files
4. Can remove individual files before upload
5. Shows total count of selected files

### Create as Album Flow

6. When 2+ files selected, prompt "Create as album?"
7. If yes: show album name input
8. If no: upload as individual inspirations
9. Prompt can be skipped with "Don't ask again" checkbox
10. Preference stored in localStorage

### Upload Process

11. Upload all files in parallel (with concurrency limit)
12. Each file gets its own presigned URL
13. Track progress for each file individually
14. Create inspirations after successful S3 uploads
15. If album selected, create album and add all items

## Tasks / Subtasks

### Task 1: Update Upload Modal for Multi-File (AC: 1-5)

- [ ] Modify dropzone to accept multiple files
- [ ] Render grid of preview thumbnails
- [ ] Add remove button to each thumbnail
- [ ] Show file count badge
- [ ] Handle max file limit (e.g., 20 files)

### Task 2: Implement Create as Album Prompt (AC: 6-10)

- [ ] Show prompt when files.length >= 2
- [ ] Album name input field
- [ ] "Don't ask again" checkbox
- [ ] Store preference in localStorage
- [ ] Skip prompt if preference set

### Task 3: Implement Parallel Upload (AC: 11-15)

- [ ] Create uploadMultiple function
- [ ] Limit concurrency (e.g., 3 at a time)
- [ ] Track progress per file
- [ ] Aggregate overall progress
- [ ] Handle partial failures

### Task 4: Create Album with Items

- [ ] If album selected, create album first
- [ ] Add all successfully uploaded inspirations
- [ ] Handle case where some uploads fail

## Dev Notes

### Enhanced Upload Modal

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
  Checkbox,
  Progress,
  Badge,
} from '@repo/ui'
import { Upload, X, Folder } from 'lucide-react'
import { useInspirationUpload } from '@/hooks/useInspirationUpload'
import { useCreateInspirationMutation, useCreateAlbumMutation } from '@repo/api-client/rtk/inspiration-api'

interface FileWithPreview extends File {
  preview: string
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

const MAX_FILES = 20
const CONCURRENT_UPLOADS = 3

export function UploadModal({ open, onOpenChange, onSuccess }) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [showAlbumPrompt, setShowAlbumPrompt] = useState(false)
  const [createAsAlbum, setCreateAsAlbum] = useState(false)
  const [albumName, setAlbumName] = useState('')
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const { upload } = useInspirationUpload()
  const [createInspiration] = useCreateInspirationMutation()
  const [createAlbum] = useCreateAlbumMutation()

  const skipAlbumPrompt = localStorage.getItem('skipAlbumPrompt') === 'true'

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.slice(0, MAX_FILES - files.length).map(file => ({
      ...file,
      preview: URL.createObjectURL(file),
      id: crypto.randomUUID(),
      status: 'pending' as const,
      progress: 0,
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Show album prompt if multiple files
    if ((files.length + newFiles.length) >= 2 && !skipAlbumPrompt) {
      setShowAlbumPrompt(true)
    }
  }, [files.length, skipAlbumPrompt])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: MAX_FILES,
    disabled: isUploading,
  })

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      if (updated.length < 2) {
        setShowAlbumPrompt(false)
        setCreateAsAlbum(false)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    // Save preference if checked
    if (dontAskAgain) {
      localStorage.setItem('skipAlbumPrompt', 'true')
    }

    try {
      // Upload files with concurrency limit
      const results = await uploadWithConcurrency(files, CONCURRENT_UPLOADS, async (file, updateProgress) => {
        // Update file status
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploading' } : f
        ))

        try {
          // Upload to S3
          const s3Key = await upload(file, (progress) => {
            updateProgress(progress.percent)
            setFiles(prev => prev.map(f =>
              f.id === file.id ? { ...f, progress: progress.percent } : f
            ))
          })

          // Create inspiration
          const inspiration = await createInspiration({
            imageUrl: s3Key,
          }).unwrap()

          setFiles(prev => prev.map(f =>
            f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
          ))

          return { success: true, inspirationId: inspiration.id }
        } catch (error) {
          setFiles(prev => prev.map(f =>
            f.id === file.id ? { ...f, status: 'error', error: String(error) } : f
          ))
          return { success: false, error }
        }
      })

      // Create album if requested
      if (createAsAlbum && albumName) {
        const successfulIds = results
          .filter(r => r.success)
          .map(r => r.inspirationId)

        if (successfulIds.length > 0) {
          await createAlbum({
            title: albumName,
            inspirationIds: successfulIds,
          }).unwrap()
        }
      }

      // Check if all succeeded
      const allSuccess = results.every(r => r.success)
      if (allSuccess) {
        onOpenChange(false)
        resetForm()
        onSuccess?.()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview))
    setFiles([])
    setShowAlbumPrompt(false)
    setCreateAsAlbum(false)
    setAlbumName('')
  }

  const overallProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && !isUploading) {
        resetForm()
      }
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add Inspiration{files.length > 1 ? 's' : ''}
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-2">{files.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop images, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {MAX_FILES} images, max 10MB each
            </p>
          </div>

          {/* Preview Grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {files.map((file) => (
                <div key={file.id} className="relative aspect-square">
                  <img
                    src={file.preview}
                    alt=""
                    className={`w-full h-full object-cover rounded ${
                      file.status === 'error' ? 'opacity-50' : ''
                    }`}
                  />
                  {file.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {file.progress}%
                      </span>
                    </div>
                  )}
                  {file.status === 'success' && (
                    <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                      <span className="text-white">✓</span>
                    </div>
                  )}
                  {file.status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                      <span className="text-white">✗</span>
                    </div>
                  )}
                  {!isUploading && (
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Album Prompt */}
          {showAlbumPrompt && !isUploading && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-primary" />
                <span className="font-medium">Create as album?</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={createAsAlbum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateAsAlbum(true)}
                >
                  Yes, create album
                </Button>
                <Button
                  variant={!createAsAlbum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreateAsAlbum(false)}
                >
                  No, add individually
                </Button>
              </div>
              {createAsAlbum && (
                <Input
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Album name"
                />
              )}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={dontAskAgain}
                  onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
                />
                Don't ask again
              </label>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={overallProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {overallProgress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading || (createAsAlbum && !albumName)}
          >
            {isUploading
              ? 'Uploading...'
              : createAsAlbum
                ? 'Create Album'
                : `Add ${files.length} Image${files.length !== 1 ? 's' : ''}`
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Utility for concurrent uploads
async function uploadWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, updateProgress: (percent: number) => void) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const p = fn(item, () => {}).then(result => {
      results.push(result)
    })
    executing.push(p)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(executing.findIndex(e => e === p), 1)
    }
  }

  await Promise.all(executing)
  return results
}
```

## Testing

### Component Tests

- [ ] Dropzone accepts multiple files
- [ ] Preview grid shows all selected files
- [ ] Can remove individual files
- [ ] Max file limit enforced
- [ ] Album prompt appears for 2+ files
- [ ] Album name required when creating album
- [ ] "Don't ask again" saves preference
- [ ] Progress shows for each file
- [ ] Handles partial failures gracefully

### Integration Tests

- [ ] Upload 5 images as individual inspirations
- [ ] Upload 5 images as album
- [ ] Upload with some failures (retry available)

## Definition of Done

- [ ] Multi-file selection works
- [ ] Album prompt flow complete
- [ ] Parallel upload with progress
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1030, insp-1031         | Claude   |
