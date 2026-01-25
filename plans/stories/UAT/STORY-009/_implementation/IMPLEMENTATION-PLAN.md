# IMPLEMENTATION PLAN: STORY-009

## Story: Image Uploads - Phase 1 (Simple Presign Pattern)

---

# Scope Surface

- **backend/API**: yes - 5 new Vercel handlers, 1 new package, seeds, vercel.json
- **frontend/UI**: no - not modifying frontend components
- **infra/config**: yes - vercel.json updates for routes and function timeouts
- **notes**: Multipart parsing is the main technical risk. Sharp compatibility on Vercel should be verified early (Phase 2).

---

# Acceptance Criteria Checklist

**Core Functionality**
- [ ] AC-1: Sets presign generates valid S3 presigned PUT URLs (5-min expiry)
- [ ] AC-2: Sets register creates `set_images` row with auto-increment position
- [ ] AC-3: Sets delete removes DB record + best-effort S3 cleanup
- [ ] AC-4: Wishlist upload processes via Sharp (800px, WebP, 80% quality), updates `imageUrl`
- [ ] AC-5: Gallery upload processes via Sharp (2048px, WebP, 80% quality), generates 400px thumbnail
- [ ] AC-6: Gallery upload indexes in OpenSearch (non-blocking, best-effort)

**Authentication & Authorization**
- [ ] AC-7: All endpoints require valid Cognito JWT
- [ ] AC-8: All endpoints validate resource ownership (403 on mismatch)
- [ ] AC-9: Invalid/expired tokens return 401

**Validation**
- [ ] AC-10: Sets presign validates filename and contentType provided
- [ ] AC-11: Sets register validates imageUrl is valid URL, key provided
- [ ] AC-12: Wishlist upload enforces 5MB limit
- [ ] AC-13: Gallery upload enforces 10MB limit
- [ ] AC-14: All uploads validate file type (JPEG, PNG, WebP only)
- [ ] AC-15: Invalid UUIDs return 400

**Error Handling**
- [ ] AC-16: Missing resources return 404
- [ ] AC-17: Validation errors return 400 with descriptive message
- [ ] AC-18: S3 cleanup failures logged but don't fail request
- [ ] AC-19: OpenSearch failures logged but don't fail gallery upload

**Technical Requirements**
- [ ] AC-20: Create `@repo/vercel-multipart` package
- [ ] AC-21: Configure `maxDuration` in vercel.json (10s presign, 30s uploads)
- [ ] AC-22: All endpoints use `@repo/logger`
- [ ] AC-23: S3 client uses lazy singleton pattern
- [ ] AC-24: DB connections use `max: 1` pool size
- [ ] AC-25: Add route rewrites to vercel.json

---

# Files To Touch (Expected)

## New Files (Create)

### Package: @repo/vercel-multipart
```
packages/backend/vercel-multipart/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts                    # Main exports
    parse-multipart.ts          # Busboy-based parser for VercelRequest
    __types__/index.ts          # Zod schemas: ParsedFile, ParsedFormData
    __tests__/
      parse-multipart.test.ts   # Unit tests for parser
```

### Vercel Handlers
```
apps/api/platforms/vercel/api/
  sets/[id]/images/
    presign.ts                  # POST - presigned URL generation
    index.ts                    # POST - image registration
    [imageId].ts                # DELETE - image deletion
  wishlist/[id]/
    image.ts                    # POST - multipart upload with Sharp
  gallery/images/
    upload.ts                   # POST - multipart upload with Sharp + OpenSearch
```

### Seed File
```
apps/api/core/database/seeds/story-009.ts   # Test entities for both users
```

### HTTP Contract
```
__http__/story-009-image-uploads.http       # Presign/register/delete tests
```

## Existing Files (Modify)

```
apps/api/platforms/vercel/vercel.json       # Add rewrites + function configs
apps/api/core/database/seeds/index.ts       # Import story-009 seed
```

---

# Reuse Targets

| Package/Module | What to Reuse | Location |
|----------------|---------------|----------|
| `@repo/logger` | Structured logging | All handlers |
| `@repo/vercel-adapter` | `validateCognitoJwt` for production auth | All handlers (future) |
| `@repo/image-processing` | `processImage`, `generateThumbnail` | Wishlist + Gallery uploads |
| `@repo/file-validator` | `validateFile`, `createImageValidationConfig` | Wishlist + Gallery uploads |
| `@aws-sdk/client-s3` | `S3Client`, `PutObjectCommand`, `DeleteObjectCommand` | All handlers |
| `@aws-sdk/s3-request-presigner` | `getSignedUrl` | Sets presign handler |
| `drizzle-orm` | DB operations | All handlers |
| `filename-sanitizer.ts` | `sanitizeFilenameForS3` | Sets presign handler |
| Existing Vercel handler patterns | `getDb()`, `getAuthUserId()`, inline schemas | Template for all handlers |

