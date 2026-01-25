# IMPLEMENTATION-PLAN: STORY-016 - MOC File Upload Management

## Scope Surface

- **backend/API:** yes
- **frontend/UI:** no
- **infra/config:** yes (vercel.json routes, function configs)
- **notes:** This is a backend-only story migrating 5 AWS Lambda handlers to Vercel serverless functions. Core package extension required for 4 new functions. Parts list parsing logic must be extracted to core package.

---

## Acceptance Criteria Checklist

### Upload File (AC-1 to AC-10)
- [ ] POST `/api/mocs/:id/files` accepts multipart form data
- [ ] Max file size 4MB, returns 413 if exceeded
- [ ] Max 10 files per request, returns 400 if exceeded
- [ ] Per-file type mapping via `fileType_0`, `fileType_1` fields
- [ ] Sanitized S3 uploads, DB records in `moc_files`
- [ ] 201 for single file, 200 for multi-file with arrays
- [ ] 401/403/404 for auth/ownership/not-found

### Delete File (AC-11 to AC-16)
- [ ] DELETE `/api/mocs/:id/files/:fileId` soft-deletes (sets `deletedAt`)
- [ ] Updates MOC `updatedAt` timestamp
- [ ] 401/403/404 for auth/ownership/not-found/wrong-moc

### Upload Parts List (AC-17 to AC-27)
- [ ] POST `/api/mocs/:id/upload-parts-list` accepts CSV/XML
- [ ] Parses with auto header detection, calculates piece count
- [ ] Creates `moc_files` + `moc_parts_lists` records
- [ ] Updates `moc_instructions.totalPieceCount`
- [ ] 201 with parsing summary, 400/422 for errors
- [ ] 401/403/404 for auth/ownership/not-found

### Edit Presign (AC-28 to AC-40)
- [ ] POST `/api/mocs/:id/edit/presign` accepts files array
- [ ] Max 20 files, validates per-category limits, size, MIME
- [ ] Generates presigned URLs with edit-specific path
- [ ] Rate limit check (not increment)
- [ ] Returns files[], sessionExpiresAt
- [ ] 401/403/404/413/415/429 for errors

### Edit Finalize (AC-41 to AC-55)
- [ ] POST `/api/mocs/:id/edit/finalize` accepts metadata, newFiles[], removedFileIds[]
- [ ] Verifies S3 files via HeadObject, validates magic bytes
- [ ] Soft-deletes removed files, updates metadata atomically
- [ ] Moves files from edit/ to permanent path
- [ ] Optimistic locking via `expectedUpdatedAt`
- [ ] Rate limit increment, OpenSearch fail-open
- [ ] 401/403/404/409/429 for errors

### Core Package (AC-56 to AC-57)
- [ ] Core functions in `@repo/moc-instructions-core` with DI
- [ ] Unit tests >80% coverage

---

## Files To Touch (Expected)

### Core Package Extension (New Files)
```
packages/backend/moc-instructions-core/src/delete-moc-file.ts
packages/backend/moc-instructions-core/src/upload-parts-list.ts
packages/backend/moc-instructions-core/src/edit-presign.ts
packages/backend/moc-instructions-core/src/edit-finalize.ts
packages/backend/moc-instructions-core/src/parts-list-parser.ts
packages/backend/moc-instructions-core/src/__tests__/delete-moc-file.test.ts
packages/backend/moc-instructions-core/src/__tests__/upload-parts-list.test.ts
packages/backend/moc-instructions-core/src/__tests__/edit-presign.test.ts
packages/backend/moc-instructions-core/src/__tests__/edit-finalize.test.ts
packages/backend/moc-instructions-core/src/__tests__/parts-list-parser.test.ts
```

### Core Package Modification
```
packages/backend/moc-instructions-core/src/index.ts         # Add exports
packages/backend/moc-instructions-core/src/__types__/index.ts  # Add new schemas
packages/backend/moc-instructions-core/package.json         # Add csv-parser, xmldom deps
```

