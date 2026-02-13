# Elaboration Analysis - BUGF-032

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly. Frontend integration only, no backend changes. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, and ACs are consistent. Protected features clearly defined. |
| 3 | Reuse-First | PASS | — | Excellent reuse strategy. Uses existing `@repo/upload` hooks, XHR client, and UI components without modification. |
| 4 | Ports & Adapters | PASS | — | Frontend-only story. RTK Query mutation follows established patterns from wishlist-gallery-api.ts. Upload manager hook is transport-agnostic. |
| 5 | Local Testability | PASS | — | Comprehensive E2E test suite with 6 test cases. MSW mocking for unit tests referenced via BUGF-028. |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. All design decisions are complete and actionable. |
| 7 | Risk Disclosure | PASS | — | Risks clearly documented: BUGF-031 deployment dependency, CORS misconfiguration, E2E flakiness. Mitigations provided. |
| 8 | Story Sizing | PASS | — | 3 points, 2 ACs, frontend-only, touches 2 packages, single feature. Well-sized for 2-3 days. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| — | None | — | Story passes all audit checks |

## Split Recommendation

N/A - Story is appropriately sized after split from BUGF-001.

## Preliminary Verdict

**Verdict**: PASS

All 8 audit checks pass. Story is ready for implementation.

---

## MVP-Critical Gaps

**None - core journey is complete**

The story correctly identifies the gap between existing frontend upload infrastructure and the real API. All MVP-critical elements are addressed:

1. **API Integration**: RTK Query mutation for presigned URL generation (AC3)
2. **Upload Flow**: Wiring `useUploadManager` with real API (AC3)
3. **Error Handling**: Session expiry detection and UI feedback (AC7)
4. **E2E Validation**: Complete upload flow testing (AC3)

The story's reuse-first approach leverages all existing infrastructure:
- ✓ `useUploadManager` hook (no changes)
- ✓ `uploadToPresignedUrl` XHR function (no changes)
- ✓ Upload UI components (no changes)
- ✓ Session expiry detection (already built into upload manager)

The only new code required:
1. RTK Query mutation implementation (~100 LOC)
2. Wiring upload pages to call API (~100 LOC across 2 pages)
3. E2E tests (~100 LOC)

Total: ~300 LOC of focused integration code.

---

## Additional Analysis

### Strengths

1. **Excellent Dependency Management**: Clear dependency on BUGF-031 with fallback plan (develop against local backend or mock API).

2. **Comprehensive Reuse Plan**: Story explicitly documents what NOT to change:
   - `useUploadManager` hook interface (protected)
   - `uploadToPresignedUrl` function signature (protected)
   - Upload component props (protected)

3. **Realistic Test Plan**: 6 concrete E2E test cases covering happy path, validation, errors, expiry, network failures, and multi-file uploads. Includes accessibility checks and network tracing.

4. **Clear Integration Flow**: 10-step flow diagram shows exact integration points between frontend, API, and S3.

5. **Error Handling Completeness**: Comprehensive error mapping table with user-facing messages and actions for all error codes (401, 400, 413, 500, 403, network).

### Validation Notes

#### Scope Alignment (Check #1)
Verified against stories.index.md lines 82-98:
- ✓ Integrates presigned URL API into upload pages
- ✓ Wire RTK Query API calls
- ✓ Connect to `@repo/upload` package
- ✓ E2E upload flow testing
- ✓ Session expiry handling
- ✓ AC3 and AC7 from parent story
- ✓ 3 story points
- ✓ Depends on BUGF-031

No scope creep detected.

#### Reuse-First Enforcement (Check #3)
Verified package reuse:
- ✓ `@repo/upload/hooks` - `useUploadManager` (lines 107-117 of InstructionsNewPage.tsx)
- ✓ `@repo/upload` - `uploadToPresignedUrl` (line 195 of xhr.ts)
- ✓ `@repo/upload/components` - UploaderList, SessionExpiredBanner, RateLimitBanner (lines 37-40 of InstructionsNewPage.tsx)
- ✓ `@repo/api-client/rtk` - Pattern from wishlist-gallery-api.ts

No new shared packages required. All reuse is justified and follows established patterns.

#### Local Testability (Check #5)
Three testing layers:
1. **Unit Tests**: RTK Query mutation with MSW (references BUGF-028)
2. **Integration Tests**: Upload page integration with MSW
3. **E2E Tests**: 6 Playwright test cases (lines 213-285)

All tests are concrete and executable. Network tracing enabled for debugging (lines 272-277).

#### Risk Disclosure (Check #7)
Three risks identified with mitigations:
1. **BUGF-031 not deployed** → Can develop against local backend or mock API
2. **CORS misconfiguration** → BUGF-031 includes CORS testing
3. **E2E test flakiness** → Use Playwright retries and explicit waits

Security note: Session expiry buffer (30 seconds) prevents edge cases.

### Architecture Compliance

Story follows established patterns:

1. **RTK Query Pattern**: References wishlist-gallery-api.ts (line 146-149)
   - Mutation with Zod schema validation
   - Cache invalidation
   - Error handling

2. **Upload Manager Integration**: Lines 107-117 show proper usage of `useUploadManager` hook without modification to hook interface.

3. **File Selection Flow**: Lines 148-169 show mock implementation with TODO comment (line 153) for real API call - exactly where integration happens.

4. **Session Expiry Flow**: Lines 268-277 show refresh handler with TODO for API call (line 272) - integration point for future BUGF-004.

### Change Surface Estimation

Story estimates ~350 LOC:
- RTK Query mutation: ~100 LOC
- Upload page integration: ~100 LOC (2 pages × 50 LOC)
- Error handling: ~50 LOC
- E2E tests: ~100 LOC

This aligns with 3-point story (2-3 days) and single feature scope.

**Validation**: Checked upload-page.tsx (700 lines) - integration will replace lines 153-160 (mock TODO) with API call, minimal surface area.

### Test Coverage Analysis

E2E test suite covers all ACs:

**AC3 Coverage** (End-to-End Upload Flow):
- ✓ Test Case 1: Happy Path (lines 224-233)
- ✓ Test Case 6: Multi-File Upload (lines 264-271)

**AC7 Coverage** (Expired Presigned URL):
- ✓ Test Case 4: Session Expired (lines 247-254)

Additional coverage:
- ✓ Test Case 2: Invalid File Type (lines 235-239)
- ✓ Test Case 3: File Too Large (lines 241-246)
- ✓ Test Case 5: Network Failure (lines 256-263)

All test cases include verification steps and accessibility checks.

### Non-MVP Items Captured

Story correctly identifies non-goals for BUGF-004 and future enhancements:
- ✓ Session refresh API (line 73, 189)
- ✓ Multipart upload support (line 74)
- ✓ Upload manager hook changes (line 75)

These are tracked as future opportunities, not MVP blockers.

---

## Worker Token Summary

- Input: ~66K tokens (files read: BUGF-032.md, stories.index.md, BUGF-031.md, useUploadManager.ts, xhr.ts, upload-page.tsx, InstructionsNewPage.tsx, endpoints.ts, wishlist-gallery-api.ts, upload package exports)
- Output: ~3K tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
