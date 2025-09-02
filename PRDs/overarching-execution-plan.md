# Overarching Execution Plan — LEGO MOC Instructions App + Packages (Checklist)

Objective: Deliver the most impactful improvements first across the web app and shared packages, aligned to:
- [PRD: App](PRDs/lego-moc-instructions-app-improvement-prd.md)
- [PRD: Packages](PRDs/packages-improvement-prd.md)
- Tasks source of truth:
  - [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)
  - [.taskmaster/tasks/tasks_with_incremented_ids_cleaned.json](.taskmaster/tasks/tasks_with_incremented_ids_cleaned.json) (e.g., Task 260)

Legend:  
- [ ] Not started  •  [-] In progress  •  [x] Done

---

## Quick Start (Do these first)

- [x] A1: Configure Vite proxy for dev: route `/api` → `http://localhost:3000`  
      File: apps/web/lego-moc-instructions-app/vite.config.ts  
      Status: Proxy entry present (server.proxy). Validate end-to-end.
- [x] A2: Use relative `/api` in dev  
      File: apps/web/lego-moc-instructions-app/src/config/environment.ts  
      Change baseUrl in development to `/api`.
- [x] A3: Validate CSRF handshake via proxy  
      Endpoint: http://localhost:3001/api/csrf → expect 200 + Set-Cookie  
      Reference: apps/api/lego-projects-api/index.ts
- [x] A4: Type-check + build green (app)  
      Commands: `pnpm -w --filter @repo/lego-moc-instructions-app run type-check && pnpm -w --filter @repo/lego-moc-instructions-app run build`

Reference: [PRD: App Phase A](PRDs/lego-moc-instructions-app-improvement-prd.md)

---

## Sprint 1 — App Foundations + Gallery

### A) App Foundations (Build Green) — [PRD: App Phase A](PRDs/lego-moc-instructions-app-improvement-prd.md)

Connectivity & Config
- [x] A1: Vite dev proxy `/api` → `http://localhost:3000` (validate)  
      File: apps/web/lego-moc-instructions-app/vite.config.ts
- [x] A2: Dev `baseUrl = '/api'`  
      File: apps/web/lego-moc-instructions-app/src/config/environment.ts
- [x] A3: Validate CSRF endpoint via proxy (`/api/csrf`)  
      Server: apps/api/lego-projects-api/index.ts

