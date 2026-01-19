# Story insp-2013: Upload Progress & Error Handling

## Status

Draft

## Consolidates

- insp-1032.upload-progress-partial-failure

## Story

**As a** user,
**I want** to see detailed upload progress and handle errors gracefully,
**so that** I know what's happening and can recover from failures.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - User Interface > Upload Modal, Loading & Error States

## Dependencies

- **insp-2001**: S3 Upload Infrastructure
- **insp-2012**: Multi-Image Upload Modal

## Acceptance Criteria

### Progress Indicators

1. Individual progress bar per file during upload
2. Overall progress indicator for batch uploads
3. Status icons: pending, uploading, success, error
4. File size display for each item
5. Estimated time remaining (optional)

### Error Handling

6. Clear error message when upload fails
7. Error icon on failed files in list
8. Retry button for individual failed uploads
9. "Retry All Failed" button for batch failures
10. Can skip failed files and continue
11. Summary shown at end: "X of Y uploaded successfully"

### Partial Failure Recovery

12. Successful uploads saved even if others fail
13. Can close modal after partial success
14. Failed files remain selectable for retry
15. Progress persists if user accidentally clicks away (within session)

## Tasks / Subtasks

### Task 1: Enhanced Progress UI (AC: 1-5)

- [ ] Add individual progress bar component
- [ ] Show file size next to each item
- [ ] Add status icons (spinner, check, X)
- [ ] Calculate and show overall progress
- [ ] Optional: estimate time remaining

### Task 2: Error States (AC: 6-8)

- [ ] Display error message per file
- [ ] Style failed items distinctly
- [ ] Add retry button to failed items
- [ ] Clear error on retry

### Task 3: Batch Error Handling (AC: 9-11)

- [ ] "Retry All Failed" button
- [ ] "Skip Failed" option
- [ ] Continue with successful items
- [ ] Final summary display

### Task 4: State Persistence (AC: 12-15)

- [ ] Don't clear state on close during upload
- [ ] Allow re-opening modal to see progress
- [ ] Mark successful uploads as complete
- [ ] Keep failed items for retry

## Dev Notes

### Upload Progress Component

```typescript
// apps/web/main-app/src/routes/inspiration/-components/UploadProgress/index.tsx
import { Progress, Badge, Button } from '@repo/ui'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface UploadFile {
  id: string
  name: string
  size: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  preview?: string
}

interface UploadProgressProps {
  files: UploadFile[]
  onRetry: (fileId: string) => void
  onRetryAll: () => void
  onRemove: (fileId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadProgress({ files, onRetry, onRetryAll, onRemove }: UploadProgressProps) {
  const totalProgress = files.reduce((sum, f) => sum + f.progress, 0) / files.length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {uploadingCount > 0
              ? `Uploading ${uploadingCount} of ${files.length}...`
              : `${successCount} of ${files.length} uploaded`
            }
          </span>
          <span className="font-medium">{Math.round(totalProgress)}%</span>
        </div>
        <Progress value={totalProgress} />
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center gap-3 p-2 rounded-lg border ${
              file.status === 'error' ? 'border-destructive bg-destructive/5' : 'border-border'
            }`}
          >
            {/* Preview */}
            {file.preview && (
              <img
                src={file.preview}
                alt=""
                className="w-10 h-10 object-cover rounded"
              />
            )}

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
                {file.error && (
                  <span className="text-destructive ml-2">{file.error}</span>
                )}
              </p>
              {file.status === 'uploading' && (
                <Progress value={file.progress} className="h-1 mt-1" />
              )}
            </div>

            {/* Status Icon / Actions */}
            <div className="flex items-center gap-2">
              {file.status === 'pending' && (
                <Badge variant="secondary" className="text-xs">Waiting</Badge>
              )}
              {file.status === 'uploading' && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {file.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {file.status === 'error' && (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRetry(file.id)}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error Summary */}
      {errorCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
          <span className="text-sm text-destructive">
            {errorCount} upload{errorCount !== 1 ? 's' : ''} failed
          </span>
          <Button variant="outline" size="sm" onClick={onRetryAll}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry All
          </Button>
        </div>
      )}

      {/* Success Summary */}
      {successCount === files.length && files.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm text-green-700">
            All {files.length} image{files.length !== 1 ? 's' : ''} uploaded successfully!
          </span>
        </div>
      )}
    </div>
  )
}
```

### Error Recovery Logic

```typescript
// In upload modal hook/component
const handleRetry = async (fileId: string) => {
  const file = files.find(f => f.id === fileId)
  if (!file) return

  // Reset file status
  setFiles(prev => prev.map(f =>
    f.id === fileId
      ? { ...f, status: 'pending', progress: 0, error: undefined }
      : f
  ))

  // Re-attempt upload
  await uploadFile(file)
}

const handleRetryAll = async () => {
  const failedFiles = files.filter(f => f.status === 'error')

  // Reset all failed
  setFiles(prev => prev.map(f =>
    f.status === 'error'
      ? { ...f, status: 'pending', progress: 0, error: undefined }
      : f
  ))

  // Re-upload all failed
  for (const file of failedFiles) {
    await uploadFile(file)
  }
}

const handleSkipFailed = () => {
  // Remove failed files from list
  setFiles(prev => prev.filter(f => f.status !== 'error'))
}

const handleFinish = () => {
  // Only successful items will have been created
  const successCount = files.filter(f => f.status === 'success').length
  const failedCount = files.filter(f => f.status === 'error').length

  if (failedCount > 0) {
    // Show confirmation
    if (confirm(`${successCount} uploaded, ${failedCount} failed. Close anyway?`)) {
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    }
  } else {
    onOpenChange(false)
    resetForm()
    onSuccess?.()
  }
}
```

### Session Persistence

```typescript
// Store upload state in context or session storage
const UploadContext = createContext<{
  uploads: UploadFile[]
  setUploads: (files: UploadFile[]) => void
}>()

// Restore state when modal reopens
useEffect(() => {
  if (open && uploads.length > 0) {
    setFiles(uploads)
  }
}, [open, uploads])

// Save state on changes
useEffect(() => {
  setUploads(files)
}, [files, setUploads])
```

## Testing

### Component Tests

- [ ] Progress bar shows correct percentage
- [ ] Status icons display correctly
- [ ] File sizes formatted properly
- [ ] Retry button works for failed items
- [ ] "Retry All" retries all failed
- [ ] Success summary shows correctly
- [ ] Error summary shows correctly

### Error Handling Tests

- [ ] Simulated S3 failure shows error state
- [ ] Retry clears error and re-attempts
- [ ] Partial success doesn't lose successful uploads
- [ ] Can close after partial success with confirmation

### Edge Cases

- [ ] Network disconnect during upload
- [ ] Very large file timeout
- [ ] Browser tab close warning during upload

## Definition of Done

- [ ] Individual and overall progress shown
- [ ] Clear error states with retry options
- [ ] Partial failure recovery works
- [ ] User can complete with mixed results
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1032                    | Claude   |
