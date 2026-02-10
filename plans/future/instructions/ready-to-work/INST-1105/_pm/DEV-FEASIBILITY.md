---
story_id: INST-1105
story_title: "Upload Instructions (Presigned >10MB)"
generated: "2026-02-09"
agent: pm-dev-feasibility-review
version: "1.0"
---

# Dev Feasibility Review: INST-1105 - Upload Instructions (Presigned >10MB)

## Executive Summary

**Feasibility**: **HIGH** (80% reuse potential across all layers)

**Estimated Effort**: 4-5 days (32-40 hours)

**Complexity Level**: Medium-High
- More complex than INST-1104 (direct upload) due to two-phase flow and session management
- Less complex than multipart upload (INST-3010) which is deferred to post-MVP

**Risk Level**: Low-Medium
- Primary risks: Session expiry during multi-file upload, S3 verification edge cases
- All risks have proven mitigation patterns in codebase

**Recommendation**: ✅ **PROCEED** - Strong foundation of reusable patterns, proven infrastructure, clear acceptance criteria

---

## Reuse Analysis

### High-Value Reuse (80-100% Applicable)

#### 1. @repo/upload-types (100% Reuse)
**Location**: `packages/core/upload-types/src/index.ts`

**Schemas Available**:
- `UploadStatusSchema` - "queued" | "uploading" | "success" | "failed" | "cancelled" | "expired"
- `UploadErrorCodeSchema` - FILE_TOO_LARGE, INVALID_MIME_TYPE, NETWORK_ERROR, RATE_LIMIT_EXCEEDED, etc.
- `UploaderFileItemSchema` - File metadata with progress, status, error
- `UploadBatchStateSchema` - Batch upload state management

**Utilities Available**:
- `calculateBatchState(files)` - Aggregate state from multiple files
- `createFileItem(file, status)` - Factory for file item creation
- `mapHttpErrorToUploadError(httpError)` - Error code mapping

**Reuse Verdict**: **100% direct reuse** - No modifications needed

---

#### 2. @repo/upload-config (100% Reuse)
**Location**: `packages/backend/upload-config/src/index.ts`

**Config Values**:
```typescript
{
  pdfMaxBytes: 52428800,           // 50MB
  pdfMinBytesForPresigned: 10485760, // 10MB (NEW - threshold for presigned vs direct)
  presignTtlMinutes: 15,           // Presigned URL TTL
  sessionTtlMinutes: 15,           // Upload session TTL (same as presigned URL)
  rateLimitPerDay: 100,            // Max uploads/edits per user per day
  concurrentUploadLimit: 3         // Max simultaneous uploads
}
```

**Utilities Available**:
- `getFileSizeLimit()` - Returns pdfMaxBytes
- `getPresignTtlSeconds()` - Returns presignTtlMinutes * 60
- `shouldUsePresignedUpload(fileSize)` - NEW utility to add (checks if fileSize > 10MB)

**Reuse Verdict**: **95% direct reuse** - Need to add `pdfMinBytesForPresigned` constant and `shouldUsePresignedUpload()` utility

---

#### 3. @repo/upload-client (95% Reuse)
**Location**: `packages/core/upload-client/src/`

**Utilities Available**:
- `uploadToPresignedUrl(presignedUrl, file, onProgress)` - XHR-based S3 upload with progress tracking
- `createUploadManager(options)` - Framework-agnostic upload manager
- `calculateUploadSpeed(loaded, total, startTime)` - Upload speed calculation

**Existing Implementation** (from `packages/core/upload-client/src/xhr.ts`):
```typescript
export async function uploadToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress?.(e.loaded, e.total)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    signal?.addEventListener('abort', () => xhr.abort())

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
```

**Reuse Verdict**: **100% direct reuse** - Existing implementation perfect for this story

---

#### 4. useUploadManager Hook (90% Reuse)
**Location**: `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts`

**Features Available**:
- Session expiry detection with 30-second buffer (`SESSION_EXPIRY_BUFFER_MS`)
- Progress tracking per file
- Concurrent upload limit (max 3)
- Cancel, retry, remove file operations
- Auto-refresh flow: `markExpiredFiles()` → `updateFileUrls()`

