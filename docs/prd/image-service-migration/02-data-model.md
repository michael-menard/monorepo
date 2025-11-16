# Image Service Migration - Data Model

**Document:** 02-data-model.md
**Version:** 1.0

---

## DynamoDB Table Design

### Table: `ImageMetadata`

**Capacity Mode:** On-Demand
**Encryption:** AWS managed keys (SSE-DDB)
**Point-in-Time Recovery:** Enabled (Production)
**DynamoDB Streams:** Enabled (for future analytics)

---

## Primary Key Structure

```typescript
interface ImageMetadataPrimaryKey {
  PK: `IMAGE#${string}` // Partition Key: IMAGE#<imageId>
  SK: 'METADATA' // Sort Key: Fixed value "METADATA"
}
```

**Why this design?**

- Single-item access pattern: `GetItem({ PK: 'IMAGE#123', SK: 'METADATA' })`
- Allows future expansion: Could add `SK: 'VERSION#1'`, `SK: 'TAGS'`, etc.
- Prevents hot partitions (each image gets unique partition)

---

## Complete Schema

```typescript
interface ImageMetadata {
  // Primary Keys
  PK: string // IMAGE#<imageId>
  SK: string // METADATA

  // Core Attributes
  id: string // Unique image ID (ULID)
  userId: string // Owner's user ID (from JWT)
  albumId?: string // Optional: Album association

  // File Information
  originalFilename: string // User's original filename
  mimeType: string // image/jpeg, image/png, image/webp
  fileSize: number // Bytes (original)
  processedSize: number // Bytes (after WebP conversion)

  // Image Dimensions
  width: number // Pixels (original)
  height: number // Pixels (original)
  aspectRatio: number // width / height

  // Storage Locations
  s3Key: string // S3 key: images/${userId}/${imageId}.webp
  s3Bucket: string // images-lego-moc-${stage}
  thumbnailKey: string // images/${userId}/thumbnails/${imageId}.webp

  // CloudFront URLs (computed attributes)
  imageUrl: string // https://d123.cloudfront.net/${s3Key}
  thumbnailUrl: string // https://d123.cloudfront.net/${thumbnailKey}

  // Processing Metadata
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string // Error message if failed

  // Image Processing Details
  format: 'webp' | 'jpeg' | 'png'
  quality: number // 1-100 (WebP quality setting)

  // Metadata
  title?: string // User-provided title
  description?: string // User-provided description
  altText?: string // Accessibility text
  tags?: string[] // Search tags

  // Timestamps
  createdAt: string // ISO8601: 2025-01-15T10:30:00Z
  updatedAt: string // ISO8601: 2025-01-15T10:30:00Z
  uploadedAt: string // ISO8601: When upload completed

  // DynamoDB Metadata
  ttl?: number // Unix timestamp (for temp images)
  version: number // Optimistic locking

