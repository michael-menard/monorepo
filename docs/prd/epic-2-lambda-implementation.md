# Epic 2: Lambda Implementation

**PRD Reference:** [10-implementation-phases.md](./image-service-migration/10-implementation-phases.md#phase-2-lambda-implementation-week-2)
**Duration:** Week 2
**Team Size:** 2-3 engineers
**Estimated Effort:** 24 hours

---

## Epic Goal

Implement all Lambda function handlers for the Image Service CRUD operations with comprehensive testing, including upload, get, list, update, and delete functionality.

---

## Epic Description

### Context

With the infrastructure in place (Epic 1), this epic focuses on implementing the core business logic for the Image Service. This includes:

- Building Lambda handlers for all CRUD operations
- Implementing image processing with Sharp
- Setting up DynamoDB operations
- Configuring S3 upload/download
- Writing comprehensive unit and integration tests

### Success Criteria

- All Lambda handlers implemented and deployed to dev
- Unit test coverage >90%
- Integration tests passing
- Manual testing complete with all test cases passing
- Image upload, retrieval, update, and delete working end-to-end

---

## Stories

### Story 2.1: Upload Lambda Implementation

**Description:** Implement the image upload Lambda handler with Sharp image processing, S3 upload, DynamoDB write, and Zod validation.

**Acceptance Criteria:**
1. Upload Lambda handler created in `src/functions/upload.ts`
2. Sharp image processing integrated (resize, optimize, generate thumbnails)
3. S3 upload logic implemented with multipart support
4. DynamoDB write operations implemented
5. Zod validation schemas created for request validation
6. Custom error types implemented
7. JWT validation middleware implemented
8. Unit tests written with >90% coverage
9. Lambda deployed to dev environment
10. Manual testing with sample images succeeds

**Estimated Time:** 6 hours

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

**Key Implementation Details:**
- Image size limits: Max 10MB
- Supported formats: JPEG, PNG, WebP
- Thumbnail generation: 200x200px
- S3 bucket organization: `{userId}/{imageId}/original.{ext}`, `{userId}/{imageId}/thumbnail.{ext}`
- DynamoDB table: ImageMetadata with PK/SK design

**Reference Documents:**
- [02-data-model.md](./image-service-migration/02-data-model.md) - DynamoDB schema
- [03-api-specification.md](./image-service-migration/03-api-specification.md) - API contracts
- [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md) - Phase 2 implementation details

---

### Story 2.2: Get and List Lambda Implementation

**Description:** Implement get (by ID) and list (user images) Lambda handlers with pagination and ownership verification.

**Acceptance Criteria:**
1. Get Lambda handler created in `src/functions/get.ts`
2. List Lambda handler created in `src/functions/list.ts`
3. Get handler queries DynamoDB by image ID
4. List handler queries UserIndex GSI (userId + createdAt)
5. Pagination logic implemented (cursor-based)
6. Ownership verification implemented (user can only access their images)
7. Error handling for not found and forbidden cases
8. Unit tests written with >90% coverage
9. Lambdas deployed to dev environment
10. Manual testing with multiple images succeeds

**Estimated Time:** 4 hours

**Key Implementation Details:**
- Get endpoint: `GET /images/{imageId}`
- List endpoint: `GET /images?limit=20&cursor={cursor}`
- Default limit: 20 images
- Max limit: 100 images
- Cursor-based pagination using DynamoDB LastEvaluatedKey
- Return CloudFront URLs for images

**Reference Documents:**
- [02-data-model.md](./image-service-migration/02-data-model.md) - GSI access patterns
- [03-api-specification.md](./image-service-migration/03-api-specification.md) - API response formats

---

### Story 2.3: Update and Delete Lambda Implementation

**Description:** Implement update (metadata) and delete (image + metadata) Lambda handlers with optimistic locking and CloudFront invalidation.

**Acceptance Criteria:**
1. Update Lambda handler created in `src/functions/update.ts`
2. Delete Lambda handler created in `src/functions/delete.ts`
3. Update handler implements optimistic locking with version field
4. Update handler validates ownership before updating
5. Delete handler removes image from S3 (original + thumbnail)
6. Delete handler removes metadata from DynamoDB
7. Delete handler invalidates CloudFront cache
8. Error handling for version conflicts, not found, and forbidden cases
9. Unit tests written with >90% coverage
10. Lambdas deployed to dev environment
11. Manual testing succeeds

**Estimated Time:** 4 hours

**Key Implementation Details:**
- Update endpoint: `PATCH /images/{imageId}`
- Delete endpoint: `DELETE /images/{imageId}`
- Optimistic locking: Require `version` field in update request, increment on success
- CloudFront invalidation: Create invalidation for `/images/{userId}/{imageId}/*`
- S3 deletion: Delete both original and thumbnail objects
- DynamoDB deletion: Use consistent write with condition expression

**Reference Documents:**
- [03-api-specification.md](./image-service-migration/03-api-specification.md) - API contracts
- [06-performance-optimization.md](./image-service-migration/06-performance-optimization.md) - CloudFront invalidation

---

### Story 2.4: Integration Testing Suite

**Description:** Write comprehensive integration tests covering the full CRUD flow and error cases using LocalStack or dev environment.

**Acceptance Criteria:**
1. Integration test file created: `tests/integration/image-service.integration.test.ts`
2. Test setup configures LocalStack or dev environment
3. Upload → Get → Update → Delete flow test implemented
4. Pagination test implemented (upload 30 images, verify pagination)
5. Error case tests implemented:
   - Invalid file format (400)
   - File too large (413)
   - Unauthorized (401)
   - Ownership violation (403)
   - Not found (404)
   - Version conflict (409)
6. Test coverage >90% across all Lambda handlers
7. All tests passing in CI pipeline
8. Test documentation added to README

**Estimated Time:** 6 hours

**Test Scenarios:**
- Happy path: Upload → Get → List → Update → Delete
- Pagination: Upload 30 images, fetch with limit=20, verify cursor
- Upload validation: Non-image file, oversized file, missing auth
- Ownership: User A cannot access User B's images
- Optimistic locking: Concurrent updates trigger version conflict

**Reference Documents:**
- [Testing strategy](../architecture/coding-standards.md#testing) - Test standards

---

### Story 2.5: Manual Testing and Bug Fixes

**Description:** Perform comprehensive manual testing with real images of various sizes and formats, document test cases, and fix any bugs discovered.

**Acceptance Criteria:**
1. Manual test plan documented with test cases
2. All test cases executed and results recorded
3. Bugs identified, logged, and prioritized
4. Critical and high-priority bugs fixed
5. Regression testing completed after bug fixes
6. Test results summary created
7. All Lambda handlers working end-to-end in dev environment
8. Performance verified (upload <1s, get <50ms for cached images)

**Estimated Time:** 4 hours

**Test Cases:**
- Upload 1 MB JPEG image → verify thumbnail generated, S3 storage, DynamoDB record
- Upload 10 MB PNG image (max size) → should succeed
- Upload 11 MB image → should fail with 413 (payload too large)
- Upload .txt file → should fail with 400 (invalid file type)
- Upload without Authorization header → should fail with 401
- Get image owned by another user → should fail with 403
- Update with incorrect version → should fail with 409
- Delete image → verify S3 objects deleted, DynamoDB record deleted, CloudFront invalidated

**Reference Documents:**
- [03-api-specification.md](./image-service-migration/03-api-specification.md) - Expected API behavior

---

## Dependencies

**External Dependencies:**
- AWS account with DynamoDB, S3, Lambda, CloudFront access
- LocalStack for local integration testing (optional)
- Sharp library for image processing

**Internal Dependencies:**
- Epic 1: Infrastructure Setup must be completed
  - DynamoDB table must exist
  - S3 bucket must exist
  - CloudFront distribution must exist
  - API Gateway must be configured

---

## Technical Notes

### DynamoDB Schema

**Source:** [02-data-model.md](./image-service-migration/02-data-model.md)

```typescript
interface ImageMetadata {
  PK: string              // IMAGE#{imageId}
  SK: string              // METADATA
  userId: string          // For GSI
  createdAt: string       // ISO timestamp, for GSI sort key
  updatedAt: string       // ISO timestamp
  originalFilename: string
  s3Key: string           // Path in S3
  s3Bucket: string        // Bucket name
  thumbnailS3Key: string  // Thumbnail path
  mimeType: string        // image/jpeg, image/png, etc.
  sizeBytes: number       // Original file size
  width: number           // Original width
  height: number          // Original height
  version: number         // For optimistic locking
}
```

### API Endpoints

**Source:** [03-api-specification.md](./image-service-migration/03-api-specification.md)

- `POST /images` - Upload image
- `GET /images/{imageId}` - Get image metadata
- `GET /images` - List user images (paginated)
- `PATCH /images/{imageId}` - Update image metadata
- `DELETE /images/{imageId}` - Delete image

### Image Processing

**Source:** [05-migration-strategy.md](./image-service-migration/05-migration-strategy.md)

- Use Sharp library for image processing
- Generate thumbnail: 200x200px, maintain aspect ratio
- Optimize images: JPEG quality 85%, PNG compression level 9
- Validate dimensions: Max 8000x8000px

### Error Handling

**Source:** [coding-standards.md](../architecture/coding-standards.md#error-handling)

- Never use `throw new Error()` - use custom error classes
- Never expose internal error details to users
- Log detailed errors server-side only
- Return user-friendly error messages with error codes

---

## Definition of Done

- [ ] All 5 stories completed with acceptance criteria met
- [ ] All Lambda handlers implemented and tested
- [ ] Unit test coverage >90%
- [ ] Integration tests passing
- [ ] Manual testing complete with all test cases passing
- [ ] All Lambdas deployed to dev environment
- [ ] Code reviewed and merged
- [ ] Documentation updated (README, API docs)
- [ ] Ready for Dual-Write implementation (Epic 3)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Image processing performance issues | Medium | High | Test with large images, optimize Sharp settings, consider Lambda memory increase |
| S3 upload failures | Low | High | Implement retry logic with exponential backoff |
| DynamoDB throttling during testing | Medium | Medium | Use on-demand billing, implement batch operations for bulk testing |
| Integration test flakiness | Medium | Low | Use proper test isolation, cleanup between tests, add retry logic |
| Sharp library cold start latency | High | Medium | Consider Lambda provisioned concurrency or optimize bundle size |

---

**Previous Epic:** [Epic 1: Infrastructure Setup](./epic-1-infrastructure-setup.md)
**Next Epic:** [Epic 3: Dual-Write Implementation](./epic-3-dual-write-implementation.md)
