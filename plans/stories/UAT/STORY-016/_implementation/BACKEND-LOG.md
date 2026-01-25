# BACKEND-LOG: STORY-016 - MOC File Upload Management

## Overview
Implementation log for STORY-016 backend work: Migrate MOC File Upload, Delete, Parts List, and Edit Presign/Finalize Endpoints to Vercel.

---

## Chunk 1 — Core Types for Delete and Edit Operations

- **Objective (maps to story requirement/AC):**
  - AC-56: Core functions in `@repo/moc-instructions-core` are platform-agnostic with dependency injection
  - Define Zod schemas and TypeScript interfaces for:
    - `deleteMocFile` function and its dependencies
    - `editPresign` function and its dependencies
    - `editFinalize` function and its dependencies
    - `uploadPartsList` function and its dependencies

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/__types__/index.ts`

- **Summary of changes:**
  - Added `DeleteMocFileDeps` interface for DI
  - Added `DeleteMocFileResult` discriminated union type
  - Added `UploadPartsListDeps` interface for DI
  - Added `UploadPartsListResult` discriminated union type
  - Added `EditPresignDeps` interface for DI
  - Added `EditPresignResult` discriminated union type
  - Added `EditFinalizeDeps` interface for DI
  - Added `EditFinalizeResult` discriminated union type
  - Added Zod schemas for request/response validation

- **Reuse compliance:**
  - Reused: Existing `MocRow`, `MocFileRow`, `RateLimitCheckResult`, `UploadConfigSubset` types
  - New: DI interfaces and result types for new functions
  - Why new was necessary: New functions require specific dependency contracts

- **Ports & adapters note:**
  - What stayed in core: Business logic types, validation schemas
  - What stayed in adapters: N/A (types only)

- **Commands run:**
  - `pnpm check-types --filter @repo/moc-instructions-core`

- **Notes / Risks:**
  - Following STORY-015 DI patterns exactly

---

## Chunk 2 — Parts List Parser Core Module

- **Objective (maps to story requirement/AC):**
  - AC-18: Parses CSV/XML with automatic header detection
  - AC-19: Calculates total piece count from quantity columns
  - Support CSV and XML parts list file formats

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/parts-list-parser.ts` (new)
  - `packages/backend/moc-instructions-core/package.json` (dependencies)

- **Summary of changes:**
  - Created platform-agnostic parts list parser extracted from AWS handler
  - Added `parsePartsListFile` main function
  - Added `parseCSVPartsList` for CSV format parsing
  - Added `parseXMLPartsList` for XML format parsing
  - Added `validatePartsListFile` for file validation
  - Added csv-parser and @xmldom/xmldom dependencies

- **Reuse compliance:**
  - Reused: Logic from AWS `parts-list-parser.ts`
  - New: Platform-agnostic version without AWS logger dependency
  - Why new was necessary: Core package must be platform-agnostic

- **Ports & adapters note:**
  - What stayed in core: All parsing logic
  - What stayed in adapters: Logger (removed, will be injected at handler level)

- **Commands run:**
  - `pnpm install`
  - `pnpm tsc --noEmit -p packages/backend/moc-instructions-core/tsconfig.json`

- **Notes / Risks:**
  - xmldom Element type doesn't match DOM Element, using `any[]` for compatibility

---

## Chunk 3 — Core Functions Implementation

- **Objective (maps to story requirement/AC):**
  - AC-56: Core functions are platform-agnostic with dependency injection
  - Implement all 4 core functions: deleteMocFile, uploadPartsList, editPresign, editFinalize

- **Files changed:**
  - `packages/backend/moc-instructions-core/src/delete-moc-file.ts` (new)
  - `packages/backend/moc-instructions-core/src/upload-parts-list.ts` (new)
  - `packages/backend/moc-instructions-core/src/edit-presign.ts` (new)
  - `packages/backend/moc-instructions-core/src/edit-finalize.ts` (new)
  - `packages/backend/moc-instructions-core/src/index.ts` (updated exports)