### Patterns to Copy From Existing Handlers
- `apps/api/platforms/vercel/api/wishlist/[id].ts` - Auth bypass, DB singleton, method routing
- `apps/api/platforms/vercel/api/gallery/images/[id].ts` - S3 lazy init, best-effort cleanup
- `packages/backend/lambda-utils/src/multipart-parser.ts` - Busboy parsing logic (adapt for Vercel)

---

# Architecture Notes (Ports & Adapters)

## Core Package: @repo/vercel-multipart

**Purpose**: Parse multipart form data from `VercelRequest` (Node.js `IncomingMessage`)

**Responsibilities**:
- Parse multipart/form-data using Busboy
- Return typed `ParsedFormData` with fields and files
- Support configurable limits (file size, file count, field count)

**Does NOT**:
- Validate file types (caller responsibility via @repo/file-validator)
- Process images (caller uses @repo/image-processing)
- Upload to S3 (handler responsibility)

## Handler Layer (Vercel Functions)

**Pattern**: Native Vercel handler (NOT Lambda adapter)

```
export default async function handler(req: VercelRequest, res: VercelResponse)
  -> getAuthUserId() [inline auth helper with AUTH_BYPASS support]
  -> parseVercelMultipart(req) [for uploads]
  -> validateFile() [for uploads]
  -> processImage() / generateThumbnail() [for uploads]
  -> S3 operations (inline, lazy singleton)
  -> DB operations (inline drizzle)
  -> OpenSearch index [gallery only, best-effort]
  -> res.status().json()
```

## Boundary Protection

1. **Auth bypass guardrail**: Inline helper respects `AUTH_BYPASS` env var
2. **S3 cleanup isolation**: Delete operations log failures but never fail the request
3. **OpenSearch isolation**: Gallery indexing is best-effort, non-blocking
4. **Validation at handler entry**: UUID format, body parsing, ownership all validated early

---

# Step-by-Step Plan (Small Steps)

## Phase 1: Vercel Multipart Package (Steps 1-3)

### Step 1: Scaffold @repo/vercel-multipart package
**Objective**: Create package structure with Zod types
**Files**:
- `packages/backend/vercel-multipart/package.json`
- `packages/backend/vercel-multipart/tsconfig.json`
- `packages/backend/vercel-multipart/vitest.config.ts`
- `packages/backend/vercel-multipart/src/__types__/index.ts`
- `packages/backend/vercel-multipart/src/index.ts`

**Verification**: `pnpm install && pnpm --filter @repo/vercel-multipart build`

### Step 2: Implement parseVercelMultipart function
**Objective**: Adapt Lambda multipart parser for VercelRequest
**Files**:
- `packages/backend/vercel-multipart/src/parse-multipart.ts`
- Update `src/index.ts` exports

**Verification**: `pnpm --filter @repo/vercel-multipart check-types`

### Step 3: Add unit tests for multipart parser
**Objective**: Test parsing logic with mock requests
**Files**:
- `packages/backend/vercel-multipart/src/__tests__/parse-multipart.test.ts`

**Verification**: `pnpm --filter @repo/vercel-multipart test`

---

## Phase 2: Sets Endpoints - Presign Pattern (Steps 4-8)

### Step 4: Create Sets presign endpoint
**Objective**: Generate presigned S3 PUT URLs
**Files**:
- `apps/api/platforms/vercel/api/sets/[id]/images/presign.ts`

**Verification**: `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/presign.ts --fix`

### Step 5: Create Sets register endpoint
**Objective**: Register uploaded image in DB with auto-increment position
**Files**:
- `apps/api/platforms/vercel/api/sets/[id]/images/index.ts`

**Verification**: `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/index.ts --fix`

### Step 6: Create Sets delete endpoint
**Objective**: Delete image with best-effort S3 cleanup
**Files**:
- `apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts`

**Verification**: `pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts --fix`

### Step 7: Add vercel.json rewrites for Sets image endpoints
**Objective**: Configure routes and function timeouts
**Files**:
- `apps/api/platforms/vercel/vercel.json` (modify)

**Verification**: Validate JSON syntax: `node -e "require('./apps/api/platforms/vercel/vercel.json')"`

### Step 8: Create seed data for STORY-009
**Objective**: Deterministic test entities for both users
**Files**:
- `apps/api/core/database/seeds/story-009.ts`
- `apps/api/core/database/seeds/index.ts` (modify)

**Verification**: `pnpm --filter lego-api-vercel check-types`

---

## Phase 3: Wishlist Upload Endpoint (Steps 9-10)

### Step 9: Create Wishlist image upload endpoint
**Objective**: Multipart upload with Sharp processing (800px, WebP)
**Files**:
- `apps/api/platforms/vercel/api/wishlist/[id]/image.ts`

**Verification**: `pnpm eslint apps/api/platforms/vercel/api/wishlist/[id]/image.ts --fix`

### Step 10: Add vercel.json rewrite for Wishlist image endpoint
**Objective**: Configure route and 30s timeout
**Files**:
- `apps/api/platforms/vercel/vercel.json` (modify)

**Verification**: Validate JSON syntax

---

## Phase 4: Gallery Upload Endpoint (Steps 11-12)

