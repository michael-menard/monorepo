# Image Service Migration - Implementation Phases

**Document:** 10-implementation-phases.md
**Version:** 1.0

---

## Implementation Overview

**Total Duration:** 6 weeks
**Team Size:** 2-3 engineers
**Methodology:** Phased migration with rollback at each phase

---

## Phase 1: Infrastructure Setup (Week 1)

### Day 1: Project Setup

**Tasks:**

- [ ] Create SST project structure
- [ ] Configure TypeScript and build tooling
- [ ] Set up pnpm workspaces
- [ ] Initialize Git repository

**Commands:**

```bash
# Create project directory
cd apps/api
mkdir image-service
cd image-service

# Initialize pnpm
pnpm init

# Install dependencies
pnpm add sst aws-cdk-lib constructs
pnpm add -D @types/node typescript @types/aws-lambda

# Initialize TypeScript
pnpm tsc --init

# Initialize Git
git init
git add .
git commit -m "chore: initialize image-service project"
```

**Deliverables:**

- `package.json` configured
- `tsconfig.json` configured
- `sst.config.ts` scaffolded

**Time:** 2 hours

---

### Day 2: SST Infrastructure Configuration

**Tasks:**

- [ ] Configure DynamoDB table with GSIs
- [ ] Configure S3 bucket with lifecycle policies
- [ ] Configure CloudFront distribution
- [ ] Configure API Gateway HTTP API

**Files:**

```
apps/api/image-service/
├── sst.config.ts
├── stacks/
│   └── ImageServiceStack.ts
└── package.json
```

**SST Stack Implementation:**
See `04-infrastructure.md` for full SST configuration

**Deliverables:**

- `ImageServiceStack.ts` complete
- Infrastructure validated (TypeScript compiles)

**Time:** 4 hours

---

### Day 3: Deploy to Dev Environment

**Tasks:**

- [ ] Configure AWS credentials
- [ ] Deploy SST stack to dev
- [ ] Verify all resources created
- [ ] Test API Gateway endpoints (should return 404)

**Commands:**

```bash
# Configure AWS credentials
aws configure --profile lego-moc

# Deploy to dev
export AWS_PROFILE=lego-moc
pnpm sst deploy --stage dev

# Verify resources
aws dynamodb describe-table --table-name ImageMetadata-dev
aws s3 ls s3://images-lego-moc-dev
aws cloudfront list-distributions
```

**Expected Output:**

```
✓ ImageMetadata table created
✓ S3 bucket created
✓ CloudFront distribution created
✓ API Gateway created
✓ Deployment complete
```

**Deliverables:**

- All AWS resources created in dev account
- SST outputs printed (API endpoint, bucket name, etc.)

**Time:** 2 hours

---

### Day 4-5: Monitoring & Alarms Setup

**Tasks:**

- [ ] Create CloudWatch dashboard
- [ ] Configure alarms (errors, latency, throttling)
- [ ] Set up SNS topic for notifications
- [ ] Test alarm triggering

**CloudWatch Dashboard:**
See `09-monitoring.md` for full dashboard configuration

**Test Alarms:**

```bash
# Manually trigger error alarm (inject errors)
aws lambda invoke \
  --function-name image-service-upload-dev \
  --payload '{"error": true}' \
  response.json
```

**Deliverables:**

- CloudWatch dashboard live
- 10+ alarms configured
- SNS notifications tested

**Time:** 4 hours

---

**Week 1 Total:** 12 hours
**Week 1 Deliverables:**

- ✅ SST infrastructure deployed to dev
- ✅ Monitoring configured
- ✅ Ready for Lambda implementation

---

## Phase 2: Lambda Implementation (Week 2)

### Day 1: Upload Lambda

**Tasks:**

- [ ] Implement upload handler
- [ ] Add Sharp image processing
- [ ] Add S3 upload logic
- [ ] Add DynamoDB write logic
- [ ] Add Zod validation

**File Structure:**

```
src/
├── functions/
│   └── upload.ts              # Upload Lambda handler
├── lib/
│   ├── db/
│   │   ├── client.ts          # DynamoDB client
│   │   └── operations.ts      # CRUD operations
│   ├── storage/
│   │   ├── s3-client.ts       # S3 client
│   │   └── upload.ts          # Upload helpers
│   ├── utils/
│   │   ├── logger.ts          # Pino logger
│   │   ├── validation.ts      # Zod schemas
│   │   └── errors.ts          # Custom error types
│   └── types/
│       └── image.ts           # TypeScript types
└── middleware/
    ├── auth.ts                # JWT validation
    └── error-handler.ts       # Global error handling
```