Routing & Auth
- [x] A4: Re-enable TanStack route guards and verify Unauthorized flow  
      Files: apps/web/lego-moc-instructions-app/src/routes/* (use @repo/auth TanStack guard)  
      Tasks: 102 (auth tests), 24 (routing) — see [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Security Headers & CSP
- [x] A5: Split CSP (dev vs prod); harden production  
      Remove `'unsafe-eval'`, minimize `'unsafe-inline'` (nonces/hashes), restrict `connect-src`  
      File: apps/web/lego-moc-instructions-app/vite.config.ts  
      Tasks: 129 — see [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Styling (Tailwind-only)
- [ ] A6: Remove `src/styles.css`; migrate to Tailwind utilities only  
      File: apps/web/lego-moc-instructions-app/src/styles.css  
      PRD cross-ref: [Packages Phase C](PRDs/packages-improvement-prd.md)

Acceptance (Phase A)
- [x] App dev calls to `/api` work without CORS  
- [x] `type-check` passes  
- [x] `build` passes  
- [x] Guard redirects unauthenticated users correctly  
- [x] No app-level CSS remains (Tailwind-only)

### B) Gallery Canonicalization — [PRD: Packages Phases A/C/D/E](PRDs/packages-improvement-prd.md)

Refactor & Canonical Source
- [x] B1: Refactor @repo/gallery (Zod schemas, shadcn/ui, Tailwind-only)  
      Package: packages/features/gallery  
      Output: compiled exports only (`dist`), `"sideEffects": false`, `.d.ts` in exports
- [x] B2: Migrate app usages to canonical @repo/gallery exports; remove duplication  
      App: apps/web/lego-moc-instructions-app

Tests & Tasks
- [ ] B3: Integration tests for gallery flows (loading, render, interactions)  
      Tasks: 1 (Gallery refactor - master), 2 (Gallery consolidation - master), 260 (Refactor image Gallery Package - ready, high), 105 (Gallery integration tests - ready), 45 (done - cross-check)  
      Links:  
      - [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json) → 1, 2, 45, 105  
      - [.taskmaster/tasks/tasks_with_incremented_ids_cleaned.json](.taskmaster/tasks/tasks_with_incremented_ids_cleaned.json) → 260

Acceptance
- [x] App builds using canonical gallery package  
- [x] No duplicate gallery implementations  
- [ ] Integration tests pass

---

## Sprint 2 — Unified File Upload + Offline/PWA Baseline

### C) Unified File Upload — [PRD: Packages Phases A/C/E](PRDs/packages-improvement-prd.md)

Unification
- [x] C1: Create/solidify @repo/FileUpload (plugins/extensibility)  
      Consolidate duplicates (ImageUploadModal/moc-instructions DnD)  
      Export compiled outputs only; Tailwind-only styling
- [x] C2: Implement MOC upload areas using unified package  
      App Pages: MOC file upload areas

Tasks & Tests
- [ ] C3: Unit tests for validation, progress, DnD interactions  
      Task: 3 — see [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)  
- [ ] C4: Integrate with app flows: Tasks 18/19/20 (MOC upload areas)  
      Link: [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Acceptance
- [ ] App upload flows use unified @repo/FileUpload  
- [ ] Unit tests pass; app builds green

### D) Offline + PWA Baseline — [PRD: App Phase D](PRDs/lego-moc-instructions-app-improvement-prd.md)

Data Layer & SW
- [x] D1: IndexedDB-backed queue (e.g., idb) for offline writes  
- [x] D2: Workbox background sync (retry on reconnect)  
- [x] D3: RTK Query reads: stale-while-revalidate; hydrate caches for critical views  
- [x] D4: Wire OfflineStatusIndicator to real queue depth/last sync

Tasks & Tests
- [ ] D5: Implement/verify PWA pieces  
      Tasks: 137 (offline mode - high), 55 (offline support - low), 58 (PWA features - low)  
      Link: [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Acceptance
- [ ] App loads and navigates offline (shell + cached views)  
- [ ] Queued writes sync after reconnect (demonstrated)

---

## Sprint 3 — UX/Performance + Security/CI

### E) UX/Performance — [PRD: App Phase C](PRDs/lego-moc-instructions-app-improvement-prd.md)

Code & Assets
- [x] E1: Route-level lazy + intent prefetch (verify/tune)  
- [x] E2: Skeletons/shimmers for key pages (gallery/detail)  
- [x] E3: Image optimization (responsive/lazy), leverage @repo/shared-image-utils  
- [x] E4: Tune caching strategies; adjust manual chunks judiciously

Tasks & Tests
- [ ] E5: Perf monitoring and budgets (Web Vitals, bundle size)  
      Tasks: 111 (code splitting), 84 (skeletons), 96 (image optimization), 99 (caching), 46 (perf monitoring)  
      Link: [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Acceptance
- [ ] Improved TTI and bundle size  
- [ ] Perf budgets met; no regressions

### F) Security & CI Quality Gates — [PRD: App Phase E](PRDs/lego-moc-instructions-app-improvement-prd.md); [PRD: Packages Phase E](PRDs/packages-improvement-prd.md)

Client Security
- [x] F1: CSRF integration — GET `/api/csrf` on start/auth; attach `X-CSRF-Token` to mutations  
- [x] F2: Manual audit: token present on POST/PUT/PATCH/DELETE

CI Security Gates
- [x] F3: CI checks — pnpm audit + eslint-plugin-security; optional Snyk; fail on high severity  
- [x] F4: Upload reports and enforce gates in GH Actions

Tasks
- [ ] F5: Wire tasks 136 (security checks CI), 11 (CI workflow), 9 (security scanning)  
      Link: [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Acceptance
- [ ] CI fails on high severity issues  
- [ ] CSRF verified in client requests

---

## Sprint 4 — Packages Hygiene + Docs/Versioning/Deploy

### G) Packages Hygiene & Styling Standardization — [PRD: Packages Phases A/C/D/E](PRDs/packages-improvement-prd.md)

Build/Exports/Types
- [ ] G1: Standardize builds (Vite lib or tsc) per package  
- [ ] G2: Export compiled `dist` only; add `"types"` for subpaths; no `./src/*` in public exports  
- [ ] G3: `"sideEffects": false` where safe; tree-shakeable APIs  
- [ ] G4: Remove unnecessary peers (e.g., `react` in @repo/shared-cache if not needed)

Styling
- [ ] G5: Feature packages remove `styles.css` exports → Tailwind utilities only  
- [ ] G6: Evaluate @repo/ui `globals.css`; prefer Tailwind tokens/plugin where possible

Router Adapters
- [ ] G7: @repo/auth default TanStack adapter; optional `@repo/auth/react-router` subpath  
      Avoid pulling `react-router-dom` for TanStack apps

Acceptance
- [ ] `pnpm -w build` and `check-types` green across packages  
- [ ] No CSS exports from feature packages; minimal documented global CSS only if necessary for atoms  
- [ ] Consumer app does not compile through source; types resolve cleanly

### H) Docs, Versioning, Deployment — [PRD: App/Packages Phase F](PRDs/lego-moc-instructions-app-improvement-prd.md) • (PRDs/packages-improvement-prd.md)

- [ ] H1: Storybook alignment with Tailwind v4 atoms (where applicable)  
- [ ] H2: Changesets/versioning  
- [ ] H3: Deployment docs/pipelines (internal/external)  
- [ ] H4: READMEs updated with peer deps, examples, router adapter guidance, Tailwind tokens

Tasks
- [ ] H5: 61 (Storybook), 64 (Semantic versioning), 120 (Docs), 132 (Package deployment), 22 (Deployment docs)  
      Link: [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Acceptance
- [ ] Docs comprehensive; changesets configured; CI publish path validated

---

## Sprint 5 — Testing Hardening (Unit, Integration, E2E)

Goal: Achieve reliable, deterministic tests across the monorepo with clear separation of Unit (Vitest), Integration (Vitest/Jest + Supertest as applicable), and E2E (Playwright with real services). Enforce coverage thresholds and stabilize test tooling.

References:
- Policy: __docs__/TESTING_STRATEGY.md, __docs__/PLAYWRIGHT_TESTING.md, __docs__/TESTING_GUIDE.md
- PRDs: [App](PRDs/lego-moc-instructions-app-improvement-prd.md), [Packages](PRDs/packages-improvement-prd.md)
- Tasks: 
  - Unit/Integration: 102 (auth flow E2E/integration), 105 (gallery workflow integration), 108 (wishlist integration), 61/120 (docs/Storybook) — see [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)
  - Coverage/CI testing: ops-testing, ops-coverage, ops-ci-cd — see [.taskmaster/tasks/tasks.json](.taskmaster/tasks/tasks.json)

Unit (Vitest + Testing Library)
- [ ] T-Unit-1: Ensure unit test setup present per package (Vitest + jsdom where needed)
- [ ] T-Unit-2: Frontend packages/apps use MSW and module mocks for external calls (no network) 
- [ ] T-Unit-3: Add/verify unit coverage for:
      - @repo/lego-moc-instructions-app (components, hooks, RTK Query slices)
      - @repo/gallery, @repo/moc-instructions, @repo/auth, @repo/ui
      - @repo/shared-cache, @monorepo/shared (pure TS utils)
- [ ] T-Unit-4: Basic accessibility assertions (labels, roles, keyboard focus) for UI atoms and critical components
- [ ] T-Unit-5: Enforce coverage thresholds (Lines ≥ 90%, Branches ≥ 85%, Functions ≥ 90%, Statements ≥ 90%)
- [ ] T-Unit-6: Commands:
      - pnpm -w --filter ./packages/... run test:run
      - pnpm -w --filter @repo/lego-moc-instructions-app run test:run

Integration
- [ ] T-Int-1: Router + data layer integration tests (no real network; MSW for frontend)
- [ ] T-Int-2: App flows
      - Auth: login/signup/verify/reset route protections (Task 102)
      - Gallery: list/detail flows incl. interactions (Task 105)
      - Wishlist: CRUD, reordering, category handling (Task 108)
- [ ] T-Int-3: Backend integration (if applicable in this sprint): lego-projects-api with Jest + Supertest for HTTP endpoints
- [ ] T-Int-4: Commands:
      - Frontend: pnpm -w --filter @repo/lego-moc-instructions-app run test:run
      - Backend: pnpm -w --filter lego-projects-api test
- [ ] T-Int-5: Acceptance: Frontend integration tests green; backend integration tests green (where targeted)

E2E (Playwright, real services)
- [ ] T-E2E-1: Bring up required services (API on 3000, auth-service on 9000); use real data paths (no MSW)
- [ ] T-E2E-2: Scenarios:
      - Auth journey: signup → verify → login → protected route access
      - Gallery: browse → detail → (optional) link to MOC
      - MOC uploads (if file upload sprint complete) basic path with real endpoints
      - Offline happy-path navigation (if Offline sprint complete) 
- [ ] T-E2E-3: Keep per-test timeout ≤ 15s; prefer auto-waiting over sleeps
- [ ] T-E2E-4: Command:
      - pnpm -w --filter @repo/lego-moc-instructions-app run test:e2e
- [ ] T-E2E-5: Acceptance: All E2E pass reliably on local/staging; no flakey tests

Coverage & Reporting
- [ ] T-Cov-1: Enable/verify vitest coverage v8 for frontend; default Jest coverage for backend
- [ ] T-Cov-2: Centralize coverage artifacts (CI uploads), set thresholds as policy gates (see ops-coverage)
- [ ] T-Cov-3: Commands:
      - pnpm -w --filter ./packages/... run test:coverage
      - pnpm -w --filter @repo/lego-moc-instructions-app run test:coverage

Acceptance (Sprint 5)
- [ ] Unit + Integration + E2E suites green across targeted packages/apps
- [ ] Coverage thresholds met (global)
- [ ] Deterministic runs (no network in unit/integration; real services in E2E)
- [ ] CI job executes tests with artifacts uploaded and gates enforced

---

## Top 10 Most Impactful Actions (Do these first)

- [ ] T1: Vite proxy + dev baseUrl `/api`; validate calls (App A)  
- [ ] T2: Re-enable TanStack route guards; Unauthorized flow (App A)  
- [ ] T3: Harden production CSP (remove `'unsafe-eval'`, restrict `connect-src`) (App A/E)  
- [ ] T4: Remove app `src/styles.css`; Tailwind-only (App A)  
- [ ] T5: Refactor @repo/gallery → canonical + migrate usages (Packages A/C/D/E; Tasks 1,2,260,105)  
- [ ] T6: Create unified @repo/FileUpload; use for MOC uploads (Packages A/C/E; Task 3; then 18/19/20)  
- [ ] T7: Implement offline queue + background sync; wire indicators (App D; Task 137)  
- [ ] T8: Code split + skeletons + image optimization + caching (App C; 111,84,96,99)  
- [ ] T9: Add CI security gates; fail on high severity (Tasks 136,11,9)  
- [ ] T10: CSRF integration: GET `/api/csrf` and attach header on mutations (App E)

---

## Commands (Reference)

- [ ] Build/type-check all packages  
  Command:  
  - `pnpm -w build`  
  - `pnpm -w --filter ./packages/... run check-types`

- [ ] Run app tests  
  Command:  
  - `pnpm -w --filter @repo/lego-moc-instructions-app run test:run`  
  - `pnpm -w --filter @repo/lego-moc-instructions-app run test:e2e`

- [ ] Example package builds  
  Command:  
  - `pnpm -w --filter @repo/gallery run build`  
  - `pnpm -w --filter @repo/FileUpload run build`

This checklist sequences high-impact and risk-reduction first (App Foundations, Gallery, File Upload), then reliability (Offline), speed (Perf), defense (Security/CI), and finally long-term maintainability (Packages hygiene, Docs/Versioning/Deploy). Check items as you complete them and refer to PRDs and Taskmaster tasks for detailed acceptance criteria.
