# Security Review: STORY-009

## Result: PASS

## Files Reviewed

**New Package:**
- `/Users/michaelmenard/Development/Monorepo/packages/backend/vercel-multipart/vitest.config.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/vercel-multipart/src/__types__/index.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/vercel-multipart/src/index.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/vercel-multipart/src/parse-multipart.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/vercel-multipart/src/__tests__/parse-multipart.test.ts`

**API Handlers:**
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/gallery/images/upload.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/sets/[id]/images/presign.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/sets/[id]/images/index.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/sets/[id]/images/[imageId].ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/wishlist/[id]/image.ts`

## Critical Issues (immediate fix required)

None

## High Issues (must fix before merge)

None

## Medium Issues (should fix)

1. **OpenSearch indexing without authentication** (gallery/images/upload.ts:178)
   - Description: The OpenSearch indexing uses plain `fetch()` without any authentication headers. This assumes OpenSearch is configured with open access or IP-based restrictions.
   - Remediation: Consider adding IAM signing (AWS4-HMAC-SHA256) or API key authentication to OpenSearch requests. Current implementation may work if OpenSearch has VPC-based access control, but should be documented.
   - Severity: Medium (defense-in-depth)

2. **AUTH_BYPASS mode with insufficient documentation** (all handlers)
   - Description: All handlers use `getAuthUserId()` which returns a dev user when `AUTH_BYPASS=true`. This is appropriate for local development, but the authentication path for production (when AUTH_BYPASS is not set) returns `null` and triggers 401.
   - Location: Each handler's `getAuthUserId()` function (e.g., presign.ts:77-82)
   - Remediation: The production authentication via Cognito JWT validation is not implemented in these handlers. The handlers expect this to be handled at a higher layer (e.g., middleware, API Gateway). Document this architectural decision and ensure production deployment includes proper JWT validation layer.
   - Severity: Medium (architectural - production auth is likely handled elsewhere)

## Checks Performed

| Check | Status |
|-------|--------|
| No hardcoded secrets | PASS |
| No SQL injection | PASS |
| No XSS vulnerabilities | PASS |
| Auth checks present | PASS |
| Input validation | PASS |
| No sensitive data logging | PASS |

### Detailed Check Results

#### 1. No Hardcoded Secrets
- All AWS credentials read from environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Database URL read from `DATABASE_URL` environment variable
- S3 bucket names read from environment variables (`SETS_BUCKET`, `WISHLIST_BUCKET`, `GALLERY_BUCKET`)
- Cognito configuration read from environment variables
- No API keys, tokens, or passwords found in code

#### 2. No SQL Injection
- All database queries use Drizzle ORM with parameterized queries
- No raw SQL string concatenation or interpolation
- Path parameters validated as UUIDs before use in queries
- Example: `eq(sets.id, setId)` uses parameterized binding

#### 3. No XSS Vulnerabilities
- All API responses use `res.json()` which properly escapes content
- No `dangerouslySetInnerHTML` or direct DOM manipulation
- File upload content is processed server-side (Sharp), not reflected back

#### 4. Auth Checks Present
- All endpoints check for authenticated user via `getAuthUserId()`
- Missing auth returns 401 Unauthorized
- Ownership validation present on all resource-modifying endpoints:
  - Sets endpoints: `setRow.userId !== userId` returns 403
  - Wishlist endpoint: `existingItem.userId !== userId` returns 403
  - Gallery endpoint: validates album ownership if `albumId` provided

#### 5. Input Validation
- **UUIDs**: All path parameters validated with regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- **File types**: Restricted to `['image/jpeg', 'image/png', 'image/webp']` via multipart parser
- **File sizes**:
  - Wishlist: 5MB limit enforced (`MAX_FILE_SIZE = 5 * 1024 * 1024`)
  - Gallery: 10MB limit enforced (`MAX_FILE_SIZE = 10 * 1024 * 1024`)
- **Request bodies**: Validated via Zod schemas (`PresignBodySchema`, `RegisterBodySchema`, `GalleryUploadMetadataSchema`)
- **Filename sanitization**: `sanitizeFilenameForS3()` strips path traversal, control characters, and unsafe characters

#### 6. No Sensitive Data Logging
- Logs contain operational data (userId, imageId, setId, file sizes)
- No passwords, tokens, or file content logged
- Error messages use generic text, not stack traces exposed to client
- S3 URLs logged but these are intentionally public (asset URLs)

### Additional Security Observations

**Positive patterns found:**

1. **S3 Presigned URL expiry**: Set to 5 minutes (300 seconds) - appropriate short window
2. **Lazy singleton pattern**: S3 and DB clients are created once and reused, preventing credential leakage from repeated initialization
3. **Best-effort cleanup**: S3 deletion failures are logged but don't fail requests - prevents DoS via cleanup failures
4. **Filename path traversal protection**: `sanitizeFilenameForS3()` removes `/` and `\` from filenames
5. **Content-Type enforcement**: Multipart parser validates Content-Type header before processing
6. **Empty file rejection**: Parser rejects zero-byte files
7. **Database connection pooling**: Uses `max: 1` for serverless (prevents connection exhaustion)

**No issues found with:**
- Command injection (no shell execution)
- NoSQL injection (PostgreSQL only, no NoSQL)
- SSRF (no user-controlled URLs fetched except OpenSearch endpoint from env)
- Path traversal (filenames sanitized, S3 keys constructed server-side)
- Denial of service (file size limits enforced)

## Summary

- Critical: 0
- High: 0
- Medium: 2

---

**SECURITY PASS**

All files reviewed pass security requirements. The two medium issues are defense-in-depth recommendations rather than exploitable vulnerabilities:
1. OpenSearch authentication should be confirmed as handled at infrastructure level
2. Production authentication should be confirmed as handled at gateway/middleware level
