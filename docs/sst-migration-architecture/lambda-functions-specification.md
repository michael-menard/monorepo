# Lambda Functions Specification

## Function Organization Strategy

Lambda functions are organized by API domain with one function per primary resource type. Each function handles multiple HTTP methods for its resource using a route-based handler pattern.

## Shared Lambda Configuration

**Runtime**: Node.js 20.x
**Architecture**: arm64 (Graviton2 for cost/performance)
**VPC**: Enabled for database access
**Tracing**: AWS X-Ray enabled
**Environment Variables** (injected via SST Resource):
- `POSTGRES_HOST`: From `Resource.MyPostgres.host`
- `POSTGRES_PORT`: From `Resource.MyPostgres.port`
- `REDIS_ENDPOINT`: From `Resource.MyRedis.endpoint`
- `OPENSEARCH_ENDPOINT`: From `Resource.MyOpenSearch.endpoint`
- `S3_BUCKET`: From `Resource.MyBucket.name`
- `NODE_ENV`: `production`

## Lambda Layer Strategy

**Shared Dependencies Layer**:
- Sharp (image processing)
- Drizzle ORM
- AWS SDK v3 clients
- Zod
- Common utilities

**Size Optimization**: Layer reduces individual function bundle sizes from ~50MB to ~5MB.

---

## 1. Health Check Lambda

**Function Name**: `lego-api-health-{stage}`
**Handler**: `src/functions/health.handler`
**Memory**: 512 MB
**Timeout**: 10 seconds
**Concurrency**: Reserved 5 (always warm)

**Purpose**: Validates connectivity to PostgreSQL, Redis, and OpenSearch. Provides service status for monitoring and load balancing.

**API Routes**:
- `GET /health`

**Dependencies**:
- PostgreSQL via RDS Proxy
- Redis client
- OpenSearch client

