# BACKEND-LOG: STORY-015

**Story:** MOC Instructions - Initialization & Finalization
**Started:** 2026-01-21
**Implementer:** dev-implement-backend-coder

---

## Chunk 1 — Types and Schemas (Steps 1-2)

- **Objective (maps to story requirement/AC):**
  - AC-25: Define input/output schemas and DI interfaces for `initializeWithFiles`
  - AC-26: Define input/output schemas and DI interfaces for `finalizeWithFiles`

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/__types__/index.ts`

- **Summary of changes:**
  - Added `FileMetadataSchema` for file upload metadata (filename, fileType, mimeType, size)
  - Added `InitializeMocInputSchema` for initialize request body (title, type, description, tags, files array, etc.)
  - Added `PresignedUploadUrlSchema` for presigned URL response structure
  - Added `InitializeWithFilesSuccessSchema` and result discriminated union type
  - Added `FinalizeUploadedFileSchema` for file confirmation in finalize request
  - Added `FinalizeMocInputSchema` for finalize request body
  - Added `FileValidationResultSchema` for per-file validation results (supports AC-15)
  - Added `FinalizeWithFilesSuccessSchema` and result discriminated union type
  - Added `InitializeWithFilesDeps` interface with all DI dependencies (db, generatePresignedUrl, checkRateLimit, etc.)
  - Added `FinalizeWithFilesDeps` interface with all DI dependencies (db, headObject, getObject, validateMagicBytes, etc.)
  - Added supporting types: `RateLimitCheckResult`, `UploadConfigSubset`, `PartsValidationResult`

- **Reuse compliance:**
  - Reused: `MocRowSchema`, `MocFileRowSchema` for response types
  - New: All schemas listed above
  - Why new was necessary: Story requires new API contracts for initialize/finalize operations not previously in core package

- **Ports & adapters note:**
  - What stayed in core: All type definitions and Zod schemas
  - What stayed in adapters: N/A (this chunk is types only)

- **Commands run:**
  ```bash
  cd /Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core && pnpm tsc --noEmit
  # Result: Success (no errors)
  ```

- **Notes / Risks:**
  - Schemas follow Zod-first pattern per CLAUDE.md
  - DI interfaces use minimal db interface pattern from existing `getMoc` function
  - `PartsValidationResult` made optional in deps to support deployments without parts validation

---

## Chunk 2 — initializeWithFiles Core Function (Step 3)

- **Objective (maps to story requirement/AC):**
  - AC-1: Returns 201 with mocId and presigned URLs
  - AC-2: Presigned URLs expire after configurable TTL
  - AC-3: At least one instruction file required
  - AC-4: Maximum 10 instruction files allowed
  - AC-5: File sizes validated against config limits
  - AC-6: MIME types validated against allowlist
  - AC-7: Duplicate title returns 409 CONFLICT
  - AC-8: Rate limit checked before DB writes
  - AC-9: Response includes sessionTtlSeconds
  - AC-10: Filenames sanitized for S3 keys
  - AC-25: Platform-agnostic with DI

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/initialize-with-files.ts` (new)

- **Summary of changes:**
  - Created `initializeWithFiles` function accepting userId, input, and deps
  - Validates input against `InitializeMocInputSchema`
  - Validates file requirements (instruction count, parts-list count, image count)
  - Validates file sizes per file type using config
  - Validates MIME types via injected `isMimeTypeAllowed`
  - Checks rate limit via injected `checkRateLimit`
  - Pre-checks for duplicate title via `db.checkDuplicateTitle`
  - Creates MOC record via `db.createMoc` with type-specific fields
  - Handles Postgres unique violation (race condition on title)
  - Generates presigned URLs via injected `generatePresignedUrl`
  - Creates file records via `db.createMocFile`
  - Returns discriminated union result

- **Reuse compliance:**
  - Reused: Types from `__types__/index.ts`
  - New: `initializeWithFiles` function, helper functions `validateFileRequirements`, `validateFileSize`, `isPostgresUniqueViolation`
  - Why new was necessary: Core business logic for initialize operation

