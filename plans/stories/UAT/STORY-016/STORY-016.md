---
status: uat
---

# STORY-016: MOC File Upload Management

## Title

Migrate MOC File Upload, Delete, Parts List, and Edit Presign/Finalize Endpoints to Vercel

## Context

The MOC Instructions domain has several file management endpoints that handle:
1. **Direct file uploads** - Multipart form data uploads for MOC files
2. **File deletion** - Soft-delete of file records
3. **Parts list uploads** - CSV/XML file parsing with piece count calculation
4. **Edit flow** - Two-phase presign/finalize pattern for editing existing MOCs

The AWS Lambda implementations exist at:
- `apps/api/platforms/aws/endpoints/moc-instructions/upload-file/handler.ts`
- `apps/api/platforms/aws/endpoints/moc-instructions/delete-file/handler.ts`
- `apps/api/platforms/aws/endpoints/moc-instructions/upload-parts-list/handler.ts`
- `apps/api/platforms/aws/endpoints/moc-instructions/edit-presign/handler.ts`
- `apps/api/platforms/aws/endpoints/moc-instructions/edit-finalize/handler.ts`

This story migrates these endpoints to Vercel serverless functions, following the ports & adapters pattern established in STORY-015.

**Critical Constraint:** Vercel serverless functions have a **4.5MB request body limit**. Direct multipart uploads are limited to 4MB per file. Larger files MUST use the presigned URL pattern (edit-presign -> client S3 upload -> edit-finalize).

## Goal

Enable MOC file management operations via Vercel-hosted API endpoints, including file uploads (size-limited), deletion, parts list parsing, and the edit presign/finalize flow for modifying existing MOCs.

## Non-Goals

- **Download file endpoint** - Files are accessed via presigned URLs in get/list responses; no dedicated download endpoint
- **Multipart uploads >4MB** - These must use presigned URL pattern
- **OpenSearch indexing** - Deferred; edit-finalize calls OpenSearch fail-open (logged warning on failure)
- **Frontend UI** - Backend-only API migration
- **Background cleanup of orphaned uploads** - Covered by STORY-018