**Response Format**:
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  service: 'lego-projects-api',
  components: {
    database: 'healthy' | 'unhealthy',
    redis: 'healthy' | 'unhealthy',
    opensearch: 'healthy' | 'unhealthy'
  },
  timestamp: string
}
```

**Error Handling**: Returns `degraded` if Redis or OpenSearch unavailable but PostgreSQL healthy. Returns `unhealthy` if PostgreSQL unavailable.

---

## 2. MOC Instructions Lambda

**Function Name**: `lego-api-mocs-{stage}`
**Handler**: `src/functions/mocs.handler`
**Memory**: 1024 MB
**Timeout**: 30 seconds
**Concurrency**: Auto-scale (no reservation)

**Purpose**: Handles all CRUD operations for MOC instructions including search, file associations, and parts lists.

**API Routes**:
- `GET /api/mocs` - List user's MOCs with pagination and search
- `GET /api/mocs/{id}` - Retrieve MOC details with relationships
- `POST /api/mocs` - Create new MOC
- `PATCH /api/mocs/{id}` - Update MOC metadata
- `DELETE /api/mocs/{id}` - Delete MOC and cascade to files

**Dependencies**:
- PostgreSQL (Drizzle ORM)
- Redis (caching)
- OpenSearch (search indexing)
- S3 (file deletion on MOC delete)

**Caching Strategy**:
- List queries: 5 min TTL, key pattern `moc:user:{userId}:list:{page}:{limit}`
- Detail queries: 10 min TTL, key pattern `moc:detail:{mocId}`
- Invalidation: On create, update, delete operations

**Search Integration**:
- Full-text search via OpenSearch on `title`, `description`, `tags`
- Fallback to PostgreSQL `ILIKE` if OpenSearch unavailable
- Fuzzy matching enabled (typo tolerance)

**Business Logic**:
- Enforce unique title per user (database constraint)
- Type-specific validation (MOC requires `author`, Set requires `brand`)
- Cascade delete to `mocFiles`, `mocGalleryImages`, `mocPartsLists`

---

## 3. Gallery Images Lambda

**Function Name**: `lego-api-gallery-{stage}`
**Handler**: `src/functions/gallery.handler`
**Memory**: 2048 MB (for Sharp image processing)
**Timeout**: 60 seconds
**Concurrency**: Auto-scale

**Purpose**: Manages gallery images including upload with Sharp processing, CRUD operations, album management, and search.

**API Routes**:
- `GET /api/images` - List standalone images
- `GET /api/images/{id}` - Get image details
- `POST /api/images` - Upload and process image
- `PATCH /api/images/{id}` - Update metadata
- `DELETE /api/images/{id}` - Delete image and S3 objects
- `GET /api/albums` - List user's albums
- `GET /api/albums/{id}` - Get album with images
- `POST /api/albums` - Create album
- `PATCH /api/albums/{id}` - Update album
- `DELETE /api/albums/{id}` - Delete album (images stay)

**Dependencies**:
- PostgreSQL (image metadata)
- Redis (caching)
- OpenSearch (image search)
- S3 (image storage)
- Sharp (image processing)

**Image Processing Pipeline**:
1. Validate file (type, size via `@monorepo/file-validator`)
2. Sharp resize to max 2048px width, quality 80%, convert to WebP
3. Generate thumbnail (400px width)
4. Upload full image to S3: `images/{userId}/{uuid}.webp`
5. Upload thumbnail to S3: `images/{userId}/thumbnails/{uuid}.webp`
6. Store metadata in PostgreSQL
7. Index in OpenSearch
8. Invalidate Redis cache

**Caching Strategy**:
- Image lists: 5 min TTL
- Image details: 10 min TTL
- Album lists: 5 min TTL
- Album details: 10 min TTL

---

## 4. Wishlist Lambda

**Function Name**: `lego-api-wishlist-{stage}`
**Handler**: `src/functions/wishlist.handler`
**Memory**: 1024 MB
**Timeout**: 30 seconds
**Concurrency**: Auto-scale

**Purpose**: Handles wishlist CRUD operations, image uploads, category filtering, and reordering.

**API Routes**:
- `GET /api/wishlist` - List user's wishlist items
- `GET /api/wishlist/{id}` - Get item details
- `POST /api/wishlist` - Create wishlist item
- `PATCH /api/wishlist/{id}` - Update item
- `DELETE /api/wishlist/{id}` - Delete item
- `POST /api/wishlist/reorder` - Batch update sort order
- `POST /api/wishlist/{id}/image` - Upload item image

**Dependencies**:
- PostgreSQL
- Redis (caching)
- OpenSearch (search)
- S3 (item images)
- Sharp (image processing for uploads)

**Image Processing** (for wishlist images):
- Resize to max 800px, optimize, convert to WebP
- Store at `wishlist/{userId}/{itemId}.webp`

**Caching Strategy**:
- Wishlist list: 5 min TTL, key `wishlist:user:{userId}:all`
- Invalidation on create, update, delete, reorder

---

## 5. User Profile Lambda

**Function Name**: `lego-api-profile-{stage}`
**Handler**: `src/functions/profile.handler`
**Memory**: 1024 MB
**Timeout**: 30 seconds
**Concurrency**: Auto-scale

**Purpose**: Manages user profile data from Cognito including avatar uploads and aggregated statistics.

**API Routes**:
- `GET /api/users/{id}` - Get user profile
- `PATCH /api/users/{id}` - Update profile (name)
- `POST /api/users/{id}/avatar` - Upload avatar
- `DELETE /api/users/{id}/avatar` - Remove avatar

**Dependencies**:
- AWS Cognito (user attributes via Admin APIs)
- PostgreSQL (aggregated stats queries)
- Redis (profile caching)
- S3 (avatar storage)
- Sharp (avatar processing)

**Avatar Processing**:
- Crop to square (1:1 aspect ratio)
- Resize to 256x256
- Optimize and convert to WebP
- Store at `avatars/{userId}/avatar.webp` (overwrites previous)
- Update Cognito `picture` attribute

**Profile Aggregation**:
- Query PostgreSQL for counts: total MOCs, gallery images, wishlist items
- Combine with Cognito attributes
- Cache for 10 minutes

---

## 6. File Upload Lambda

**Function Name**: `lego-api-upload-{stage}`
**Handler**: `src/functions/upload.handler`
**Memory**: 2048 MB
**Timeout**: 120 seconds
**Concurrency**: Auto-scale

**Purpose**: Handles file uploads for MOC instructions, parts lists, and multi-file uploads with validation and virus scanning.

**API Routes**:
- `POST /api/mocs/{id}/files` - Upload MOC files (PDF, XML, CSV)
- `POST /api/mocs/{id}/upload-parts-list` - Upload CSV parts list

**Dependencies**:
- PostgreSQL
- S3 (file storage)
- `@monorepo/file-validator` (validation)
- CSV parser (for parts lists)

**File Upload Flow**:
1. Parse multipart form data (using `busboy` or `formidable`)
2. Validate file type, size (max 10MB per file)
3. Virus scan (optional: ClamAV Lambda layer or S3 + Lambda trigger)
4. Upload to S3: `mocs/{userId}/{mocId}/{uuid}.{ext}`
5. Insert record into `mocFiles` table
6. For CSV: Invoke CSV Parser Lambda asynchronously
7. Return file metadata to client

**Multi-File Support**: Accepts up to 10 files per request, processes in parallel using `Promise.all()`.

---

## 7. CSV Parser Lambda

**Function Name**: `lego-api-csv-parser-{stage}`
**Handler**: `src/functions/parse-csv.handler`
**Memory**: 512 MB
**Timeout**: 300 seconds (5 minutes)
**Concurrency**: Auto-scale
**Invocation**: Asynchronous (invoked by File Upload Lambda)

**Purpose**: Parses CSV parts lists for MOCs, validates data, and stores in `mocPartsLists` table.

**Trigger**: Invoked asynchronously by File Upload Lambda with S3 key

**Dependencies**:
- S3 (read CSV file)
- PostgreSQL (insert parts list)
- `csv-parser` library

**CSV Processing Flow**:
1. Receive S3 key and MOC ID from event
2. Stream CSV file from S3
3. Parse CSV rows (expected columns: Part ID, Part Name, Quantity, Color)
4. Validate each row (required fields, data types)
5. Aggregate total parts count
6. Insert batch into `mocPartsLists` table in transaction
7. Update MOC's `totalPieceCount` field
8. Log results to CloudWatch

**Error Handling**: Malformed CSV or validation errors logged; partial success handled gracefully.

---

## Lambda IAM Roles

Each Lambda function has a dedicated IAM role with least-privilege permissions:

**Common Permissions** (all Lambdas):
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` (CloudWatch)
- `xray:PutTraceSegments`, `xray:PutTelemetryRecords` (X-Ray)
- `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DeleteNetworkInterface` (VPC)

**Database Access Lambdas** (MOC, Gallery, Wishlist, Profile, Health):
- `secretsmanager:GetSecretValue` (RDS credentials)
- `rds-db:connect` (RDS Proxy)

**S3 Access Lambdas** (Gallery, Wishlist, Profile, Upload):
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `lego-moc-files-{stage}` bucket

**Cognito Access Lambda** (Profile):
- `cognito-idp:AdminGetUser`, `cognito-idp:AdminUpdateUserAttributes`

**Lambda Invocation** (Upload Lambda):
- `lambda:InvokeFunction` for CSV Parser Lambda

---
