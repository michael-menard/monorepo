# Image Service Migration - Performance Optimization

**Document:** 06-performance-optimization.md
**Version:** 1.0

---

## Optimization Overview

This document outlines **6 performance optimization opportunities** identified during architectural review. These optimizations are **not required for Phase 1** but should be considered if scale or performance targets are not met.

---

## Optimization 1: Replace `redis.keys()` with `SCAN` or Cache Tag Sets

### Problem

Current implementation uses `redis.keys()` for cache invalidation:

```typescript
// ❌ Current (blocking, O(N) operation)
const pattern = `gallery:images:user:${userId}:*`
const keys = await redis.keys(pattern)
if (keys.length > 0) {
  await redis.del(...keys)
}
```

**Issues:**

- Blocks Redis event loop (O(N) where N = total keys)
- Can cause latency spikes for other operations
- Inefficient for large key counts (>10,000)

---

### Solution A: Use `SCAN` Command

```typescript
// ✅ Non-blocking, cursor-based iteration
async function invalidateCachePattern(pattern: string) {
  let cursor = '0'
  const keysToDelete: string[] = []

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = newCursor
    keysToDelete.push(...keys)
  } while (cursor !== '0')

  if (keysToDelete.length > 0) {
    await redis.del(...keysToDelete)
  }
}
```

**Benefits:**

- Non-blocking (doesn't freeze Redis)
- Handles large key counts gracefully
- Production-safe

**Effort:** 2 hours
**Priority:** **HIGH** (prevents production issues)

---

### Solution B: Cache Tag Sets

```typescript
// ✅ Track cache keys in a Set for O(1) invalidation
async function cacheWithTags(key: string, value: any, tags: string[]) {
  // Store the value
  await redis.setex(key, 3600, JSON.stringify(value))

  // Add key to each tag's set
  for (const tag of tags) {
    await redis.sadd(`tag:${tag}`, key)
  }
}

async function invalidateByTag(tag: string) {
  // Get all keys with this tag (O(N) where N = keys with tag, not all keys)
  const keys = await redis.smembers(`tag:${tag}`)

  if (keys.length > 0) {
    // Delete keys and tag set
    await redis.del(...keys, `tag:${tag}`)
  }
}

// Usage
await cacheWithTags(`image:${imageId}`, imageData, [`user:${userId}`, `album:${albumId}`])

// Invalidate all images for user
await invalidateByTag(`user:${userId}`)
```

**Benefits:**

- O(N) where N = keys with tag (not all keys)
- Faster invalidation
- Better control over cache expiration

**Effort:** 4 hours
**Priority:** **HIGH**

---

## Optimization 2: Async Thumbnail Generation

### Problem

Current implementation generates thumbnails synchronously during upload:

```typescript
// ❌ Current (blocks upload response)
const processed = await sharp(file.buffer).webp().toBuffer()
const thumbnail = await sharp(file.buffer).resize(400, 400).toBuffer()

await Promise.all([uploadToS3(imageKey, processed), uploadToS3(thumbnailKey, thumbnail)])
```

**Impact:** Adds 200-400ms to P95 upload latency

---

### Solution: Async Thumbnail Processing

```typescript
// ✅ Upload main image immediately, generate thumbnail async
const processed = await sharp(file.buffer).webp().toBuffer()

// Upload main image
const imageUrl = await uploadToS3(imageKey, processed)

// Save metadata (with placeholder thumbnail)
await saveImageMetadata({
  ...metadata,
  processingStatus: 'processing',
  thumbnailUrl: null,
})

// Trigger async thumbnail generation (SQS + Lambda)
await sqs.sendMessage({
  QueueUrl: process.env.THUMBNAIL_QUEUE_URL,
  MessageBody: JSON.stringify({
    imageId,
    s3Key: imageKey,
  }),
})

// Return immediately
return { imageId, imageUrl, processingStatus: 'processing' }
```

**Thumbnail Lambda:**

```typescript
// Triggered by SQS
export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const { imageId, s3Key } = JSON.parse(record.body)

    // Download image from S3
    const image = await s3.getObject({ Bucket, Key: s3Key })

    // Generate thumbnail
    const thumbnail = await sharp(image.Body)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer()

    // Upload thumbnail
    const thumbnailUrl = await uploadToS3(thumbnailKey, thumbnail)

    // Update metadata
    await dynamodb.updateItem({
      TableName: 'ImageMetadata',
      Key: { PK: `IMAGE#${imageId}`, SK: 'METADATA' },
      UpdateExpression: 'SET thumbnailUrl = :url, processingStatus = :status',
      ExpressionAttributeValues: {
        ':url': thumbnailUrl,
        ':status': 'completed',
      },
    })
  }
}
```

**Benefits:**

- Reduces P95 upload latency by 60% (2.5s → 1s)
- Better user experience (immediate feedback)
- Thumbnails processed in background

**Trade-offs:**

- Thumbnails not immediately available (1-5 second delay)
- Requires SQS queue + additional Lambda
- UI must handle `processingStatus` state

**Effort:** 8 hours
**Priority:** **MEDIUM** (only if P95 upload >1s)

---

## Optimization 3: Monitor Cold Start Latency, Consider Provisioned Concurrency

### Problem

Lambda cold starts can add 1-3 seconds latency to first request

**Cold Start Breakdown:**

- Runtime initialization: 500-800ms
- Code download: 200-500ms
- Sharp library load: 300-600ms
- **Total:** 1-3 seconds

---

### Solution A: Monitor Cold Starts

```typescript
// Add cold start detection
let isColdStart = true

