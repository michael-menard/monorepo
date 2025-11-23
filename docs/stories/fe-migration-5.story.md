# Story 1.5: Presigned S3 URL File Upload Implementation

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.5

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** user,
**I want** to upload files larger than 10MB directly to S3,
**so that** file uploads succeed without API Gateway payload limit errors.

---

## Business Context

API Gateway has a 10MB payload limit which prevents large file uploads. This story implements presigned S3 URL upload flow to bypass this limitation, enabling users to upload files of any size directly to S3. This is critical for MOC instruction PDFs and high-resolution gallery images that frequently exceed 10MB.

---

## Acceptance Criteria

**AC1**: File upload utility detects file size: ≤10MB → direct API Gateway upload, >10MB → presigned S3 URL flow

**AC2**: Presigned URL request endpoint created: `POST /api/files/presigned-url` returns `{ url, fields, key }`

**AC3**: Frontend implements presigned S3 upload with progress tracking (use `XMLHttpRequest` or `fetch` with progress events)

**AC4**: After S3 upload completes, send S3 key to Lambda: `POST /api/files/confirm-upload` creates DB record

**AC5**: Error handling: S3 upload failure shows user-friendly message, retry option available

**AC6**: Client-side file size validation with clear error message for files exceeding max limit (document limit in UI)

---

## Integration Verification

**IV1**: Existing file upload flows (MOC instructions, gallery images) work for files <10MB via API Gateway

**IV2**: Large file test (15MB image): Upload succeeds via presigned S3 URL, DB record created, file accessible in gallery

**IV3**: Boundary test: 9MB, 10MB, 11MB files all upload successfully with correct routing (Gateway vs S3)

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: React 19, TypeScript, RTK Query, AWS S3, AWS Lambda
- **Related Components**:
  - `@repo/upload` package - File upload components
  - Serverless file upload Lambda functions
  - S3 buckets for MOC instructions and gallery images

### Implementation Approach

1. **Backend: Presigned URL Generation Lambda**:

```typescript
// apps/api/lego-api-serverless/src/functions/presigned-url.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({ region: 'us-east-1' })

export async function handler(event) {
  const { fileName, fileType, fileSize, uploadType } = JSON.parse(event.body)

  // Validate file size (max 100MB)
  if (fileSize > 100 * 1024 * 1024) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'File too large. Max 100MB.' }),
    }
  }

  const bucketName = uploadType === 'moc' ? 'moc-instructions' : 'gallery-images'
  const key = `uploads/${Date.now()}-${fileName}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: fileType,
  })

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }) // 5 min

  return {
    statusCode: 200,
    body: JSON.stringify({ url: presignedUrl, key }),
  }
}
```

2. **Backend: Confirm Upload Lambda**:

```typescript
// apps/api/lego-api-serverless/src/functions/confirm-upload.ts
import { db } from '@/lib/db/client'
import { files } from '@/db/schema'

export async function handler(event) {
  const { key, uploadType, userId, metadata } = JSON.parse(event.body)

  // Create DB record
  await db.insert(files).values({
    userId,
    s3Key: key,
    uploadType,
    fileName: metadata.fileName,
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    createdAt: new Date(),
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Upload confirmed' }),
  }
}
```

3. **Frontend: File Size Detection and Routing**:

```typescript
// packages/tools/upload/src/utils/upload-strategy.ts
const API_GATEWAY_LIMIT = 10 * 1024 * 1024 // 10MB

export function getUploadStrategy(fileSize: number): 'gateway' | 'presigned' {
  return fileSize <= API_GATEWAY_LIMIT ? 'gateway' : 'presigned'
}
```

4. **Frontend: Presigned S3 Upload with Progress**:

```typescript
// packages/tools/upload/src/lib/s3-upload.ts
export async function uploadToS3(
  file: File,
  presignedUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
```

5. **Frontend: Upload Flow Integration**:

```typescript
// packages/tools/upload/src/hooks/useFileUpload.ts
import { useRequestPresignedUrlMutation, useConfirmUploadMutation } from '@/services/api'
import { uploadToS3 } from '../lib/s3-upload'
import { getUploadStrategy } from '../utils/upload-strategy'

export function useFileUpload() {
  const [requestPresignedUrl] = useRequestPresignedUrlMutation()
  const [confirmUpload] = useConfirmUploadMutation()
  const [progress, setProgress] = useState(0)

  async function uploadFile(file: File, uploadType: 'moc' | 'gallery') {
    const strategy = getUploadStrategy(file.size)

    if (strategy === 'gateway') {
      // Direct API Gateway upload for small files
      return await directUpload(file, uploadType)
    } else {
      // Presigned S3 URL flow for large files
      const { url, key } = await requestPresignedUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadType,
      }).unwrap()

      await uploadToS3(file, url, setProgress)

      await confirmUpload({
        key,
        uploadType,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      }).unwrap()

      return { key }
    }
  }

  return { uploadFile, progress }
}
```

### Dependencies

- **Upstream**: Story 1.4 (AWS Cognito Authentication Integration)
- **Downstream**: Story 1.6 (Lambda Error Response Handling)
- **Shared Database**: PostgreSQL (file metadata)
- **External Services**: AWS S3

### File Changes

**Files to Create**:

- `apps/api/lego-api-serverless/src/functions/presigned-url.ts`
- `apps/api/lego-api-serverless/src/functions/confirm-upload.ts`
- `packages/tools/upload/src/lib/s3-upload.ts`
- `packages/tools/upload/src/utils/upload-strategy.ts`
- `packages/tools/upload/src/hooks/useFileUpload.ts`

**Files to Modify**:

- `apps/api/lego-api-serverless/sst.config.ts` - Add presigned URL and confirm upload Lambda functions

### Testing Strategy

**Unit Tests**:

```typescript
// upload-strategy.test.ts
import { getUploadStrategy } from './upload-strategy'

describe('getUploadStrategy', () => {
  it('should use gateway for files ≤10MB', () => {
    expect(getUploadStrategy(10 * 1024 * 1024)).toBe('gateway')
  })

  it('should use presigned for files >10MB', () => {
    expect(getUploadStrategy(11 * 1024 * 1024)).toBe('presigned')
  })
})
```

**Integration Tests**:

- Mock presigned URL endpoint
- Test upload progress tracking
- Test confirm upload call after S3 upload
- Test error handling (S3 failure, network error)

**Manual Testing**:

1. Upload 5MB file → verify direct API Gateway upload
2. Upload 15MB file → verify presigned S3 URL flow
3. Monitor progress bar during large upload
4. Verify DB record created after upload
5. Test boundary: 9MB, 10MB, 11MB files
6. Test error: Cancel upload mid-progress, verify retry option

---

## Definition of Done

- [ ] Presigned URL Lambda function created and deployed
- [ ] Confirm upload Lambda function created and deployed
- [ ] Frontend file size detection implemented
- [ ] Presigned S3 upload with progress tracking implemented
- [ ] Upload flow integrated with existing UI components
- [ ] Error handling and retry logic implemented
- [ ] Client-side file size validation (max 100MB)
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed: 9MB, 10MB, 11MB, 15MB files
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Notes

- **File Size Limit**: Set reasonable max (e.g., 100MB) to prevent abuse
- **Presigned URL Expiration**: 5 minutes - enough time for upload but not too long
- **Progress Tracking**: Use `XMLHttpRequest` for progress events (Fetch API doesn't support upload progress)
- **Security**: Presigned URLs are time-limited and scoped to specific S3 key
- **Future Enhancement**: Add chunked upload for files >100MB (not in this story)

---

**Story Created:** 2025-11-23
**Last Updated:** 2025-11-23
