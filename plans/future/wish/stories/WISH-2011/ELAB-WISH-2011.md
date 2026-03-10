# Elaboration Report - WISH-2011

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

WISH-2011 proposes comprehensive test infrastructure for MSW mocking of S3 and API calls to enable reliable integration tests for image upload flows without external dependencies. Story is well-structured with complete specifications, but two minor documentation clarifications are needed before implementation.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Test infrastructure only, no production code changes. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. All ACs support the stated goal of reliable integration tests without external dependencies. |
| 3 | Reuse-First | PASS | — | Story extends existing MSW setup in `src/test/setup.ts` and `src/test/mocks/handlers.ts`. Reuses `PresignResponseSchema` from `@repo/api-client`. |
| 4 | Ports & Adapters | PASS | — | Not applicable - test infrastructure only. No API endpoints created. Story correctly identifies this in HTTP Contract Plan section. |
| 5 | Local Testability | PASS | — | Story is about creating test infrastructure itself. Verification plan is implicit in ACs (all tests must pass). |
| 6 | Decision Completeness | PASS | — | No blocking TBDs. MSW handler patterns are specified. Fixture structure is defined. Implementation approach is clear. |
| 7 | Risk Disclosure | PASS | — | Four risks identified with mitigations: S3 URL pattern matching, real S3 calls leaking, fixture drift, MSW performance. All have clear mitigations. |
| 8 | Story Sizing | PASS | — | 15 ACs, test-only story, no production code. Single package affected (`app-wishlist-gallery/src/test/`). No split needed. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | PresignResponseSchema has 3 fields but fixtures show only 2 | Medium | Update fixture examples in Architecture Notes (lines 316-320) to include `expiresIn` field: `expiresIn: 3600` | Not Reviewed |
| 2 | AC15 references `satisfies` but TypeScript version compatibility not verified | Low | Add note to AC15 or prerequisites documenting TypeScript 4.9+ requirement for `satisfies` operator | Not Reviewed |

## MVP-Critical Gaps

None - core journey is complete.

**Verification:**
- All required infrastructure pieces exist: MSW setup, test file with 16+ tests, Zod schemas, upload utilities
- Story only formalizes existing patterns and adds missing MSW handlers
- No production code changes required
- No blocking dependencies (WISH-2007 noted as "can proceed independently")

## Proceed to Implementation?

**YES - story may proceed with conditional fixes**

The two identified issues are documentation/example clarifications, not implementation blockers. Recommended action:

1. Before implementation begins, PM should update WISH-2011.md Architecture Notes fixture examples to match actual `PresignResponseSchema` (add `expiresIn` field)
2. Add TypeScript 4.9+ requirement note to AC15 prerequisites

These are low-risk clarifications that prevent false implementation assumptions.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Fixture examples in Architecture Notes don't match schema | Not Reviewed | Missing `expiresIn` field in presign fixture example |
| 2 | TypeScript version requirement for `satisfies` operator not documented | Not Reviewed | AC15 uses `satisfies` operator which requires TS 4.9+ |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Consider creating reusable `createMockFile()` utility | Not Reviewed | Story mentions this as future enhancement (lines 269-270) |
| 2 | Consider `mockS3Upload()` helper for common test setups | Not Reviewed | Story mentions this as future enhancement (line 270) |
| 3 | Monitor test execution time for MSW performance | Not Reviewed | Risk 4 mitigation suggests monitoring (target < 30s for unit + integration) |

### Follow-up Stories Suggested

- [ ] WISH-2013: File Upload Security - Will benefit from MSW fixtures and handlers established in WISH-2011
- [ ] WISH-2014: Playwright E2E MSW Setup - Browser-mode MSW support explicitly deferred to future (line 54)
- [ ] Consider: Test utility helpers (`createMockFile`, `mockS3Upload`) as future enhancement after WISH-2011 validation

### Items Marked Out-of-Scope

- **Playwright E2E MSW Setup**: Browser-mode MSW for Playwright is deferred to future story. Integration test coverage is sufficient for MVP.
- **Visual Regression Tests**: Chromatic snapshots of upload progress are out of scope. No design system changes in this story.
- **Real S3 Integration Tests**: End-to-end tests against actual S3 (dev environment) are explicitly out of scope.
- **Load Testing**: Stress testing with 10+ concurrent uploads deferred to performance story.
- **Implementation Changes**: No changes to production code (hooks, components, API). Test infrastructure only.
