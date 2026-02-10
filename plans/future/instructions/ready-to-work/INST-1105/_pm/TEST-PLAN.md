---
story_id: INST-1105
story_title: "Upload Instructions (Presigned >10MB)"
generated: "2026-02-09"
agent: pm-draft-test-plan
version: "1.0"
---

# Test Plan: INST-1105 - Upload Instructions (Presigned >10MB)

## Overview

This test plan covers the presigned URL upload flow for instruction PDFs between 10MB and 50MB. The flow involves three phases: session creation, direct S3 upload with progress tracking, and completion verification.

**Key Testing Challenges:**
1. Session expiry handling during multi-file upload
2. Progress tracking and cancellation during S3 upload
3. S3 verification in completion endpoint (headObject)
4. Multi-file concurrent upload (max 3 simultaneous)
5. Real S3 integration in E2E tests per ADR-006

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Frontend Components | 80% | Progress UI, session expiry handling |
| Backend Services | 90% | Session creation, completion, S3 verification |
| Upload Session State Machine | 95% | Critical path: pending → uploading → completed |
| Integration (Full Flow) | 85% | Session creation → S3 upload → completion |
| E2E (Real S3) | 100% happy path | ADR-006 requirement |

---

## Test Categories

### Category 1: Happy Path Tests (Session Creation)

**Test 1.1: Create upload session for valid PDF >10MB**
- **Given**: User authenticated, MOC exists, file metadata valid (25MB PDF)
- **When**: POST /api/v2/mocs/:id/upload-sessions with { filename: "instructions.pdf", fileSize: 26214400, fileType: "application/pdf" }
- **Then**:
  - Response 201 with { sessionId, presignedUrl, expiresAt }
  - upload_sessions record created with status='pending'
  - presignedUrl is valid S3 PUT URL
  - expiresAt is current time + 15 minutes
- **Verification**: Query upload_sessions table, validate presignedUrl signature

**Test 1.2: Multiple concurrent session creation**
- **Given**: User selects 3 PDFs (15MB, 20MB, 30MB)
- **When**: Create 3 sessions in parallel
- **Then**: All 3 sessions created successfully with unique sessionIds and presignedUrls
- **Verification**: 3 upload_sessions records exist, all with status='pending'

**Test 1.3: Session creation after INST-1104 direct upload**
- **Given**: User uploaded 8MB PDF via direct upload (INST-1104)
- **When**: User uploads 35MB PDF via presigned flow
- **Then**: Session created successfully, no interference with direct upload path
- **Verification**: Both moc_files records exist with correct metadata

---

### Category 2: Happy Path Tests (S3 Upload with Progress)

**Test 2.1: Direct S3 upload with progress tracking**
- **Given**: Valid presigned URL from session creation
- **When**: Upload 20MB PDF to S3 using uploadToPresignedUrl (XHR)
- **Then**:
  - Progress events fire at intervals (0%, 25%, 50%, 75%, 100%)
  - Upload completes successfully (S3 200 OK)
  - File verified in S3 bucket via headObject
- **Verification**: Mock XHR progress events, verify callbacks invoked

**Test 2.2: Concurrent uploads (3 files)**
- **Given**: 3 presigned URLs for 3 files
- **When**: Start all 3 uploads concurrently via useUploadManager
- **Then**:
  - Max 3 uploads in progress simultaneously
  - Each file tracks progress independently
  - All 3 complete successfully
- **Verification**: useUploadManager state shows 3 files with status='success'

**Test 2.3: Upload speed calculation**
- **Given**: Uploading 25MB file over 10 seconds
- **When**: Progress events fire during upload
- **Then**: Upload speed displayed as "2.5 MB/s"
- **Verification**: calculateUploadSpeed utility returns correct value

---

### Category 3: Happy Path Tests (Completion & Finalization)

