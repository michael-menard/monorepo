---
status: backlog
---

# STORY-017: Image Uploads - Phase 3 (Multipart Sessions)

## Title

Migrate Multipart Upload Session Endpoints to Vercel

## Context

This story is part of the Vercel migration initiative. The multipart upload session flow enables uploading large MOC instruction files (PDFs up to 50MB) via chunked uploads with server-side coordination. Unlike the presigned URL pattern used in STORY-015/016 (where clients upload directly to S3), this flow routes binary data through Vercel serverless functions to S3.

The AWS Lambda implementation already exists and is production-tested. This story migrates that implementation to Vercel while preserving identical API contracts and behavior.

**Key Difference from STORY-015/016:** The upload-part endpoint receives binary chunks (up to 5MB each) and forwards them to S3 via `UploadPartCommand`. This server-mediated upload enables progress tracking, resumable uploads, and part-level retry.

## Goal

Migrate all 5 multipart upload session endpoints from AWS Lambda to Vercel serverless functions while maintaining full API compatibility and identical behavior.

## Non-Goals

- Creating new UI for upload progress (existing frontend already uses these APIs)
- Adding new upload features not present in AWS implementation
- Implementing S3 lifecycle policies or cleanup jobs (STORY-018)
- Migrating WebSocket notifications (STORY-019)
- Creating a shared core package for multipart logic (follow-up refactor)

## Scope

### Endpoints (5 total)

| Method | Route | Handler |
|--------|-------|---------|
| POST | `/api/mocs/uploads/sessions` | Create upload session |
| POST | `/api/mocs/uploads/sessions/:sessionId/files` | Register file within session |
| PUT | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber` | Upload binary part |
| POST | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` | Complete file upload |
| POST | `/api/mocs/uploads/sessions/finalize` | Finalize session, create MOC |

### Packages/Apps Affected

**Create:**
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts`
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts`
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts`
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts`
- `apps/api/platforms/vercel/api/mocs/uploads/finalize.ts`

**Modify:**
- `apps/api/platforms/vercel/vercel.json` (route rewrites)
- `__http__/` (add test file)

### Database Tables (No Schema Changes)

Existing tables used:
- `upload_sessions` - Session state, TTL, finalization state
- `upload_session_files` - Files with S3 keys and multipart upload IDs
- `upload_session_parts` - Part ETags for multipart completion
- `moc_instructions` - Created MOC record (on finalize)
- `moc_files` - File records for completed MOC

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

### AC-3: Upload Part Endpoint (Binary Handling)
- [ ] `PUT /api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber` accepts binary body
- [ ] Handler disables Vercel JSON body parser (`export const config = { api: { bodyParser: false } }`)
- [ ] Correctly reads raw binary stream from request
- [ ] Uploads binary chunk to S3 via `UploadPartCommand`
- [ ] Returns `200 OK` with `{ partNumber, etag }`
- [ ] Records part in `upload_session_parts` table (upsert on conflict)
- [ ] Returns `400` for empty body, invalid part number (<=0)
- [ ] Returns `404` for non-existent session or file

### AC-4: Complete File Endpoint
- [ ] `POST /api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` accepts `{ parts: [{partNumber, etag}] }`
- [ ] Returns `200 OK` with `{ fileId, fileUrl }`
- [ ] Validates part count matches uploaded parts in DB
- [ ] Calls S3 `CompleteMultipartUploadCommand`
- [ ] Updates file status to `completed` with `fileUrl`
- [ ] Returns `400` for part count mismatch or already-completed file

### AC-5: Finalize Session Endpoint
- [ ] `POST /api/mocs/uploads/sessions/finalize` accepts `{ uploadSessionId, title, description?, tags?, theme? }`
- [ ] Returns `201 Created` with full MOC response (id, title, slug, pdfKey, imageKeys, partsKeys, etc.)
- [ ] Validates session exists, belongs to user, not expired
- [ ] Verifies at least one instruction file is completed
- [ ] Verifies all files exist in S3 via `HeadObject`
- [ ] Validates file content via magic bytes (first 512 bytes)
- [ ] Uses two-phase locking pattern (finalizingAt -> finalizedAt) with 5-minute TTL
- [ ] Creates MOC record in `moc_instructions` with unique slug
- [ ] Creates file records in `moc_files`
- [ ] Sets first image as thumbnail
- [ ] Is idempotent: repeat calls return existing MOC with `idempotent: true`
- [ ] Returns `409` for duplicate title with `suggestedSlug`

