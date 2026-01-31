# Test Plan - WISH-2011: Test infrastructure for MSW mocking of S3 and API calls

## Scope Summary

**Endpoints touched:**
- No new endpoints - this is test infrastructure only
- Test infrastructure covers:
  - `/wishlist/images/presign` (presigned URL generation)
  - S3 PUT requests to presigned URLs
  - All existing wishlist API endpoints

**UI touched:** No

**Data/storage touched:**
- Test fixtures for S3 upload flows
- MSW handler configuration
- No actual database or S3 storage

---

## Happy Path Tests

### Test 1: MSW Handler for Presigned URL Generation

**Setup:**
- Install and configure MSW handlers
- Create mock presign endpoint handler
- Initialize test environment with MSW server

**Action:**
- Call `useGetWishlistImagePresignUrlMutation` with valid file params
- Verify MSW intercepts the request
- Return mock presigned URL and S3 key

**Expected outcome:**
- MSW handler returns `{ presignedUrl: "https://mock-s3.amazonaws.com/...", key: "uploads/test.jpg" }`
- No actual API call reaches backend
- Response matches `PresignResponseSchema`

**Evidence:**
- Integration test passes
- MSW request log shows intercepted presign request
- No network errors in test output

---

### Test 2: MSW Handler for S3 PUT Upload

**Setup:**
- Configure MSW handler for S3 presigned URL patterns
- Create mock S3 response (200 OK)
- Initialize file upload with valid image file

**Action:**
- Call `uploadToPresignedUrl` from `@repo/upload-client`
- MSW intercepts S3 PUT request
- Return 200 OK response

**Expected outcome:**
- Upload completes successfully
- Progress callback fires (0%, 50%, 100%)
- No actual S3 upload occurs
- Returns `{ success: true, httpStatus: 200 }`

**Evidence:**
- Integration test in `useS3Upload.test.ts` passes
- MSW request log shows intercepted S3 PUT
- Progress events logged correctly
- No AWS credentials required

---

### Test 3: Combined Presign + Upload Flow

**Setup:**
- Both presign and S3 PUT handlers active
- Valid image file (JPEG, < 10MB)
- Test component using `useS3Upload` hook

**Action:**
1. Call `upload(file)` from hook
2. Verify presign request intercepted → returns mock URL
3. Verify S3 PUT request intercepted → returns 200
4. Verify final imageUrl constructed correctly

**Expected outcome:**
- State transitions: `idle` → `preparing` → `uploading` → `complete`
- imageUrl: `https://mock-s3.amazonaws.com/lego-moc-bucket/uploads/test.jpg`
- imageKey: `uploads/test.jpg`
- No actual backend or S3 calls

**Evidence:**
- Full upload flow test passes (already exists in `useS3Upload.test.ts`)
- All state transitions verified
- MSW logs show both requests intercepted

---

### Test 4: MSW Fixtures for Integration Tests

**Setup:**
- Create reusable test fixtures in `apps/web/app-wishlist-gallery/src/test/fixtures/`
- Fixtures include: sample files, presign responses, S3 responses

**Action:**
- Import fixtures into integration tests
- Use fixtures consistently across test files
- Verify fixtures match production response schemas

**Expected outcome:**
- Fixtures exported from central location
- All integration tests use shared fixtures
- No hardcoded mock data in test files
- Fixtures validate against Zod schemas

**Evidence:**
- Fixture file exists at `src/test/fixtures/s3-mocks.ts`
- At least 3 test files import and use fixtures
- All fixtures pass Zod schema validation

---

## Error Cases

### Error 1: Presign Request Failure (500)

**Setup:**
- MSW handler configured to return 500 error
- Test component calls presign endpoint

**Action:**
- Trigger upload flow
- Presign request fails with 500

**Expected:**
- Hook transitions to `error` state
- Error message: "Presign failed"
- Upload does not proceed to S3 PUT
- User sees error toast (in component tests)

**Evidence:**
- Integration test: "handles presign request failure" (already exists)
- MSW returns 500 status
- Hook error state captured correctly

---

### Error 2: S3 Upload Failure (403 Forbidden)

**Setup:**
- Presign succeeds
- S3 PUT handler returns 403 Forbidden