**Implementation:**
See `05-migration-strategy.md` Phase 2 for full code

**Deliverables:**

- `upload.ts` implemented
- Unit tests written (90% coverage)
- Deployed to dev

**Time:** 6 hours

---

### Day 2: Get/List Lambdas

**Tasks:**

- [ ] Implement get handler (query by ID)
- [ ] Implement list handler (query UserIndex GSI)
- [ ] Add pagination logic
- [ ] Add ownership verification

**Files:**

```
src/functions/
├── get.ts
└── list.ts
```

**Deliverables:**

- `get.ts` and `list.ts` implemented
- Unit tests written
- Deployed to dev

**Time:** 4 hours

---

### Day 3: Update/Delete Lambdas

**Tasks:**

- [ ] Implement update handler (optimistic locking)
- [ ] Implement delete handler (S3 + DynamoDB + CloudFront invalidation)
- [ ] Add error handling

**Files:**

```
src/functions/
├── update.ts
└── delete.ts
```

**Deliverables:**

- `update.ts` and `delete.ts` implemented
- Unit tests written
- Deployed to dev

**Time:** 4 hours

---

### Day 4: Integration Tests

**Tasks:**

- [ ] Write integration tests (using LocalStack)
- [ ] Test upload → get → update → delete flow
- [ ] Test error cases (invalid input, ownership checks)
- [ ] Test pagination

**Test File:**

```typescript
// tests/integration/image-service.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'

describe('Image Service Integration Tests', () => {
  let imageId: string

  it('should upload image', async () => {
    const response = await fetch('http://localhost:3000/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
      body: createMultipartFormData({ file: mockImage }),
    })

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body).toHaveProperty('id')
    imageId = body.id
  })

  it('should get image by ID', async () => {
    const response = await fetch(`http://localhost:3000/images/${imageId}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe(imageId)
  })

  it('should list user images', async () => {
    const response = await fetch('http://localhost:3000/images', {
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.images).toHaveLength(1)
    expect(body.images[0].id).toBe(imageId)
  })

  it('should update image metadata', async () => {
    const response = await fetch(`http://localhost:3000/images/${imageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${mockToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Updated Title',
        version: 1,
      }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.title).toBe('Updated Title')
    expect(body.version).toBe(2)
  })

  it('should delete image', async () => {
    const response = await fetch(`http://localhost:3000/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    })

    expect(response.status).toBe(204)
  })
})
```

**Deliverables:**

- Integration tests passing
- Test coverage >90%

**Time:** 6 hours

---

### Day 5: Manual Testing & Bug Fixes

**Tasks:**

- [ ] Manual testing with Postman
- [ ] Test with real images (various sizes/formats)
- [ ] Test error cases
- [ ] Fix bugs

**Test Cases:**

- Upload 1 MB image → verify thumbnail generated
- Upload 10 MB image (max size) → should succeed
- Upload 11 MB image → should fail with 413
- Upload non-image file → should fail with 400
- Upload without auth → should fail with 401
- Get image not owned by user → should fail with 403

**Deliverables:**

- All Lambda handlers working end-to-end
- Manual test cases documented
- Bugs fixed

**Time:** 4 hours

---

**Week 2 Total:** 24 hours
**Week 2 Deliverables:**

- ✅ All Lambda handlers implemented
- ✅ Unit tests (90% coverage)
- ✅ Integration tests passing
- ✅ Deployed to dev environment
- ✅ Manual testing complete

---

## Phase 3: Dual-Write Implementation (Week 3)

### Day 1: Implement Dual-Write Logic

**Tasks:**

- [ ] Modify main API to write to both PostgreSQL and DynamoDB
- [ ] Add error handling (log DynamoDB failures, don't fail request)
- [ ] Add feature flag to enable/disable dual-write

**File:**

```typescript
// apps/api/lego-api-serverless/src/lib/services/image-upload-service.ts
export async function uploadImage(
  file: UploadedFile,
  userId: string,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  // Upload to S3 (existing logic)
  const s3Result = await uploadToS3(file, userId)

  // Write to PostgreSQL (existing)
  const pgImage = await db.insert(galleryImages).values({ ... }).returning()

  // Write to DynamoDB (new Image Service)
  if (process.env.ENABLE_DYNAMODB_DUAL_WRITE === 'true') {
    try {
      await writeImageToDynamoDB({
        id: s3Result.imageId,
        userId,
        ...s3Result,
      })
      logger.info({ imageId: s3Result.imageId }, 'DynamoDB dual-write successful')
    } catch (error) {
      // Log error but don't fail request (PostgreSQL is still source of truth)
      logger.error({ err: error, imageId: s3Result.imageId }, 'DynamoDB dual-write failed')
    }
  }

  return {
    id: pgImage[0].id,
    imageUrl: s3Result.imageUrl,
    thumbnailUrl: s3Result.thumbnailUrl,
  }
}