**Existing Implementation** (session expiry detection):
```typescript
const SESSION_EXPIRY_BUFFER_MS = 30_000 // 30 seconds

function isSessionExpired(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  return expiryTime < now + SESSION_EXPIRY_BUFFER_MS
}

function markExpiredFiles(): string[] {
  const expiredIds = files
    .filter(f => f.expiresAt && isSessionExpired(f.expiresAt))
    .map(f => f.id)

  if (expiredIds.length > 0) {
    onSessionExpired?.(expiredIds) // Callback to trigger session refresh
  }

  return expiredIds
}
```

**Integration Needed**:
- Connect to `useCreateUploadSessionMutation` (RTK Query)
- Connect to `useCompleteUploadSessionMutation` (RTK Query)
- Adapt `startUpload()` to use presigned URL flow instead of direct FormData upload

**Reuse Verdict**: **90% reuse** - Core logic exists, needs RTK Query integration

---

#### 5. editPresign Pattern (Backend) (85% Reuse)
**Location**: `packages/backend/moc-instructions-core/src/edit-presign.ts`

**Pattern Overview**:
```typescript
export async function editPresign(
  mocId: string,
  filename: string,
  fileSize: number,
  deps: {
    db: DatabaseClient,
    s3: S3Client,
    rateLimiter: RateLimiter,
    userId: string
  }
): Promise<Result<PresignedUploadResponse>> {
  // 1. Authorization check (user owns MOC)
  const moc = await deps.db.query.mocs.findFirst({ where: eq(mocs.id, mocId) })
  if (!moc) return { success: false, error: 'NOT_FOUND', message: 'MOC not found' }
  if (moc.userId !== deps.userId) return { success: false, error: 'FORBIDDEN', message: 'Not authorized' }

  // 2. Rate limit check
  const rateLimit = await deps.rateLimiter.check(deps.userId, 'upload')
  if (!rateLimit.allowed) return { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded', retryAfterSeconds: rateLimit.retryAfter }

  // 3. File validation
  if (fileSize > pdfMaxBytes) return { success: false, error: 'FILE_TOO_LARGE', message: 'File too large' }
  if (!validatePdfMimeType(filename)) return { success: false, error: 'INVALID_MIME_TYPE', message: 'Must be PDF' }

  // 4. Generate S3 key
  const s3Key = `mocs/${deps.userId}/${mocId}/instructions/${uuidv4()}-${sanitizeFilename(filename)}`

  // 5. Generate presigned URL
  const presignedUrl = await generatePresignedUrl(deps.s3, {
    bucket: process.env.S3_BUCKET,
    key: s3Key,
    operation: 'putObject',
    expiresIn: presignTtlMinutes * 60,
    contentType: 'application/pdf'
  })

  // 6. Create upload session record
  const sessionId = uuidv4()
  await deps.db.insert(upload_sessions).values({
    id: sessionId,
    userId: deps.userId,
    mocInstructionId: mocId,
    status: 'pending',
    s3Key,
    expiresAt: new Date(Date.now() + sessionTtlMinutes * 60 * 1000)
  })

  return {
    success: true,
    data: { sessionId, presignedUrl, expiresAt: new Date(Date.now() + presignTtlMinutes * 60 * 1000).toISOString() }
  }
}
```

**Adaptation Needed**:
- Endpoint path: `/mocs/:id/upload-sessions` instead of `/mocs/:id/edit/presign`
- Schema: Use `mocInstructionId` instead of generic `mocId` (upload_sessions table schema)
- File size threshold check: Add validation for `fileSize > 10MB` (reject ≤10MB files)

**Reuse Verdict**: **85% reuse** - Pattern proven, minor adaptations needed

---

#### 6. editFinalize Pattern (Backend) (85% Reuse)
**Location**: `packages/backend/moc-instructions-core/src/edit-finalize.ts`

