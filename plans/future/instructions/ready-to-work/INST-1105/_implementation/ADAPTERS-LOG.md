# INST-1105 Adapter Implementation Log

## Summary

Wired adapters for the Upload Sessions feature (INST-1105). The backend routes previously returned 501 (Not Implemented) because the adapters were not connected. This implementation connects the service layer to the database and S3 storage.

## Files Created

### 1. Upload Session Repository Adapter
**Path:** `apps/api/lego-api/domains/mocs/adapters/upload-session-repository.ts`

Implements `UploadSessionRepository` port interface using Drizzle ORM:
- `create()` - Creates new upload session record (AC46)
- `findById()` - Finds session by ID (AC50)
- `findByIdAndUserId()` - Finds session with ownership check (AC49, AC51)
- `markCompleted()` - Updates session status to completed (AC59)
- `updateStatus()` - Updates session status

### 2. S3 Storage Adapter
**Path:** `apps/api/lego-api/domains/mocs/adapters/s3-storage.ts`

Implements `S3StoragePort` interface using AWS SDK v3:
- `generatePresignedPutUrl()` - Generates presigned PUT URL for direct S3 upload (AC44, AC45)
- `headObject()` - Checks if object exists in S3 and gets metadata (AC53, AC54)
- `getPublicUrl()` - Returns public URL via CloudFront or S3 (AC57)

## Files Modified

### 1. Adapters Index Export
**Path:** `apps/api/lego-api/domains/mocs/adapters/index.ts`

Added exports for the new adapters:
```typescript
export { createUploadSessionRepository } from './upload-session-repository.js'
export { createS3StorageAdapter } from './s3-storage.js'
```

### 2. Application Index Export
**Path:** `apps/api/lego-api/domains/mocs/application/index.ts`

Added export for the upload session service:
```typescript
export { createMocService, createUploadSessionService } from './services.js'
export type { MocServiceDeps, UploadSessionServiceDeps } from './services.js'
```

### 3. Routes Wiring
**Path:** `apps/api/lego-api/domains/mocs/routes.ts`

Updated to wire all dependencies:

1. **Imports Added:**
   - S3Client from AWS SDK
   - drizzle-orm operators (eq, and, sql)
   - createUploadSessionService from application layer
   - createUploadSessionRepository, createS3StorageAdapter from adapters
   - CreateUploadSessionResponseSchema, CompleteUploadSessionResponseSchema
   - MocFile type from ports

2. **Dependencies Instantiated:**
   - S3Client with region from environment
   - sessionRepo via createUploadSessionRepository
   - s3Storage via createS3StorageAdapter
   - Rate limiting functions (checkRateLimit, incrementRateLimit)
   - insertMocFile helper function
   - uploadSessionService with all dependencies

3. **Routes Updated:**
   - `POST /mocs/:id/upload-sessions` - Now calls uploadSessionService.createUploadSession()
   - `POST /mocs/:id/upload-sessions/:sessionId/complete` - Now calls uploadSessionService.completeUploadSession()

## Dependencies Wiring Pattern

```typescript
// Create upload session service
const uploadSessionService = createUploadSessionService({
  mocRepo,
  sessionRepo,
  s3Storage,
  checkRateLimit,
  incrementRateLimit,
  insertMocFile,
  s3Bucket,
  cloudfrontDomain,
  presignTtlSeconds: 900, // 15 minutes
})
```

## Rate Limiting Implementation

Uses the existing `user_daily_uploads` table:
- Daily limit: 10 uploads per user
- Uses SQL upsert for atomic increment
- Returns 429 when limit exceeded

## Error Handling

Both endpoints now return proper HTTP status codes:

### Create Upload Session Errors:
| Error | Status | Message |
|-------|--------|---------|
| VALIDATION_ERROR | 400 | Invalid request |
| MOC_NOT_FOUND | 404 | MOC not found or access denied |
| FORBIDDEN | 403 | Access denied |
| FILE_TOO_SMALL | 400 | File too small for presigned upload (min 10MB) |
| FILE_TOO_LARGE | 400 | File too large (max 50MB) |
| INVALID_MIME_TYPE | 400 | Invalid file type. Only PDF files are allowed |
| RATE_LIMIT_EXCEEDED | 429 | Upload limit exceeded |
| DB_ERROR | 500 | Database error |
| S3_ERROR | 500 | Storage error |

### Complete Upload Session Errors:
| Error | Status | Message |
|-------|--------|---------|
| SESSION_NOT_FOUND | 404 | Upload session not found |
| FORBIDDEN | 403 | Access denied |
| EXPIRED_SESSION | 410 | Upload session has expired |
| SESSION_ALREADY_COMPLETED | 409 | Session already completed |
| FILE_NOT_IN_S3 | 400 | File not found in storage |
| SIZE_MISMATCH | 400 | Uploaded file size does not match |
| DB_ERROR | 500 | Database error |
| S3_ERROR | 500 | Storage error |

## Verification

- TypeScript compilation passes for all new/modified files
- No new TypeScript errors introduced
- Follows existing patterns in the codebase

## Environment Variables Required

- `AWS_REGION` - AWS region (defaults to us-east-1)
- `S3_BUCKET` - S3 bucket name for uploads
- `CLOUDFRONT_DOMAIN` - Optional CloudFront distribution domain

## Date

2026-02-09
