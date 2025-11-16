# Image Service Migration - Migration Strategy

**Document:** 05-migration-strategy.md
**Version:** 1.0

---

## Migration Overview

**Duration:** 6 weeks
**Strategy:** Phased migration with dual-write
**Rollback:** Zero-downtime rollback at any phase

---

## Migration Phases

```
Week 1: Infrastructure Setup
Week 2: Lambda Implementation
Week 3: Dual-Write Implementation
Week 4: Data Migration
Week 5: Cutover
Week 6: Optimization & Cleanup
```

---

## Phase 1: Infrastructure Setup (Week 1)

### Objectives

- Deploy AWS infrastructure
- Configure SST stack
- Verify connectivity
- Set up monitoring

### Tasks

**Day 1-2: SST Project Setup**

```bash
# Create new SST project
cd apps/api
mkdir image-service
cd image-service
pnpm init

# Install dependencies
pnpm add sst aws-cdk-lib constructs
pnpm add -D @types/node typescript

# Initialize SST
pnpm sst init
```

**Day 3-4: Deploy Infrastructure**

```bash
# Deploy to dev environment
pnpm sst deploy --stage dev

# Verify resources created
aws dynamodb describe-table --table-name ImageMetadata-dev
aws s3 ls s3://images-lego-moc-dev
aws cloudfront list-distributions
```

**Day 5: Configure Monitoring**

- Create CloudWatch dashboard
- Set up alarms (errors, throttling, latency)
- Configure log groups with retention
- Test alarm notifications

**Deliverables:**

- ✅ SST stack deployed to dev
- ✅ DynamoDB table created with GSIs
- ✅ S3 bucket created with lifecycle policies
- ✅ CloudFront distribution active
- ✅ API Gateway endpoints available
- ✅ CloudWatch alarms configured

---

## Phase 2: Lambda Implementation (Week 2)

### Objectives

- Implement Lambda handlers
- Add comprehensive tests
- Integrate with DynamoDB/S3
- Deploy to dev environment

### Tasks

**Day 1-2: Upload Lambda**

```typescript
// src/functions/upload.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { ulid } from 'ulid'
import { createLogger } from '../lib/utils/logger'
import { uploadImageSchema } from '../lib/utils/validation'

const logger = createLogger('upload-handler')
const dynamodb = new DynamoDBClient({})
const s3 = new S3Client({})

export const handler: APIGatewayProxyHandlerV2 = async event => {
  const userId = event.requestContext.authorizer?.jwt.claims.sub

  try {
    // Parse multipart form data
    const { file, albumId, title, tags } = parseMultipartForm(event.body)

    // Validate with Zod
    const validated = uploadImageSchema.parse({ file, albumId, title, tags })

    // Generate image ID
    const imageId = ulid()

    // Process image with Sharp
    const processed = await sharp(file.buffer)
      .webp({ quality: 85 })
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()

    // Generate thumbnail
    const thumbnail = await sharp(file.buffer)
      .webp({ quality: 80 })
      .resize(400, 400, { fit: 'cover' })
      .toBuffer()

    // Upload to S3 (parallel)
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToS3({
        key: `images/${userId}/${imageId}.webp`,
        body: processed,
        contentType: 'image/webp',
      }),
      uploadToS3({
        key: `images/${userId}/thumbnails/${imageId}.webp`,
        body: thumbnail,
        contentType: 'image/webp',
      }),
    ])

    // Write metadata to DynamoDB
    const metadata = await saveImageMetadata({
      imageId,
      userId,
      albumId,
      title,
      tags,
      imageUrl,
      thumbnailUrl,
    })

    logger.info({ imageId, userId }, 'Image uploaded successfully')

    return {
      statusCode: 201,
      body: JSON.stringify(metadata),
    }
  } catch (error) {
    logger.error({ err: error }, 'Upload failed')
    return handleError(error)
  }
}
```

**Day 3: Get/List/Update/Delete Lambdas**

- Implement remaining Lambda handlers
- Add DynamoDB query operations
- Implement optimistic locking for updates
- Add S3 deletion for delete handler

**Day 4-5: Testing**

