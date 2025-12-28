# Story insp-2001: S3 Upload Infrastructure

## Status

Draft

## Consolidates

- insp-1002.s3-presign-infrastructure

## Story

**As a** developer,
**I want** S3 presigned URL infrastructure for inspiration image uploads,
**so that** users can securely upload images directly to S3.

## PRD Reference

See [Epic 5: Inspiration Gallery PRD](/docs/prd/epic-5-inspiration-gallery.md) - Technical Notes > Image Storage

## Dependencies

- **insp-2000**: Database Schema & Shared Types (for schema types)

## Acceptance Criteria

1. POST /api/inspirations/presign endpoint generates presigned PUT URL
2. Presigned URLs have appropriate expiration (e.g., 5 minutes)
3. S3 bucket configured with correct CORS for browser uploads
4. File type validation (image/* only)
5. File size limits enforced (e.g., 10MB max)
6. User-scoped S3 key prefix (e.g., `users/{userId}/inspirations/{uuid}`)
7. Thumbnail generation pipeline configured (or on-demand resize)
8. RTK Query mutation for presign request
9. Zod schemas for presign request/response

## Tasks / Subtasks

### Task 1: Create Presign Endpoint (AC: 1, 2, 4, 5, 6)

- [ ] Create `apps/api/endpoints/inspirations/presign/handler.ts`
- [ ] Accept request body: { fileName, contentType, fileSize }
- [ ] Validate contentType is image/* (jpeg, png, gif, webp)
- [ ] Validate fileSize is under limit (10MB)
- [ ] Generate unique S3 key: `users/{userId}/inspirations/{uuid}/{sanitizedFileName}`
- [ ] Generate presigned PUT URL with 5-minute expiration
- [ ] Return { uploadUrl, s3Key, expiresAt }

### Task 2: Create Zod Schemas (AC: 9)

- [ ] Define PresignRequestSchema:
  - fileName: string (required)
  - contentType: string (must be image/*)
  - fileSize: number (max 10MB)
- [ ] Define PresignResponseSchema:
  - uploadUrl: string (URL)
  - s3Key: string
  - expiresAt: datetime
- [ ] Export from schemas package

### Task 3: Configure S3 Bucket (AC: 3)

- [ ] Verify inspirations bucket exists or create in serverless.yml
- [ ] Configure CORS rules:
  - AllowedOrigins: frontend domains
  - AllowedMethods: PUT, GET
  - AllowedHeaders: Content-Type, x-amz-*
  - MaxAge: 3600
- [ ] Set lifecycle rules for cleanup if needed

### Task 4: Create Thumbnail Pipeline (AC: 7)

- [ ] Option A: Lambda@Edge for on-demand resizing
- [ ] Option B: S3 trigger Lambda to generate thumbnails on upload
- [ ] Configure thumbnail sizes (e.g., 200x200, 400x400)
- [ ] Store thumbnails in separate prefix or with size suffix

### Task 5: Create RTK Query Mutation (AC: 8)

- [ ] Add presignInspirationUpload mutation to inspiration-api.ts
- [ ] Accept { fileName, contentType, fileSize }
- [ ] Return PresignResponse
- [ ] Handle errors appropriately

### Task 6: Create Upload Utility Hook

- [ ] Create useInspirationUpload hook
- [ ] Handle presign → upload to S3 → return S3 key flow
- [ ] Track upload progress
- [ ] Handle errors and retries

## Dev Notes

### Presign Endpoint

```typescript
// apps/api/endpoints/inspirations/presign/handler.ts
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuid } from 'uuid'
import { PresignRequestSchema, PresignResponseSchema } from '@repo/api-client/schemas/inspiration'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PRESIGN_EXPIRES = 5 * 60 // 5 minutes

export async function handler(event: APIGatewayEvent) {
  const userId = event.requestContext.authorizer?.userId
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const body = PresignRequestSchema.parse(JSON.parse(event.body || '{}'))

  // Validate content type
  if (!ALLOWED_TYPES.includes(body.contentType)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid file type. Allowed: jpeg, png, gif, webp' }),
    }
  }

  // Validate file size
  if (body.fileSize > MAX_FILE_SIZE) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'File too large. Maximum size: 10MB' }),
    }
  }

  // Generate S3 key
  const fileId = uuid()
  const sanitizedFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const s3Key = `users/${userId}/inspirations/${fileId}/${sanitizedFileName}`

  // Generate presigned URL
  const s3Client = new S3Client({})
  const command = new PutObjectCommand({
    Bucket: process.env.INSPIRATIONS_BUCKET,
    Key: s3Key,
    ContentType: body.contentType,
    ContentLength: body.fileSize,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGN_EXPIRES,
  })

  const expiresAt = new Date(Date.now() + PRESIGN_EXPIRES * 1000).toISOString()

  return {
    statusCode: 200,
    body: JSON.stringify(
      PresignResponseSchema.parse({ uploadUrl, s3Key, expiresAt })
    ),
  }
}
```

### Zod Schemas

```typescript
// packages/core/api-client/src/schemas/inspiration.ts (add to existing)

export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>
```

### S3 CORS Configuration

```yaml
# serverless.yml (resources section)
InspirationsBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: ${self:custom.inspirationsBucket}
    CorsConfiguration:
      CorsRules:
        - AllowedOrigins:
            - https://app.example.com
            - http://localhost:3000
          AllowedMethods:
            - PUT
            - GET
          AllowedHeaders:
            - Content-Type
            - x-amz-*
          MaxAge: 3600
```

### RTK Query Mutation

```typescript
// packages/core/api-client/src/rtk/inspiration-api.ts
export const inspirationApi = createApi({
  // ... existing config
  endpoints: (builder) => ({
    presignInspirationUpload: builder.mutation<PresignResponse, PresignRequest>({
      query: (body) => ({
        url: '/inspirations/presign',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => PresignResponseSchema.parse(response),
    }),
  }),
})

export const { usePresignInspirationUploadMutation } = inspirationApi
```

### Upload Utility Hook

```typescript
// apps/web/main-app/src/hooks/useInspirationUpload.ts
import { usePresignInspirationUploadMutation } from '@repo/api-client/rtk/inspiration-api'

interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export function useInspirationUpload() {
  const [presign] = usePresignInspirationUploadMutation()

  const upload = async (
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> => {
    // 1. Get presigned URL
    const { uploadUrl, s3Key } = await presign({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }).unwrap()

    // 2. Upload to S3
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          })
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(file)
    })

    // 3. Return S3 key (to be used in inspiration creation)
    return s3Key
  }

  return { upload }
}
```

### Thumbnail Generation (Lambda Trigger)

```typescript
// apps/api/functions/generate-thumbnails/handler.ts
import sharp from 'sharp'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const THUMBNAIL_SIZES = [
  { suffix: 'thumb', width: 200, height: 200 },
  { suffix: 'medium', width: 400, height: 400 },
]

export async function handler(event: S3Event) {
  const s3Client = new S3Client({})

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key)

    // Skip if already a thumbnail
    if (key.includes('_thumb') || key.includes('_medium')) continue

    // Get original image
    const original = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const imageBuffer = await streamToBuffer(original.Body)

    // Generate thumbnails
    for (const size of THUMBNAIL_SIZES) {
      const thumbnail = await sharp(imageBuffer)
        .resize(size.width, size.height, { fit: 'cover' })
        .toBuffer()

      const thumbKey = key.replace(/(\.[^.]+)$/, `_${size.suffix}$1`)

      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumbnail,
        ContentType: 'image/jpeg',
      }))
    }
  }
}
```

### File Locations

```
apps/api/endpoints/inspirations/
  presign/
    handler.ts               # Presign endpoint

apps/api/functions/
  generate-thumbnails/
    handler.ts               # S3 trigger for thumbnails

packages/core/api-client/src/schemas/
  inspiration.ts             # Add presign schemas

packages/core/api-client/src/rtk/
  inspiration-api.ts         # Add presign mutation

apps/web/main-app/src/hooks/
  useInspirationUpload.ts    # Upload utility hook
```

## Testing

### Endpoint Tests

- [ ] POST /api/inspirations/presign returns presigned URL
- [ ] Rejects invalid content types (non-image)
- [ ] Rejects files over size limit
- [ ] Presigned URL works for actual S3 upload
- [ ] S3 key follows expected pattern
- [ ] Unauthorized requests rejected

### Integration Tests

- [ ] Full upload flow: presign → S3 upload → verify file exists
- [ ] CORS allows browser uploads from allowed origins
- [ ] Thumbnail generation triggers on upload (if using S3 trigger)

### Schema Tests

- [ ] PresignRequestSchema validates correct data
- [ ] PresignRequestSchema rejects invalid content types
- [ ] PresignRequestSchema rejects oversized files
- [ ] PresignResponseSchema validates response structure

## Definition of Done

- [ ] Presign endpoint deployed and working
- [ ] S3 bucket configured with CORS
- [ ] File type and size validation enforced
- [ ] Thumbnail pipeline working (or deferred to on-demand)
- [ ] RTK Query mutation available
- [ ] Upload utility hook created
- [ ] All tests pass
- [ ] Code reviewed
- [ ] `pnpm check-types` passes

## Change Log

| Date       | Version | Description                                    | Author   |
| ---------- | ------- | ---------------------------------------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft                                  | SM Agent |
| 2025-12-27 | 0.2     | Consolidated from insp-1002                    | Claude   |