  // GSI Keys (denormalized for query performance)
  GSI1PK: string // USER#<userId>
  GSI1SK: string // UPLOADED#<uploadedAt>
  GSI2PK?: string // ALBUM#<albumId>
  GSI2SK: string // UPLOADED#<uploadedAt>
}
```

---

## Global Secondary Indexes

### GSI 1: UserIndex

**Purpose:** Query all images for a user, sorted by upload date

```typescript
{
  IndexName: 'UserIndex',
  KeySchema: [
    { AttributeName: 'GSI1PK', KeyType: 'HASH' },   // USER#<userId>
    { AttributeName: 'GSI1SK', KeyType: 'RANGE' }   // UPLOADED#<uploadedAt>
  ],
  Projection: {
    ProjectionType: 'ALL'  // Include all attributes
  },
  ProvisionedThroughput: {
    ReadCapacityUnits: 0,   // On-Demand
    WriteCapacityUnits: 0
  }
}
```

**Query Example:**

```typescript
// Get user's 20 most recent images
const result = await dynamodb.query({
  TableName: 'ImageMetadata',
  IndexName: 'UserIndex',
  KeyConditionExpression: 'GSI1PK = :userId',
  ExpressionAttributeValues: {
    ':userId': `USER#${userId}`,
  },
  ScanIndexForward: false, // Descending order (newest first)
  Limit: 20,
})
```

---

### GSI 2: AlbumIndex

**Purpose:** Query all images in an album, sorted by upload date

```typescript
{
  IndexName: 'AlbumIndex',
  KeySchema: [
    { AttributeName: 'GSI2PK', KeyType: 'HASH' },   // ALBUM#<albumId>
    { AttributeName: 'GSI2SK', KeyType: 'RANGE' }   // UPLOADED#<uploadedAt>
  ],
  Projection: {
    ProjectionType: 'ALL'
  },
  ProvisionedThroughput: {
    ReadCapacityUnits: 0,
    WriteCapacityUnits: 0
  }
}
```

**Query Example:**

```typescript
// Get all images in album, newest first
const result = await dynamodb.query({
  TableName: 'ImageMetadata',
  IndexName: 'AlbumIndex',
  KeyConditionExpression: 'GSI2PK = :albumId',
  ExpressionAttributeValues: {
    ':albumId': `ALBUM#${albumId}`,
  },
  ScanIndexForward: false,
  Limit: 50,
})
```

---

## DynamoDB vs PostgreSQL Comparison

| Feature                 | PostgreSQL (Current)           | DynamoDB (Target)       | Improvement                          |
| ----------------------- | ------------------------------ | ----------------------- | ------------------------------------ |
| **Read Latency (P95)**  | 10-50ms                        | 1-5ms                   | **5-10x faster**                     |
| **Write Latency (P95)** | 15-60ms                        | 5-10ms                  | **3-6x faster**                      |
| **Scaling**             | Vertical (limited)             | Horizontal (unlimited)  | **Auto-scaling**                     |
| **Cost (1M reads)**     | $0.02 (assuming RDS on-demand) | $0.25                   | **Higher, but pay-per-use**          |
| **Cost (Storage/GB)**   | $0.115/month                   | $0.25/month             | **Higher, but includes replication** |
| **Connection Pooling**  | Required (max 100 connections) | Not required (HTTP API) | **Simpler**                          |
| **Query Patterns**      | Flexible (SQL)                 | Limited (key-based)     | **Trade-off**                        |
| **Full-Text Search**    | Built-in                       | Not supported           | **Need OpenSearch**                  |
| **Transactions**        | ACID                           | Limited (25 items max)  | **Trade-off**                        |
| **Backup**              | Manual snapshots               | Automatic PITR          | **Better**                           |
| **Multi-AZ**            | Extra cost                     | Included                | **Better**                           |

**Decision:** DynamoDB is better for this use case because:

1. Simple key-based access patterns (get by ID, list by user)
2. No complex joins needed
3. High read throughput (image metadata fetches)
4. Auto-scaling without connection limits
5. Single-digit millisecond latency

---

## Access Patterns

### 1. Get Image by ID

**Use Case:** Display single image (e.g., MOC cover image)

**DynamoDB Query:**

```typescript
const getImage = async (imageId: string) => {
  const result = await dynamodb.getItem({
    TableName: 'ImageMetadata',
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
  })

  return result.Item
}
```

**Performance:** 1-5ms (single-digit millisecond)

---

### 2. List User's Images (Paginated)

**Use Case:** User's image gallery page

**DynamoDB Query:**

```typescript
const listUserImages = async (
  userId: string,
  limit: number = 20,
  lastEvaluatedKey?: Record<string, any>,
) => {
  const result = await dynamodb.query({
    TableName: 'ImageMetadata',
    IndexName: 'UserIndex',
    KeyConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: `USER#${userId}` },
    },
    ScanIndexForward: false, // Newest first
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey,
  })

  return {
    items: result.Items,
    lastEvaluatedKey: result.LastEvaluatedKey,
    hasMore: !!result.LastEvaluatedKey,
  }
}
```

**Performance:** 5-15ms (depending on page size)

---

### 3. List Album Images

**Use Case:** Display all images in a gallery album

**DynamoDB Query:**

```typescript
const listAlbumImages = async (albumId: string) => {
  const result = await dynamodb.query({
    TableName: 'ImageMetadata',
    IndexName: 'AlbumIndex',
    KeyConditionExpression: 'GSI2PK = :albumId',
    ExpressionAttributeValues: {
      ':albumId': { S: `ALBUM#${albumId}` },
    },
    ScanIndexForward: false,
  })

  return result.Items
}
```

**Performance:** 5-20ms (depending on album size)

---

### 4. Update Image Metadata

**Use Case:** User updates title, description, or tags

**DynamoDB Query:**

```typescript
const updateImage = async (imageId: string, updates: Partial<ImageMetadata>) => {
  const updateExpression = []
  const expressionAttributeNames = {}
  const expressionAttributeValues = {}

  if (updates.title) {
    updateExpression.push('#title = :title')
    expressionAttributeNames['#title'] = 'title'
    expressionAttributeValues[':title'] = { S: updates.title }
  }

  if (updates.tags) {
    updateExpression.push('#tags = :tags')
    expressionAttributeNames['#tags'] = 'tags'
    expressionAttributeValues[':tags'] = { L: updates.tags.map(t => ({ S: t })) }
  }

  // Optimistic locking
  updateExpression.push('#version = #version + :inc')
  expressionAttributeNames['#version'] = 'version'
  expressionAttributeValues[':inc'] = { N: '1' }
  expressionAttributeValues[':currentVersion'] = { N: String(updates.version) }

  const result = await dynamodb.updateItem({
    TableName: 'ImageMetadata',
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ConditionExpression: '#version = :currentVersion',
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  })

  return result.Attributes
}
```

**Performance:** 5-10ms

---

### 5. Delete Image

**Use Case:** User deletes an image

**DynamoDB Query:**

```typescript
const deleteImage = async (imageId: string, userId: string) => {
  // Verify ownership before delete
  const result = await dynamodb.deleteItem({
    TableName: 'ImageMetadata',
    Key: {
      PK: { S: `IMAGE#${imageId}` },
      SK: { S: 'METADATA' },
    },
    ConditionExpression: 'GSI1PK = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: `USER#${userId}` },
    },
    ReturnValues: 'ALL_OLD',
  })

  return result.Attributes
}
```

**Performance:** 5-10ms

---

### 6. Search Images by Tag (Future)

**Use Case:** Find all user's images with tag "minifig"

**Note:** DynamoDB does not support full-text search natively. For tag search, we have 2 options:

**Option A: Client-side filtering (small datasets)**

```typescript
// Fetch all user images, filter client-side
const allImages = await listUserImages(userId, 1000)
const filtered = allImages.items.filter(img => img.tags?.includes('minifig'))
```

**Option B: OpenSearch integration (large datasets)**

```typescript
// Index tags in OpenSearch during upload
// Query OpenSearch for tag search
const results = await opensearch.search({
  index: 'images',
  body: {
    query: {
      bool: {
        must: [{ term: { userId } }, { term: { tags: 'minifig' } }],
      },
    },
  },
})
```

**Recommendation:** Start with Option A, migrate to Option B if tag search becomes slow (>100ms)

---

## Data Model Decisions

### ADR 005: ULID vs UUID for Image IDs

**Decision:** Use ULID (Universally Unique Lexicographically Sortable Identifier)

**Rationale:**

- Lexicographically sortable (encodes timestamp)
- 128-bit like UUID (same uniqueness guarantees)
- URL-safe, case-insensitive
- Better for DynamoDB range queries

**Example:**

```typescript
import { ulid } from 'ulid'

