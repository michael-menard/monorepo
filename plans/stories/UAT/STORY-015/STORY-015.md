---
status: uat
---

# STORY-015: MOC Instructions - Initialization & Finalization

## Title

Migrate MOC Instructions Initialize & Finalize Endpoints to Vercel

## Context

The MOC Instructions domain uses a two-phase upload flow for creating MOCs with files:

1. **Initialize** - Creates MOC record in database, validates file metadata, checks rate limits, generates presigned S3 URLs for direct browser upload
2. **Finalize** - Confirms uploads completed successfully, validates file content (magic bytes, parts lists), sets thumbnail, indexes in search

This pattern separates metadata creation from large file uploads, allowing:
- Files to be uploaded directly to S3 (bypassing Lambda/Vercel payload limits)
- Transactional integrity (MOC not "published" until files confirmed)
- Retry-friendly flow (presigned URLs can be regenerated if needed)

The AWS Lambda implementations exist at:
- `apps/api/platforms/aws/endpoints/moc-instructions/initialize-with-files/handler.ts`
- `apps/api/platforms/aws/endpoints/moc-instructions/finalize-with-files/handler.ts`

This story migrates both endpoints to Vercel serverless functions with platform-agnostic core package logic.

## Goal

Enable creation of MOC instructions with file uploads via Vercel-hosted API endpoints, maintaining feature parity with the AWS Lambda implementation including rate limiting, duplicate detection, file validation, and idempotent finalization.

## Non-Goals

- **OpenSearch indexing** - Deferred. The Postgres record is the source of truth. Search indexing can be handled by a background job or future story.
- **Frontend UI for MOC creation** - This is a backend-only API migration.
- **File upload UI components** - Out of scope.
- **Multipart upload sessions** - Covered by STORY-017.
- **Background cleanup of orphaned uploads** - Covered by STORY-018.

