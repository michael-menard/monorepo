---
status: needs-split
split_from: STORY-017
split_part: 2 of 2
---

# STORY-0172: Binary Upload & Finalization

## Split Context

This story is part of a split from STORY-017.
- **Original Story:** STORY-017 (Image Uploads - Phase 3: Multipart Sessions)
- **Split Reason:** Story exceeded sizing thresholds with 8 ACs, 5 endpoints, and significant backend complexity. Split separates binary upload handling and session finalization from session management infrastructure.
- **This Part:** 2 of 2 (Z=2)
- **Dependency:** Depends on STORY-0171 (Session & File Management)

## Title

Migrate Binary Part Upload and Session Finalization Endpoints to Vercel

## Context

This story is part of the Vercel migration initiative and represents the second phase of migrating multipart upload session functionality. It builds on STORY-0171 which established the session management infrastructure.

This story focuses on the most complex parts of the multipart upload flow: handling binary part uploads through Vercel serverless functions and finalizing upload sessions to create MOC records. These operations require special Vercel configuration (bodyParser: false) and implement sophisticated patterns like two-phase locking for idempotency.

The AWS Lambda implementation already exists and is production-tested. This story migrates that implementation to Vercel while preserving identical API contracts and behavior.

**Key Difference from STORY-0171:** The upload-part endpoint receives binary chunks (up to 5MB each) and forwards them to S3 via `UploadPartCommand`. This server-mediated upload enables progress tracking, resumable uploads, and part-level retry. The finalize endpoint implements two-phase locking and creates MOC database records.

## Goal

Migrate binary part upload and session finalization endpoints from AWS Lambda to Vercel serverless functions while maintaining full API compatibility and identical behavior.

## Non-Goals

- Session creation and file registration (STORY-0171)
- Creating new UI for upload progress (existing frontend already uses these APIs)
- Adding new upload features not present in AWS implementation
- Implementing S3 lifecycle policies or cleanup jobs (STORY-018)
- Migrating WebSocket notifications (STORY-019)
- Creating a shared core package for multipart logic (follow-up refactor)

## Scope

### Endpoints (2 total)

| Method | Route | Handler |
|--------|-------|---------|
| PUT | `/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber` | Upload binary part |
| POST | `/api/mocs/uploads/sessions/finalize` | Finalize session, create MOC |

### Packages/Apps Affected

**Create:**
- `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber].ts`
- `apps/api/platforms/vercel/api/mocs/uploads/finalize.ts`

**Modify:**
- `apps/api/platforms/vercel/vercel.json` (route rewrites, function config)
- `__http__/` (add test file)

### Database Tables (No Schema Changes)

Existing tables used:
- `upload_sessions` - Session state, TTL, finalization state
- `upload_session_files` - Files with S3 keys and multipart upload IDs
- `upload_session_parts` - Part ETags for multipart completion
- `moc_instructions` - Created MOC record (on finalize)
- `moc_files` - File records for completed MOC

## Acceptance Criteria

### AC-3: Upload Part Endpoint (Binary Handling)
- [ ] `PUT /api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber` accepts binary body
- [ ] Handler disables Vercel JSON body parser (`export const config = { api: { bodyParser: false } }`)
- [ ] Correctly reads raw binary stream from request
- [ ] Uploads binary chunk to S3 via `UploadPartCommand`
- [ ] Returns `200 OK` with `{ partNumber, etag }`
- [ ] Records part in `upload_session_parts` table (upsert on conflict)
- [ ] Returns `400` for empty body, invalid part number (<=0)
- [ ] Returns `404` for non-existent session or file

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

### AC-8: Part Size Configuration
- [ ] `partSizeBytes` returned by create-session is 5MB (5242880)
- [ ] NOTE: Requires Vercel Pro tier (50MB body limit). Hobby tier (4.5MB) would require 4MB parts.

## Reuse Plan

### Existing Packages to Use

| Package | Purpose |
|---------|---------|
| `@repo/file-validator` | Magic bytes validation in finalize |
| `@repo/upload-types` | `slugify()`, `findAvailableSlug()` for MOC creation |
| `@repo/logger` | Structured logging |

### Existing Core Code to Reference

