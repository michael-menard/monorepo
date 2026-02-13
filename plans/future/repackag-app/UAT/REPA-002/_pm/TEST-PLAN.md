# Test Plan: REPA-002 - Migrate Upload Client Functions

## Scope Summary

- **Endpoints touched**: POST `/api/mocs/uploads/finalize`
- **UI touched**: No (pure backend/infrastructure migration)
- **Data/storage touched**: No (code migration only, no schema changes)

---

## Happy Path Tests

### Test 1: XHR Upload - Single File Success
- **Setup**:
  - Mock presigned URL endpoint
  - Prepare 1MB test file (JPEG image)
  - Initialize upload manager from `@repo/upload`
- **Action**:
  - Call `uploadFile(file, presignedUrl)` with progress callback
  - Observe progress events (0%, 25%, 50%, 75%, 100%)
- **Expected outcome**:
  - Upload completes successfully (HTTP 200)
  - Progress callback invoked with increasing percentages
  - Function returns `{ success: true, data: { key: "..." } }`
- **Evidence**:
  - Progress callback logs showing 0-100% progression
  - Final success response captured
  - No error logs in @repo/logger output

### Test 2: Upload Manager - Concurrent Uploads
- **Setup**:
  - Mock presigned URLs for 5 files
  - Create upload manager with `maxConcurrent: 3`
  - Prepare 5 test files (various sizes: 500KB to 2MB)
- **Action**:
  - Add all 5 files to upload queue
  - Start upload manager
  - Monitor concurrent upload count
- **Expected outcome**:
  - Maximum 3 uploads run concurrently at any time
  - All 5 uploads complete successfully
  - Queue processes in order (FIFO)
  - Completion callback fires with all results
- **Evidence**:
  - Upload manager logs showing concurrent limit respected
  - All files uploaded with success status
  - Completion callback invoked with 5 results

### Test 3: Finalize Client - Successful Finalization
- **Setup**:
  - Mock POST `/api/mocs/uploads/finalize` to return 200 with MOC data
  - Prepare finalize request payload (user session, file keys)
  - Use MSW to mock API response
- **Action**:
  - Call `finalizeSession({ sessionId, fileKeys, csrfToken })`
  - Wait for promise resolution
- **Expected outcome**:
  - API request sent with correct payload and CSRF token
  - Function returns `{ success: true, data: { slug: "...", status: "published", keys: [...] } }`
  - Request ID extracted from `X-Request-Id` header
- **Evidence**:
  - MSW intercepted request with correct body structure
  - CSRF token included in request headers
  - Response data validated against FinalizeSuccessResponse schema
  - Request ID logged via @repo/logger

### Test 4: Import Site - InstructionsNewPage Upload Flow
- **Setup**:
  - Integration test: Mount InstructionsNewPage component
  - Mock upload and finalize endpoints
  - Mock authenticated user session
- **Action**:
  - Select files via file input
  - Trigger upload
  - Monitor upload progress
  - Complete finalization
- **Expected outcome**:
  - Files upload successfully via `@repo/upload`
  - Finalize function from `@repo/upload` called correctly
  - No broken imports or runtime errors
  - Page navigates to success state
- **Evidence**:
  - Component renders without errors
  - Upload progress UI updates correctly
  - Success toast/notification shown
  - Browser console has no errors

---

## Error Cases

### Error 1: Network Failure During Upload
- **Setup**:
  - Mock presigned URL endpoint to fail with network error (ERR_NETWORK)
  - Prepare test file
- **Action**:
  - Call `uploadFile(file, presignedUrl)`
  - Simulate network disconnect mid-upload
- **Expected outcome**:
  - Function returns `{ success: false, error: { code: 'NETWORK_ERROR', message: '...' } }`
  - Error logged via @repo/logger with error code
  - No unhandled promise rejection
- **Evidence**:
  - Error response structure matches UploadError schema
  - Logger output contains error with context
  - Function does not throw

### Error 2: Finalize 409 Conflict (Slug Already Exists)
- **Setup**:
  - Mock POST `/api/mocs/uploads/finalize` to return 409 with conflict details
  - Response body: `{ error: 'SLUG_CONFLICT', suggestedSlug: 'alternate-slug-123' }`
- **Action**:
  - Call `finalizeSession({ sessionId, fileKeys, csrfToken })`
- **Expected outcome**:
  - Function returns `{ success: false, error: { code: 'CONFLICT', suggestedSlug: 'alternate-slug-123' } }`
  - FinalizeError thrown with `suggestedSlug` property
  - Error logged with suggested alternative
