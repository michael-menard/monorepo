# TEST-PLAN: STORY-015 - MOC Instructions Initialization & Finalization

## Overview

This test plan covers the two-phase MOC creation flow with file uploads:
1. **Initialize** (`POST /api/mocs/with-files/initialize`) - Creates MOC record and returns presigned S3 URLs
2. **Finalize** (`POST /api/mocs/:mocId/finalize`) - Confirms uploads and finalizes MOC record

## Test Categories

### Happy Path Tests

#### HP-1: Initialize MOC with Single Instruction File
- **Input:** Valid MOC metadata + 1 instruction file (PDF, 5MB)
- **Expected:** 201, mocId returned, 1 presigned URL with 5-minute expiry
- **HTTP:** `/__http__/mocs.http#initializeMocSingleFile`

#### HP-2: Initialize MOC with Multiple Files
- **Input:** Valid MOC metadata + instruction PDF + parts list CSV + thumbnail image
- **Expected:** 201, mocId returned, 3 presigned URLs with correct file types
- **HTTP:** `/__http__/mocs.http#initializeMocMultipleFiles`

#### HP-3: Finalize MOC After Successful Upload
- **Precondition:** HP-2 completed, files uploaded to S3 via presigned URLs
- **Input:** `uploadedFiles: [{ fileId, success: true }, ...]`
- **Expected:** 200, MOC status = 'published', thumbnail set to first image, indexed in OpenSearch
- **HTTP:** `/__http__/mocs.http#finalizeMocSuccess`

#### HP-4: Finalize MOC - Idempotent Retry
- **Precondition:** HP-3 completed (MOC already finalized)
- **Input:** Same finalize request
- **Expected:** 200, `idempotent: true`, returns same MOC data
- **HTTP:** `/__http__/mocs.http#finalizeMocIdempotent`

#### HP-5: Initialize MOC with All Optional Fields
- **Input:** Full MOC schema with designer, dimensions, instructionsMetadata, alternateBuild, features, sourcePlatform
- **Expected:** 201, all fields persisted correctly
- **HTTP:** `/__http__/mocs.http#initializeMocFullSchema`

#### HP-6: Initialize MOC Type 'set' (Not 'moc')
- **Input:** `type: 'set'` with brand, releaseYear, retired fields
- **Expected:** 201, type-specific fields populated correctly
- **HTTP:** `/__http__/mocs.http#initializeMocTypeSet`

### Error Cases

#### ERR-1: Initialize Without Authentication
- **Input:** No auth token
- **Expected:** 401 UNAUTHORIZED
- **HTTP:** `/__http__/mocs.http#initializeNoAuth`

#### ERR-2: Initialize Without Request Body
- **Input:** Empty body
- **Expected:** 400 BAD_REQUEST
- **HTTP:** `/__http__/mocs.http#initializeEmptyBody`

#### ERR-3: Initialize Without Files Array
- **Input:** MOC metadata without `files` array
- **Expected:** 400 VALIDATION_ERROR, "At least one file is required"
- **HTTP:** `/__http__/mocs.http#initializeNoFiles`

#### ERR-4: Initialize Without Instruction File
- **Input:** Files array with only thumbnail (no instruction file)
- **Expected:** 400 BAD_REQUEST, "At least one instruction file is required"
- **HTTP:** `/__http__/mocs.http#initializeNoInstruction`

#### ERR-5: Initialize Exceeds Max Instruction Files (>10)
- **Input:** 11 instruction files
- **Expected:** 400 BAD_REQUEST, "Maximum 10 instruction files allowed"
- **HTTP:** `/__http__/mocs.http#initializeTooManyInstructions`

#### ERR-6: Initialize File Exceeds Size Limit
- **Input:** Instruction file size: 150MB (limit: 100MB)
- **Expected:** 400 BAD_REQUEST, "File exceeds size limit"
- **HTTP:** `/__http__/mocs.http#initializeFileTooLarge`

#### ERR-7: Initialize Invalid MIME Type
- **Input:** Instruction file with mimeType: 'text/plain'
- **Expected:** 400 BAD_REQUEST, "Invalid MIME type"
- **HTTP:** `/__http__/mocs.http#initializeInvalidMime`

#### ERR-8: Initialize Duplicate Title
- **Input:** Title that already exists for this user
- **Expected:** 409 CONFLICT, "A MOC with this title already exists"
- **HTTP:** `/__http__/mocs.http#initializeDuplicateTitle`

#### ERR-9: Initialize Rate Limit Exceeded
- **Precondition:** User has exceeded daily upload limit
- **Input:** Valid initialize request
- **Expected:** 429 TOO_MANY_REQUESTS, includes retryAfterSeconds
- **HTTP:** `/__http__/mocs.http#initializeRateLimited`

#### ERR-10: Finalize Non-Existent MOC
- **Input:** mocId that doesn't exist
- **Expected:** 404 NOT_FOUND
- **HTTP:** `/__http__/mocs.http#finalizeNotFound`

#### ERR-11: Finalize Other User's MOC
- **Input:** mocId owned by different user
- **Expected:** 403 FORBIDDEN, "You do not own this MOC"
- **HTTP:** `/__http__/mocs.http#finalizeForbidden`

#### ERR-12: Finalize Without Body
- **Input:** Empty body
- **Expected:** 400 BAD_REQUEST
- **HTTP:** `/__http__/mocs.http#finalizeEmptyBody`

