# Dev Feasibility - WISH-2011: Test infrastructure for MSW mocking of S3 and API calls

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- MSW is already integrated in the repo (`apps/web/app-wishlist-gallery/src/test/setup.ts` shows server setup)
- S3 upload tests already exist (`useS3Upload.test.ts` with 16+ passing tests)
- Infrastructure is well-established; this story is about **formalizing and documenting** existing patterns
- No new dependencies required (MSW already in package.json)
- Scope is narrow: Add MSW handlers + fixtures, no implementation code changes

---

## Likely Change Surface (Core Only)

### Files to Modify/Create:

#### 1. MSW Handlers (New)
**File:** `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts`
- **Change:** Add 2 new handlers:
  - `http.get('/wishlist/images/presign', ...)` - Mock presign URL endpoint
  - `http.put('https://*.amazonaws.com/*', ...)` - Mock S3 PUT requests
- **Complexity:** Low - MSW handler patterns already established in file

#### 2. Test Fixtures (New)
**Files:**
- `apps/web/app-wishlist-gallery/src/test/fixtures/s3-mocks.ts` (new)
- `apps/web/app-wishlist-gallery/src/test/fixtures/index.ts` (update or new)

**Content:**
- Export mock presign responses (success, 500 error, timeout)
- Export mock S3 responses (200 OK, 403 Forbidden)
- Export sample files (JPEG, PNG, WebP, invalid .txt)
- Validate fixtures against Zod schemas from `@repo/api-client`

**Complexity:** Low - Static data exports

#### 3. Integration Tests (Minor Updates)
**File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`
- **Change:** Already has 16+ tests covering upload flows
- **Action:** Verify all tests still pass with new MSW handlers
- **Add:** Edge case tests (concurrent uploads, 0-byte file) if missing

**File:** `apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/WishlistForm.test.tsx`
- **Change:** Add integration test for image upload in form context
- **Complexity:** Medium - Requires rendering form, triggering upload, asserting state

**File:** `apps/web/app-wishlist-gallery/src/pages/__tests__/AddItemPage.test.tsx`
- **Change:** Add integration test for full add item flow with image upload
- **Complexity:** Medium - Page-level test with MSW mocking

#### 4. Documentation (Optional but Recommended)
**File:** `apps/web/app-wishlist-gallery/src/test/fixtures/README.md` (new)
- Document fixture structure
- Explain how to regenerate fixtures when schemas change
- Provide examples of using fixtures in tests

---

## MVP-Critical Risks

**None identified.** This story has no MVP-critical risks because:
1. It does not block any user-facing features
2. It improves test reliability, which is a quality/DevEx improvement, not a blocker
3. Existing tests already pass; new handlers will formalize existing mocking patterns

---

## Missing Requirements for MVP

**None.** Story scope is clear and sufficient for MVP.

### Recommendations (Non-Blocking):
1. **Fixture Validation Test:** Add a test that validates all fixtures against Zod schemas to prevent drift.
   - **Rationale:** Ensures fixtures stay in sync with production schemas.
   - **Effort:** Low (~10 lines of test code)

2. **MSW Request Logging in Verbose Mode:** Add optional verbose logging to MSW handlers for debugging.
   - **Rationale:** Helps developers debug test failures.
   - **Effort:** Low (configure MSW logger in `setup.ts`)

3. **CI Verification:** Add CI job that runs tests without AWS credentials to ensure no S3 leakage.
   - **Rationale:** Catch accidental real S3 calls in tests.
   - **Effort:** Low (add env check to CI config)

---

## MVP Evidence Expectations

### Required Evidence:

1. **All Integration Tests Pass:**
   - `pnpm test apps/web/app-wishlist-gallery` runs successfully
   - All existing `useS3Upload.test.ts` tests pass (16+ tests)
   - No test failures related to missing AWS credentials

2. **MSW Handlers Verified:**
   - Test output shows MSW intercepting requests (verbose mode)
   - No unhandled network requests in test logs
   - Handlers return responses matching Zod schemas

3. **Fixtures Exist and Validate:**
   - `src/test/fixtures/s3-mocks.ts` exists
   - Fixtures export at least 3 presign responses and 4 sample files
   - Fixture validation test passes (validates against `PresignResponseSchema`)

4. **Component Tests Use MSW:**
   - At least 2 component tests (`WishlistForm`, `AddItemPage`) use MSW S3 handlers
   - Tests cover presign + upload flow in component context

### CI/Deploy Checkpoints:

1. **Pre-commit:** ESLint and TypeScript checks pass
2. **Pre-push:** All tests pass, including new MSW-based tests
3. **CI:** Test suite runs without AWS credentials in environment

---

## Architecture Notes

### MSW Handler Patterns

**Presign Handler:**
```typescript
// apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts
http.get(`${API_BASE_URL}/wishlist/images/presign`, ({ request }) => {
  const url = new URL(request.url)
  const fileName = url.searchParams.get('fileName')
  const mimeType = url.searchParams.get('mimeType')

  return HttpResponse.json({
    presignedUrl: `https://mock-s3.amazonaws.com/lego-moc-bucket/uploads/${fileName}`,
    key: `uploads/${fileName}`,
  })
})
```

**S3 PUT Handler:**
```typescript
// Match all S3 PUT requests (presigned URLs)
http.put('https://*.amazonaws.com/*', ({ request }) => {
  // Simulate progress (optional)
  return new HttpResponse(null, { status: 200 })
})
```

### Fixture Structure

**File:** `src/test/fixtures/s3-mocks.ts`
```typescript
import { z } from 'zod'
import { PresignResponseSchema } from '@repo/api-client/schemas/wishlist'