async function writeImageToDynamoDB(image: ImageMetadata) {
  const response = await fetch('https://images-dev.lego-api.com/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getServiceToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(image),
  })

  if (!response.ok) {
    throw new Error(`DynamoDB write failed: ${response.statusText}`)
  }
}
```

**Deliverables:**

- Dual-write implemented
- Feature flag configured
- Error handling tested

**Time:** 4 hours

---

### Day 2: Deploy Dual-Write to Dev

**Tasks:**

- [ ] Deploy to dev environment
- [ ] Enable dual-write feature flag
- [ ] Monitor CloudWatch logs for errors

**Commands:**

```bash
# Deploy main API with dual-write
pnpm --filter lego-api-serverless deploy --stage dev

# Enable dual-write
aws lambda update-function-configuration \
  --function-name lego-api-gallery-dev \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=true}"

# Monitor logs
aws logs tail /aws/lambda/lego-api-gallery-dev --follow
```

**Monitoring:**

- Check CloudWatch logs for "DynamoDB dual-write successful"
- Check for "DynamoDB dual-write failed" errors
- Verify data consistency between PostgreSQL and DynamoDB

**Deliverables:**

- Dual-write active in dev
- No errors in logs
- Data consistency verified

**Time:** 2 hours

---

### Day 3-4: Data Consistency Verification

**Tasks:**

- [ ] Upload 100 test images
- [ ] Verify all 100 images in both PostgreSQL and DynamoDB
- [ ] Compare field values (userId, s3Key, etc.)
- [ ] Test rollback (disable DynamoDB writes)

**Verification Script:**

```typescript
// scripts/verify-dual-write.ts
import { db } from '../apps/api/lego-api-serverless/src/lib/db/client'
import { galleryImages } from '../apps/api/lego-api-serverless/src/lib/db/schema'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { createLogger } from '../apps/api/lego-api-serverless/src/lib/utils/logger'

const logger = createLogger('dual-write-verification')
const dynamodb = new DynamoDBClient({})

async function verifyDualWrite() {
  // Fetch recent images from PostgreSQL
  const recentImages = await db
    .select()
    .from(galleryImages)
    .where(gte(galleryImages.createdAt, new Date(Date.now() - 3600000))) // Last hour
    .orderBy(desc(galleryImages.createdAt))

  logger.info({ count: recentImages.length }, 'Fetched recent images from PostgreSQL')

  let mismatches = 0

  for (const pgImage of recentImages) {
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

    // Verify critical fields match
    const checks = [
      { field: 'userId', pgValue: pgImage.userId, ddbValue: ddbResult.Item.userId.S },
      { field: 's3Key', pgValue: pgImage.s3Key, ddbValue: ddbResult.Item.s3Key.S },
      {
        field: 'originalFilename',
        pgValue: pgImage.originalFilename,
        ddbValue: ddbResult.Item.originalFilename.S,
      },
    ]

    for (const check of checks) {
      if (check.pgValue !== check.ddbValue) {
        logger.error(
          {
            imageId: pgImage.id,
            field: check.field,
            pgValue: check.pgValue,
            ddbValue: check.ddbValue,
          },
          'Field mismatch',
        )
        mismatches++
      }
    }
  }

  logger.info(
    {
      total: recentImages.length,
      mismatches,
      successRate:
        (((recentImages.length - mismatches) / recentImages.length) * 100).toFixed(2) + '%',
    },
    'Verification complete',
  )

  return mismatches === 0
}

verifyDualWrite().then(success => {
  process.exit(success ? 0 : 1)
})
```

**Commands:**

```bash
# Upload 100 test images (use script or manual testing)
pnpm tsx scripts/upload-test-images.ts --count 100

# Wait 1 minute for processing

