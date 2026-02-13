---
id: BUGF-031
title: "Backend API + Infrastructure for Presigned URL Upload"
status: ready-to-work
split_from: BUGF-001
split_part: 1 of 2
priority: P1
phase: 1
epic: bug-fix
story_type: feature
experiment_variant: control
created_at: 2026-02-11
updated_at: 2026-02-11T17:45:00Z
points: 5
tags:
  - backend-api
  - uploads
  - s3-integration
  - infrastructure
depends_on: []
blocks:
  - BUGF-032
  - BUGF-004
  - BUGF-025
related:
  - BUGF-028
surfaces:
  backend: true
  frontend: false
  database: false
  infrastructure: true
---

# BUGF-031: Backend API + Infrastructure for Presigned URL Upload

## Split Context

This story is part of a split from BUGF-001.

- **Original Story:** BUGF-001 - Implement Presigned URL API for Upload Functionality
- **Split Reason:** Story exceeded 5/6 sizing indicators (>8 AC, frontend+backend, infrastructure, 4+ packages, 3+ test types). Natural split exists between backend API creation and frontend integration.
- **This Part:** 1 of 2 (Backend)
- **Dependency:** No dependencies (first part of split)
- **Blocks:** BUGF-032 (Frontend Integration), BUGF-004 (Session Refresh API), BUGF-025 (IAM Policy Documentation)

## Context

Currently, the upload flow in `main-app` and `app-instructions-gallery` uses mock/stub implementations. The frontend has a complete upload infrastructure (`@repo/upload` package) with XHR-based upload client, progress tracking, session management, and expiry handling, but lacks the backend API to generate presigned S3 URLs for actual file uploads.

**Existing Infrastructure:**
- `@repo/upload` package with upload client, hooks, and components
- `useUploadManager` hook with progress, retry, and session expiry support
- `uploadToPresignedUrl` XHR function ready for S3 uploads
- Upload UI components (UploaderList, SessionExpiredBanner, RateLimitBanner)

**The Gap:**
No backend endpoint exists to generate presigned URLs. This story creates the API endpoint to:
1. Request presigned URL for a specific file (name, size, type, category)
2. Receive presigned URL with S3 key and expiration time
3. Enable direct S3 uploads from frontend

**Precedent:**
Wishlist and inspiration domains already have presigned URL patterns (`domains/wishlist/adapters/storage.ts`, `domains/inspiration/adapters/storage.ts`) that can be adapted for general file uploads.

## Goal

Create a production-ready backend API endpoint and infrastructure that generates secure, time-limited presigned S3 URLs for file uploads, enabling actual file upload functionality.

**Success Criteria:**
- Backend endpoint generates valid presigned URLs
- S3 bucket configured with proper CORS
- IAM policy restricts uploads to user-scoped paths
- All validation and error handling in place
- Backend integration tests passing

## Non-Goals

- Frontend integration (BUGF-032)
- E2E upload flow testing (BUGF-032)
- Multipart upload support (files are <100MB, single PUT sufficient)
- Virus scanning (deferred to future story)
- CDN integration for downloads (separate story)
- Session refresh API (BUGF-004)
- Rate limiting implementation (can be added post-MVP)

**Protected Features:**
- Existing storage adapter patterns (must follow established patterns)
- S3 key structure conventions

## Scope

### Endpoints

#### New Endpoint: `POST /api/uploads/presigned-url`

**Purpose:** Generate presigned S3 URL for file upload

**Request Schema:**
```typescript
{
  fileName: string        // Original filename
  fileSize: number        // File size in bytes
  contentType: string     // MIME type (e.g., "application/pdf")
  category: "instruction" | "parts-list" | "thumbnail" | "gallery-image"
}
```

**Response Schema:**
```typescript
{
  presignedUrl: string    // S3 presigned PUT URL
  key: string             // S3 object key
  expiresIn: number       // Expiration in seconds (900 = 15 minutes)
  fileId: string          // Unique file identifier
}
```