export const mockPresignSuccess = {
  presignedUrl: 'https://mock-s3.amazonaws.com/lego-moc-bucket/uploads/test.jpg',
  key: 'uploads/test.jpg',
} satisfies z.infer<typeof PresignResponseSchema>

export const mockPresignError500 = {
  error: 'Internal server error',
  code: 'PRESIGN_FAILED',
}

export const mockSampleJpeg = new File(['mock-jpeg-content'], 'test.jpg', {
  type: 'image/jpeg',
})

export const mockSamplePng = new File(['mock-png-content'], 'test.png', {
  type: 'image/png',
})

export const mockInvalidFile = new File(['mock-text-content'], 'test.txt', {
  type: 'text/plain',
})
```

---

## Future Risks (Non-MVP)

These risks are important but do not block MVP:

### Risk 1: MSW Performance Overhead in Large Test Suites
**Impact:** Test suite execution time may increase as more tests use MSW.

**Timeline:** Monitor in Phase 3+ as test suite grows.

**Mitigation:**
- Use MSW selectively (only for upload/network tests)
- Consider test parallelization in CI
- Profile test execution time

### Risk 2: Playwright E2E MSW Setup
**Impact:** Playwright E2E tests require different MSW setup (browser mode vs. Node mode).

**Timeline:** Defer to separate story (WISH-2014 or later).

**Mitigation:**
- Mark Playwright MSW as out of scope for this story
- Use alternative E2E mocking strategy for Playwright (e.g., route mocking)
- Document browser MSW setup in future story

### Risk 3: Fixture Maintenance Burden
**Impact:** As schemas evolve, fixtures may become outdated, causing false test positives.

**Timeline:** Ongoing maintenance as API evolves.

**Mitigation:**
- Add fixture validation test (validates against Zod schemas)
- Document fixture update process in README
- Use TypeScript `satisfies` to catch type mismatches at compile time

---

## Scope Tightening Suggestions

### IN SCOPE (MVP):
- MSW handlers for presign and S3 PUT
- Test fixtures for presign responses and sample files
- Verify existing `useS3Upload.test.ts` tests pass
- Add 2-3 component-level integration tests (WishlistForm, AddItemPage)

### OUT OF SCOPE (Future):
- Playwright E2E MSW setup (browser mode) → Defer to WISH-2014
- Visual regression tests for upload progress → Defer to UX polish story
- Load testing for concurrent uploads → Defer to performance story
- Real S3 integration tests (dev environment) → Out of scope for unit/integration tests

---

## Dependencies

### Internal Package Dependencies:
- `@repo/api-client` - Zod schemas for validation (`PresignResponseSchema`, etc.)
- `@repo/upload-client` - Upload utility (`uploadToPresignedUrl`)
- `msw` - Already installed (see `package.json`)
- `vitest` - Test runner (already configured)

### External Dependencies:
**None.** All required packages already installed.

### Blocked By:
- WISH-2007 (Run Migration) - Database must exist for backend presign endpoint to work
  - **Note:** This story is test-only, so it can proceed if presign endpoint is mocked correctly. No actual backend dependency.

---

## Proof of Work

### Required Artifacts:

1. **MSW Handlers:**
   - `handlers.ts` updated with presign and S3 PUT handlers
   - Handlers return responses matching Zod schemas
   - Handlers support error injection (500, 403, timeout)

2. **Fixtures:**
   - `src/test/fixtures/s3-mocks.ts` created
   - Exports mock presign responses (success, error)
   - Exports mock S3 responses (200, 403)
   - Exports sample files (JPEG, PNG, WebP, invalid .txt)

3. **Integration Tests:**
   - All existing `useS3Upload.test.ts` tests pass (16+ tests)
   - At least 2 component tests use MSW handlers (WishlistForm, AddItemPage)
   - Fixture validation test added (validates against Zod schemas)

4. **CI Verification:**
   - Test suite runs in CI without AWS credentials
   - No unhandled network requests in test logs
   - All tests green in PR

---

## Complexity Assessment

**Overall Complexity:** **Low**

**Breakdown:**
- MSW handler setup: Low (patterns already established)
- Fixture creation: Low (static data exports)
- Test updates: Low-Medium (verify existing tests, add 2-3 component tests)
- Documentation: Low (optional README for fixtures)

**Estimated Effort:** 1-2 story points (small story)

**Parallel Work Opportunities:**
- MSW handler creation and fixture creation can happen in parallel
- Component test updates can happen after handlers are ready

---

## Implementation Notes

### Step-by-Step Approach:

1. **Create Fixtures First:**
   - Reduces duplication across tests
   - Provides clear examples of expected responses
   - Validates against Zod schemas early

2. **Add MSW Handlers:**
   - Use fixtures in handlers for consistency
   - Test handlers in isolation (verify they return correct responses)

3. **Update Integration Tests:**
   - Verify existing `useS3Upload.test.ts` tests still pass
   - Add missing edge case tests (concurrent uploads, 0-byte file)

4. **Add Component Tests:**
   - `WishlistForm` test: Form submission with image upload
   - `AddItemPage` test: Full add item flow with image upload

5. **Verify CI:**
   - Run tests in CI without AWS credentials
   - Verify no unhandled network requests

---

## Reuse Plan

### Reuse Existing Infrastructure:
- **MSW Setup:** Already configured in `src/test/setup.ts` (server.listen, server.resetHandlers, server.close)
- **MSW Handlers:** Extend existing `handlers.ts` file (health check handler already exists)
- **Test Patterns:** Follow existing test patterns in `useS3Upload.test.ts`

### Reusable Components for Future Stories:
- **Fixtures:** Can be reused in future upload-related tests (WISH-2013 file validation, etc.)
- **MSW Handlers:** Can be extended for additional S3 operations (DELETE, LIST, etc.)
- **Test Utilities:** Consider creating `createMockFile()` utility for generating test files

---

## Conclusion

**Feasible for MVP:** ✅ Yes

**Confidence:** High

**Key Strengths:**
- MSW already integrated
- Existing tests provide solid foundation
- Narrow scope, low risk
- No new dependencies

**Key Risks:**
- None for MVP (all risks are future concerns)

**Recommendation:**
- Proceed with implementation
- Add fixture validation test for long-term maintainability
- Document fixture structure for future developers