```typescript
// tests/unit/upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import { handler } from '../src/functions/upload'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'

vi.mock('@aws-sdk/client-dynamodb')
vi.mock('@aws-sdk/client-s3')

describe('Upload Handler', () => {
  it('should upload image and save metadata', async () => {
    const event = createMockEvent({
      body: createMultipartFormData({
        file: Buffer.from('fake-image'),
        title: 'Test Image',
      }),
    })

    const response = await handler(event, {} as any, () => {})

    expect(response.statusCode).toBe(201)
    expect(JSON.parse(response.body)).toHaveProperty('id')
  })

  it('should reject files larger than 10MB', async () => {
    const largeFile = Buffer.alloc(11 * 1024 * 1024)
    const event = createMockEvent({ body: createMultipartFormData({ file: largeFile }) })

    const response = await handler(event, {} as any, () => {})

    expect(response.statusCode).toBe(413)
  })
})
```

**Deliverables:**

- ✅ All Lambda handlers implemented
- ✅ Unit tests (90% coverage)
- ✅ Integration tests with LocalStack
- ✅ Deployed to dev environment
- ✅ Manual testing completed

---

## Phase 3: Dual-Write Implementation (Week 3)

### Objectives

- Modify main API to write to both databases
- Ensure data consistency
- Monitor for errors
- No user-facing changes yet

### Tasks

**Day 1-2: Implement Dual-Write**

```typescript
// apps/api/lego-api-serverless/src/lib/services/image-upload-service.ts
import { db } from '../db/client'
import { galleryImages } from '../db/schema'
import { createLogger } from '../utils/logger'

const logger = createLogger('image-upload-service')

export async function uploadImage(
  file: UploadedFile,
  userId: string,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  // Upload to S3 (existing logic)
  const s3Result = await uploadToS3(file, userId)

  // Write to PostgreSQL (existing)
  const pgImage = await db
    .insert(galleryImages)
    .values({
      id: s3Result.imageId,
      userId,
      originalFilename: file.originalname,
      s3Key: s3Result.s3Key,
      thumbnailKey: s3Result.thumbnailKey,
      // ... other fields
    })
    .returning()

  // Write to DynamoDB (new Image Service)
  try {
    await fetch('https://images-dev.lego-api.com/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getServiceToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: s3Result.imageId,
        userId,
        originalFilename: file.originalname,
        s3Key: s3Result.s3Key,
        thumbnailKey: s3Result.thumbnailKey,
        // ... other fields
      }),
    })

    logger.info({ imageId: s3Result.imageId }, 'Dual-write to DynamoDB successful')
  } catch (error) {
    // Log error but don't fail the request (PostgreSQL is still source of truth)
    logger.error({ err: error, imageId: s3Result.imageId }, 'DynamoDB dual-write failed')
  }

  return {
    id: pgImage[0].id,
    imageUrl: s3Result.imageUrl,
    thumbnailUrl: s3Result.thumbnailUrl,
  }
}
```

**Day 3: Add Dual-Read (Optional)**

```typescript
// Read from DynamoDB, fallback to PostgreSQL
export async function getImage(imageId: string) {
  try {
    // Try DynamoDB first
    const response = await fetch(`https://images-dev.lego-api.com/images/${imageId}`, {
      headers: { Authorization: `Bearer ${getServiceToken()}` },
    })

    if (response.ok) {
      logger.info({ imageId }, 'Read from DynamoDB')
      return response.json()
    }
  } catch (error) {
    logger.warn({ err: error, imageId }, 'DynamoDB read failed, falling back to PostgreSQL')
  }

  // Fallback to PostgreSQL
  const image = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId)).limit(1)

  return image[0]
}
```

**Day 4-5: Testing & Monitoring**

- Deploy dual-write to dev
- Monitor CloudWatch logs for errors
- Verify data consistency between PostgreSQL and DynamoDB
- Test rollback (disable DynamoDB writes)

**Deliverables:**

- ✅ Dual-write implemented in main API
- ✅ Error handling for DynamoDB failures
- ✅ Deployed to dev environment
- ✅ Data consistency verified
- ✅ Rollback tested

---

## Phase 4: Data Migration (Week 4)

### Objectives

- Migrate historical data from PostgreSQL to DynamoDB
- Verify data integrity
- No user-facing changes

### Tasks

**Day 1-2: Write Migration Script**

```typescript
// scripts/migrate-images-to-dynamodb.ts
import { db } from '../apps/api/lego-api-serverless/src/lib/db/client'
import { galleryImages } from '../apps/api/lego-api-serverless/src/lib/db/schema'
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { createLogger } from '../apps/api/lego-api-serverless/src/lib/utils/logger'

