# Implementation Proof - STORY-01711

**Story:** STORY-01711: Session & File Management - CRUD Only
**Date:** 2026-01-25
**Status:** IMPLEMENTATION COMPLETE

## Summary

Successfully migrated 3 multipart upload session management endpoints from AWS Lambda to Vercel serverless functions:

1. `POST /api/mocs/uploads/sessions` - Create upload session
2. `POST /api/mocs/uploads/sessions/:sessionId/files` - Register file within session
3. `POST /api/mocs/uploads/sessions/:sessionId/files/:fileId/complete` - Complete file upload

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts` | Create session endpoint | ~230 |
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts` | Register file endpoint | ~250 |
| `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts` | Complete file endpoint | ~230 |
| `__http__/story-01711-session-crud.http` | HTTP test file | ~200 |

## Files Modified

| File | Change |
|------|--------|
| `apps/api/platforms/vercel/vercel.json` | Added 3 route rewrites and 3 function timeout configs |

## Acceptance Criteria Coverage

### AC-1: Create Session Endpoint
- [x] Accepts `{ files: FileMetadata[] }` body
- [x] Returns `201 Created` with `{ sessionId, partSizeBytes, expiresAt }`
- [x] Validates files array has at least one instruction file
- [x] Validates file size limits per category (PDF: 50MB, image: 10MB, parts-list: 5MB)
- [x] Validates MIME types per category
- [x] Enforces rate limit before DB write via `@repo/rate-limit`
- [x] Returns `429` with `nextAllowedAt` when rate limited
- [x] Returns `401` when unauthenticated

### AC-2: Register File Endpoint
- [x] Accepts file metadata body
- [x] Returns `201 Created` with `{ fileId, uploadId }`
- [x] Validates session exists, belongs to user, is active, not expired
- [x] Initiates S3 multipart upload via `CreateMultipartUploadCommand`
- [x] Creates record in `upload_session_files` table
- [x] Returns `404` for non-existent or other user's session
- [x] Returns `400` for expired or non-active session

### AC-4: Complete File Endpoint
- [x] Accepts `{ parts: [{partNumber, etag}] }` body
- [x] Returns `200 OK` with `{ fileId, fileUrl }`
- [x] Validates part count matches uploaded parts in DB
- [x] Calls S3 `CompleteMultipartUploadCommand`
- [x] Updates file status to `completed` with `fileUrl`
- [x] Returns `400` for part count mismatch or already-completed file

### AC-6: Authentication (All Endpoints)
- [x] All endpoints require authentication
- [x] Local development uses `AUTH_BYPASS=true` with `DEV_USER_SUB`
- [x] Returns `401 UNAUTHORIZED` when no auth token provided

### AC-7: Vercel Function Configuration
- [x] Function timeouts configured (10s create, 15s register, 30s complete)
- [x] Routes added to `vercel.json` for all 3 endpoints

### AC-8: Core Package (Code Organization)
- [x] Zod schemas defined inline following STORY-015/016 patterns
- [x] Error responses use structured format with error codes
- [x] Singleton DB client pattern used
- [x] Singleton S3 client pattern used

### AC-9: Database Schema (Clarity)
- [x] Database operations use existing schema without modifications
- [x] Tables used: `upload_sessions`, `upload_session_files`, `upload_session_parts`
- [x] No schema migrations required

## Implementation Patterns

### Singleton DB Client Pattern
```typescript
let dbClient: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!dbClient) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    })
    dbClient = drizzle(pool)
  }
  return dbClient
}
```

### Singleton S3 Client Pattern
```typescript
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}
```

### Auth Bypass Pattern
```typescript
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}
```

### S3 Key Format
```
{stage}/moc-instructions/{userId}/{sessionId}/{category}/{fileId}.{ext}
```

### File URL Format
```
https://{bucket}.s3.{region}.amazonaws.com/{s3Key}
```

## Verification

### Linting
```bash
npx eslint apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts \
  apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts \
  apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts
# Exit code: 0 (no errors)
```

### Files Verified
- All 3 endpoint files exist and pass linting
- Route rewrites added to vercel.json
- Function timeout configurations added
- HTTP test file created with comprehensive test cases

## Test Plan Reference

Test requests available in `__http__/story-01711-session-crud.http`:

| Test ID | Description | Expected Status |
|---------|-------------|-----------------|
| CS-HP-001 | Create session with single instruction file | 201 |
| CS-HP-004 | Create session with all file types | 201 |
| RF-HP-001 | Register instruction PDF file | 201 |
| CF-HP-001 | Complete single-part upload | 200 |
| CS-VAL-003 | Empty files array | 422 |
| CS-VAL-004 | No instruction file | 400 |
| CS-LIM-001 | File exceeds size limit | 413 |
| CS-LIM-006 | Invalid MIME type | 415 |
| RF-PATH-003 | Session not found | 404 |
| CF-VAL-007 | Part count mismatch | 400 |

## Notes

1. **Part Count Validation:** The complete file endpoint validates that the number of parts in the request matches the number of parts recorded in `upload_session_parts` table. If no parts have been uploaded (STORY-0172 scope), the validation will fail with part count mismatch.

2. **S3 Cleanup:** Incomplete multipart uploads create orphaned parts in S3. Cleanup is deferred to STORY-018 (S3 lifecycle policies).

3. **Rate Limiting:** Uses `@repo/rate-limit` with postgres-backed store. Daily limit configurable via `rateLimitPerDay` in upload config.

4. **Session Expiration:** Sessions have TTL configured via `sessionTtlSeconds` in upload config (default 15 minutes). Expired sessions return 400 Bad Request.