**Validation:**
- `fileName`: Non-empty string, sanitized for S3 key
- `fileSize`: Positive integer, ≤100MB for instructions category
- `contentType`: Must be allowed MIME type for category
- `category`: One of allowed enum values

**Error Responses:**
- `401 Unauthorized` - Missing or invalid auth token
- `400 Bad Request` - Invalid file type or missing required fields
- `413 Payload Too Large` - File size exceeds category limit
- `500 Internal Server Error` - S3 access failure

**Security:**
- Requires authentication (user must be logged in)
- Presigned URL scoped to user-specific S3 prefix: `instructions/{userId}/{fileId}/`
- 15-minute expiration (900 seconds)
- IAM policy restricts PutObject to user-scoped paths only (SEC-001)

### Packages

**Backend (New):**
- `apps/api/lego-api/domains/uploads/` - New domain for upload operations
  - `routes.ts` - Endpoint handler
  - `types.ts` - Zod schemas for request/response
  - `application/services.ts` - Business logic
  - `adapters/storage.ts` - S3 adapter using `@repo/api-core`

**Backend (Modified):**
- `apps/api/sst.config.ts` - Add route registration
- `apps/api/lego-api/composition/index.ts` - Wire uploads domain

**Frontend (New - for RTK Query schema):**
- `packages/core/api-client/src/rtk/uploads-api.ts` - NEW RTK Query slice (types only, no integration)
- `packages/core/api-client/src/config/endpoints.ts` - Add endpoint constant

**Frontend (Reused):**
- `@repo/upload` - No changes, use as-is
- `@repo/app-component-library` - No changes

### Infrastructure

**S3 Bucket:**
- Bucket name configured via `UPLOAD_BUCKET_NAME` environment variable
- Private access (presigned URLs only)
- CORS configured for browser PUT requests from frontend domains
- Lifecycle policy for cleanup (future)

**IAM Policy:**
- Lambda execution role needs `s3:PutObject` permission
- Scoped to specific prefix: `instructions/{userId}/*`
- Policy documented in BUGF-025

**Environment Variables:**
- `UPLOAD_BUCKET_NAME` - S3 bucket name for uploads
- `UPLOAD_PRESIGN_EXPIRY` - Presigned URL expiration in seconds (default: 900)

## Acceptance Criteria

### AC1: Generate Presigned URL for Valid Request
**Given** an authenticated user
**When** they POST to `/api/uploads/presigned-url` with valid file metadata
**Then** API returns 200 OK with presigned URL, S3 key, expiry, and fileId
**And** presigned URL is valid for S3 PUT operation
**And** S3 key follows pattern: `instructions/{userId}/{fileId}/{sanitizedFilename}`

### AC2: Upload File to Presigned URL
**Given** a valid presigned URL from AC1
**When** a PUT request is made with file bytes to the presigned URL
**Then** S3 upload succeeds with 200 OK
**And** ETag header is returned
**And** file is stored in S3 at specified key

### AC4: Reject Unauthorized Requests
**Given** an unauthenticated request
**When** POST to `/api/uploads/presigned-url` without auth token
**Then** API returns 401 Unauthorized
**And** no presigned URL is generated

### AC5: Reject Invalid File Types
**Given** an authenticated user
**When** they request presigned URL for non-PDF file (e.g., .exe)
**Then** API returns 400 Bad Request
**And** error message indicates invalid content type
**And** no presigned URL is generated

### AC6: Reject Files Exceeding Size Limit
**Given** an authenticated user
**When** they request presigned URL for file >100MB
**Then** API returns 413 Payload Too Large
**And** error message includes size limit
**And** no presigned URL is generated

### AC8: IAM Policy Enforces Path Restrictions (SEC-001)
**Given** Lambda execution role with S3 permissions
**When** presigned URL is generated
**Then** IAM policy restricts PutObject to `instructions/{userId}/*`
**And** attempts to upload outside user prefix fail
**And** policy documented in BUGF-025