### Vercel Handlers (New Files)
```
apps/api/platforms/vercel/api/mocs/[id]/files/index.ts      # POST upload
apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts   # DELETE
apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts
apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts
apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts
```

### Config/Seed Modifications
```
apps/api/platforms/vercel/vercel.json                       # Add routes
apps/api/core/database/seeds/mocs.ts                        # Add STORY-016 test data
__http__/mocs.http                                          # Add HTTP test requests
```

**Total: 18 files (13 new, 5 modified)**

---

## Reuse Targets

### Existing Packages to Import
| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging |
| `@repo/vercel-multipart` | Multipart form data parsing (STORY-009) |
| `@repo/file-validator` | Magic bytes validation |
| `@repo/rate-limit` | Rate limiting with Postgres store |
| `@repo/moc-instructions-core` | Existing types/schemas from STORY-015 |

### Existing Code to Reference
| Location | Usage |
|----------|-------|
| `apps/api/platforms/aws/endpoints/moc-instructions/_shared/parts-list-parser.ts` | CSV/XML parsing logic to extract |
| `apps/api/platforms/aws/endpoints/moc-instructions/upload-file/handler.ts` | Multi-file upload pattern |
| `apps/api/platforms/aws/endpoints/moc-instructions/edit-presign/handler.ts` | Presign URL generation |
| `apps/api/platforms/aws/endpoints/moc-instructions/edit-finalize/handler.ts` | Atomic transaction pattern |
| `apps/api/core/config/upload.ts` | Upload config (limits, MIME types) |
| `apps/api/core/utils/filename-sanitizer.ts` | Filename sanitization |

### Existing Vercel Handlers as Templates
| Handler | Pattern to Copy |
|---------|-----------------|
| `api/mocs/with-files/initialize.ts` | S3 presigned URL generation |
| `api/mocs/[mocId]/finalize.ts` | S3 HeadObject, transaction pattern |
| `api/gallery/images/upload.ts` | Multipart upload handling |

---

## Architecture Notes (Ports & Adapters)

### Core Package Functions

Each core function follows the DI pattern established in STORY-015:

```typescript
// delete-moc-file.ts
export interface DeleteMocFileDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    getFile: (fileId: string, mocId: string) => Promise<MocFileRow | null>
    softDeleteFile: (fileId: string) => Promise<void>
    updateMocTimestamp: (mocId: string) => Promise<void>
  }
}

// upload-parts-list.ts
export interface UploadPartsListDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    createMocFile: (data: MocFileInsert) => Promise<MocFileRow>
    createPartsList: (data: PartsListInsert) => Promise<MocPartsListRow>
    updateMocPieceCount: (mocId: string, count: number) => Promise<void>
  }
  uploadToS3: (bucket: string, key: string, buffer: Buffer, contentType: string) => Promise<string>
  s3Bucket: string
  s3Region: string
}

// edit-presign.ts
export interface EditPresignDeps {
  db: { getMoc: (mocId: string) => Promise<MocRow | null> }
  generatePresignedUrl: (bucket: string, key: string, contentType: string, ttl: number) => Promise<string>
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  isMimeTypeAllowed: (fileType: string, mimeType: string) => boolean
  getAllowedMimeTypes: (fileType: string) => string[]
  getFileSizeLimit: (fileType: string) => number
  getFileCountLimit: (fileType: string) => number
  sanitizeFilename: (filename: string) => string
  generateUuid: () => string
  config: UploadConfigSubset
  s3Bucket: string
}

// edit-finalize.ts
export interface EditFinalizeDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    getMocFiles: (mocId: string, fileIds?: string[]) => Promise<MocFileRow[]>
    transaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>
  }
  headObject: (bucket: string, key: string) => Promise<{ contentLength: number }>
  getObject: (bucket: string, key: string, range?: string) => Promise<Buffer>
  copyObject: (bucket: string, source: string, dest: string) => Promise<void>
  deleteObject: (bucket: string, key: string) => Promise<void>
  deleteObjects: (bucket: string, keys: string[]) => Promise<void>
  validateMagicBytes: (buffer: Buffer, mimeType: string) => boolean
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  updateOpenSearch?: (moc: MocRow) => Promise<void>
  config: UploadConfigSubset
  s3Bucket: string
}
```

