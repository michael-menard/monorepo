# IMPLEMENTATION-PLAN: STORY-015

**Story:** MOC Instructions - Initialization & Finalization
**Generated:** 2026-01-21
**Planner:** dev-implement-planner

---

## Scope Surface

| Area | Included | Notes |
|------|----------|-------|
| backend/API | YES | Core package functions + Vercel handlers |
| frontend/UI | NO | Backend-only story |
| infra/config | MINIMAL | vercel.json routes, seed data |

---

## Acceptance Criteria Checklist

### Initialize Endpoint
- [ ] AC-1: POST `/api/mocs/with-files/initialize` returns 201 with mocId and presigned URLs
- [ ] AC-2: Presigned URLs expire after configurable TTL (default 5 min)
- [ ] AC-3: At least one instruction file required (400 if missing)
- [ ] AC-4: Maximum 10 instruction files (400 if exceeded)
- [ ] AC-5: File sizes validated against config limits (400 if exceeded)
- [ ] AC-6: MIME types validated against allowlist (400 if invalid)
- [ ] AC-7: Duplicate title for same user returns 409 CONFLICT
- [ ] AC-8: Rate limit checked before DB writes (429 if exceeded)
- [ ] AC-9: Response includes `sessionTtlSeconds`
- [ ] AC-10: Filenames sanitized for S3 keys
- [ ] AC-11: Returns 401 if not authenticated

### Finalize Endpoint
- [ ] AC-12: POST `/api/mocs/:mocId/finalize` accepts `uploadedFiles` array
- [ ] AC-13: Verifies files exist in S3 via HeadObject (400 if missing)
- [ ] AC-14: Validates file content via magic bytes (422 INVALID_TYPE if mismatch)
- [ ] AC-15: Validates parts list files (422 PARTS_VALIDATION_ERROR with per-file errors)
- [ ] AC-16: Sets first image as thumbnail
- [ ] AC-17: Updates MOC status from draft to published, sets `finalizedAt`
- [ ] AC-18: Returns 403 if user doesn't own the MOC
- [ ] AC-19: Returns 404 if MOC doesn't exist
- [ ] AC-20: Idempotent: already-finalized MOC returns 200 with `idempotent: true`
- [ ] AC-21: Two-phase lock prevents concurrent finalization
- [ ] AC-22: Stale locks (older than TTL) are rescued
- [ ] AC-23: Rate limit checked before side effects (429 if exceeded)
- [ ] AC-24: Returns complete MOC with files array on success

### Core Package
- [ ] AC-25: `initializeWithFiles()` function is platform-agnostic with DI
- [ ] AC-26: `finalizeWithFiles()` function is platform-agnostic with DI
- [ ] AC-27: Both functions have unit tests

### Infrastructure
- [ ] AC-28: `MOC_BUCKET` env var documented and used
- [ ] AC-29: `@repo/upload-config` limits respected

---

## Files To Touch (Expected)

### New Files (Core Package)
| Path | Purpose |
|------|---------|
| `packages/backend/moc-instructions-core/src/initialize-with-files.ts` | Core function for initialization |
| `packages/backend/moc-instructions-core/src/finalize-with-files.ts` | Core function for finalization |
| `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts` | Unit tests for initialize |
| `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts` | Unit tests for finalize |

### New Files (Vercel Handlers)
| Path | Purpose |
|------|---------|
| `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` | Vercel handler for initialize |
| `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` | Vercel handler for finalize |

### Modified Files
| Path | Change |
|------|--------|
| `packages/backend/moc-instructions-core/src/index.ts` | Export new functions and types |
| `packages/backend/moc-instructions-core/src/__types__/index.ts` | Add Zod schemas for initialize/finalize |
| `apps/api/platforms/vercel/vercel.json` | Add routes for new endpoints |
| `apps/api/core/database/seeds/mocs.ts` | Add STORY-015 test data |
| `__http__/mocs.http` | Add STORY-015 HTTP test requests |

---

## Reuse Targets

### Existing Packages
| Package | Usage | Location |
|---------|-------|----------|
| `@repo/logger` | Structured logging | Standard import |
| `@repo/upload-config` | File size/count limits, MIME validation | `apps/api/core/config/upload.ts` facade |
| `@repo/rate-limit` | Rate limiting with store abstraction | `packages/tools/rate-limit` |
| `@repo/file-validator` | Magic bytes validation (`validateMagicBytes`) | `packages/backend/file-validator` |

### Existing Utilities
| Utility | Usage | Location |
|---------|-------|----------|
| `sanitizeFilenameForS3` | Filename sanitization | `apps/api/core/utils/filename-sanitizer.ts` |
| `createPostgresRateLimitStore` | Rate limit store | `apps/api/core/rate-limit/postgres-store.ts` |
| Parts validator registry | Parts list validation | `apps/api/platforms/aws/endpoints/moc-instructions/_shared/parts-validators/` |

