# DEV-FEASIBILITY: STORY-015 - MOC Instructions Initialization & Finalization

## Risk Assessment: MEDIUM

### Summary

This story migrates two complex Lambda handlers that implement a two-phase upload flow with:
- S3 presigned URL generation
- Rate limiting
- Duplicate title detection
- Transactional integrity (finalize lock pattern)
- Magic bytes validation
- Parts list validation
- OpenSearch indexing

The complexity is significant but well-understood from the existing AWS implementation.

## Change Surface Analysis

### Files to Create

| File | Purpose | Risk |
|------|---------|------|
| `apps/api/platforms/vercel/api/mocs/with-files/initialize.ts` | Initialize endpoint | Medium |
| `apps/api/platforms/vercel/api/mocs/[mocId]/finalize.ts` | Finalize endpoint | Medium |
| `packages/backend/moc-instructions-core/src/initialize-with-files.ts` | Core initialize logic | Medium |
| `packages/backend/moc-instructions-core/src/finalize-with-files.ts` | Core finalize logic | Medium |
| `packages/backend/moc-instructions-core/src/__tests__/initialize-with-files.test.ts` | Unit tests | Low |
| `packages/backend/moc-instructions-core/src/__tests__/finalize-with-files.test.ts` | Unit tests | Low |
| `__http__/mocs.http` (additions) | HTTP test requests | Low |

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `packages/backend/moc-instructions-core/src/index.ts` | Export new functions | Low |
| `apps/api/core/database/seeds/mocs.ts` | Add test data for story | Low |

## Dependency Analysis

### Required Existing Packages

| Package | Usage | Status |
|---------|-------|--------|
| `@repo/logger` | Logging | Available |
| `@repo/lambda-responses` | Error classes, response builders | Available |
| `@repo/upload-config` | File size/count limits, MIME validation | Available |
| `@repo/rate-limit` | Rate limiting | Available |
| `@repo/file-validator` | Magic bytes validation | Available |
| `@repo/db` | Drizzle schema access | Available |
| `drizzle-orm` | Database queries | Available |
| `@aws-sdk/client-s3` | S3 operations | Available |
| `@aws-sdk/s3-request-presigner` | Presigned URL generation | Available |
| `zod` | Schema validation | Available |

### Environment Variables Required

| Variable | Purpose | Required for Local Dev |
|----------|---------|------------------------|
| `DATABASE_URL` | PostgreSQL connection | Yes |
| `AWS_ACCESS_KEY_ID` | S3 credentials | Yes |
| `AWS_SECRET_ACCESS_KEY` | S3 credentials | Yes |
| `AWS_REGION` | S3 region | Yes |
| `LEGO_API_BUCKET_NAME` or `MOC_BUCKET` | S3 bucket for MOC files | Yes |
| `AUTH_BYPASS` | Local dev auth bypass | Yes (local) |
| `DEV_USER_SUB` | Dev user ID | Yes (local) |

## Technical Risks & Mitigations

### Risk 1: Rate Limiter Store Compatibility

**Issue:** The AWS Lambda uses `createPostgresRateLimitStore()` which depends on the Postgres connection pool being available.

**Mitigation:** The Vercel implementation must use the same rate limiter pattern. The `@repo/rate-limit` package with Postgres store will work on Vercel since DATABASE_URL is available. No changes needed.

**Risk Level:** Low

### Risk 2: S3 Presigned URL Generation

**Issue:** Presigned URLs work differently between Lambda (IAM role) and Vercel (explicit credentials).

**Mitigation:** The `sets/[id]/images/presign.ts` already demonstrates the pattern:
```typescript
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})
```

The core package must accept S3Client via dependency injection, not create it internally.

**Risk Level:** Medium - Pattern exists but must be followed consistently

### Risk 3: Finalize Lock Pattern

**Issue:** The two-phase lock (`finalizingAt` + `finalizedAt`) with TTL-based stale lock rescue is complex and timing-sensitive.

**Mitigation:**
1. Extract lock logic into a testable function
2. Use deterministic timestamps in tests
3. Lock TTL is config-driven (already implemented in `getUploadConfig().finalizeLockTtlMinutes`)

**Risk Level:** Medium - Complex but well-tested in AWS version

### Risk 4: OpenSearch Indexing

**Issue:** Finalize endpoint calls OpenSearch to index the MOC.

**Mitigation:** For this story, OpenSearch indexing can be:
- Option A: Deferred to a separate story (STORY-019 or later)
- Option B: Wrapped in try/catch with warning log (non-blocking)

