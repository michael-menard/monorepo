# Plan Validation: STORY-016

## Summary
- Status: **VALID**
- Issues Found: 2 (minor)
- Blockers: 0

---

## AC Coverage

All 57 Acceptance Criteria are addressed in the implementation plan.

### Upload File (AC-1 to AC-10)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-1 | POST accepts multipart form data | Step 13 | OK |
| AC-2 | Max file size 4MB, returns 413 | Step 13 | OK |
| AC-3 | Max 10 files per request | Step 13 | OK |
| AC-4 | Per-file type mapping via fileType_N | Step 13 | OK |
| AC-5 | S3 upload with sanitized filenames | Step 13 | OK |
| AC-6 | Database records in moc_files | Step 13 | OK |
| AC-7 | 201 for single, 200 for multi-file | Step 13 | OK |
| AC-8 | Returns 401 if not authenticated | Step 13 | OK |
| AC-9 | Returns 403 if user doesn't own MOC | Step 13 | OK |
| AC-10 | Returns 404 if MOC doesn't exist | Step 13 | OK |

### Delete File (AC-11 to AC-16)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-11 | Soft-deletes file (sets deletedAt) | Steps 4, 14 | OK |
| AC-12 | Updates MOC updatedAt timestamp | Steps 4, 14 | OK |
| AC-13 | Returns 401 if not authenticated | Step 14 | OK |
| AC-14 | Returns 403 if user doesn't own MOC | Steps 4, 14 | OK |
| AC-15 | Returns 404 if MOC or file doesn't exist | Steps 4, 14 | OK |
| AC-16 | Returns 404 if file belongs to different MOC | Steps 4, 14 | OK |

### Upload Parts List (AC-17 to AC-27)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-17 | Accepts multipart with CSV/XML | Steps 2, 6, 15 | OK |
| AC-18 | Parses with auto header detection | Steps 2, 3, 6 | OK |
| AC-19 | Calculates total piece count | Steps 2, 6 | OK |
| AC-20 | Creates moc_files record | Step 6 | OK |
| AC-21 | Creates moc_parts_lists record | Step 6 | OK |
| AC-22 | Updates totalPieceCount | Step 6 | OK |
| AC-23 | Returns 201 with parsing summary | Steps 6, 15 | OK |
| AC-24 | Returns 400/422 for parse errors | Steps 3, 6, 15 | OK |
| AC-25 | Returns 401 if not authenticated | Step 15 | OK |
| AC-26 | Returns 403 if user doesn't own MOC | Steps 6, 15 | OK |
| AC-27 | Returns 404 if MOC doesn't exist | Steps 6, 15 | OK |

### Edit Presign (AC-28 to AC-40)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-28 | Accepts files array | Steps 8, 16 | OK |
| AC-29 | Max 20 files per request | Step 8 | OK |
| AC-30 | Validates per-category limits | Step 8 | OK |
| AC-31 | Validates file sizes | Step 8 | OK |
| AC-32 | Validates MIME types | Step 8 | OK |
| AC-33 | Generates presigned URLs with edit path | Steps 8, 16 | OK |
| AC-34 | Returns files[] with metadata | Steps 8, 16 | OK |
| AC-35 | Returns sessionExpiresAt | Step 8 | OK |
| AC-36 | Rate limit check (not increment) | Steps 8, 9 | OK |
| AC-37 | Returns 429 if rate limited | Steps 8, 16 | OK |
| AC-38 | Returns 401 if not authenticated | Step 16 | OK |
| AC-39 | Returns 403 if user doesn't own MOC | Steps 8, 16 | OK |
| AC-40 | Returns 404 if MOC doesn't exist | Steps 8, 16 | OK |

### Edit Finalize (AC-41 to AC-55)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-41 | Accepts metadata, newFiles[], removedFileIds[] | Steps 10, 17 | OK |
| AC-42 | Verifies S3 files via HeadObject | Step 10 | OK |
| AC-43 | Validates magic bytes | Step 10 | OK |
| AC-44 | Soft-deletes removed files | Step 10 | OK |
| AC-45 | Updates metadata atomically | Step 10 | OK |
| AC-46 | Moves files from edit/ to permanent path | Step 10 | OK |
| AC-47 | Returns 409 for concurrent edit | Steps 10, 17 | OK |
| AC-48 | Rate limit increment on finalize | Steps 10, 11 | OK |
| AC-49 | Returns 429 if rate limited | Steps 10, 17 | OK |
| AC-50 | Best-effort cleanup on failure | Step 10 | OK |
| AC-51 | OpenSearch fail-open | Step 10 | OK |
| AC-52 | Returns complete MOC with presigned URLs | Steps 10, 17 | OK |
| AC-53 | Returns 401 if not authenticated | Step 17 | OK |
| AC-54 | Returns 403 if not owner or removing other's files | Steps 10, 17 | OK |
| AC-55 | Returns 404 if MOC doesn't exist | Steps 10, 17 | OK |

### Core Package (AC-56 to AC-57)

| AC | Description | Addressed in Step | Status |
|----|-------------|-------------------|--------|
| AC-56 | Core functions with DI | Steps 4, 6, 8, 10, 12 | OK |
| AC-57 | Unit tests >80% coverage | Steps 3, 5, 7, 9, 11, 12 | OK |

---

## File Path Validation

- **Valid paths:** 18 (13 new, 5 modified)
- **Invalid paths:** 0

### Path Convention Compliance