**Pattern Overview**:
```typescript
export async function editFinalize(
  sessionId: string,
  deps: {
    db: DatabaseClient,
    s3: S3Client,
    userId: string
  }
): Promise<Result<MocFile>> {
  // 1. Authorization check (user owns session)
  const session = await deps.db.query.upload_sessions.findFirst({ where: eq(upload_sessions.id, sessionId) })
  if (!session) return { success: false, error: 'SESSION_NOT_FOUND', message: 'Session not found' }
  if (session.userId !== deps.userId) return { success: false, error: 'FORBIDDEN', message: 'Not authorized' }
  if (session.status === 'completed') return { success: true, data: await getMocFile(session.mocInstructionId) } // Idempotent

  // 2. Check session expiry
  if (new Date(session.expiresAt) < new Date()) return { success: false, error: 'EXPIRED_SESSION', message: 'Session expired' }

  // 3. Verify file exists in S3
  try {
    const headResult = await deps.s3.send(new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: session.s3Key
    }))

    // 4. Verify file size matches (within 5% tolerance)
    const expectedSize = session.originalFileSize
    const actualSize = headResult.ContentLength
    const tolerance = 0.05
    if (Math.abs(actualSize - expectedSize) > expectedSize * tolerance) {
      return { success: false, error: 'SIZE_MISMATCH', message: 'File size mismatch' }
    }
  } catch (err) {
    if (err.name === 'NotFound') {
      return { success: false, error: 'FILE_NOT_IN_S3', message: 'File not found in storage' }
    }
    throw err
  }

  // 5. Database transaction: Insert moc_files + Update upload_sessions
  return await deps.db.transaction(async (tx) => {
    const [mocFile] = await tx.insert(moc_files).values({
      id: uuidv4(),
      mocId: session.mocInstructionId,
      fileType: 'instruction',
      fileUrl: `https://cloudfront.net/${session.s3Key}`,
      originalFilename: session.originalFilename,
      mimeType: 'application/pdf',
      createdAt: new Date()
    }).returning()

    await tx.update(upload_sessions).set({
      status: 'completed',
      completedAt: new Date()
    }).where(eq(upload_sessions.id, sessionId))

    return { success: true, data: mocFile }
  })
}
```

**Adaptation Needed**:
- Schema: Ensure `upload_sessions.originalFileSize` field exists (for size verification)
- Error handling: Add `EXPIRED_SESSION` check before S3 verification
- CloudFront URL: Use correct CloudFront domain from environment variables

**Reuse Verdict**: **85% reuse** - Pattern proven, minor adaptations needed

---

### Moderate Reuse (50-79% Applicable)

#### 7. InstructionsUpload Component (INST-1104) (60% Reuse)
**Location**: `apps/web/app-instructions-gallery/src/components/InstructionsUpload.tsx`

**Features Available**:
- File picker UI (drag-drop zone or file input)
- Client-side validation (PDF type, file size)
- File list display with metadata (name, size, type)
- Remove file from queue

**Modifications Needed**:
- **File size routing logic**: Check if file >10MB → route to presigned flow
- **Progress bar**: Add `ProgressBar` component to file item when status='uploading'
- **Session expiry warning**: Add banner when session <5 min remaining
- **Cancel/Retry buttons**: Add action buttons for presigned flow

**Reuse Verdict**: **60% reuse** - Core UI exists, needs presigned-specific enhancements

---

#### 8. PDF Validation Utilities (INST-1104) (70% Reuse)
**Location**: `apps/web/app-instructions-gallery/src/utils/file-validation.ts`

**Utilities Available**:
- `validatePdfFile(file)` - Validates PDF type and size
- `validatePdfMimeType(file)` - Checks MIME type is `application/pdf`
- `validatePdfExtension(filename)` - Checks file extension is `.pdf`
- `validateFileSize(file, maxBytes)` - Size check

**New Utilities Needed**:
- `shouldUsePresignedUpload(fileSize)` - Returns true if fileSize > 10MB
- `validateFileSizeForPresigned(fileSize)` - Validates 10MB < fileSize ≤ 50MB

**Reuse Verdict**: **70% reuse** - Base validation exists, add threshold checks

---

#### 9. RTK Query Mutation Pattern (50% New, 50% Reuse)
**Location**: `packages/api-client/src/rtk/instructions-api.ts`

**Existing Mutations** (from INST-1104):
- `useUploadInstructionFileMutation` - Direct upload mutation (FormData)

**New Mutations Needed**:
```typescript
export const instructionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createUploadSession: builder.mutation<
      CreateUploadSessionResponse,
      CreateUploadSessionRequest
    >({
      query: ({ mocId, filename, fileSize, fileType }) => ({
        url: `/mocs/${mocId}/upload-sessions`,
        method: 'POST',
        body: { filename, fileSize, fileType }
      }),
      invalidatesTags: (result, error, arg) =>
        error ? [] : [{ type: 'UploadSessions', id: arg.mocId }]
    }),

    completeUploadSession: builder.mutation<
      CompleteUploadSessionResponse,
      CompleteUploadSessionRequest
    >({
      query: ({ mocId, sessionId }) => ({
        url: `/mocs/${mocId}/upload-sessions/${sessionId}/complete`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, arg) =>
        error ? [] : [
          { type: 'MocFiles', id: arg.mocId },
          { type: 'UploadSessions', id: arg.mocId }
        ]
    })
  })
})