## Scope

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/mocs/with-files/initialize` | Create MOC record, return presigned upload URLs |
| POST | `/api/mocs/:mocId/finalize` | Confirm uploads, validate files, finalize MOC |

### Packages/Apps Affected

| Path | Change |
|------|--------|
| `packages/backend/moc-instructions-core/` | Add `initializeWithFiles`, `finalizeWithFiles` functions |
| `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` | New Vercel handler |
| `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` | New Vercel handler |
| `apps/api/core/database/seeds/mocs.ts` | Add test data for duplicate title and ownership tests |
| `__http__/mocs.http` | Add HTTP test requests for STORY-015 |

## Acceptance Criteria

### Initialize Endpoint

- [ ] **AC-1:** POST `/api/mocs/with-files/initialize` accepts MOC metadata and file list, returns 201 with mocId and presigned URLs
- [ ] **AC-2:** Presigned URLs expire after 5 minutes (configurable via `presignTtlMinutes`)
- [ ] **AC-3:** At least one instruction file is required; returns 400 if missing
- [ ] **AC-4:** Maximum 10 instruction files allowed; returns 400 if exceeded
- [ ] **AC-5:** File sizes are validated against config limits; returns 400 if exceeded
- [ ] **AC-6:** MIME types are validated against allowlist; returns 400 if invalid
- [ ] **AC-7:** Duplicate title for same user returns 409 CONFLICT
- [ ] **AC-8:** Rate limit is checked before any DB writes; returns 429 if exceeded
- [ ] **AC-9:** Response includes `sessionTtlSeconds` indicating how long the session is valid
- [ ] **AC-10:** Filenames are sanitized before use in S3 keys (path traversal, unicode, special chars)
- [ ] **AC-11:** Returns 401 if not authenticated

### Finalize Endpoint

- [ ] **AC-12:** POST `/api/mocs/:mocId/finalize` accepts array of `uploadedFiles` with success status
- [ ] **AC-13:** Verifies files exist in S3 via HeadObject; returns 400 if missing
- [ ] **AC-14:** Validates file content via magic bytes; returns 422 INVALID_TYPE if mismatch
- [ ] **AC-15:** Validates parts list files; returns 422 PARTS_VALIDATION_ERROR with per-file errors
- [ ] **AC-16:** Sets first image as thumbnail
- [ ] **AC-17:** Updates MOC status from 'draft' to 'published' and sets `finalizedAt`
- [ ] **AC-18:** Returns 403 if user doesn't own the MOC
- [ ] **AC-19:** Returns 404 if MOC doesn't exist
- [ ] **AC-20:** Idempotent: calling finalize on already-finalized MOC returns 200 with `idempotent: true`
- [ ] **AC-21:** Two-phase lock prevents concurrent finalization; second caller gets `status: 'finalizing'`
- [ ] **AC-22:** Stale locks (older than `finalizeLockTtlMinutes`) are rescued
- [ ] **AC-23:** Rate limit is checked before side effects; returns 429 if exceeded
- [ ] **AC-24:** Returns complete MOC with files array on success

### Core Package

- [ ] **AC-25:** `initializeWithFiles()` function in `@repo/moc-instructions-core` accepts input + deps, is platform-agnostic
- [ ] **AC-26:** `finalizeWithFiles()` function in `@repo/moc-instructions-core` accepts input + deps, is platform-agnostic
- [ ] **AC-27:** Both functions have unit tests with >80% coverage

### Infrastructure

- [ ] **AC-28:** `MOC_BUCKET` environment variable is documented and used for S3 bucket name
- [ ] **AC-29:** All existing `@repo/upload-config` limits are respected

## Reuse Plan

### Existing Packages to Use

| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging |
| `@repo/lambda-responses` | Error classes (`BadRequestError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`), response builders |
| `@repo/upload-config` | File size limits, count limits, MIME type validation, TTL config |
| `@repo/rate-limit` | Rate limiter with Postgres store |
| `@repo/file-validator` | Magic bytes validation (`validateMagicBytes`) |
| `@repo/db` | Drizzle client and schema (or inline schema per existing Vercel pattern) |

### What Will Be Extended

| Package | Extension |
|---------|-----------|
| `@repo/moc-instructions-core` | Add `initializeWithFiles`, `finalizeWithFiles` exports |

### New Shared Packages

None required. Parts validation can be inlined in core package; extract to `@repo/parts-validator` only if needed for reuse.

## Architecture Notes (Ports & Adapters)

### Core Package (Port Interface)

```typescript
// packages/backend/moc-instructions-core/src/initialize-with-files.ts
export interface InitializeWithFilesInput {
  userId: string
  mocData: z.infer<typeof MocMetadataSchema>
  files: z.infer<typeof FileMetadataSchema>[]
}

export interface InitializeWithFilesDeps {
  db: DrizzleClient
  generatePresignedUrl: (bucket: string, key: string, contentType: string) => Promise<string>
  s3Bucket: string
  rateLimiter: RateLimiter
  uploadConfig: UploadConfig
}

export async function initializeWithFiles(
  input: InitializeWithFilesInput,
  deps: InitializeWithFilesDeps
): Promise<InitializeWithFilesResult>
```

### Vercel Handler (Adapter)

```typescript
// apps/api/platforms/vercel/api/mocs/with-files/initialize.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Auth check
  // 2. Parse/validate request body
  // 3. Construct deps (db, s3Client, rateLimiter, config)
  // 4. Call core function
  // 5. Transform and return response
}
```

### Dependency Injection Pattern

S3 operations are injected as functions to allow:
- Different credential patterns (Lambda IAM vs Vercel explicit)
- Easy mocking in unit tests
- Platform-agnostic core logic

## Required Vercel / Infra Notes

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `AWS_ACCESS_KEY_ID` | S3 credentials | Yes |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials | Yes |
| `AWS_REGION` | S3 region (default: us-east-1) | Yes |
| `MOC_BUCKET` | S3 bucket for MOC files | Yes |
| `AUTH_BYPASS` | Enable local dev auth bypass | Local only |
| `DEV_USER_SUB` | Dev user ID when AUTH_BYPASS=true | Local only |

### Vercel Function Config

No special config required. Standard serverless function limits apply. File uploads go directly to S3, not through Vercel.

## HTTP Contract Plan

### Required `.http` Requests

Add to `/__http__/mocs.http`:

```http
# ==============================================================================
# STORY-015: MOC Instructions Initialize & Finalize
# ==============================================================================