**Test 3.1: Complete upload session after S3 success**
- **Given**: File uploaded to S3, sessionId available
- **When**: POST /api/v2/mocs/:id/upload-sessions/:sessionId/complete
- **Then**:
  - Backend verifies file exists in S3 (headObject)
  - upload_sessions.status updated to 'completed'
  - moc_files record created with fileType='instruction'
  - Response 200 with created file metadata (includes CloudFront URL)
- **Verification**: Query moc_files table, verify CloudFront URL accessible

**Test 3.2: Complete multiple sessions in sequence**
- **Given**: 3 files uploaded to S3, 3 sessionIds
- **When**: Complete all 3 sessions sequentially
- **Then**:
  - All 3 upload_sessions updated to 'completed'
  - 3 moc_files records created
  - RTK Query cache invalidated, file list refreshed
- **Verification**: Frontend displays all 3 files immediately

**Test 3.3: File appears in instructions list after completion**
- **Given**: Upload session completed successfully
- **When**: Frontend cache invalidated via RTK Query tag
- **Then**:
  - File appears in instructions list on detail page
  - Download button available
  - File metadata (name, size, uploadedAt) displayed correctly
- **Verification**: E2E assertion - file visible in DOM

---

### Category 4: Error Cases (Session Creation)

**Test 4.1: Reject file ≤10MB (should use direct upload)**
- **Given**: User selects 8MB PDF
- **When**: Attempt POST /api/v2/mocs/:id/upload-sessions with fileSize=8388608
- **Then**:
  - Response 400 with error code FILE_TOO_SMALL
  - Message: "Use direct upload for files ≤10MB"
- **Verification**: No upload_sessions record created

**Test 4.2: Reject file >50MB**
- **Given**: User selects 60MB PDF
- **When**: Attempt session creation with fileSize=62914560
- **Then**:
  - Response 400 with error code FILE_TOO_LARGE
  - Message: "File too large. Max 50MB."
- **Verification**: Client validation should catch this before API call

**Test 4.3: Reject invalid MIME type (not application/pdf)**
- **Given**: User attempts to upload 25MB image as instruction
- **When**: POST /upload-sessions with fileType="image/jpeg"
- **Then**:
  - Response 400 with error code INVALID_MIME_TYPE
  - Message: "Instructions must be PDF files"
- **Verification**: validatePdfMimeType() utility called

**Test 4.4: Unauthorized user (403)**
- **Given**: User not authenticated
- **When**: Attempt session creation
- **Then**: Response 401 Unauthorized
- **Verification**: Auth middleware blocks request

**Test 4.5: User does not own MOC (403)**
- **Given**: User authenticated but MOC belongs to another user
- **When**: POST /mocs/:id/upload-sessions
- **Then**:
  - Response 403 with error code FORBIDDEN
  - Message: "You don't have permission to upload to this MOC"
- **Verification**: Authorization check in backend service

**Test 4.6: Rate limit exceeded (429)**
- **Given**: User created 100 sessions today (rateLimitPerDay)
- **When**: Attempt 101st session creation
- **Then**:
  - Response 429 with Retry-After header
  - Error code RATE_LIMIT_EXCEEDED
  - Message: "Upload limit reached. Try again tomorrow."
- **Verification**: Rate limit middleware enforced

**Test 4.7: MOC not found (404)**
- **Given**: Invalid mocId in URL
- **When**: POST /mocs/invalid-id/upload-sessions
- **Then**: Response 404 with error code MOC_NOT_FOUND
- **Verification**: MOC lookup fails

---

### Category 5: Error Cases (S3 Upload)

**Test 5.1: Network error during S3 upload**
- **Given**: Upload in progress at 50%
- **When**: Network disconnected (simulated XHR error)
- **Then**:
  - Upload state changes to 'failed'
  - Error message: "Upload failed. Check your connection."
  - Retry button displayed
- **Verification**: useUploadManager onError callback invoked

