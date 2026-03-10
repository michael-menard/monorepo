---
status: uat
---

# STORY-009: Image Uploads - Phase 1 (Simple Presign Pattern)

## Title

Migrate image upload endpoints (Sets, Wishlist, Gallery) from AWS Lambda to Vercel serverless functions

## Context

This story is part of the Vercel migration initiative. We are migrating all simple single-file image uploads from AWS Lambda to Vercel serverless functions. The existing AWS handlers use two patterns:

1. **Presign Pattern** (Sets): Client requests presigned URL → uploads directly to S3 → registers URL in DB
2. **Direct Upload Pattern** (Wishlist, Gallery): Client sends multipart form → server processes with Sharp → uploads to S3

Both patterns require authentication, ownership validation, and proper S3 integration. The migration must preserve all existing functionality while adapting to Vercel's runtime environment.

## Goal

Enable image upload functionality for Sets, Wishlist, and Gallery features through Vercel serverless functions, maintaining feature parity with existing AWS Lambda handlers.

## Non-Goals

- **NOT** migrating complex multipart upload sessions (STORY-017)
- **NOT** implementing chunked/resumable uploads
- **NOT** changing S3 bucket structure or naming conventions
- **NOT** modifying frontend upload components
- **NOT** implementing new image processing features beyond current Sharp behavior
- **NOT** adding new file types beyond current allowed types (JPEG, PNG, WebP)

## Scope

### Endpoints to Migrate

| Endpoint | Method | Path | Source Handler |
|----------|--------|------|----------------|
| Sets Presign | POST | `/api/sets/:id/images/presign` | `sets/images/presign/handler.ts` |
| Sets Register | POST | `/api/sets/:id/images` | `sets/images/register/handler.ts` |
| Sets Delete | DELETE | `/api/sets/:id/images/:imageId` | `sets/images/delete/handler.ts` |
| Wishlist Upload | POST | `/api/wishlist/:id/image` | `wishlist/upload-image/handler.ts` |
| Gallery Upload | POST | `/api/gallery/images/upload` | `gallery/upload-image/handler.ts` |

### Packages/Apps Affected

**New Vercel Routes:**
- `apps/api/platforms/vercel/api/sets/[id]/images/presign.ts`
- `apps/api/platforms/vercel/api/sets/[id]/images/index.ts`
- `apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts`
- `apps/api/platforms/vercel/api/wishlist/[id]/image.ts`
- `apps/api/platforms/vercel/api/gallery/images/upload.ts`

**New Shared Package (required):**
- `packages/backend/vercel-multipart` - Multipart form parser for Vercel requests

**Configuration:**
- `apps/api/platforms/vercel/vercel.json` - Function timeout configuration and route rewrites

## Acceptance Criteria

### Core Functionality

- [ ] **AC-1:** Sets presign endpoint generates valid S3 presigned PUT URLs with 5-minute expiry
- [ ] **AC-2:** Sets register endpoint creates `set_images` row with correct position auto-increment
- [ ] **AC-3:** Sets delete endpoint removes DB record and attempts S3 cleanup (best-effort)
- [ ] **AC-4:** Wishlist upload processes images via Sharp (max 800px, WebP, 80% quality) and updates `imageUrl`
- [ ] **AC-5:** Gallery upload processes images via Sharp (max 2048px, WebP, 80% quality), generates 400px thumbnail, and creates `gallery_images` row
- [ ] **AC-6:** Gallery upload indexes document in OpenSearch (non-blocking, best-effort)

### Authentication & Authorization

- [ ] **AC-7:** All endpoints require valid Cognito JWT authentication
- [ ] **AC-8:** All endpoints validate resource ownership (403 if resource belongs to another user)
- [ ] **AC-9:** Invalid/expired tokens return 401 Unauthorized

### Validation

- [ ] **AC-10:** Sets presign validates filename and contentType are provided
- [ ] **AC-11:** Sets register validates imageUrl is a valid URL and key is provided
- [ ] **AC-12:** Wishlist upload enforces 5MB file size limit
- [ ] **AC-13:** Gallery upload enforces 10MB file size limit
- [ ] **AC-14:** All uploads validate file type (JPEG, PNG, WebP only)
- [ ] **AC-15:** Invalid UUIDs in path parameters return 400 Bad Request

