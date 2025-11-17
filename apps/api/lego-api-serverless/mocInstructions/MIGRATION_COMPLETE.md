# MOC API Migration to Serverless - COMPLETE ✅

**Status**: All 17/17 MOC handlers migrated (100%)

**Date Completed**: 2025-11-16

---

## Migration Summary

This document summarizes the complete migration of MOC instruction handlers from the Express monolith (`lego-projects-api`) to serverless Lambda functions (`lego-api-serverless`).

### Infrastructure Decisions

#### ✅ Single S3 Bucket Strategy
- **Decision**: Reuse existing `LegoApiBucket` for all file types
- **Rationale**:
  - Parts list files (CSV/XML) are small (max 10MB) and infrequent
  - Existing bucket already handles PDFs (50MB), images (10MB), and gallery files
  - S3 key structure is extensible: `mocs/${mocId}/${fileType}/${timestamp}-${filename}`
  - Simpler infrastructure = lower cost + easier management
  - Single lifecycle policy, CORS config, and future CDN origin

#### ✅ CDN Deferred to Later
- **Decision**: Complete serverless migration first, add CDN later
- **Rationale**:
  - Parts list files (CSV/XML) don't benefit from CDN (one-time downloads)
  - Instruction PDFs benefit slightly but not critical
  - Images benefit most but already working without CDN
  - CDN adds complexity: need to update all URL generation logic
  - Add when performance profiling shows S3 latency/cost issues

#### ✅ Presigned URL Pattern for Bulk Uploads
- **Decision**: Two-phase upload pattern for `createMocWithFiles`
- **Rationale**:
  - API Gateway has 10MB payload limit per request
  - Multiple large files (10 PDFs × 50MB) exceed limit
  - Presigned URLs allow direct client-to-S3 uploads (no Lambda intermediary)
  - Better UX for large files (faster, more reliable)
  - Standard AWS pattern for large file uploads

---

## Migration Breakdown

### ✅ Previously Migrated (13 handlers)

Already migrated to serverless at `apps/api/lego-api-serverless/mocInstructions/`:

1. **createMoc** - `POST /api/mocs`
2. **getMoc** - `GET /api/mocs/:id`
3. **updateMoc** - `PATCH /api/mocs/:id`
4. **deleteMoc** - `DELETE /api/mocs/:id`
5. **searchMocs** - `GET /api/mocs`
6. **fileUpload** - `POST /api/mocs/:id/files`
7. **fileDownload** - `GET /api/mocs/:mocId/files/:fileId/download`
8. **delete-moc-file** - `DELETE /api/mocs/:id/files/:fileId`
9. **link-gallery-image** - `POST /api/mocs/:id/gallery-images`
10. **unlink-gallery-image** - `DELETE /api/mocs/:id/gallery-images/:galleryImageId`
11. **get-moc-gallery-images** - `GET /api/mocs/:id/gallery-images`
12. **get-moc-stats** - `GET /api/mocs/stats/by-category`
13. **get-moc-uploads-over-time** - `GET /api/mocs/stats/uploads-over-time`

### ✅ Newly Migrated (4 handlers - 2 complex flows)

#### Handler 1: uploadPartsList (Simple)

**Location**: `apps/api/lego-api-serverless/mocInstructions/upload-parts-list/index.ts`

**Route**: `POST /api/mocs/:id/upload-parts-list`

**What it does**:
- Accepts CSV/TXT/XML file upload (max 10MB)
- Parses parts list using `parts-list-parser.ts` utility
- Extracts: total piece count, part numbers, quantities, colors
- Uploads file to S3
- Creates `mocFiles` record (fileType: 'parts-list')
- Creates `mocPartsLists` record with parsed metadata
- Updates MOC's `totalPieceCount` field

**Key components**:
- `src/lib/utils/parts-list-parser.ts` - Migrated from monolith, Buffer-based API
- `src/lib/services/parts-list-service.ts` - S3 upload helper
- Multipart parsing using Busboy (same pattern as `fileUpload`)

**SST Config**:
```typescript
const uploadPartsListFunction = new sst.aws.Function('UploadPartsListFunction', {
  handler: 'mocInstructions/upload-parts-list/index.handler',
  timeout: '30 seconds',
  memory: '512 MB',
  link: [postgres, bucket],
})

api.route('POST /api/mocs/{id}/upload-parts-list', uploadPartsListFunction)
```

---