**Test 5.2: S3 presigned URL expired during upload**
- **Given**: Presigned URL valid for 15 minutes, upload takes 20 minutes (slow connection)
- **When**: S3 PUT request sent after expiry
- **Then**:
  - S3 returns 403 Forbidden (expired signature)
  - Frontend detects expired session
  - Auto-refresh flow triggered: Create new session, get new URL, resume upload
- **Verification**: SESSION_EXPIRY_BUFFER_MS check prevents late retries

**Test 5.3: Cancel upload mid-progress**
- **Given**: Upload at 60% progress
- **When**: User clicks Cancel button
- **Then**:
  - XHR request aborted
  - Upload state changes to 'cancelled'
  - File removed from queue
  - S3 object may be partially uploaded (cleanup handled by INST-1204)
- **Verification**: xhr.abort() called, onCancel callback invoked

**Test 5.4: S3 upload fails with 500 error**
- **Given**: Valid presigned URL
- **When**: S3 returns 500 Internal Server Error
- **Then**:
  - Upload state changes to 'failed'
  - Error message: "Upload failed. Please try again."
  - Retry button available
- **Verification**: Error logged to CloudWatch

**Test 5.5: File handle lost after page reload**
- **Given**: User selects files but reloads page before upload starts
- **When**: Attempt to retry upload
- **Then**:
  - hasFileHandle() check returns false
  - Error message: "File no longer available. Please select the file again."
  - File picker reopened
- **Verification**: fileHandlesRef check in useUploadManager

---

### Category 6: Error Cases (Completion)

**Test 6.1: File not found in S3 during completion**
- **Given**: Upload failed but frontend calls completion endpoint
- **When**: POST /upload-sessions/:sessionId/complete
- **Then**:
  - Backend headObject returns 404
  - Response 400 with error code FILE_NOT_IN_S3
  - Message: "File not found in storage. Please retry upload."
  - upload_sessions.status remains 'pending'
- **Verification**: headObject mock returns NotFound

**Test 6.2: File size mismatch (corruption)**
- **Given**: Original fileSize 25MB, but S3 object is 15MB (upload truncated)
- **When**: Completion endpoint verifies file
- **Then**:
  - Response 400 with error code SIZE_MISMATCH
  - Message: "File size doesn't match. Please upload again."
  - upload_sessions.status updated to 'failed'
- **Verification**: headObject ContentLength compared to original fileSize

**Test 6.3: Session already completed (idempotency)**
- **Given**: upload_sessions.status = 'completed'
- **When**: Client retries completion endpoint
- **Then**:
  - Response 200 with existing moc_files record (idempotent)
  - No duplicate moc_files record created
- **Verification**: Transaction skipped, existing record returned

**Test 6.4: Session not found (invalid sessionId)**
- **Given**: Invalid sessionId in URL
- **When**: POST /upload-sessions/invalid-id/complete
- **Then**: Response 404 with error code SESSION_NOT_FOUND
- **Verification**: Session lookup fails

**Test 6.5: User does not own session (403)**
- **Given**: Session belongs to another user
- **When**: Attempt to complete session
- **Then**: Response 403 with error code FORBIDDEN
- **Verification**: Authorization check on session.userId

**Test 6.6: Database transaction failure**
- **Given**: S3 file verified successfully
- **When**: moc_files insert fails (DB connection error)
- **Then**:
  - Transaction rolled back
  - upload_sessions.status remains 'pending'
  - Response 500 with error code DATABASE_ERROR
  - S3 object remains (cleaned up by INST-1204)
- **Verification**: Transaction rollback, error logged

---

### Category 7: Edge Cases (Session Expiry Handling)

**Test 7.1: Local TTL check prevents expired upload**
- **Given**: Session created at T=0, TTL=15min, current time T=14:45
- **When**: User attempts to start upload (30-second buffer applies)
- **Then**:
  - Local TTL check detects expiry: expiresAt < (now + 30s)
  - Error message: "Session expired. Refreshing..."
  - Auto-refresh flow triggered: markExpiredFiles() → Create new sessions → updateFileUrls()
