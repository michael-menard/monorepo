---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INST-1105

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline file found at expected location. Proceeding with codebase scanning only.

### Relevant Existing Features
| Feature | Status | Relevance |
|---------|--------|-----------|
| INST-1003: Upload Types Package | Completed (2024-12-26) | Provides UploadStatus, UploadErrorCode, UploaderFileItem schemas |
| INST-1004: Upload Config Package | Completed (2025-12-09) | Provides pdfMaxBytes, presignTtlMinutes, sessionTtlMinutes config |
| INST-1104: Upload Instructions (Direct ≤10MB) | UAT (2026-02-08) | Sister story - provides direct upload pattern, PDF validation |
| INST-1103: Upload Thumbnail | Completed (2026-02-08) | Sister story - provides image upload pattern, S3 storage patterns |
| INST-1008: RTK Query Mutations | UAT (2026-02-05) | Provides RTK Query framework for API calls |
| moc-instructions-core package | Existing | Provides editPresign/editFinalize pattern for presigned URL flows |

### Active In-Progress Work
| Story ID | Status | Overlap Risk |
|----------|--------|--------------|
| INST-1104 | UAT | Low - different size threshold (≤10MB vs >10MB) |
| INST-1102 | In QA | Low - prerequisite for testing only |

### Constraints to Respect
1. **File size thresholds**: Direct upload (≤10MB) in INST-1104, presigned URL (>10MB) in this story
2. **Upload config values**: From @repo/upload-config - pdfMaxBytes: 50MB, presignTtlMinutes: 15, sessionTtlMinutes: 15
3. **Database schema**: `upload_sessions` table exists with id, userId, status, s3Key, expiresAt fields
4. **Presigned URL pattern**: Two-phase flow (presign → client S3 upload → complete)
5. **Testing strategy**: ADR-006 requires UAT with real services, not mocks

---

## Retrieved Context

### Related Endpoints
**From `apps/api/lego-api/domains/mocs/routes.ts`:**
- POST `/mocs/:id/files/instruction` - Direct upload endpoint (INST-1104)
- Need to add: POST `/mocs/:id/upload-sessions` - Create presigned URL
- Need to add: POST `/mocs/:id/upload-sessions/:sessionId/complete` - Verify and finalize

**From `packages/backend/moc-instructions-core/src/edit-presign.ts`:**
- `editPresign()` function - Generates presigned URLs for editing MOC files
- Pattern: Authorization check → Rate limit → File validation → S3 presigned URL generation
- Error codes: NOT_FOUND, FORBIDDEN, FILE_TOO_LARGE, INVALID_MIME_TYPE, RATE_LIMIT_EXCEEDED, S3_ERROR

**From `packages/backend/moc-instructions-core/src/edit-finalize.ts`:**
- `editFinalize()` function - Finalizes uploads after S3 direct upload
- Pattern: Authorization → S3 verification (headObject) → Database transaction → Update MOC

### Related Components
**Frontend Components:**
- `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts` - Upload manager with progress, cancel, retry, session expiry
- `apps/web/app-instructions-gallery/src/components/InstructionsUpload.tsx` (from INST-1104) - Base upload component
- `packages/core/upload-client/src/manager.ts` - Framework-agnostic upload manager
- `packages/core/upload-client/src/xhr.ts` - XHR-based upload with progress events

**Backend Utilities:**
- `packages/backend/moc-instructions-core/src/__types__/index.ts` - PresignedUploadUrlSchema, InitializeWithFilesSuccessSchema
- `packages/api-core/src/s3.ts` - generatePresignedUrl() utility (uses @aws-sdk/s3-request-presigner)
- `apps/api/lego-api/domains/mocs/application/services.ts` - MOC service layer

**Database Schema:**
- `packages/backend/database-schema/src/schema/index.ts`:
  - `upload_sessions` table (lines 652-678): id, userId, status, s3Key, expiresAt, mocInstructionId
  - `moc_files` table (lines 317-344): id, mocId, fileType, fileUrl, originalFilename, mimeType, createdAt