#### Handler 2: createMocWithFiles (Complex - Two-Phase Pattern)

**Replaces**: Monolith `POST /api/mocs/with-files` (single multipart request)

**New Pattern**: Two separate Lambda functions

##### Phase 1: Initialize MOC with Files

**Location**: `apps/api/lego-api-serverless/mocInstructions/initialize-moc-with-files/index.ts`

**Route**: `POST /api/mocs/with-files/initialize`

**What it does**:
- Accepts MOC metadata + file list (no actual file content)
- Validates file requirements:
  - 1-10 instruction files (required)
  - 0-10 parts list files (optional)
  - 0-3 images (optional)
- Creates MOC record in database
- Creates placeholder `mocFiles` records
- Generates presigned S3 URLs for each file (valid 1 hour)
- Returns MOC ID + upload URLs

**Request body**:
```json
{
  "title": "Castle MOC",
  "description": "Medieval castle build",
  "type": "moc",
  "author": "John Doe",
  "files": [
    {
      "filename": "instructions-1.pdf",
      "fileType": "instruction",
      "mimeType": "application/pdf",
      "size": 45000000
    },
    {
      "filename": "parts-list.csv",
      "fileType": "parts-list",
      "mimeType": "text/csv",
      "size": 5000
    },
    {
      "filename": "image-1.jpg",
      "fileType": "gallery-image",
      "mimeType": "image/jpeg",
      "size": 2000000
    }
  ]
}
```

**Response**:
```json
{
  "message": "MOC initialized successfully",
  "data": {
    "mocId": "uuid-123",
    "uploadUrls": [
      {
        "fileId": "file-1",
        "filename": "instructions-1.pdf",
        "fileType": "instruction",
        "uploadUrl": "https://s3.../presigned-url-1",
        "expiresIn": 3600
      },
      {
        "fileId": "file-2",
        "filename": "parts-list.csv",
        "fileType": "parts-list",
        "uploadUrl": "https://s3.../presigned-url-2",
        "expiresIn": 3600
      },
      {
        "fileId": "file-3",
        "filename": "image-1.jpg",
        "fileType": "gallery-image",
        "uploadUrl": "https://s3.../presigned-url-3",
        "expiresIn": 3600
      }
    ],
    "expiresIn": 3600
  }
}
```

**SST Config**:
```typescript
const initializeMocWithFilesFunction = new sst.aws.Function('InitializeMocWithFilesFunction', {
  handler: 'mocInstructions/initialize-moc-with-files/index.handler',
  timeout: '30 seconds',
  memory: '512 MB',
  link: [postgres, bucket],
})

api.route('POST /api/mocs/with-files/initialize', initializeMocWithFilesFunction)
```

---

##### Phase 2: Finalize MOC with Files

**Location**: `apps/api/lego-api-serverless/mocInstructions/finalize-moc-with-files/index.ts`

**Route**: `POST /api/mocs/:mocId/finalize`

**What it does**:
- Verifies MOC exists and user owns it
- Confirms files were uploaded to S3 (HEAD requests)
- Sets first image as thumbnail
- Updates MOC record with thumbnail URL
- Indexes MOC in Elasticsearch
- Returns complete MOC data with all files

**Request body**:
```json
{
  "uploadedFiles": [
    { "fileId": "file-1", "success": true },
    { "fileId": "file-2", "success": true },
    { "fileId": "file-3", "success": true }
  ]
}
```

**Response**:
```json
{
  "message": "MOC created successfully with files",
  "data": {
    "moc": {
      "id": "uuid-123",
      "title": "Castle MOC",
      "thumbnailUrl": "https://s3.../image-1.jpg",
      "files": [
        {
          "id": "file-1",
          "fileType": "instruction",
          "fileUrl": "https://s3.../instructions-1.pdf"
        },
        {
          "id": "file-2",
          "fileType": "parts-list",
          "fileUrl": "https://s3.../parts-list.csv"
        },
        {
          "id": "file-3",
          "fileType": "thumbnail",
          "fileUrl": "https://s3.../image-1.jpg"
        }
      ],
      "images": [
        {
          "id": "file-3",
          "url": "https://s3.../image-1.jpg",
          "alt": "image-1.jpg"
        }
      ]
    }
  }
}
```