const logger = createLogger('migration')
const dynamodb = new DynamoDBClient({})

async function migrateImages() {
  logger.info('Starting image migration...')

  // Fetch all images from PostgreSQL
  const images = await db.select().from(galleryImages)
  logger.info({ count: images.length }, 'Fetched images from PostgreSQL')

  // Batch write to DynamoDB (25 items at a time)
  for (let i = 0; i < images.length; i += 25) {
    const batch = images.slice(i, i + 25)

    const putRequests = batch.map(img => ({
      PutRequest: {
        Item: {
          PK: { S: `IMAGE#${img.id}` },
          SK: { S: 'METADATA' },
          GSI1PK: { S: `USER#${img.userId}` },
          GSI1SK: { S: `UPLOADED#${img.createdAt.toISOString()}` },
          ...(img.albumId && {
            GSI2PK: { S: `ALBUM#${img.albumId}` },
            GSI2SK: { S: `UPLOADED#${img.createdAt.toISOString()}` },
          }),
          id: { S: img.id },
          userId: { S: img.userId },
          originalFilename: { S: img.originalFilename },
          mimeType: { S: img.mimeType },
          fileSize: { N: String(img.fileSize) },
          s3Key: { S: img.s3Key },
          thumbnailKey: { S: img.thumbnailKey || '' },
          imageUrl: { S: `https://d123xyz.cloudfront.net/${img.s3Key}` },
          thumbnailUrl: { S: `https://d123xyz.cloudfront.net/${img.thumbnailKey}` },
          processingStatus: { S: 'completed' },
          format: { S: 'webp' },
          quality: { N: '85' },
          createdAt: { S: img.createdAt.toISOString() },
          updatedAt: { S: img.updatedAt.toISOString() },
          uploadedAt: { S: img.createdAt.toISOString() },
          version: { N: '1' },
        },
      },
    }))

    await dynamodb.send(
      new BatchWriteItemCommand({
        RequestItems: {
          'ImageMetadata-dev': putRequests,
        },
      }),
    )

    logger.info({ migrated: i + batch.length, total: images.length }, 'Migration progress')

    // Rate limiting (avoid DynamoDB throttling)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info('Migration complete!')
}

migrateImages().catch(error => {
  logger.error({ err: error }, 'Migration failed')
  process.exit(1)
})
```

**Day 3: Run Migration**

```bash
# Dry run (log only, no writes)
DRY_RUN=true pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Actual migration to dev
STAGE=dev pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify data
pnpm tsx scripts/verify-migration.ts
```

**Day 4-5: Data Verification**

```typescript
// scripts/verify-migration.ts
import { db } from '../apps/api/lego-api-serverless/src/lib/db/client'
import { galleryImages } from '../apps/api/lego-api-serverless/src/lib/db/schema'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'

const logger = createLogger('verification')
const dynamodb = new DynamoDBClient({})

async function verifyMigration() {
  const images = await db.select().from(galleryImages)
  let mismatches = 0

  for (const pgImage of images) {
    const ddbResult = await dynamodb.send(
      new GetItemCommand({
        TableName: 'ImageMetadata-dev',
        Key: {
          PK: { S: `IMAGE#${pgImage.id}` },
          SK: { S: 'METADATA' },
        },
      }),
    )

    if (!ddbResult.Item) {
      logger.error({ imageId: pgImage.id }, 'Missing from DynamoDB')
      mismatches++
      continue
    }

    // Verify key fields match
    if (ddbResult.Item.userId.S !== pgImage.userId) {
      logger.error({ imageId: pgImage.id }, 'userId mismatch')
      mismatches++
    }

    if (ddbResult.Item.s3Key.S !== pgImage.s3Key) {
      logger.error({ imageId: pgImage.id }, 's3Key mismatch')
      mismatches++
    }
  }

  logger.info({ total: images.length, mismatches }, 'Verification complete')
  return mismatches === 0
}

verifyMigration().then(success => {
  process.exit(success ? 0 : 1)
})
```

**Deliverables:**

- ✅ Migration script tested
- ✅ Historical data migrated to DynamoDB
- ✅ Data integrity verified (100% match)
- ✅ Migration logs reviewed
- ✅ Rollback plan documented

---

## Phase 5: Cutover (Week 5)

### Objectives

- Switch reads to Image Service
- Monitor for errors
- Validate performance improvements
- Keep PostgreSQL writes for safety

### Tasks

**Day 1: Deploy to Staging**

```bash
# Deploy Image Service to staging
pnpm --filter image-service sst deploy --stage staging

# Run migration script for staging data
STAGE=staging pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify staging
pnpm tsx scripts/verify-migration.ts --stage staging
```

**Day 2: Cutover Reads (Gradual Rollout)**

```typescript
// Feature flag for gradual rollout
const USE_IMAGE_SERVICE = process.env.USE_IMAGE_SERVICE === 'true'

export async function getImage(imageId: string) {
  if (USE_IMAGE_SERVICE) {
    try {
      const response = await fetch(`https://images-staging.lego-api.com/images/${imageId}`, {
        headers: { Authorization: `Bearer ${getServiceToken()}` },
      })

      if (response.ok) {
        logger.info({ imageId }, 'Read from Image Service')
        return response.json()
      }
    } catch (error) {
      logger.error({ err: error, imageId }, 'Image Service read failed, falling back')
    }
  }

  // Fallback to PostgreSQL
  return getImageFromPostgres(imageId)
}
```

**Day 3-4: Gradual Rollout**

- Day 3: 10% of traffic to Image Service
- Day 3 PM: 50% of traffic
- Day 4 AM: 100% of traffic

**Monitor:**

- Latency (should drop from 300ms to <50ms)
- Error rate (should remain <0.1%)
- CloudFront cache hit rate (target >85%)

**Day 5: Deploy to Production**

```bash
# Deploy to production
pnpm --filter image-service sst deploy --stage production

# Migrate production data
STAGE=production pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify
pnpm tsx scripts/verify-migration.ts --stage production

# Enable Image Service reads (10% traffic)
kubectl set env deployment/lego-api USE_IMAGE_SERVICE=true ROLLOUT_PERCENTAGE=10
```

**Deliverables:**

- ✅ Staging cutover successful
- ✅ Production deployment complete
- ✅ 100% read traffic on Image Service
- ✅ Performance targets met
- ✅ Zero user-facing errors

---

## Phase 6: Cleanup & Optimization (Week 6)

### Objectives

- Stop writing to PostgreSQL
- Remove legacy code
- Optimize performance
- Archive old data

### Tasks

**Day 1-2: Stop PostgreSQL Writes**

```typescript
// Remove dual-write logic
export async function uploadImage(
  file: UploadedFile,
  userId: string,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  // Only write to Image Service now
  const response = await fetch('https://images.lego-api.com/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getServiceToken()}`,
      'Content-Type': 'multipart/form-data',
    },
    body: createFormData(file, options),
  })

  return response.json()
}
```

**Day 3: Remove Legacy Code**

```bash
# Remove gallery.ts Lambda (1,011 LOC)
git rm apps/api/lego-api-serverless/src/functions/gallery.ts

