---
status: needs-split
split_from: STORY-017
split_part: 1 of 2
---

# STORY-0171: Session & File Management (CRUD)

## Split Context

This story is part of a split from STORY-017.
- **Original Story:** STORY-017 (Image Uploads - Phase 3: Multipart Sessions)
- **Split Reason:** Story exceeded sizing thresholds with 8 ACs, 5 endpoints, and significant backend complexity. Split separates session management infrastructure from binary upload handling.
- **This Part:** 1 of 2 (Z=1)
- **Dependency:** No dependencies

## Title

Migrate Multipart Upload Session Management Endpoints to Vercel

## Context

This story is part of the Vercel migration initiative and represents the first phase of migrating multipart upload session functionality. The multipart upload session flow enables uploading large MOC instruction files (PDFs up to 50MB) via chunked uploads with server-side coordination.

This story focuses on establishing the session infrastructure: creating upload sessions, registering files within sessions, and completing file uploads. It does NOT handle binary part uploads (STORY-0172).

The AWS Lambda implementation already exists and is production-tested. This story migrates that implementation to Vercel while preserving identical API contracts and behavior.

## Goal

Migrate session creation, file registration, and file completion endpoints from AWS Lambda to Vercel serverless functions while maintaining full API compatibility and identical behavior.

## Non-Goals

- Binary part upload handling (STORY-0172)
- Session finalization and MOC creation (STORY-0172)
- Creating new UI for upload progress (existing frontend already uses these APIs)
- Adding new upload features not present in AWS implementation
- Implementing S3 lifecycle policies or cleanup jobs (STORY-018)
- Migrating WebSocket notifications (STORY-019)
- Creating a shared core package for multipart logic (follow-up refactor)

## Scope

### Endpoints (3 total)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/mocs/uploads/sessions` | Create upload session |
| POST | `/api/mocs/uploads/sessions/:sessionId/files` | Register file within session |
| POST | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` | Complete file upload |

### Packages/Apps Affected

**Create:**
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts`
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts`
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts`

**Modify:**
- `apps/api/platforms/vercel/vercel.json` (route rewrites)
- `__http__/` (add test file)

### Database Tables (No Schema Changes)

Existing tables used:
- `upload_sessions` - Session state, TTL, finalization state
- `upload_session_files` - Files with S3 keys and multipart upload IDs
- `upload_session_parts` - Part ETags for multipart completion (referenced but not modified in this story)

## Acceptance Criteria

### AC-1: Create Session Endpoint
- [ ] `POST /api/mocs/uploads/sessions` accepts `{ files: FileMetadata[] }` body
- [ ] Returns `201 Created` with `{ sessionId, partSizeBytes, expiresAt }`
- [ ] Validates files array has at least one instruction file
- [ ] Validates file size limits per category (PDF: 50MB, image: 10MB, parts-list: 5MB)
- [ ] Validates MIME types per category
- [ ] Enforces rate limit before DB write (daily limit via `@repo/rate-limit`)
- [ ] Returns `429` with `nextAllowedAt` when rate limited
- [ ] Returns `401` when unauthenticated

### AC-2: Register File Endpoint
- [ ] `POST /api/mocs/uploads/sessions/:sessionId/files` accepts file metadata
- [ ] Returns `201 Created` with `{ fileId, uploadId }`
- [ ] Validates session exists, belongs to user, is active, not expired
- [ ] Initiates S3 multipart upload via `CreateMultipartUploadCommand`
- [ ] Creates record in `upload_session_files` table
- [ ] Returns `404` for non-existent or other user's session
- [ ] Returns `400` for expired or non-active session

### AC-4: Complete File Endpoint
- [ ] `POST /api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` accepts `{ parts: [{partNumber, etag}] }`
- [ ] Returns `200 OK` with `{ fileId, fileUrl }`
- [ ] Validates part count matches uploaded parts in DB
- [ ] Calls S3 `CompleteMultipartUploadCommand`
- [ ] Updates file status to `completed` with `fileUrl`
- [ ] Returns `400` for part count mismatch or already-completed file

### AC-6: Authentication (All Endpoints)
- [ ] All endpoints require authentication
- [ ] Local development uses `AUTH_BYPASS=true` with `DEV_USER_SUB`
- [ ] Returns `401 UNAUTHORIZED` when no auth token provided