### What Goes Where

| Logic | Location | Reason |
|-------|----------|--------|
| Request parsing, auth check | Vercel handler | Platform-specific |
| Business logic, validation | Core package | Reusable, testable |
| S3 operations | Injected via deps | Platform-agnostic |
| DB queries | Injected via deps | Testing via mocks |
| Parts list parsing | Core package | Reusable, testable |

### Boundaries to Protect

1. **Core functions must not import AWS SDK** - S3 operations injected
2. **Core functions must not import Drizzle directly** - DB operations injected
3. **Vercel handlers are thin adapters** - Business logic in core
4. **Parts list parser is pure function** - No side effects, testable

---

## Step-by-Step Plan (Small Steps)

### Phase 1: Core Package Types & Parser (Steps 1-3)

#### Step 1: Add new Zod schemas to core types
**Objective:** Define schemas for delete, upload-parts-list, edit-presign, edit-finalize
**Files:** `packages/backend/moc-instructions-core/src/__types__/index.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

#### Step 2: Extract parts list parser to core package
**Objective:** Copy and adapt CSV/XML parsing from AWS handler to core
**Files:**
- `packages/backend/moc-instructions-core/src/parts-list-parser.ts`
- `packages/backend/moc-instructions-core/package.json` (add csv-parser, xmldom)
**Verification:**
- `pnpm check-types --filter @repo/moc-instructions-core`
- Create basic smoke test

#### Step 3: Add parts list parser tests
**Objective:** Unit tests for CSV and XML parsing
**Files:** `packages/backend/moc-instructions-core/src/__tests__/parts-list-parser.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- parts-list-parser`

### Phase 2: Core Functions - Delete & Upload Parts List (Steps 4-7)

#### Step 4: Implement deleteMocFile core function
**Objective:** Soft-delete file with ownership validation
**Files:** `packages/backend/moc-instructions-core/src/delete-moc-file.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

#### Step 5: Add deleteMocFile tests
**Objective:** Test ownership, not-found, soft-delete behavior
**Files:** `packages/backend/moc-instructions-core/src/__tests__/delete-moc-file.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- delete-moc-file`

#### Step 6: Implement uploadPartsList core function
**Objective:** Parse file, create records, update MOC piece count
**Files:** `packages/backend/moc-instructions-core/src/upload-parts-list.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

#### Step 7: Add uploadPartsList tests
**Objective:** Test CSV/XML parsing, DB operations, error cases
**Files:** `packages/backend/moc-instructions-core/src/__tests__/upload-parts-list.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- upload-parts-list`

### Phase 3: Core Functions - Edit Presign & Finalize (Steps 8-11)

#### Step 8: Implement editPresign core function
**Objective:** Generate presigned URLs with validation
**Files:** `packages/backend/moc-instructions-core/src/edit-presign.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

#### Step 9: Add editPresign tests
**Objective:** Test validation, rate limiting, URL generation
**Files:** `packages/backend/moc-instructions-core/src/__tests__/edit-presign.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- edit-presign`

