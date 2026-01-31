# Elaboration Report - WISH-2120

**Date**: 2026-01-30
**Verdict**: PASS

## Summary

WISH-2120 is a well-structured test infrastructure enhancement story that adds reusable utility helpers (createMockFile, mockS3Upload) to reduce S3 upload test boilerplate. All 8 audit checks pass with no critical issues found. Story is appropriately sized as Small (1 point) and ready for implementation.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly - test utilities only, no API/backend changes |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, AC align perfectly. No contradictions found |
| 3 | Reuse-First | PASS | — | Reuses existing MSW infrastructure, vitest patterns, File API - no new dependencies |
| 4 | Ports & Adapters | PASS | — | N/A - Test infrastructure only, no production architecture impact |
| 5 | Local Testability | PASS | — | AC12: 100% test coverage for utilities, AC13: refactor verification with existing tests |
| 6 | Decision Completeness | PASS | — | No TBDs, all design decisions clear. TypeScript interfaces well-defined |
| 7 | Risk Disclosure | PASS | — | 3 risks identified with mitigations: MSW handler leaks, large file perf, type complexity |
| 8 | Story Sizing | PASS | — | 15 ACs, test utilities only, single package scope. Appropriately sized as "Small" (1 point) |

## Issues & Required Fixes

No critical or high-severity issues found. Story is well-structured and ready for implementation.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Coverage metrics integration | Not Reviewed | Add coverage threshold enforcement (e.g., 80%) for test utility files via vitest.config.ts. Non-MVP: existing tests work fine without this. |
| 2 | E2E test file examples | Not Reviewed | Create example E2E test using utilities in `apps/web/playwright/tests/examples/` to demonstrate reuse patterns. Non-MVP: utilities target Vitest, not Playwright (WISH-2121). |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Visual Studio Code snippets | Not Reviewed | Create VS Code snippet for `createMockFile()` and `mockS3Upload()` in `.vscode/test-utils.code-snippets` to improve discoverability for developers. |
| 2 | Auto-cleanup in test teardown | Not Reviewed | Add global MSW handler cleanup in `src/test/setup.ts` afterEach hook to prevent handler leaks across tests. Current approach requires manual cleanup() calls. |
| 3 | Mock file content generators | Not Reviewed | Add specialized generators like `createMockImageFile({ format: 'jpeg', megapixels: 12 })` that create realistic image content with EXIF metadata for advanced testing. Non-MVP: basic File objects sufficient for current tests. |
| 4 | Progress simulation presets | Not Reviewed | Add named progress presets like `mockS3Upload({ progressProfile: 'slow-connection' })` for common network scenarios. Non-MVP: custom progressSteps already supported. |
| 5 | TypeScript template literals | Not Reviewed | Use template literal types for scenario parameter (e.g., `scenario: 'success' | 'presign-error' | 's3-error' | 'timeout'`) for better autocomplete. Already documented in story but worth highlighting. |

### Follow-up Stories Suggested

- [ ] WISH-2121: Playwright E2E MSW setup (already tracked as separate story)
- [ ] Coverage metrics integration for test utilities
- [ ] VS Code snippets for test utility discovery
- [ ] Global MSW handler cleanup patterns

### Items Marked Out-of-Scope

- Production runtime code changes
- Backend API changes
- Playwright E2E MSW setup (covered in WISH-2121)
- Changes to the actual upload flow logic
- Coverage metrics improvements (test infrastructure only)

## Proceed to Implementation?

**YES** - Story may proceed. All audit checks pass, scope is clear and focused, dependencies are properly identified (WISH-2011), test infrastructure follow established patterns, and no new dependencies are introduced. This is a well-sized enhancement that will improve developer experience without impacting production systems.