- **Evidence**:
  - Error response validated against ConflictErrorDetails schema
  - suggestedSlug extracted correctly
  - Error code is 'CONFLICT'

### Error 3: Finalize 429 Rate Limit
- **Setup**:
  - Mock POST `/api/mocs/uploads/finalize` to return 429
  - Response headers: `Retry-After: 60`
- **Action**:
  - Call `finalizeSession({ sessionId, fileKeys, csrfToken })`
- **Expected outcome**:
  - Function returns `{ success: false, error: { code: 'RATE_LIMITED', retryAfter: 60 } }`
  - Retry-After value extracted from headers
  - Error logged with retry delay
- **Evidence**:
  - Error response includes retryAfter field
  - Value parsed correctly from header (60 seconds)
  - Error code is 'RATE_LIMITED'

### Error 4: Finalize 400 File Validation Errors
- **Setup**:
  - Mock POST `/api/mocs/uploads/finalize` to return 400
  - Response body: `{ error: 'VALIDATION_ERROR', fileErrors: [{ key: 'file1.jpg', reason: 'File too large' }] }`
- **Action**:
  - Call `finalizeSession({ sessionId, fileKeys, csrfToken })`
- **Expected outcome**:
  - Function returns `{ success: false, error: { code: 'VALIDATION_ERROR', fileErrors: [...] } }`
  - FileValidationError array extracted correctly
  - Each file error includes key and reason
- **Evidence**:
  - Error response validated against FileValidationError schema
  - fileErrors array structure correct
  - Error code is 'VALIDATION_ERROR'

### Error 5: Missing CSRF Token
- **Setup**:
  - Mock finalize endpoint to return 403 (CSRF validation failed)
  - Call finalizeSession without csrfToken
- **Action**:
  - Call `finalizeSession({ sessionId, fileKeys })`
- **Expected outcome**:
  - API returns 403 Forbidden
  - Function returns `{ success: false, error: { code: 'FORBIDDEN', message: 'CSRF token required' } }`
  - Error logged with CSRF context
- **Evidence**:
  - Request rejected by server with 403
  - Error response includes FORBIDDEN code
  - Logger output mentions CSRF token

### Error 6: Upload Cancellation
- **Setup**:
  - Mock slow upload (large file, throttled response)
  - Create AbortController
- **Action**:
  - Start `uploadFile(file, presignedUrl, { signal: abortController.signal })`
  - After 2 seconds, call `abortController.abort()`
- **Expected outcome**:
  - Upload terminates immediately
  - Function returns `{ success: false, error: { code: 'CANCELLED' } }`
  - Progress callbacks stop firing
- **Evidence**:
  - Upload request aborted (network panel shows cancelled)
  - Error code is 'CANCELLED'
  - No memory leaks (progress listeners cleaned up)

---

## Edge Cases (Reasonable)

### Edge 1: Empty File Upload
- **Setup**:
  - Create 0-byte file
  - Attempt to upload
- **Action**:
  - Call `uploadFile(emptyFile, presignedUrl)`
- **Expected outcome**:
  - Upload either succeeds with warning OR fails with validation error
  - Behavior documented clearly
- **Evidence**:
  - Consistent behavior across file types
  - Warning or error logged via @repo/logger

### Edge 2: Very Large File (>100MB)
- **Setup**:
  - Create 150MB test file
  - Mock presigned URL with slow response
- **Action**:
  - Call `uploadFile(largeFile, presignedUrl)` with progress callback
  - Monitor progress updates and memory usage
- **Expected outcome**:
  - Progress callback fires regularly (every 5-10%)
  - Upload completes or times out gracefully
  - No memory leaks
- **Evidence**:
  - Progress updates logged
  - Memory usage stable (no runaway growth)
  - Timeout error logged if exceeds limit

### Edge 3: Concurrent Finalize Requests (Double Submit)
- **Setup**:
  - Mock finalize endpoint with 200ms delay
  - Prepare single session ID
- **Action**:
  - Call `finalizeSession()` twice in rapid succession with same sessionId
  - First request in-flight when second starts
- **Expected outcome**:
  - First request completes successfully
  - Second request returns 409 (already finalized) OR deduplicates
  - No race condition errors
- **Evidence**:
  - Both requests handled gracefully
  - No unhandled exceptions
  - State remains consistent (no double-finalization)

### Edge 4: Upload Manager - Cancel All Uploads
- **Setup**:
  - Start upload manager with 10 files queued
  - Let 3 uploads start
- **Action**:
  - Call `uploadManager.cancelAll()`
- **Expected outcome**:
  - All in-progress uploads cancel immediately
  - Queued uploads never start
  - Completion callback fires with cancelled status for all files