### Existing Patterns
| Pattern | Source | Apply To |
|---------|--------|----------|
| DI interface for core functions | `getMoc`, `listMocs` in moc-instructions-core | Both new core functions |
| Discriminated union result types | `{ success: true, data } \| { success: false, error, message }` | Both new core functions |
| Vercel handler auth pattern | `apps/api/platforms/vercel/api/mocs/[id].ts` | Both new handlers |
| Inline Drizzle schema pattern | Existing Vercel handlers | Both new handlers |

---

## Architecture Notes (Ports & Adapters)

### Core Package (Ports)

The core functions accept all infrastructure dependencies via injection:

```typescript
// initialize-with-files.ts
export interface InitializeWithFilesDeps {
  db: DrizzleClient                    // Database client
  generatePresignedUrl: (bucket: string, key: string, contentType: string, ttl: number) => Promise<string>
  checkRateLimit: (userId: string) => Promise<RateLimitResult>
  config: UploadConfig
  s3Bucket: string
}

// finalize-with-files.ts
export interface FinalizeWithFilesDeps {
  db: DrizzleClient
  headObject: (bucket: string, key: string) => Promise<{ contentLength: number }>
  getObject: (bucket: string, key: string, range?: string) => Promise<Buffer>
  validateMagicBytes: (buffer: Buffer, mimeType: string) => boolean
  validatePartsFile?: (buffer: Buffer, filename: string, mimeType: string) => Promise<PartsValidationResult>
  checkRateLimit: (userId: string) => Promise<RateLimitResult>
  config: UploadConfig
  s3Bucket: string
}
```

### Adapters (Vercel Handlers)

Handlers are thin adapters that:
1. Extract auth (AUTH_BYPASS or real auth)
2. Parse/validate request body with Zod
3. Construct deps (db, s3Client wrapper functions, config)
4. Call core function
5. Transform result to HTTP response

### What Goes Where

| Concern | Location | Rationale |
|---------|----------|-----------|
| Request validation | Handler (Zod schema) | Transport-specific |
| Auth extraction | Handler | Platform-specific |
| Rate limit check | Core (injected) | Business logic |
| Duplicate title check | Core | Business logic |
| S3 presign generation | Core (injected fn) | Business logic, infra-agnostic via DI |
| S3 HeadObject/GetObject | Core (injected fn) | Business logic, infra-agnostic via DI |
| Magic bytes validation | Core (injected fn) | Business logic |
| Parts validation | Core (injected fn) | Business logic |
| DB operations | Core | Business logic |
| OpenSearch indexing | SKIP (Non-goal) | Deferred per story |
| Response formatting | Handler | Transport-specific |

### OpenSearch Decision (ELAB ISSUE-6)

Per story Non-goals, OpenSearch indexing is deferred. The Vercel handler will NOT call OpenSearch indexing. The MOC will be published to PostgreSQL only. A future background job or story can handle search indexing.

### Environment Variable (ELAB ISSUE-7)

Use `MOC_BUCKET` as specified in story. The handler will fall back to `LEGO_API_BUCKET_NAME` for backward compatibility with AWS Lambda deployments.

---

## Step-by-Step Plan (Small Steps)

### Phase 1: Types and Schemas (Steps 1-2)

#### Step 1: Add Zod schemas for Initialize/Finalize
**Objective:** Define input/output schemas in core package types
**Files:** `packages/backend/moc-instructions-core/src/__types__/index.ts`
**Verification:** `pnpm eslint packages/backend/moc-instructions-core/src/__types__/index.ts --fix`

Add:
- `FileMetadataSchema` (filename, fileType, mimeType, size)
- `InitializeMocInputSchema` (title, type, description, tags, files array)
- `InitializeWithFilesResultSchema` (success union type)
- `FinalizeUploadedFileSchema` (fileId, success)
- `FinalizeMocInputSchema` (uploadedFiles array)
- `FinalizeWithFilesResultSchema` (success union type)

#### Step 2: Add dependency interface types
**Objective:** Define DI interfaces for core functions
**Files:** `packages/backend/moc-instructions-core/src/__types__/index.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

Add:
- `InitializeWithFilesDeps` interface
- `FinalizeWithFilesDeps` interface
- `PresignedUploadUrl` type

---

### Phase 2: Core Functions (Steps 3-6)

#### Step 3: Implement initializeWithFiles core function
**Objective:** Platform-agnostic initialization logic
**Files:** `packages/backend/moc-instructions-core/src/initialize-with-files.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

Logic:
1. Validate file requirements (at least 1 instruction, max 10 instructions)
2. Validate file sizes and MIME types against config
3. Check rate limit (via injected function)
4. Check duplicate title (DB query)
5. Create MOC record with status='draft'
6. Generate presigned URLs for each file
7. Create placeholder file records
8. Return mocId, uploadUrls, sessionTtlSeconds

