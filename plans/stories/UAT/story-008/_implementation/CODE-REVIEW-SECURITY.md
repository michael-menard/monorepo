# Security Review: STORY-008 - Gallery Images Write (No Upload)

**Review Date:** 2026-01-19
**Reviewer:** Security Agent
**Story:** STORY-008
**Status:** SECURITY PASS

---

## Executive Summary

All touched files have been reviewed for security vulnerabilities against the OWASP top 10 and common security issues. No Critical or High severity issues were found. The implementation demonstrates strong security practices including proper input validation, authorization checks, and safe database operations.

---

## Files Reviewed

| File | Risk Level | Status |
|------|------------|--------|
| `apps/api/platforms/vercel/api/gallery/images/[id].ts` | Critical | PASS |
| `packages/backend/gallery-core/src/update-image.ts` | High | PASS |
| `packages/backend/gallery-core/src/delete-image.ts` | High | PASS |
| `packages/backend/gallery-core/src/__types__/index.ts` | Medium | PASS |
| `packages/backend/gallery-core/src/__tests__/update-image.test.ts` | Low | PASS |
| `packages/backend/gallery-core/src/__tests__/delete-image.test.ts` | Low | PASS |
| `packages/backend/gallery-core/src/index.ts` | Low | PASS |
| `apps/api/core/database/seeds/gallery.ts` | Medium | PASS |

---

## Detailed Analysis

### 1. Secrets & Credentials

**Status:** PASS

**Findings:**
- Database URL is loaded from environment variable `DATABASE_URL` (line 78-81 in `[id].ts`)
- AWS credentials are loaded from environment variables (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) (lines 105-107 in `[id].ts`)
- S3 bucket name is loaded from environment variables (`GALLERY_BUCKET`, `AWS_S3_BUCKET`) (line 126 in `[id].ts`)
- No hardcoded secrets or API keys found in any files
- Seed data uses example.com URLs (not real AWS URLs)

**Note:** `DEV_USER_SUB` is a development bypass value (line 94), but is properly gated behind `AUTH_BYPASS === 'true'` environment check.

---

### 2. Injection Vulnerabilities

**Status:** PASS

**SQL Injection:**
- All database queries use Drizzle ORM with parameterized queries
- No raw SQL string interpolation detected
- Example safe pattern (`[id].ts` lines 209-210):
  ```typescript
  .from(galleryImages)
  .where(eq(galleryImages.id, imageId))
  ```
- Seed file uses parameterized SQL via `sql` template literal (safe)

**Command Injection:**
- No exec/spawn calls detected
- No shell commands executed

**NoSQL Injection:**
- N/A - PostgreSQL database only

---

### 3. XSS (Cross-Site Scripting)

**Status:** PASS

**Findings:**
- API handler is JSON-only (no HTML rendering)
- No `dangerouslySetInnerHTML` usage (no React components in touched files)
- All responses are properly JSON serialized via `res.json()`
- No direct DOM manipulation

---

### 4. Authentication & Authorization

**Status:** PASS

**Authentication:**
- Auth check at handler entry point (lines 407-412 in `[id].ts`):
  ```typescript
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }
  ```
- All operations require authenticated user

**Authorization (Ownership Validation):**

**GET handler** (lines 217-223):
```typescript
if (image.userId !== userId) {
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to access this image',
  })
  return
}
```

**PATCH handler** (lines 274-280):
```typescript
if (existing.userId !== userId) {
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to update this image',
  })
  return
}
```

**Album cross-ownership check** (lines 300-306):
```typescript
if (album.userId !== userId) {
  res.status(403).json({
    error: 'Forbidden',
    message: 'Album belongs to another user',
  })
  return
}
```

**DELETE handler** (lines 371-377):
```typescript
if (existing.userId !== userId) {
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to delete this image',
  })
  return
}
```

**Core functions** also validate ownership:
- `update-image.ts` lines 120-126: Returns `FORBIDDEN` if `userId !== existing.userId`
- `update-image.ts` lines 146-152: Returns `FORBIDDEN` if album belongs to another user
- `delete-image.ts` lines 121-128: Returns `FORBIDDEN` if `userId !== existing.userId`