## Scope

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/mocs/[id]/files` | Upload file(s) via multipart (max 4MB per file) |
| DELETE | `/api/mocs/[id]/files/[fileId]` | Soft-delete file from MOC |
| POST | `/api/mocs/[id]/upload-parts-list` | Upload and parse parts list (CSV/XML) |
| POST | `/api/mocs/[id]/edit/presign` | Generate presigned URLs for edit mode |
| POST | `/api/mocs/[id]/edit/finalize` | Finalize edit with metadata and file changes |

### Packages/Apps Affected

| Path | Change |
|------|--------|
| `packages/backend/moc-instructions-core/` | Add `deleteMocFile`, `uploadPartsList`, `editPresign`, `editFinalize` functions |
| `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts` | New Vercel handler (POST) |
| `apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts` | New Vercel handler (DELETE) |
| `apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts` | New Vercel handler |
| `apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts` | New Vercel handler |
| `apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts` | New Vercel handler |
| `__http__/mocs.http` | Add HTTP test requests for STORY-016 |

## Acceptance Criteria

### Upload File Endpoint

- [ ] **AC-1:** POST `/api/mocs/:id/files` accepts multipart form data with file and `fileType` field
- [ ] **AC-2:** Maximum file size is 4MB; files >4MB return 413 with guidance to use presigned URL pattern
- [ ] **AC-3:** Maximum 10 files per request; returns 400 if exceeded
- [ ] **AC-4:** Supports per-file type mapping via `fileType_0`, `fileType_1`, etc. form fields
- [ ] **AC-5:** Files are uploaded to S3 with sanitized filenames
- [ ] **AC-6:** Database records created in `moc_files` table
- [ ] **AC-7:** Returns 201 for single file, 200 for multi-file with `uploaded[]` and `failed[]` arrays
- [ ] **AC-8:** Returns 401 if not authenticated
- [ ] **AC-9:** Returns 403 if user doesn't own the MOC
- [ ] **AC-10:** Returns 404 if MOC doesn't exist

### Delete File Endpoint

- [ ] **AC-11:** DELETE `/api/mocs/:id/files/:fileId` soft-deletes the file (sets `deletedAt`)
- [ ] **AC-12:** Updates MOC's `updatedAt` timestamp
- [ ] **AC-13:** Returns 401 if not authenticated
- [ ] **AC-14:** Returns 403 if user doesn't own the MOC
- [ ] **AC-15:** Returns 404 if MOC or file doesn't exist
- [ ] **AC-16:** Returns 404 if file belongs to different MOC

### Upload Parts List Endpoint

- [ ] **AC-17:** POST `/api/mocs/:id/upload-parts-list` accepts multipart form data with CSV or XML file
- [ ] **AC-18:** Parses CSV/XML with automatic header detection
- [ ] **AC-19:** Calculates total piece count from quantity columns
- [ ] **AC-20:** Creates `moc_files` record with type `parts-list`
- [ ] **AC-21:** Creates `moc_parts_lists` record with parsed data
- [ ] **AC-22:** Updates `moc_instructions.totalPieceCount`
- [ ] **AC-23:** Returns 201 with file record, parts list record, and parsing summary
- [ ] **AC-24:** Returns 400/422 for parse errors with detailed error messages
- [ ] **AC-25:** Returns 401 if not authenticated
- [ ] **AC-26:** Returns 403 if user doesn't own the MOC
- [ ] **AC-27:** Returns 404 if MOC doesn't exist

### Edit Presign Endpoint

- [ ] **AC-28:** POST `/api/mocs/:id/edit/presign` accepts `files` array with category, filename, size, mimeType
- [ ] **AC-29:** Maximum 20 files per request; returns 400 if exceeded
- [ ] **AC-30:** Validates file counts per category against config limits
- [ ] **AC-31:** Validates file sizes against config limits; returns 413 if exceeded
- [ ] **AC-32:** Validates MIME types against allowlist; returns 415 if invalid
- [ ] **AC-33:** Generates presigned S3 URLs with edit-specific path: `{env}/moc-instructions/{userId}/{mocId}/edit/{category}/{uuid}.{ext}`
- [ ] **AC-34:** Returns `files[]` with id, category, filename, uploadUrl, s3Key, expiresAt
- [ ] **AC-35:** Returns `sessionExpiresAt` indicating session validity
- [ ] **AC-36:** Rate limit is checked (not incremented) using shared `moc-upload` key
- [ ] **AC-37:** Returns 429 if rate limit exceeded
- [ ] **AC-38:** Returns 401 if not authenticated
- [ ] **AC-39:** Returns 403 if user doesn't own the MOC
- [ ] **AC-40:** Returns 404 if MOC doesn't exist

### Edit Finalize Endpoint

- [ ] **AC-41:** POST `/api/mocs/:id/edit/finalize` accepts metadata changes, `newFiles[]`, `removedFileIds[]`, and `expectedUpdatedAt`
- [ ] **AC-42:** Verifies new files exist in S3 via HeadObject; returns 400 if missing
- [ ] **AC-43:** Validates file content via magic bytes (first 8KB); returns 400 if mismatch
- [ ] **AC-44:** Soft-deletes removed files (sets `deletedAt`)
- [ ] **AC-45:** Updates MOC metadata atomically with optimistic locking
- [ ] **AC-46:** Moves files from `edit/` path to permanent path after transaction succeeds
- [ ] **AC-47:** Returns 409 CONCURRENT_EDIT if `expectedUpdatedAt` doesn't match
- [ ] **AC-48:** Rate limit is incremented on finalize (shared with upload)
- [ ] **AC-49:** Returns 429 if rate limit exceeded
- [ ] **AC-50:** Best-effort cleanup of edit files if transaction fails
- [ ] **AC-51:** Re-indexes OpenSearch fail-open (logs warning on failure)
- [ ] **AC-52:** Returns complete MOC data with presigned file URLs
- [ ] **AC-53:** Returns 401 if not authenticated
- [ ] **AC-54:** Returns 403 if user doesn't own the MOC or tries to remove files from another MOC
- [ ] **AC-55:** Returns 404 if MOC doesn't exist

### Core Package

- [ ] **AC-56:** Core functions in `@repo/moc-instructions-core` are platform-agnostic with dependency injection
- [ ] **AC-57:** Unit tests with >80% coverage for new functions

## Reuse Plan

### Existing Packages to Use

| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging |
| `@repo/rate-limit` | Rate limiter with Postgres store |
| `@repo/file-validator` | Magic bytes validation, file validation configs |
| `@repo/vercel-multipart` | Multipart form data parsing |
| `@repo/moc-instructions-core` | Initialize/Finalize patterns from STORY-015 |

### What Will Be Extended

| Package | Extension |
|---------|-----------|
| `@repo/moc-instructions-core` | Add `deleteMocFile`, `uploadPartsList`, `editPresign`, `editFinalize` exports |
| `@repo/moc-instructions-core` | Add parts list parser (extracted from AWS codebase) |

### New Shared Packages

None required. Parts list parsing will be added to `@repo/moc-instructions-core`.

## Architecture Notes (Ports & Adapters)

### Core Package Functions

```typescript
// packages/backend/moc-instructions-core/src/delete-moc-file.ts
export interface DeleteMocFileDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    getFile: (fileId: string, mocId: string) => Promise<MocFileRow | null>
    softDeleteFile: (fileId: string) => Promise<void>
    updateMocTimestamp: (mocId: string) => Promise<void>
  }
}

