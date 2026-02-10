# Elaboration Report - WISH-2121

**Date**: 2026-01-30
**Verdict**: PASS

## Summary

WISH-2121 establishes browser-mode MSW infrastructure for Playwright E2E tests, enabling consistent mocking across Vitest and Playwright test suites. The story is well-scoped, reuses infrastructure from WISH-2011, and includes clear AC covering worker setup, handler reuse, and E2E test validation. All identified issues and gaps have been resolved with concrete acceptance criteria additions.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. No extra endpoints or features introduced. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. AC matches Scope. Test Plan matches AC. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story explicitly reuses MSW handlers from WISH-2011, fixtures, and Zod schemas. No per-story one-off utilities. |
| 4 | Ports & Adapters | PASS | — | Test infrastructure only. Follows separation: browser worker setup (adapter) + handler definitions (core logic). |
| 5 | Local Testability | PASS | — | Concrete E2E test plan. Test assertions verify MSW interception. Debug mode logs available. |
| 6 | Decision Completeness | PASS | — | Issues resolved with new AC additions (see below). |
| 7 | Risk Disclosure | PASS | — | 4 risks explicitly documented with mitigations provided. |
| 8 | Story Sizing | PASS | — | 13 AC (expanded to 16 with user additions), all focused on single infrastructure setup. Reasonable for Medium complexity. |

## Issues & Required Fixes

| # | Issue | Severity | Resolution | Status |
|---|-------|----------|-----------|--------|
| 1 | Browser Context Isolation Mechanism Unclear | Medium | **Added as AC14**: New AC establishes that Playwright's default context isolation (each test gets independent browser context) provides isolation, with explicit documentation of how MSW instances are managed per context. | RESOLVED |
| 2 | Worker Lifecycle Ambiguity | Low | **Added as AC15**: New AC clarifies worker lifecycle: worker.start() in global setup (once), handler.resetHandlers() before each test. Separates setup (one-time) from per-test cleanup. | RESOLVED |
| 3 | Error Injection Pattern Not Documented | Low | **Added as AC16**: New AC documents error injection pattern. Tests must use server.use() runtime handler override to inject errors (same pattern as WISH-2011 Vitest tests). | RESOLVED |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | No timeout simulation fixture | Add as AC | **AC17**: Playwright tests must verify timeout error handling. MSW handlers can use `delay()` to simulate network latency. Fixture needed to support timeout scenarios. |
| 2 | No handler reset verification | Add as AC | **AC18**: Tests must verify that handler.resetHandlers() correctly clears runtime overrides. New AC ensures no test state leakage between test cases. |
| 3 | No documentation for extending handlers | Add as AC | **AC19**: Developers need guidance on how to add new MSW handlers for future E2E tests without modifying infrastructure. Documentation should explain handler extension pattern. |
| 4 | No test for worker registration failure | Add as AC | **AC20**: Tests must verify that global setup fails gracefully when Service Worker registration fails. This ensures early detection of setup issues. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Error injection convenience helper | Add as AC | **AC21**: Utility function to simplify error injection in tests. Reduces boilerplate when setting up error scenarios (e.g., `injectPresignError(500)`). |
| 2 | MSW request inspection utility | Add as AC | **AC22**: Debugging tool to inspect intercepted requests. Helps developers verify MSW is working correctly and understand request flow. |
| 3 | Playwright fixture for MSW setup | Add as AC | **AC23**: Reusable Playwright fixture for MSW initialization. Reduces repetition in test files and ensures consistent setup. |
| 4 | Visual test for upload progress | Out-of-scope | Deferred to UX polish story. Out of scope for infrastructure setup. |
| 5 | Performance benchmarking | Out-of-scope | Deferred to performance story. Out of scope for initial implementation. |
| 6 | Shared worker script management | Out-of-scope | Deferred to multi-app MSW strategy story. Out of scope for single-app setup. |

### Follow-up Stories Suggested

None - all enhancements have been incorporated into this story via new AC additions.

### Items Marked Out-of-Scope

- **Visual test for upload progress**: Chromatic/screenshot testing deferred to UX polish story
- **Performance benchmarking**: Load testing and concurrent upload stress testing deferred to performance story
- **Shared worker script management**: Multi-app worker script strategy deferred to future story

## Proceed to Implementation?

**YES** - Story is ready for implementation. All issues and gaps have been resolved with concrete acceptance criteria:

- Original 13 AC retained and fully specified
- 3 original issues → 3 new AC (AC14–AC16) clarifying design decisions
- 4 gaps → 4 new AC (AC17–AC20) covering missing functionality
- 3 enhancements → 3 new AC (AC21–AC23) adding developer convenience features
- 3 items marked out-of-scope (deferred to future stories)

Total: **23 acceptance criteria**, all cohesive and focused on browser-mode MSW infrastructure setup.

---

## Implementation Readiness

### What's Ready

- Handlers reusable from WISH-2011 (no modifications needed)
- Fixtures reusable from WISH-2011 (no modifications needed)
- Zod schemas reusable from @repo/api-client
- MSW documentation and examples (MSW official docs + WISH-2011 implementation reference)

### What Developers Need to Provide

- Browser worker setup code (`apps/web/playwright/setup/msw-browser.ts`)
- Playwright global setup integration
- Error injection helper utility (AC21)
- MSW request inspection utility (AC22)
- Playwright MSW fixture (AC23)
- Updated README with extension guidance (AC19)
- Test for timeout simulation (AC17)
- Test for handler reset (AC18)
- Test for worker registration failure (AC20)
- E2E upload test using new infrastructure (AC7)

All work items have clear owner responsibility and definition of done.
