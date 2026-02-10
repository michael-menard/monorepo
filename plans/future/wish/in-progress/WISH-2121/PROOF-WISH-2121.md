# Proof of Implementation - WISH-2121

**Story:** WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing
**Date:** 2026-02-08
**Status:** Implementation Complete

## Summary

Browser-mode MSW infrastructure for Playwright E2E tests has been implemented. The setup enables consistent API/S3 mocking across Vitest (Node-mode) and Playwright (browser-mode) test suites, using the same handler definitions.

## Implementation Approach

The key insight was that MSW browser infrastructure **already existed** in main-app:
- `mockServiceWorker.js` was already in `main-app/public/`
- `setupWorker()` was already in `main-app/src/mocks/browser.ts`
- `VITE_ENABLE_MSW` env var was already wired into `main.tsx`

The implementation added:
1. S3 upload handlers (presign + PUT) to main-app's MSW handlers
2. A new `chromium-mocked` Playwright project that starts dev server with MSW enabled
3. Playwright fixtures for MSW readiness verification, error injection, and request inspection
4. BDD feature file and step definitions for MSW upload flow testing
5. Comprehensive documentation

## Files Created

| File | Purpose | AC |
|------|---------|-----|
| `playwright/fixtures/msw.fixture.ts` | MSW readiness fixture | AC23 |
| `playwright/fixtures/msw-error-injection.ts` | Error injection helpers | AC21 |
| `playwright/fixtures/msw-request-inspector.ts` | Request inspection utility | AC22 |
| `playwright/features/wishlist/wishlist-msw-upload.feature` | E2E test scenarios | AC7, AC8 |
| `playwright/steps/wishlist-msw-upload.steps.ts` | Step definitions | AC7, AC8 |
| `playwright/setup/README.md` | Documentation | AC12, AC15-AC19 |

## Files Modified

| File | Change | AC |
|------|--------|-----|
| `main-app/src/mocks/handlers.ts` | Added S3 presign/PUT handlers + feature flags | AC3 |
| `playwright/playwright.config.ts` | Added `chromium-mocked` project | AC5, AC11 |
| `playwright/package.json` | Added `test:mocked` scripts | — |

## Acceptance Criteria Coverage

All 23 acceptance criteria are addressed - see EVIDENCE.yaml for per-AC status and evidence.

## How to Run

```bash
# Run MSW-mocked E2E tests
pnpm --filter @repo/playwright test:mocked

# Run MSW-specific tests only
pnpm --filter @repo/playwright test:mocked:msw

# Run with visible browser
pnpm --filter @repo/playwright test:mocked:headed
```

## Known Limitations

- Pre-existing TypeScript errors in main-app (implicit `any` types) exist but are unrelated to this story
- E2E tests require dev server startup (~15s) for the first run
- MSW Service Worker scope covers all routes; per-route opt-in is not implemented