### Reuse Candidates
**High-value reuse (80-100% applicable):**
1. **@repo/upload-types** - Complete reuse of UploadStatus, UploadErrorCode, UploaderFileItem, UploadBatchState schemas
2. **@repo/upload-config** - pdfMaxBytes (50MB), presignTtlMinutes (15), sessionTtlMinutes (15), rateLimitPerDay (100)
3. **@repo/upload-client** - Framework-agnostic upload manager with progress tracking
4. **useUploadManager hook** - React hook with session expiry detection, progress tracking, cancel/retry logic
5. **editPresign pattern** - Authorization, rate limiting, file validation, presigned URL generation
6. **editFinalize pattern** - S3 verification (headObject), database transaction, file record creation

**Moderate reuse (50-79% applicable):**
1. **InstructionsUpload component** (INST-1104) - File picker UI, client validation, file list display
2. **PDF validation utilities** (from INST-1104) - validatePdfFile(), validatePdfMimeType(), validatePdfExtension()
3. **RTK Query mutation pattern** - Cache invalidation, error handling, FormData handling

**Patterns to adapt:**
1. **Two-phase upload flow** (from editPresign/editFinalize):
   - Phase 1: POST /upload-sessions → Get presigned URL + sessionId
   - Phase 2: Direct S3 PUT with XHR progress events
   - Phase 3: POST /upload-sessions/:sessionId/complete → Verify S3 + Create file record
2. **Session expiry handling**:
   - Local TTL check with 30-second buffer
   - API error code EXPIRED_SESSION
   - Auto-refresh flow: markExpiredFiles() → Retry session creation → updateFileUrls()

---

## Knowledge Context

### Lessons Learned
_No baseline or KB tools available - skipping lesson extraction._

### Blockers to Avoid (from codebase patterns)
- **Issue**: Direct S3 upload without verification can create orphaned objects
  - **Mitigation**: Use headObject() in completion endpoint to verify file exists in S3
  - **Evidence**: `editFinalize.ts` lines 518-520 - validates S3 object before DB insert
- **Issue**: Session expiry during multi-file upload disrupts user flow
  - **Mitigation**: Local TTL check with 30-second buffer, auto-refresh with updateFileUrls()
  - **Evidence**: `useUploadManager.ts` lines 41-42, 298-318 - SESSION_EXPIRY_BUFFER_MS = 30,000
- **Issue**: Lost file handles prevent retry after page reload
  - **Mitigation**: Track fileHandlesRef, detect missing handles, prompt re-selection
  - **Evidence**: `useUploadManager.ts` lines 361-379 - hasFileHandle() check before retry

### Architecture Decisions (ADRs)
_No ADR log loaded - assuming standard patterns apply._