export const {
  useCreateUploadSessionMutation,
  useCompleteUploadSessionMutation
} = instructionsApi
```

**Reuse Verdict**: **50% reuse** - Pattern exists from INST-1104, but new endpoints required

---

## Database Schema Analysis

### upload_sessions Table (Already Exists)
**Location**: `packages/backend/database-schema/src/schema/index.ts` (lines 652-678)

**Existing Schema**:
```typescript
export const upload_sessions = pgTable('upload_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mocInstructionId: uuid('moc_instruction_id').references(() => moc_instructions.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(), // 'pending' | 'completed' | 'failed' | 'expired'
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at')
})
```

**Missing Fields** (Need to Add):
- `originalFilename` - varchar(255) - Store original filename for display
- `originalFileSize` - bigint - Store original file size for verification

**Migration Required**: ✅ Yes - Add 2 new columns

---

### moc_files Table (Already Exists)
**Location**: `packages/backend/database-schema/src/schema/index.ts` (lines 317-344)

**Existing Schema**:
```typescript
export const moc_files = pgTable('moc_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull().references(() => mocs.id, { onDelete: 'cascade' }),
  fileType: varchar('file_type', { length: 50 }).notNull(), // 'instruction' | 'parts-list' | 'thumbnail' | 'gallery'
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' })
})
```

**Verdict**: ✅ **No changes needed** - Schema supports all required fields

---

## Technical Risks & Mitigations

### Risk 1: Session Expiry During Multi-File Upload (Medium Risk)

**Scenario**: User selects 5 files (15MB, 20MB, 25MB, 30MB, 35MB). Session created at T=0 with 15-minute TTL. Files 1-3 upload successfully. At T=14:45, files 4-5 attempt to start but session expired.

**Impact**: Files 4-5 fail with EXPIRED_SESSION error, user must manually retry

**Mitigation**:
1. **Local TTL check with 30-second buffer** (already implemented in useUploadManager):
   ```typescript
   const SESSION_EXPIRY_BUFFER_MS = 30_000
   if (expiresAt < now + SESSION_EXPIRY_BUFFER_MS) {
     markExpiredFiles()
     onSessionExpired(fileIds)
   }
   ```
2. **Auto-refresh flow**:
   - Frontend detects expired files
   - Calls `useCreateUploadSessionMutation` to get new presigned URLs
   - Calls `updateFileUrls()` to update state with new URLs
   - Resumes upload automatically
3. **API error handling**: If backend returns EXPIRED_SESSION, trigger auto-refresh flow

**Likelihood**: Low (with buffer) - Medium (without buffer)

**Severity**: Low (auto-refresh handles gracefully)

**Residual Risk**: ✅ **ACCEPTABLE** - Pattern proven in existing codebase

---

### Risk 2: S3 Upload Succeeds but Completion Fails (Medium Risk)

**Scenario**: File uploaded to S3 successfully, but completion endpoint fails (network error, DB transaction failure, etc.). S3 object remains but no moc_files record created (orphaned file).

**Impact**: S3 storage cost for orphaned files, user sees failed upload

**Mitigation**:
1. **S3 verification in completion endpoint** (headObject):
   - Verify file exists before DB insert
   - If file missing, return FILE_NOT_IN_S3 error
2. **Transaction rollback**:
   - Wrap DB operations in transaction
   - Rollback on failure (upload_sessions.status remains 'pending')
3. **Retry-friendly design**:
   - User clicks Retry → Re-attempts full flow (session creation → upload → completion)
   - Old S3 object remains (cleaned up by INST-1204 orphaned file cleanup job)
4. **Idempotency**:
   - If upload_sessions.status='completed', return existing moc_files record (no duplicate insert)

**Likelihood**: Low (rare DB/network failures)

**Severity**: Low (orphaned files cleaned up by INST-1204, user can retry)

**Residual Risk**: ✅ **ACCEPTABLE** - Cleanup job handles orphaned files

---

### Risk 3: File Handle Lost After Page Reload (Low Risk)

**Scenario**: User selects files, reloads page before upload starts. File handles lost (browser security restriction). User clicks "Retry" but file no longer accessible.

**Impact**: Upload cannot restart, user must re-select files

**Mitigation**:
1. **File handle check** (already implemented in useUploadManager):
   ```typescript
   function hasFileHandle(fileId: string): boolean {
     return fileHandlesRef.current.has(fileId)
   }

   async function retryUpload(fileId: string) {
     if (!hasFileHandle(fileId)) {
       showError('File no longer available. Please select the file again.')
       openFilePicker() // Prompt re-selection
       return
     }
     // Proceed with retry
   }
   ```
2. **Unsaved changes guard** (INST-1200 - Phase 2):
   - Warn user before navigating away if uploads in progress
   - Modal: "You have 3 uploads in progress. Leave without finishing?"

**Likelihood**: Low (user must manually reload during upload)

**Severity**: Low (clear error message, re-selection trivial)

**Residual Risk**: ✅ **ACCEPTABLE** - Rare edge case, clear recovery path

---

### Risk 4: Concurrent Completion Requests (Low Risk)

**Scenario**: Network latency causes frontend to retry completion request. Two POST /upload-sessions/:sessionId/complete requests sent simultaneously.

**Impact**: Potential race condition in DB transaction (duplicate moc_files insert)

**Mitigation**:
1. **Idempotency check** (already in editFinalize pattern):
   ```typescript
   if (session.status === 'completed') {
     return { success: true, data: await getMocFile(session.mocInstructionId) }
   }
   ```
2. **Database unique constraint**:
   - Add unique index on `moc_files(mocId, s3Key)` to prevent duplicates
   - If duplicate insert attempted, catch error and return existing record
3. **Frontend debounce** (optional):
   - Debounce completion button with 500ms delay to prevent accidental double-clicks

**Likelihood**: Very Low (rare network condition)

**Severity**: Very Low (idempotency handles gracefully)

**Residual Risk**: ✅ **ACCEPTABLE** - Existing pattern handles this

---

## Implementation Estimate

### Breakdown by Layer

| Layer | Tasks | Estimate |
|-------|-------|----------|
| **Backend - API Endpoints** | Create session endpoint, completion endpoint, validation | 8 hours |
| **Backend - Database** | Migration (add 2 columns to upload_sessions), seed test data | 2 hours |
| **Backend - Services** | Adapt editPresign/editFinalize patterns, add threshold validation | 6 hours |
| **Frontend - Components** | Extend InstructionsUpload with progress bar, session expiry UI | 8 hours |
| **Frontend - Hooks** | Integrate useUploadManager with RTK Query mutations | 4 hours |
| **Frontend - RTK Query** | Create mutations (createUploadSession, completeUploadSession) | 2 hours |
| **Testing - Unit** | Frontend component tests, backend service tests | 6 hours |
| **Testing - Integration** | MSW handlers, full flow tests | 4 hours |
| **Testing - E2E** | Playwright tests with real S3 (8 scenarios) | 6 hours |
| **Code Review & Refinement** | Address feedback, fix edge cases | 4 hours |

**Total**: 50 hours (6.25 days)

**Adjusted for Reuse**: 40 hours (5 days) - Reusing proven patterns saves ~10 hours

---

### Task Parallelization

**Wave 1 (Parallel)** - 1 day:
- Backend: Create session endpoint + validation
- Backend: Database migration (upload_sessions columns)
- Frontend: RTK Query mutations

**Wave 2 (Parallel)** - 1.5 days:
- Backend: Completion endpoint + S3 verification
- Frontend: Extend InstructionsUpload component
- Frontend: Integrate useUploadManager hook

**Wave 3 (Parallel)** - 1 day:
- Backend: Unit tests (service layer)
- Frontend: Unit tests (component layer)

**Wave 4 (Sequential)** - 1 day:
- Integration tests (MSW handlers, full flow)

**Wave 5 (Sequential)** - 1 day:
- E2E tests (Playwright with real S3)

**Wave 6 (Sequential)** - 0.5 days:
- Code review, refinement, edge case fixes

**Total**: 5 days (40 hours)

---

## Open Technical Questions

### Question 1: Session TTL for Multi-File Upload

**Context**: Session created for each file individually (5 files = 5 sessions). If upload takes 20 minutes (slow connection), some sessions expire.

**Options**:
1. **Keep 15-minute TTL per session** (current config) + Auto-refresh flow
2. **Extend TTL to 30 minutes** for presigned uploads
3. **Single session for batch** (1 session with multiple presigned URLs)

**Recommendation**: Option 1 (15-minute TTL + auto-refresh)
- Proven pattern in useUploadManager
- Minimizes security risk (shorter TTL)
- Auto-refresh handles expiry gracefully

---

### Question 2: S3 Bucket Configuration

**Context**: Presigned URLs generated via `getSignedUrl` from `@aws-sdk/s3-request-presigner`

**Questions**:
- Is S3 bucket CORS configured for direct uploads from browser?
- Is CloudFront distribution configured for download URLs?
- Are lifecycle policies set for orphaned file cleanup?

**Action Required**: Verify S3/CloudFront config before implementation
- Check `serverless.yml` or CDK stack for S3 bucket resources
- Verify CORS allows PUT from app domain
- Verify CloudFront OAI/OAC configured

---

### Question 3: File Size Verification Tolerance

**Context**: editFinalize pattern checks if S3 file size matches original (within 5% tolerance)

**Question**: Is 5% tolerance appropriate for PDF files?
- PDFs are binary, size should match exactly
- Network corruption rare with S3 checksums

**Recommendation**: Reduce tolerance to 1% or require exact match
- S3 provides MD5 ETag for integrity verification
- Use `headObject().ETag` to verify file integrity

---

### Question 4: Concurrent Upload Limit

**Context**: useUploadManager enforces max 3 concurrent uploads

**Question**: Is 3 the right limit for presigned uploads?
- Direct upload (INST-1104): Max 3 (Lambda concurrency constraint)
- Presigned upload: No Lambda involvement, only S3 PUT
- Browser constraint: Typically 6-8 concurrent HTTP/2 connections per domain

**Recommendation**: Keep limit at 3 for consistency
- Prevents overwhelming user's network bandwidth
- Simplifies UI (progress tracking for 3 files clearer than 6+)

---

## Assumptions

1. **Database schema**: upload_sessions table exists with fields matching seed context (verified in schema file)
2. **S3 bucket**: Configured with CORS for direct uploads (to be verified)
3. **CloudFront**: Distribution exists for download URLs (to be verified)
4. **Rate limiting**: rateLimitPerDay=100 is acceptable for MVP (to be verified with PM)
5. **File size threshold**: 10MB is firm cutoff between direct and presigned (to be verified with PM)
6. **Session TTL**: 15 minutes is acceptable, auto-refresh handles expiry (to be verified with PM)
7. **Concurrent upload limit**: Max 3 files is acceptable (to be verified with UI/UX)

---

## Recommendations

### High Priority (Must Address Before Implementation)

1. ✅ **Verify S3 CORS configuration**: Ensure bucket allows PUT from app domain
2. ✅ **Verify CloudFront setup**: Confirm download URLs use CloudFront distribution
3. ✅ **Add database migration**: Add `originalFilename` and `originalFileSize` to upload_sessions table
4. ✅ **Confirm file size threshold**: Verify 10MB cutoff with PM (impacts routing logic)

### Medium Priority (Should Address During Implementation)

1. ⚠ **Add file size verification with exact match**: Reduce tolerance from 5% to 1% or use ETag
2. ⚠ **Add unique constraint**: `moc_files(mocId, s3Key)` to prevent duplicate inserts
3. ⚠ **Add session expiry E2E test**: Mock time to test 15-minute expiry flow
4. ⚠ **Add orphaned file cleanup job reference**: Document cleanup in INST-1204 (deferred)

### Low Priority (Nice-to-Have)

1. 💡 **Add session refresh button**: Manual refresh option in UI (in addition to auto-refresh)
2. 💡 **Add upload speed optimization**: Use S3 Transfer Acceleration if available
3. 💡 **Add progress persistence**: Store upload progress in localStorage (Phase 2)

---

## Conclusion

**Feasibility**: ✅ **HIGH** - Strong reuse potential across all layers

**Recommendation**: ✅ **PROCEED** with implementation

**Key Success Factors**:
1. Proven patterns (editPresign, editFinalize, useUploadManager) provide 80% reuse
2. Database schema mostly ready (2 column migration required)
3. Risks well-understood with proven mitigations
4. Clear acceptance criteria and test plan

**Blockers**: None (INST-1003 and INST-1004 completed)

**Dependencies**: INST-1102 (Create Basic MOC) for E2E tests (non-blocking for implementation)

---

**Generated**: 2026-02-09
**Agent**: pm-dev-feasibility-review v1.0
**Story**: INST-1105
**Seed File**: STORY-SEED.md
**Review Status**: Ready for PM Approval