- **Verification**: SESSION_EXPIRY_BUFFER_MS = 30000 applied

**Test 7.2: API returns EXPIRED_SESSION error**
- **Given**: Local TTL check passed but session actually expired (clock drift)
- **When**: S3 upload or completion endpoint called
- **Then**:
  - API returns 400 with error code EXPIRED_SESSION
  - Frontend triggers auto-refresh flow
  - New session created, upload resumes
- **Verification**: onSessionExpired callback invoked

**Test 7.3: Auto-refresh flow for 3 expired files**
- **Given**: 3 files queued, all sessions expired
- **When**: markExpiredFiles() called
- **Then**:
  - All 3 files marked as expired
  - onSessionExpired callback invoked with 3 file IDs
  - 3 new sessions created via createUploadSession mutation
  - updateFileUrls() updates state with new presignedUrls
  - All 3 uploads resume automatically
- **Verification**: useUploadManager state transitions correctly

**Test 7.4: Partial expiry (2 of 5 files expired)**
- **Given**: 5 files uploading, 2 sessions expired, 3 still valid
- **When**: Local TTL check runs during upload
- **Then**:
  - 2 expired files paused, sessions refreshed
  - 3 valid files continue uploading without interruption
  - All 5 files complete successfully
- **Verification**: Independent session tracking per file

**Test 7.5: Session expires after S3 upload but before completion**
- **Given**: File uploaded to S3 at T=14:50, session expires at T=15:00, completion called at T=15:05
- **When**: POST /upload-sessions/:sessionId/complete
- **Then**:
  - Backend checks session.expiresAt, determines expired
  - Response 400 with error code EXPIRED_SESSION
  - Frontend creates new session (not new S3 upload)
  - Completion retried with new sessionId, same S3 key
- **Verification**: Orphaned S3 object cleaned up by INST-1204

**Test 7.6: Session expiry warning displayed (5 minutes remaining)**
- **Given**: Session created at T=0, current time T=10:00 (5 minutes remaining)
- **When**: Frontend checks TTL
- **Then**:
  - Warning message: "Upload session expires in 5 minutes"
  - Status color changes to warning (yellow/orange)
- **Verification**: TTL countdown displayed in UI

---

### Category 8: Edge Cases (Multi-file Upload)

**Test 8.1: Upload 10 files with max 3 concurrent**
- **Given**: User selects 10 PDFs (all >10MB)
- **When**: Start all uploads via useUploadManager
- **Then**:
  - First 3 files start immediately
  - Files 4-10 queued
  - As each file completes, next queued file starts
  - All 10 complete successfully
- **Verification**: concurrentLimit = 3 enforced

**Test 8.2: Mixed file sizes (5 files: 5MB, 15MB, 25MB, 35MB, 45MB)**
- **Given**: User selects 5 files with varying sizes
- **When**: Upload batch started
- **Then**:
  - 5MB file uses direct upload (INST-1104)
  - 15MB, 25MB, 35MB, 45MB use presigned upload
  - All 5 complete successfully
  - All appear in instructions list
- **Verification**: File size routing logic correct

**Test 8.3: Retry failed file without affecting others**
- **Given**: 5 files uploading, file #3 fails at 70%
- **When**: User clicks Retry on file #3
- **Then**:
  - File #3 restarts from 0%
  - Files #1, #2, #4, #5 continue without interruption
  - All 5 complete successfully
- **Verification**: Independent retry per file

**Test 8.4: Cancel one file, others continue**
- **Given**: 5 files uploading
- **When**: User cancels file #2
- **Then**:
  - File #2 removed from queue, XHR aborted
  - Files #1, #3, #4, #5 continue uploading
  - 4 files complete successfully
- **Verification**: Cancellation isolated to single file