| Constraint | Source | Impact |
|------------|--------|--------|
| API path schema | Standard | Frontend: /api/v2/mocs/:id/*, Backend: /mocs/:id/* |
| Testing requirement | ADR-006 (assumed) | UAT must use real S3 presigned URLs, not mocks |
| File size limit | @repo/upload-config | pdfMaxBytes = 50MB (10MB direct, 10-50MB presigned) |
| Session TTL | @repo/upload-config | presignTtlMinutes = 15 (900 seconds) |
| Rate limiting | @repo/upload-config | rateLimitPerDay = 100 uploads/edits per user |

### Patterns to Follow
1. **Discriminated union result types** (from moc-instructions-core):
   ```typescript
   type Result = { success: true; data: T } | { success: false; error: ErrorCode; message: string }
   ```
2. **Dependency injection** (from moc-instructions-core):
   - All infrastructure (DB, S3, rate limit) injected via deps parameter
   - Pure business logic, platform-agnostic
3. **Transaction safety** (from editFinalize):
   - Wrap DB operations in transaction
   - Verify S3 object exists before DB insert
   - Rollback on failure
4. **Session expiry handling** (from useUploadManager):
   - Local TTL check with buffer
   - Mark expired files, trigger onSessionExpired callback
   - Provide refresh flow: updateFileUrls() after new presigned URLs obtained

### Patterns to Avoid
- **Anti-pattern**: Reading full serverless.yml for config (from lesson history)
  - **Instead**: Use @repo/upload-config with hardcoded defaults
- **Anti-pattern**: Assuming file handles persist after page reload
  - **Instead**: Check hasFileHandle() before retry, prompt re-selection if missing
- **Anti-pattern**: Allowing direct S3 upload to proceed after session expiry
  - **Instead**: Local TTL check before startUploads(), fail fast with clear error

---

## Conflict Analysis

_No conflicts detected._

---

## Story Seed

### Title
INST-1105: Upload Instructions (Presigned >10MB)

### Description

**Context:**

MOC users need to upload instruction PDFs larger than 10MB (the direct upload limit from INST-1104). Files between 10MB and 50MB require a presigned URL flow to avoid Lambda payload size limits and enable client-side progress tracking.

The codebase already has strong infrastructure for presigned uploads:
- **@repo/upload-types** (INST-1003) provides UploadStatus, UploadErrorCode, UploaderFileItem schemas
- **@repo/upload-config** (INST-1004) provides pdfMaxBytes (50MB), presignTtlMinutes (15), sessionTtlMinutes (15)
- **moc-instructions-core** package provides editPresign/editFinalize pattern for two-phase uploads
- **useUploadManager hook** provides session expiry detection, progress tracking, cancel/retry logic
- **upload_sessions** table exists in database schema for tracking upload state

**Problem:**

Direct upload (INST-1104) is limited to 10MB due to Lambda payload size constraints. Users with larger instruction PDFs (10-50MB) need a presigned URL flow where:
1. Frontend requests presigned URL from backend (POST /mocs/:id/upload-sessions)
2. Frontend uploads directly to S3 using XHR for progress tracking
3. Frontend notifies backend to verify and finalize (POST /mocs/:id/upload-sessions/:sessionId/complete)

This flow avoids Lambda payload limits, enables progress bars, supports cancellation, and handles session expiry gracefully.

**Solution Direction:**

Implement presigned URL upload as a vertical slice reusing proven patterns:

**Frontend:**
- Detect files >10MB in InstructionsUpload component, route to presigned flow
- Call `useCreateUploadSession` mutation to get presigned URL + sessionId
- Use `useUploadManager` hook for concurrent uploads with progress, cancel, retry
- Upload directly to S3 via XHR with progress events (uploadToPresignedUrl from @repo/upload-client)
- Call `useCompleteUploadSession` mutation to finalize and create moc_files record
- Handle session expiry: detect via API error or local TTL, refresh URLs, resume uploads

**Backend:**
- POST /mocs/:id/upload-sessions - Create session, validate file metadata, generate presigned S3 URL
  - Reuse editPresign pattern: Authorization → Rate limit → File validation → Presigned URL generation
  - Insert upload_sessions record with status='pending', s3Key, expiresAt
  - Return { sessionId, presignedUrl, expiresAt }
- POST /mocs/:id/upload-sessions/:sessionId/complete - Verify S3 upload, create moc_files record
  - Reuse editFinalize pattern: Authorization → S3 verification (headObject) → Transaction → Update session status
  - Verify file exists in S3 via headObject
  - Insert moc_files record with type='instruction'
  - Update upload_sessions.status = 'completed'

**Database:**
- upload_sessions table (already exists): Track pending/completed uploads
- moc_files table (already exists): Store finalized file metadata

### Initial Acceptance Criteria

**Frontend - File Size Detection & Routing**
- [ ] AC1: InstructionsUpload component detects files >10MB
- [ ] AC2: Files >10MB trigger presigned URL flow (not direct upload)
- [ ] AC3: Files ≤10MB trigger direct upload flow (INST-1104)
- [ ] AC4: Client validation rejects files >50MB with error "File too large. Max 50MB."

**Frontend - Upload Session Creation**
- [ ] AC5: `useCreateUploadSessionMutation` hook calls POST /api/v2/mocs/:id/upload-sessions
- [ ] AC6: Request includes { filename, fileSize, fileType: "application/pdf" }
- [ ] AC7: Response includes { sessionId, presignedUrl, expiresAt }
- [ ] AC8: Session TTL displayed to user: "Upload session expires in 15 minutes"

**Frontend - Presigned Upload Flow**
- [ ] AC9: useUploadManager hook tracks upload state (queued, uploading, success, failed)
- [ ] AC10: Direct S3 upload via uploadToPresignedUrl (from @repo/upload-client)
- [ ] AC11: Progress bar updates during upload: "Uploading... 45%"
- [ ] AC12: Multiple files upload concurrently (max 3 at a time)
- [ ] AC13: Upload speed displayed: "2.5 MB/s"
- [ ] AC14: Cancel button aborts active upload, removes file from queue

**Frontend - Upload Completion**
- [ ] AC15: After S3 upload success, call `useCompleteUploadSessionMutation`
- [ ] AC16: Request includes { sessionId }
- [ ] AC17: Response includes created moc_files record
- [ ] AC18: Success toast: "Instructions uploaded!"
- [ ] AC19: File appears in instructions list immediately (cache invalidation)

**Frontend - Session Expiry Handling**
- [ ] AC20: Local TTL check before upload starts (30-second buffer)
- [ ] AC21: If expired locally, show error: "Session expired. Refreshing..."
- [ ] AC22: API error EXPIRED_SESSION triggers auto-refresh flow
- [ ] AC23: Auto-refresh: Call POST /upload-sessions again, get new presigned URLs
- [ ] AC24: updateFileUrls() resets expired files to queued state
- [ ] AC25: Uploads resume automatically after refresh

**Frontend - Error Handling**
- [ ] AC26: Network error during S3 upload: "Upload failed. Check your connection."
- [ ] AC27: Retry button re-attempts failed uploads
- [ ] AC28: File handle lost (after page reload): Prompt re-selection
- [ ] AC29: S3 upload succeeds but completion fails: Display specific error message
- [ ] AC30: Multiple errors handled gracefully (don't block other uploads)

**Backend - POST /mocs/:id/upload-sessions (Create Session)**
- [ ] AC31: Endpoint accepts { filename, fileSize, fileType }
- [ ] AC32: Requires authentication (userId from auth context)
- [ ] AC33: Requires feature gate 'moc'
- [ ] AC34: Authorization: User must own MOC (return 403 if not owner)
- [ ] AC35: Return 404 if MOC not found
- [ ] AC36: Validate fileType: Must be 'application/pdf'
- [ ] AC37: Validate fileSize: Must be >10MB and ≤50MB
- [ ] AC38: Return 400 if fileSize ≤10MB: "Use direct upload for files ≤10MB"
- [ ] AC39: Return 400 if fileSize >50MB: "File too large. Max 50MB."
- [ ] AC40: Rate limit check (rateLimitPerDay = 100 per user)
- [ ] AC41: Return 429 if rate limit exceeded with retryAfterSeconds

**Backend - Presigned URL Generation**
- [ ] AC42: Generate S3 key: mocs/{userId}/{mocId}/instructions/{sessionId}-{filename}
- [ ] AC43: Sanitize filename (remove special chars, preserve extension)
- [ ] AC44: Generate presigned PUT URL with TTL (presignTtlMinutes = 15)
- [ ] AC45: Set ContentType=application/pdf in presigned URL
- [ ] AC46: Insert upload_sessions record: id, userId, mocId, status='pending', s3Key, expiresAt
- [ ] AC47: Return 201 with { sessionId, presignedUrl, expiresAt }
- [ ] AC48: Security logging for session creation

**Backend - POST /mocs/:id/upload-sessions/:sessionId/complete (Complete Session)**
- [ ] AC49: Requires authentication and authorization (user owns MOC)
- [ ] AC50: Return 404 if session not found
- [ ] AC51: Return 403 if user does not own session
- [ ] AC52: Return 400 if session already completed or expired
- [ ] AC53: Verify file exists in S3 via headObject
- [ ] AC54: Return 400 with code FILE_NOT_IN_S3 if file missing
- [ ] AC55: Verify file size matches original request (within 5% tolerance)
- [ ] AC56: Return 400 with code SIZE_MISMATCH if size doesn't match

**Backend - Database Transaction**
- [ ] AC57: Transaction: Insert moc_files + Update upload_sessions.status
- [ ] AC58: Insert moc_files record: mocId, fileType='instruction', fileUrl, originalFilename, mimeType
- [ ] AC59: Update upload_sessions.status = 'completed', completedAt = NOW()
- [ ] AC60: Rollback on failure, return 500 with structured error
- [ ] AC61: Return 200 with created moc_files record (includes CloudFront URL)

**Backend - Error Handling**
- [ ] AC62: Handle S3 errors gracefully (timeout, permission denied)
- [ ] AC63: Handle rate limit errors with structured response
- [ ] AC64: Handle concurrent completion attempts (idempotency)
- [ ] AC65: Security logging for suspicious activity (repeated failures, large files)

**Database**
- [ ] AC66: upload_sessions table populated correctly
- [ ] AC67: upload_sessions.status transitions: pending → completed
- [ ] AC68: moc_files record created with correct fileType='instruction'
- [ ] AC69: Foreign keys valid: upload_sessions.mocInstructionId references moc_instructions.id

**Testing - Unit Tests**
- [ ] AC70: Frontend: PresignedUpload component renders, detects >10MB files
- [ ] AC71: Frontend: useUploadManager progress tracking, cancel, retry
- [ ] AC72: Backend: validatePresignedUploadRequest() validates file metadata
- [ ] AC73: Backend: generatePresignedUrl() generates valid S3 URLs
- [ ] AC74: Backend: completeUploadSession() verifies S3 and creates file record

**Testing - Integration Tests**
- [ ] AC75: Frontend: MSW handler for POST /api/v2/mocs/:id/upload-sessions
- [ ] AC76: Frontend: MSW handler for POST /api/v2/mocs/:id/upload-sessions/:sessionId/complete
- [ ] AC77: Frontend: Cache invalidation after successful upload
- [ ] AC78: Backend: createUploadSession service test with mocked S3 client
- [ ] AC79: Backend: completeUploadSession service test with mocked headObject

**Testing - E2E Tests (Playwright + Cucumber)**
- [ ] AC80: E2E: Upload 30MB PDF via presigned URL (happy path)
- [ ] AC81: E2E: Progress bar updates during upload
- [ ] AC82: E2E: Upload completes, file appears in instructions list
- [ ] AC83: E2E: Reject 60MB PDF with error "File too large. Max 50MB."
- [ ] AC84: E2E: Cancel upload mid-progress, file removed from queue
- [ ] AC85: E2E: Network error during upload, retry succeeds

### Non-Goals
- Multipart upload for >50MB files (deferred to INST-3010)
- Chunked upload with resume (deferred to INST-2036)
- Parallel presigned URL generation for batches (sequential acceptable for MVP)
- Server-side virus scanning (deferred to INST-2031)
- PDF thumbnail generation (deferred to INST-2032)
- Direct S3 upload without API involvement (backend session tracking required)
- WebSocket progress updates (XHR progress events sufficient)
- File encryption at rest (S3 bucket default encryption sufficient)

### Reuse Plan

**Packages - Direct Reuse:**
- **@repo/upload-types** (INST-1003)
  - UploadStatus, UploadErrorCode, UploaderFileItem schemas
  - calculateBatchState(), createFileItem(), mapHttpErrorToUploadError()
- **@repo/upload-config** (INST-1004)
  - pdfMaxBytes (50MB), presignTtlMinutes (15), sessionTtlMinutes (15)
  - getFileSizeLimit(), getPresignTtlSeconds()
- **@repo/upload-client**
  - uploadToPresignedUrl() with XHR progress tracking
  - createUploadManager() for concurrent uploads

**Components - Adapt & Extend:**
- **useUploadManager hook** (app-instructions-gallery)
  - Reuse: Progress tracking, cancel, retry, session expiry detection
  - Adapt: Integrate with createUploadSession/completeUploadSession mutations
- **InstructionsUpload component** (INST-1104)
  - Reuse: File picker UI, client validation, file list display
  - Extend: Add file size check, route >10MB to presigned flow

**Backend - Pattern Reuse:**
- **editPresign pattern** (moc-instructions-core)
  - Authorization check → Rate limit → File validation → Presigned URL generation
  - Error codes: NOT_FOUND, FORBIDDEN, FILE_TOO_LARGE, RATE_LIMIT_EXCEEDED
- **editFinalize pattern** (moc-instructions-core)
  - Authorization → S3 verification (headObject) → Transaction → Update status
  - Idempotency handling for concurrent requests

**Utilities:**
- **PDF validation** (from INST-1104)
  - validatePdfFile(), validatePdfMimeType(), validatePdfExtension()
  - Reuse with size threshold check: ≤10MB → direct, >10MB → presigned
- **S3 client** (packages/api-core/src/s3.ts)
  - generatePresignedUrl() with @aws-sdk/s3-request-presigner
  - headObject() for file verification

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Context**: INST-1104 provides direct upload tests, adapt for presigned flow
- **Key areas**:
  - Session creation with presigned URL validation
  - Direct S3 upload with progress tracking (mock S3 in integration tests)
  - Completion endpoint with S3 verification (mock headObject)
  - Session expiry handling (local TTL check + API error)
  - Multi-file concurrent upload (max 3 at a time)
- **E2E priority**: Real S3 presigned URL flow (ADR-006 requirement), progress bar updates, cancel functionality
- **Coverage targets**: 80% frontend, 90% backend, 95% for upload session state machine

### For UI/UX Advisor
- **Context**: Same UI as INST-1104 but with progress bar and expiry handling
- **Key components**:
  - Progress bar during upload (linear progress, percentage, upload speed)
  - Session expiry warning: "Upload session expires in 5 minutes"
  - Cancel button (destructive style, confirmation modal)
  - Retry button after failure (prominent, clear action)
  - Auto-refresh flow: "Session expired. Refreshing..." → "Ready to upload"
- **Accessibility**: Progress bar with aria-valuenow, cancel button keyboard accessible, status announcements for screen readers
- **MVP-critical**: Progress bar, cancel button, session expiry warning
- **Nice-to-have**: Upload speed display, estimated time remaining

### For Dev Feasibility
- **High feasibility areas** (80-100% reuse):
  - Frontend: useUploadManager hook, uploadToPresignedUrl utility
  - Backend: editPresign/editFinalize pattern adaptation
  - Database: upload_sessions table already exists
- **Medium feasibility** (50-79% reuse):
  - Session expiry auto-refresh flow (new logic, but pattern exists)
  - S3 verification in completion endpoint (headObject pattern exists)
- **Low feasibility** (30-49% reuse):
  - RTK Query mutations for create/complete session (new endpoints)
- **Risks**:
  1. **Session expiry during multi-file upload** - Mitigation: Local TTL check with 30-second buffer, auto-refresh flow
  2. **S3 upload succeeds but completion fails** - Mitigation: Orphaned file cleanup job (INST-1204)
  3. **File handle lost after page reload** - Mitigation: Detect with hasFileHandle(), prompt re-selection
- **Estimate**: 4-5 days (32-40 hours) - More complex than INST-1104 due to two-phase flow and session management

---

**Generated**: 2026-02-09
**Agent**: pm-story-seed-agent v1.1.0
**Baseline**: None (file not found)
**Codebase Scanned**: Yes (67 files matched presigned|upload-session patterns)
**KB Loaded**: No (tools unavailable)