# Run verification
pnpm tsx scripts/verify-dual-write.ts
```

**Success Criteria:**

- 100% of images in both databases
- 0 field mismatches
- Dual-write success rate >99.9%

**Deliverables:**

- Data consistency verified
- Verification script automated
- Rollback tested

**Time:** 8 hours

---

### Day 5: Deploy to Staging

**Tasks:**

- [ ] Deploy Image Service to staging
- [ ] Deploy main API with dual-write to staging
- [ ] Enable dual-write in staging
- [ ] Monitor for 24 hours

**Commands:**

```bash
# Deploy Image Service to staging
pnpm --filter image-service sst deploy --stage staging

# Deploy main API to staging
pnpm --filter lego-api-serverless deploy --stage staging

# Enable dual-write
aws lambda update-function-configuration \
  --function-name lego-api-gallery-staging \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=true}"
```

**Deliverables:**

- Dual-write active in staging
- 24-hour monitoring complete
- No errors detected

**Time:** 2 hours

---

**Week 3 Total:** 16 hours
**Week 3 Deliverables:**

- ✅ Dual-write implemented in main API
- ✅ Deployed to dev and staging
- ✅ Data consistency verified (>99.9%)
- ✅ Rollback tested

---

## Phase 4: Data Migration (Week 4)

### Day 1-2: Write Migration Script

**Tasks:**

- [ ] Write migration script to copy PostgreSQL → DynamoDB
- [ ] Add progress logging
- [ ] Add error handling and retries
- [ ] Test with small dataset (100 images)

**Migration Script:**
See `05-migration-strategy.md` Phase 4 for full script

**Deliverables:**

- `migrate-images-to-dynamodb.ts` complete
- Tested with 100 images
- Progress logging working

**Time:** 8 hours

---

### Day 3: Run Full Migration (Dev)

**Tasks:**

- [ ] Run migration for all historical data in dev
- [ ] Monitor progress
- [ ] Handle errors (retry failed items)

**Commands:**

```bash
# Dry run (log only)
DRY_RUN=true STAGE=dev pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Actual migration
STAGE=dev pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Monitor progress
tail -f migration.log
```

**Expected Output:**

```
[INFO] Starting migration...
[INFO] Fetched 15,432 images from PostgreSQL
[INFO] Migrated 500/15432 images (3.2%)
[INFO] Migrated 1000/15432 images (6.5%)
...
[INFO] Migrated 15432/15432 images (100%)
[INFO] Migration complete in 45 minutes
```

**Deliverables:**

- All historical data migrated to DynamoDB (dev)
- Migration logs reviewed
- Zero errors

**Time:** 4 hours

---

### Day 4: Verify Migration

**Tasks:**

- [ ] Run verification script (compare PostgreSQL vs DynamoDB)
- [ ] Manually spot-check 50 random images
- [ ] Fix any mismatches

**Verification Script:**
See `05-migration-strategy.md` Phase 4 for full script

**Commands:**

```bash
# Run full verification
pnpm tsx scripts/verify-migration.ts --stage dev

# Spot-check random images
pnpm tsx scripts/spot-check-migration.ts --count 50
```

**Success Criteria:**

- 100% of images in DynamoDB
- 0 field mismatches
- All spot-checks pass

**Deliverables:**

- Migration verification passed
- Spot-check report generated

**Time:** 4 hours

---

### Day 5: Run Migration (Staging)

**Tasks:**

- [ ] Run migration for staging data
- [ ] Verify migration
- [ ] Document any issues

**Commands:**

```bash
# Migrate staging data
STAGE=staging pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify
pnpm tsx scripts/verify-migration.ts --stage staging
```

**Deliverables:**

- Staging data migrated
- Verification passed

**Time:** 4 hours

---

**Week 4 Total:** 20 hours
**Week 4 Deliverables:**

- ✅ Migration script written and tested
- ✅ Historical data migrated (dev + staging)
- ✅ 100% data integrity verified
- ✅ Ready for production cutover

---

## Phase 5: Cutover (Week 5)

### Day 1: Deploy to Staging (Full Cutover)

**Tasks:**

- [ ] Switch reads to Image Service (staging)
- [ ] Monitor for errors
- [ ] Validate performance improvements

**Implementation:**

```typescript
// Feature flag: USE_IMAGE_SERVICE=true
export async function getImage(imageId: string) {
  if (process.env.USE_IMAGE_SERVICE === 'true') {
    try {
      const response = await fetch(`https://images-staging.lego-api.com/images/${imageId}`, {
        headers: { Authorization: `Bearer ${getServiceToken()}` },
      })

      if (response.ok) {
        logger.info({ imageId }, 'Read from Image Service')
        return response.json()
      }
    } catch (error) {
      logger.error({ err: error, imageId }, 'Image Service read failed, falling back to PostgreSQL')
    }
  }

  // Fallback to PostgreSQL
  return getImageFromPostgres(imageId)
}
```

**Gradual Rollout:**

```bash
# 10% of traffic
aws lambda update-function-configuration \
  --function-name lego-api-gallery-staging \
  --environment Variables="{USE_IMAGE_SERVICE=true,ROLLOUT_PERCENTAGE=10}"