- **Evidence**:
  - All AbortControllers triggered
  - Queue cleared
  - Completion callback includes 10 cancelled results

### Edge 5: Invalid Presigned URL (Expired or Malformed)
- **Setup**:
  - Provide expired presigned URL (returns 403 from S3)
- **Action**:
  - Call `uploadFile(file, expiredUrl)`
- **Expected outcome**:
  - Upload fails with 403 error
  - Function returns `{ success: false, error: { code: 'FORBIDDEN', message: 'Presigned URL expired' } }`
  - Error logged with URL context (sanitized)
- **Evidence**:
  - S3 403 error captured
  - Error response structure correct
  - URL not logged verbatim (security)

### Edge 6: Unicode Filename Handling
- **Setup**:
  - Create file with Unicode characters in name: `测试文件.jpg`, `Тест.pdf`, `emoji-😀.png`
- **Action**:
  - Upload file and finalize session
- **Expected outcome**:
  - Filename preserved correctly through upload and finalize
  - No encoding errors
  - MOC data includes correct filename
- **Evidence**:
  - API request payload has properly encoded filename
  - Response data includes correct Unicode characters
  - No character corruption

---

## Required Tooling Evidence

### Backend Testing
**Required `.http` requests** (for manual testing):
```http
### Finalize Upload - Success
POST {{apiBaseUrl}}/api/mocs/uploads/finalize
Content-Type: application/json
X-CSRF-Token: {{csrfToken}}

{
  "sessionId": "session-123",
  "fileKeys": ["uploads/user-456/file1.jpg"],
  "title": "Test MOC",
  "description": "Test description"
}

### Finalize Upload - 409 Conflict
# (Mock returns conflict)

### Finalize Upload - 429 Rate Limit
# (Mock returns rate limit)

### Finalize Upload - 400 Validation Error
# (Mock returns validation errors)
```

**Required assertions**:
- Status code: 200 (success), 409 (conflict), 429 (rate limit), 400 (validation)
- Response body structure matches Zod schemas
- Headers: `X-Request-Id` present, `Retry-After` present (for 429)
- CSRF token validated (403 if missing)

### Frontend Testing (Integration)
**Playwright runs required**:
1. **Upload flow - main-app**:
   - Navigate to `/instructions/new`
   - Upload files via file input
   - Assert upload progress UI updates
   - Assert finalize success toast shown
   - Assert redirect to MOC detail page

2. **Upload flow - app-instructions-gallery**:
   - Navigate to gallery upload page
   - Upload files (anonymous flow)
   - Assert upload progress UI updates
   - Assert finalize success state
   - Assert MOC appears in gallery

**Required assertions**:
- No JavaScript errors in console
- Upload progress bar updates correctly (0-100%)
- Success notification shown
- Network requests to `/api/mocs/uploads/finalize` successful
- MOC data rendered correctly

**Required artifacts**:
- Screenshot of success state
- Trace file if upload fails (for debugging)
- Video recording of full flow (optional, for complex failures)

### Unit Testing (Vitest)
**Required test files**:
1. `packages/core/upload/client/__tests__/xhr.test.ts` - XHR upload functions
2. `packages/core/upload/client/__tests__/manager.test.ts` - Upload manager
3. `packages/core/upload/client/__tests__/finalize.test.ts` - Finalize client
4. `apps/web/main-app/src/routes/pages/__tests__/InstructionsNewPage.test.tsx` - Integration test
5. `apps/web/app-instructions-gallery/src/pages/__tests__/upload-page.test.tsx` - Integration test

**MSW Mocks Required**:
```typescript
// Mock presigned URL upload
rest.put('https://s3.amazonaws.com/bucket/uploads/*', (req, res, ctx) => {
  return res(ctx.status(200))
})

// Mock finalize endpoint
rest.post('/api/mocs/uploads/finalize', (req, res, ctx) => {
  return res(ctx.status(200), ctx.json({ slug: 'test-moc', status: 'published' }))
})

// Mock 409 conflict
rest.post('/api/mocs/uploads/finalize', (req, res, ctx) => {
  return res(ctx.status(409), ctx.json({ error: 'SLUG_CONFLICT', suggestedSlug: 'alt-slug' }))
})

// Mock 429 rate limit
rest.post('/api/mocs/uploads/finalize', (req, res, ctx) => {
  return res(ctx.status(429), ctx.set('Retry-After', '60'))
})

// Mock 400 validation error
rest.post('/api/mocs/uploads/finalize', (req, res, ctx) => {
  return res(ctx.status(400), ctx.json({
    error: 'VALIDATION_ERROR',
    fileErrors: [{ key: 'file1.jpg', reason: 'File too large' }]
  }))
})
```