export const handler = async (event: APIGatewayProxyHandlerV2) => {
  const startTime = Date.now()

  if (isColdStart) {
    logger.warn({ duration: Date.now() - startTime }, 'Cold start detected')
    isColdStart = false
  }

  // ... handler logic
}
```

**CloudWatch Metric Filter:**

```
[time, request_id, level=WARN, msg="Cold start detected", duration]
```

**CloudWatch Alarm:**

```typescript
new Alarm(stack, 'ColdStartAlarm', {
  metric: new Metric({
    namespace: 'ImageService',
    metricName: 'ColdStarts',
    statistic: 'Sum',
  }),
  threshold: 50, // More than 50 cold starts/hour
  evaluationPeriods: 1,
})
```

**Effort:** 2 hours
**Priority:** **MEDIUM**

---

### Solution B: Provisioned Concurrency (if cold starts >5%)

```typescript
// sst.config.ts
const uploadLambda = new Function(stack, 'UploadFunction', {
  // ... config
  cdk: {
    function: {
      provisionedConcurrentExecutions: stage === 'production' ? 5 : undefined,
    },
  },
})
```

**Benefits:**

- Eliminates cold starts for provisioned instances
- Predictable latency

**Trade-offs:**

- **Cost:** $20/month for 5 provisioned instances
- Still get cold starts above provisioned count

**Effort:** 1 hour
**Priority:** **LOW** (only if cold starts >5% of requests)

---

## Optimization 4: Verify Redis Connection Pooling Implementation

### Problem

Opening new Redis connection per Lambda invocation is slow (50-100ms)

---

### Solution: Implement Connection Reuse

```typescript
// ❌ Current (creates new connection per invocation)
export const handler = async event => {
  const redis = new Redis(process.env.REDIS_ENDPOINT)
  // ... use redis
  await redis.quit() // Connection closed
}
```

```typescript
// ✅ Optimized (reuse connection across invocations)
import Redis from 'ioredis'

let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_ENDPOINT,
      port: 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
      retryStrategy: times => {
        if (times > 3) return null // Stop retrying
        return Math.min(times * 50, 2000)
      },
    })

    // Ensure connected before first use
    redis.connect().catch(err => {
      logger.error({ err }, 'Redis connection failed')
      redis = null
    })
  }

  return redis
}

export const handler = async event => {
  const redis = getRedisClient()

  try {
    // Use redis
    const cached = await redis.get(`image:${imageId}`)
  } catch (error) {
    logger.error({ err: error }, 'Redis operation failed')
    // Continue without cache
  }

  // DO NOT call redis.quit() - keep connection alive
}
```

**Benefits:**

- Reduces Redis latency from 50-100ms to 1-5ms (after warmup)
- Better throughput

**Trade-offs:**

- Connection stays open (uses Redis connection slot)
- Must handle connection failures gracefully

**Effort:** 3 hours
**Priority:** **MEDIUM**

---

## Optimization 5: Add Idempotency for S3 Uploads to Prevent Orphans

### Problem

If Lambda fails after S3 upload but before DynamoDB write, orphaned files remain in S3:

```typescript
// ❌ Current (not idempotent)
const imageUrl = await uploadToS3(imageKey, buffer)
const thumbnailUrl = await uploadToS3(thumbnailKey, thumbnail)