#### Step 4: Implement finalizeWithFiles core function
**Objective:** Platform-agnostic finalization logic
**Files:** `packages/backend/moc-instructions-core/src/finalize-with-files.ts`
**Verification:** `pnpm check-types --filter @repo/moc-instructions-core`

Logic:
1. Check rate limit
2. Verify MOC exists and user owns it
3. Short-circuit if already finalized (idempotent)
4. Acquire finalize lock (or return 'finalizing' status)
5. Verify files in S3 (HeadObject)
6. Validate magic bytes for instruction/image files
7. Validate parts list files (if validator provided)
8. Set first image as thumbnail
9. Update MOC status to published, set finalizedAt
10. Clear lock and return complete MOC

#### Step 5: Write unit tests for initializeWithFiles
**Objective:** Test all happy path and error cases
**Files:** `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- initialize-with-files`

Test cases:
- Happy: single file, multiple files, all optional fields
- Error: no files, no instruction file, too many instructions
- Error: file too large, invalid MIME type
- Error: duplicate title (pre-check), duplicate title (race condition)
- Error: rate limit exceeded

#### Step 6: Write unit tests for finalizeWithFiles
**Objective:** Test all happy path and error cases
**Files:** `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts`
**Verification:** `pnpm test --filter @repo/moc-instructions-core -- finalize-with-files`

Test cases:
- Happy: finalize with files, sets thumbnail, sets status
- Idempotent: already finalized, concurrent finalizing
- Error: MOC not found, not owner
- Error: no successful uploads, file not in S3
- Error: magic bytes mismatch, parts validation error
- Lock: stale lock rescued

---

### Phase 3: Export Core Functions (Step 7)

#### Step 7: Export new functions from package index
**Objective:** Make functions available via package import
**Files:** `packages/backend/moc-instructions-core/src/index.ts`
**Verification:** `pnpm build --filter @repo/moc-instructions-core`

Add exports:
- `initializeWithFiles` function
- `finalizeWithFiles` function
- All new types and schemas

---

### Phase 4: Vercel Handlers (Steps 8-9)

#### Step 8: Implement initialize Vercel handler
**Objective:** Adapter for initialize endpoint
**Files:** `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/with-files/initialize.ts --fix`

Handler:
1. Check method is POST
2. Get userId from AUTH_BYPASS or return 401
3. Parse request body with Zod
4. Construct deps (db singleton, S3 presign wrapper, rate limit wrapper, config)
5. Call `initializeWithFiles(input, deps)`
6. Return 201 with data or error response

#### Step 9: Implement finalize Vercel handler
**Objective:** Adapter for finalize endpoint
**Files:** `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts`
**Verification:** `pnpm eslint apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts --fix`

Handler:
1. Check method is POST
2. Get userId from AUTH_BYPASS or return 401
3. Get mocId from query params, validate UUID
4. Parse request body with Zod
5. Construct deps (db singleton, S3 head/get wrappers, magic bytes validator, rate limit wrapper, config)
6. Call `finalizeWithFiles(input, deps)`
7. Return 200 with data or error response

Note: Skip OpenSearch indexing per story Non-goals.

---

### Phase 5: Configuration (Steps 10-11)

#### Step 10: Add routes to vercel.json
**Objective:** Enable routing to new handlers
**Files:** `apps/api/platforms/vercel/vercel.json`
**Verification:** Manual review of route order (specific before parameterized)

Add routes (BEFORE `/api/mocs/:id`):
```json
{ "source": "/api/mocs/with-files/initialize", "destination": "/api/mocs/with-files/initialize.ts" },
{ "source": "/api/mocs/:mocId/finalize", "destination": "/api/mocs/[mocId]/finalize.ts" }
```

#### Step 11: Add seed data for STORY-015
**Objective:** Enable HTTP contract testing
**Files:** `apps/api/core/database/seeds/mocs.ts`
**Verification:** `pnpm seed` (may fail due to pre-existing issues - see LESSONS-LEARNED)

Add seeds:
- MOC with title "Test MOC Duplicate Title" (for 409 test)
- MOC owned by other user (for 403 test)

---

### Phase 6: HTTP Contract & Verification (Steps 12-14)

#### Step 12: Add HTTP test requests
**Objective:** Enable manual API testing
**Files:** `__http__/mocs.http`
**Verification:** Visual inspection of .http file

Add requests:
- `#initializeMocSingleFile` - 201 happy path
- `#initializeMocMultipleFiles` - 201 with 3 files
- `#initializeNoAuth` - 401
- `#initializeDuplicateTitle` - 409
- `#initializeEmptyBody` - 400
- `#initializeNoFiles` - 400
- `#initializeNoInstruction` - 400
- `#initializeTooManyInstructions` - 400
- `#initializeFileTooLarge` - 400
- `#initializeInvalidMime` - 400
- `#finalizeMocSuccess` - 200 (chained from initialize)
- `#finalizeMocIdempotent` - 200
- `#finalizeNotFound` - 404
- `#finalizeForbidden` - 403
- `#finalizeEmptyBody` - 400