#### ERR-13: Finalize No Successful Uploads
- **Input:** `uploadedFiles: [{ fileId, success: false }]`
- **Expected:** 400 BAD_REQUEST, "No files were successfully uploaded"
- **HTTP:** `/__http__/mocs.http#finalizeNoSuccessfulUploads`

#### ERR-14: Finalize File Not Found in S3
- **Input:** fileId that doesn't exist in S3
- **Expected:** 400 BAD_REQUEST, "File was not uploaded successfully"
- **HTTP:** `/__http__/mocs.http#finalizeFileNotInS3`

#### ERR-15: Finalize File Magic Bytes Mismatch
- **Input:** File claimed to be PDF but contains JPEG magic bytes
- **Expected:** 422 INVALID_TYPE, "File content does not match expected type"
- **HTTP:** `/__http__/mocs.http#finalizeMagicBytesMismatch`

#### ERR-16: Finalize Parts List Validation Error
- **Input:** Parts list CSV with invalid format
- **Expected:** 422 PARTS_VALIDATION_ERROR, includes per-file errors
- **HTTP:** `/__http__/mocs.http#finalizePartsValidationError`

### Edge Cases

#### EDGE-1: Initialize With Very Long Title (100 chars exactly)
- **Input:** Title exactly at 100 character limit
- **Expected:** 201, title accepted
- **HTTP:** `/__http__/mocs.http#initializeMaxTitle`

#### EDGE-2: Initialize With Unicode Filename
- **Input:** Filename with Unicode: "指示書.pdf"
- **Expected:** 201, filename sanitized for S3 key
- **HTTP:** `/__http__/mocs.http#initializeUnicodeFilename`

#### EDGE-3: Initialize With Special Characters in Filename
- **Input:** Filename: "../../../etc/passwd.pdf"
- **Expected:** 201, path traversal sanitized, safe S3 key generated
- **HTTP:** `/__http__/mocs.http#initializePathTraversal`

#### EDGE-4: Finalize During Concurrent Request
- **Input:** Two finalize requests at the same time
- **Expected:** One succeeds with 200, other gets 200 with `idempotent: true` or `status: 'finalizing'`
- **HTTP:** `/__http__/mocs.http#finalizeConcurrent`

#### EDGE-5: Finalize With Stale Lock
- **Precondition:** finalizingAt timestamp older than lock TTL (5 minutes)
- **Input:** Finalize request
- **Expected:** 200, lock rescued, finalization proceeds
- **HTTP:** N/A (requires time manipulation in test)

#### EDGE-6: Initialize With Maximum File Count
- **Input:** 10 instruction files + configured max parts lists + configured max images
- **Expected:** 201, all files registered
- **HTTP:** `/__http__/mocs.http#initializeMaxFiles`

#### EDGE-7: Finalize With Partial Upload Success
- **Input:** 3 files total, 2 success: true, 1 success: false
- **Expected:** 200, only 2 files verified
- **HTTP:** `/__http__/mocs.http#finalizePartialSuccess`

#### EDGE-8: Initialize With Empty Tags Array
- **Input:** `tags: []`
- **Expected:** 201, tags stored as empty array
- **HTTP:** `/__http__/mocs.http#initializeEmptyTags`

#### EDGE-9: Initialize MOC Then Never Finalize (Orphan)
- **Input:** Initialize MOC, upload files, never call finalize
- **Expected:** MOC remains in draft state, finalizedAt = null
- **Note:** Cleanup handled by STORY-018 (Background Jobs)

## Unit Test Coverage Requirements

### Core Package: `packages/backend/moc-instructions-core`

New functions to add and test:
- `initializeMocWithFiles(input, dbClient, s3Client)` - Core initialization logic
- `finalizeMocWithFiles(input, dbClient, s3Client)` - Core finalization logic

Each function must have:
- Happy path test
- Validation error tests
- Authorization tests (via dependency injection)

### Handler Tests

- Initialize handler: input validation, rate limiting, duplicate title check
- Finalize handler: ownership check, idempotency, lock acquisition

## Evidence Requirements

### Required `.http` Executions

All requests in `/__http__/mocs.http` under the STORY-015 section must be executed and responses captured:

1. `#initializeMocSingleFile` - 201 response with mocId and uploadUrls
2. `#finalizeMocSuccess` - 200 response with complete MOC data
3. `#initializeNoAuth` - 401 response
4. `#finalizeForbidden` - 403 response
5. `#initializeDuplicateTitle` - 409 response

### Test Command Outputs

```bash
pnpm test packages/backend/moc-instructions-core
pnpm test apps/api/platforms/vercel/api/moc-instructions
```

### Database State Verification

After finalize:
- `moc_instructions` table: `finalized_at` NOT NULL, `finalizing_at` NULL
- `moc_files` table: all registered files have correct `moc_id` FK
- First image type updated to 'thumbnail'

## Seed Requirements

### Required Seed Data

Story requires the following seed data for testing:

1. **Existing MOC for duplicate title test:**
   - Title: "Test MOC Duplicate Title"
   - userId: dev-user-00000000-0000-0000-0000-000000000001
   - status: 'published'

2. **Existing MOC owned by other user (for 403 test):**
   - userId: other-user-00000000-0000-0000-0000-000000000002
   - status: 'draft'

Seed location: `apps/api/core/database/seeds/mocs.ts`

Seed must be:
- Deterministic (same IDs on each run)
- Idempotent (safe to run multiple times via upsert)