### Initialize MOC with single instruction file - expect 201
# @name initializeMocSingleFile
POST {{baseUrl}}/api/mocs/with-files/initialize
Content-Type: application/json

{
  "title": "Test MOC Single File",
  "type": "moc",
  "files": [
    {
      "filename": "instructions.pdf",
      "fileType": "instruction",
      "mimeType": "application/pdf",
      "size": 5242880
    }
  ]
}

### Initialize MOC with multiple files - expect 201
# @name initializeMocMultipleFiles
POST {{baseUrl}}/api/mocs/with-files/initialize
Content-Type: application/json

{
  "title": "Test MOC Multiple Files",
  "type": "moc",
  "description": "A test MOC with multiple files",
  "files": [
    {
      "filename": "instructions.pdf",
      "fileType": "instruction",
      "mimeType": "application/pdf",
      "size": 10485760
    },
    {
      "filename": "parts.csv",
      "fileType": "parts-list",
      "mimeType": "text/csv",
      "size": 102400
    },
    {
      "filename": "thumbnail.jpg",
      "fileType": "thumbnail",
      "mimeType": "image/jpeg",
      "size": 512000
    }
  ]
}

### Finalize MOC - expect 200
# @name finalizeMocSuccess
POST {{baseUrl}}/api/mocs/{{mocId}}/finalize
Content-Type: application/json

{
  "uploadedFiles": [
    { "fileId": "{{fileId1}}", "success": true },
    { "fileId": "{{fileId2}}", "success": true }
  ]
}

### Initialize without auth - expect 401
# @name initializeNoAuth
POST {{baseUrl}}/api/mocs/with-files/initialize
Content-Type: application/json
X-Auth-Bypass: false

{
  "title": "Test",
  "type": "moc",
  "files": [{ "filename": "test.pdf", "fileType": "instruction", "mimeType": "application/pdf", "size": 1000 }]
}

### Initialize duplicate title - expect 409
# @name initializeDuplicateTitle
POST {{baseUrl}}/api/mocs/with-files/initialize
Content-Type: application/json

{
  "title": "Test MOC Duplicate Title",
  "type": "moc",
  "files": [{ "filename": "test.pdf", "fileType": "instruction", "mimeType": "application/pdf", "size": 1000 }]
}

### Finalize other user's MOC - expect 403
# @name finalizeForbidden
POST {{baseUrl}}/api/mocs/eeeeeeee-eeee-eeee-eeee-eeeeeeee0001/finalize
Content-Type: application/json

{
  "uploadedFiles": [{ "fileId": "00000000-0000-0000-0000-000000000001", "success": true }]
}
```

### Required Evidence

QA must capture responses for:
1. `#initializeMocSingleFile` - 201 with mocId and uploadUrls array
2. `#initializeMocMultipleFiles` - 201 with 3 upload URLs
3. `#finalizeMocSuccess` - 200 with complete MOC data
4. `#initializeNoAuth` - 401 UNAUTHORIZED
5. `#initializeDuplicateTitle` - 409 CONFLICT
6. `#finalizeForbidden` - 403 FORBIDDEN

## Seed Requirements

### Required Entities

| Entity | Purpose | ID (deterministic) |
|--------|---------|-------------------|
| MOC "Test MOC Duplicate Title" | Duplicate title test | `dddddddd-dddd-dddd-dddd-dddddddd0015` |
| MOC owned by other user | 403 ownership test | `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` |

### Seed Implementation

Add to `apps/api/core/database/seeds/mocs.ts`:

```typescript
// STORY-015 test data
const story015Seeds = [
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddd0015',
    userId: 'dev-user-00000000-0000-0000-0000-000000000001',
    title: 'Test MOC Duplicate Title',
    type: 'moc',
    status: 'published',
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
    userId: 'other-user-00000000-0000-0000-0000-000000000002',
    title: 'Other User MOC',
    type: 'moc',
    status: 'draft',
  },
]
```