### AC-6: Authentication (All Endpoints)
- [ ] All endpoints require authentication
- [ ] Local development uses `AUTH_BYPASS=true` with `DEV_USER_SUB`
- [ ] Returns `401 UNAUTHORIZED` when no auth token provided

### AC-7: Vercel Function Configuration
- [ ] Upload-part endpoint configured with `bodyParser: false` to handle binary
- [ ] Function timeout configured appropriately for large uploads
- [ ] Routes added to `vercel.json` for all 5 endpoints

### AC-8: Part Size Configuration
- [ ] `partSizeBytes` returned by create-session is 5MB (5242880)
- [ ] NOTE: Requires Vercel Pro tier (50MB body limit). Hobby tier (4.5MB) would require 4MB parts.

## Reuse Plan

### Existing Packages to Use

| Package | Purpose |
|---------|---------|
| `@repo/rate-limit` | Daily rate limiting for session creation |
| `@repo/file-validator` | Magic bytes validation in finalize |
| `@repo/upload-types` | `slugify()`, `findAvailableSlug()` for MOC creation |
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
- `uploadPart(fileId, partNumber, binary) -> { etag }`
- `completeFile(fileId, parts) -> { fileUrl }`

**Finalize Service Port:**
- `finalizeSession(sessionId, metadata) -> MOC`

### Adapter Responsibilities

**Database Adapter (Drizzle):**
- Query `upload_sessions`, `upload_session_files`, `upload_session_parts` tables
- Insert/update records atomically
- Enforce unique constraints (session-file, file-part)

**S3 Adapter:**
- `CreateMultipartUploadCommand` - initiate upload
- `UploadPartCommand` - upload binary chunk
- `CompleteMultipartUploadCommand` - finalize file
- `HeadObjectCommand` - verify file exists
- `GetObjectCommand` (partial) - get magic bytes

## Required Vercel / Infra Notes

### Vercel Function Configuration

```json
// vercel.json (functions section)
{
  "functions": {
    "api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts": {
      "maxDuration": 30
    }
  }
}
```

### Route Rewrites

```json
// vercel.json (rewrites section)
[
  { "source": "/api/mocs/uploads/sessions", "destination": "/api/mocs/uploads/sessions/index" },
  { "source": "/api/mocs/uploads/sessions/:sessionId/files", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/index" },
  { "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber]" },
  { "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete" },
  { "source": "/api/mocs/uploads/finalize", "destination": "/api/mocs/uploads/finalize" }
]
```

### Binary Body Handling

The upload-part handler MUST disable Vercel's automatic body parsing:

```typescript
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Read raw binary
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  const bodyBuffer = Buffer.concat(chunks)
  // ... use bodyBuffer with S3 UploadPartCommand
}
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

All requests are defined in `__http__/story-017-multipart-sessions.http`:

| Request | Test ID | Description |
|---------|---------|-------------|
| `createSessionSingleFile` | CS-HP-001 | Create session with single instruction file |
| `createSessionAllTypes` | CS-HP-004 | Create session with all file types |
| `registerFile` | RF-HP-001 | Register instruction PDF file |
| `uploadPart` | UP-HP-001 | Upload first part (requires binary) |
| `completeFile` | CF-HP-001 | Complete single-part upload |
| `finalizeSession` | FS-HP-001 | Finalize session with minimal fields |

### Error Case Requests

| Request | Test ID | Expected Status |
|---------|---------|-----------------|
| Empty files array | CS-VAL-003 | 422 |
| No instruction file | CS-VAL-004 | 400 |
| File too large | CS-LIM-001 | 413 |
| Invalid MIME type | CS-LIM-006 | 415 |
| Non-existent session | RF-PATH-003 | 404 |
| Invalid part number | UP-PATH-007 | 400 |
| Part count mismatch | CF-VAL-007 | 400 |
| Missing uploadSessionId | FS-VAL-003 | 422 |

### Required Evidence

Captured in proof document:
- All happy path requests with 2xx responses
- Representative error cases (401, 400, 404, 409, 413, 415, 422, 429)
- Database queries showing records created in all 5 tables
- S3 console or CLI showing uploaded files

## Seed Requirements

### Existing Seed Data

No new seed data required for happy path testing. Sessions and files are created dynamically.

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

-- Existing MOC for title conflict testing (FS-CONFLICT-001)
INSERT INTO moc_instructions (id, user_id, title, slug, type, status, created_at, updated_at)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'dev-user-00000000-0000-0000-0000-000000000001',
  'Existing MOC Title',
  'existing-moc-title',
  'moc',
  'published',
  NOW(),
  NOW()
);
```

### Seed Location

Add to `apps/api/core/database/seeds/story-017.ts` and register in seed index.

