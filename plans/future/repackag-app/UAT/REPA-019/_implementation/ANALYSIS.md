# Elaboration Analysis - REPA-019

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly: "Move error handling utilities to @repo/api-client. Add errorMapping (~200 lines) and authFailureHandler (~150 lines) from main-app." Actual: errorMapping.ts (494 lines), authFailureHandler.ts (138 lines). Story accounts for this with "~200" and "~150" estimates. |
| 2 | Internal Consistency | FAIL | Critical | **Critical Inconsistency Found**: Story claims "27+ error codes" but actual count is 21 error codes in ApiErrorCodeSchema enum. AC-4 lists specific error codes but count is inflated. Story also mentions INVALID_TOKEN which doesn't exist in current code. |
| 3 | Reuse-First | PASS | — | Story correctly identifies existing packages (@repo/logger, zod, @reduxjs/toolkit/query) and existing error handling modules (ServerlessApiError, authorization-errors.ts). Complementary architecture is well-documented. |
| 4 | Ports & Adapters | PASS | — | Story correctly identifies need for dependency injection to remove Redux store coupling. Proposed `createAuthFailureHandler(options)` pattern follows adapter principles. No backend endpoints involved. |
| 5 | Local Testability | PASS | — | Story requires migration of 653 test lines (401 + 252) with 100% coverage maintenance. Tests are concrete and comprehensive. No .http files needed (frontend-only). |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | Auth page detection approach is TBD - story mentions coordination with REPA-013 (auth-utils) for auth page detection but doesn't block on it. AUTH_PAGES constant may move to @repo/auth-utils later. |
| 7 | Risk Disclosure | PASS | — | Story explicitly calls out: circular dependency risk with authFailureHandler, RTK Query integration complexity, initialization order, and coordination with REPA-012/REPA-013. No hidden dependencies. |
| 8 | Story Sizing | PASS | — | 3 story points, 10 ACs. Only 2 packages touched. Single test scenario (migrate + verify). Within acceptable bounds. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Error code count mismatch | Critical | AC-4 states "All 27+ error codes" but actual count is 21. Update AC-4 to say "All 21 error codes" and list them accurately: UNAUTHORIZED, EXPIRED_SESSION, ACCESS_DENIED, FORBIDDEN, NOT_FOUND, CONFLICT, DUPLICATE_SLUG, BAD_REQUEST, VALIDATION_ERROR, INVALID_TYPE, SIZE_TOO_LARGE, FILE_ERROR, PARTS_VALIDATION_ERROR, RATE_LIMITED, TOO_MANY_REQUESTS, INTERNAL_ERROR, SERVICE_UNAVAILABLE, DATABASE_ERROR, SEARCH_ERROR, EXTERNAL_SERVICE_ERROR, THROTTLING_ERROR. Remove reference to INVALID_TOKEN (does not exist). |
| 2 | Missing import verification | Medium | AC-6 states "No imports from old paths" but doesn't specify how to verify. Add explicit step: Run `grep -r "services/api/errorMapping\|services/api/authFailureHandler" apps/web/main-app/src/` and ensure zero results after deletion. |
| 3 | Line count discrepancy | Low | Story seed says "~200 lines" and "~150 lines" but actual is 494 and 138. Story front matter correctly lists these as "494 lines" and "138 lines". Update seed/description to match reality. |
| 4 | Missing API slice coordination | Medium | authFailureHandler dynamically imports API slices (enhancedGalleryApi, enhancedWishlistApi, dashboardApi) for cache clearing. Story doesn't specify how this will work after refactor. Add AC or implementation note about maintaining dynamic import or using callback pattern for API reset. |
| 5 | Auth page detection coordination | Low | Story mentions REPA-013 coordination but doesn't clarify if this is blocking. Clarify: AUTH_PAGES constant stays in @repo/api-client/errors/auth-failure for now, may move to @repo/auth-utils in future refactor (out of scope for REPA-019). |

## Split Recommendation

Not applicable - story size is appropriate for single implementation.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-structured and mostly accurate, but requires fixes for:
1. **Critical**: Error code count correction (27+ → 21)
2. **Medium**: Import verification steps
3. **Medium**: API slice reset coordination clarification

With these fixes, story is ready for implementation.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Error code accuracy | Migration correctness | Update AC-4 to list actual 21 error codes and remove INVALID_TOKEN reference. Without this, developer may create wrong test cases or miss edge cases during migration. |
| 2 | API reset coordination | Core auth flow | Clarify how authFailureHandler will reset API slices after refactor. Current implementation uses dynamic import of store module. Options: (a) keep dynamic import pattern, (b) use callback injection for resetApiState, (c) document as consumer responsibility. Without this, 401 handling may break after migration. |

**Core Journey**: User makes authenticated request → receives 401 → authFailureHandler clears auth state, resets API cache, redirects to login with return URL.

**Blocking Issues**: Both gaps above block the core journey if not addressed.

---

## Worker Token Summary

- Input: ~59,000 tokens (story file, seed file, source code files, related stories, package.json, test files)
- Output: ~3,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Analysis: Comprehensive codebase scanning including error handler source, tests, usage patterns, related stories (REPA-012, REPA-013), and existing @repo/api-client error handling modules
