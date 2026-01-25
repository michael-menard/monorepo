# Plan Validation: STORY-009

## Summary
- Status: **VALID**
- Issues Found: 2 (minor)
- Blockers: 0

---

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1 (Sets presign generates valid S3 presigned PUT URLs) | Step 4 | OK |
| AC-2 (Sets register creates set_images row with position) | Step 5 | OK |
| AC-3 (Sets delete removes DB + best-effort S3 cleanup) | Step 6 | OK |
| AC-4 (Wishlist upload processes via Sharp 800px) | Step 9 | OK |
| AC-5 (Gallery upload processes via Sharp 2048px + thumbnail) | Step 11 | OK |
| AC-6 (Gallery upload indexes in OpenSearch) | Step 11 | OK |
| AC-7 (All endpoints require valid Cognito JWT) | Steps 4, 5, 6, 9, 11 | OK |
| AC-8 (All endpoints validate resource ownership) | Steps 4, 5, 6, 9, 11 | OK |
| AC-9 (Invalid/expired tokens return 401) | Steps 4, 5, 6, 9, 11 | OK |
| AC-10 (Sets presign validates filename/contentType) | Step 4 | OK |
| AC-11 (Sets register validates imageUrl/key) | Step 5 | OK |
| AC-12 (Wishlist enforces 5MB limit) | Step 9 | OK |
| AC-13 (Gallery enforces 10MB limit) | Step 11 | OK |
| AC-14 (All uploads validate file type) | Steps 9, 11 | OK |
| AC-15 (Invalid UUIDs return 400) | Steps 4, 5, 6, 9, 11 | OK |
| AC-16 (Missing resources return 404) | Steps 4, 5, 6, 9, 11 | OK |
| AC-17 (Validation errors return 400) | Steps 4, 5, 6, 9, 11 | OK |
| AC-18 (S3 cleanup failures logged but don't fail) | Step 6 | OK |
| AC-19 (OpenSearch failures logged but don't fail) | Step 11 | OK |
| AC-20 (Create @repo/vercel-multipart package) | Steps 1, 2, 3 | OK |
| AC-21 (Configure maxDuration in vercel.json) | Steps 7, 10, 12 | OK |
| AC-22 (All endpoints use @repo/logger) | Steps 4, 5, 6, 9, 11 | OK |
| AC-23 (S3 client uses lazy singleton) | Steps 4, 5, 6, 9, 11 | OK |
| AC-24 (DB connections use max: 1 pool) | Steps 4, 5, 6, 9, 11 | OK |
| AC-25 (Add route rewrites to vercel.json) | Steps 7, 10, 12 | OK |

**Result:** All 25 ACs are addressed in the plan.

---

## File Path Validation

### New Files (to be created)

| Path | Valid Pattern | Status |
|------|---------------|--------|
| `packages/backend/vercel-multipart/package.json` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/tsconfig.json` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/vitest.config.ts` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/src/__types__/index.ts` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/src/index.ts` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/src/parse-multipart.ts` | packages/backend/** | OK |
| `packages/backend/vercel-multipart/src/__tests__/parse-multipart.test.ts` | packages/backend/** | OK |
| `apps/api/platforms/vercel/api/sets/[id]/images/presign.ts` | apps/** | OK |
| `apps/api/platforms/vercel/api/sets/[id]/images/index.ts` | apps/** | OK |
| `apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts` | apps/** | OK |
| `apps/api/platforms/vercel/api/wishlist/[id]/image.ts` | apps/** | OK |
| `apps/api/platforms/vercel/api/gallery/images/upload.ts` | apps/** | OK |
| `apps/api/core/database/seeds/story-009.ts` | apps/** | OK |
| `__http__/story-009-image-uploads.http` | __http__/** | OK |

### Existing Files (to be modified)

| Path | Exists | Status |
|------|--------|--------|
| `apps/api/platforms/vercel/vercel.json` | Yes | OK |
| `apps/api/core/database/seeds/index.ts` | Yes | OK |

**Result:**
- Valid paths: 16
- Invalid paths: 0

---

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `@repo/logger` | Yes | `packages/core/logger/` |
| `@repo/vercel-adapter` | Yes | `packages/backend/vercel-adapter/` |
| `validateCognitoJwt` export | Yes | `packages/backend/vercel-adapter/src/vercel-auth-middleware.ts` |
| `@repo/image-processing` | Yes | `packages/backend/image-processing/` |
| `processImage`, `generateThumbnail` exports | Yes | `packages/backend/image-processing/src/index.ts` |
| `@repo/file-validator` | Yes | `packages/backend/file-validator/` |
| `validateFile`, `createImageValidationConfig` exports | Yes | `packages/backend/file-validator/src/index.ts` |
| `@aws-sdk/client-s3` | Yes | (npm package, standard) |
| `@aws-sdk/s3-request-presigner` | Yes | (npm package, standard) |
| `drizzle-orm` | Yes | (npm package, standard) |
| `filename-sanitizer.ts` | Yes | `apps/api/core/utils/filename-sanitizer.ts` |
| `sanitizeFilenameForS3` export | Yes | `apps/api/core/utils/filename-sanitizer.ts` |
| Existing Vercel handler pattern | Yes | `apps/api/platforms/vercel/api/wishlist/[id].ts` |
| Lambda multipart-parser (reference) | Yes | `packages/backend/lambda-utils/src/multipart-parser.ts` |

**Result:** All 14 reuse targets exist and are available.

---

## Step Analysis

- **Total steps:** 15
- **Steps with verification:** 15 (100%)

### Step Verification Actions

| Step | Objective | Verification Action | Status |
|------|-----------|---------------------|--------|
| 1 | Scaffold @repo/vercel-multipart | `pnpm install && pnpm --filter @repo/vercel-multipart build` | OK |
| 2 | Implement parseVercelMultipart | `pnpm --filter @repo/vercel-multipart check-types` | OK |
| 3 | Add unit tests for multipart parser | `pnpm --filter @repo/vercel-multipart test` | OK |
| 4 | Create Sets presign endpoint | `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/presign.ts --fix` | OK |
| 5 | Create Sets register endpoint | `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/index.ts --fix` | OK |
| 6 | Create Sets delete endpoint | `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts --fix` | OK |
| 7 | Add vercel.json rewrites for Sets | JSON syntax validation | OK |
| 8 | Create seed data for STORY-009 | `pnpm --filter lego-api-vercel check-types` | OK |
| 9 | Create Wishlist image upload endpoint | `pnpm eslint apps/api/platforms/vercel/api/wishlist/[id]/image.ts --fix` | OK |
| 10 | Add vercel.json rewrite for Wishlist | JSON syntax validation | OK |
| 11 | Create Gallery image upload endpoint | `pnpm eslint apps/api/platforms/vercel/api/gallery/images/upload.ts --fix` | OK |
| 12 | Add vercel.json rewrite for Gallery | JSON syntax validation | OK |
| 13 | Create HTTP contract test file | File created with 7+ requests | OK |
| 14 | Run scoped lint on all new files | Eslint command | OK |
| 15 | Final verification | Multiple pnpm commands | OK |

### Issues Found

1. **Minor:** Step 8 verification command uses `pnpm --filter lego-api-vercel check-types` which will check all Vercel API files, not just the seed file. This is acceptable but broader than necessary.

2. **Minor:** The plan mentions `busboy` as a dependency for the new package but does not explicitly list it in Step 1 package.json creation. The implementer should ensure `busboy` and `@types/busboy` are added as dependencies.

---

## Test Plan Feasibility

### .http Files

| Requirement | Feasible | Notes |
|-------------|----------|-------|
| Create `__http__/story-009-image-uploads.http` | Yes | Directory `__http__/` exists with similar files |
| 7+ request definitions | Yes | Plan specifies: presignSetImage (200), presignSetImage401, presignSetImage403, presignSetImage404, registerSetImage, deleteSetImage, deleteSetImage404 |

### curl Commands for Multipart

| Requirement | Feasible | Notes |
|-------------|----------|-------|
| Wishlist upload (HP-WISHLIST-001) | Yes | curl with -F flag is standard |
| Gallery upload (HP-GALLERY-001) | Yes | curl with multiple -F fields is standard |
| Error case: File too large | Yes | Can use `dd` to create test file |
| Error case: Invalid file type | Yes | Can use any PDF file |

### Playwright Tests

**Status:** Not Applicable - Backend-only story with no UI changes (correctly identified in plan).

### pnpm Commands

| Command | Valid | Notes |
|---------|-------|-------|
| `pnpm install` | Yes | Standard |
| `pnpm --filter @repo/vercel-multipart build` | Yes | Standard filter syntax |
| `pnpm --filter @repo/vercel-multipart check-types` | Yes | Standard filter syntax |
| `pnpm --filter @repo/vercel-multipart test` | Yes | Standard filter syntax |
| `pnpm --filter lego-api-vercel check-types` | Yes | Filter matches vercel.json name |
| `pnpm eslint <path> --fix` | Yes | Standard |

---

## Architecture Compliance

### Handler Pattern Verification

The story mandates "Native Vercel Handler Pattern" (NOT Lambda adapter). The plan correctly references:
- `apps/api/platforms/vercel/api/wishlist/[id].ts` as the template
- Inline auth helper (`getAuthUserId()`)
- Direct `res.status().json()` responses
- DB singleton pattern with `max: 1` pool

**Status:** Compliant

### Package Placement

| Package | Location | Architecture Rule | Status |
|---------|----------|-------------------|--------|
| vercel-multipart | packages/backend/ | Backend utilities go in packages/backend/ | OK |

### Import Rules

The plan correctly identifies:
- Use `@repo/logger` (not console.log)
- Use `@repo/vercel-adapter` for `validateCognitoJwt` only
- Do NOT use `@repo/lambda-responses`
- Do NOT use `@repo/lambda-auth`

**Status:** Compliant

---

## Risks (Non-Blocking)

1. **Sharp on Vercel:** The plan acknowledges this risk and suggests verification in Phase 2 before proceeding. Mitigation is sound.

2. **VercelRequest multipart parsing:** The plan notes `VercelRequest` extends `http.IncomingMessage` and Busboy should work. Step 3 tests will validate this early.

3. **Pre-existing monorepo failures:** The plan correctly uses scoped `--filter` commands throughout to avoid full build failures.

---

## Verdict

**PLAN VALID**

The implementation plan is comprehensive and well-structured:

- All 25 acceptance criteria are mapped to specific implementation steps
- All file paths follow the monorepo architecture rules
- All 14 reuse targets exist and are verified
- All 15 steps have verification actions
- Test plan is feasible with .http files and curl commands
- Handler pattern decision is clearly documented and compliant
- Risks are identified with appropriate mitigations

### Minor Recommendations (not blockers)

1. Ensure `busboy` and `@types/busboy` are explicitly added to the vercel-multipart package.json in Step 1.
2. Consider adding a more targeted seed verification command in Step 8.

---

**PLAN VALID**