### Requirements

- Deterministic: Uses fixed UUIDs
- Idempotent: Use upsert or delete-then-insert pattern

## Test Plan (Happy Path / Error Cases / Edge Cases)

*Synthesized from: `plans/stories/STORY-017/_pm/TEST-PLAN.md`*

### Happy Path Tests

| Endpoint | Test ID | Description | Expected |
|----------|---------|-------------|----------|
| Create Session | CS-HP-001 | Single instruction file | 201, sessionId returned |
| Create Session | CS-HP-004 | All file types | 201, session created |
| Register File | RF-HP-001 | Instruction PDF | 201, fileId + uploadId |
| Upload Part | UP-HP-001 | First part (binary) | 200, partNumber + etag |
| Complete File | CF-HP-001 | Single-part upload | 200, fileId + fileUrl |
| Finalize | FS-HP-001 | Minimal fields | 201, full MOC response |
| Finalize | FS-HP-009 | Idempotent retry | 200, idempotent: true |

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
| Body | UP-BODY-002 | Empty binary body | 400 | BAD_REQUEST |
| State | CF-STATE-004 | File already completed | 400 | BAD_REQUEST |
| Conflict | FS-CONFLICT-001 | Duplicate title | 409 | CONFLICT |

### Edge Cases

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| UP-HP-006 | Re-upload same part number | Upsert, new ETag stored |
| FS-CONC-001 | Parallel finalize requests | First creates MOC, others get idempotent response |
| FS-CONC-002 | Stale lock recovery (>5 min) | New finalize succeeds |
| E2E-004 | Abort mid-upload | Session expires, cleanup via STORY-018 |

### End-to-End Workflow Test

**E2E-001: Single File Upload**
1. Create session with 1 instruction file -> 201, sessionId
2. Register file -> 201, fileId + uploadId
3. Upload 1 part (5MB binary) -> 200, etag
4. Complete file -> 200, fileUrl
5. Finalize session -> 201, MOC created

**E2E-002: Multi-File Upload**
1. Create session with instruction + 2 images -> 201
2. Register 3 files -> 3x 201
3. Upload parts for each file -> 3x 200
4. Complete 3 files -> 3x 200
5. Finalize -> 201, MOC with pdfKey + imageKeys

### Evidence Requirements

Per-endpoint proof:
- [ ] Happy path request/response screenshot
- [ ] At least 3 error case screenshots per endpoint
- [ ] Database state verification (query results)
- [ ] S3 verification (files at expected paths)

End-to-end proof:
- [ ] Complete workflow (all 5 steps)
- [ ] Database showing records in all 5 tables
- [ ] S3 bucket listing with files in correct structure

---

## PM Decisions (Blockers Resolved)

### Decision 1: Vercel Tier Requirement

**Decision:** This story requires Vercel Pro tier (50MB body limit).

**Rationale:** The AWS implementation uses 5MB parts (S3 default). Hobby tier's 4.5MB limit would require reducing part size to 4MB, increasing total request count by ~25%. Pro tier maintains parity with AWS.

**Alternative if Hobby required:** Set `partSizeBytes` to 4MB (4194304). Add AC noting this deviation from AWS behavior.

### Decision 2: No Core Package Extraction

**Decision:** Inline business logic in Vercel handlers (matching STORY-015/016 pattern).

**Rationale:** Minimizes scope and follows established migration pattern. Core package extraction is a follow-up refactor after all endpoints migrated.

### Decision 3: Binary Body Handling

**Decision:** Handle binary body inline in upload-part handler using `bodyParser: false` config.

**Rationale:** Simpler than extending `@repo/vercel-adapter`. Upload-part is the only endpoint needing raw binary handling.

---

## Token Budget

| Phase | Agent | Input (est) | Output (est) |
|-------|-------|-------------|--------------|
| PM: Story Generation | PM | ~15K | ~8K |
| PM: Test Plan | Sub-agent | ~5K | ~12K |
| PM: Dev Feasibility | Sub-agent | ~5K | ~8K |
| **PM Total** | — | **~25K** | **~28K** |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-21 | PM | Generated STORY-017 | `plans/stories/STORY-017/STORY-017.md` |
| 2026-01-21 | PM (sub) | Generated TEST-PLAN | `plans/stories/STORY-017/_pm/TEST-PLAN.md` |
| 2026-01-21 | PM (sub) | Generated DEV-FEASIBILITY | `plans/stories/STORY-017/_pm/DEV-FEASIBILITY.md` |
| 2026-01-21 | PM (sub) | UIUX-NOTES skipped | Backend-only story |
