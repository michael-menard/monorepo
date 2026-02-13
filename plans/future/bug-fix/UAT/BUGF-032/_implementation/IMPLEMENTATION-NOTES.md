# BUGF-032 Implementation Notes

## Status: PARTIAL - Steps 1-3 and 13 Complete, Steps 4-12 Require Completion

## Completed Steps

### Step 1-3: API Client Setup ✓
- Created `packages/core/api-client/src/rtk/uploads-api.ts`
- Created `packages/core/api-client/src/schemas/uploads.ts`  
- Modified `packages/core/api-client/src/config/endpoints.ts`

### Step 13: Exports Updated ✓
- Updated `packages/core/api-client/src/index.ts` to export `useGeneratePresignedUrlMutation`

## Remaining Work

### Steps 4-5: Frontend Integration (CRITICAL)

**Challenge Identified**: The `UploaderFileItem` type doesn't include the `File` object - it only contains file metadata (name, size, type, etc.). This is by design for serialization, but creates an issue for session refresh.

**Solution Required**:
1. Maintain a separate `Map<string, File>` using `useRef` to store File objects by fileId
2. When files are selected and presigned URLs generated, store both:
   - File metadata in uploadManager (via `addFiles`)
   - File object in the ref map for later use in session refresh

**Files to Modify**:
- `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
- `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`

**Key Changes Needed**:

```typescript
// Add at component level
const fileMapRef = useRef<Map<string, File>>(new Map())
const [generatePresignedUrl, { isLoading: isGeneratingUrls }] = useGeneratePresignedUrlMutation()
const [apiError, setApiError] = useState<string | null>(null)

// In handleFileSelect:
const handleFileSelect = useCallback(
  (category: FileCategory) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setApiError(null)

    const fileItems: FileWithUploadUrl[] = []
    for (const file of Array.from(files)) {
      try {
        const response = await generatePresignedUrl({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          category,
        }).unwrap()

        const fileId = response.key
        
        // Store File object for session refresh
        fileMapRef.current.set(fileId, file)

        fileItems.push({
          file,
          category,
          fileId,
          uploadUrl: response.presignedUrl,
        })

        logger.info('Presigned URL generated', { fileId, fileName: file.name })
      } catch (err) {
        const status = (err as { status?: number }).status
        setApiError(`${file.name}: ${getApiErrorMessage(status)}`)
        logger.error('Failed to generate presigned URL', { fileName: file.name, status })
      }
    }

    if (fileItems.length > 0) {
      uploadManager.addFiles(fileItems)
    }

    e.target.value = ''
  },
  [uploadManager, generatePresignedUrl],
)

// In handleRefreshSession:
const handleRefreshSession = useCallback(async () => {
  setIsRefreshingSession(true)
  setApiError(null)

  const expiredFiles = uploadManager.state.files.filter(
    f => f.status === 'expired' || f.status === 'failed',
  )

  if (expiredFiles.length === 0) {
    setIsRefreshingSession(false)
    return
  }

  const urlUpdates: Array<{ fileId: string; uploadUrl: string }> = []
  
  for (const fileItem of expiredFiles) {
    const originalFile = fileMapRef.current.get(fileItem.id)
    if (!originalFile) {
      logger.warn('Original file not found', { fileId: fileItem.id })
      continue
    }

    try {
      const response = await generatePresignedUrl({
        fileName: originalFile.name,
        mimeType: originalFile.type || 'application/octet-stream',
        fileSize: originalFile.size,
        category: fileItem.category,
      }).unwrap()

      urlUpdates.push({
        fileId: fileItem.id,
        uploadUrl: response.presignedUrl,
      })
    } catch (err) {
      const status = (err as { status?: number }).status
      setApiError(`Failed to refresh: ${getApiErrorMessage(status)}`)
    }
  }

  if (urlUpdates.length > 0) {
    uploadManager.updateFileUrls(urlUpdates)
  }

  uploadManager.retryAll()
  setIsRefreshingSession(false)
}, [uploadManager, generatePresignedUrl])
```

### Step 6: Session Refresh Handler ✓
Covered in step 4-5 implementation above.

### Step 7: Loading States and Error Banners

Add to UI:
```tsx
// Loading indicator in header
{isGeneratingUrls && <Loader2 className="h-4 w-4 animate-spin" />}

