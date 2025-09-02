# PRD: LEGO MOC Instructions App – Phased Improvement Plan (Checklist)

Path: apps/web/lego-moc-instructions-app  
Applies to: React 19 + Vite 6 + TanStack Router v1 + RTK Query + Tailwind v4 + PWA (workbox)  
Standards: Build-First Policy (A: Build Green → B: Tests Green), Tailwind-only styling, RTK Query for HTTP, path aliases for shared packages

---

## 0) Context & Audit (Current State)

- Stack
  - React 19, Vite 6, TanStack Router v1, Redux Toolkit + RTK Query, Tailwind v4 (with @tailwindcss/vite), vite-plugin-pwa, Playwright + Vitest, MSW present
  - Theming via `@repo/ui`, auth/instructions/gallery slices via `packages/**` shared features

- Routing & State
  - TanStack Router as primary router (main.tsx), React Router DOM also listed in dependencies (not used by source routes → clean-up)
  - Store composes `authApi`, `instructionsApi`, `galleryApi`, local `api` (MOC service), and a stubbed `offlineApi`
  - Route guard from `@repo/auth` is referenced but commented out

- Data & APIs
  - Local API service in `src/services/api.ts` using RTK Query with zod schemas and shared-cache layer
  - Environment config sets API base URL to `http://localhost:3001/api` in development (conflicts with `apps/api/lego-projects-api` which runs on 3000 by default → fix via Vite proxy or correct baseUrl)

- PWA & Offline
  - `vite-plugin-pwa` with generateSW strategy, caching rules for API, images, and static assets, offline fallbacks
  - Offline features currently stubbed via `offlineApi` with no-op endpoints; UI has Offline indicators/providers/components ready but not wired to real offline queue/sync

- Build & Testing
  - Build script: `vite build && tsc`
  - Unit tests present for components/hooks/pages; Playwright config exists with test directories and prior test artifacts
  - Test setup includes MSW handlers and shared mocks

- Security
  - Security headers injected in dev and prod (via Vite server headers and custom plugin)
  - CSP currently includes `'unsafe-inline'` and `'unsafe-eval'` (dev and prod) → reduce in prod via nonces/hashes; keep dev looser
  - API has CSRF issuance/enforcement (`/api/csrf`) but frontend does not yet fetch/attach token on state-changing requests

- Styling
  - Tailwind v4 enforced repo-wide; this app still includes `src/styles.css` (migrate any residual CSS to Tailwind utilities per repo rule)

- Gaps & Key Issues
  - [!] Dev API mismatch: frontend points to 3001 while backend runs on 3000
  - [!] Dual data libs: TanStack Query demo present alongside RTK Query. Repo standard calls for RTK Query for HTTP; keep React Query to demo namespace only or remove
  - [!] CSP too permissive in production: contains `'unsafe-eval'` and broad connect-src
  - [!] Styling file present (`src/styles.css`) – contrary to Tailwind-only rule
  - [!] React Router DOM dependency is present but unused by routes
  - [!] Route guard commented out: public/protected route semantics not enforced
  - [!] Offline features not actually syncing (only stubbed)
  - [!] No Vite proxy for API to normalize dev URLs/CSRF/cookies

---

## Phase A — Build Green (compiles + type-checks)

Goal: Achieve a clean, reproducible build and running dev server with correct API connectivity and baseline security, with zero type errors.

- Connectivity & Config
  - [ ] Add Vite dev proxy so `/api` routes target `http://localhost:3000` (lego-projects-api) with credentials
  - [ ] Change `src/config/environment.ts` dev `baseUrl` to `/api` (relative) to work with proxy; production stays `/api`
  - [ ] Verify CORS + cookies/CSRF handshake works in dev via proxy

- Dependencies & Standards
  - [ ] Remove `react-router-dom` dependency if not used, update imports if any test relies on it
  - [ ] Confirm imports use path aliases (`@repo/*`, `@monorepo/shared`) per repo rules
  - [ ] Migrate any styles from `src/styles.css` to Tailwind utilities; delete the CSS file

