# Epic 3: Gallery & Wishlist APIs Migration

**Epic Goal**: Migrate Gallery Images and Wishlist APIs to serverless Lambda functions including image upload with Sharp processing, album management, wishlist CRUD operations, Redis caching, and Elasticsearch search. Ensure all image processing operations respect Lambda constraints and implement appropriate error handling.

## Story 3.1: Create Gallery Images Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for gallery image operations,
**so that** users can manage their LEGO image collections via serverless functions.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/gallery.ts` for gallery operations
2. API Gateway routes configured: `GET /api/images`, `GET /api/images/{id}`, `POST /api/images`, `PATCH /api/images/{id}`, `DELETE /api/images/{id}`
3. JWT authorizer attached to all routes
4. Database client configured with access to `galleryImages`, `galleryAlbums`, `galleryFlags` tables
5. S3 client initialized for image storage operations
6. Redis client configured for caching
7. OpenSearch client for search indexing
8. Response utilities shared from core lib
9. TypeScript types defined for Gallery entities

## Story 3.2: Implement POST /api/images - Upload Gallery Image

**As a** user,
**I want** to upload images to my gallery,
**so that** I can organize photos of my LEGO builds.

**Acceptance Criteria**:

1. Lambda handler for `POST /api/images` with multipart form data parsing
2. Image validation: file types (JPEG, PNG, WebP), max size 10MB (via `@monorepo/file-validator`)
3. Sharp image processing pipeline: resize to max 2048px width, optimize quality (80%), convert to WebP
4. Processed image uploaded to S3: `images/{userId}/{uuid}.webp`
5. Thumbnail generated (400px width) and stored: `images/{userId}/thumbnails/{uuid}.webp`
6. Database record created in `galleryImages` with metadata from form: `title`, `description`, `tags`, `albumId`
7. Image indexed in OpenSearch `gallery_images` index
8. Redis cache invalidated for user's gallery list
9. Lambda memory: 2048 MB (for Sharp processing), timeout: 60 seconds
10. Response format: `{ success: true, data: { id, imageUrl, thumbnailUrl, ... } }`
11. Error handling for image processing failures, S3 upload errors

## Story 3.3: Implement Gallery Image CRUD Operations

**As a** user,
**I want** to view, update, and delete my gallery images,
**so that** I can manage my photo collection.

**Acceptance Criteria**:

1. `GET /api/images` returns paginated list of user's standalone images (no albumId) with caching
2. `GET /api/images/{id}` returns single image details with ownership check
3. `PATCH /api/images/{id}` updates metadata (title, description, tags, albumId) with validation
4. `DELETE /api/images/{id}` removes database record and deletes S3 objects (image + thumbnail)
5. All operations verify ownership via JWT userId
6. Redis caching with key patterns: `gallery:images:user:{userId}`, `gallery:image:detail:{imageId}`
7. Cache invalidation on mutations
8. OpenSearch index updated on metadata changes, document deleted on image deletion
9. Response formats match existing API contracts
10. Error handling: 404 not found, 403 forbidden, 400 validation errors

## Story 3.4: Implement Album Management Operations

**As a** user,
**I want** to create albums and organize images into them,
**so that** I can categorize my photos by project or theme.

**Acceptance Criteria**:

1. Lambda routes configured: `GET /api/albums`, `GET /api/albums/{id}`, `POST /api/albums`, `PATCH /api/albums/{id}`, `DELETE /api/albums/{id}`
2. `POST /api/albums` creates album with `title`, `description`, optional `coverImageId`
3. `GET /api/albums` returns user's albums with image count and cover image URL
4. `GET /api/albums/{id}` returns album details with all contained images (eager load via relations)
5. `PATCH /api/albums/{id}` updates album metadata with validation
6. `DELETE /api/albums/{id}` removes album, sets `albumId=null` for contained images (does not delete images)
7. Ownership validation on all operations
8. Redis caching for album lists and detail views
9. OpenSearch indexing for albums with type `album`
10. Response formats consistent with existing API

## Story 3.5: Create Wishlist Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for wishlist operations,
**so that** users can manage their LEGO set wish lists.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/wishlist.ts`
2. API Gateway routes: `GET /api/wishlist`, `GET /api/wishlist/{id}`, `POST /api/wishlist`, `PATCH /api/wishlist/{id}`, `DELETE /api/wishlist/{id}`, `POST /api/wishlist/reorder`
3. Database client configured with `wishlistItems` table access
4. S3 client for wishlist image uploads
5. Redis and OpenSearch clients configured
6. TypeScript types defined for Wishlist entities

## Story 3.6: Implement Wishlist CRUD Operations

**As a** user,
**I want** to add, view, update, and delete items from my wishlist,
**so that** I can track LEGO sets I want to acquire.

**Acceptance Criteria**:

1. `POST /api/wishlist` creates item with fields: `title`, `description`, `productLink`, `imageUrl`, `category`, `sortOrder`
2. `GET /api/wishlist` returns all user's items sorted by `sortOrder` with optional `category` filter
3. `GET /api/wishlist/{id}` returns single item with ownership check
4. `PATCH /api/wishlist/{id}` updates item metadata with validation
5. `DELETE /api/wishlist/{id}` removes item and S3 image if present
6. `POST /api/wishlist/reorder` updates `sortOrder` for multiple items in batch transaction
7. Image upload support via separate endpoint `POST /api/wishlist/{id}/image` using Sharp processing
8. Redis caching with pattern: `wishlist:user:{userId}:all`
9. OpenSearch indexing for wishlist search by title, description, category
10. All operations validate ownership and return appropriate errors

## Story 3.7: Implement Wishlist Image Upload

**As a** user,
**I want** to upload images for wishlist items,
**so that** I can visualize the sets I'm tracking.

**Acceptance Criteria**:

1. Lambda handler for `POST /api/wishlist/{id}/image` with multipart parsing
2. Image validation: JPEG/PNG/WebP, max 5MB
3. Sharp processing: resize to max 800px, optimize quality, convert to WebP
4. Upload to S3: `wishlist/{userId}/{itemId}.webp`
5. Database `wishlistItems.imageUrl` updated with S3 URL
6. Previous image deleted from S3 if exists
7. Lambda memory 1024 MB for Sharp processing
8. Redis cache invalidated for wishlist
9. Response: `{ success: true, data: { imageUrl } }`
10. Error handling for processing and upload failures

## Story 3.8: Implement Gallery and Wishlist Search

**As a** user,
**I want** to search my gallery and wishlist by keywords,
**so that** I can quickly find specific items.

**Acceptance Criteria**:

1. `GET /api/images?search=query` searches gallery via OpenSearch multi-match on `title`, `description`, `tags`
2. `GET /api/wishlist?search=query` searches wishlist via OpenSearch multi-match on `title`, `description`, `category`
3. User ID filter enforced (search only own items)
4. Fallback to PostgreSQL `ILIKE` queries if OpenSearch unavailable
5. Search results paginated with `page` and `limit` parameters
6. Fuzzy matching enabled for typo tolerance
7. Results sorted by relevance score
8. Response includes total hits: `{ success: true, data: [...], total: number }`
9. Search performance metrics logged
10. Cache search results in Redis with short TTL (2 minutes)

---
