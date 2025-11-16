# Epic 2 - MOC Instructions API Test Plan

## Test Strategy

**Testing Philosophy**: Test business logic and API contracts comprehensively while mocking infrastructure dependencies.

**Unit Tests Focus**:
- Request validation (Zod schemas)
- Business logic functions
- Response formatting
- Error handling
- Authorization checks

**Integration Tests Focus**:
- Lambda handler orchestration
- Database operations with mocked DB
- Cache operations with mocked Redis
- Search operations with mocked OpenSearch
- S3 operations with mocked AWS SDK

**Out of Scope for Tests**:
- E2E tests with real AWS infrastructure (separate test suite)
- Load testing (separate performance suite)
- Security penetration testing (separate security suite)

---

## Unit Test Suites

### Suite 1: MOC Request Validation (`src/functions/__tests__/unit/moc-validation.test.ts`)

**Why Test This**:
- Critical for API security and data integrity
- Prevents invalid data from reaching database
- User-facing error messages must be clear

**Test Cases** (15 tests):

#### Create MOC Validation
1. **Valid MOC creation request**
   ```typescript
   Given: Request with all required fields (title, type, description)
   When: Validation runs
   Then: Passes with no errors
   ```

2. **Missing required field - title**
   ```typescript
   Given: Request without title
   When: Validation runs
   Then: Returns 400 with error: "Title is required"
   ```

3. **Invalid type value**
   ```typescript
   Given: Request with type='invalid' (not 'moc' or 'set')
   When: Validation runs
   Then: Returns 400 with error specifying valid types
   ```

4. **MOC type with missing MOC-specific fields**
   ```typescript
   Given: type='moc' without author or partsCount
   When: Validation runs
   Then: Returns 400 with field-specific errors
   ```

5. **Set type with missing Set-specific fields**
   ```typescript
   Given: type='set' without brand or setNumber
   When: Validation runs
   Then: Returns 400 with field-specific errors
   ```

#### Update MOC Validation
6. **Valid partial update**
   ```typescript
   Given: PATCH request with only title
   When: Validation runs
   Then: Passes (all fields optional for PATCH)
   ```

7. **Invalid field type**
   ```typescript
   Given: PATCH with pieceCount as string instead of number
   When: Validation runs
   Then: Returns 400 with type error
   ```

8. **Cross-type field validation**
   ```typescript
   Given: MOC type with brand field (Set-only)
   When: Validation runs
   Then: Returns 400 with error about invalid field for MOC type
   ```

#### Query Parameter Validation
9. **Valid pagination parameters**
   ```typescript
   Given: page=2, limit=10
   When: Validation runs
   Then: Passes with parsed integers
   ```

10. **Invalid page number**
    ```typescript
    Given: page=0 or page=-1
    When: Validation runs
    Then: Returns 400 (page must be >= 1)
    ```

11. **Excessive limit value**
    ```typescript
    Given: limit=1000 (exceeds max 100)
    When: Validation runs
    Then: Clamped to max value or returns 400
    ```

12. **Search query sanitization**
    ```typescript
    Given: search='<script>alert("xss")</script>'
    When: Validation runs
    Then: Sanitized or escaped for SQL/OpenSearch
    ```

#### File Upload Validation
13. **Valid file upload metadata**
    ```typescript
    Given: fileType='instruction', mimeType='application/pdf'
    When: Validation runs
    Then: Passes
    ```

14. **Invalid file type**
    ```typescript
    Given: fileType='invalid'
    When: Validation runs
    Then: Returns 400 with allowed types
    ```

15. **File size validation**
    ```typescript
    Given: File size > 10MB
    When: Validation runs
    Then: Returns 400 with size limit error
    ```

---

### Suite 2: MOC Service Business Logic (`src/lib/services/__tests__/unit/moc-service-logic.test.ts`)

**Why Test This**:
- Core business rules must be enforced
- Complex cache invalidation logic
- Authorization logic is security-critical

**Test Cases** (12 tests):

#### Authorization
1. **User owns MOC - allows access**
   ```typescript
   Given: userId from JWT matches MOC.userId
   When: Checking ownership
   Then: Returns true
   ```

2. **User does not own MOC - denies access**
   ```typescript
   Given: userId from JWT doesn't match MOC.userId
   When: Checking ownership
   Then: Throws ForbiddenError with clear message
   ```

#### Cache Key Generation
3. **List cache key format**
   ```typescript
   Given: userId='user-123', page=2, limit=10
   When: Generating cache key
   Then: Returns 'moc:user:user-123:list:2:10'
   ```

4. **Detail cache key format**
   ```typescript
   Given: mocId='moc-456'
   When: Generating cache key
   Then: Returns 'moc:detail:moc-456'
   ```