| Path | Purpose |
|------|---------|
| `apps/api/platforms/aws/endpoints/moc-uploads/sessions/_shared/schemas.ts` | Zod schemas for all request/response types |
| `apps/api/core/config/upload.ts` | Upload configuration (size limits, TTLs, MIME types) |

### Patterns to Follow

- Singleton DB client pattern from STORY-015/016 Vercel handlers
- Singleton S3 client pattern from STORY-015/016 Vercel handlers
- Inline schema definitions (matching STORY-015/016 pattern)
- `mapErrorToStatus()` helper for error code -> HTTP status mapping

### No New Shared Packages Created

Per reuse-first principle, inline logic in Vercel handlers. Core package extraction is a follow-up refactor.

## Architecture Notes (Ports & Adapters)

### Port Interfaces

**Part Upload Service Port:**
- `uploadPart(fileId, partNumber, binary) -> { etag }`

**Finalize Service Port:**
- `finalizeSession(sessionId, metadata) -> MOC`

### Adapter Responsibilities

**Database Adapter (Drizzle):**
- Query `upload_sessions`, `upload_session_files`, `upload_session_parts` tables
- Insert/update records atomically
- Create `moc_instructions` and `moc_files` records
- Enforce unique constraints (file-part, MOC slug)

**S3 Adapter:**
- `UploadPartCommand` - upload binary chunk
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
  { "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/parts/[partNumber]" },
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

All requests are defined in `__http__/story-0172-binary-finalization.http`:

| Request | Test ID | Description |
|---------|---------|-------------|
| `uploadPart` | UP-HP-001 | Upload first part (requires binary) |
| `finalizeSession` | FS-HP-001 | Finalize session with minimal fields |
| `finalizeSessionIdempotent` | FS-HP-009 | Idempotent retry |

### Error Case Requests

| Request | Test ID | Expected Status |
|---------|---------|-----------------|
| Empty binary body | UP-BODY-002 | 400 |
| Invalid part number | UP-PATH-007 | 400 |
| Missing uploadSessionId | FS-VAL-003 | 422 |
| Duplicate title | FS-CONFLICT-001 | 409 |

### Required Evidence

Captured in proof document:
- All happy path requests with 2xx responses
- Representative error cases (400, 404, 409, 422)
- Database queries showing records created in all 5 tables
- S3 console or CLI showing uploaded files

## Seed Requirements

### Test Data for Error Cases

The following should be seeded for testing edge cases:

```sql
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

Add to `apps/api/core/database/seeds/story-0172.ts` and register in seed index.

### Requirements

- Deterministic: Uses fixed UUIDs
- Idempotent: Use upsert or delete-then-insert pattern

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| Endpoint | Test ID | Description | Expected |
|----------|---------|-------------|----------|
| Upload Part | UP-HP-001 | First part (binary) | 200, partNumber + etag |
| Finalize | FS-HP-001 | Minimal fields | 201, full MOC response |
| Finalize | FS-HP-009 | Idempotent retry | 200, idempotent: true |

### Error Cases

| Category | Test ID | Condition | Status | Code |
|----------|---------|-----------|--------|------|
| Body | UP-BODY-002 | Empty binary body | 400 | BAD_REQUEST |
| Path | UP-PATH-007 | Invalid part number | 400 | BAD_REQUEST |
| Validation | FS-VAL-003 | Missing uploadSessionId | 422 | VALIDATION_ERROR |
| Conflict | FS-CONFLICT-001 | Duplicate title | 409 | CONFLICT |

### Edge Cases

| Test ID | Description | Expected Behavior |
|---------|-------------|-------------------|
| UP-HP-006 | Re-upload same part number | Upsert, new ETag stored |
| FS-CONC-001 | Parallel finalize requests | First creates MOC, others get idempotent response |
| FS-CONC-002 | Stale lock recovery (>5 min) | New finalize succeeds |
| E2E-004 | Abort mid-upload | Session expires, cleanup via STORY-018 |

### End-to-End Workflow Test

**E2E-001: Single File Upload** (depends on STORY-0171)
1. Create session with 1 instruction file (STORY-0171) -> 201, sessionId
2. Register file (STORY-0171) -> 201, fileId + uploadId
3. Upload 1 part (5MB binary) -> 200, etag
4. Complete file (STORY-0171) -> 200, fileUrl
5. Finalize session -> 201, MOC created

**E2E-002: Multi-File Upload** (depends on STORY-0171)
1. Create session with instruction + 2 images (STORY-0171) -> 201
2. Register 3 files (STORY-0171) -> 3x 201
3. Upload parts for each file -> 3x 200
4. Complete 3 files (STORY-0171) -> 3x 200
5. Finalize -> 201, MOC with pdfKey + imageKeys

### Evidence Requirements

Per-endpoint proof:
- [ ] Happy path request/response screenshot
- [ ] At least 3 error case screenshots per endpoint
- [ ] Database state verification (query results)
- [ ] S3 verification (files at expected paths)

End-to-end proof:
- [ ] Complete workflow (all 5 steps across both stories)
- [ ] Database showing records in all 5 tables
- [ ] S3 bucket listing with files in correct structure

---

## Risks / Edge Cases

### Risks

1. **Binary Handling in Vercel:** Vercel Request object stream handling is different from AWS Lambda. Requires careful testing.
2. **Vercel Body Size Limits:** Requires Pro tier (50MB). Exceeding limit returns truncated request.
3. **Two-Phase Locking:** Concurrent finalize requests require proper lock timeout handling (5-minute TTL).
4. **S3 Multipart Coordination:** Incomplete uploads create orphaned parts (cleanup in STORY-018).
5. **Magic Bytes Validation:** Must fetch first 512 bytes from S3 for validation. Network latency risk.
6. **MOC Slug Uniqueness:** Slug generation must handle conflicts with `suggestedSlug` response.

### Edge Cases

- **Re-upload same part number:** Upsert behavior, new ETag stored
- **Parallel finalize requests:** First wins, others receive idempotent response
- **Stale lock recovery:** Locks older than 5 minutes are ignored, new finalize can proceed
- **Incomplete upload session:** Expires naturally, cleanup handled by STORY-018

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
| PM: Story Split | PM | ~15K | ~8K |
| **PM Total** | — | **~15K** | **~8K** |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 | PM Split Leader | Split STORY-017 into STORY-0171 and STORY-0172 | `plans/stories/backlog/STORY-0172/STORY-0172.md` |

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-25_

### Executive Summary

During elaboration review, 18 gaps and enhancement opportunities were identified and marked as "Add as AC" by the user. This expansion transforms STORY-0172 from 3 acceptance criteria to 21 acceptance criteria (700% growth). The original story scope (binary upload + finalization) remains solid, but the additional items signal that this story should be split into three focused stories:

1. **STORY-0172A (Core MVP)** - Original 3 ACs (upload-part, finalize, part size)
2. **STORY-0172B (Phase 2: Reliability)** - 8 gaps (retry, timeout, validation, logging, CORS, transactions, rate limiting)
3. **STORY-0172C (Phase 3: Performance & Observability)** - 10 enhancements (WebSocket, parallel validation, checksums, batch upload, thumbnails, webhooks, resume, telemetry)

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No retry strategy for S3 UploadPartCommand failures | Add as AC | S3 SDK has built-in retries, but story should document expected behavior if retry exhausts. Client should re-upload part. Add note to AC-3. |
| 2 | No explicit handling for Vercel function timeout (30s) | Add as AC | If binary upload takes >30s (slow network), function times out. Story mentions maxDuration: 30 but doesn't specify client-side timeout handling. Add error case: REQUEST_TIMEOUT. |
| 3 | Missing validation for partNumber range (1-10000) | Add as AC | S3 supports parts 1-10000. Story validates partNumber > 0 but not upper bound. Could cause confusing S3 errors. Add validation: partNumber <= 10000. |
| 4 | No discussion of ETag format variations | Add as AC | S3 ETags for multipart uploads vs single-part differ (multipart has suffix "-N"). Story doesn't document this nuance. Add note to AC-3 or Risks section. |
| 5 | Slug conflict resolution only returns suggestedSlug | Add as AC | AC-5 returns suggestedSlug on 409 conflict, but doesn't specify if client should auto-retry or prompt user. Add UX guidance to decision or test plan. |
| 6 | No logging strategy for binary upload size | Add as AC | Story references @repo/logger but doesn't specify what to log for upload-part (partNumber, size, etag). Add structured logging example to Reuse Plan. |
| 7 | Two-phase lock TTL recovery not tested | Add as AC | AC-5 mentions stale lock recovery (>5 min) but test plan doesn't include explicit test for this edge case. Add test: FS-CONC-002 (already listed but not in error case table). |
| 8 | Missing CORS preflight handling note | Add as AC | Vercel serverless functions need explicit OPTIONS handling for browser uploads. Story doesn't mention if upload-part endpoint expects browser uploads or server-mediated only. Clarify in Architecture Notes. |
| 9 | No database transaction boundary specification | Add as AC | Finalize endpoint has multiple DB writes (MOC, mocFiles, session update). Story doesn't specify if these should be wrapped in explicit transaction or rely on implicit per-statement. Add transaction guidance. |
| 10 | Rate limiting not mentioned for finalize endpoint | Add as AC | STORY-015/016 Vercel handlers include rate limiting. Finalize is expensive (magic bytes, S3 calls). Should finalize have rate limit? Document decision. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Real-time progress tracking via WebSocket | Add as AC | Upload-part could emit progress events to WebSocket (STORY-019). Would enable live upload progress UI. Defer to follow-up story. |
| 2 | Parallel part validation during finalize | Add as AC | Finalize validates files sequentially (HeadObject + magic bytes). Could parallelize with Promise.all(). Reduces finalize latency. Consider for performance optimization. |
| 3 | Checksum validation beyond magic bytes | Add as AC | Story uses magic bytes (first 512 bytes) but S3 supports MD5/SHA checksums. Could add optional checksum verification for data integrity. Low ROI for MVP. |
| 4 | Batch upload-part endpoint | Add as AC | Instead of 1 part per request, accept array of parts. Reduces HTTP overhead for small files. Requires streaming multiplexing. Defer to Phase 2. |
| 5 | Thumbnail auto-generation from first image | Add as AC | AC-5 sets first image as thumbnail but doesn't auto-resize. Could integrate image processing (Sharp.js) to generate optimized thumbnails. Defer to UX enhancement story. |
| 6 | Finalize webhook notifications | Add as AC | After successful finalize, trigger webhook to notify frontend. Enables async finalize UX. Requires webhook infrastructure. Defer to notification story. |
| 7 | Upload resume from failed finalize | Add as AC | If finalize fails after MOC creation but before session update, next finalize should detect partial state and resume. Story has idempotency for complete finalize but not partial. Add to edge cases or defer. |
| 8 | Structured finalize telemetry | Add as AC | Finalize is critical path. Add OpenTelemetry spans for each step (validate, create MOC, files, etc.). Enables performance debugging. Low effort if telemetry exists. |
| 9 | Multi-region S3 upload optimization | Out-of-Scope | For global users, route upload-part to closest S3 region. Reduces latency. Requires multi-region bucket config. Defer to infrastructure optimization. |
| 10 | Deduplication of identical files | Out-of-Scope | If user uploads same file twice (same hash), reuse S3 object. Saves storage. Requires content-addressable storage pattern. Significant refactor. |

### Follow-up Stories Suggested

Will be created as split execution outcomes:
- [ ] STORY-0172B - Upload Reliability & Resilience (Phase 2)
- [ ] STORY-0172C - Upload Performance & Observability (Phase 3)

### Items Marked Out-of-Scope

- **enhance_9_multi_region**: Multi-region S3 optimization (infrastructure story, not MVP)
- **enhance_10_deduplication**: Content-addressable storage (significant refactor, future work)

### Decision Summary

- **Total gaps identified**: 10
- **Total enhancements identified**: 10
- **Marked "Add as AC"**: 18 (8 gaps + 10 enhancements)
- **Marked "Out-of-Scope"**: 2
- **Marked "Follow-up Story"**: 0 (split stories instead)

**Result**: Original 3 ACs expand to 21 ACs → **SPLIT REQUIRED verdict**

See `ELAB-STORY-0172.md` for detailed split recommendation and story breakdown.