**Test 8.5: Upload batch with duplicate filenames**
- **Given**: User selects 2 files both named "instructions.pdf" (different content)
- **When**: Upload both files
- **Then**:
  - S3 keys include sessionId prefix: mocs/{userId}/{mocId}/instructions/{sessionId1}-instructions.pdf, {sessionId2}-instructions.pdf
  - Both files stored successfully
  - Both appear in instructions list with originalFilename
- **Verification**: Filename sanitization preserves uniqueness

**Test 8.6: Maximum file count (10 files)**
- **Given**: User attempts to upload 11 instruction files
- **When**: Select 11th file
- **Then**:
  - Client validation: "Maximum 10 instruction files per MOC"
  - 11th file rejected
- **Verification**: Frontend enforces max count (if applicable)

---

### Category 9: Integration Tests (Frontend + MSW)

**Test 9.1: Full flow with MSW handlers**
- **Given**: MSW handlers for POST /upload-sessions and POST /upload-sessions/:sessionId/complete
- **When**: User uploads 20MB PDF
- **Then**:
  1. createUploadSession mutation called → MSW returns mock presignedUrl
  2. uploadToPresignedUrl called → MSW mocks S3 PUT (success)
  3. completeUploadSession mutation called → MSW returns moc_files record
  4. RTK Query cache invalidated
  5. File appears in instructions list
- **Verification**: All MSW handlers invoked in sequence

**Test 9.2: Session creation error handling**
- **Given**: MSW returns 429 Rate Limit Exceeded
- **When**: Create session
- **Then**:
  - Error toast: "Upload limit reached. Try again tomorrow."
  - Retry button disabled
- **Verification**: mapHttpErrorToUploadError utility maps 429 to RATE_LIMIT_EXCEEDED

**Test 9.3: S3 upload error handling (MSW mock failure)**
- **Given**: MSW mocks S3 PUT with 500 error
- **When**: Upload to presigned URL
- **Then**:
  - Upload state: 'failed'
  - Error message: "Upload failed. Please try again."
  - Retry button enabled
- **Verification**: XHR error handler invoked

**Test 9.4: Completion error (FILE_NOT_IN_S3)**
- **Given**: MSW completion handler returns 400 FILE_NOT_IN_S3
- **When**: Complete session
- **Then**:
  - Error message: "File not found in storage. Please retry upload."
  - Retry button re-attempts full flow (session creation + upload + completion)
- **Verification**: Error code mapped to user-friendly message

**Test 9.5: Cache invalidation after successful upload**
- **Given**: MOC detail page open, instructions list empty
- **When**: Upload completes successfully
- **Then**:
  - RTK Query invalidates 'MocFiles' tag
  - useGetMocFilesQuery refetches
  - New file appears immediately
- **Verification**: Network tab shows GET /mocs/:id/files refetch

---

### Category 10: E2E Tests (Playwright + Cucumber - Real S3)

**Feature File**: `apps/web/playwright/features/instructions/inst-1105-upload-presigned.feature`

**Test 10.1: Upload 30MB PDF via presigned URL (happy path)**
```gherkin
Scenario: Upload large PDF via presigned URL
  Given user authenticated and on MOC detail page
  When user clicks "Add Instructions" button
  And selects 30MB PDF file "castle-instructions.pdf"
  Then presigned upload flow triggered
  And progress bar displays "Uploading... 0%"
  When upload progresses
  Then progress bar updates to 50%, then 100%
  And status displays "Uploading... 2.5 MB/s"
  When upload completes
  Then success toast: "Instructions uploaded!"
  And file "castle-instructions.pdf" appears in instructions list
  And download button enabled
```

**Test 10.2: Progress bar updates during upload**
```gherkin
Scenario: Progress bar updates in real-time
  Given presigned upload in progress
  When upload reaches 25%
  Then progress bar aria-valuenow="25"
  And status text: "Uploading... 25%"
  When upload reaches 75%
  Then progress bar aria-valuenow="75"
  And status text: "Uploading... 75%"
```