- **Summary of changes:**
  - `deleteMocFile`: Soft-deletes file record (sets deletedAt), updates MOC timestamp
  - `uploadPartsList`: Uploads file to S3, parses CSV/XML, creates moc_files and moc_parts_lists records
  - `editPresign`: Validates file metadata, generates presigned URLs for edit path
  - `editFinalize`: Verifies S3 uploads, validates magic bytes, soft-deletes removed files, updates metadata atomically with optimistic locking, moves files from edit/ to permanent path
  - All functions use DI pattern - no infrastructure dependencies in core

- **Reuse compliance:**
  - Reused: Existing types, rate limit patterns, file validation patterns
  - New: Core functions with DI interfaces
  - Why new was necessary: These are the core business logic implementations

- **Ports & adapters note:**
  - What stayed in core: All business logic, validation, error handling
  - What stayed in adapters: DB queries, S3 operations, rate limiting (injected via deps)

- **Commands run:**
  - `pnpm tsc --noEmit -p packages/backend/moc-instructions-core/tsconfig.json`

- **Notes / Risks:**
  - editFinalize uses optimistic locking via expectedUpdatedAt to prevent concurrent edit conflicts
  - Files are moved from edit/ to permanent path after DB transaction succeeds

---

## Chunk 4 — Vercel Handlers Implementation

- **Objective (maps to story requirement/AC):**
  - AC-54: DELETE /api/mocs/:id/files/:fileId endpoint
  - AC-8: POST /api/mocs/:id/files endpoint (multipart upload)
  - AC-18/AC-19: POST /api/mocs/:id/upload-parts-list endpoint
  - AC-32: POST /api/mocs/:id/edit/presign endpoint
  - AC-37: POST /api/mocs/:id/edit/finalize endpoint

- **Files changed:**
  - `apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts` (new)
  - `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts` (new)
  - `apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts` (new)
  - `apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts` (new)
  - `apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts` (new)
  - `apps/api/platforms/vercel/vercel.json` (routes added)

- **Summary of changes:**
  - All handlers follow existing patterns from STORY-015 (initialize/finalize)
  - Use AUTH_BYPASS for dev authentication
  - Construct DI dependencies and call core functions
  - Map error codes to HTTP status codes
  - Added 5 new routes to vercel.json

- **Reuse compliance:**
  - Reused: DB client singleton pattern, S3 client singleton pattern, auth helper, error mapping
  - Reused: @repo/vercel-multipart for parsing, @repo/file-validator for magic bytes
  - Reused: @repo/moc-instructions-core for business logic
  - New: Handler implementations
  - Why new was necessary: New endpoints require new handler files

- **Ports & adapters note:**
  - What stayed in core: Business logic (in @repo/moc-instructions-core)
  - What stayed in adapters: HTTP request/response handling, DI wiring, S3/DB operations

- **Commands run:**
  - `pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json` (pre-existing errors, no new errors)

- **Notes / Risks:**
  - 4MB file size limit for direct uploads (Vercel limit is 4.5MB)
  - Larger files should use presign pattern
  - Route ordering in vercel.json: specific routes before parameterized

---

## Chunk 5 — HTTP Test Requests

- **Objective (maps to story requirement/AC):**
  - Support manual testing of all new endpoints

- **Files changed:**
  - `__http__/moc-files.http` (new)

- **Summary of changes:**
  - Added test requests for all 5 new endpoints
  - Included error case examples
  - Notes for multipart testing with curl

- **Reuse compliance:**
  - Reused: HTTP test file format from existing files
  - New: Test cases for new endpoints
  - Why new was necessary: New endpoints need test coverage

- **Commands run:**
  - None

- **Notes / Risks:**
  - Multipart tests require curl or Postman (not REST Client inline)

---

## BACKEND COMPLETE

All backend work for STORY-016 is complete:

### Core Package (`@repo/moc-instructions-core`):
1. Types and Zod schemas for all operations
2. Parts list parser (CSV/XML) extracted from AWS handler
3. `deleteMocFile` - soft-delete file from MOC
4. `uploadPartsList` - upload and parse parts list
5. `editPresign` - generate presigned URLs for edit
6. `editFinalize` - finalize edit with optimistic locking

### Vercel Handlers:
1. DELETE `/api/mocs/:id/files/:fileId` - delete file
2. POST `/api/mocs/:id/files` - upload files (multipart)
3. POST `/api/mocs/:id/upload-parts-list` - upload parts list
4. POST `/api/mocs/:id/edit/presign` - get presigned URLs
5. POST `/api/mocs/:id/edit/finalize` - finalize edit