// If this fails, orphaned files in S3
await dynamodb.putItem({ ... })
```

---

### Solution: Implement Idempotency Tokens

```typescript
// ✅ Idempotent upload with token tracking
import { ulid } from 'ulid'

export const handler = async event => {
  const uploadToken = event.headers['idempotency-token'] || ulid()
  const imageId = ulid()

  // 1. Check if upload already processed
  const existing = await dynamodb.getItem({
    TableName: 'PendingUploads',
    Key: {
      PK: { S: `TOKEN#${uploadToken}` },
      SK: { S: 'METADATA' },
    },
  })

  if (existing.Item) {
    logger.info({ uploadToken }, 'Duplicate upload request, returning existing result')
    return {
      statusCode: 200,
      body: JSON.stringify(existing.Item.result),
    }
  }

  // 2. Store pending upload token (with TTL)
  await dynamodb.putItem({
    TableName: 'PendingUploads',
    Item: {
      PK: { S: `TOKEN#${uploadToken}` },
      SK: { S: 'METADATA' },
      imageId: { S: imageId },
      status: { S: 'PENDING' },
      ttl: { N: String(Math.floor(Date.now() / 1000) + 3600) }, // Expire in 1 hour
    },
  })

  try {
    // 3. Upload to S3 (safe to retry - S3 PutObject is idempotent)
    const imageUrl = await uploadToS3(imageKey, buffer)
    const thumbnailUrl = await uploadToS3(thumbnailKey, thumbnail)

    // 4. Write metadata to DynamoDB atomically
    await dynamodb.transactWriteItems({
      TransactItems: [
        {
          Put: {
            TableName: 'ImageMetadata',
            Item: {
              PK: { S: `IMAGE#${imageId}` },
              SK: { S: 'METADATA' },
              // ... metadata
            },
          },
        },
        {
          Update: {
            TableName: 'PendingUploads',
            Key: {
              PK: { S: `TOKEN#${uploadToken}` },
              SK: { S: 'METADATA' },
            },
            UpdateExpression: 'SET #status = :status, #result = :result',
            ExpressionAttributeNames: {
              '#status': 'status',
              '#result': 'result',
            },
            ExpressionAttributeValues: {
              ':status': { S: 'COMPLETED' },
              ':result': { M: { imageId: { S: imageId }, imageUrl: { S: imageUrl } } },
            },
          },
        },
      ],
    })

    return {
      statusCode: 201,
      body: JSON.stringify({ imageId, imageUrl, thumbnailUrl }),
    }
  } catch (error) {
    // Mark as failed (client can retry with same token)
    await dynamodb.updateItem({
      TableName: 'PendingUploads',
      Key: {
        PK: { S: `TOKEN#${uploadToken}` },
        SK: { S: 'METADATA' },
      },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': { S: 'FAILED' } },
    })

    throw error
  }
}
```

**Benefits:**

- Prevents orphaned S3 files
- Safe retries (clients can retry failed uploads)
- No duplicate data

**Effort:** 6 hours
**Priority:** **HIGH** (prevents data corruption)

---

## Optimization 6: Parallel S3 Uploads for Speed Boosts

### Problem

Sequential S3 uploads slow down processing:

```typescript
// ❌ Current (sequential, 500-800ms total)
const imageUrl = await uploadToS3(imageKey, buffer) // 300-500ms
const thumbnailUrl = await uploadToS3(thumbnailKey, thumb) // 200-300ms
```

---

### Solution: Parallel Uploads

```typescript
// ✅ Parallel uploads (300-500ms total)
const [imageUrl, thumbnailUrl] = await Promise.all([
  uploadToS3({
    bucket: process.env.S3_BUCKET_NAME,
    key: `images/${userId}/${imageId}.webp`,
    body: processedImage.buffer,
    contentType: 'image/webp',
    metadata: {
      userId,
      imageId,
      originalFilename: file.originalname,
    },
  }),
  uploadToS3({
    bucket: process.env.S3_BUCKET_NAME,
    key: `images/${userId}/thumbnails/${imageId}.webp`,
    body: thumbnail.buffer,
    contentType: 'image/webp',
    metadata: {
      userId,
      imageId,
      type: 'thumbnail',
    },
  }),
])