**PM Decision Required:** OpenSearch indexing is non-critical for MVP. If OpenSearch is not available, the MOC is still created successfully in Postgres. Recommend Option B with graceful degradation.

**Risk Level:** Low (if graceful degradation chosen)

### Risk 5: Parts List Validation Dependency

**Issue:** Finalize uses `validatePartsFile()` from `../\_shared/parts-validators/validator-registry`.

**Mitigation:** This logic exists in AWS handlers. For Vercel:
1. Either create `@repo/parts-validator` package, OR
2. Inline the validation in the core package

**PM Decision Required:** Parts validation is already well-encapsulated. Recommend extracting to `@repo/parts-validator` for reuse, but this can be done inline first and refactored.

**Risk Level:** Medium - Needs decision on packaging

### Risk 6: Large File Handling

**Issue:** PDFs can be up to 100MB. Vercel has payload limits.

**Mitigation:** This is NOT an issue because:
1. Initialize only receives metadata (file sizes declared, not actual content)
2. Actual files go directly to S3 via presigned URLs (client-side upload)
3. Finalize only receives fileIds (confirmation), not file content

**Risk Level:** None

## Architectural Compliance

### Ports & Adapters Pattern

The implementation MUST follow ports & adapters:

**Core Package (Port):**
```typescript
// packages/backend/moc-instructions-core/src/initialize-with-files.ts
export interface InitializeWithFilesInput {
  userId: string
  mocData: MocMetadata
  files: FileMetadata[]
}

export interface InitializeWithFilesDeps {
  db: DrizzleClient
  s3Client: S3Client
  s3Bucket: string
  rateLimiter: RateLimiter
  getUploadConfig: () => UploadConfig
}

export async function initializeWithFiles(
  input: InitializeWithFilesInput,
  deps: InitializeWithFilesDeps
): Promise<InitializeWithFilesResult>
```

**Vercel Adapter:**
```typescript
// apps/api/platforms/vercel/api/mocs/with-files/initialize.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb()
  const s3Client = getS3Client()
  const rateLimiter = createRateLimiter(createPostgresRateLimitStore())

  const result = await initializeWithFiles(input, {
    db,
    s3Client,
    s3Bucket: process.env.MOC_BUCKET!,
    rateLimiter,
    getUploadConfig,
  })

  return res.status(201).json(result)
}
```

### Database Schema Access

Use existing schema from `@repo/db` or inline as other Vercel handlers do:
```typescript
import { mocInstructions, mocFiles } from '@repo/db/schema'
// OR
const mocInstructions = pgTable('moc_instructions', { ... })
```

## Missing AC Gaps

### Gap 1: OpenSearch Indexing Behavior

**Current AWS behavior:** Indexes MOC in OpenSearch on finalize.
**Question:** Should Vercel version also index? OpenSearch may not be accessible from Vercel.

**PM Decision:** For STORY-015, OpenSearch indexing is OUT OF SCOPE. The Postgres record is the source of truth. OpenSearch indexing can be handled by:
- A separate background job (STORY-018 pattern)
- A future API Gateway → Lambda → OpenSearch flow
- Direct OpenSearch calls if credentials are configured

### Gap 2: S3 Bucket Name

**AWS uses:** `LEGO_API_BUCKET_NAME`
**Vercel pattern (STORY-009):** `SETS_BUCKET`

**PM Decision:** Create `MOC_BUCKET` env var for Vercel, consistent with `SETS_BUCKET` pattern. Document in story AC.

## Recommended Implementation Order

1. **Core package functions first** (testable, no platform dependencies)
2. **Vercel handlers second** (thin adapters over core)
3. **HTTP tests third** (validate end-to-end)
4. **Seed data last** (support test execution)

## Blockers

**None identified.** All dependencies are available and patterns are established.

## Dev Effort Estimate

- Core package functions: 2 files × ~200 LOC each = ~400 LOC
- Core tests: 2 files × ~150 LOC each = ~300 LOC
- Vercel handlers: 2 files × ~100 LOC each = ~200 LOC
- HTTP tests: ~100 LOC additions
- Seed updates: ~50 LOC

**Total: ~1000-1200 LOC**

Complexity is medium-high due to:
- Two-phase flow coordination
- Rate limiting
- Lock pattern
- Multiple validation steps

But risk is manageable because AWS implementation is mature and well-tested.