**Test 10.3: Reject 60MB PDF (too large)**
```gherkin
Scenario: Reject oversized file
  Given user on MOC detail page
  When user selects 60MB PDF file
  Then error message: "File too large. Max 50MB."
  And file not added to queue
  And upload does not start
```

**Test 10.4: Cancel upload mid-progress**
```gherkin
Scenario: Cancel upload
  Given presigned upload in progress at 40%
  When user clicks Cancel button
  Then confirmation modal: "Cancel upload?"
  When user confirms cancellation
  Then upload aborted
  And file removed from queue
  And status: "Upload cancelled"
```

**Test 10.5: Retry failed upload**
```gherkin
Scenario: Retry after network error
  Given upload failed at 60% due to network error
  When user clicks Retry button
  Then new presigned session created
  And upload restarts from 0%
  When upload completes
  Then file uploaded successfully
```

**Test 10.6: Session expiry auto-refresh flow**
```gherkin
Scenario: Session expiry during upload
  Given session created at T=0 with 15-minute TTL
  And current time T=14:45 (within 30-second buffer)
  When user attempts to start upload
  Then warning: "Session expired. Refreshing..."
  And new session created automatically
  And upload starts with new presigned URL
```

**Test 10.7: Upload multiple large files (3 concurrent)**
```gherkin
Scenario: Upload 5 large PDFs
  Given user selects 5 PDFs (15MB, 20MB, 25MB, 30MB, 35MB)
  When user starts upload
  Then first 3 files start immediately
  And files 4-5 queued
  When file 1 completes
  Then file 4 starts
  When all uploads complete
  Then all 5 files appear in instructions list
```

**Test 10.8: Mix direct and presigned uploads**
```gherkin
Scenario: Upload batch with mixed file sizes
  Given user selects 3 PDFs (8MB, 15MB, 40MB)
  When user starts upload
  Then 8MB file uses direct upload (INST-1104)
  And 15MB, 40MB files use presigned upload
  When all uploads complete
  Then all 3 files appear in instructions list
```

---

## Testing Infrastructure

### Frontend Test Setup