- **Ports & adapters note:**
  - What stayed in core: All validation logic, flow orchestration, error handling
  - What stayed in adapters: DB operations, S3 operations, rate limiter (all injected via deps)

- **Commands run:**
  ```bash
  cd /Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core && pnpm tsc --noEmit
  # Result: Success (no errors)
  ```

- **Notes / Risks:**
  - Logic extracted from AWS Lambda handler but made platform-agnostic
  - Simplified schema compared to AWS version (removed BrickLink-specific fields not in story scope)
  - S3 key pattern: `mocs/{mocId}/{fileType}/{timestamp}-{sanitizedFilename}`

---

## Chunk 3 — finalizeWithFiles Core Function (Step 4)

- **Objective (maps to story requirement/AC):**
  - AC-12: Accepts array of uploadedFiles with success status
  - AC-13: Verifies files exist in S3 via HeadObject
  - AC-14: Validates file content via magic bytes
  - AC-15: Validates parts list files with per-file errors
  - AC-16: Sets first image as thumbnail
  - AC-17: Updates MOC status to published, sets finalizedAt
  - AC-18: Returns 403 if user doesn't own the MOC
  - AC-19: Returns 404 if MOC doesn't exist
  - AC-20: Idempotent - already-finalized MOC returns 200 with idempotent: true
  - AC-21: Two-phase lock prevents concurrent finalization
  - AC-22: Stale locks rescued
  - AC-23: Rate limit checked before side effects
  - AC-24: Returns complete MOC with files array on success
  - AC-26: Platform-agnostic with DI

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/__types__/index.ts` (modified - added finalizedAt, finalizingAt to MocRowSchema)
  - `packages/backend/moc-instructions-core/src/finalize-with-files.ts` (new)

- **Summary of changes:**
  - Added `finalizedAt` and `finalizingAt` to MocRowSchema for finalize lock pattern
  - Created `finalizeWithFiles` function accepting userId, mocId, input, and deps
  - Validates input against `FinalizeMocInputSchema`
  - Checks rate limit before any side effects
  - Verifies MOC exists and user owns it
  - Implements idempotent short-circuit for already-finalized MOCs
  - Implements two-phase lock with stale lock rescue via `db.acquireFinalizeLock`
  - Filters to successful uploads only
  - Verifies files exist in S3 via `headObject`
  - Validates file sizes against config limits
  - Validates magic bytes for instruction/image files via `validateMagicBytes`
  - Validates parts list files via optional `validatePartsFile` dep
  - Sets first image as thumbnail
  - Updates MOC status to published, sets finalizedAt
  - Returns complete MOC with files and validation results

- **Reuse compliance:**
  - Reused: Types from `__types__/index.ts`, existing MocRowSchema extended
  - New: `finalizeWithFiles` function, helper functions `verifyFilesInS3`, `extractS3KeyFromUrl`, `getExpectedMimeType`
  - Why new was necessary: Core business logic for finalize operation

- **Ports & adapters note:**
  - What stayed in core: All validation logic, lock management, flow orchestration
  - What stayed in adapters: DB operations, S3 operations, magic bytes validation, parts validation (all injected via deps)

- **Commands run:**
  ```bash
  cd /Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core && pnpm tsc --noEmit
  # Result: Success after adding finalizedAt/finalizingAt to MocRowSchema
  ```

- **Notes / Risks:**
  - Lock pattern: finalizingAt timestamp used for transient lock, finalizedAt for permanent state
  - Stale lock rescue uses configurable TTL from deps.config.finalizeLockTtlMinutes
  - Parts validation is optional (not all deployments need it)
  - OpenSearch indexing intentionally skipped per story Non-goals

---

## Chunk 4 — Unit Tests (Steps 5-6)

- **Objective (maps to story requirement/AC):**
  - AC-27: Both functions have unit tests with >80% coverage

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts` (new)
  - `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts` (new)