### Seed Requirements

- **Deterministic:** Uses fixed UUIDs that are stable across runs
- **Idempotent:** Uses upsert pattern (ON CONFLICT DO UPDATE)
- **Ownership:** `pnpm seed` must create this data

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Expected | HTTP Reference |
|----|------|----------|----------------|
| HP-1 | Initialize with single instruction file | 201, mocId + 1 presigned URL | `#initializeMocSingleFile` |
| HP-2 | Initialize with multiple files | 201, mocId + N presigned URLs | `#initializeMocMultipleFiles` |
| HP-3 | Finalize after successful upload | 200, MOC published, thumbnail set | `#finalizeMocSuccess` |
| HP-4 | Finalize idempotent retry | 200, `idempotent: true` | `#finalizeMocIdempotent` |
| HP-5 | Initialize with all optional fields | 201, all fields persisted | `#initializeMocFullSchema` |
| HP-6 | Initialize type 'set' | 201, set-specific fields | `#initializeMocTypeSet` |

### Error Cases

| ID | Test | Expected | HTTP Reference |
|----|------|----------|----------------|
| ERR-1 | Initialize without auth | 401 UNAUTHORIZED | `#initializeNoAuth` |
| ERR-2 | Initialize empty body | 400 BAD_REQUEST | `#initializeEmptyBody` |
| ERR-3 | Initialize no files array | 400 VALIDATION_ERROR | `#initializeNoFiles` |
| ERR-4 | Initialize no instruction file | 400 BAD_REQUEST | `#initializeNoInstruction` |
| ERR-5 | Initialize >10 instructions | 400 BAD_REQUEST | `#initializeTooManyInstructions` |
| ERR-6 | Initialize file too large | 400 BAD_REQUEST | `#initializeFileTooLarge` |
| ERR-7 | Initialize invalid MIME type | 400 BAD_REQUEST | `#initializeInvalidMime` |
| ERR-8 | Initialize duplicate title | 409 CONFLICT | `#initializeDuplicateTitle` |
| ERR-9 | Initialize rate limited | 429 TOO_MANY_REQUESTS | `#initializeRateLimited` |
| ERR-10 | Finalize non-existent MOC | 404 NOT_FOUND | `#finalizeNotFound` |
| ERR-11 | Finalize other user's MOC | 403 FORBIDDEN | `#finalizeForbidden` |
| ERR-12 | Finalize empty body | 400 BAD_REQUEST | `#finalizeEmptyBody` |
| ERR-13 | Finalize no successful uploads | 400 BAD_REQUEST | `#finalizeNoSuccessfulUploads` |
| ERR-14 | Finalize file not in S3 | 400 BAD_REQUEST | `#finalizeFileNotInS3` |
| ERR-15 | Finalize magic bytes mismatch | 422 INVALID_TYPE | `#finalizeMagicBytesMismatch` |
| ERR-16 | Finalize parts validation error | 422 PARTS_VALIDATION_ERROR | `#finalizePartsValidationError` |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | Initialize 100-char title | 201, accepted |
| EDGE-2 | Initialize unicode filename | 201, sanitized S3 key |
| EDGE-3 | Initialize path traversal filename | 201, safe S3 key |
| EDGE-4 | Finalize concurrent requests | One 200, other idempotent |
| EDGE-5 | Finalize stale lock rescue | 200, lock rescued |
| EDGE-6 | Initialize max file count | 201, all files registered |
| EDGE-7 | Finalize partial upload success | 200, only successful files verified |
| EDGE-8 | Initialize empty tags array | 201, tags = [] |

### Evidence Requirements

- **Unit tests:** `pnpm test packages/backend/moc-instructions-core` - all pass
- **HTTP executions:** All `#story015*` requests executed with captured responses
- **Database verification:** MOC record shows `finalized_at` NOT NULL after successful finalize

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | PM | Story generated from index entry STORY-015 |