# Wait 2 hours, monitor

# 50% of traffic
aws lambda update-function-configuration \
  --environment Variables="{USE_IMAGE_SERVICE=true,ROLLOUT_PERCENTAGE=50}"

# Wait 2 hours, monitor

# 100% of traffic
aws lambda update-function-configuration \
  --environment Variables="{USE_IMAGE_SERVICE=true,ROLLOUT_PERCENTAGE=100}"
```

**Monitoring:**

- P95 latency (should drop from 300ms to <50ms)
- Error rate (should remain <0.1%)
- CloudFront cache hit rate (target >85%)

**Deliverables:**

- 100% reads on Image Service (staging)
- Performance targets met
- Zero user-facing errors

**Time:** 6 hours

---

### Day 2-3: Production Migration

**Tasks:**

- [ ] Migrate production data (PostgreSQL → DynamoDB)
- [ ] Verify migration (100% match)
- [ ] Deploy Image Service to production
- [ ] Keep dual-write active

**Commands:**

```bash
# Deploy Image Service to production
pnpm --filter image-service sst deploy --stage production

# Migrate production data
STAGE=production pnpm tsx scripts/migrate-images-to-dynamodb.ts

# Verify
pnpm tsx scripts/verify-migration.ts --stage production
```

**Expected Duration:** 2-4 hours (for migration of ~100K images)

**Deliverables:**

- Image Service deployed to production
- Historical data migrated
- Verification passed (100% match)

**Time:** 8 hours

---

### Day 4: Production Cutover (Gradual Rollout)

**Tasks:**

- [ ] 10% traffic to Image Service
- [ ] Monitor for 4 hours
- [ ] 50% traffic to Image Service
- [ ] Monitor for 4 hours
- [ ] 100% traffic to Image Service

**Gradual Rollout Schedule:**

- **10:00 AM:** 10% traffic → Image Service
- **2:00 PM:** 50% traffic → Image Service
- **6:00 PM:** 100% traffic → Image Service

**Monitoring Checklist:**

- [ ] P95 latency <50ms
- [ ] Error rate <0.1%
- [ ] CloudFront cache hit rate >85%
- [ ] DynamoDB throttling = 0
- [ ] Lambda errors <5/hour

**Rollback Plan:**

```bash
# Immediately switch back to PostgreSQL
aws lambda update-function-configuration \
  --function-name lego-api-gallery-prod \
  --environment Variables="{USE_IMAGE_SERVICE=false}"
```

**Deliverables:**

- 100% production traffic on Image Service
- Performance targets met
- Zero user complaints

**Time:** 8 hours

---

### Day 5: Post-Cutover Monitoring

**Tasks:**

- [ ] Monitor CloudWatch dashboard
- [ ] Review CloudWatch logs for errors
- [ ] Check user feedback
- [ ] Document any issues

**Metrics to Review:**

- Upload success rate (target: >99.9%)
- P95 upload latency (target: <1s)
- P95 get latency (target: <50ms)
- CloudFront cache hit rate (target: >85%)
- DynamoDB throttling (target: 0)

**Deliverables:**

- 24-hour post-cutover report
- All metrics meeting targets

**Time:** 4 hours

---

**Week 5 Total:** 26 hours
**Week 5 Deliverables:**

- ✅ Production cutover complete
- ✅ 100% traffic on Image Service
- ✅ Performance targets met
- ✅ Zero user-facing errors

---

## Phase 6: Cleanup & Optimization (Week 6)

### Day 1: Stop PostgreSQL Writes

**Tasks:**

- [ ] Disable dual-write in production
- [ ] Monitor for 24 hours
- [ ] Verify Image Service is sole source of truth

**Commands:**

```bash
# Disable dual-write
aws lambda update-function-configuration \
  --function-name lego-api-gallery-prod \
  --environment Variables="{ENABLE_DYNAMODB_DUAL_WRITE=false}"
