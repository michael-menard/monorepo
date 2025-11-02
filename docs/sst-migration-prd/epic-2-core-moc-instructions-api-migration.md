# Epic 2: Core MOC Instructions API Migration

**Epic Goal**: Migrate all MOC Instructions CRUD operations from Express routes to Lambda functions including creation, retrieval (list and detail), update, deletion, file uploads, and search functionality. Implement authentication, request validation, caching, and Elasticsearch indexing while maintaining complete backward compatibility with existing API contracts.

## Story 2.1: Create MOC Instructions Lambda Handler Foundation

**As a** backend developer,
**I want** to create a Lambda handler for MOC Instructions operations,
**so that** I have a foundation for implementing CRUD operations in a serverless environment.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/moc-instructions.ts` with multi-method handler (switch on `event.requestContext.http.method`)
2. Shared utilities extracted to `src/lib/` for database client, response formatting, error handling
3. AWS SDK v3 clients initialized for S3, Secrets Manager as needed
4. Drizzle database client instantiated with RDS Proxy connection string from `Resource.MyPostgres`
5. Redis client created using `Resource.MyRedis` endpoint
6. OpenSearch client initialized with `Resource.MyOpenSearch` endpoint and IAM authentication
7. API Gateway HTTP API configured with `/api/mocs` route and `{id}` path parameter
8. JWT authorizer configured using AWS Cognito User Pool (existing)
9. Environment variable access via SST resource linking (no hardcoded values)
10. TypeScript types defined for MOC entities matching existing schema

## Story 2.2: Implement GET /api/mocs - List All MOCs

**As a** user,
**I want** to retrieve a paginated list of all my MOC instructions,
**so that** I can browse my collection.

**Acceptance Criteria**:

1. Lambda handler implements `GET /api/mocs` with query parameters: `page`, `limit`, `search`, `tag`
2. User ID extracted from JWT token via `event.requestContext.authorizer.jwt.claims.sub`
3. Query builder uses Drizzle to filter `mocInstructions` table by `userId`
4. Pagination implemented with default `limit=20` and `page=1`
5. Search query triggers OpenSearch full-text search if available, falls back to PostgreSQL `ILIKE` query
6. Tag filtering applies to `tags` JSONB column
7. Results include MOC metadata: `id`, `title`, `description`, `thumbnailUrl`, `type`, `createdAt`
8. Response cached in Redis with TTL 5 minutes using key pattern `moc:user:{userId}:list:{page}:{limit}`
9. Cache invalidation on any MOC creation/update/deletion
10. Response format matches existing API contract: `{ success: true, data: [...], total: number, page: number }`
11. Error handling returns appropriate HTTP status codes (400, 401, 500)

## Story 2.3: Implement GET /api/mocs/:id - Retrieve MOC Detail

**As a** user,
**I want** to retrieve full details of a specific MOC,
**so that** I can view all associated files, images, and parts lists.

**Acceptance Criteria**:

1. Lambda handler implements `GET /api/mocs/{id}` path parameter extraction
2. Query includes eager loading of relationships: `mocFiles`, `galleryImages`, `partsLists` via Drizzle relations
3. Authorization check ensures `userId` from JWT matches MOC owner
4. Response includes all MOC fields plus related entities
5. Results cached in Redis with TTL 10 minutes using key pattern `moc:detail:{mocId}`
6. Cache hit logged for monitoring
7. 404 response if MOC not found
8. 403 response if user does not own the MOC
9. Response format: `{ success: true, data: { ...moc, files: [...], images: [...], partsLists: [...] } }`

## Story 2.4: Implement POST /api/mocs - Create New MOC

**As a** user,
**I want** to create a new MOC instruction entry,
**so that** I can start building my collection.

**Acceptance Criteria**:

1. Lambda handler implements `POST /api/mocs` with request body validation using Zod schema
2. Required fields validated: `title`, `type` (moc|set), `description` (optional)
3. Type-specific field validation (MOC requires `author`, `partsCount`; Set requires `brand`, `setNumber`)
4. User ID from JWT automatically assigned to `userId` field
5. Business rule enforced: unique MOC title per user (check via database unique index)
6. Transaction used to insert into `mocInstructions` table and return created record
7. Created MOC indexed in OpenSearch asynchronously (non-blocking)
8. Redis cache invalidated for user's MOC list
9. Response format: `{ success: true, data: { id, title, ... }, statusCode: 201 }`
10. Duplicate title returns 409 Conflict with clear error message
11. Validation errors return 400 with field-level error details

## Story 2.5: Implement PATCH /api/mocs/:id - Update MOC

**As a** user,
**I want** to update an existing MOC's metadata,
**so that** I can correct information or add details.

**Acceptance Criteria**:

1. Lambda handler implements `PATCH /api/mocs/{id}` with partial update support
2. Request body validated using Zod schema (all fields optional)
3. Authorization check: user must own the MOC
4. Update query modifies only provided fields, sets `updatedAt` timestamp
5. Business logic validates type-specific fields (e.g., can't add `brand` to MOC type)
6. Transaction ensures atomic update with optimistic locking check
7. Updated MOC re-indexed in OpenSearch
8. Redis caches invalidated: detail cache for MOC, list cache for user
9. Response format: `{ success: true, data: { ...updated MOC } }`
10. 404 if MOC not found, 403 if not owner, 400 for validation errors

## Story 2.6: Implement DELETE /api/mocs/:id - Delete MOC

**As a** user,
**I want** to delete a MOC from my collection,
**so that** I can remove entries I no longer need.

**Acceptance Criteria**:

1. Lambda handler implements `DELETE /api/mocs/{id}`
2. Authorization check: user must own the MOC
3. Cascade deletion of related records via database foreign key constraints (files, images, parts lists)
4. S3 files referenced in `mocFiles` table deleted via batch `DeleteObjectCommand`
5. OpenSearch document deleted from `moc_instructions` index
6. Redis caches invalidated (detail and list caches)
7. Transaction ensures all-or-nothing deletion
8. Response format: `{ success: true, message: "MOC deleted successfully" }`
9. 404 if MOC not found, 403 if not owner
10. Error logged but user notified on success even if S3/OpenSearch cleanup fails

## Story 2.7: Implement MOC File Upload Handler

**As a** user,
**I want** to upload instruction files and parts lists to a MOC,
**so that** I can attach documentation to my creations.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/moc-file-upload.ts` for `POST /api/mocs/{id}/files`
2. Multipart form data parsing using `busboy` or similar library (no Multer)
3. File validation: max size 10MB, allowed types (PDF, XML, CSV per `@monorepo/file-validator`)
4. Virus scanning integrated (ClamAV Lambda layer or S3 + Lambda trigger pattern)
5. File uploaded to S3 with key pattern: `mocs/{userId}/{mocId}/{uuid}.{ext}`
6. MOC ownership verified before accepting upload
7. Database record inserted into `mocFiles` table with metadata: `fileType`, `fileUrl`, `originalFilename`, `mimeType`
8. Lambda timeout set to 60 seconds to accommodate large files
9. Lambda memory configured at 1024 MB for file processing
10. Response format: `{ success: true, data: { fileId, fileUrl, ... } }`
11. Error handling for upload failures, S3 errors, database errors

## Story 2.8: Implement MOC Search with Elasticsearch

**As a** user,
**I want** to search my MOCs by keywords in titles, descriptions, and tags,
**so that** I can quickly find specific builds.

**Acceptance Criteria**:

1. Search functionality integrated into `GET /api/mocs` handler via `search` query parameter
2. OpenSearch query constructed with multi-match across fields: `title^3`, `description`, `tags^2`
3. Fuzziness enabled (`AUTO`) for typo tolerance
4. User ID filter applied (user can only search their own MOCs)
5. Results sorted by relevance score (descending) then `updatedAt` (descending)
6. Pagination supported (from/size parameters)
7. Fallback to PostgreSQL `ts_vector` full-text search if OpenSearch unavailable
8. Search results mapped to standard MOC response format
9. Query performance logged for monitoring
10. Response includes total hit count: `{ success: true, data: [...], total: number }`

---