### AC-7: Vercel Function Configuration
- [ ] Function timeout configured appropriately for S3 operations
- [ ] Routes added to `vercel.json` for all 3 endpoints

## Reuse Plan

### Existing Packages to Use

| Package | Purpose |
|---------|---------|
| `@repo/rate-limit` | Daily rate limiting for session creation |
| `@repo/logger` | Structured logging |

### Existing Core Code to Reference

| Path | Purpose |
|------|---------|
| `apps/api/platforms/aws/endpoints/moc-uploads/sessions/_shared/schemas.ts` | Zod schemas for all request/response types |
| `apps/api/core/config/upload.ts` | Upload configuration (size limits, TTLs, MIME types) |
| `apps/api/core/rate-limit/postgres-store.ts` | Postgres-backed rate limit store |

### Patterns to Follow

- Singleton DB client pattern from STORY-015/016 Vercel handlers
- Singleton S3 client pattern from STORY-015/016 Vercel handlers
- Inline schema definitions (matching STORY-015/016 pattern)
- `mapErrorToStatus()` helper for error code -> HTTP status mapping

### No New Shared Packages Created

Per reuse-first principle, inline logic in Vercel handlers. Core package extraction is a follow-up refactor.

## Architecture Notes (Ports & Adapters)

### Port Interfaces

**Session Service Port:**
- `createSession(userId, files) -> { sessionId, partSizeBytes, expiresAt }`
- `getSession(sessionId) -> Session | null`
- `validateSessionOwnership(sessionId, userId) -> boolean`

**File Service Port:**
- `registerFile(sessionId, fileMetadata) -> { fileId, uploadId }`
- `completeFile(fileId, parts) -> { fileUrl }`

### Adapter Responsibilities

**Database Adapter (Drizzle):**
- Query `upload_sessions`, `upload_session_files` tables
- Insert/update records atomically
- Enforce unique constraints (session-file)

**S3 Adapter:**
- `CreateMultipartUploadCommand` - initiate upload
- `CompleteMultipartUploadCommand` - finalize file

## Required Vercel / Infra Notes

### Route Rewrites

```json
// vercel.json (rewrites section)
[
  { "source": "/api/mocs/uploads/sessions", "destination": "/api/mocs/uploads/sessions/index" },
  { "source": "/api/mocs/uploads/sessions/:sessionId/files", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/index" },
  { "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete" }
]
```

### Environment Variables Required

- `DATABASE_URL` - PostgreSQL connection string
- `AWS_ACCESS_KEY_ID` - S3 access
- `AWS_SECRET_ACCESS_KEY` - S3 secret
- `AWS_REGION` - S3 region (default: us-east-1)
- `MOC_BUCKET` or `LEGO_API_BUCKET_NAME` - S3 bucket for uploads
- `AUTH_BYPASS` - Local dev auth bypass (true/false)
- `DEV_USER_SUB` - Dev user ID when AUTH_BYPASS=true

## HTTP Contract Plan

### Required `.http` Requests

All requests are defined in `__http__/story-0171-session-management.http`:

| Request | Test ID | Description |
|---------|---------|-------------|
| `createSessionSingleFile` | CS-HP-001 | Create session with single instruction file |
| `createSessionAllTypes` | CS-HP-004 | Create session with all file types |
| `registerFile` | RF-HP-001 | Register instruction PDF file |
| `completeFile` | CF-HP-001 | Complete single-part upload |

### Error Case Requests

| Request | Test ID | Expected Status |
|---------|---------|-----------------|
| Empty files array | CS-VAL-003 | 422 |
| No instruction file | CS-VAL-004 | 400 |
| File too large | CS-LIM-001 | 413 |
| Invalid MIME type | CS-LIM-006 | 415 |
| Non-existent session | RF-PATH-003 | 404 |
| Part count mismatch | CF-VAL-007 | 400 |

### Required Evidence

Captured in proof document:
- All happy path requests with 2xx responses
- Representative error cases (401, 400, 404, 413, 415, 422, 429)
- Database queries showing records created in `upload_sessions` and `upload_session_files` tables
- S3 console or CLI showing multipart upload IDs created