**Action:**
- Upload proceeds to S3 PUT
- S3 rejects with 403

**Expected:**
- Hook transitions to `error` state
- Error message: "Upload failed"
- imageUrl remains null
- Progress resets to 0

**Evidence:**
- Integration test: "handles S3 upload failure" (already exists)
- MSW S3 handler returns 403
- Error state verified

---

### Error 3: Network Timeout

**Setup:**
- MSW handler delays response indefinitely
- AbortController timeout configured (30s)

**Action:**
- Upload starts
- Request times out after 30s
- AbortController cancels request

**Expected:**
- Hook transitions to `idle` state (not `error`)
- Upload can be retried
- No error message persisted

**Evidence:**
- Integration test: "handles timeout errors" (already exists)
- AbortError caught correctly
- State resets to idle

---

### Error 4: Invalid File Type

**Setup:**
- MSW handlers active
- File with invalid MIME type (text/plain)

**Action:**
- Attempt upload with .txt file
- Validation fails before presign request

**Expected:**
- Hook transitions to `error` state
- Error: "Invalid file type. Only JPEG, PNG, WebP, GIF allowed."
- No presign request made
- No S3 request made

**Evidence:**
- Integration test: "handles validation errors" (already exists)
- MSW logs show no requests
- Validation error surfaced correctly

---

## Edge Cases (Reasonable)

### Edge 1: Large File (9.9 MB - Just Under Limit)

**Setup:**
- MSW handlers active
- File size: 9.9 MB (MAX_FILE_SIZE = 10 MB)
- Valid MIME type

**Action:**
- Trigger upload
- Verify file size validation passes
- Upload proceeds normally

**Expected:**
- No validation error
- Upload completes successfully
- Progress tracking works correctly

**Evidence:**
- Test with 9.9 MB file passes
- No size validation error
- MSW S3 PUT receives large file

---

### Edge 2: Concurrent Uploads (Multiple Files)

**Setup:**
- MSW handlers support multiple requests
- Two upload hooks initialized
- Two files uploaded simultaneously

**Action:**
1. Start upload for file A
2. Immediately start upload for file B
3. Both uploads proceed independently

**Expected:**
- Both uploads complete successfully
- No request collisions
- Each hook tracks its own state
- MSW handles concurrent requests

**Evidence:**
- Integration test with concurrent uploads passes
- Both files get unique S3 keys
- No state interference between hooks

---

### Edge 3: Cancel Upload Mid-Progress

**Setup:**
- MSW S3 PUT handler with artificial delay
- Upload in progress at 50%

**Action:**
- Call `cancel()` from hook
- AbortController cancels S3 PUT request

**Expected:**
- Upload aborted
- State resets to `idle`
- Progress resets to 0
- imageUrl remains null

**Evidence:**
- Integration test: "cancels in-progress upload" (already exists)
- AbortController signal works correctly
- State cleanup verified

---

### Edge 4: Empty File (0 bytes)

**Setup:**
- File with 0 bytes
- Valid MIME type

**Action:**
- Attempt upload
- Validation or upload may fail

**Expected:**
- Either validation error OR upload error
- Clear error message to user
- No partial upload state

**Evidence:**
- Test with 0-byte file
- Error handling verified
- No undefined behavior

---

## Required Tooling Evidence

### Backend:
**Not applicable** - This story is frontend test infrastructure only. No `.http` requests needed.

### Frontend:

#### 1. MSW Setup Files

**File:** `apps/web/app-wishlist-gallery/src/test/mocks/server.ts`
- Verify MSW server configured correctly
- Imports handlers from `handlers.ts`

**File:** `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts`
- New handlers for:
  - `GET /wishlist/images/presign`
  - `PUT https://*.amazonaws.com/*` (S3 presigned URLs)

**File:** `apps/web/app-wishlist-gallery/src/test/mocks/browser.ts`
- Browser MSW setup (for Playwright if needed)

#### 2. Test Fixtures

**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/s3-mocks.ts`
- Export mock presign responses
- Export mock S3 responses
- Export sample files (JPEG, PNG, invalid types)

**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/index.ts`
- Re-export all fixtures for easy import

#### 3. Integration Tests