# Remove image-upload-service.ts
git rm apps/api/lego-api-serverless/src/lib/services/image-upload-service.ts

# Drop gallery_images table (after final backup)
# DO NOT RUN YET - keep for 30 days
# psql -c "DROP TABLE gallery_images CASCADE"
```

**Day 4-5: Performance Optimization**

- Implement Redis caching (if cache hit rate >50%)
- Enable CloudFront compression
- Tune Lambda memory sizes based on metrics
- Implement async thumbnail generation (if P95 upload >1s)

**Deliverables:**

- ✅ PostgreSQL writes stopped
- ✅ Legacy code removed
- ✅ Performance optimizations deployed
- ✅ Documentation updated
- ✅ Final metrics report

---

## Rollback Strategy

### Rollback During Phase 3 (Dual-Write)

**Trigger:** DynamoDB write failures >5%

**Steps:**

1. Disable DynamoDB writes via feature flag
2. Keep PostgreSQL as source of truth
3. Investigate DynamoDB errors
4. Fix and re-enable

**Impact:** Zero - PostgreSQL still serving all reads

---

### Rollback During Phase 5 (Cutover)

**Trigger:** Error rate >0.5% OR P95 latency >500ms

**Steps:**

```bash
# Immediately switch reads back to PostgreSQL
kubectl set env deployment/lego-api USE_IMAGE_SERVICE=false