- Security Headers & CSP
  - [ ] Split CSP for dev vs prod; keep dev permissive if needed, but in prod:
        - Remove `'unsafe-eval'`
        - Replace `'unsafe-inline'` with nonces/hashes where possible
        - Constrain `connect-src` to your API/auth origins + same-origin
  - [ ] Ensure HTML meta security headers reflect tightened prod CSP

- Routing & Auth
  - [ ] Re-enable TanStack route guard via `@repo/auth` for routes requiring auth
  - [ ] Ensure 401/403 redirect flows to `/unauthorized` are in place and tested manually

- PWA Baseline
  - [ ] Confirm PWA manifest correctness and icon presence
  - [ ] Confirm workbox `runtimeCaching` patterns are not over-broad and don’t cache sensitive endpoints

- Acceptance (Phase A)
  - [ ] `pnpm -w --filter @repo/lego-moc-instructions-app run type-check` passes
  - [ ] `pnpm -w --filter @repo/lego-moc-instructions-app run build` succeeds with no errors
  - [ ] Dev server can hit backend via `/api` without CORS/CSRF issues
  - [ ] Removing styles.css does not regress UI; Tailwind-only confirmed

---

## Phase B — Tests Green (Unit + E2E)

Goal: Full test pass with repo thresholds (Lines ≥ 90%, Branches ≥ 85%, Functions ≥ 90%, Statements ≥ 90%).

- Unit/Component (Vitest + Testing Library + MSW)
  - [ ] Ensure MSW handlers in `src/test/mocks` cover all API endpoints in `src/services/api.ts`
  - [ ] Add unit tests for RTK Query endpoints (success/error/caching invalidation)
  - [ ] Add component tests for:
        - [ ] MocInstructionsGallery (loading, error, empty, populated, pagination/filters if any)
        - [ ] MocDetailPage (fetch by id, error state, parts rendering)
        - [ ] Offline indicators/components behavior (online/offline toggles via mocked hooks)
        - [ ] Auth flows (form validation with zod, happy path mocked)
  - [ ] Cover route guard behavior with mocked auth state

- Integration (Router)
  - [ ] Router-level tests using TanStack Router and in-memory history to verify route rendering and redirects

- E2E (Playwright)
  - [ ] Smoke flow: Login → Browse MOC Gallery → View Detail → Add to Wishlist
  - [ ] Offline navigation: Toggle offline (Playwright devtools), confirm cached pages and offline fallback behavior
  - [ ] Accessibility checks (basic: focus order, keyboard navigation for gallery)

- Acceptance (Phase B)
  - [ ] `pnpm -w --filter @repo/lego-moc-instructions-app run test:run` passes
  - [ ] `pnpm -w --filter @repo/lego-moc-instructions-app run test:e2e` green locally with ≤ 15s per test
  - [ ] Coverage meets global thresholds

---

## Phase C — UX & Performance

Goal: Improve responsiveness, bundle size, perceived performance, and general UX polish.

- Code Splitting & Prefetch
  - [ ] Convert heavy routes to lazy-loaded chunks via dynamic import or TanStack Router `lazy`
  - [ ] Enable route/link intent prefetching (`defaultPreload: 'intent'` is set; verify it works per route and tune staleTime)

- Rendering & Assets
  - [ ] Add skeletons/shimmers for list/detail pages
  - [ ] Optimize images (responsive sizes, lazy loading, reuse `@repo/shared-image-utils` if applicable)
  - [ ] Review `rollupOptions.manualChunks` for optimal vendor split; avoid over-splitting

- Web Vitals & Perf Monitoring
  - [ ] Wire `web-vitals` into `PerformanceProvider` to log metrics in dev and optionally send to analytics in prod (feature-flagged)
  - [ ] Add simple perf budget check in CI (bundle size threshold fail-fast)

- Acceptance (Phase C)
  - [ ] Largest pages load under agreed threshold on mid-tier hardware
  - [ ] No regressions in tests
  - [ ] Clear UX improvements documented in IMPLEMENTATION_SUMMARY.md

---

## Phase D — Offline-First & Sync

Goal: Move from stubbed offline to functional offline queue, background sync, and resilient UX.

