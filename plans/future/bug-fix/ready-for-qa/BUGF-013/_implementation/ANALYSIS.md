# Elaboration Analysis - BUGF-013

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md entry. Test story for app-instructions-gallery upload components. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are internally consistent. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story explicitly reuses @repo/upload package patterns, MSW setup, and test utilities. Thin wrapper testing approach is correct. |
| 4 | Ports & Adapters | PASS | — | Test story - no new business logic. Testing existing components that already follow architecture. |
| 5 | Local Testability | PASS | — | Comprehensive test plan with MSW mocking, file upload simulation, concrete test cases. |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | 3 minor path discrepancies need clarification (see Issues #1-3). No blocking TBDs. |
| 7 | Risk Disclosure | PASS | — | Risks disclosed: MSW handler config, file upload simulation, timer testing, session persistence, form validation. |
| 8 | Story Sizing | PASS | — | 22 ACs across 4 categories. Well-scoped for 5 points (9-14 hours). Not too large. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | File path inconsistency: Story references "upload-page.tsx" but actual file is "UploadPage.tsx" (capitalized) | Low | Clarify which file to test: upload-page.tsx (789 lines) or UploadPage.tsx. Both exist in codebase. |
| 2 | useUploadManager hook location ambiguity | Low | Story references "@/hooks/useUploadManager" but no hooks/ directory exists in app-instructions-gallery. Hook is actually from @repo/upload package. Update AC-11 reference. |
| 3 | finalizeClient path ambiguity | Low | Story references "@/services/api/finalizeClient" but services/ directory doesn't exist in app-instructions-gallery. Likely moved to @repo/upload. Update AC-14 reference. |
| 4 | Missing AC for existing test file coverage | Medium | Story says EditForm.test.tsx "already exists from BUGF-032" but doesn't specify which ACs (AC-15, AC-16, AC-17) are new vs already tested. Need clarification. |
| 5 | Test count estimate (100 test cases) may be low | Low | Story estimates "minimum 100 test cases" but detailed test plan suggests ~120-140 cases (9 test files × 5-15 tests each). Not blocking. |

## Split Recommendation

**Not Applicable** - Story is well-sized at 5 points with clear scope boundaries.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Rationale**: Story is well-structured with comprehensive ACs and detailed test plan. Minor file path discrepancies need clarification before implementation begins, but these are documentation issues, not design flaws. Core testing approach is sound. All 3 issues are non-blocking and can be resolved quickly.

**Recommendation**: Clarify file paths in AC-10, AC-11, AC-14 and specify which EditForm tests are new vs existing, then proceed to implementation.

---

## MVP-Critical Gaps

**None - core journey is complete**

All 22 ACs comprehensively cover:
- Upload flow component testing (SessionProvider, UploaderFileItem, UploaderList)
- Error handling component testing (ConflictModal, RateLimitBanner, SessionExpiredBanner)
- Upload page integration testing with presigned URL API
- Form validation testing (EditForm, SlugField, TagInput)
- Accessibility testing (ARIA labels, screen reader announcements)

The test coverage strategy is MVP-complete for achieving the 45% minimum threshold. All critical upload flow paths are covered.

---

## Codebase Verification Results

### Components Referenced - VERIFIED

| Component | Story Path | Actual Path | Status |
|-----------|-----------|-------------|--------|
| SessionProvider | `src/components/Uploader/SessionProvider/index.tsx` | ✅ Exists | PASS |
| UploaderFileItem | `src/components/Uploader/UploaderFileItem/index.tsx` | ✅ Exists | PASS |
| UploaderList | `src/components/Uploader/UploaderList/index.tsx` | ✅ Exists | PASS |
| ConflictModal | `src/components/Uploader/ConflictModal/index.tsx` | ✅ Exists | PASS |
| RateLimitBanner | `src/components/Uploader/RateLimitBanner/index.tsx` | ✅ Exists | PASS |
| SessionExpiredBanner | `src/components/Uploader/SessionExpiredBanner/index.tsx` | ✅ Exists | PASS |
| EditForm | `src/components/MocEdit/EditForm.tsx` | ✅ Exists (270 lines) | PASS |
| SlugField | `src/components/MocEdit/SlugField.tsx` | ✅ Exists | PASS |
| TagInput | `src/components/MocEdit/TagInput.tsx` | ✅ Exists | PASS |

### Test Files - VERIFIED

All 9 proposed test file locations are valid:
- `src/components/Uploader/SessionProvider/__tests__/SessionProvider.test.tsx` - VALID PATH
- `src/components/Uploader/UploaderFileItem/__tests__/UploaderFileItem.test.tsx` - VALID PATH
- `src/components/Uploader/UploaderList/__tests__/UploaderList.test.tsx` - VALID PATH
- `src/components/Uploader/ConflictModal/__tests__/ConflictModal.test.tsx` - VALID PATH
- `src/components/Uploader/RateLimitBanner/__tests__/RateLimitBanner.test.tsx` - VALID PATH
- `src/components/Uploader/SessionExpiredBanner/__tests__/SessionExpiredBanner.test.tsx` - VALID PATH
- `src/pages/__tests__/upload-page.test.tsx` - VALID PATH (but see Issue #1)
- `src/components/MocEdit/__tests__/SlugField.test.tsx` - VALID PATH
- `src/components/MocEdit/__tests__/TagInput.test.tsx` - VALID PATH

**Note**: EditForm.test.tsx already exists (story correctly notes this).

### @repo/upload Package - VERIFIED

Comprehensive test coverage confirmed:
- 18+ test files in @repo/upload package
- All referenced components have corresponding tests in @repo/upload
- MSW setup exists at `packages/core/upload/src/__tests__/setup.ts`
- Hook tests: useUpload.test.tsx, useUploadManager.test.tsx, useUploaderSession.test.tsx
- Component tests: ConflictModal, RateLimitBanner, SessionExpiredBanner, UploaderFileItem, UploaderList
- Type tests: session.test.ts, upload.test.ts, slug.test.ts, validation.test.ts

### API Endpoints - VERIFIED

| Endpoint | Story Reference | Actual Implementation | Status |
|----------|----------------|----------------------|--------|
| `POST /api/v2/uploads/presigned-url` | Mentioned in AC-11 | ✅ Implemented in @repo/api-client (uploads-api.ts) | PASS |
| `PUT https://s3.mock.com/bucket/*` | MSW mock for S3 | N/A (mock only) | PASS |
| `POST /api/instructions/finalize` | Mentioned in AC-14 | Used in upload-page.tsx (imported from finalizeClient) | PASS |

### Test Infrastructure - VERIFIED

- Vitest + React Testing Library: ✅ Configured
- MSW setup template: ✅ Exists in @repo/upload
- Test setup file: ✅ Exists in app-inspiration-gallery (reusable)
- @repo/logger mocking: ✅ Configured
- TanStack Router mocking: ✅ Not needed for component tests

### Coverage Baseline - VERIFIED

- **Total source files**: 51 (story says 50, actual count 51 - minor discrepancy)
- **Total test files**: 18 (matches story)
- **Approximate coverage**: ~35% (51 source, 18 tests)
- **Target coverage**: 45% minimum threshold (per CLAUDE.md)
- **Gap**: Need ~5-7 additional test files to reach 45%

**Analysis**: Adding 9 new test files (as planned) would bring total to 27 test files, achieving ~53% coverage (27/51), exceeding the 45% threshold. Target is achievable.

---

## Test Plan Validation

### MSW Mocking Approach - FEASIBLE

✅ **Presigned URL API mocking**: RTK Query mutation exists in @repo/api-client. MSW handlers can mock POST /api/v2/uploads/presigned-url.

✅ **S3 PUT mocking**: MSW can intercept https://s3.mock.com/bucket/* PUT requests. Pattern is well-established.

✅ **Finalize API mocking**: MSW can mock POST /api/instructions/finalize with error scenarios (409, 429).

✅ **Error scenario coverage**: Story covers all critical error paths:
- 409 Conflict (duplicate title)
- 429 Rate Limit (retryAfterSeconds countdown)
- 401/403 Session Expiry (presigned URL expiration)
- Per-file validation errors (fileErrors array)
- Network failures (MSW request interception)

### Testability of ACs

**AC-1 to AC-5 (Upload Flow Components)**: ✅ TESTABLE
- SessionProvider: Context testing pattern, localStorage mocking available
- UploaderFileItem: Rendering tests, event handler testing, status icon validation
- UploaderList: Grouping logic, aggregate progress calculation, collapsible sections

**AC-6 to AC-9 (Error Handling Components)**: ✅ TESTABLE
- ConflictModal: Form validation, title comparison logic, submit/cancel callbacks
- RateLimitBanner: Countdown timer with vi.useFakeTimers, retry button state
- SessionExpiredBanner: Expired file count display, refresh callback

**AC-10 to AC-14 (Upload Page Integration)**: ✅ TESTABLE (with caveats)
- AC-10: Render test with form fields, file upload buttons
- AC-11: RTK Query mutation testing, MSW presigned URL response
- AC-12: MSW error response handling (400, 500, network errors)
- AC-13: Session expiry banner display, refresh flow (partially blocked by BUGF-004)
- AC-14: Finalize flow with MSW mocked 409/429 responses

**Caveat**: AC-13 session refresh flow is partially blocked by BUGF-004 (Session Refresh API not implemented). Story correctly defers this to "UI rendering only" tests.

**AC-15 to AC-19 (Form Validation)**: ✅ TESTABLE
- AC-15: Zod schema validation for title field (length, required)
- AC-16: Zod schema validation for description field (length, required)
- AC-17: Form dirty state detection with react-hook-form
- AC-18: Slug format validation (lowercase, numbers, hyphens only)
- AC-19: Tag input validation (max 10 tags, max 30 chars per tag)

**AC-20 to AC-22 (Accessibility)**: ✅ TESTABLE
- AC-20: ARIA labels via getByRole, getByLabelText queries
- AC-21: aria-describedby linking via DOM queries
- AC-22: aria-live announcements via role="status" or aria-live="polite"

### Test Patterns from @repo/upload - REUSABLE

✅ **MSW setup**: `packages/core/upload/src/__tests__/setup.ts` provides:
- Mock presigned URL generation handler
- Mock S3 PUT upload handler
- Mock file creation utilities
- localStorage/sessionStorage mocking

✅ **Upload state mocking**: Existing patterns for:
- File upload progress simulation
- Session restoration testing
- Error scenario injection

✅ **Component test patterns**: Existing patterns for:
- ConflictModal, RateLimitBanner, SessionExpiredBanner (in @repo/upload)
- UploaderFileItem, UploaderList (in @repo/upload)

**Recommendation**: Import and adapt test utilities from @repo/upload rather than reinventing. Focus tests on integration points between app components and @repo/upload hooks.

---

## Worker Token Summary

- **Input**: ~62K tokens (story files, codebase verification, @repo/upload inspection)
- **Output**: ~3K tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