#### Cache Invalidation Logic
5. **Invalidate on MOC creation**
   ```typescript
   Given: New MOC created for user-123
   When: Cache invalidation runs
   Then: Deletes all 'moc:user:user-123:list:*' keys
   ```

6. **Invalidate on MOC update**
   ```typescript
   Given: MOC moc-456 updated
   When: Cache invalidation runs
   Then: Deletes 'moc:detail:moc-456' and user list caches
   ```

7. **Invalidate on MOC deletion**
   ```typescript
   Given: MOC moc-456 deleted
   When: Cache invalidation runs
   Then: Deletes detail cache and user list caches
   ```

#### Unique Title Enforcement
8. **Duplicate title check - same user**
   ```typescript
   Given: User already has MOC with title "My Castle"
   When: Creating new MOC with same title
   Then: Throws ConflictError with message about duplicate
   ```

9. **Duplicate title check - different user**
   ```typescript
   Given: Different user has MOC with title "My Castle"
   When: Creating new MOC with same title
   Then: Passes (titles unique per user, not globally)
   ```

#### Search Query Construction
10. **OpenSearch multi-match query**
    ```typescript
    Given: search='castle medieval'
    When: Building OpenSearch query
    Then: Creates multi_match with fields title^3, description, tags^2
    ```

11. **PostgreSQL fallback query**
    ```typescript
    Given: OpenSearch unavailable
    When: Building search query
    Then: Uses PostgreSQL ts_vector full-text search
    ```

12. **Tag filtering logic**
    ```typescript
    Given: tag='castle'
    When: Building query
    Then: Filters JSONB tags column with JSONB contains operator
    ```

---

### Suite 3: File Upload Service (`src/lib/services/__tests__/unit/file-upload-service.test.ts`)

**Why Test This**:
- File validation is security-critical
- S3 key generation must be unique and secure
- MIME type validation prevents malicious uploads

**Test Cases** (8 tests):

1. **Generate unique S3 key**
   ```typescript
   Given: userId='user-123', mocId='moc-456', filename='manual.pdf'
   When: Generating S3 key
   Then: Returns 'mocs/user-123/moc-456/{uuid}.pdf'
     And: UUID is unique on each call
   ```

2. **Sanitize filename**
   ```typescript
   Given: filename='My File (1).pdf'
   When: Sanitizing
   Then: Returns safe filename without special characters
   ```

3. **Validate PDF file**
   ```typescript
   Given: fileType='instruction', mimeType='application/pdf', size=5MB
   When: Validating
   Then: Passes
   ```

4. **Reject oversized file**
   ```typescript
   Given: size=15MB (exceeds 10MB limit)
   When: Validating
   Then: Throws FileError with size limit message
   ```

5. **Reject invalid MIME type**
   ```typescript
   Given: fileType='instruction', mimeType='application/exe'
   When: Validating
   Then: Throws FileError with allowed types
   ```

6. **Validate CSV parts list**
   ```typescript
   Given: fileType='parts-list', mimeType='text/csv'
   When: Validating
   Then: Passes
   ```

7. **Extract file extension**
   ```typescript
   Given: filename='manual.PDF' (uppercase)
   When: Extracting extension
   Then: Returns '.pdf' (lowercase)
   ```

8. **Handle filename without extension**
   ```typescript
   Given: filename='README'
   When: Processing
   Then: Uses MIME type to determine extension
   ```

---

## Integration Test Suites

### Suite 4: MOC Instructions Lambda Handler (`src/functions/__tests__/integration/moc-instructions.integration.test.ts`)

**Why Test This**:
- End-to-end handler flow with mocked infrastructure
- Verifies correct HTTP status codes and response format
- Tests authorization flow

**Test Cases** (20 tests):

#### GET /api/mocs - List MOCs
1. **List user's MOCs successfully**
   ```typescript
   Given: User has 5 MOCs in database
   When: GET /api/mocs
   Then: Returns 200 with array of 5 MOCs
   ```

2. **Pagination works correctly**
   ```typescript
   Given: User has 25 MOCs
   When: GET /api/mocs?page=2&limit=10
   Then: Returns MOCs 11-20
   ```

3. **Search filters results**
   ```typescript
   Given: User has MOCs with various titles
   When: GET /api/mocs?search=castle
   Then: Returns only MOCs matching "castle"
   ```

4. **Tag filtering works**
   ```typescript
   Given: User has MOCs with different tags
   When: GET /api/mocs?tag=medieval
   Then: Returns only MOCs tagged "medieval"
   ```

