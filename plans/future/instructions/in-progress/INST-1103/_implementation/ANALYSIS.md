# Elaboration Analysis - INST-1103

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | **FAIL** | **Critical** | Story scope exceeds index entry - index shows "Upload cover image", story includes create page, detail page, gallery integration |
| 2 | Internal Consistency | **PASS** | — | Goals, non-goals, and ACs are consistent |
| 3 | Reuse-First | **PASS** | — | Excellent reuse: ImageUploadZone (95%), file validation (100%), S3 adapter (80%) |
| 4 | Ports & Adapters | **FAIL** | **Critical** | No service layer specified - story plans business logic in route handler, violates api-layer.md |
| 5 | Local Testability | **PASS** | — | Comprehensive test plan with unit, integration, and E2E tests |
| 6 | Decision Completeness | **PASS** | — | No blocking TBDs or unresolved decisions |
| 7 | Risk Disclosure | **PASS** | — | Risks properly disclosed (INST-1102 dependency, S3 CORS) |
| 8 | Story Sizing | **FAIL** | **Critical** | Story is TOO LARGE - 48 ACs, both frontend + backend, touches multiple packages, 3+ test scenarios |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Missing Service Layer** | **Critical** | Story must specify service file in `apps/api/lego-api/domains/mocs/application/services.ts` per api-layer.md. Route handler must be thin adapter only. |
| 2 | **Business Logic in Routes** | **Critical** | Story plans validation, S3 upload, DB update in route handler. Must move to service layer. See api-layer.md lines 90-106. |
| 3 | **Story Size Violation** | **Critical** | 48 ACs violates sizing guideline (>8 is "too large"). Multiple independent features bundled (create page upload, detail page upload, gallery integration). |
| 4 | **Scope Creep** | High | Story index shows "Upload cover image" but story includes create page integration, detail page integration, gallery display. Split into base + integration stories. |
| 5 | **HTTP Types in Service** | High | Architecture section shows CloudFront URL conversion in handler, but this is business logic that belongs in service layer. |
| 6 | **Transaction Pattern Missing** | Medium | Story mentions transaction safety but doesn't specify service method signature or error handling pattern. |
| 7 | **No Port Interface** | Medium | No `MocImageStorage` port interface defined for S3 operations (should follow wishlist pattern). |
| 8 | **Adapter Pattern Not Followed** | Medium | S3 operations should be in `domains/mocs/adapters/storage.ts`, not inline in route. |

## Split Recommendation

Story MUST be split into smaller, independently testable vertical slices:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| **INST-1103-A: Upload Thumbnail (Core)** | Backend service + route for POST /mocs/:id/thumbnail, frontend ThumbnailUpload component, basic integration in detail page | AC 6-34 (validation, upload, storage, backend tests) + AC 38-44 (testing) | INST-1102 |
| **INST-1103-B: Thumbnail Display Integration** | Gallery card thumbnail display, detail page cover card, create page flow | AC 1-5 (component rendering), AC 9-17 (preview/upload UI), AC 45-48 (E2E tests) | INST-1103-A, INST-1100, INST-1101 |

**Rationale:**
- INST-1103-A: Core vertical slice - complete upload functionality with service layer, ports, adapters (20 ACs)
- INST-1103-B: Display integration - connects thumbnail to existing UI (8 ACs)
- Each split is independently testable
- INST-1103-A can be developed while INST-1100/1101 are in progress
- INST-1103-B requires INST-1103-A completion + gallery/detail pages

## Preliminary Verdict

**FAIL - MVP-critical issues block implementation**

**Blocking Issues:**
1. **No Service Layer** - Story violates canonical API architecture (api-layer.md). Must define service layer before implementation.
2. **Story Too Large** - 48 ACs across multiple features requires split per agent spec (line 119-132).
3. **Architecture Non-Compliance** - Business logic planned for route handlers violates hexagonal architecture.

**Required Actions Before Implementation:**
1. Split story into INST-1103-A (core upload) and INST-1103-B (display integration)
2. Define service layer in INST-1103-A:
   - `domains/mocs/application/services.ts` - `uploadThumbnail()` method
   - `domains/mocs/ports/index.ts` - `MocImageStorage` interface
   - `domains/mocs/adapters/storage.ts` - S3 implementation
3. Update route handler to be thin adapter (< 50 lines per api-layer.md line 211)
4. Move validation, S3 upload, CloudFront conversion, DB update to service layer

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Service layer undefined | Core upload journey | Add `domains/mocs/application/services.ts` with `uploadThumbnail(userId, mocId, file)` method |
| 2 | Port interface missing | S3 operations | Add `MocImageStorage` interface to `domains/mocs/ports/index.ts` |
| 3 | Adapter not specified | S3 upload | Add `createMocImageStorage()` to `domains/mocs/adapters/storage.ts` |
| 4 | Route handler bloat | Architecture compliance | Thin route handler (< 50 lines) that calls service, no business logic |
| 5 | Transaction pattern unclear | Data integrity | Service method must wrap S3 upload + DB update in transaction, specify error handling |

---

## Architecture Corrections Required

