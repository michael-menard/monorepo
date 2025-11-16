# Epic 4: User Profile & Advanced Features Migration

**Epic Goal**: Migrate user profile operations including avatar upload and management, implement CSV parts list parsing for MOCs with batch processing, support multi-file uploads for MOC instructions, and add comprehensive error handling with retry logic for external service failures.

## Story 4.1: Create User Profile Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for user profile operations,
**so that** users can manage their account settings and avatars.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/profile.ts`
2. API Gateway routes: `GET /api/users/{id}`, `PATCH /api/users/{id}`, `POST /api/users/{id}/avatar`, `DELETE /api/users/{id}/avatar`
3. JWT authorizer validates user can only access their own profile (userId match)
4. Note: User profiles stored in AWS Cognito, not PostgreSQL - Lambda queries Cognito User Pool for profile data
5. S3 client configured for avatar storage
6. Redis client for profile caching
7. TypeScript types for Cognito user attributes

## Story 4.2: Implement GET /api/users/:id - Retrieve User Profile

**As a** user,
**I want** to view my profile information,
**so that** I can see my account details and avatar.

**Acceptance Criteria**:

1. Lambda handler queries AWS Cognito User Pool via `AdminGetUserCommand`
2. Authorization: userId from JWT must match route parameter `:id`
3. User attributes extracted: `sub`, `email`, `name`, `picture` (avatar URL)
4. Response includes aggregated statistics: total MOCs, total gallery images, total wishlist items (queries PostgreSQL)
5. Profile data cached in Redis with key: `profile:user:{userId}`, TTL 10 minutes
6. Response format: `{ success: true, data: { id, email, name, avatarUrl, stats: { mocs, images, wishlistItems } } }`
7. 403 if user attempts to access another user's profile
8. 404 if user not found in Cognito

## Story 4.3: Implement PATCH /api/users/:id - Update User Profile

**As a** user,
**I want** to update my profile information,
**so that** I can keep my details current.

**Acceptance Criteria**:

1. Lambda handler accepts `name` field update (other Cognito attributes managed via Cognito console)
2. Validation: `name` must be 1-100 characters, alphanumeric + spaces
3. Update via `AdminUpdateUserAttributesCommand` to Cognito User Pool
4. Authorization: userId match enforced
5. Redis cache invalidated for user profile
6. Response format: `{ success: true, data: { ...updated profile } }`
7. 400 for validation errors, 403 for unauthorized, 500 for Cognito API errors

## Story 4.4: Implement POST /api/users/:id/avatar - Upload Avatar

**As a** user,
**I want** to upload a profile avatar,
**so that** I can personalize my account.

**Acceptance Criteria**:

1. Lambda handler for avatar upload with multipart parsing
2. Image validation: JPEG/PNG/GIF, max 2MB size
3. Sharp processing: crop to square (1:1 aspect ratio), resize to 256x256, optimize, convert to WebP
4. Upload to S3: `avatars/{userId}/avatar.webp` (overwrites previous)
5. Cognito user attribute `picture` updated with S3 URL via `AdminUpdateUserAttributesCommand`
6. Previous avatar deleted from S3 if exists
7. Lambda memory 1024 MB for Sharp processing
8. Redis cache invalidated for user profile
9. Response: `{ success: true, data: { avatarUrl } }`
10. 403 if userId mismatch, 400 for invalid image

## Story 4.5: Implement DELETE /api/users/:id/avatar - Remove Avatar

**As a** user,
**I want** to remove my profile avatar,
**so that** I can revert to a default image.

**Acceptance Criteria**:

1. Lambda handler deletes avatar from S3: `avatars/{userId}/avatar.webp`
2. Cognito user attribute `picture` set to null via `AdminUpdateUserAttributesCommand`
3. Authorization: userId match enforced
4. Redis cache invalidated
5. Response: `{ success: true, message: "Avatar removed" }`
6. 403 if userId mismatch
7. Success returned even if no avatar exists

## Story 4.6: Implement CSV Parts List Parser Lambda

**As a** user,
**I want** to upload a CSV parts list for a MOC,
**so that** the system can parse and store part details automatically.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/parse-parts-list.ts` for `POST /api/mocs/{id}/upload-parts-list`
2. CSV file uploaded to S3 first, Lambda triggered via S3 event or invoked directly with S3 key
3. CSV parsing using `csv-parser` library (existing dependency)
4. Expected CSV format: columns for `Part ID`, `Part Name`, `Quantity`, `Color`
5. Validation: file must be valid CSV, max 10,000 rows
6. Parsed data stored in `mocPartsLists` table with fields populated from CSV
7. Parts count aggregated and MOC's `totalPieceCount` updated
8. Lambda timeout: 5 minutes (for large CSV files)
9. Lambda memory: 512 MB
10. Response: `{ success: true, data: { totalParts, partsListId } }`
11. Error handling for malformed CSV, invalid data, database errors

## Story 4.7: Implement Multi-File Upload for MOCs

**As a** user,
**I want** to upload multiple instruction files at once,
**so that** I can efficiently add complete documentation sets.

**Acceptance Criteria**:

1. Lambda handler enhanced to support multiple files in `POST /api/mocs/{id}/files`
2. Multipart parsing accepts up to 10 files per request
3. Each file validated independently (type, size per `@monorepo/file-validator`)
4. Files uploaded to S3 in parallel using `Promise.all()`
5. Database records inserted in batch transaction to `mocFiles` table
6. Partial success handling: if some uploads fail, successful ones are recorded, errors returned for failed ones
7. Lambda timeout: 120 seconds, memory: 2048 MB
8. Response: `{ success: true, data: { uploaded: [...], failed: [...] } }`
9. Error details include file name and reason for failure
10. Total payload size limited to 50 MB

## Story 4.8: Implement Advanced Error Handling and Retry Logic

**As a** backend developer,
**I want** robust error handling with automatic retries for transient failures,
**so that** users experience reliable service even during AWS service hiccups.

**Acceptance Criteria**:

1. All Lambda functions implement structured error handling with custom error classes
2. Transient errors (network timeouts, throttling) trigger exponential backoff retry (max 3 attempts)
3. Non-retryable errors (validation, authorization) fail immediately with clear messages
4. Database connection errors trigger retry with jitter
5. S3 upload failures logged with presigned URL fallback notification to user
6. OpenSearch indexing failures logged but do not block main operation (eventual consistency acceptable)
7. All errors logged to CloudWatch with structured JSON format including: `errorType`, `errorMessage`, `requestId`, `userId`
8. Error responses never expose internal implementation details (sanitized messages)
9. AWS X-Ray tracing enabled to track error propagation across services
10. CloudWatch metric alarms configured for error rate thresholds (>5% error rate triggers alert)

---