## Seed Requirements

### Test Data for Error Cases

The following should be seeded for testing edge cases:

```sql
-- Expired session for testing RF-STATE-004
INSERT INTO upload_sessions (id, user_id, status, part_size_bytes, expires_at, created_at, updated_at)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'dev-user-00000000-0000-0000-0000-000000000001',
  'active',
  5242880,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

-- Other user's session for auth testing (RF-AUTH-002)
INSERT INTO upload_sessions (id, user_id, status, part_size_bytes, expires_at, created_at, updated_at)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'other-user-99999999-9999-9999-9999-999999999999',
  'active',
  5242880,
  NOW() + INTERVAL '15 minutes',
  NOW(),
  NOW()
);
```

### Seed Location

Add to `apps/api/core/database/seeds/story-0171.ts` and register in seed index.

### Requirements

- Deterministic: Uses fixed UUIDs
- Idempotent: Use upsert or delete-then-insert pattern

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| Endpoint | Test ID | Description | Expected |
|----------|---------|-------------|----------|
| Create Session | CS-HP-001 | Single instruction file | 201, sessionId returned |
| Create Session | CS-HP-004 | All file types | 201, session created |
| Register File | RF-HP-001 | Instruction PDF | 201, fileId + uploadId |
| Complete File | CF-HP-001 | Single-part upload | 200, fileId + fileUrl |

### Error Cases

| Category | Test ID | Condition | Status | Code |
|----------|---------|-----------|--------|------|
| Auth | CS-AUTH-001 | Missing auth header | 401 | UNAUTHORIZED |
| Validation | CS-VAL-003 | Empty files array | 422 | VALIDATION_ERROR |
| Validation | CS-VAL-004 | No instruction file | 400 | BAD_REQUEST |
| Limit | CS-LIM-001 | Instruction >50MB | 413 | BAD_REQUEST |
| Limit | CS-LIM-006 | Invalid MIME type | 415 | BAD_REQUEST |
| Rate | CS-RL-001 | Daily limit exceeded | 429 | TOO_MANY_REQUESTS |
| State | RF-STATE-004 | Session expired | 400 | BAD_REQUEST |
| Path | RF-PATH-003 | Session not found | 404 | NOT_FOUND |
| State | CF-STATE-004 | File already completed | 400 | BAD_REQUEST |

### Evidence Requirements

Per-endpoint proof:
- [ ] Happy path request/response screenshot
- [ ] At least 3 error case screenshots per endpoint
- [ ] Database state verification (query results)
- [ ] S3 verification (multipart upload IDs)

---

## Risks / Edge Cases

### Risks

1. **Session Expiration:** Sessions expire after TTL. Client must handle 400 errors and re-create sessions.
2. **S3 Multipart Coordination:** Multipart upload IDs must be tracked correctly. Incomplete uploads create orphaned parts (cleanup in STORY-018).
3. **Rate Limiting:** Daily limits prevent abuse. Client must handle 429 responses with `nextAllowedAt`.
4. **Concurrent File Registration:** Multiple files can be registered concurrently. Database unique constraints prevent duplicates.

### Edge Cases

- **Re-complete same file:** Returns 400 if already completed
- **Session ownership validation:** All endpoints verify session belongs to authenticated user
- **Part count mismatch:** Complete endpoint validates parts count matches uploaded parts

---

## Token Budget