**Coverage Requirements**:
- Minimum 45% global coverage (per CLAUDE.md)
- Critical paths (happy path, error handling) must have 80%+ coverage
- Progress callbacks tested with multiple progress events
- AbortController cancellation tested

---

## Risks to Call Out

### Risk 1: Import Site Coverage
**Description**: With 52 import sites to update, there's high risk of missing one or more files.

**Mitigation**:
- Run `pnpm build` after import updates to catch broken imports
- Run `pnpm check-types:all` to verify TypeScript compilation
- Use IDE global find to verify all `@repo/upload-client` references removed
- Run all test suites to catch runtime import errors

**Test Strategy**:
- After migration, run full CI pipeline (build + test + type-check)
- Manually grep for old imports: `rg "@repo/upload-client" --type ts`
- Verify no old imports remain in codebase

### Risk 2: CSRF Token Handling Preservation
**Description**: Finalize function must preserve exact CSRF token behavior from old implementation.

**Mitigation**:
- Copy exact CSRF token extraction logic from old finalizeClient.ts
- Test with missing CSRF token (should fail with 403)
- Test with invalid CSRF token (should fail with 403)
- Verify CSRF token sent in correct header

**Test Strategy**:
- Unit test: CSRF token included in request headers
- Integration test: Authenticated upload flow sends correct token
- Error test: Missing token returns proper error

### Risk 3: Error Handling Regression
**Description**: Migrating error handling logic may introduce subtle behavior changes.

**Mitigation**:
- Port exact error handling logic from old implementation
- Test all error codes (409, 429, 400, 403, 500)
- Verify error message formats unchanged
- Test error logging output

**Test Strategy**:
- Create error handling test matrix (status code × error type)
- Assert error response structure matches old behavior
- Verify backward compatibility of error codes

### Risk 4: Progress Callback Behavior
**Description**: Upload progress callbacks must fire with same frequency and format.

**Mitigation**:
- Keep XHR progress listener logic unchanged
- Test progress callbacks with various file sizes
- Verify progress events fire at expected intervals (every 5-10%)

**Test Strategy**:
- Unit test: Mock XHR progress events, assert callback invocations
- Integration test: Upload real files, verify UI progress updates
- Performance test: Verify no excessive callback firing (performance impact)

### Risk 5: Test Coverage Gap
**Description**: Migration may miss edge cases covered by old tests but not documented.

**Mitigation**:
- Port all existing tests from `@repo/upload-client/__tests__/`
- Review old test files for edge cases
- Add missing test coverage for finalize logic

**Test Strategy**:
- Run test coverage report after migration
- Compare coverage to baseline (should not decrease)
- Identify and test any uncovered branches

### Risk 6: Anonymous Upload Flow (app-instructions-gallery)
**Description**: Anonymous upload flow differs from authenticated flow in session handling.

**Mitigation**:
- Test both authenticated and anonymous flows separately
- Verify useUploaderSession differences preserved
- Test session token handling for anonymous users

**Test Strategy**:
- Integration test: Upload as authenticated user (main-app)
- Integration test: Upload as anonymous user (app-instructions-gallery)
- Assert session handling behavior correct for each flow

---

## Test Execution Checklist

**Pre-Migration**:
- [ ] Document baseline test coverage (run `pnpm test:all --coverage`)
- [ ] List all existing tests in `@repo/upload-client/__tests__/`
- [ ] Verify MSW mocks available for finalize endpoint

**During Migration**:
- [ ] Port all tests from `@repo/upload-client` to `@repo/upload/client`
- [ ] Add new tests for finalize functionality (happy path, errors, edge cases)
- [ ] Run tests in isolation: `pnpm test packages/core/upload`
- [ ] Verify test coverage meets 45% threshold

**Post-Migration**:
- [ ] Run full test suite: `pnpm test:all`
- [ ] Run type check: `pnpm check-types:all`
- [ ] Run build: `pnpm build`
- [ ] Run Playwright tests: `pnpm test:e2e` (upload flows)
- [ ] Manual smoke test: Upload a file in main-app and app-instructions-gallery
- [ ] Verify no console errors or warnings

**Rollback Test**:
- [ ] If tests fail, verify old `@repo/upload-client` package still functional
- [ ] Document rollback procedure (revert imports, restore old files)

---

**Test Plan Complete** - Ready for implementation with comprehensive coverage of happy paths, error cases, edge cases, and rollback scenarios.