# Rollback takes effect in <30 seconds (pod restart)
```

**Impact:** Minor - 30-second window of elevated latency

---

### Rollback After Phase 6 (Cleanup)

**Trigger:** Critical data loss or corruption

**Steps:**

1. Re-enable PostgreSQL writes
2. Re-run migration script (DynamoDB → PostgreSQL)
3. Verify data integrity
4. Switch reads back to PostgreSQL

**Impact:** High - Requires full data migration (2-4 hours)

**Prevention:** Keep PostgreSQL table for 30 days after cleanup

---

## Data Consistency Verification

### Automated Checks

```typescript
// Run hourly during Phase 3-4
async function verifyDataConsistency() {
  const recentImages = await db
    .select()
    .from(galleryImages)
    .where(gte(galleryImages.createdAt, new Date(Date.now() - 3600000))) // Last hour

  for (const pgImage of recentImages) {
    const ddbImage = await getImageFromDynamoDB(pgImage.id)

    if (!ddbImage) {
      logger.error({ imageId: pgImage.id }, 'Missing from DynamoDB')
      continue
    }

    // Verify critical fields
    const mismatch = []
    if (ddbImage.userId !== pgImage.userId) mismatch.push('userId')
    if (ddbImage.s3Key !== pgImage.s3Key) mismatch.push('s3Key')
    if (ddbImage.originalFilename !== pgImage.originalFilename) mismatch.push('filename')

    if (mismatch.length > 0) {
      logger.error({ imageId: pgImage.id, mismatch }, 'Data mismatch detected')
    }
  }
}
```

---

## Success Criteria

### Phase 1 (Infrastructure)

- ✅ All AWS resources deployed
- ✅ API Gateway endpoints responding
- ✅ CloudWatch alarms active

### Phase 2 (Implementation)

- ✅ All Lambda handlers implemented
- ✅ Test coverage >90%
- ✅ Integration tests passing

### Phase 3 (Dual-Write)

- ✅ Dual-write active for 7 days
- ✅ Data consistency >99.9%
- ✅ Zero user-facing errors

### Phase 4 (Migration)

- ✅ 100% historical data migrated
- ✅ Data verification passed
- ✅ Migration logs reviewed

### Phase 5 (Cutover)

- ✅ P95 read latency <50ms
- ✅ Error rate <0.1%
- ✅ CloudFront cache hit rate >85%

### Phase 6 (Cleanup)

- ✅ PostgreSQL writes stopped
- ✅ Legacy code removed
- ✅ Performance targets met

---

## Risk Mitigation

| Risk                           | Probability | Impact   | Mitigation                                            |
| ------------------------------ | ----------- | -------- | ----------------------------------------------------- |
| **DynamoDB throttling**        | Medium      | High     | Use on-demand capacity, implement exponential backoff |
| **Data loss during migration** | Low         | Critical | Run verification scripts, keep PostgreSQL backup      |
| **Performance regression**     | Low         | High     | Monitor P95 latency, rollback if >500ms               |
| **S3 upload failures**         | Medium      | Medium   | Implement idempotency, retry logic                    |
| **CloudFront cache misses**    | Medium      | Low      | Pre-warm cache, optimize TTL                          |
| **Lambda cold starts**         | High        | Medium   | Monitor, consider provisioned concurrency             |

---

## Communication Plan

**Week 1-2:** Internal team only (no user communication)
**Week 3-4:** Notify QA team of dual-write testing
**Week 5:** Announce staging cutover to internal users
**Week 5 (Day 5):** Announce production cutover (email to all users)
**Week 6:** Post-migration report to stakeholders

---

## Next Steps

1. Review [06-performance-optimization.md](./06-performance-optimization.md) - Optimization opportunities
2. Review [09-monitoring.md](./09-monitoring.md) - Observability setup
3. Review [10-implementation-phases.md](./10-implementation-phases.md) - Detailed task breakdown

---

[← Back to Infrastructure](./04-infrastructure.md) | [Next: Performance Optimization →](./06-performance-optimization.md)
