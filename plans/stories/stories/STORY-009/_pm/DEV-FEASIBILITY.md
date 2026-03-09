# STORY-009 Dev Feasibility Review

## Summary

STORY-009 migrates 5 image upload endpoints from AWS Lambda to Vercel serverless functions:
1. `sets/images/presign` - S3 presigned PUT URL generation
2. `sets/images/register` - DB insert for uploaded images
3. `sets/images/delete` - DB delete + S3 cleanup
4. `wishlist/upload-image` - Multipart form + Sharp processing + S3 upload
5. `gallery/upload-image` - Multipart form + Sharp + S3 + DB + OpenSearch indexing

**Overall Assessment: PROCEED WITH CAUTION**

The sets endpoints (presign/register/delete) are straightforward migrations. However, wishlist and gallery upload endpoints have significant complexity due to multipart parsing, Sharp image processing, and external service dependencies.

---

## Risk Assessment

### High Risk

| Risk | Description | Impact |
|------|-------------|--------|
| **Sharp Binary Compatibility** | Sharp uses native binaries compiled for specific platforms. Vercel's build environment may produce binaries incompatible with their runtime environment. | Build failures or runtime crashes when processing images |
| **Vercel Body Size Limit** | Vercel has a 4.5MB request body limit on the Hobby plan, 100MB on Pro. The current Lambda handlers allow up to 10MB file uploads. | Upload failures for images between 4.5-10MB on Hobby tier |
| **OpenSearch Dependency in Gallery Upload** | Gallery upload handler calls `indexDocument()` for OpenSearch indexing. Vercel functions need VPC access or public endpoint to reach OpenSearch. | 500 errors if OpenSearch unreachable; data inconsistency if indexing fails silently |

### Medium Risk