**Unit Tests (Vitest + React Testing Library)**
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/PresignedUpload.test.tsx`
- Setup:
  - Mock useUploadManager hook
  - Mock RTK Query mutations (useCreateUploadSessionMutation, useCompleteUploadSessionMutation)
  - Mock @repo/upload-client uploadToPresignedUrl
- Utilities:
  - createMockFile(size, name, type) - Generate File objects
  - mockProgressEvent(loaded, total) - Simulate XHR progress

**Integration Tests (Vitest + MSW)**
- Location: `apps/web/app-instructions-gallery/src/components/__tests__/PresignedUpload.integration.test.tsx`
- MSW Handlers:
  ```typescript
  http.post('/api/v2/mocs/:mocId/upload-sessions', () => {
    return HttpResponse.json({
      sessionId: 'session-123',
      presignedUrl: 'https://bucket.s3.amazonaws.com/key?signature=...',
      expiresAt: new Date(Date.now() + 900000).toISOString()
    }, { status: 201 })
  })

  http.put('https://bucket.s3.amazonaws.com/*', () => {
    return new HttpResponse(null, { status: 200 })
  })

  http.post('/api/v2/mocs/:mocId/upload-sessions/:sessionId/complete', () => {
    return HttpResponse.json({
      id: 'file-456',
      mocId: 'moc-789',
      fileType: 'instruction',
      fileUrl: 'https://cloudfront.net/key',
      originalFilename: 'instructions.pdf',
      createdAt: new Date().toISOString()
    }, { status: 200 })
  })
  ```

### Backend Test Setup

**Unit Tests (Vitest)**
- Location: `apps/api/lego-api/domains/mocs/application/__tests__/upload-session.test.ts`
- Test Services:
  - `createUploadSession()`
  - `completeUploadSession()`
  - `validatePresignedUploadRequest()`
- Mocks:
  - S3 client (getSignedUrl, headObject)
  - Database client (insert, update, query)
  - Rate limit service

**Integration Tests (Vitest + Test Database)**
- Location: `apps/api/lego-api/domains/mocs/__tests__/upload-session.integration.test.ts`
- Setup:
  - Test database with upload_sessions, moc_files tables
  - Mock S3 client (no real AWS calls)
  - Real transaction logic
- Test Cases:
  - Full flow: session creation → completion
  - Transaction rollback on failure
  - Idempotency (duplicate completion calls)

### E2E Test Setup (Playwright)

**Configuration**
- Feature Files: `apps/web/playwright/features/instructions/inst-1105-*.feature`
- Step Definitions: `apps/web/playwright/step-definitions/instructions/upload-presigned.steps.ts`
- Fixtures:
  - Authenticated user with test MOC
  - Real S3 bucket (test environment)
  - CloudFront distribution for downloads

**Test Data**
- PDF files in `apps/web/playwright/fixtures/pdfs/`:
  - `test-15mb.pdf` (15,728,640 bytes)
  - `test-30mb.pdf` (31,457,280 bytes)
  - `test-60mb.pdf` (62,914,560 bytes) - for rejection test
- Generate dynamically: `generatePdf(sizeInBytes)`

**Page Objects**
- `MocDetailPage` - File upload section, instructions list
- `PresignedUploadComponent` - Progress bar, cancel button, retry button
- `FileListItem` - Download button, remove button

---

## Test Execution Order

### Phase 1: Unit Tests (2 days)
1. Frontend: PresignedUpload component tests
2. Frontend: useUploadManager hook tests
3. Backend: validatePresignedUploadRequest tests
4. Backend: createUploadSession service tests
5. Backend: completeUploadSession service tests

### Phase 2: Integration Tests (2 days)
1. Frontend: MSW handlers for session creation
2. Frontend: MSW handlers for S3 upload (mocked)
3. Frontend: MSW handlers for completion
4. Frontend: Cache invalidation tests
5. Backend: Full flow with test database
6. Backend: Transaction rollback tests

### Phase 3: E2E Tests (2 days)
1. Happy path: Upload 30MB PDF (Test 10.1)
2. Progress tracking (Test 10.2)
3. File size validation (Test 10.3)
4. Cancellation (Test 10.4)
5. Retry (Test 10.5)
6. Session expiry (Test 10.6)
7. Multi-file upload (Test 10.7)
8. Mixed file sizes (Test 10.8)

---

## Success Criteria

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] All E2E tests pass (8/8 scenarios)
- [ ] Frontend coverage ≥80%
- [ ] Backend coverage ≥90%
- [ ] Upload session state machine coverage ≥95%
- [ ] Real S3 presigned URL flow tested in E2E (ADR-006 compliant)
- [ ] Session expiry handling verified (local TTL + API error)
- [ ] Progress tracking verified in E2E (visual regression)
- [ ] Multi-file concurrent upload verified (max 3 simultaneous)

---

## Known Limitations

1. **S3 upload mocking in integration tests**: MSW cannot fully replicate S3 behavior (multipart, chunking). E2E tests with real S3 are required for full validation.
2. **Session expiry timing**: E2E tests cannot wait 15 minutes for real expiry. Use mock time manipulation or reduce TTL in test environment.
3. **Large file generation**: 50MB test files may slow CI/CD. Use compressed fixtures or generate on-demand.
4. **Orphaned S3 objects**: Cleanup tested in INST-1204, not this story.

---

**Generated**: 2026-02-09
**Agent**: pm-draft-test-plan v1.0
**Story**: INST-1105
**Seed File**: STORY-SEED.md
**Review Status**: Ready for QA Specialist Review