#### Step 10: Implement editFinalize core function
**Objective:** Atomic update with S3 verification and file moves
**Files:** `packages/backend/moc-instructions-core/src/edit-finalize.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

#### Step 11: Add editFinalize tests
**Objective:** Test optimistic locking, S3 operations, cleanup
**Files:** `packages/backend/moc-instructions-core/src/__tests__/edit-finalize.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- edit-finalize`

### Phase 4: Export and Verify Core Package (Step 12)

#### Step 12: Update core package exports
**Objective:** Export all new functions and types from index.ts
**Files:** `packages/backend/moc-instructions-core/src/index.ts`
**Verification:**
- `pnpm build --filter @repo/moc-instructions-core`
- `pnpm test --filter @repo/moc-instructions-core`
- Confirm all tests pass, >80% coverage

### Phase 5: Vercel Handlers (Steps 13-17)

#### Step 13: Implement upload file handler
**Objective:** POST /api/mocs/[id]/files with multipart parsing
**Files:** `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/files/index.ts`

#### Step 14: Implement delete file handler
**Objective:** DELETE /api/mocs/[id]/files/[fileId]
**Files:** `apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts`

#### Step 15: Implement upload parts list handler
**Objective:** POST /api/mocs/[id]/upload-parts-list
**Files:** `apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts`

#### Step 16: Implement edit presign handler
**Objective:** POST /api/mocs/[id]/edit/presign
**Files:** `apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts`

#### Step 17: Implement edit finalize handler
**Objective:** POST /api/mocs/[id]/edit/finalize
**Files:** `apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts`

### Phase 6: Configuration & Testing (Steps 18-20)

#### Step 18: Update vercel.json routes
**Objective:** Add routes for all 5 endpoints with correct ordering
**Files:** `apps/api/platforms/vercel/vercel.json`
**Verification:** Visual inspection - specific routes before parameterized

**CRITICAL:** Route ordering per LESSONS-LEARNED:
```json
// Add BEFORE /api/mocs/:id
{ "source": "/api/mocs/:id/edit/presign", "destination": "/api/mocs/[id]/edit/presign.ts" },
{ "source": "/api/mocs/:id/edit/finalize", "destination": "/api/mocs/[id]/edit/finalize.ts" },
{ "source": "/api/mocs/:id/upload-parts-list", "destination": "/api/mocs/[id]/upload-parts-list.ts" },
{ "source": "/api/mocs/:id/files/:fileId", "destination": "/api/mocs/[id]/files/[fileId].ts" },
{ "source": "/api/mocs/:id/files", "destination": "/api/mocs/[id]/files/index.ts" },
```

#### Step 19: Add seed data for STORY-016
**Objective:** Add test MOC and file for delete/edit tests
**Files:** `apps/api/core/database/seeds/mocs.ts`
**Verification:** Run `pnpm seed` locally

#### Step 20: Add HTTP test requests
**Objective:** Add all STORY-016 test requests to mocs.http
**Files:** `__http__/mocs.http`
**Verification:** Visual inspection of request structure

---

## Test Plan

### Unit Tests (Core Package)
```bash
# Run all core package tests
pnpm test --filter @repo/moc-instructions-core

# Run specific test files
pnpm test --filter @repo/moc-instructions-core -- parts-list-parser
pnpm test --filter @repo/moc-instructions-core -- delete-moc-file
pnpm test --filter @repo/moc-instructions-core -- upload-parts-list
pnpm test --filter @repo/moc-instructions-core -- edit-presign
pnpm test --filter @repo/moc-instructions-core -- edit-finalize

# Coverage check (expect >80%)
pnpm test --filter @repo/moc-instructions-core -- --coverage
```

### Type Check
```bash
# Core package only
pnpm check-types --filter @repo/moc-instructions-core

# Full (expect pre-existing failures in other packages)
pnpm check-types
```

### Lint
```bash
# New files only
pnpm eslint packages/backend/moc-instructions-core/src/delete-moc-file.ts
pnpm eslint packages/backend/moc-instructions-core/src/upload-parts-list.ts
pnpm eslint packages/backend/moc-instructions-core/src/edit-presign.ts
pnpm eslint packages/backend/moc-instructions-core/src/edit-finalize.ts
pnpm eslint packages/backend/moc-instructions-core/src/parts-list-parser.ts
pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/files/
pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/edit/
pnpm eslint apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts
```

### HTTP Contract Tests
Execute all `#story016*` requests in `__http__/mocs.http`:
- Capture responses for happy path and error cases
- Verify status codes match ACs

### Playwright
**NOT APPLICABLE** - Backend-only story, no UI changes

---

## Stop Conditions / Blockers

### No Blockers Identified