Add test execution order note per ELAB ISSUE-4.

#### Step 13: Run core package tests
**Objective:** Verify all unit tests pass
**Files:** N/A
**Verification:** `pnpm test --filter @repo/moc-instructions-core`

#### Step 14: Run scoped lint
**Objective:** Verify all new code passes lint
**Files:** N/A
**Verification:** `pnpm eslint packages/backend/moc-instructions-core/src apps/api/platforms/vercel/api/mocs --fix`

---

## Test Plan

### Unit Tests
```bash
# Run core package tests
pnpm test --filter @repo/moc-instructions-core

# Run with coverage (optional for AC-27)
pnpm test --filter @repo/moc-instructions-core -- --coverage
```

### Type Check
```bash
# Scoped type check (avoid pre-existing monorepo failures)
pnpm check-types --filter @repo/moc-instructions-core
```

### Lint
```bash
# Scoped lint for new/changed files
pnpm eslint packages/backend/moc-instructions-core/src --fix
pnpm eslint apps/api/platforms/vercel/api/mocs/with-files --fix
pnpm eslint apps/api/platforms/vercel/api/mocs/[mocId] --fix
```

### HTTP Contract Testing
```bash
# Start local dev server
cd apps/api/platforms/vercel && pnpm vercel dev --local-config vercel.json

# Execute HTTP requests in order:
# 1. #initializeMocSingleFile - capture mocId, fileId from response
# 2. (Optional) Upload to presigned URLs
# 3. #finalizeMocSuccess - use captured values
# 4. #finalizeMocIdempotent - retry same request

# Error cases (order-independent):
# - #initializeNoAuth
# - #initializeDuplicateTitle
# - #finalizeNotFound
# - #finalizeForbidden
```

### Playwright
NOT APPLICABLE - Backend-only story with no UI changes.

---

## Stop Conditions / Blockers

### Pre-existing Monorepo Issues (Document, Don't Block)

Per LESSONS-LEARNED from STORY-010 through STORY-013, the following packages have pre-existing failures:
- `@repo/file-validator` - type errors
- `@repo/mock-data` - type errors
- `@repo/pii-sanitizer` - type errors
- `@repo/sets-core` - type errors
- `@repo/gallery-core` - type errors
- `@repo/upload-client` - type errors
- `@repo/app-dashboard` - build fails (design-system)
- `@repo/app-wishlist-gallery` - build fails (design-system)
- `apps/api/__tests__/setup.ts` - missing file

**Workaround:** Use scoped verification commands (`--filter @repo/moc-instructions-core`).

### Potential Blockers

1. **Parts Validator Access:** The parts validator registry is in AWS Lambda endpoints, not a shared package. May need to inline or copy validation logic to core package.
   - **Decision:** Inline basic parts validation in core. Full validator registry extraction is out of scope.

2. **Seed Execution Failure:** Per STORY-012 lessons, `seedSets()` fails due to tags schema mismatch.
   - **Workaround:** Manually insert seed data or skip seed verification.

### Information Needed (None - Story is Complete)

No blockers require PM/story clarification. All ELAB issues are addressable during implementation:
- ISSUE-4: Will add test execution order in HTTP contract
- ISSUE-6: Will skip OpenSearch (documented in Non-goals)
- ISSUE-7: Will use MOC_BUCKET with LEGO_API_BUCKET_NAME fallback

---

## Implementation Notes

### S3 Client for Vercel

Vercel handlers will use `@aws-sdk/client-s3` with explicit credentials:
```typescript
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})
```

### Rate Limit Store

Use existing `createPostgresRateLimitStore` from `apps/api/core/rate-limit/postgres-store.ts` which is already compatible with Vercel.

### Inline Schema Pattern

Following existing Vercel handler pattern, inline the Drizzle schema definition rather than importing from `@/core/database/schema` to avoid path alias issues in Vercel runtime.

---

## Estimated Complexity

| Phase | Files | Tests | Effort |
|-------|-------|-------|--------|
| Types/Schemas | 1 | 0 | Low |
| Core Functions | 2 | ~40 | Medium |
| Exports | 1 | 0 | Low |
| Vercel Handlers | 2 | 0 | Medium |
| Configuration | 2 | 0 | Low |
| HTTP Contract | 1 | 0 | Low |

**Total:** ~9 files, ~40 unit tests

---

## Agent Log

| Timestamp | Agent | Action |
|-----------|-------|--------|
| 2026-01-21 | dev-implement-planner | Implementation plan generated for STORY-015 |