const imageId = ulid() // 01ARZ3NDEKTSV4RRFFQ69G5FAV
```

---

### ADR 006: Denormalized GSI Keys vs Sparse Indexes

**Decision:** Denormalize `GSI1PK`/`GSI1SK` into every item

**Rationale:**

- Simpler query patterns (no conditional logic)
- No risk of missing items (all items indexed)
- Slightly higher storage cost (negligible)

**Trade-off:** 2 extra attributes per item (~50 bytes)

---

### ADR 007: `albumId` Optional vs Required

**Decision:** Make `albumId` optional

**Rationale:**

- Not all images belong to albums (MOC cover images, avatars)
- Sparse GSI2 index (only items with `albumId` indexed)
- Reduces index storage cost

**Implementation:**

```typescript
// Only set GSI2PK if albumId exists
const item = {
  PK: `IMAGE#${imageId}`,
  SK: 'METADATA',
  GSI1PK: `USER#${userId}`,
  GSI1SK: `UPLOADED#${uploadedAt}`,
  ...(albumId && {
    GSI2PK: `ALBUM#${albumId}`,
    GSI2SK: `UPLOADED#${uploadedAt}`,
  }),
}
```

---

### ADR 008: TTL for Temporary Images

**Decision:** Use DynamoDB TTL for temporary uploads

**Rationale:**

- Automatic cleanup (no manual deletion needed)
- Cost-free (no extra charge for TTL)
- Useful for failed uploads, previews

**Example:**

```typescript
const tempImage = {
  ...imageMetadata,
  ttl: Math.floor(Date.now() / 1000) + 3600, // Expire in 1 hour
}
```

---

## Schema Evolution Strategy

### Adding New Attributes

**Safe (backward compatible):**

```typescript
// Add new optional field
interface ImageMetadata {
  // ... existing fields
  exifData?: {
    camera?: string
    lens?: string
    iso?: number
    shutterSpeed?: string
  }
}
```

**Migration:** No migration needed - new items include field, old items don't

---

### Removing Attributes

**Process:**

1. Stop writing attribute to new items
2. Wait 30 days (ensure no readers depend on it)
3. Run batch job to remove attribute from existing items (optional)

---

### Changing Primary Key

**NOT SUPPORTED** - Requires full data migration:

1. Create new table with new key schema
2. Dual-write to both tables
3. Backfill old data to new table
4. Cutover reads to new table
5. Delete old table

---

## PostgreSQL Migration Mapping

### Current `gallery_images` Table

```sql
CREATE TABLE gallery_images (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  album_id UUID REFERENCES gallery_albums(id),
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  s3_key VARCHAR(500) NOT NULL,
  thumbnail_key VARCHAR(500),
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(255),
  tags JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gallery_images_user_id ON gallery_images(user_id);
CREATE INDEX idx_gallery_images_album_id ON gallery_images(album_id);
CREATE INDEX idx_gallery_images_tags ON gallery_images USING GIN(tags);
```

---

### DynamoDB Migration Script

```typescript
import { DynamoDB } from 'aws-sdk'
import { db } from './db/client'
import { galleryImages } from './db/schema'

const dynamodb = new DynamoDB.DocumentClient()

async function migrateGalleryImages() {
  console.log('Starting migration...')

  // Fetch all images from PostgreSQL
  const images = await db.select().from(galleryImages)

  console.log(`Migrating ${images.length} images...`)

  // Batch write to DynamoDB (25 items at a time)
  for (let i = 0; i < images.length; i += 25) {
    const batch = images.slice(i, i + 25)

    const putRequests = batch.map(img => ({
      PutRequest: {
        Item: {
          PK: `IMAGE#${img.id}`,
          SK: 'METADATA',
          GSI1PK: `USER#${img.userId}`,
          GSI1SK: `UPLOADED#${img.createdAt.toISOString()}`,
          ...(img.albumId && {
            GSI2PK: `ALBUM#${img.albumId}`,
            GSI2SK: `UPLOADED#${img.createdAt.toISOString()}`,
          }),

          id: img.id,
          userId: img.userId,
          albumId: img.albumId,
          originalFilename: img.originalFilename,
          mimeType: img.mimeType,
          fileSize: img.fileSize,
          width: img.width,
          height: img.height,
          aspectRatio: img.width && img.height ? img.width / img.height : 1,
          s3Key: img.s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME,
          thumbnailKey: img.thumbnailKey,
          imageUrl: `https://${process.env.CLOUDFRONT_DOMAIN}/${img.s3Key}`,
          thumbnailUrl: `https://${process.env.CLOUDFRONT_DOMAIN}/${img.thumbnailKey}`,
          processingStatus: 'completed',
          format: 'webp',
          quality: 85,
          title: img.title,
          description: img.description,
          altText: img.altText,
          tags: img.tags,
          createdAt: img.createdAt.toISOString(),
          updatedAt: img.updatedAt.toISOString(),
          uploadedAt: img.createdAt.toISOString(),
          version: 1,
        },
      },
    }))

    await dynamodb
      .batchWrite({
        RequestItems: {
          ImageMetadata: putRequests,
        },
      })
      .promise()

    console.log(`Migrated ${i + batch.length}/${images.length} images`)
  }

  console.log('Migration complete!')
}

migrateGalleryImages().catch(console.error)
```

---

## Next Steps

1. Review [03-api-specification.md](03-api-specification.md) - REST API contracts
2. Review [04-infrastructure.md](04-infrastructure.md) - SST configuration for DynamoDB
3. Review [05-migration-strategy.md](05-migration-strategy.md) - Dual-write implementation

---

[← Back to Architecture](01-architecture.md) | [Next: API Specification →](03-api-specification.md)