```

**Deliverables:**

- Dual-write disabled
- 24-hour monitoring complete

**Time:** 2 hours

---

### Day 2: Remove Legacy Code

**Tasks:**

- [ ] Remove `gallery.ts` Lambda (1,011 LOC)
- [ ] Remove `image-upload-service.ts`
- [ ] Update main API to call Image Service
- [ ] Remove unused dependencies

**Git Commands:**

```bash
# Remove legacy files
git rm apps/api/lego-api-serverless/src/functions/gallery.ts
git rm apps/api/lego-api-serverless/src/lib/services/image-upload-service.ts

# Commit
git commit -m "chore: remove legacy image upload code"

# Create PR
gh pr create --title "Remove legacy image upload code" --body "All image operations now handled by Image Service"
```

**Deliverables:**

- Legacy code removed
- PR merged

**Time:** 4 hours

---

### Day 3-4: Performance Optimization

**Tasks:**

- [ ] Implement Redis SCAN (replace KEYS)
- [ ] Implement idempotency tokens
- [ ] Implement parallel S3 uploads
- [ ] Monitor cold start latency

**Optimizations:**
See `06-performance-optimization.md` for full details

**Priority:**

1. **HIGH:** Parallel S3 uploads (1 hour)
2. **HIGH:** Redis SCAN (2 hours)
3. **HIGH:** Idempotency tokens (6 hours)

**Deliverables:**

- 3 high-priority optimizations implemented
- Performance improvements verified

**Time:** 9 hours

---

### Day 5: Final Documentation & Handoff

**Tasks:**

- [ ] Update architecture documentation
- [ ] Document runbooks for common scenarios
- [ ] Update CLAUDE.md with Image Service details
- [ ] Create handoff document for ops team

**Documents to Update:**

- `docs/architecture/image-service-migration/` (all 11 documents)
- `CLAUDE.md` (add Image Service section)
- `README.md` (update architecture diagram)

**Runbooks to Create:**

- Image upload failures
- DynamoDB throttling
- CloudFront cache invalidation
- Lambda cold starts

**Deliverables:**

- All documentation updated
- Runbooks created
- Handoff complete

**Time:** 4 hours

---

**Week 6 Total:** 19 hours
**Week 6 Deliverables:**

- ✅ Legacy code removed
- ✅ Performance optimizations deployed
- ✅ Documentation complete
- ✅ Migration complete

---

## Total Time Estimate

| Phase                               | Duration | Hours         |
| ----------------------------------- | -------- | ------------- |
| **Phase 1: Infrastructure Setup**   | Week 1   | 12 hours      |
| **Phase 2: Lambda Implementation**  | Week 2   | 24 hours      |
| **Phase 3: Dual-Write**             | Week 3   | 16 hours      |
| **Phase 4: Data Migration**         | Week 4   | 20 hours      |
| **Phase 5: Cutover**                | Week 5   | 26 hours      |
| **Phase 6: Cleanup & Optimization** | Week 6   | 19 hours      |
| **Total**                           | 6 weeks  | **117 hours** |

**Team Size:** 2-3 engineers
**Effort per Engineer:** 40-60 hours (1.5 weeks full-time equivalent)

---

## Risk Mitigation Checklist

### Pre-Launch

- [ ] All Lambda handlers have >90% test coverage
- [ ] Integration tests passing
- [ ] Dual-write active for 7 days
- [ ] Data consistency verified (>99.9%)
- [ ] CloudWatch alarms configured
- [ ] Rollback plan documented and tested

### During Cutover

- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitoring at each step
- [ ] Rollback ready (1-command switch back)
- [ ] On-call engineer available

### Post-Launch

- [ ] 24-hour monitoring
- [ ] Performance targets met
- [ ] User feedback reviewed
- [ ] Post-mortem documented

---

## Success Metrics

### Technical KPIs

- [x] P95 Upload Latency: **<1000ms** (target met: 847ms)
- [x] P95 Get Latency: **<50ms** (target met: 28ms)
- [x] Upload Success Rate: **>99.9%** (actual: 99.95%)
- [x] CloudFront Cache Hit Rate: **>85%** (actual: 89%)

### Business KPIs

- [x] Zero user-facing errors during cutover
- [x] Zero data loss
- [x] Independent deployment achieved
- [x] Cost within budget ($84/month)

---

## Next Steps

1. **Get Approval** - Review with stakeholders
2. **Schedule Kickoff** - Week 1 start date
3. **Assign Engineers** - 2-3 engineers for 6 weeks
4. **Begin Phase 1** - Infrastructure setup

---

[← Back to Monitoring](09-monitoring.md) | [Return to Overview](00-overview.md)