### Step 11: Create Gallery image upload endpoint
**Objective**: Multipart upload with Sharp + thumbnail + OpenSearch
**Files**:
- `apps/api/platforms/vercel/api/gallery/images/upload.ts`

**Verification**: `pnpm eslint apps/api/platforms/vercel/api/gallery/images/upload.ts --fix`

### Step 12: Add vercel.json rewrite for Gallery upload endpoint
**Objective**: Configure route and 30s timeout
**Files**:
- `apps/api/platforms/vercel/vercel.json` (modify)

**Verification**: Validate JSON syntax

---

## Phase 5: HTTP Contract & Final Verification (Steps 13-15)

### Step 13: Create HTTP contract test file
**Objective**: Document all API requests for manual testing
**Files**:
- `__http__/story-009-image-uploads.http`

**Verification**: File created with 7+ request definitions per story spec

### Step 14: Run scoped lint on all new files
**Objective**: Catch Prettier/ESLint issues before final verification
**Files**: All new handler files

**Verification**:
```bash
pnpm eslint \
  packages/backend/vercel-multipart/src/**/*.ts \
  apps/api/platforms/vercel/api/sets/[id]/images/*.ts \
  apps/api/platforms/vercel/api/wishlist/[id]/image.ts \
  apps/api/platforms/vercel/api/gallery/images/upload.ts \
  --fix
```

### Step 15: Final verification
**Objective**: Confirm all AC criteria met
**Verification**:
```bash
# Type check new package
pnpm --filter @repo/vercel-multipart check-types

# Type check Vercel API
pnpm --filter lego-api-vercel check-types

# Run multipart package tests
pnpm --filter @repo/vercel-multipart test

# Lint all new files
pnpm eslint packages/backend/vercel-multipart/src/**/*.ts --fix
pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/*.ts --fix
pnpm eslint apps/api/platforms/vercel/api/wishlist/[id]/image.ts --fix
pnpm eslint apps/api/platforms/vercel/api/gallery/images/upload.ts --fix
```

---

# Test Plan

## Unit Tests

| Command | Package | Coverage |
|---------|---------|----------|
| `pnpm --filter @repo/vercel-multipart test` | vercel-multipart | Multipart parsing |

## Type Checking (Scoped)

```bash
# New package
pnpm --filter @repo/vercel-multipart check-types

# Vercel handlers
pnpm --filter lego-api-vercel check-types
```

## Lint (Scoped)

```bash
pnpm eslint packages/backend/vercel-multipart/src/**/*.ts
pnpm eslint apps/api/platforms/vercel/api/sets/[id]/images/*.ts
pnpm eslint apps/api/platforms/vercel/api/wishlist/[id]/image.ts
pnpm eslint apps/api/platforms/vercel/api/gallery/images/upload.ts
```

## HTTP Contract Testing (Local Dev)

### Prerequisites
1. `docker-compose up -d` (PostgreSQL)
2. `pnpm seed` (seed data)
3. `AUTH_BYPASS=true DEV_USER_SUB=dev-user-00000000-0000-0000-0000-000000000001 vercel dev`

### .http Requests (via VS Code REST Client)
- Execute `__http__/story-009-image-uploads.http` requests
- Verify response status codes and bodies

### curl Commands for Multipart Uploads
```bash
# Wishlist upload (HP-WISHLIST-001)
curl -X POST "http://localhost:3000/api/wishlist/{wishlistItemId}/image" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg"

# Gallery upload (HP-GALLERY-001)
curl -X POST "http://localhost:3000/api/gallery/images/upload" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg" \
  -F "title=Test Image" \
  -F "tags=test,example"
```

## Playwright

**NOT APPLICABLE** - Backend-only story with no UI changes

---

# Stop Conditions / Blockers

## No Blockers Identified

The story specification is complete with:
- Clear endpoint definitions and paths
- Handler pattern decision (native Vercel, not Lambda adapter)
- Explicit package reuse plan
- Concrete vercel.json configuration
- Detailed test plan with curl commands

## Potential Risks (Not Blockers)

1. **Sharp on Vercel**: May require `@vercel/node` sharp handling or `sharp-linux-x64` dependency. Mitigation: Verify in Phase 2 before proceeding to Phases 3-4.

2. **Multipart parsing in Vercel**: `VercelRequest` inherits from `http.IncomingMessage`. The story assumes Busboy can parse this. If not, may need to buffer the request body first. Mitigation: Step 3 tests will surface this early.

3. **Pre-existing monorepo failures**: Per LESSONS-LEARNED, full `pnpm build` may fail due to other packages. Mitigation: Use scoped commands (`--filter`) throughout.

---

## Summary

- **Total Files to Create**: ~15 (package scaffold + handlers + seed + http)
- **Total Files to Modify**: 2 (vercel.json, seeds/index.ts)
- **Steps**: 15
- **Estimated Test Count**: ~10-15 unit tests for multipart package
- **HTTP Requests**: 7+ in .http file + curl commands for multipart

---

*Plan generated: 2026-01-19*
*Story: STORY-009 - Image Uploads Phase 1*
