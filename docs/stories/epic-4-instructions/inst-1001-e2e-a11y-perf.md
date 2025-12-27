# Story 3.1.26: E2E + A11y + Performance — Playwright Suite

## Status

Ready for Review

## Story

As a team,
we want end-to-end confidence with a11y and perf checks,
so we can ship the uploader with quality gates.

## Acceptance Criteria

1. E2E flows (Playwright)

- Happy path: presign → upload → finalize → appears in My Instructions.
- Error flows: expired links refresh; 409 slug fix; 429 countdown; 401 restore intent.

2. A11y checks

- Run axe-core checks on key screens; no critical violations.

3. Perf budget

- Uploader route TTI ≤ 2.5s on mid-range laptop; bundle size budget documented; lazy-load modules.

4. CI integration

- Pipeline job to run E2E and a11y; artifacts (videos, traces) on failure.

## Tasks / Subtasks

- [x] Set up apps/web/playwright tests for uploader
- [x] Seed/mocks for API and S3
- [x] CI wiring and docs

## Dev Notes

- Keep tests resilient; prefer data-testid for stable selectors where needed; otherwise use roles.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### File List

- apps/web/playwright/features/uploader/uploader-happy-path.feature (new)
- apps/web/playwright/features/uploader/uploader-error-flows.feature (new)
- apps/web/playwright/features/uploader/uploader-a11y.feature (new)
- apps/web/playwright/features/uploader/uploader-performance.feature (new)
- apps/web/playwright/steps/uploader.steps.ts (new)
- apps/web/playwright/steps/uploader-a11y.steps.ts (new)
- apps/web/playwright/steps/uploader-perf.steps.ts (new)
- apps/web/playwright/steps/pages/uploader.page.ts (new)
- apps/web/playwright/steps/common.steps.ts (modified)
- apps/web/playwright/utils/api-mocks.ts (new)
- apps/web/playwright/utils/index.ts (modified)
- apps/web/playwright/fixtures/uploader/sample-instructions.pdf (new)
- apps/web/playwright/fixtures/uploader/sample-parts-list.csv (new)
- apps/web/playwright/fixtures/uploader/sample-thumbnail.jpg (new)
- apps/web/playwright/fixtures/uploader/gallery-1.jpg (new)
- apps/web/playwright/fixtures/uploader/gallery-2.jpg (new)
- apps/web/playwright/fixtures/uploader/invalid-file.exe (new)
- apps/web/playwright/package.json (modified)
- apps/web/playwright/PERFORMANCE.md (new)
- apps/web/playwright/ACCESSIBILITY.md (new)
- .github/workflows/e2e.yml (modified)

### Debug Log References

N/A

### Completion Notes

- Created 4 feature files covering happy path, error flows, accessibility, and performance testing
- Implemented step definitions with page object pattern for uploader
- Added @axe-core/playwright for automated accessibility scanning
- Created API mocks for presign, finalize, and error scenarios
- Added sample fixture files for upload testing
- Added test scripts: test:bdd:uploader, test:bdd:uploader:a11y, test:bdd:uploader:perf
- Updated CI workflow to upload Cucumber reports and video traces on failure
- Created PERFORMANCE.md documenting TTI ≤ 2.5s, LCP ≤ 2.5s, CLS ≤ 0.1 budgets
- Created ACCESSIBILITY.md documenting WCAG 2.1 AA compliance and testing strategy
- Tests are tagged with @smoke for inclusion in PR smoke tests

## Change Log

| Date       | Version | Description                   | Author |
| ---------- | ------- | ----------------------------- | ------ |
| 2025-12-06 | 0.1     | Initial draft (E2E/a11y/perf) | SM     |
| 2025-12-26 | 1.0     | Implementation complete       | Dev    |
