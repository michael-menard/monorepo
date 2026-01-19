# Story 3.1.43: Save Flow & Presign/Upload Handling

## GitHub Issue
- Issue: #266
- URL: https://github.com/michael-menard/monorepo/issues/266
- Status: Todo

## Status

Draft

## Story

**As an** owner,
**I want** my edits saved reliably with progress feedback,
**so that** I know my changes are being persisted.

## Epic Context

This is **Story 2.5 of Epic 2: Edit UX & Frontend**.

## Blocked By

- All Epic 0 stories (3.1.28-3.1.32)
- All Epic 1 stories (3.1.33-3.1.38)
- Story 3.1.42: File Management UI

## Acceptance Criteria

1. Save button triggers save workflow
2. If new files: request presign -> upload to S3 -> finalize
3. If no new files: PATCH metadata directly
4. Progress indicator during upload (per-file and overall)
5. All-or-nothing: if upload fails, no partial save
6. Success redirects to detail page with toast
7. Retry mechanism for transient failures

## Tasks / Subtasks

- [ ] **Task 1: Implement Save Workflow** (AC: 1, 2, 3)
  - [ ] Detect if files changed vs metadata only
  - [ ] For metadata-only: call PATCH `/mocs/:id`
  - [ ] For file changes: presign -> upload -> finalize flow

- [ ] **Task 2: Presign Request** (AC: 2)
  - [ ] Call POST `/mocs/:id/edit/presign` with new file metadata
  - [ ] Receive presigned URLs and s3 keys
  - [ ] Store for upload phase

- [ ] **Task 3: File Upload with Progress** (AC: 4)
  - [ ] Use `@repo/upload-client` for uploads
  - [ ] Track progress per file
  - [ ] Show overall progress (files completed / total)
  - [ ] Show individual file progress bars

- [ ] **Task 4: Finalize Request** (AC: 2, 5)
  - [ ] After all uploads complete, call finalize
  - [ ] Send: metadata changes, new file s3 keys, removed file IDs
  - [ ] Include `expectedUpdatedAt` for conflict detection

- [ ] **Task 5: Progress UI** (AC: 4)
  - [ ] Modal or overlay during save
  - [ ] Show current step: "Preparing..." / "Uploading files..." / "Saving..."
  - [ ] Show file upload progress
  - [ ] Disable form during save

- [ ] **Task 6: Error Handling** (AC: 5, 7)
  - [ ] On presign failure: show error, allow retry
  - [ ] On upload failure: retry up to 3 times, then show error
  - [ ] On finalize failure: show error with details
  - [ ] On 409 conflict: show "reload and try again" message

- [ ] **Task 7: Success Handling** (AC: 6)
  - [ ] On success: redirect to detail page
  - [ ] Show success toast with MOC title
  - [ ] Invalidate RTK Query cache for MOC

## Dev Notes

### Save Workflow

```typescript
// apps/web/main-app/src/components/MocEdit/useSaveWorkflow.ts
import { uploadToPresignedUrl } from '@repo/upload-client'

interface SaveWorkflowState {
  step: 'idle' | 'presigning' | 'uploading' | 'finalizing' | 'success' | 'error'
  progress: {
    filesTotal: number
    filesCompleted: number
    currentFileProgress: number
  }
  error?: Error
}

const useSaveWorkflow = () => {
  const [state, setState] = useState<SaveWorkflowState>({ step: 'idle', progress: { ... } })

  const save = async (
    mocId: string,
    metadata: EditMocInput,
    fileChanges: FileChanges,
    expectedUpdatedAt: string
  ) => {
    try {
      // Determine if files changed
      const hasFileChanges = fileChanges.additions.length > 0 ||
                             fileChanges.removals.length > 0 ||
                             fileChanges.replacements.size > 0

      if (!hasFileChanges) {
        // Metadata-only update
        setState({ step: 'finalizing', progress: { filesTotal: 0, filesCompleted: 0, currentFileProgress: 100 } })
        await patchMoc(mocId, metadata)
        setState({ step: 'success', ... })
        return
      }

      // Full workflow: presign -> upload -> finalize
      setState({ step: 'presigning', ... })

      const allNewFiles = [
        ...fileChanges.additions,
        ...Array.from(fileChanges.replacements.values()),
      ]

      const presignResponse = await presignEditFiles(mocId, allNewFiles)

      setState({ step: 'uploading', progress: { filesTotal: allNewFiles.length, filesCompleted: 0, currentFileProgress: 0 } })

      // Upload all files
      const uploadedFiles = await uploadFilesWithProgress(
        allNewFiles,
        presignResponse.files,
        (completed, current) => {
          setState(prev => ({
            ...prev,
            progress: { ...prev.progress, filesCompleted: completed, currentFileProgress: current }
          }))
        }
      )

      setState({ step: 'finalizing', ... })

      // Finalize
      await finalizeEdit(mocId, {
        ...metadata,
        newFiles: uploadedFiles.map(f => ({
          s3Key: f.s3Key,
          category: f.category,
          filename: f.filename,
          size: f.size,
          mimeType: f.mimeType,
        })),
        removedFileIds: [
          ...fileChanges.removals,
          ...Array.from(fileChanges.replacements.keys()), // Old files being replaced
        ],
        expectedUpdatedAt,
      })

      setState({ step: 'success', ... })

    } catch (error) {
      setState({ step: 'error', error: error as Error, ... })
    }
  }

  return { state, save, reset: () => setState({ step: 'idle', ... }) }
}
```