**SST Config**:
```typescript
const finalizeMocWithFilesFunction = new sst.aws.Function('FinalizeMocWithFilesFunction', {
  handler: 'mocInstructions/finalize-moc-with-files/index.handler',
  timeout: '30 seconds',
  memory: '512 MB',
  link: [postgres, openSearch, bucket],
})

api.route('POST /api/mocs/{mocId}/finalize', finalizeMocWithFilesFunction)
```

---

## Frontend Integration Guide

### Old Flow (Monolith - Single Request)

```typescript
// ❌ Old: Single multipart request to monolith
const formData = new FormData()
formData.append('title', 'Castle MOC')
formData.append('description', 'Medieval castle')
formData.append('type', 'moc')
formData.append('instructionsFile', instructionFile1)
formData.append('instructionsFile', instructionFile2)
formData.append('partsLists', partsListFile)
formData.append('images', imageFile1)

const response = await fetch('/api/mocs/with-files', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### New Flow (Serverless - Two-Phase)

```typescript
// ✅ New: Two-phase upload pattern

// Phase 1: Initialize MOC and get presigned URLs
const initResponse = await fetch('/api/mocs/with-files/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Castle MOC',
    description: 'Medieval castle',
    type: 'moc',
    author: 'John Doe',
    files: [
      {
        filename: instructionFile1.name,
        fileType: 'instruction',
        mimeType: instructionFile1.type,
        size: instructionFile1.size
      },
      {
        filename: partsListFile.name,
        fileType: 'parts-list',
        mimeType: partsListFile.type,
        size: partsListFile.size
      },
      {
        filename: imageFile1.name,
        fileType: 'gallery-image',
        mimeType: imageFile1.type,
        size: imageFile1.size
      }
    ]
  })
})

const { mocId, uploadUrls } = await initResponse.json()

// Phase 2: Upload files directly to S3 using presigned URLs
const fileMap = {
  [uploadUrls[0].fileId]: instructionFile1,
  [uploadUrls[1].fileId]: partsListFile,
  [uploadUrls[2].fileId]: imageFile1,
}

const uploadResults = await Promise.all(
  uploadUrls.map(async ({ fileId, uploadUrl }) => {
    const file = fileMap[fileId]

    try {
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      return { fileId, success: true }
    } catch (error) {
      console.error(`Upload failed for ${fileId}:`, error)
      return { fileId, success: false }
    }
  })
)

// Phase 3: Finalize MOC
const finalizeResponse = await fetch(`/api/mocs/${mocId}/finalize`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    uploadedFiles: uploadResults
  })
})