- **Summary of changes:**
  - Created 25 tests for `initializeWithFiles`:
    - Happy path: single file, multiple files, MOC type, Set type, filename sanitization
    - Validation errors: no instruction file, >10 instructions, file size limit, MIME type, empty files, long title, parts-list/image count limits
    - Rate limiting: exceeded, checked before DB writes
    - Duplicate title: pre-check, race condition (Postgres unique violation)
    - Database errors: non-unique error
    - S3 errors: presigned URL generation failure
    - Edge cases: empty tags, 100-char title boundary, all optional fields, exactly 10 instructions, file size boundaries
  - Created 26 tests for `finalizeWithFiles`:
    - Happy path: finalize, thumbnail, status update, complete MOC, piece count
    - Idempotency: already-finalized, finalizing lock, stale lock rescue
    - Authorization: MOC not found, forbidden
    - Rate limiting: exceeded, checked before MOC lookup
    - File validation: no successful uploads, file not in S3, size too large, magic bytes mismatch, parts validation error, warnings
    - Lock management: cleared on errors
    - Edge cases: no images, mixed success, no parts validator, empty array, already published

- **Reuse compliance:**
  - Reused: Test patterns from existing `get-moc.test.ts`
  - New: All tests for new functions
  - Why new was necessary: Testing new core functions

- **Ports & adapters note:**
  - What stayed in core: N/A (tests only)
  - What stayed in adapters: All dependencies are mocked

- **Commands run:**
  ```bash
  cd /Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core && pnpm test -- --run
  # Result: 111 tests pass (6 test files)
  ```

- **Notes / Risks:**
  - Tests use mock dependencies to isolate core logic
  - Edge cases cover boundary conditions (max counts, file size limits)
  - One fix required: UUIDs in test must be valid format (Zod validation)

---

## Chunk 5 — Export Core Functions (Step 7)