5. **Returns cached results on second request**
   ```typescript
   Given: First request populated cache
   When: Second identical request
   Then: Returns from cache (Redis get called, DB not called)
   ```

#### GET /api/mocs/:id - Get MOC Detail
6. **Get MOC detail with all relations**
   ```typescript
   Given: MOC has files, images, parts lists
   When: GET /api/mocs/{id}
   Then: Returns 200 with all nested data
   ```

7. **Returns 404 for non-existent MOC**
   ```typescript
   Given: MOC ID doesn't exist
   When: GET /api/mocs/invalid-id
   Then: Returns 404 with error message
   ```

8. **Returns 403 for MOC owned by another user**
   ```typescript
   Given: MOC exists but belongs to different user
   When: GET /api/mocs/{id}
   Then: Returns 403 Forbidden
   ```

9. **Detail results are cached**
   ```typescript
   Given: First request for MOC detail
   When: Second request for same MOC
   Then: Returns from cache
   ```

#### POST /api/mocs - Create MOC
10. **Create MOC successfully**
    ```typescript
    Given: Valid MOC creation request
    When: POST /api/mocs
    Then: Returns 201 with created MOC
      And: MOC saved to database
      And: Cache invalidated
      And: OpenSearch indexing triggered
    ```

11. **Validation error returns 400**
    ```typescript
    Given: Request missing required title
    When: POST /api/mocs
    Then: Returns 400 with validation errors
    ```

12. **Duplicate title returns 409**
    ```typescript
    Given: User already has MOC with title "My Build"
    When: POST /api/mocs with same title
    Then: Returns 409 Conflict
    ```

13. **Unauthorized request returns 401**
    ```typescript
    Given: No JWT token in request
    When: POST /api/mocs
    Then: Returns 401 Unauthorized
    ```

#### PATCH /api/mocs/:id - Update MOC
14. **Update MOC successfully**
    ```typescript
    Given: User owns MOC
    When: PATCH /api/mocs/{id} with {title: "New Title"}
    Then: Returns 200 with updated MOC
      And: Cache invalidated
      And: OpenSearch re-indexed
    ```

15. **Partial update works**
    ```typescript
    Given: PATCH with only description field
    When: Update executes
    Then: Only description updated, other fields unchanged
    ```

16. **Update non-existent MOC returns 404**
    ```typescript
    Given: MOC ID doesn't exist
    When: PATCH /api/mocs/invalid-id
    Then: Returns 404
    ```

17. **Update another user's MOC returns 403**
    ```typescript
    Given: MOC belongs to different user
    When: PATCH /api/mocs/{id}
    Then: Returns 403 Forbidden
    ```

#### DELETE /api/mocs/:id - Delete MOC
18. **Delete MOC successfully**
    ```typescript
    Given: User owns MOC with files
    When: DELETE /api/mocs/{id}
    Then: Returns 200 with success message
      And: MOC deleted from database
      And: Related files deleted
      And: S3 files deleted
      And: OpenSearch document deleted
      And: Cache invalidated
    ```

19. **Delete non-existent MOC returns 404**
    ```typescript
    Given: MOC ID doesn't exist
    When: DELETE /api/mocs/invalid-id
    Then: Returns 404
    ```

20. **Delete another user's MOC returns 403**
    ```typescript
    Given: MOC belongs to different user
    When: DELETE /api/mocs/{id}
    Then: Returns 403 Forbidden
    ```

---

### Suite 5: File Upload Lambda Handler (`src/functions/__tests__/integration/moc-file-upload.integration.test.ts`)

**Why Test This**:
- File upload is complex with multipart parsing
- S3 integration must be verified
- Error handling for large files is critical

**Test Cases** (10 tests):

1. **Upload PDF instruction file**
   ```typescript
   Given: Valid PDF file < 10MB
   When: POST /api/mocs/{id}/files
   Then: Returns 200 with file metadata
     And: File uploaded to S3
     And: Database record created
     And: MOC detail cache invalidated
   ```

2. **Upload CSV parts list**
   ```typescript
   Given: Valid CSV file
   When: POST /api/mocs/{id}/files with fileType='parts-list'
   Then: Returns 200
     And: File stored with correct type
   ```

3. **Reject oversized file**
   ```typescript
   Given: File > 10MB
   When: POST /api/mocs/{id}/files
   Then: Returns 400 with file size error
     And: No S3 upload attempted
   ```

4. **Reject invalid file type**
   ```typescript
   Given: File with MIME type 'application/exe'
   When: POST /api/mocs/{id}/files
   Then: Returns 400 with allowed types message
   ```

5. **Upload to non-existent MOC returns 404**
   ```typescript
   Given: MOC ID doesn't exist
   When: POST /api/mocs/invalid-id/files
   Then: Returns 404
   ```