---

### 5. Data Exposure

**Status:** PASS

**Logging:**
- Logging uses structured logger (not console.log)
- Logged data is appropriate operational info:
  - `logger.info('Get gallery image', { userId, imageId })` (line 225)
  - `logger.info('Update gallery image', { userId, imageId })` (line 331)
  - `logger.info('Delete gallery image', { userId, imageId })` (line 390)
- No sensitive data (passwords, tokens, PII) logged
- S3 error logging only includes key and error message (lines 163-166, 178-181)

**API Responses:**
- Error messages are generic and don't expose internals
- Stack traces are not returned to clients
- Database error handling returns message only (line 450)

---

### 6. Insecure Dependencies

**Status:** PASS

**Observations:**
- Uses well-maintained packages:
  - `@aws-sdk/client-s3` - Official AWS SDK
  - `drizzle-orm` - Modern TypeScript ORM
  - `zod` - Schema validation
  - `pg` - PostgreSQL client
- No deprecated or known-vulnerable imports detected in touched files

---

### 7. Input Validation

**Status:** PASS

**UUID Validation:**
- UUID regex validation at API entry point (lines 422-424):
  ```typescript
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(imageId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid image ID format' })
  }
  ```

**Zod Schema Validation (PATCH body):**
```typescript
const UpdateImageInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
  albumId: z.string().regex(uuidRegex).nullable().optional(),
})
```

**Validation at API boundary** (lines 251-256):
```typescript
const parseResult = UpdateImageInputSchema.safeParse(req.body)
if (!parseResult.success) {
  const errors = parseResult.error.issues.map(e => e.message).join(', ')
  res.status(400).json({ error: 'Bad Request', message: errors })
  return
}
```

**Type constraints:**
- Title: min 1, max 200 characters
- Description: max 2000 characters
- Tags: max 20 tags, each max 50 characters
- albumId: must be valid UUID format

---

## Defense-in-Depth Recommendations (Non-Blocking)

### Medium Severity - Recommendations

1. **Rate Limiting (Not Implemented)**
   - Consider adding rate limiting to prevent abuse of update/delete endpoints
   - Current risk: Low (auth required)

2. **Request Size Limiting**
   - Ensure body parser has reasonable limits configured at infrastructure level
   - Tags array could theoretically be large (20 x 50 chars = 1000 chars max - acceptable)

3. **Audit Logging Enhancement**
   - Consider logging failed authorization attempts for security monitoring
   - Current logging is sufficient for operational needs

4. **S3 Cleanup Error Handling**
   - S3 cleanup is best-effort (appropriate)
   - Consider adding metrics/alerting for orphaned S3 objects over time

---

## Test Coverage for Security Scenarios

The test files demonstrate good coverage of security-relevant scenarios:

**update-image.test.ts:**
- NOT_FOUND test (line 356-379)
- FORBIDDEN - image belongs to another user (line 381-406)
- VALIDATION_ERROR - albumId does not exist (line 408-440)
- FORBIDDEN - albumId belongs to another user (line 442-475)
- Database error handling (line 563-586)

**delete-image.test.ts:**
- NOT_FOUND test (line 131-154)
- FORBIDDEN - image belongs to another user (line 156-186)
- DB_ERROR - delete fails (line 188-224)
- DB_ERROR - update (coverImageId clear) fails (line 226-260)
- Operation order verification (FK constraints) (line 262-303)

---

## Conclusion

**SECURITY PASS**

The STORY-008 implementation follows security best practices:
- Proper authentication/authorization at all entry points
- Input validation using Zod schemas at API boundary
- Parameterized queries via Drizzle ORM
- No secrets hardcoded in code
- Appropriate error handling without exposing internals
- Cross-user ownership validation for both images and albums
- Comprehensive test coverage for security scenarios

No Critical or High severity security issues were identified.