### Error Handling

- [ ] **AC-16:** Missing resources return 404 Not Found with appropriate message
- [ ] **AC-17:** Validation errors return 400 Bad Request with descriptive message
- [ ] **AC-18:** S3 cleanup failures in delete operations are logged but do not fail the request
- [ ] **AC-19:** OpenSearch indexing failures are logged but do not fail the gallery upload

### Technical Requirements

- [ ] **AC-20:** Create `@repo/vercel-multipart` package for Vercel-native multipart parsing
- [ ] **AC-21:** Configure `maxDuration: 30` in vercel.json for upload endpoints
- [ ] **AC-22:** All endpoints use `@repo/logger` for structured logging
- [ ] **AC-23:** S3 client uses lazy initialization pattern (singleton per function instance)
- [ ] **AC-24:** Database connections use `max: 1` pool size (serverless pattern)
- [ ] **AC-25:** Add route rewrites to vercel.json for all new upload endpoints

## Handler Pattern Decision

**Decision: Use Native Vercel Handler Pattern**

All new endpoints in this story MUST follow the **native Vercel handler pattern** established in existing Vercel handlers (e.g., `wishlist/[id].ts`, `gallery/images/[id].ts`). This means:

1. **Direct VercelRequest/VercelResponse** - Do not use Lambda adapter pattern
2. **Inline auth helper** - Use `getAuthUserId()` pattern with `AUTH_BYPASS` support for local dev
3. **Direct Drizzle queries** - Inline DB operations, not Lambda-adapted events
4. **Native response methods** - Use `res.status(200).json({...})` directly

**Rationale:** Consistency with existing codebase. Lambda adapter pattern (`transformRequest`, `createVercelHandler`) is reserved for future hybrid scenarios.

**Package usage clarification:**
- `@repo/vercel-adapter` → Use `validateCognitoJwt` for production JWT validation only
- `@repo/lambda-auth` → NOT used in Vercel handlers (Lambda-specific)
- `@repo/lambda-responses` → NOT used in Vercel handlers (use native res.status().json())

## Reuse Plan

### Existing Packages to Use

| Package | Usage |
|---------|-------|
| `@repo/logger` | Structured logging in all endpoints |
| `@repo/vercel-adapter` | `validateCognitoJwt` for production JWT validation |
| `@repo/file-validator` | `validateFile`, `createImageValidationConfig` |
| `@repo/image-processing` | `processImage`, `generateThumbnail` (Sharp wrappers) |
| `@aws-sdk/client-s3` | S3 operations (already used in existing Vercel handlers) |
| `@aws-sdk/s3-request-presigner` | Presigned URL generation |
| `drizzle-orm` | Database operations |

### New Package to Create

**`packages/backend/vercel-multipart`**
- Purpose: Parse multipart form data from `VercelRequest` (Node.js `IncomingMessage`)
- Dependencies: `busboy`
- Exports: `parseVercelMultipart(req: VercelRequest): Promise<ParsedFormData>`
- Reuses: File validation logic from `@repo/file-validator` concepts

### Prohibited Patterns

- Do NOT copy multipart parsing logic into endpoint files
- Do NOT create endpoint-specific S3 clients (use shared initialization pattern)
- Do NOT use Lambda adapter pattern (`transformRequest`, `createVercelHandler`)
- Do NOT use `@repo/lambda-responses` (use native Vercel response methods)
- Do NOT use `@repo/lambda-auth` (use inline auth pattern)

## Architecture Notes (Ports & Adapters)

### Port Interfaces

- **ImageUploadPort**: Generates presigned URLs, handles S3 uploads/deletes
- **ImageRegistrationPort**: Creates/updates/deletes image records in database
- **ImageProcessingPort**: Resizes and converts images (Sharp)
- **SearchIndexPort**: Indexes documents in OpenSearch (gallery only)

### Adapter Implementations

| Port | Adapter | Location |
|------|---------|----------|
| ImageUploadPort | S3Adapter | Inline in handlers (existing pattern) |
| ImageRegistrationPort | DrizzleAdapter | Inline in handlers (existing pattern) |
| ImageProcessingPort | SharpAdapter | `@repo/image-processing` |
| SearchIndexPort | OpenSearchAdapter | `@/core/search/opensearch` |