| Risk | Description | Impact |
|------|-------------|--------|
| **AWS S3 Credentials in Vercel** | Presign and upload handlers require `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. Must configure IAM user with appropriate S3 permissions. | Auth failures; potential security issues if credentials misconfigured |
| **Multipart Parsing Differences** | Current `@repo/lambda-utils` multipart parser uses Busboy with API Gateway event format. Vercel uses different request format (`VercelRequest`). | Need adapter or new parser for Vercel-native multipart handling |
| **Connection Pooling** | Current Vercel handlers use `max: 1` connection pool. Image processing operations are CPU-intensive and may cause connection timeout issues under load. | DB connection errors during high concurrency |
| **Function Timeout** | Default Vercel timeout is 10s (Hobby) or 60s (Pro). Sharp processing of large images can exceed 10s. | Timeouts on large image uploads |

### Low Risk

| Risk | Description | Impact |
|------|-------------|--------|
| **Redis Dependency Eliminated** | Good news: Redis has been deprecated in the codebase (`apps/api/core/cache/redis.ts` shows Redis disabled). Wishlist/gallery upload handlers that called `getRedisClient()` for cache invalidation no longer need this. | None - simplifies migration |
| **S3 URL Format Differences** | Presigned URL generation and S3 key construction use region-specific URL formats. Must ensure consistency. | Minor URL format issues, easily fixable |
| **CORS Already Configured** | `vercel.json` already has CORS headers for `/api/*` routes including `Authorization` and `Content-Type`. | Minimal - may need to add specific headers for multipart |

---

## Change Surface Analysis

### New Files

| File Path | Purpose | Complexity |
|-----------|---------|------------|
| `apps/api/platforms/vercel/api/sets/[id]/images/presign.ts` | Generate S3 presigned PUT URL | Low |
| `apps/api/platforms/vercel/api/sets/[id]/images/index.ts` | Register uploaded image (POST) | Low |
| `apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts` | Delete image (DELETE) | Low |
| `apps/api/platforms/vercel/api/wishlist/[id]/image.ts` | Upload wishlist image with Sharp processing | High |
| `apps/api/platforms/vercel/api/gallery/images/upload.ts` | Upload gallery image with Sharp + OpenSearch | High |

### Package Dependencies

| Package | Used By | Vercel Compatible |
|---------|---------|-------------------|
| `@aws-sdk/client-s3` | presign, delete, upload | Yes - already used in gallery/images/[id].ts |
| `@aws-sdk/s3-request-presigner` | presign | Yes - standard AWS SDK |
| `@repo/file-validator` | wishlist, gallery upload | Yes - pure TypeScript |
| `@repo/image-processing` | wishlist, gallery upload | **Needs verification** - Sharp native binaries |
| `@repo/lambda-utils` (multipart-parser) | wishlist, gallery upload | **No** - API Gateway specific, need Vercel adapter |
| `@repo/logger` | all endpoints | Yes - already used |
| `busboy` | multipart parsing | Yes - but needs Vercel request adapter |
| `drizzle-orm` | all endpoints | Yes - already used |

### Environment Variables

| Variable | Endpoints | Description |
|----------|-----------|-------------|
| `DATABASE_URL` | All | PostgreSQL connection string |
| `AWS_REGION` | presign, delete, upload | AWS region for S3 |
| `AWS_ACCESS_KEY_ID` | presign, delete, upload | IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | presign, delete, upload | IAM credentials |
| `SETS_BUCKET` | sets/images/* | S3 bucket for set images |
| `GALLERY_BUCKET` | gallery/upload-image | S3 bucket for gallery images (or `AWS_S3_BUCKET`) |
| `WISHLIST_BUCKET` | wishlist/upload-image | S3 bucket for wishlist images |
| `COGNITO_USER_POOL_ID` | All (auth) | Cognito pool ID |
| `COGNITO_CLIENT_ID` | All (auth) | Cognito client ID |
| `OPENSEARCH_ENDPOINT` | gallery/upload-image | OpenSearch domain endpoint |
| `AUTH_BYPASS` | All (dev only) | Enable dev auth bypass |
| `DEV_USER_SUB` | All (dev only) | Mock user ID for dev |

### Database Interactions

| Endpoint | Tables | Operations |
|----------|--------|------------|
| sets/presign | `sets` | SELECT (ownership check) |
| sets/register | `sets`, `set_images` | SELECT, INSERT |
| sets/delete | `sets`, `set_images` | SELECT, DELETE |
| wishlist/upload-image | `wishlist_items` | SELECT, UPDATE |
| gallery/upload-image | `gallery_images` | INSERT |

### External Services

| Service | Endpoints | Notes |
|---------|-----------|-------|
| **S3** | All | Presigned URLs, uploads, deletes |
| **OpenSearch** | gallery/upload-image | Document indexing (non-critical, best-effort) |
| **Cognito** | All | JWT validation |

---

## Hidden Dependencies

### 1. Busboy/Multipart Parsing on Vercel

The current `@repo/lambda-utils/multipart-parser` is tightly coupled to API Gateway event format:

```typescript
// Current parser expects APIGatewayProxyEventV2
export async function parseMultipartForm(event: APIGatewayProxyEventV2): Promise<ParsedFormData>
```

Vercel's `VercelRequest` uses Node.js `IncomingMessage` stream. Options:

1. **Create Vercel-native multipart parser** (recommended)
2. Use `formidable` or `multer` which work with Node streams
3. Adapt current parser with request transformation

### 2. Sharp Native Module

Sharp uses `libvips` via native binaries. Vercel serverless functions run on Amazon Linux 2. The Sharp package needs to be built for this target:

```json
// package.json may need:
{
  "optionalDependencies": {
    "sharp-linux-x64": "^0.33.0"
  }
}
```

Alternative: Use `@vercel/og` or `@imgix/js-core` for Vercel-optimized image processing.

### 3. OpenSearch Network Access

Gallery upload indexes documents in OpenSearch. Current AWS Lambda has VPC access. Vercel functions are public internet only unless using Vercel's Private Regions (Enterprise).

Options:
1. Make OpenSearch publicly accessible with IP restrictions
2. Defer OpenSearch indexing to a separate background job
3. Use OpenSearch Serverless with public endpoint

### 4. S3 CORS Configuration

Direct browser uploads using presigned URLs require S3 bucket CORS configuration:

```json
{
  "AllowedOrigins": ["https://your-vercel-domain.vercel.app"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type", "x-amz-*"],
  "ExposeHeaders": ["ETag"]
}
```

---

## Missing AC Suggestions

Based on implementation complexity, add these acceptance criteria:

### Technical ACs

1. **AC-T1: Vercel Function Timeout Configuration**
   - Configure `maxDuration` in `vercel.json` for upload endpoints (minimum 30s for Sharp processing)
   - Document Pro plan requirement if timeout >10s needed

2. **AC-T2: Error Recovery for Partial Uploads**
   - If DB insert succeeds but S3 upload fails, clean up DB record
   - If S3 upload succeeds but DB insert fails, clean up S3 object

3. **AC-T3: Multipart Parser for Vercel**
   - Create or adapt multipart form parser for Vercel request format
   - Support same file size limits as AWS handlers (10MB for gallery, 5MB for wishlist)

4. **AC-T4: Sharp Deployment Verification**
   - Verify Sharp works in Vercel runtime environment
   - Include smoke test for image processing in deployment pipeline

5. **AC-T5: OpenSearch Indexing Strategy**
   - Define behavior when OpenSearch is unreachable
   - Consider async indexing via queue or webhook

### Observability ACs

6. **AC-O1: Upload Metrics**
   - Log upload success/failure with file size and processing time
   - Track presign URL generation rate

7. **AC-O2: Error Categorization**
   - Distinguish between validation errors (400), auth errors (401/403), and processing errors (500)

---

## Mitigations

### High Risk Mitigations

| Risk | Mitigation | Story Scope |
|------|------------|-------------|
| **Sharp Binary Compatibility** | 1. Add Sharp to `optionalDependencies` with platform-specific packages. 2. Create deployment verification test that processes a test image. 3. Fallback: defer wishlist/gallery uploads to STORY-016 if Sharp doesn't work. | In scope - must verify before implementing upload endpoints |
| **Vercel Body Size Limit** | 1. Document Pro plan requirement for 10MB uploads. 2. For Hobby tier, reduce max file size to 4MB or use presign pattern for direct S3 upload. 3. Consider chunked upload for large files (future story). | In scope for documentation; presign pattern is within scope |
| **OpenSearch Dependency** | 1. Make OpenSearch indexing non-blocking (already best-effort in current handler). 2. Add explicit logging when indexing fails. 3. Document that search may lag behind uploads. | In scope - keep current best-effort behavior |

### Medium Risk Mitigations

| Risk | Mitigation | Story Scope |
|------|------------|-------------|
| **AWS S3 Credentials** | 1. Use Vercel environment variables UI (encrypted). 2. Create dedicated IAM user with minimal S3 permissions. 3. Document required IAM policy. | In scope |
| **Multipart Parsing** | 1. Create `packages/backend/vercel-multipart` package with Busboy adapter for VercelRequest. 2. Reuse validation and file size limits from `@repo/lambda-utils`. | In scope - required for wishlist/gallery upload |
| **Connection Pooling** | 1. Keep `max: 1` for now (consistent with other Vercel handlers). 2. Monitor for issues. 3. Consider connection pooler (PgBouncer) in future. | In scope (use existing pattern) |
| **Function Timeout** | 1. Set `maxDuration: 30` in `vercel.json` for upload routes. 2. Optimize Sharp processing (reduce quality/size for thumbnails). | In scope |

---

## Vercel-Specific Considerations

### 1. Function Configuration

```json
// vercel.json additions needed
{
  "functions": {
    "api/wishlist/[id]/image.ts": {
      "maxDuration": 30
    },
    "api/gallery/images/upload.ts": {
      "maxDuration": 30
    }
  }
}
```

### 2. Body Size Limits

| Plan | Max Body Size | Implication |
|------|---------------|-------------|
| Hobby | 4.5 MB | Insufficient for 10MB gallery uploads |
| Pro | 100 MB | Sufficient |
| Enterprise | Configurable | Sufficient |

**Recommendation:** Document Pro plan requirement for full functionality, or implement presign pattern for all uploads.

### 3. Multipart Form Handling

Vercel serverless functions receive requests as Node.js `IncomingMessage`. Create adapter:

```typescript
// packages/backend/vercel-multipart/src/index.ts
import { VercelRequest } from '@vercel/node'
import Busboy from 'busboy'

export async function parseVercelMultipart(req: VercelRequest): Promise<ParsedFormData> {
  // Adapter implementation
}
```

### 4. Sharp Deployment

Sharp requires native binaries. Vercel builds on Linux x64. Add to `package.json`:

```json
{
  "dependencies": {
    "sharp": "^0.33.0"
  }
}
```

Vercel should auto-detect platform, but verify with deployment test.

### 5. PostgreSQL Connection

Current pattern (used in existing Vercel handlers):

```typescript
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Single connection for serverless
})
```

This is appropriate for serverless. Consider connection pooler for production scale.

### 6. S3 Client Initialization

S3 client should be created at module scope for reuse:

```typescript
// Lazy initialization with credentials
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}
```

---

## Recommendation

**PROCEED WITH CAUTION**

### Recommended Implementation Order

1. **Phase 1: Sets Endpoints (Low Risk)**
   - `sets/images/presign` - Simple presign generation
   - `sets/images/register` - Simple DB insert
   - `sets/images/delete` - Simple delete with S3 cleanup

   These use the presign pattern where the browser uploads directly to S3, avoiding Vercel body size limits.

2. **Phase 2: Verify Sharp Compatibility**
   - Create test endpoint that processes a sample image
   - Deploy to Vercel and verify it works
   - If Sharp fails, evaluate alternatives before proceeding

3. **Phase 3: Upload Endpoints (High Risk)**
   - Create `@repo/vercel-multipart` package first
   - Implement `wishlist/upload-image` (simpler, no OpenSearch)
   - Implement `gallery/upload-image` (complex, has OpenSearch)

### Blockers to Address Before Implementation

1. **Confirm Vercel plan** - Need Pro for >4.5MB uploads
2. **Sharp compatibility test** - Must pass before Phase 3
3. **OpenSearch access strategy** - Document approach for gallery upload

### Suggested Story Scope Adjustment

Consider splitting STORY-009:
- **STORY-009a:** Sets image presign/register/delete (low risk, can start immediately)
- **STORY-009b:** Wishlist/Gallery uploads (high risk, blocked by Sharp verification)

This allows progress on sets endpoints while validating the higher-risk upload path.

---

## Appendix: Existing Patterns Reference

### Vercel Handler Pattern (from gallery/images/[id].ts)

```typescript
// S3 Client initialization
let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client
  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!region || !accessKeyId || !secretAccessKey) {
    logger.warn('S3 credentials not configured')
    return null
  }
  s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
  return s3Client
}

// Auth pattern
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}
```

### AWS Lambda Handler Pattern (from sets/images/presign/handler.ts)

```typescript
// Presigned URL generation
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  ContentType: body.contentType,
  Metadata: { setId, userId, originalFilename: body.filename },
})
const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
```

These patterns should be followed for consistency in the Vercel migration.