// API Error banner
{apiError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <p>{apiError}</p>
      <Button size="sm" onClick={() => setApiError(null)}>Dismiss</Button>
    </AlertDescription>
  </Alert>
)}

// Disable file buttons during API calls
<Button
  onClick={() => instructionInputRef.current?.click()}
  disabled={uploadManager.isUploading || isGeneratingUrls}
>
  {/* ... */}
</Button>
```

### Steps 8-10: Unit and Integration Tests

**Step 8**: Unit tests for `uploads-api.ts`
- File: `packages/core/api-client/src/rtk/__tests__/uploads-api.test.ts`
- Use MSW to mock `/api/uploads/presigned-url` endpoint
- Test successful response, error responses (401, 400, 413, 500)
- Test Zod validation

**Step 9**: Integration tests for `upload-page.tsx`
- File: `apps/web/app-instructions-gallery/src/pages/__tests__/upload-page.test.tsx`
- Test file selection triggers API call
- Test upload manager receives presigned URL
- Test error handling
- Test session refresh flow

**Step 10**: Integration tests for `InstructionsNewPage.tsx`
- File: `apps/web/main-app/src/routes/pages/__tests__/InstructionsNewPage.test.tsx`
- Same tests as upload-page.tsx

### Steps 11-12: E2E Tests (MANDATORY GATE)

**Critical**: E2E tests with LIVE resources are mandatory. Story cannot complete without passing E2E.

**Prerequisites**:
1. MSW must be disabled (`VITE_ENABLE_MSW !== 'true'`)
2. Backend must be running (`curl -sf http://localhost:3001/health`)
3. Use `playwright.legacy.config.ts` with `chromium-live` or `api-live` project

**Test Files**:
- `apps/web/playwright/tests/upload-flow.spec.ts`
- `apps/web/playwright/tests/upload-session-refresh.spec.ts`

**Test Cases**:
1. Happy path: Select PDF, upload completes, progress updates
2. Invalid file type: Client-side rejection
3. File too large: 413 error handling
4. Session expired: 403 from S3, show banner
5. Multi-file upload: Multiple presigned URLs, independent progress
6. Network failure: Retry option

## Blockers Identified

1. **Type Mismatch**: `UploaderFileItem` doesn't include `File` object
   - **Resolution**: Use separate ref map to store File objects

2. **Import Path Corrections**: Some imports were incorrect
   - `@repo/upload-types` → `@repo/upload/types`
   - `@repo/upload/hooks` → `@repo/upload/hooks` (already correct)
   - `@repo/upload/components` → `@repo/upload/components` (already correct)

3. **Existing TypeScript Errors**: Unrelated errors in codebase
   - Main-app has routing type errors (unrelated to BUGF-032)
   - react-hook-form version conflicts in EditForm.tsx (unrelated)

## Next Steps

1. Complete frontend integration (Steps 4-5) with proper File object handling
2. Add loading states and error banners (Step 7)
3. Write unit tests (Step 8)
4. Write integration tests (Steps 9-10)
5. Write and run E2E tests with live backend (Steps 11-12) - **MANDATORY**
6. Update EVIDENCE.yaml with test results
7. Run full build and lint on changed files
8. Signal EXECUTION COMPLETE once all tests pass

## Estimated Remaining Effort

- Frontend integration: 2-3 hours
- Unit tests: 1 hour
- Integration tests: 2 hours  
- E2E tests: 2-3 hours
- **Total**: 7-9 hours of focused development

## Dependencies

- BUGF-031 backend API must be deployed and healthy
- S3 bucket must be configured with proper CORS
- Test environment must have valid AWS credentials