const { moc } = await finalizeResponse.json()
console.log('MOC created:', moc)
```

---

## Files Deleted from Monolith

The following files have been removed from the Express monolith:

1. ✅ `apps/api/lego-projects-api/src/handlers/moc.ts` (1,032 lines)
   - Contained all 17 MOC handlers
   - All functionality now in serverless Lambdas

2. ✅ `apps/api/lego-projects-api/src/utils/parts-list-parser.ts` (534 lines)
   - Migrated to: `apps/api/lego-api-serverless/src/lib/utils/parts-list-parser.ts`
   - Updated to use Buffer-based API (removed Express.Multer.File types)

---

## Testing Checklist

### Unit Tests Needed

- [ ] `parts-list-parser.ts` - CSV parsing with headers
- [ ] `parts-list-parser.ts` - CSV parsing without headers
- [ ] `parts-list-parser.ts` - XML parsing
- [ ] `parts-list-parser.ts` - File validation
- [ ] `upload-parts-list/index.ts` - Multipart parsing
- [ ] `upload-parts-list/index.ts` - Database operations
- [ ] `initialize-moc-with-files/index.ts` - Presigned URL generation
- [ ] `initialize-moc-with-files/index.ts` - File requirements validation
- [ ] `finalize-moc-with-files/index.ts` - S3 verification
- [ ] `finalize-moc-with-files/index.ts` - Elasticsearch indexing

### Integration Tests Needed

- [ ] Upload parts list (CSV) - end-to-end
- [ ] Upload parts list (XML) - end-to-end
- [ ] Create MOC with files - two-phase flow
- [ ] Create MOC with files - failed upload handling
- [ ] Create MOC with files - thumbnail selection

### Manual Testing

- [ ] Upload small CSV parts list (< 1MB)
- [ ] Upload large CSV parts list (5-10MB)
- [ ] Upload XML parts list
- [ ] Create MOC with 1 instruction file + 1 image
- [ ] Create MOC with 10 instruction files + 10 parts lists + 3 images
- [ ] Verify presigned URLs expire after 1 hour
- [ ] Verify S3 file structure: `mocs/${mocId}/${fileType}/${timestamp}-${filename}`
- [ ] Verify first image becomes thumbnail
- [ ] Verify Elasticsearch indexing

---

## Performance Considerations

### Current Setup
- Single S3 bucket with lifecycle policies (90 days → IA)
- Direct S3 URLs (no CDN)
- Presigned URLs for large file uploads (bypasses API Gateway limits)

### Future Optimizations (When Needed)

#### Add CloudFront CDN
**When**: S3 data transfer costs > $100/month OR latency > 500ms

**How**:
```typescript
// sst.config.ts
const cdn = new sst.aws.CloudFront('LegoApiCdn', {
  origins: [{
    domainName: bucket.domain,
    originAccessIdentity: true,
  }],
  defaultCacheBehavior: {
    compress: true,
    viewerProtocolPolicy: 'redirect-to-https',
    minTtl: 86400, // 1 day
    maxTtl: 31536000, // 1 year
  },
})
```

**Impact**:
- Faster image delivery via edge locations
- Reduced S3 costs (fewer direct requests)
- Better global UX

**Required changes**:
- Update file URL generation in all Lambda functions
- Update frontend to use CDN URLs
- Configure cache invalidation for file deletes/updates

---

## Cost Analysis

### S3 Storage Costs (Estimate)
- **Assumption**: 1,000 MOCs with average 5 files each
- **File types**:
  - Instructions: 30MB avg × 2 files = 60MB
  - Parts lists: 1MB avg × 1 file = 1MB
  - Images: 2MB avg × 2 files = 4MB
- **Total per MOC**: ~65MB
- **Total storage**: 1,000 × 65MB = 65GB
- **Monthly cost**: 65GB × $0.023/GB = **$1.50/month**

### Lambda Execution Costs (Estimate)
- **Upload parts list**: 512MB, 5s avg → $0.00001 per invocation
- **Initialize MOC**: 512MB, 2s avg → $0.000004 per invocation
- **Finalize MOC**: 512MB, 3s avg → $0.000006 per invocation

**Total for 1,000 MOC uploads/month**: **$0.02/month** (negligible)

### Data Transfer Costs (No CDN)
- **Download**: 100GB/month × $0.09/GB = **$9.00/month**

**Total monthly cost**: $1.50 + $0.02 + $9.00 = **$10.52/month**

**With CDN** (future): CloudFront is cheaper for data transfer:
- **CloudFront**: 100GB × $0.085/GB = $8.50/month
- **Savings**: $0.50/month (not significant until scale increases)

---

## Next Steps

### Immediate
1. ✅ Migration complete - all handlers migrated
2. ✅ Monolith files deleted
3. ⏸️ Update frontend to use new two-phase upload pattern
4. ⏸️ Write unit tests for new Lambda functions
5. ⏸️ Write integration tests

### Short-term
6. Deploy to staging environment
7. Manual QA testing with real files
8. Monitor CloudWatch metrics (Lambda duration, S3 requests)
9. Update API documentation

### Long-term
10. Add CloudFront CDN (when justified by metrics)
11. Consider Lambda@Edge for image resizing (if needed)
12. Optimize presigned URL expiration based on upload patterns

---

## Success Metrics

**Migration Completeness**: 17/17 handlers (100%) ✅

**Infrastructure**:
- Single S3 bucket (simpler, lower cost) ✅
- CDN deferred (data-driven decision) ✅
- Presigned URLs (no API Gateway limits) ✅

**Code Quality**:
- Buffer-based parser (no Express dependencies) ✅
- Modular Lambda structure ✅
- Zod validation throughout ✅
- Comprehensive error handling ✅

---

## Migration Team Notes

**Architect**: Claude Code (Sonnet 4.5)
**Date**: 2025-11-16
**Duration**: ~2 hours
**Blockers**: None
**Decisions**: All approved by user (single bucket, defer CDN, presigned URLs)

**Key Learnings**:
1. Presigned URL pattern is cleaner than multipart proxy for large files
2. Single bucket with key prefixes is simpler than multiple buckets
3. CDN should be data-driven, not premature optimization
4. Buffer-based parsers are more reusable than Express-coupled ones

**Documentation**:
- All Lambda functions have inline JSDoc comments
- SST config has detailed comments for each function
- This migration doc captures all decisions and rationale