### Configuration:
1. Routes added to `vercel.json`
2. HTTP test file created

---

## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-016.md | input | ~15KB | ~3750 |
| Read: IMPLEMENTATION-PLAN.md | input | ~25KB | ~6250 |
| Read: SCOPE.md | input | ~5KB | ~1250 |
| Read: AWS handlers (5 files) | input | ~80KB | ~20000 |
| Read: existing core types | input | ~20KB | ~5000 |
| Read: vercel-multipart | input | ~8KB | ~2000 |
| Read: existing Vercel handlers | input | ~30KB | ~7500 |
| Read: upload config | input | ~10KB | ~2500 |
| Write: __types__/index.ts edits | output | ~8KB | ~2000 |
| Write: parts-list-parser.ts | output | ~15KB | ~3750 |
| Write: delete-moc-file.ts | output | ~3KB | ~750 |
| Write: upload-parts-list.ts | output | ~4KB | ~1000 |
| Write: edit-presign.ts | output | ~6KB | ~1500 |
| Write: edit-finalize.ts | output | ~10KB | ~2500 |
| Write: index.ts updates | output | ~1KB | ~250 |
| Write: Vercel [fileId].ts | output | ~6KB | ~1500 |
| Write: Vercel files/index.ts | output | ~10KB | ~2500 |
| Write: Vercel upload-parts-list.ts | output | ~10KB | ~2500 |
| Write: Vercel edit/presign.ts | output | ~9KB | ~2250 |
| Write: Vercel edit/finalize.ts | output | ~12KB | ~3000 |
| Write: vercel.json edits | output | ~1KB | ~250 |
| Write: moc-files.http | output | ~4KB | ~1000 |
| Write: BACKEND-LOG.md | output | ~10KB | ~2500 |
| **Total Input** | — | ~193KB | **~48,250** |
| **Total Output** | — | ~94KB | **~23,500** |

---

## Fix Chunk — Verification Failures

### Fix 1: Unit Tests

Added comprehensive unit tests for all new core functions. Tests follow the established patterns from `initialize-with-files.test.ts` and `finalize-with-files.test.ts`.

- **Files created:**
  - `packages/backend/moc-instructions-core/src/__tests__/delete-moc-file.test.ts` (16 tests)
  - `packages/backend/moc-instructions-core/src/__tests__/upload-parts-list.test.ts` (27 tests)
  - `packages/backend/moc-instructions-core/src/__tests__/edit-presign.test.ts` (27 tests)
  - `packages/backend/moc-instructions-core/src/__tests__/edit-finalize.test.ts` (30 tests)
  - `packages/backend/moc-instructions-core/src/__tests__/parts-list-parser.test.ts` (41 tests)

- **Tests added:** 141 new tests
- **Total tests in package:** 252 tests (all passing)

Each test file covers:
- Happy path scenarios
- Error cases (NOT_FOUND, FORBIDDEN, DB_ERROR, S3_ERROR, etc.)
- Edge cases (boundary conditions, nullable fields, empty inputs)

### Fix 2: Unused Import

- **File:** `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts`
- **Change:** Removed unused `ParsedFile` type import from `@repo/vercel-multipart`
- **Before:** `import { parseVercelMultipart, MultipartParseError, type ParsedFile } from '@repo/vercel-multipart'`
- **After:** `import { parseVercelMultipart, MultipartParseError } from '@repo/vercel-multipart'`

### Fix 3: Lint Formatting

- **Command:** `pnpm eslint --fix "packages/backend/moc-instructions-core/src/" "apps/api/platforms/vercel/api/mocs/**/*.ts"`
- **Files auto-fixed:**
  - `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts` (ternary formatting)

### Post-Fix Verification

- **Tests:** PASS (252 tests passing)
- **Lint:** PASS (no errors or warnings)

### Commands Run
```bash
pnpm eslint --fix "packages/backend/moc-instructions-core/src/" "apps/api/platforms/vercel/api/mocs/**/*.ts"
pnpm test --filter @repo/moc-instructions-core
pnpm eslint "packages/backend/moc-instructions-core/src/" "apps/api/platforms/vercel/api/mocs/**/*.ts"
```

---

FIX COMPLETE