6. **Upload to another user's MOC returns 403**
   ```typescript
   Given: MOC belongs to different user
   When: POST /api/mocs/{id}/files
   Then: Returns 403 Forbidden
   ```

7. **S3 upload failure handled gracefully**
   ```typescript
   Given: S3 upload fails with network error
   When: POST /api/mocs/{id}/files
   Then: Returns 500 with error message
     And: Database transaction rolled back
     And: No orphaned database records
   ```

8. **Multipart parsing error handled**
   ```typescript
   Given: Invalid multipart request
   When: POST /api/mocs/{id}/files
   Then: Returns 400 with parsing error
   ```

9. **Missing file in multipart request**
   ```typescript
   Given: Multipart request without file field
   When: POST /api/mocs/{id}/files
   Then: Returns 400 with "File required" error
   ```

10. **Multiple files uploaded**
    ```typescript
    Given: Request with multiple files
    When: POST /api/mocs/{id}/files
    Then: Returns 200 with array of uploaded files
      And: All files stored in S3
      And: All database records created
    ```

---

### Suite 6: Search Integration (`src/lib/services/__tests__/integration/moc-search.integration.test.ts`)

**Why Test This**:
- Search is complex with OpenSearch + PostgreSQL fallback
- Query construction must be tested with real scenarios
- Performance logging must work

**Test Cases** (8 tests):

1. **OpenSearch search returns results**
   ```typescript
   Given: OpenSearch available with indexed MOCs
   When: Searching for "castle"
   Then: Returns MOCs ranked by relevance
     And: OpenSearch client called with correct query
   ```

2. **Fuzzy search handles typos**
   ```typescript
   Given: MOC with title "Medieval Castle"
   When: Searching for "medival castel" (typos)
   Then: Returns MOC (fuzziness enabled)
   ```

3. **Boost title matches over description**
   ```typescript
   Given: MOC A with "castle" in title, MOC B with "castle" in description
   When: Searching for "castle"
   Then: MOC A ranked higher (title^3 boost)
   ```

4. **Tag matches boosted**
   ```typescript
   Given: MOC with tag "medieval"
   When: Searching for "medieval"
   Then: Ranked high (tags^2 boost)
   ```

5. **OpenSearch unavailable - falls back to PostgreSQL**
   ```typescript
   Given: OpenSearch connection fails
   When: Searching for "castle"
   Then: Uses PostgreSQL ts_vector search
     And: Returns results
     And: Logs fallback warning
   ```

6. **Pagination works with search**
   ```typescript
   Given: Search returns 50 results
   When: Requesting page=2, limit=10
   Then: Returns results 11-20
   ```

7. **User ID filter applied**
   ```typescript
   Given: Multiple users have MOCs with "castle" in title
   When: User searches for "castle"
   Then: Returns only current user's MOCs
   ```

8. **Empty search query returns all MOCs**
   ```typescript
   Given: search='' (empty string)
   When: Query executes
   Then: Returns all user's MOCs (no search filter)
   ```

---

## Test Execution Plan

### Phase 1: Unit Tests
1. Create validation tests (15 tests)
2. Create business logic tests (12 tests)
3. Create file upload service tests (8 tests)
**Total Unit Tests**: 35 tests

### Phase 2: Integration Tests
1. Create MOC Lambda handler tests (20 tests)
2. Create file upload handler tests (10 tests)
3. Create search integration tests (8 tests)
**Total Integration Tests**: 38 tests

### Phase 3: Verification
1. Run all tests: `pnpm test && pnpm test:integration`
2. Verify coverage meets thresholds (80%+)
3. Fix any failing tests

### Phase 4: Documentation
1. Update TEST_PLAN_EPIC_2.md with any changes
2. Document test patterns for future stories
3. Add README with testing guidelines

---

## Coverage Goals

- **Request Validation**: 100% (critical for security)
- **Business Logic**: 95% (allow edge cases)
- **Lambda Handlers**: 90% (integration tests)
- **File Upload**: 95% (security critical)
- **Search Logic**: 85% (complex integration)

---

## Test Data Fixtures

Create shared fixtures in `src/__tests__/fixtures/`:
- `mock-users.ts` - Sample user IDs and JWT tokens
- `mock-mocs.ts` - Sample MOC data with all types
- `mock-files.ts` - Sample file metadata
- `mock-events.ts` - Sample API Gateway events

---

## Next Steps

Would you like me to:
1. **Generate all unit tests** (35 tests)?
2. **Generate all integration tests** (38 tests)?
3. **Start with highest priority** (request validation)?
4. **Generate everything** and run the full suite?

Say "implement all" to generate all 73 tests!