### Request Flow

```
VercelRequest
    → getAuthUserId() [inline auth helper]
    → parseVercelMultipart (vercel-multipart) [for uploads]
    → validateFile (file-validator) [for uploads]
    → processImage (image-processing) [for uploads]
    → S3 operations (aws-sdk)
    → DB operations (drizzle)
    → OpenSearch index (gallery only)
    → res.status().json() [native Vercel response]
```

## Required Vercel / Infra Notes

### Environment Variables

| Variable | Required By | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | All | PostgreSQL connection string |
| `AWS_REGION` | All S3 ops | AWS region (e.g., `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | All S3 ops | IAM credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | All S3 ops | IAM credentials for S3 |
| `S3_BUCKET` | All uploads | S3 bucket for all image uploads |
| `COGNITO_USER_POOL_ID` | All | Cognito user pool ID |
| `COGNITO_CLIENT_ID` | All | Cognito client ID |
| `OPENSEARCH_ENDPOINT` | Gallery endpoint | OpenSearch domain endpoint |
| `AUTH_BYPASS` | Dev only | Enable auth bypass for local dev |
| `DEV_USER_SUB` | Dev only | Mock user ID for local dev |

### S3 Key Prefixes

All uploads use a single bucket with folder prefixes:

| Feature | Prefix Pattern | Example Key |
|---------|----------------|-------------|
| Sets | `sets/{setId}/` | `sets/abc123/image1.webp` |
| Gallery | `gallery/{userId}/` | `gallery/user456/photo.webp` |
| Wishlist | `wishlist/{userId}/` | `wishlist/user456/item.webp` |

### Infrastructure References (Dev)

| Resource | Value |
|----------|-------|
| S3 Bucket | `lego-api-files-dev-213351177820` |
| Cognito User Pool | `us-east-1_vtW1Slo3o` |
| Cognito Client ID | `4527ui02h63b7c0ra7vs00gua5` |
| Cognito Issuer | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_vtW1Slo3o` |

### AWS Authentication for Vercel

Two approaches for Vercel to access AWS resources (S3):

**Option 1: Vercel OIDC (Recommended for Production)**

Uses Vercel's built-in OIDC provider for secure, credential-less authentication.

1. Deploy storage stack with `VERCEL_OWNER_ID`:
   ```bash
   VERCEL_OWNER_ID=team_xxxxx pnpm serverless deploy --config stacks/infrastructure/storage.yml --stage dev
   ```

2. In Vercel project settings, enable AWS integration and select the `lego-api-vercel-s3-dev` role.

3. No env vars needed - Vercel handles token exchange automatically.

**Permissions granted via OIDC role:**
- `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
- `s3:GetObjectTagging`, `s3:PutObjectTagging`
- `s3:CreateMultipartUpload`, `s3:UploadPart`, `s3:CompleteMultipartUpload`, `s3:AbortMultipartUpload`, `s3:ListMultipartUploadParts`

**Option 2: Static IAM Credentials (Simpler for Dev)**

Uses traditional IAM user credentials.

1. Create IAM user in AWS Console
2. Attach the `lego-api-s3-access-dev` managed policy
3. Generate access keys
4. Add to Vercel env vars:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION=us-east-1`

**Trade-offs:**

| Aspect | OIDC | Static Credentials |
|--------|------|-------------------|
| Security | Better (no long-lived secrets) | Requires key rotation |
| Setup | More complex initial setup | Simpler |
| Maintenance | Zero maintenance | Must rotate keys |
| Local Dev | N/A (use static for local) | Works everywhere |

### vercel.json Configuration

```json
{
  "rewrites": [
    { "source": "/api/sets/:id/images/presign", "destination": "/api/sets/[id]/images/presign.ts" },
    { "source": "/api/sets/:id/images/:imageId", "destination": "/api/sets/[id]/images/[imageId].ts" },
    { "source": "/api/sets/:id/images", "destination": "/api/sets/[id]/images/index.ts" },
    { "source": "/api/wishlist/:id/image", "destination": "/api/wishlist/[id]/image.ts" },
    { "source": "/api/gallery/images/upload", "destination": "/api/gallery/images/upload.ts" }
  ],
  "functions": {
    "api/sets/[id]/images/presign.ts": {
      "maxDuration": 10
    },
    "api/sets/[id]/images/index.ts": {
      "maxDuration": 10
    },
    "api/sets/[id]/images/[imageId].ts": {
      "maxDuration": 10
    },
    "api/wishlist/[id]/image.ts": {
      "maxDuration": 30
    },
    "api/gallery/images/upload.ts": {
      "maxDuration": 30
    }
  }
}
```

### Vercel Plan Requirement

- **Pro plan required** for uploads >4.5MB (Hobby plan body size limit)
- Gallery upload with 10MB limit requires Pro plan
- Sets presign pattern works on Hobby plan (client uploads directly to S3)

### S3 CORS Configuration

Direct browser uploads require S3 bucket CORS:

```json
{
  "AllowedOrigins": ["https://*.vercel.app", "http://localhost:*"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type", "x-amz-*"],
  "ExposeHeaders": ["ETag"]
}
```

## HTTP Contract Plan

### Required `.http` Requests

Create `__http__/story-009-image-uploads.http` with:

| Request Name | Method | Path | Evidence |
|--------------|--------|------|----------|
| `presignSetImage` | POST | `/api/sets/{id}/images/presign` | 200 + uploadUrl, imageUrl, key |
| `presignSetImage401` | POST | (no auth) | 401 |
| `presignSetImage403` | POST | (other user's set) | 403 |
| `presignSetImage404` | POST | (non-existent set) | 404 |
| `registerSetImage` | POST | `/api/sets/{id}/images` | 201 + id, imageUrl, position |
| `deleteSetImage` | DELETE | `/api/sets/{id}/images/{imageId}` | 204 |
| `deleteSetImage404` | DELETE | (non-existent image) | 404 |

### Required curl Commands for Multipart Uploads

Multipart upload tests cannot use `.http` files due to binary data limitations. Use the following curl commands:

#### Wishlist Upload (HP-WISHLIST-001)

```bash
# Replace {wishlistItemId} with seed UUID and {token} with valid JWT
curl -X POST "http://localhost:3000/api/wishlist/{wishlistItemId}/image" \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg"

# Expected: 200 OK with { "imageUrl": "https://..." }
```

#### Wishlist Upload - Auth Bypass (Local Dev)

```bash
# With AUTH_BYPASS=true
curl -X POST "http://localhost:3000/api/wishlist/00000000-0000-0000-0000-000000000001/image" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg"
```

#### Gallery Upload (HP-GALLERY-001)

```bash
# Replace {token} with valid JWT
curl -X POST "http://localhost:3000/api/gallery/images/upload" \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg" \
  -F "title=Test Image" \
  -F "tags=test,example"

# Expected: 201 Created with { "id": "...", "imageUrl": "...", "thumbnailUrl": "..." }
```

#### Gallery Upload - Auth Bypass (Local Dev)

```bash
# With AUTH_BYPASS=true
curl -X POST "http://localhost:3000/api/gallery/images/upload" \
  -F "file=@/path/to/test-image.jpg;type=image/jpeg" \
  -F "title=Test Image"
```

#### Error Case: File Too Large (ERR-VAL-009)

```bash
# Create 6MB test file
dd if=/dev/zero of=/tmp/large-file.jpg bs=1M count=6

curl -X POST "http://localhost:3000/api/wishlist/{wishlistItemId}/image" \
  -F "file=@/tmp/large-file.jpg;type=image/jpeg"

# Expected: 400 Bad Request with validation error
```

#### Error Case: Invalid File Type (ERR-VAL-008)

```bash
curl -X POST "http://localhost:3000/api/gallery/images/upload" \
  -F "file=@/path/to/document.pdf;type=application/pdf" \
  -F "title=Invalid File"

# Expected: 400 Bad Request with file type validation error
```

### Required Evidence

- HTTP response status codes
- Response body JSON (for success cases)
- Database query showing created/updated/deleted records
- S3 verification showing objects exist after upload

## Seed Requirements

### Required Entities

For testing, `pnpm seed` must create:

1. **User A (authenticated test user):**
   - `sets` row with `id = {setId}`, `userId = {userAId}`
   - `set_images` rows for position testing (positions 0, 1)
   - `wishlist_items` row with `id = {wishlistItemId}`, `userId = {userAId}`
   - `gallery_albums` row with `id = {albumId}`, `userId = {userAId}`

2. **User B (other user for permission tests):**
   - `sets` row with `id = {otherUserSetId}`, `userId = {userBId}`
   - `wishlist_items` row with `id = {otherUserWishlistId}`, `userId = {userBId}`

### Seed Code Location

- `apps/api/core/database/seeds/story-009.ts`

### Deterministic & Idempotent

- Seed must use fixed UUIDs (not random)
- Re-running seed must not create duplicates (upsert pattern)
- Seed output must log created entity IDs for test reference

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| Test ID | Endpoint | Input | Expected Output | Side Effects |
|---------|----------|-------|-----------------|--------------|
| HP-PRESIGN-001 | Sets Presign | Valid set, filename, contentType | 200 + uploadUrl, imageUrl, key | None |
| HP-REGISTER-001 | Sets Register | Valid set, imageUrl, key | 201 + SetImage object | DB row at position 0 |
| HP-REGISTER-002 | Sets Register | Set with existing image | 201 + SetImage with position 1 | DB row auto-incremented |
| HP-DELETE-001 | Sets Delete | Valid set and image | 204 No Content | DB row deleted, S3 cleanup |
| HP-WISHLIST-001 | Wishlist Upload | Valid item, JPEG file | 200 + imageUrl | Sharp processing, S3, DB update |
| HP-GALLERY-001 | Gallery Upload | Valid file, title, tags | 201 + GalleryImage | Sharp + thumbnail, S3 x2, DB, OpenSearch |
| HP-GALLERY-002 | Gallery Upload | Minimal (file + title only) | 201 + GalleryImage | DB row with nulls for optional fields |

### Error Cases

| Test ID | Scenario | Expected Status | Expected Error |
|---------|----------|-----------------|----------------|
| ERR-AUTH-001 | Missing Authorization header | 401 | UNAUTHORIZED |
| ERR-AUTH-002 | Invalid/expired JWT | 401 | UNAUTHORIZED |
| ERR-PERM-001 | Resource owned by other user (sets) | 403 | FORBIDDEN |
| ERR-PERM-002 | Resource owned by other user (wishlist) | 403 | FORBIDDEN |
| ERR-404-001 | Set not found | 404 | NOT_FOUND |
| ERR-404-002 | Image not found for delete | 404 | NOT_FOUND |
| ERR-404-003 | Wishlist item not found | 404 | NOT_FOUND |
| ERR-VAL-001 | Invalid UUID in path | 400 | BAD_REQUEST |
| ERR-VAL-002 | Missing request body (presign) | 400 | BAD_REQUEST |
| ERR-VAL-003 | Invalid JSON body | 400 | BAD_REQUEST |
| ERR-VAL-004 | Missing filename (presign) | 400 | VALIDATION_ERROR |
| ERR-VAL-005 | Missing contentType (presign) | 400 | VALIDATION_ERROR |
| ERR-VAL-006 | Invalid imageUrl format (register) | 400 | VALIDATION_ERROR |
| ERR-VAL-007 | No file in multipart form | 400 | BAD_REQUEST |
| ERR-VAL-008 | Invalid file type (PDF) | 400 | VALIDATION_ERROR |
| ERR-VAL-009 | File >5MB (wishlist) | 400 | VALIDATION_ERROR |
| ERR-VAL-010 | File >10MB (gallery) | 400 | VALIDATION_ERROR |
| ERR-VAL-011 | Missing title (gallery) | 400 | VALIDATION_ERROR |
| ERR-500-001 | S3_BUCKET not configured | 500 | INTERNAL_ERROR |

### Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EDGE-FILE-001 | Unicode in filename | Sanitized in key, preserved in metadata |
| EDGE-FILE-002 | Path traversal in filename | Path components stripped |
| EDGE-FILE-003 | Reserved filename (CON.jpg) | Prefixed with underscore |
| EDGE-FILE-004 | Filename >255 chars | Truncated, extension preserved |
| EDGE-SIZE-001 | File exactly at 5MB limit | Succeeds |
| EDGE-SIZE-002 | File exactly at 10MB limit | Succeeds |
| EDGE-S3-001 | S3 delete fails | 204 returned, error logged |
| EDGE-S3-002 | Delete image with thumbnail | Both S3 objects deleted |
| EDGE-MULTI-001 | Empty file upload | 400 Bad Request |
| EDGE-MULTI-002 | Malformed multipart | 400 Bad Request |
| EDGE-IMG-001 | Corrupted image data | 400 with processing error |
| EDGE-IMG-002 | Image smaller than resize target | Not upscaled |
| EDGE-POS-001 | Register after gap in positions | Position = max + 1 |

### Evidence Requirements

1. **HTTP Response Capture:** Status codes and JSON bodies
2. **Database Queries:** Verify rows created/updated/deleted
3. **S3 Verification:** `aws s3 ls` showing objects exist
4. **Log Output:** Structured logs showing request flow

## Implementation Order (Recommended)

Based on risk assessment:

### Phase 1: Sets Endpoints (Low Risk)
1. `sets/images/presign.ts` - Presigned URL generation
2. `sets/images/index.ts` - Image registration
3. `sets/images/[imageId].ts` - Image deletion

### Phase 2: Sharp Verification
1. Create test endpoint using `@repo/image-processing`
2. Deploy to Vercel and verify Sharp works
3. If Sharp fails, evaluate alternatives before Phase 3

### Phase 3: Multipart Infrastructure
1. Create `@repo/vercel-multipart` package
2. Add tests for multipart parsing

### Phase 4: Upload Endpoints (Higher Risk)
1. `wishlist/[id]/image.ts` - Simpler, no OpenSearch
2. `gallery/images/upload.ts` - Complex, has OpenSearch

---

## Token Budget

### Phase Summary

| Phase | Agent | Est. Input | Est. Output | Est. Total | Actual | Cost |
|-------|-------|------------|-------------|------------|--------|------|
| Story Generation | PM | 15k | 5k | 20k | — | — |
| Test Plan | PM | 20k | 6k | 26k | — | — |
| Dev Feasibility | PM | 25k | 4k | 29k | — | — |
| UI/UX Notes | PM | 15k | 0.5k | 15.5k | — | — |
| Elaboration | PM | 20k | 2k | 22k | — | — |
| Implementation | Dev | 50k | 20k | 70k | — | — |
| Proof | Dev | 30k | 3k | 33k | — | — |
| Code Review | Review | 40k | 1k | 41k | — | — |
| QA Verification | QA | 35k | 2.5k | 37.5k | — | — |
| **Total** | — | **250k** | **44k** | **294k** | **—** | **—** |

### Output Artifacts (Actual)

| Artifact | Bytes | Tokens (est) |
|----------|-------|--------------|
| STORY-009.md | 21,680 | ~5,400 |
| _pm/TEST-PLAN.md | 22,997 | ~5,700 |
| _pm/DEV-FEASIBILITY.md | 15,923 | ~4,000 |
| _pm/UIUX-NOTES.md | 1,573 | ~400 |
| ELAB-STORY-009.md | 8,720 | ~2,200 |
| PROOF-STORY-009.md | 12,275 | ~3,100 |
| CODE-REVIEW-STORY-009.md | 3,233 | ~800 |
| QA-VERIFY-STORY-009.md | 9,572 | ~2,400 |
| **Total Output** | **96,038** | **~24,000** |

### Actual Measurements

| Date | Phase | Before `/cost` | After `/cost` | Delta | Notes |
|------|-------|----------------|---------------|-------|-------|
| — | — | — | — | — | Record here as you work |

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-19 | Changed gallery upload route from `/api/images` to `/api/gallery/images/upload` | QA Audit Issue #2 - Route consistency with existing gallery pattern |
| 2026-01-19 | Added Handler Pattern Decision section | QA Audit Issue #4 - Clarify native vs Lambda adapter pattern |
| 2026-01-19 | Updated Reuse Plan to exclude Lambda-specific packages | QA Audit Issue #4 - Consistency with handler pattern decision |
| 2026-01-19 | Added concrete curl commands for multipart testing | QA Audit Issue #5 - Local testability for multipart uploads |
| 2026-01-19 | Added AC-25 for vercel.json route rewrites | Scope completeness |
| 2026-01-19 | Expanded vercel.json configuration with all rewrites | Implementation clarity |

---

*Generated by PM Agent - Vercel Migration Workflow*
*Revised 2026-01-19 to address QA Audit findings*