export async function deleteMocFile(
  mocId: string,
  fileId: string,
  userId: string,
  deps: DeleteMocFileDeps
): Promise<DeleteMocFileResult>

// packages/backend/moc-instructions-core/src/edit-presign.ts
export interface EditPresignDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
  }
  generatePresignedUrl: (bucket: string, key: string, contentType: string, ttlSeconds: number) => Promise<string>
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  config: UploadConfigSubset
  s3Bucket: string
  s3Region: string
}

export async function editPresign(
  mocId: string,
  userId: string,
  files: FileMetadata[],
  deps: EditPresignDeps
): Promise<EditPresignResult>
```

### Vercel Handler Pattern

```typescript
// apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Auth check
  // 2. Parse/validate request body
  // 3. Construct deps (db adapters, S3 client, rate limiter, config)
  // 4. Call core function
  // 5. Map result to HTTP response
}
```

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

**Body Size Limit:** 4.5MB max request body. Direct file uploads must be <4MB. Larger files must use presigned URL pattern.

## HTTP Contract Plan

### Required `.http` Requests

Add to `/__http__/mocs.http`:

```http
# ==============================================================================
# STORY-016: MOC File Upload Management
# ==============================================================================

### Upload single file - expect 201
# @name uploadSingleFile
POST {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/files
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="test.pdf"
Content-Type: application/pdf

<binary content>
------FormBoundary
Content-Disposition: form-data; name="fileType"

instruction
------FormBoundary--

### Delete file - expect 200
# @name deleteFile
DELETE {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/files/{{fileId}}

### Upload parts list CSV - expect 201
# @name uploadPartsListCsv
POST {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/upload-parts-list
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="file"; filename="parts.csv"
Content-Type: text/csv

PartNumber,Quantity,Color
3001,10,Red
3002,5,Blue
------FormBoundary--

### Edit presign single file - expect 200
# @name editPresignSingle
POST {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/edit/presign
Content-Type: application/json

{
  "files": [
    {
      "category": "instruction",
      "filename": "new-instructions.pdf",
      "size": 5242880,
      "mimeType": "application/pdf"
    }
  ]
}

### Edit finalize - expect 200
# @name editFinalizeSuccess
POST {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/edit/finalize
Content-Type: application/json

{
  "title": "Updated MOC Title",
  "expectedUpdatedAt": "2026-01-21T00:00:00.000Z",
  "newFiles": [],
  "removedFileIds": []
}

### Delete file not found - expect 404
# @name deleteFileNotFound
DELETE {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/files/99999999-9999-9999-9999-999999999999

### Edit presign forbidden - expect 403
# @name editPresignForbidden
POST {{baseUrl}}/api/mocs/eeeeeeee-eeee-eeee-eeee-eeeeeeee0001/edit/presign
Content-Type: application/json

{
  "files": [{ "category": "instruction", "filename": "test.pdf", "size": 1000, "mimeType": "application/pdf" }]
}

### Edit finalize concurrent edit - expect 409
# @name editFinalizeConcurrent
POST {{baseUrl}}/api/mocs/dddddddd-dddd-dddd-dddd-dddddddd0001/edit/finalize
Content-Type: application/json

{
  "title": "Updated",
  "expectedUpdatedAt": "2020-01-01T00:00:00.000Z",
  "newFiles": [],
  "removedFileIds": []
}
```

### Required Evidence

QA must capture responses for:
1. `#uploadSingleFile` - 201 with file record
2. `#deleteFile` - 200 with success message
3. `#uploadPartsListCsv` - 201 with parsing summary
4. `#editPresignSingle` - 200 with presigned URL
5. `#editFinalizeSuccess` - 200 with updated MOC
6. `#deleteFileNotFound` - 404 NOT_FOUND
7. `#editPresignForbidden` - 403 FORBIDDEN
8. `#editFinalizeConcurrent` - 409 CONCURRENT_EDIT

## Seed Requirements

### Required Entities

| Entity | Purpose | ID (deterministic) |
|--------|---------|-------------------|
| MOC "Test Upload MOC" | Happy path tests | `dddddddd-dddd-dddd-dddd-dddddddd0001` |
| MOC owned by other user | 403 ownership tests | `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` |
| File attached to test MOC | Delete tests | `ffffffff-ffff-ffff-ffff-ffffffff0001` |

### Seed Implementation

Extend `apps/api/core/database/seeds/mocs.ts`:

```typescript
// STORY-016 test data
const story016Seeds = {
  files: [
    {
      id: 'ffffffff-ffff-ffff-ffff-ffffffff0001',
      mocId: 'dddddddd-dddd-dddd-dddd-dddddddd0001',
      fileType: 'instruction',
      fileUrl: 'https://bucket.s3.amazonaws.com/test.pdf',
      originalFilename: 'test-instructions.pdf',
      mimeType: 'application/pdf',
    },
  ],
}
```

### Seed Requirements

- **Deterministic:** Uses fixed UUIDs stable across runs
- **Idempotent:** Uses upsert pattern (ON CONFLICT DO UPDATE)
- **Ownership:** `pnpm seed` must create this data

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Expected | HTTP Reference |
|----|------|----------|----------------|
| HP-1 | Single file upload | 201, file record with S3 URL | `#uploadSingleFile` |
| HP-2 | Multi-file upload (2-10 files) | 200, uploaded[] array | `#uploadMultipleFiles` |
| HP-3 | Delete existing file | 200, success message | `#deleteFile` |
| HP-4 | Upload CSV parts list | 201, parsed pieces count | `#uploadPartsListCsv` |
| HP-5 | Upload XML parts list | 201, parsed pieces count | `#uploadPartsListXml` |
| HP-6 | Edit presign single file | 200, presigned URL | `#editPresignSingle` |
| HP-7 | Edit presign multiple files | 200, all URLs | `#editPresignMultiple` |
| HP-8 | Edit finalize metadata only | 200, updated MOC | `#editFinalizeMetadataOnly` |
| HP-9 | Edit finalize with new files | 200, files moved | `#editFinalizeSuccess` |
| HP-10 | Edit finalize with removals | 200, files soft-deleted | `#editFinalizeWithRemovals` |

### Error Cases

| ID | Test | Expected | HTTP Reference |
|----|------|----------|----------------|
| ERR-1 | Upload no auth | 401 UNAUTHORIZED | `#uploadFileNoAuth` |
| ERR-2 | Upload not owner | 403 FORBIDDEN | `#uploadFileForbidden` |
| ERR-3 | Upload MOC not found | 404 NOT_FOUND | `#uploadFileNotFound` |
| ERR-4 | Upload no files | 400 BAD_REQUEST | `#uploadFileNoFiles` |
| ERR-5 | Upload >10 files | 400 BAD_REQUEST | `#uploadFileTooMany` |
| ERR-6 | Upload file >4MB | 413 PAYLOAD_TOO_LARGE | `#uploadFileTooLarge` |
| ERR-7 | Delete no auth | 401 UNAUTHORIZED | `#deleteFileNoAuth` |
| ERR-8 | Delete not owner | 403 FORBIDDEN | `#deleteFileForbidden` |
| ERR-9 | Delete file not found | 404 NOT_FOUND | `#deleteFileNotFound` |
| ERR-10 | Parts list parse error | 400/422 VALIDATION_ERROR | `#uploadPartsListInvalid` |
| ERR-11 | Edit presign no auth | 401 UNAUTHORIZED | `#editPresignNoAuth` |
| ERR-12 | Edit presign not owner | 403 FORBIDDEN | `#editPresignForbidden` |
| ERR-13 | Edit presign rate limited | 429 RATE_LIMIT_EXCEEDED | `#editPresignRateLimited` |
| ERR-14 | Edit presign file too large | 413 FILE_TOO_LARGE | `#editPresignFileTooLarge` |
| ERR-15 | Edit presign invalid MIME | 415 INVALID_MIME_TYPE | `#editPresignInvalidMime` |
| ERR-16 | Edit finalize no auth | 401 UNAUTHORIZED | `#editFinalizeNoAuth` |
| ERR-17 | Edit finalize not owner | 403 FORBIDDEN | `#editFinalizeForbidden` |
| ERR-18 | Edit finalize concurrent | 409 CONCURRENT_EDIT | `#editFinalizeConcurrent` |
| ERR-19 | Edit finalize file missing | 400 VALIDATION_ERROR | `#editFinalizeFileMissing` |
| ERR-20 | Edit finalize rate limited | 429 RATE_LIMIT_EXCEEDED | `#editFinalizeRateLimited` |

### Edge Cases

| ID | Test | Expected |
|----|------|----------|
| EDGE-1 | Upload unicode filename | 201, sanitized S3 key |
| EDGE-2 | Upload path traversal filename | 201, safe S3 key |
| EDGE-3 | Multi-file partial failures | 200, uploaded[] + failed[] |
| EDGE-4 | Parts list empty file | 400 VALIDATION_ERROR |
| EDGE-5 | Parts list 0 parts | 201, totalPieceCount=0 |
| EDGE-6 | Edit finalize S3 cleanup on failure | Edit files deleted |
| EDGE-7 | Edit finalize file move | Files at permanent path |

### Evidence Requirements

- **Unit tests:** `pnpm test packages/backend/moc-instructions-core` - all pass
- **HTTP executions:** All `#story016*` requests executed with captured responses
- **Database verification:** `moc_files` records created/deleted as expected

---

## Token Budget

### Phase Summary

| Phase | Agent | Sub-Agents | Est. Input | Est. Output | Est. Total | Actual | Cost |
|-------|-------|------------|------------|-------------|------------|--------|------|
| **PM Phase** | | | | | | | |
| Story Generation | PM | — | 20k | 5k | 25k | — | — |
| Test Plan | pm-draft-test-plan | — | 25k | 2k | 27k | — | — |
| Dev Feasibility | pm-dev-feasibility | Explore | 30k | 2k | 32k | — | — |
| UI/UX Notes | PM | — | 15k | 0.5k | 15.5k | — | — |
| Elaboration | elab-story | Explore | 25k | 1.5k | 26.5k | — | — |
| **Dev Phase** | | | | | | | |
| Implementation | dev-implement | Explore, code-reviewer | 60k | 25k | 85k | — | — |
| Proof | dev-implement | — | 35k | 4k | 39k | — | — |
| **QA Phase** | | | | | | | |
| Code Review | code-reviewer | — | 45k | 2k | 47k | — | — |
| QA Verification | qa-verify | Explore | 40k | 3k | 43k | — | — |
| **Total** | — | — | **295k** | **45k** | **340k** | **—** | **—** |

### Output Artifacts (Actual)

| Artifact | Bytes | Tokens (est) | Phase |
|----------|-------|--------------|-------|
| STORY-016.md | 18,397 | ~4,600 | PM: Story Gen |
| _pm/TEST-PLAN.md | 7,693 | ~1,900 | PM: Test Plan |
| _pm/DEV-FEASIBILITY.md | 6,373 | ~1,600 | PM: Feasibility |
| _pm/UIUX-NOTES.md | 1,301 | ~300 | PM: UI/UX |
| _pm/BLOCKERS.md | 1,662 | ~400 | PM: Blockers |
| ELAB-STORY-016.md | 5,691 | ~1,400 | PM: Elaboration |
| PROOF-STORY-016.md | — | — | Dev: Proof |
| CODE-REVIEW-STORY-016.md | — | — | QA: Review |
| QA-VERIFY-STORY-016.md | — | — | QA: Verify |
| **Total PM Output** | **41,117** | **~10,200** | — |

### Sub-Agent Tracking

Track token usage for each sub-agent spawned during this story.

| Date | Phase | Parent Agent | Sub-Agent | Task | Input | Output | Cost |
|------|-------|--------------|-----------|------|-------|--------|------|
| — | PM: Feasibility | PM | Explore | Find AWS handlers | — | — | — |
| — | Dev: Implement | Dev | Explore | Find related code | — | — | — |
| — | Dev: Implement | Dev | code-reviewer | Review changes | — | — | — |
| — | QA: Verify | QA | Explore | Verify implementation | — | — | — |

### Actual Measurements

**Instructions:** Before each phase, run `/cost` and record. After phase, record delta.

| Date | Phase | Before `/cost` | After `/cost` | Delta | Sub-Agents Used | Notes |
|------|-------|----------------|---------------|-------|-----------------|-------|
| — | PM: Story Gen | — | — | — | — | — |
| — | PM: Test Plan | — | — | — | — | — |
| — | PM: Feasibility | — | — | — | Explore | — |
| — | PM: Elaboration | — | — | — | Explore | — |
| — | Dev: Implement | — | — | — | Explore, code-reviewer | — |
| — | Dev: Proof | — | — | — | — | — |
| — | QA: Code Review | — | — | — | — | — |
| — | QA: Verify | — | — | — | Explore | — |

### High-Cost Operations to Watch

| Operation | Why Expensive | Tokens Est. |
|-----------|---------------|-------------|
| Reading serverless.yml | 70KB file | ~18k |
| Reading AWS handlers (5 files) | ~50KB total | ~12k |
| Explore agent for codebase search | Full context copy | ~25k base |
| code-reviewer agent | Full context + diff | ~30k base |
| Reading existing moc-instructions-core | ~20KB | ~5k |

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | PM | Story generated from index entry STORY-016 |