### AC9: Handle S3 Access Failure
**Given** misconfigured IAM permissions or missing bucket
**When** API attempts to generate presigned URL
**Then** API returns 500 Internal Server Error
**And** error logged to CloudWatch
**And** X-Request-Id header included for debugging

### AC10: CORS Configured for Browser Uploads
**Given** S3 bucket CORS configuration
**When** browser sends PUT request to presigned URL
**Then** CORS headers allow request from frontend origin
**And** upload succeeds without CORS errors

## Reuse Plan

### Backend Reuse
**Pattern:** Wishlist Storage Adapter (`apps/api/lego-api/domains/wishlist/adapters/storage.ts`)
- Reuse `getPresignedUploadUrl` call structure
- Adapt S3 key prefix from `wishlist/` to `instructions/`
- Reuse 15-minute expiry constant
- Adapt file validation logic for PDF instead of images

**Utility:** API Core S3 (`@repo/api-core`)
- Direct use: `getPresignedUploadUrl(key, mimeType, expiresIn)`
- Already tested and production-ready

### Frontend Reuse
**RTK Pattern:** Wishlist API (`packages/core/api-client/src/rtk/wishlist-gallery-api.ts`)
- Copy mutation pattern for new uploads-api slice
- Adapt endpoint and schemas
- Maintain cache invalidation approach
- Note: Frontend integration is in BUGF-032

## Architecture Notes

### S3 Key Structure
```
instructions/
  {userId}/
    {fileId}/
      {sanitizedFilename}
```

**Example:** `instructions/user-abc123/file-xyz789/my-instruction-manual.pdf`

**Benefits:**
- User isolation via IAM path restrictions
- Unique fileId prevents overwrites
- Original filename preserved for downloads

### Presigned URL Generation Flow
```
1. Frontend calls POST /api/uploads/presigned-url
2. Backend:
   a. Validates auth token
   b. Validates file metadata
   c. Generates S3 key with userId + fileId
   d. Calls getPresignedUploadUrl from @repo/api-core
   e. Returns presigned URL + metadata
3. S3 presigned URL valid for 15 minutes
```

### Error Handling Strategy
- **Server-side validation:** File type, size, auth
- **S3 errors:** Map to user-friendly error codes
- **Logging:** All errors logged to CloudWatch with request ID

### Session Expiry Approach
- Presigned URLs expire after 15 minutes (900 seconds)
- Expiry time returned in response for frontend tracking
- Session refresh API is separate story (BUGF-004)

## Infrastructure Notes

### S3 Bucket Configuration
**Required Settings:**
- **Bucket Name:** TBD (set via `UPLOAD_BUCKET_NAME` env var)
- **Region:** us-east-1 (or specify)
- **Access:** Private (no public access)
- **Encryption:** AES-256 (S3-managed keys)
- **Versioning:** Disabled for MVP