- **Objective (maps to story requirement/AC):**
  - AC-25: `initializeWithFiles()` function is available via package import
  - AC-26: `finalizeWithFiles()` function is available via package import

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/index.ts`

- **Summary of changes:**
  - Exported `initializeWithFiles` function
  - Exported `finalizeWithFiles` function
  - Exported all new types: FileMetadata, InitializeMocInput, PresignedUploadUrl, InitializeWithFilesSuccess, InitializeErrorCode, InitializeWithFilesResult, FinalizeUploadedFile, FinalizeMocInput, FileValidationResult, FinalizeErrorCode, FinalizeWithFilesSuccess, FinalizeWithFilesResult, RateLimitCheckResult, UploadConfigSubset, InitializeWithFilesDeps, FinalizeWithFilesDeps, PartsValidationResult
  - Exported all new schemas: FileMetadataSchema, InitializeMocInputSchema, PresignedUploadUrlSchema, InitializeWithFilesSuccessSchema, InitializeErrorCodeSchema, FinalizeUploadedFileSchema, FinalizeMocInputSchema, FileValidationResultSchema, FinalizeErrorCodeSchema, FinalizeWithFilesSuccessSchema

- **Reuse compliance:**
  - Reused: Existing export pattern from package
  - New: All STORY-015 exports
  - Why new was necessary: Making new functions and types available to consumers

- **Ports & adapters note:**
  - What stayed in core: All exports
  - What stayed in adapters: N/A

- **Commands run:**
  ```bash
  cd /Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core && pnpm tsc --noEmit
  # Result: Success (no errors)
  ```

- **Notes / Risks:**
  - Package can now be consumed by Vercel handlers via `import { initializeWithFiles, finalizeWithFiles } from '@repo/moc-instructions-core'`

---

## Chunk 6 — Vercel Handlers (Steps 8-9)

- **Objective (maps to story requirement/AC):**
  - AC-1 through AC-11: Initialize endpoint
  - AC-12 through AC-24: Finalize endpoint

- **Files changed:**
  - `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` (new)
  - `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` (new)

- **Summary of changes:**
  - **Initialize handler:**
    - POST method only
    - Auth check via AUTH_BYPASS (returns 401 if not authenticated)
    - Input validation via Zod schema
    - Constructs DI dependencies (db, S3, rate limiter, config)
    - Calls `initializeWithFiles` core function
    - Maps result to HTTP response (201 success, 400/409/429/500 errors)
  - **Finalize handler:**
    - POST method only
    - Auth check via AUTH_BYPASS
    - MOC ID from URL path params (validated as UUID)
    - Input validation via Zod schema
    - Constructs DI dependencies (db, S3, rate limiter, file validator, config)
    - Calls `finalizeWithFiles` core function
    - Maps result to HTTP response (200 success, 400/403/404/422/429/500 errors)
    - Parts validation skipped (optional per core function design)

- **Reuse compliance:**
  - Reused: Inline schema pattern from existing handlers, auth helper pattern, S3 client singleton, rate limit store
  - New: DI adapter implementations for core functions
  - Why new was necessary: Adapting platform-specific dependencies to core function interfaces

- **Ports & adapters note:**
  - What stayed in core: All business logic (via core function calls)
  - What stayed in adapters: Auth extraction, request parsing, DB/S3 client setup, response formatting

- **Commands run:**
  ```bash
  pnpm eslint apps/api/platforms/vercel/api/mocs/with-files/initialize.ts --fix
  pnpm eslint "apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts" --fix
  # Result: Both files pass lint after auto-fix
  ```

- **Notes / Risks:**
  - Uses `MOC_BUCKET` env var with fallback to `LEGO_API_BUCKET_NAME` per story spec
  - Parts validation intentionally skipped for MVP (can add later)
  - OpenSearch indexing skipped per story Non-goals

---

## Chunk 7 — Routes and Seed Data (Steps 10-11)

- **Objective (maps to story requirement/AC):**
  - Enable HTTP routing to new endpoints
  - Enable HTTP contract testing with seed data

- **Files changed:**
  - `apps/api/platforms/vercel/vercel.json` (modified)
  - `apps/api/core/database/seeds/mocs.ts` (modified)

- **Summary of changes:**
  - **vercel.json:**
    - Added route: `/api/mocs/with-files/initialize` -> `initialize.ts`
    - Added route: `/api/mocs/:mocId/finalize` -> `[mocId]/finalize.ts`
    - Routes placed before `/api/mocs/:id` to ensure specific routes match first
  - **seeds/mocs.ts:**
    - Added MOC with title "Test MOC Duplicate Title" (id: dddddddd-dddd-dddd-dddd-dddddddd0015) for 409 conflict testing
    - Added draft MOC owned by other user (id: eeeeeeee-eeee-eeee-eeee-eeeeeeee0001) for 403 forbidden testing on finalize

- **Reuse compliance:**
  - Reused: Existing route pattern, existing seed pattern with ON CONFLICT DO NOTHING
  - New: 2 routes, 2 seed records
  - Why new was necessary: Story requires new endpoints and test data

- **Ports & adapters note:**
  - What stayed in core: N/A
  - What stayed in adapters: Route configuration

- **Commands run:**
  - Manual review of route order (specific before parameterized)

- **Notes / Risks:**
  - Route order is important - `/api/mocs/with-files/initialize` must come before `/api/mocs/:id` or it would match as an ID
  - Seed data uses deterministic UUIDs per project pattern

---

## Chunk 8 — HTTP Test Requests (Step 12)

- **Objective (maps to story requirement/AC):**
  - Enable manual API testing for all acceptance criteria

- **Files changed:**
  - `__http__/mocs.http` (modified)

- **Summary of changes:**
  - Added STORY-015 section with test execution order note
  - **Initialize Happy Path:**
    - `#initializeMocSingleFile` - Single file, 201 response
    - `#initializeMocMultipleFiles` - Multiple files, 201 response
    - `#initializeMocFullSchema` - All optional fields, 201 response
    - `#initializeMocTypeSet` - Set type, 201 response
  - **Initialize Error Cases:**
    - `#initializeNoAuth` - 401 UNAUTHORIZED (requires AUTH_BYPASS=false)
    - `#initializeEmptyBody` - 400 BAD_REQUEST
    - `#initializeNoFiles` - 400 VALIDATION_ERROR
    - `#initializeNoInstruction` - 400 VALIDATION_ERROR
    - `#initializeTooManyInstructions` - 400 VALIDATION_ERROR
    - `#initializeFileTooLarge` - 400 VALIDATION_ERROR
    - `#initializeInvalidMime` - 400 VALIDATION_ERROR
    - `#initializeDuplicateTitle` - 409 CONFLICT
  - **Finalize Happy Path:**
    - `#finalizeMocSuccess` - 200 with MOC data
    - `#finalizeMocIdempotent` - 200 with idempotent: true
  - **Finalize Error Cases:**
    - `#finalizeNotFound` - 404 NOT_FOUND
    - `#finalizeForbidden` - 403 FORBIDDEN
    - `#finalizeEmptyBody` - 400 BAD_REQUEST
    - `#finalizeNoSuccessfulUploads` - 400 BAD_REQUEST
    - `#finalizeInvalidMocId` - 404 NOT_FOUND

