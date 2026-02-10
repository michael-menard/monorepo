# Dev Feasibility Review: WISH-2121 - Playwright E2E MSW Setup for Browser-Mode Testing

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** MSW browser-mode is well-documented, handlers already exist from WISH-2011, and Playwright has native Service Worker support. The story reuses existing infrastructure rather than creating new patterns.

---

## Likely Change Surface (Core Only)

### Areas/Packages

| Area | Files | Purpose |
|------|-------|---------|
| `apps/web/app-wishlist-gallery/public/` | `mockServiceWorker.js` | MSW worker script (generated) |
| `apps/web/playwright/setup/` | `msw-browser.ts`, `msw-handlers.ts` | Browser worker configuration |
| `apps/web/playwright/` | `playwright.config.ts` | Global setup/teardown hooks |
| `apps/web/playwright/setup/` | `README.md` | Documentation |

### Endpoints

**None** - This is testing infrastructure, no API endpoints created.

### Critical Deploy Touchpoints

| Touchpoint | Impact | Notes |
|------------|--------|-------|
| `mockServiceWorker.js` | Low | Static file, no runtime impact |
| CI workflow | Medium | Must verify tests pass without AWS credentials |
| Dev server | Low | Worker only loads when `VITE_ENABLE_MSW=true` |

---

## MVP-Critical Risks (Max 5)

### Risk 1: Handler Import Path Compatibility

**Risk:** Playwright runs in Node.js context but handlers use browser imports (`msw/browser`).

**Why it blocks MVP:** If handlers can't be imported into Playwright setup, the entire story fails.

**Required mitigation:**
1. Verify handlers use `msw` (not `msw/browser`) for handler definitions
2. Only use `msw/browser` for `setupWorker` in browser context
3. Re-export handlers from a separate file that doesn't import browser APIs

### Risk 2: MSW v2 API Changes

**Risk:** MSW v2 changed API significantly from v1. Current handlers may use v1 syntax.

**Why it blocks MVP:** Incorrect API usage causes runtime errors in browser worker.

**Required mitigation:**
1. Verify MSW version in `package.json` (should be v2.x)
2. Confirm handlers use `http.get()` not `rest.get()` (v2 syntax)
3. Test handler syntax locally before committing

### Risk 3: Service Worker Scope in E2E Tests

**Risk:** MSW Service Worker may not intercept requests if scope is misconfigured.

**Why it blocks MVP:** Unintercepted requests hit real endpoints, tests fail or make real network calls.

**Required mitigation:**
1. Place `mockServiceWorker.js` at public root (`/mockServiceWorker.js`)
2. Verify worker scope covers all test routes
3. Add assertion for worker registration success

---

## Missing Requirements for MVP

### Requirement 1: Public Directory Location

**Current state:** `apps/web/app-wishlist-gallery/public/` does not exist.

**Decision needed:** Where should `mockServiceWorker.js` be placed?
- Option A: `apps/web/app-wishlist-gallery/public/` (module-specific)
- Option B: `apps/web/main-app/public/` (main app serves all modules)

**Recommendation:** Option B - main-app serves app-wishlist-gallery as a module, so worker should be in main-app's public directory.

### Requirement 2: Playwright Global Setup File

**Current state:** No global setup file exists in `apps/web/playwright/`.

**Decision needed:** How to integrate MSW worker start/stop with Playwright lifecycle?
- Option A: Global setup/teardown files
- Option B: Playwright fixtures
- Option C: Test beforeAll/afterAll hooks

**Recommendation:** Option A - Global setup/teardown is cleaner and matches MSW documentation.

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

| Evidence | How to Verify |
|----------|---------------|
| Worker script generated | File exists at `public/mockServiceWorker.js` |
| Worker registration | Console log `[MSW] Mocking enabled.` in test |
| Handler interception | MSW request log shows matched request |
| E2E test passes | Playwright test exits with status 0 |
| CI compatibility | GitHub Actions passes without AWS credentials |

### Critical CI/Deploy Checkpoints

1. **Pre-commit:** Lint and type-check pass for new files
2. **CI (Playwright):** All E2E tests pass in `chromium-mocked` project
3. **CI (No credentials):** Tests pass without `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
4. **Documentation:** README exists with setup instructions

---

## Architecture Alignment

### Ports & Adapters Pattern

**Not directly applicable** - This story creates testing infrastructure, not application code.

However, the MSW setup follows adapter pattern principles:
- Handlers abstract external dependencies (S3, API)
- Same handlers used in Vitest (Node adapter) and Playwright (Browser adapter)
- No application code changes required

### Reuse-First Principle

**Strongly aligned:**
- Handlers reused from WISH-2011 (no duplication)
- Fixtures reused from WISH-2011 (no duplication)
- Playwright utilities reused from existing `utils/` directory

### Package Boundaries

| Package | Responsibility | Boundary Respected |
|---------|---------------|--------------------|
| `apps/web/playwright/` | E2E test infrastructure | Yes |
| `apps/web/app-wishlist-gallery/src/test/mocks/` | Handler definitions | Yes (shared) |
| `apps/web/main-app/public/` | Static assets | Yes |

---

## Implementation Sequence

### Recommended Order

1. **Generate worker script** - `npx msw init public/`
2. **Create Playwright setup files** - `setup/msw-browser.ts`, `setup/msw-handlers.ts`
3. **Update Playwright config** - Add global setup/teardown
4. **Add/update E2E test** - Verify upload flow with MSW
5. **Write documentation** - `setup/README.md`
6. **Verify CI** - Run tests without AWS credentials

### Dependencies

- WISH-2011 handlers must exist (verified: `handlers.ts` exists)
- MSW v2 must be installed (verify in `package.json`)
- Playwright must support Service Workers (verified: default config works)

---

## Confidence Assessment

| Factor | Assessment | Notes |
|--------|------------|-------|
| Technical feasibility | High | MSW browser-mode well-documented |
| Existing handler reuse | High | Handlers exist and work in Vitest |
| Playwright compatibility | High | Native SW support, no special config |
| CI compatibility | High | Standard headless Chrome supports SW |
| Documentation quality | Medium | MSW v2 docs exist but migration notes sparse |

**Overall:** High confidence this story is implementable as specified.
