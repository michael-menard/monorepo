# Implementation Plan - STORY-01711

## Phase 1: Create Session Endpoint

**File:** `apps/api/platforms/vercel/api/mocs/uploads/sessions/index.ts`

**Logic:**
1. Accept POST with `{ files: FileMetadata[] }` body
2. Validate authentication (AUTH_BYPASS support)
3. Validate request body with Zod schema
4. Check rate limit via `@repo/rate-limit` before any DB writes
5. Validate files:
   - At least one instruction file required
   - File size limits per category (PDF: 50MB, image: 10MB, parts-list: 5MB)
   - MIME type validation per category
   - File count limits for images and parts lists
6. Create session record in `upload_sessions` table
7. Return 201 with `{ sessionId, partSizeBytes, expiresAt }`

**Error Responses:**
- 401: Missing authentication
- 400: Invalid request body, no instruction file
- 413: File exceeds size limit
- 415: Invalid MIME type
- 422: Zod validation error
- 429: Rate limit exceeded with `nextAllowedAt`

## Phase 2: Register File Endpoint

**File:** `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/index.ts`

**Logic:**
1. Accept POST with file metadata body
2. Validate authentication
3. Extract sessionId from path parameters
4. Validate request body with Zod schema
5. Verify session exists, belongs to user, is active, not expired
6. Validate file size and MIME type
7. Generate S3 key: `{stage}/moc-instructions/{userId}/{sessionId}/{category}/{fileId}.{ext}`
8. Initiate S3 multipart upload via `CreateMultipartUploadCommand`
9. Create record in `upload_session_files` table
10. Return 201 with `{ fileId, uploadId }`

**Error Responses:**
- 401: Missing authentication
- 400: Invalid request body, session not active, session expired
- 404: Session not found (includes other user's session)
- 413: File exceeds size limit
- 415: Invalid MIME type

## Phase 3: Complete File Endpoint

**File:** `apps/api/platforms/vercel/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts`

**Logic:**
1. Accept POST with `{ parts: [{partNumber, etag}] }` body
2. Validate authentication
3. Extract sessionId and fileId from path parameters
4. Validate request body with Zod schema
5. Verify session exists, belongs to user, is active, not expired
6. Verify file exists and belongs to session
7. Verify file is not already completed
8. Verify parts count matches uploaded parts in DB
9. Call S3 `CompleteMultipartUploadCommand`
10. Build file URL and update file status to `completed`
11. Return 200 with `{ fileId, fileUrl }`

**Error Responses:**
- 401: Missing authentication
- 400: Invalid request body, session not active, session expired, file already completed, part count mismatch
- 404: Session or file not found

## Phase 4: Route Rewrites

**File:** `apps/api/platforms/vercel/vercel.json`

Add rewrites:
```json
{ "source": "/api/mocs/uploads/sessions/:sessionId/files/:fileId/complete", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/[fileId]/complete.ts" },
{ "source": "/api/mocs/uploads/sessions/:sessionId/files", "destination": "/api/mocs/uploads/sessions/[sessionId]/files/index.ts" },
{ "source": "/api/mocs/uploads/sessions", "destination": "/api/mocs/uploads/sessions/index.ts" }
```

## Phase 5: Test File

**File:** `__http__/story-01711-session-crud.http`

Include requests for:
- Happy path: create session, register file, complete file
- Error cases: missing auth, validation errors, rate limit, not found

## Implementation Notes

### Zod Schemas (Inline)

```typescript
// File category
const FileCategorySchema = z.enum(['instruction', 'parts-list', 'image', 'thumbnail'])

// File metadata
const FileMetadataSchema = z.object({
  category: FileCategorySchema,
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().min(1),
  ext: z.string().min(1).max(10),
})

// Create session request
const CreateSessionRequestSchema = z.object({
  files: z.array(FileMetadataSchema).min(1),
})

// Register file request
const RegisterFileRequestSchema = z.object({
  category: FileCategorySchema,
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().min(1),
  ext: z.string().min(1).max(10),
})

// Complete file request
const CompleteFileRequestSchema = z.object({
  parts: z.array(z.object({
    partNumber: z.number().int().positive(),
    etag: z.string(),
  })),
})
```

### Constants

```typescript
const DEFAULT_PART_SIZE_BYTES = 5 * 1024 * 1024 // 5MB (S3 minimum for multipart)
```

### S3 Key Format

```
{stage}/moc-instructions/{userId}/{sessionId}/{category}/{fileId}.{ext}
```

### File URL Format (after completion)

```
https://{bucket}.s3.{region}.amazonaws.com/{s3Key}
```