| Phase | Agent | Input (est) | Output (est) |
|-------|-------|-------------|--------------|
| PM: Story Split | PM | ~15K | ~8K |
| **PM Total** | — | **~15K** | **~8K** |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap1_session_cleanup | Session cleanup timing not specified | **Add as AC** | Story defers cleanup to STORY-018, but doesn't specify what happens to orphaned sessions. Clarify that sessions with status="active" and expiresAt < NOW will be cleaned by STORY-018. |
| gap2_part_size_docs | Part size configuration justification missing | **Add as AC** | Story uses `partSizeBytes: 5242880` (5MB) but doesn't explain why. AWS Lambda has max file size of 6MB, but this is for Vercel. Document that 5MB is S3's minimum multipart size. |
| gap3_concurrent_registration | Concurrent file registration within same session | **Add as AC** | Story mentions "concurrent file registration" as edge case but doesn't specify behavior. Database unique constraints prevent duplicates, but what about race conditions? Recommend explicit test case for concurrent POST to same session. |
| gap4_complete_idempotency | Complete file idempotency | **Add as AC** | AC-4 says "Returns 400 for already-completed file" but doesn't specify if this is error or idempotent success. Recommend clarifying: should complete be idempotent (200 with existing fileUrl) or reject (400)? |
| gap5_session_expiration | Session expiration window edge case | **Add as AC** | If a session expires DURING a multipart upload (between register and complete), what happens? Client gets 400 on complete. Should story document a recommended client retry strategy or minimum session TTL buffer? |
| gap6_mime_validation | MIME type validation timing | **Add as AC** | Story validates MIME type at session creation (AC-1) but S3 doesn't enforce it. Client could upload different content type. Document that MIME validation is advisory and real validation happens at finalize (STORY-0172). |
| gap7_file_count_limits | File count limits at session level | **Add as AC** | Story validates file counts at session creation, but doesn't prevent registering MORE files than declared. Should `upload_session_files` count be validated against session metadata? Or is this enforced at finalize? |
| gap8_rate_limit_bypass | Rate limit bypass for testing | **Add as AC** | Story specifies `AUTH_BYPASS=true` for local auth but doesn't mention rate limit bypass. Recommend adding `RATE_LIMIT_BYPASS=true` env var for local testing or document how to reset rate limits via SQL. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh1_websocket_progress | Progress tracking hooks | **Add as AC** | Session creation could return a WebSocket connection URL for real-time upload progress. Out of scope for this story (depends on STORY-019) but would be a killer feature. |
| enh2_presigned_urls | Presigned URL generation for parts | **Add as AC** | Story makes client call "register file" then "upload part" separately. Enhancement: register file could return presigned URLs for ALL parts upfront, reducing round trips. Trade-off: large sessions = large response payload. |
| enh3_client_sdk | Client SDK generation | **Add as AC** | `.http` file could be used to generate TypeScript SDK with `openapi-generator`. Low effort, high DX value. |
| enh4_session_analytics | Session analytics | **Add as AC** | Track session success rate (completed / created), average upload time, common failure points. Add to observability without blocking this story. |
| enh5_duplicate_detection | Duplicate file detection | **Add as AC** | Before creating session, check if user has already uploaded identical files (by size + hash). Prevents wasted uploads. Requires file hash in metadata (breaking change). |
| enh6_auto_session_extend | Automatic session extension | **Add as AC** | If client is actively uploading, auto-extend expiresAt. Prevents timeout failures on large uploads over slow connections. Adds complexity to state management. |
| enh7_batch_registration | Batch file registration | **Add as AC** | Instead of POST per file, allow `POST /sessions/:id/files/batch` with array. Reduces API calls for multi-file sessions. Trade-off: more complex error handling (partial success). |
| enh8_upload_resume | Upload resume capability | **Add as AC** | Store uploaded part ETags in `upload_session_parts` to enable resume after network failure. Story already has the table but doesn't use it in STORY-0171. Full resume requires STORY-0172 integration. |

### Follow-up Stories Suggested

- [ ] **STORY-0171b**: Session & File Management - Advanced Features (16 ACs combining gap remediations + enhancements). Dependency: requires STORY-0171a complete.
- [ ] **STORY-018**: Session cleanup job (mentioned in story, separate workstream)
- [ ] **STORY-019**: WebSocket notifications for upload progress (enhancement enh1_websocket_progress dependency)

### Items Marked Out-of-Scope

- Binary part upload handling: Deferred to STORY-0172
- Session finalization with two-phase locking: Deferred to STORY-0172
- File content validation and magic bytes: Deferred to STORY-0172
- Background cleanup jobs: Deferred to STORY-018
- WebSocket infrastructure: Deferred to STORY-019

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 | PM Split Leader | Split STORY-017 into STORY-0171 and STORY-0172 | `plans/stories/backlog/STORY-0171/STORY-0171.md` |
| 2026-01-25 | QA Elaboration Leader | Elaborate STORY-0171, identify 8 gaps + 8 enhancements | `plans/stories/elaboration/STORY-0171/ELAB-STORY-0171.md` |