The story is well-defined with:
- Clear AWS reference implementations for all 5 endpoints
- Established patterns from STORY-015 (initialize/finalize)
- Existing packages for multipart parsing, file validation
- Known route ordering requirements from LESSONS-LEARNED

### Potential Risks (Not Blockers)

1. **csv-parser dependency** - Core package needs csv-parser and xmldom. Verify these work in Vercel runtime (they should, Node.js environment).

2. **4MB limit enforcement** - Vercel has 4.5MB body limit. Need to return 413 before buffer overflow. Use Content-Length header check.

3. **Pre-existing monorepo failures** - Per LESSONS-LEARNED, expect unrelated packages to fail build/typecheck. Use scoped verification commands.

---

## Token Log (REQUIRED)

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: STORY-016.md | input | 18,397 | ~4,600 |
| Read: LESSONS-LEARNED.md | input | 14,331 | ~3,600 |
| Read: AWS upload-file handler | input | 6,472 | ~1,600 |
| Read: AWS delete-file handler | input | 2,464 | ~600 |
| Read: AWS upload-parts-list handler | input | 9,270 | ~2,300 |
| Read: AWS edit-presign handler | input | 14,964 | ~3,700 |
| Read: AWS edit-finalize handler | input | 23,100 | ~5,800 |
| Read: moc-instructions-core __types__ | input | 16,128 | ~4,000 |
| Read: moc-instructions-core index.ts | input | 2,760 | ~700 |
| Read: parts-list-parser.ts | input | 16,620 | ~4,200 |
| Read: vercel.json | input | 2,508 | ~600 |
| Read: moc-file-service.ts | input | 17,070 | ~4,300 |
| Read: mocs.http | input | 24,000 | ~6,000 |
| Read: mocs.ts (seeds) | input | 9,060 | ~2,300 |
| Read: vercel-multipart index | input | 660 | ~200 |
| Write: IMPLEMENTATION-PLAN.md | output | ~16,000 | ~4,000 |
| **Total** | — | ~193,804 | **~48,500** |

---

## Dependencies / Sequencing Notes

### Internal Dependencies
1. Steps 1-3 (types, parser) must complete before Steps 4-11 (core functions)
2. Steps 4-12 (core package) must complete before Steps 13-17 (handlers)
3. Steps 13-17 (handlers) must complete before Steps 18-20 (config/testing)

### External Dependencies
- None - all required packages exist in monorepo

### Parallel Opportunities
- Steps 4-5 (delete) and Steps 6-7 (parts list) can run in parallel
- Steps 8-9 (presign) and Steps 10-11 (finalize) can run in parallel
- Steps 13-17 (handlers) can run in parallel after Step 12

---

## Implementation Notes

### Key Differences from AWS

| Aspect | AWS Lambda | Vercel |
|--------|------------|--------|
| Multipart parsing | Custom Busboy | @repo/vercel-multipart |
| Auth | Cognito JWT | AUTH_BYPASS for dev |
| Rate limiting | Lambda-based | Postgres store |
| File delete | Hard delete | Soft delete (deletedAt) |
| OpenSearch | Required | Fail-open (optional) |

### 4MB File Size Handling

```typescript
// In handler, before parsing multipart
const contentLength = parseInt(req.headers['content-length'] || '0', 10)
if (contentLength > 4 * 1024 * 1024) {
  return res.status(413).json({
    code: 'PAYLOAD_TOO_LARGE',
    message: 'File size exceeds 4MB limit. Use presigned URL pattern for larger files.',
  })
}
```

### Soft Delete Pattern

```typescript
// In core function
await deps.db.softDeleteFile(fileId)
// SQL: UPDATE moc_files SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1
```

### Edit File Path Pattern

```
Edit path:      {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid}.{ext}
Permanent path: {env}/moc-instructions/{ownerId}/{mocId}/{category}/{uuid}.{ext}
```

Move operation: Copy to permanent, delete from edit (S3 has no rename).

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | Planner | Plan created from story requirements |