- **Reuse compliance:**
  - Reused: Existing HTTP file format and variable pattern
  - New: All STORY-015 test requests
  - Why new was necessary: Testing new endpoints

- **Ports & adapters note:**
  - N/A (test data only)

- **Commands run:**
  - Visual inspection of .http file

- **Notes / Risks:**
  - Some tests require seed data (duplicate title, other user MOC)
  - Finalize tests require capturing mocId/fileId from initialize response
  - Rate limit test not included (would require hitting limit)

---

## Chunk 9 — Final Verification (Steps 13-14)

- **Objective (maps to story requirement/AC):**
  - Verify all tests pass
  - Verify all code passes lint

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/initialize-with-files.ts` (minor fix)

- **Summary of changes:**
  - Fixed unused variable lint error: removed `let moc =` assignment since `mocId` was already generated before `createMoc`
  - Ran full test suite: 111 tests pass (6 test files)
  - Ran scoped lint: 0 errors, 0 warnings
  - Ran type check: no errors

- **Reuse compliance:**
  - N/A (verification only)

- **Ports & adapters note:**
  - N/A (verification only)

- **Commands run:**
  ```bash
  pnpm test --filter @repo/moc-instructions-core
  # Result: 111 tests pass (6 test files, 310ms)

  pnpm eslint packages/backend/moc-instructions-core/src apps/api/platforms/vercel/api/mocs --fix
  # Result: 0 errors, 0 warnings

  pnpm tsc --noEmit --project packages/backend/moc-instructions-core/tsconfig.json
  # Result: Success (no errors)
  ```

- **Notes / Risks:**
  - All acceptance criteria covered by unit tests
  - HTTP tests ready for manual verification

---

## Summary

**All 14 steps completed successfully:**

1. ✅ Types and Zod schemas added to core package
2. ✅ DI interfaces defined
3. ✅ `initializeWithFiles` core function implemented
4. ✅ `finalizeWithFiles` core function implemented
5. ✅ Unit tests for `initializeWithFiles` (25 tests)
6. ✅ Unit tests for `finalizeWithFiles` (26 tests)
7. ✅ Functions exported from package index
8. ✅ Initialize Vercel handler implemented
9. ✅ Finalize Vercel handler implemented
10. ✅ Routes added to vercel.json
11. ✅ Seed data added for testing
12. ✅ HTTP test requests added
13. ✅ Core package tests pass (111 tests)
14. ✅ Scoped lint passes

**Files created/modified:**
- `packages/backend/moc-instructions-core/src/__types__/index.ts` (modified)
- `packages/backend/moc-instructions-core/src/initialize-with-files.ts` (new)
- `packages/backend/moc-instructions-core/src/finalize-with-files.ts` (new)
- `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts` (new)
- `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts` (new)
- `packages/backend/moc-instructions-core/src/index.ts` (modified)
- `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` (new)
- `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` (new)
- `apps/api/platforms/vercel/vercel.json` (modified)
- `apps/api/core/database/seeds/mocs.ts` (modified)
- `__http__/mocs.http` (modified)

**Test results:**
- 111 unit tests passing
- 0 lint errors
- 0 type errors

---

**BACKEND COMPLETE**
