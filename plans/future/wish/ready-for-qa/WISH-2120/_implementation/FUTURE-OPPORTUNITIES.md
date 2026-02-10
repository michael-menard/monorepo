# Future Opportunities - WISH-2120

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Coverage metrics integration | Low | Low | Add coverage threshold enforcement (e.g., 80%) for test utility files via vitest.config.ts. Non-MVP: existing tests work fine without this. |
| 2 | E2E test file examples | Low | Low | Create example E2E test using utilities in `apps/web/playwright/tests/examples/` to demonstrate reuse patterns. Non-MVP: utilities target Vitest, not Playwright (WISH-2121). |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Visual Studio Code snippets | Medium | Low | Create VS Code snippet for `createMockFile()` and `mockS3Upload()` in `.vscode/test-utils.code-snippets` to improve discoverability for developers. |
| 2 | Auto-cleanup in test teardown | Medium | Low | Add global MSW handler cleanup in `src/test/setup.ts` afterEach hook to prevent handler leaks across tests. Current approach requires manual cleanup() calls. |
| 3 | Mock file content generators | Low | Medium | Add specialized generators like `createMockImageFile({ format: 'jpeg', megapixels: 12 })` that create realistic image content with EXIF metadata for advanced testing. Non-MVP: basic File objects sufficient for current tests. |
| 4 | Progress simulation presets | Low | Low | Add named progress presets like `mockS3Upload({ progressProfile: 'slow-connection' })` for common network scenarios. Non-MVP: custom progressSteps already supported. |
| 5 | TypeScript template literals | Low | Low | Use template literal types for scenario parameter (e.g., `scenario: 'success' | 'presign-error' | 's3-error' | 'timeout'`) for better autocomplete. Already documented in story but worth highlighting. |

## Categories

- **Edge Cases**: Coverage thresholds, E2E examples
- **UX Polish**: VS Code snippets, auto-cleanup patterns
- **Performance**: Mock content generators (realistic image data)
- **Observability**: N/A - test infrastructure only
- **Integrations**: WISH-2121 (Playwright E2E MSW setup) already tracked as separate story