**CORS Rules:**
```json
[
  {
    "AllowedOrigins": ["https://your-app-domain.com"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### IAM Policy (Summary - Full Spec in BUGF-025)
```json
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::${BUCKET_NAME}/instructions/${cognito:sub}/*"
}
```

**Key Points:**
- `${cognito:sub}` resolves to user ID from JWT
- Restricts uploads to user-scoped prefix only
- Prevents cross-user access or arbitrary path writes

### Lambda Environment Variables
- `UPLOAD_BUCKET_NAME` - S3 bucket name
- `UPLOAD_PRESIGN_EXPIRY` - Expiry in seconds (default: 900)
- `AWS_REGION` - Already available in Lambda

### Deployment Checklist
- [ ] S3 bucket created and configured
- [ ] CORS rules applied to bucket
- [ ] IAM policy attached to Lambda execution role
- [ ] Environment variables set in Lambda
- [ ] API Gateway route registered
- [ ] Backend integration tests passing

## HTTP Contract Plan

### Request Example
```http
POST /api/uploads/presigned-url HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGc...

{
  "fileName": "lego-castle-instructions.pdf",
  "fileSize": 2500000,
  "contentType": "application/pdf",
  "category": "instruction"
}
```

### Success Response (200 OK)
```json
{
  "presignedUrl": "https://my-bucket.s3.amazonaws.com/instructions/user-abc/file-123/lego-castle-instructions.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...",
  "key": "instructions/user-abc123/file-xyz789/lego-castle-instructions.pdf",
  "expiresIn": 900,
  "fileId": "file-xyz789"
}
```

### Error Response (400 Bad Request)
```json
{
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid content type for instruction file",
    "details": {
      "field": "contentType",
      "providedValue": "application/x-msdownload",
      "allowedValues": ["application/pdf"]
    }
  }
}
```

### Error Response (413 Payload Too Large)
```json
{
  "error": {
    "type": "PAYLOAD_TOO_LARGE",
    "message": "File size exceeds 100MB limit",
    "details": {
      "maxSize": 104857600,
      "providedSize": 120000000
    }
  }
}
```

### S3 Upload Request (Client-Side - for reference)
```http
PUT {presignedUrl} HTTP/1.1
Content-Type: application/pdf
Content-Length: 2500000

[file bytes]
```

### S3 Success Response
```http
HTTP/1.1 200 OK
ETag: "abc123..."
```

## Seed Requirements

**Not Applicable** - No seed baseline exists. This story creates net-new API endpoint.

## Test Plan

### Backend Unit Tests
- **Service Layer** (`domains/uploads/application/services.ts`)
  - Test presigned URL generation with valid inputs
  - Test auth validation (userId extraction from token)
  - Test file size validation (reject >100MB)
  - Test file type validation (reject non-PDF for instruction category)
  - Test category enum validation
  - Test error handling for missing bucket/IAM permissions

- **Storage Adapter** (`domains/uploads/adapters/storage.ts`)
  - Test S3 key generation follows pattern
  - Test presigned URL call to `@repo/api-core`
  - Test expiry time setting (900 seconds)
  - Test filename sanitization

- **Routes** (`domains/uploads/routes.ts`)
  - Test request schema validation (Zod)
  - Test auth middleware integration
  - Test error response formatting

### Backend Integration Tests
- **Full Endpoint Flow**
  - POST to `/api/uploads/presigned-url` with valid auth + metadata
  - Verify response structure
  - Verify presigned URL format (AWS signature present)
  - Test unauthorized request (no auth token)
  - Test malformed request body
  - Test file size over limit
  - Test invalid MIME type

- **S3 Upload Verification** (using presigned URL)
  - Generate presigned URL via API
  - PUT file bytes to presigned URL
  - Verify S3 object exists at expected key
  - Verify ETag returned
  - Clean up test objects

### HTTP Contract Tests
- `.http` file with example requests
  - Valid request → 200 OK
  - Missing auth → 401
  - Invalid file type → 400
  - File too large → 413
  - S3 failure scenario → 500

### Infrastructure Tests
- **CORS Validation**
  - Verify CORS headers on OPTIONS preflight
  - Verify CORS headers on PUT to presigned URL

- **IAM Policy Validation**
  - Test upload to user-scoped path succeeds
  - Test upload outside user path fails (403)

## UI/UX Notes

**Not Applicable** - This is a backend-only story. Frontend integration is in BUGF-032.

## Dev Feasibility

**Feasible:** Yes (High confidence)

**Change Surface:** ~500 LOC
- Backend domain (routes, types, services, storage adapter): ~300 LOC
- RTK Query API slice (types only): ~100 LOC
- Integration tests: ~100 LOC

**MVP-Critical Risks:**
1. **S3 bucket scope enforcement (SEC-001)** - IAM policy required (documented in BUGF-025)
2. **Missing S3 bucket configuration** - Blocks all uploads (deployment checklist required)
3. **CORS misconfiguration** - Blocks browser uploads (must be tested)
4. **File type validation gap** - Security risk (must validate server-side)

**Mitigations:**
- Follow wishlist storage adapter pattern (proven)
- Use `@repo/api-core` utilities (tested)
- Deployment checklist in story
- Comprehensive integration tests

## Reality Baseline

**Codebase State:**
- `@repo/upload` package complete and tested
- No `/api/uploads/presigned-url` endpoint exists
- Wishlist/inspiration domains have presigned URL precedent

**Established Patterns:**
- Presigned URL generation: `apps/api/lego-api/domains/wishlist/adapters/storage.ts`
- S3 utilities: `@repo/api-core` getPresignedUploadUrl
- Domain structure: `apps/api/lego-api/domains/{domain}/`

**Constraints:**
- File size limit: 100MB for instruction PDFs
- Presigned URL expiry: 15 minutes (900 seconds)
- S3 key pattern: `instructions/{userId}/{fileId}/{filename}`
- MIME types: `application/pdf` for instruction category
- Auth required: All presigned URL requests

**Active Dependencies:**
- Blocks BUGF-032 (Frontend Integration)
- Blocks BUGF-004 (Session Refresh API)
- Blocks BUGF-025 (IAM Policy Documentation)
- Related to BUGF-028 (MSW Mocking for Tests)

**Relevant Packages:**
- `@repo/api-core` (backend S3 utilities)
- `@repo/api-client` (RTK Query schema)

---

**Estimated Effort:** 5 points (3-5 days)
- Backend domain creation: 1-2 days (routes, types, services, storage adapter)
- RTK Query schema: 0.5 days
- S3 bucket + IAM + CORS setup: 1 day
- Backend integration tests: 1 day
- HTTP contract tests: 0.5 days
- Code review and verification: 0.5 days

**Risk Level:** Medium (infrastructure dependencies, security-critical IAM policy)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

No MVP-critical gaps identified. All acceptance criteria are well-specified and testable.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Resolution |
|---|---------|----------|------------|
| 1 | Rate limiting on presigned URL generation | security | KB-logged |
| 2 | Magic number validation for file types | security | KB-logged |
| 3 | S3 lifecycle policies for cleanup | infrastructure | KB-logged |
| 4 | File size validation in IAM policy | security | KB-logged |
| 5 | Presigned URL usage tracking | observability | KB-logged |
| 6 | S3 bucket name validation at startup | observability | KB-logged |
| 7 | Content-length enforcement in presigned URL | security | KB-logged |
| 8 | ETL for failed uploads | observability | KB-logged |
| 9 | Multipart upload support for large files | enhancement | KB-logged |
| 10 | Virus scanning integration | security | KB-logged |
| 11 | CDN integration for downloads | performance | KB-logged |
| 12 | Image thumbnail generation for PDFs | enhancement | KB-logged |
| 13 | Progress tracking for uploads | enhancement | KB-logged |
| 14 | Upload analytics and monitoring | observability | KB-logged |
| 15 | Presigned URL caching | performance | KB-logged |
| 16 | Multiple file categories per upload | enhancement | KB-logged |
| 17 | Webhook notifications on upload completion | integration | KB-logged |
| 18 | S3 Transfer Acceleration | performance | KB-logged |
| 19 | Pre-flight validation endpoint | enhancement | KB-logged |
| 20 | Upload quota enforcement | infrastructure | KB-logged |

### Summary

- **ACs added**: 0 (all criteria already well-specified)
- **KB entries logged**: 20 (non-blocking enhancements for future work)
- **Mode**: autonomous
- **Verdict**: PASS - Story ready for implementation

### Key Findings

- All 8 audit checks passed with no blockers
- Architecture complies with hexagonal pattern (service layer + storage adapter)
- Security considerations properly addressed (IAM policy, CORS, file validation)
- Comprehensive test plan covers unit, integration, HTTP contract, and infrastructure scenarios
- Reuse strategy explicitly documented (following wishlist/inspiration domain patterns)
- Infrastructure setup fully specified with deployment checklist

**Story is production-ready for implementation phase.**