### Current Plan (WRONG - from story lines 218-230):
```typescript
// Route handler doing everything (VIOLATES api-layer.md)
app.post('/mocs/:id/thumbnail', async c => {
  const body = await c.req.parseBody() // ✅ OK
  const file = body.file as File        // ✅ OK

  // ❌ WRONG - Business logic in route
  const mimeType = await fileType.fromBuffer(buffer)
  if (!allowedTypes.includes(mimeType)) return c.json({ error: 'INVALID_MIME_TYPE' }, 400)

  const s3Key = `mocs/${userId}/${mocId}/thumbnail/${uuid}-${filename}`
  await s3.upload(buffer, s3Key) // ❌ WRONG - Direct infrastructure call

  const cloudFrontUrl = toCloudFrontUrl(s3Url) // ❌ WRONG - Business logic
  await db.update('moc_instructions').set({ thumbnailUrl: cloudFrontUrl }) // ❌ WRONG

  return c.json({ thumbnailUrl: cloudFrontUrl })
})
```

### Required Pattern (CORRECT - per api-layer.md):

**Route Handler (Thin Adapter):**
```typescript
// domains/mocs/routes.ts
import { createMocService } from './application/index.js'
import { createMocRepository, createMocImageStorage } from './adapters/index.js'

const mocRepo = createMocRepository(db, schema)
const imageStorage = createMocImageStorage()
const mocService = createMocService({ mocRepo, imageStorage })

app.post('/:id/thumbnail', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')
  const body = await c.req.parseBody()
  const file = body.file as File

  if (!file) return c.json({ error: 'No file provided' }, 400)

  const buffer = Buffer.from(await file.arrayBuffer())

  // Call service - ALL business logic here
  const result = await mocService.uploadThumbnail(userId, mocId, {
    buffer,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  })

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404
                 : result.error === 'FORBIDDEN' ? 403
                 : result.error === 'INVALID_MIME_TYPE' ? 400
                 : result.error === 'FILE_TOO_LARGE' ? 400
                 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ thumbnailUrl: result.data.thumbnailUrl })
})
```

**Service Layer (Business Logic):**
```typescript
// domains/mocs/application/services.ts
import type { MocRepository, MocImageStorage } from '../ports/index.js'

export interface MocServiceDeps {
  mocRepo: MocRepository
  imageStorage: MocImageStorage
}

export function createMocService(deps: MocServiceDeps) {
  const { mocRepo, imageStorage } = deps

  return {
    async uploadThumbnail(
      userId: string,
      mocId: string,
      file: { buffer: Buffer; filename: string; mimeType: string; size: number }
    ): Promise<Result<{ thumbnailUrl: string }, MocError>> {
      // 1. Get MOC (check existence and ownership)
      const mocResult = await mocRepo.findById(mocId)
      if (!mocResult.ok) return err('NOT_FOUND')
      if (mocResult.data.userId !== userId) return err('FORBIDDEN')

      // 2. Validate file (business rules)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      const actualMimeType = await fileType.fromBuffer(file.buffer)
      if (!allowedTypes.includes(actualMimeType?.mime || '')) {
        await logSecurityEvent(userId, file.filename, 'INVALID_MIME_TYPE')
        return err('INVALID_MIME_TYPE')
      }

      if (file.size > 10 * 1024 * 1024) return err('FILE_TOO_LARGE')
      if (file.size < 1) return err('FILE_TOO_SMALL')

      // 3. Upload to S3 (through port)
      const uploadResult = await imageStorage.uploadThumbnail(userId, mocId, {
        buffer: file.buffer,
        filename: file.filename,
        mimeType: actualMimeType.mime,
      })
      if (!uploadResult.ok) return err('UPLOAD_FAILED')

      // 4. Delete old thumbnail if exists
      if (mocResult.data.thumbnailUrl) {
        await imageStorage.deleteThumbnail(mocResult.data.thumbnailUrl)
      }

      // 5. Update database (within transaction)
      const updateResult = await mocRepo.updateThumbnail(mocId, uploadResult.data.url)
      if (!updateResult.ok) {
        // Rollback: delete newly uploaded thumbnail
        await imageStorage.deleteThumbnail(uploadResult.data.url)
        return err('UPDATE_FAILED')
      }

      return ok({ thumbnailUrl: uploadResult.data.url })
    }
  }
}
```

**Port Interface:**
```typescript
// domains/mocs/ports/index.ts
export interface MocImageStorage {
  uploadThumbnail(
    userId: string,
    mocId: string,
    file: { buffer: Buffer; filename: string; mimeType: string }
  ): Promise<Result<{ url: string; key: string }, UploadError>>

  deleteThumbnail(urlOrKey: string): Promise<Result<void, DeleteError>>
}
```

**Adapter Implementation:**
```typescript
// domains/mocs/adapters/storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export function createMocImageStorage(): MocImageStorage {
  const s3 = new S3Client({ region: process.env.AWS_REGION })
  const bucket = process.env.S3_BUCKET

  return {
    async uploadThumbnail(userId, mocId, file) {
      const sanitized = file.filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase()
      const key = `mocs/${userId}/${mocId}/thumbnail/${uuidv4()}-${sanitized}`

      try {
        await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimeType,
        }))

        const url = toCloudFrontUrl(`s3://${bucket}/${key}`)
        return ok({ url, key })
      } catch (error) {
        logger.error('S3 upload failed', { userId, mocId, filename: file.filename, error })
        return err('UPLOAD_FAILED')
      }
    },

    async deleteThumbnail(urlOrKey) {
      const key = extractS3Key(urlOrKey)
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        return ok(undefined)
      } catch (error) {
        logger.warn('S3 delete failed (non-blocking)', { key, error })
        return ok(undefined) // Don't block on delete failures
      }
    }
  }
}
```

---

## Worker Token Summary

- Input: ~71,000 tokens (story file, index, agent spec, api-layer.md, PM artifacts)
- Output: ~4,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