| Path | Convention | Status |
|------|------------|--------|
| `packages/backend/moc-instructions-core/src/*.ts` | Backend packages | OK |
| `packages/backend/moc-instructions-core/src/__tests__/*.test.ts` | Test convention | OK |
| `packages/backend/moc-instructions-core/src/__types__/index.ts` | Types convention | OK |
| `apps/api/platforms/vercel/api/mocs/[id]/*.ts` | Vercel handlers | OK |
| `apps/api/platforms/vercel/vercel.json` | Config file | OK |
| `apps/api/core/database/seeds/mocs.ts` | Seed files | OK |
| `__http__/mocs.http` | HTTP test files | OK |

---

## Reuse Target Validation

| Target | Exists | Location | Status |
|--------|--------|----------|--------|
| `@repo/logger` | Yes | `packages/core/logger` | OK |
| `@repo/vercel-multipart` | Yes | `packages/backend/vercel-multipart` | OK |
| `@repo/file-validator` | Yes | `packages/backend/file-validator` | OK |
| `@repo/rate-limit` | Yes | `packages/tools/rate-limit` | OK |
| `@repo/moc-instructions-core` | Yes | `packages/backend/moc-instructions-core` | OK |

### Referenced Code to Extract

| Reference | Exists | Location | Status |
|-----------|--------|----------|--------|
| Parts list parser | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/_shared/parts-list-parser.ts` | OK |
| Upload file handler | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/upload-file/handler.ts` | OK |
| Delete file handler | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/delete-file/handler.ts` | OK |
| Upload parts list handler | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/upload-parts-list/handler.ts` | OK |
| Edit presign handler | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/edit-presign/handler.ts` | OK |
| Edit finalize handler | Yes | `apps/api/platforms/aws/endpoints/moc-instructions/edit-finalize/handler.ts` | OK |
| Upload config | Yes | `apps/api/core/config/upload.ts` | OK |
| Filename sanitizer | Yes | `apps/api/core/utils/filename-sanitizer.ts` | OK |

---

## Step Analysis

- **Total steps:** 20
- **Steps with verification command:** 20 (100%)
- **Dependencies documented:** Yes (internal and external)
- **Parallel opportunities identified:** Yes

### Step Completeness

| Step | Objective | Files | Verification | Status |
|------|-----------|-------|--------------|--------|
| 1 | Add Zod schemas | 1 file | `pnpm check-types` | OK |
| 2 | Extract parts list parser | 2 files | `pnpm check-types` | OK |
| 3 | Add parser tests | 1 file | `pnpm test` | OK |
| 4 | Implement deleteMocFile | 1 file | `pnpm check-types` | OK |
| 5 | Add deleteMocFile tests | 1 file | `pnpm test` | OK |
| 6 | Implement uploadPartsList | 1 file | `pnpm check-types` | OK |
| 7 | Add uploadPartsList tests | 1 file | `pnpm test` | OK |
| 8 | Implement editPresign | 1 file | `pnpm check-types` | OK |
| 9 | Add editPresign tests | 1 file | `pnpm test` | OK |
| 10 | Implement editFinalize | 1 file | `pnpm check-types` | OK |
| 11 | Add editFinalize tests | 1 file | `pnpm test` | OK |
| 12 | Update exports | 1 file | `pnpm build`, `pnpm test` | OK |
| 13 | Upload file handler | 1 file | `pnpm eslint` | OK |
| 14 | Delete file handler | 1 file | `pnpm eslint` | OK |
| 15 | Upload parts list handler | 1 file | `pnpm eslint` | OK |
| 16 | Edit presign handler | 1 file | `pnpm eslint` | OK |
| 17 | Edit finalize handler | 1 file | `pnpm eslint` | OK |
| 18 | Update vercel.json routes | 1 file | Visual inspection | OK |
| 19 | Add seed data | 1 file | `pnpm seed` | OK |
| 20 | Add HTTP tests | 1 file | Visual inspection | OK |

---

## Test Plan Feasibility

### Unit Tests
- **Feasible:** Yes
- **Framework:** Vitest (already configured in `@repo/moc-instructions-core`)
- **Coverage target:** >80% (as specified in AC-57)

### HTTP Tests
- **Feasible:** Yes
- **Location:** `__http__/mocs.http` (file exists, will be extended)
- **Issues:** None

### Playwright
- **Applicable:** No (backend-only story)
- **Issues:** None (correctly marked as NOT APPLICABLE in plan)

---

## Minor Issues (Not Blockers)

### Issue 1: Seed Data ID Discrepancy

**Story:** Specifies test file ID `ffffffff-ffff-ffff-ffff-ffffffff0001`

**Existing Seeds:** `mocs.ts` already has file `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` attached to the same MOC (`dddddddd-dddd-dddd-dddd-dddddddd0001`)

**Resolution:** Can use the existing seeded file ID for delete tests instead of adding new seeds. Alternatively, add the new file ID as planned. Either approach works.

**Impact:** None - both approaches valid

### Issue 2: Story Seed Table ID Mismatch

**Story:** Specifies `eeeeeeee-eeee-eeee-eeee-eeeeeeee0001` for "MOC owned by other user"

**Existing Seeds:** This ID already exists as a MOC owned by `otherUserId` (added in STORY-015)

**Resolution:** No new seed required for this MOC - it already exists.

**Impact:** None - seed already exists

---

## Verdict

**PLAN VALID**

The implementation plan comprehensively addresses all 57 acceptance criteria. All reuse targets exist in the codebase. File paths follow monorepo conventions. Steps are logically sequenced with proper dependencies and verification commands. No blockers identified.

### Readiness Checklist

- [x] All 57 ACs mapped to implementation steps
- [x] All reuse targets verified to exist
- [x] All AWS reference handlers verified to exist
- [x] Parts list parser source verified (`parts-list-parser.ts`)
- [x] File paths follow monorepo conventions
- [x] Steps have verification commands
- [x] Dependencies correctly sequenced
- [x] Test plan is feasible
- [x] No blockers identified

---

## Completion Signal

**PLAN VALID**