- Data Layer
  - [ ] Replace `offlineApi` stub with real offline manager:
        - IndexedDB storage (e.g., `idb`) for queue and cached detail entities
        - Background sync strategy via Workbox (periodic sync or on regain connectivity)
        - Conflict handling policy documented (last-write-wins or server-authoritative)
  - [ ] Cache strategies tuned:
        - API: stale-while-revalidate for reads, queue writes offline
        - Images: CacheFirst with sensible TTL

- UI/UX
  - [ ] Make Offline Status Indicator reflect real queue depth and last sync
  - [ ] Provide retry controls and clear messaging for pending actions
  - [ ] Offline fallback page enriched with navigable cached content

- Acceptance (Phase D)
  - [ ] Creating/editing items while offline enqueues and syncs successfully upon reconnection
  - [ ] E2E scenario for offline write/read passes without flakiness
  - [ ] No data loss or app crashes observed in offline/online transitions

---

## Phase E — Security Hardening

Goal: Enforce robust client-side security aligned with API protections.

- CSRF Integration
  - [ ] On app start (or on auth), GET `/api/csrf` and store token in memory
  - [ ] Inject `X-CSRF-Token` into state-changing requests via RTK Query `prepareHeaders`

- Auth & Tokens
  - [ ] Ensure auth cookie usage aligns with `SameSite`, `Secure` in prod
  - [ ] Route guard fully enforces auth boundaries; unauthorized flows tested

- CSP & Headers
  - [ ] Production CSP without `'unsafe-eval'`, minimal `'unsafe-inline'` with nonces/hashes
  - [ ] Restrict `connect-src` to known origins; remove blanket `https://*` in prod
  - [ ] Confirm `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, etc., are set via infra (not only meta tags)

- Acceptance (Phase E)
  - [ ] Playwright security smoke checks pass (no mixed content, CSP violations minimal and understood)
  - [ ] Manual audit shows CSRF header present on POST/PUT/PATCH/DELETE

---

## Phase F — Deployment & Observability

Goal: Smooth deployments and actionable telemetry.

- Config & Env
  - [ ] Keep frontend API baseUrl relative (`/api`) and handle origin routing via reverse proxy in environments
  - [ ] Document required env in `__docs__/DEPLOYMENT.md` and app-local `infra/README.md`

- Infra
  - [ ] Validate `infra/serverless.yml` path and manifest; ensure correct static hosting and API routing
  - [ ] Add Docker dev/prod images with multi-stage build

- Observability
  - [ ] Centralized error boundary (use `@repo/ui` Error Boundary) with log reporting
  - [ ] Optional Sentry/Logflare integration gated via env/flags

- Acceptance (Phase F)
  - [ ] Staging deployment promotes without config diffs
  - [ ] Playwright against staging green
  - [ ] Basic dashboards for errors and core web vitals available

---

## Deliverables by Phase

- Phase A: PR with proxy config, environment update, CSS removal, CSP split, route guard re-enabled, dependency cleanup
- Phase B: Tests added/updated with coverage report
- Phase C: Lazy routes, perf logs, image optimization, UX skeletons
- Phase D: IndexedDB offline queue + background sync + UI integration
- Phase E: CSRF and CSP hardening, auth guard enforcement
- Phase F: Deployment docs, Docker/infra updates, telemetry hooks

---

## Risks & Decisions

- Dual data libs: Standardize on RTK Query for HTTP per repo rules; keep TanStack Query only for isolated demo route or remove it entirely
- CSP tightening may require non-trivial changes to inline styles/scripts; prefer nonces/hashes over sprinkling `unsafe-inline`
- Offline conflict resolution must be chosen and documented to avoid ambiguous merges

---

## References

- Repo rules: Build-First Gate, Tailwind-only, RTK Query standard, Testing policy (Vitest/Playwright)
- Code: 
  - Vite config (PWA + Security headers): `apps/web/lego-moc-instructions-app/vite.config.ts`
  - Store composition: `src/store/store.ts`
  - API service (RTK Query + zod): `src/services/api.ts`
  - Env config: `src/config/environment.ts`
  - Offline stubs: `src/services/offlineApi.ts`
  - Router bootstrapping: `src/main.tsx`
  - API server: `apps/api/lego-projects-api/index.ts` (CSRF, CORS, rate limits)