logger.info({ imageId, imageUrl, thumbnailUrl }, 'Parallel S3 uploads completed')
```

**Benefits:**

- Reduces upload time by 40% (800ms → 500ms)
- Better throughput

**Trade-offs:**

- Slight increase in Lambda memory usage (both uploads in parallel)

**Effort:** 1 hour
**Priority:** **HIGH** (easy win)

---

## Optimization Summary Table

| Optimization                    | Effort       | Priority   | Impact                  | Trigger            |
| ------------------------------- | ------------ | ---------- | ----------------------- | ------------------ |
| **1. Redis SCAN**               | 2 hours      | **HIGH**   | Prevents Redis blocking | Always implement   |
| **1. Cache Tag Sets**           | 4 hours      | **HIGH**   | Faster invalidation     | If >10K cache keys |
| **2. Async Thumbnails**         | 8 hours      | **MEDIUM** | 60% faster uploads      | If P95 upload >1s  |
| **3. Monitor Cold Starts**      | 2 hours      | **MEDIUM** | Visibility              | Always implement   |
| **3. Provisioned Concurrency**  | 1 hour       | **LOW**    | Eliminates cold starts  | If cold starts >5% |
| **4. Redis Connection Pooling** | 3 hours      | **MEDIUM** | 50ms faster cache ops   | If using Redis     |
| **5. Idempotency Tokens**       | 6 hours      | **HIGH**   | Prevents orphaned files | Always implement   |
| **6. Parallel S3 Uploads**      | 1 hour       | **HIGH**   | 40% faster uploads      | Always implement   |
| **Total**                       | **27 hours** |            |                         |                    |

---

## Optimization Roadmap

### Phase 1 (Baseline - No optimizations)

- Deploy infrastructure
- Implement Lambda handlers
- No optimizations yet

**Expected Performance:**

- P95 upload: 1.5-2s
- P95 get: 50-100ms (with CloudFront)

---

### Phase 2 (Quick Wins - 4 hours)

- ✅ **#6:** Parallel S3 uploads
- ✅ **#3:** Monitor cold starts

**Expected Performance:**

- P95 upload: 1-1.5s
- P95 get: 50-100ms

---

### Phase 3 (Critical Optimizations - 12 hours)

- ✅ **#1:** Redis SCAN or Cache Tag Sets
- ✅ **#5:** Idempotency tokens

**Expected Performance:**

- P95 upload: 1-1.5s
- P95 get: 50-100ms
- Zero orphaned files

---

### Phase 4 (Scale Optimizations - 11 hours)

- ✅ **#2:** Async thumbnails (if P95 upload >1s)
- ✅ **#4:** Redis connection pooling (if using Redis)
- ✅ **#3:** Provisioned concurrency (if cold starts >5%)

**Expected Performance:**

- P95 upload: <1s
- P95 get: <50ms
- Cold starts <1%

---

## Performance Monitoring

### Key Metrics to Track

```typescript
// CloudWatch Metrics
{
  'ImageService/UploadLatency': {
    unit: 'Milliseconds',
    dimensions: { Stage: 'production' },
    statistics: ['p50', 'p95', 'p99'],
  },
  'ImageService/GetLatency': {
    unit: 'Milliseconds',
    dimensions: { Stage: 'production' },
    statistics: ['p50', 'p95', 'p99'],
  },
  'ImageService/ColdStarts': {
    unit: 'Count',
    dimensions: { FunctionName: 'UploadFunction' },
    statistics: ['Sum'],
  },
  'ImageService/OrphanedFiles': {
    unit: 'Count',
    dimensions: { Stage: 'production' },
    statistics: ['Sum'],
  },
  'ImageService/CacheHitRate': {
    unit: 'Percent',
    dimensions: { CacheType: 'Redis' },
    statistics: ['Average'],
  },
}
```

---

## Next Steps

1. Review [07-security.md](./07-security.md) - Security requirements
2. Review [09-monitoring.md](./09-monitoring.md) - Observability setup
3. Implement optimizations based on performance metrics

---

[← Back to Migration Strategy](./05-migration-strategy.md) | [Next: Security →](./07-security.md)