### Upload with Progress

```typescript
const uploadFilesWithProgress = async (
  files: PendingFile[],
  presignedUrls: PresignedUrl[],
  onProgress: (completed: number, currentProgress: number) => void
): Promise<UploadedFile[]> => {
  const results: UploadedFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const presigned = presignedUrls.find(p => p.id === file.id)

    if (!presigned) {
      throw new Error(`No presigned URL for file ${file.id}`)
    }

    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        const result = await uploadToPresignedUrl(
          presigned.uploadUrl,
          file.file,
          {
            onProgress: progress => onProgress(i, progress.percent),
          }
        )

        results.push({
          ...file,
          s3Key: presigned.s3Key,
          etag: result.etag,
        })

        onProgress(i + 1, 100)
        break

      } catch (error) {
        retries++
        if (retries >= maxRetries) {
          throw new Error(`Failed to upload ${file.file.name} after ${maxRetries} attempts`)
        }
        await delay(1000 * retries) // Exponential backoff
      }
    }
  }

  return results
}
```

### Progress Modal

```typescript
function SaveProgressModal({ state, onCancel }: SaveProgressModalProps) {
  const stepMessages = {
    presigning: 'Preparing upload...',
    uploading: `Uploading files (${state.progress.filesCompleted}/${state.progress.filesTotal})...`,
    finalizing: 'Saving changes...',
  }

  return (
    <Dialog open={state.step !== 'idle' && state.step !== 'success'}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saving Changes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-muted-foreground">{stepMessages[state.step]}</p>

          {state.step === 'uploading' && (
            <>
              <Progress value={state.progress.currentFileProgress} />
              <p className="text-sm text-muted-foreground text-center">
                File {state.progress.filesCompleted + 1} of {state.progress.filesTotal}
              </p>
            </>
          )}

          {state.step === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                {state.error?.message || 'An error occurred while saving'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {state.step === 'error' && (
            <>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={onRetry}>Retry</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Conflict Handling

```typescript
// Handle 409 from finalize
if (error.status === 409 && error.code === 'CONCURRENT_EDIT') {
  return (
    <Alert>
      <AlertTitle>Conflict Detected</AlertTitle>
      <AlertDescription>
        This MOC was modified by another session. Please reload the page and try again.
      </AlertDescription>
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </Alert>
  )
}
```

## Testing

### Test Location
- `apps/web/main-app/src/components/MocEdit/__tests__/useSaveWorkflow.test.ts`
- `apps/web/main-app/src/components/MocEdit/__tests__/SaveProgressModal.test.tsx`

### Test Requirements
- Unit: Metadata-only save calls PATCH
- Unit: File changes trigger full workflow
- Unit: Progress updates correctly
- Unit: Retry on upload failure
- Unit: 409 shows conflict message
- Integration: Full save workflow (mocked API)
- Integration: Success redirects to detail page

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-08 | 0.1 | Initial draft from Edit MOC PRD | SM Agent |

## Dev Agent Record

### Agent Model Used

N/A

### Debug Log References

N/A

### Completion Notes

N/A

### File List

- `apps/web/main-app/src/components/MocEdit/useSaveWorkflow.ts` - New
- `apps/web/main-app/src/components/MocEdit/SaveProgressModal.tsx` - New
- `apps/web/main-app/src/services/api/mocApi.ts` - Modified (add presign, finalize mutations)