**File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`
- Already exists with comprehensive coverage
- Verify all tests pass with new MSW handlers
- Add any missing edge case tests (concurrent uploads, 0-byte file)

**File:** `apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/WishlistForm.test.tsx`
- Integration test for form with image upload
- Verify MSW handlers work in component context
- Verify presign + upload flow in form submission

#### 4. Playwright E2E (Optional - Out of Scope for MVP)

**Note:** Playwright E2E tests with MSW are out of scope for this story. Playwright should use real S3 mocks or skip upload tests. This story focuses on Vitest integration tests only.

If Playwright coverage is required, it should be a separate story (WISH-2014 or later).

---

## Assertions Required

### MSW Handler Assertions:
1. Presign handler intercepts `/wishlist/images/presign` requests
2. S3 PUT handler intercepts requests to `*.amazonaws.com` domains
3. Handlers return responses matching Zod schemas
4. Handlers support error injection (500, 403, timeout)

### Integration Test Assertions:
1. All existing `useS3Upload.test.ts` tests pass (16+ tests)
2. At least 2 component tests use MSW S3 handlers (WishlistForm, AddItemPage)
3. No test makes actual network requests to S3 or backend
4. MSW request logs verify interception (in verbose test mode)

### Fixture Assertions:
1. Fixtures validate against `PresignResponseSchema`
2. Fixtures include at least 3 mock presign responses (success, 500 error, timeout)
3. Fixtures include at least 4 sample files (JPEG, PNG, WebP, invalid .txt)
4. Fixtures are imported and used in at least 3 test files

---

## Risks to Call Out

### Risk 1: S3 URL Pattern Matching
**Description:** MSW must correctly match S3 presigned URL patterns, which include query params (AWSAccessKeyId, Signature, etc.). Incorrect pattern matching could cause MSW to miss S3 requests.

**Mitigation:** Use wildcard patterns: `https://*.s3.amazonaws.com/*` and `https://*.amazonaws.com/*` to catch all S3 requests.

**Testing:** Verify MSW request log shows S3 PUT interceptions in all upload tests.

---

### Risk 2: Real S3 Calls Leaking in Tests
**Description:** If MSW handlers are not configured correctly, tests might make actual S3 calls, causing test failures in CI or requiring AWS credentials.

**Mitigation:**
- Set MSW to `onUnhandledRequest: 'error'` mode (already configured in `setup.ts`)
- Verify no AWS credentials are required to run tests
- Add test assertion to verify no real network requests

**Testing:** Run tests in CI without AWS credentials. All tests should pass.

---

### Risk 3: Fixture Drift from Production Schemas
**Description:** Mock presign responses in fixtures might drift from actual backend responses, causing false positives in tests.

**Mitigation:**
- Validate all fixtures against Zod schemas from `@repo/api-client`
- Document fixtures with source schema references
- Regenerate fixtures when schemas change

**Testing:** Add fixture validation test that parses all fixtures with Zod schemas.

---

### Risk 4: MSW Performance Overhead
**Description:** MSW adds overhead to test execution. Large test suites might become slow.

**Mitigation:**
- MSW is already used in the repo (see `setup.ts`)
- Overhead is acceptable for integration tests
- If performance degrades, consider selective MSW usage (only for upload tests)

**Testing:** Run full test suite and verify execution time is reasonable (< 30s for unit + integration tests).

---

### Risk 5: Browser MSW Setup for Playwright (If Needed)
**Description:** Playwright E2E tests might require different MSW setup (browser mode vs. Node mode).

**Mitigation:**
- Mark Playwright MSW setup as out of scope for this story
- Use `browser.ts` MSW setup only if explicitly required
- Defer Playwright E2E S3 mocking to future story

**Testing:** Not applicable for this story. Vitest integration tests only.

---

## Non-Blocking Concerns (Future Work)

1. **Playwright E2E S3 Mocking:** Requires browser-mode MSW or alternative mocking strategy. Defer to future story.
2. **Visual Regression for Upload Progress:** Chromatic snapshots of upload progress states. Defer to UX polish story.
3. **Real S3 Integration Tests:** Optional end-to-end tests against real S3 (dev environment). Out of scope for unit/integration tests.
4. **Load Testing for Concurrent Uploads:** Stress test with 10+ concurrent uploads. Out of scope for MVP.
