# <Feature/Scope> PRD

## Meta
- Tag: <e.g., feature-profile-backend>
- Owner: <name>
- Timeline: <date-range>
- Related: <links to issues/PRDs>

## Overview
Brief description of the capability and the end-user value.

## Goals
- <Outcome 1>
- <Outcome 2>

## Non-Goals (Out of Scope)
- <Explicitly list exclusions to prevent scope creep>

## Constraints & Standards (Must-Follow)
- Validation: Use Zod for all request/response schemas and runtime validation
- Data layer: Use Drizzle ORM for schema and queries (when backend applies)
- API calls (frontend): Use RTK Query with shared API client; do not use fetch/axios directly
- Import policy: Use path aliases (e.g., `@features/*`, `@ui/*`); prefer exports from `packages/**` over app-local copies
- UI reuse: Prefer canonical shared components (e.g., gallery from `@features/gallery`); extend via props/slots instead of forking
- API response envelope:
  - `{ status: number, message: string, data: <payload|null>, errorCode?: string }`
- Types: Avoid TypeScript enums; use Zod schemas/types as the source of truth
- Styling: Tailwind-only in web apps; avoid standalone CSS where prohibited
- Build tool: Vite; keep configurations aligned with repository standards
- E2E: Real services; no mocks; ≤ 15s per test
- Coverage gates: Apply in Phase B only (lines ≥ 90%, branches ≥ 85%, functions ≥ 90%, statements ≥ 90%)

## Dependencies & Environments
- Services to run: <docker-compose files / scripts>
- External services: <S3, email, etc.>
- Required env vars: <list (e.g., AWS_S3_BUCKET, etc.)>
- Data: <seed/fixtures strategy>

## Domain Model & Schemas
- Entities and fields (Drizzle)
- Zod schemas for requests/responses
- Relationships/indexes/performance considerations

## Endpoints (if applicable)
For each endpoint:
- Method/Path: `GET /api/...`
- Auth: <required?>
- Request: <Zod schema name>
- Responses:
  - 200: `<Zod schema name>` inside standard response envelope
  - 4xx/5xx: `{ status, message, data: null, errorCode }`
- Errors & edge cases: <list>

## Acceptance Criteria (per vertical slice)
- Phase A (Build):
  - Compiles and type-checks; minimal manual smoke (e.g., start server, basic UI render)
- Phase B1 (Unit Tests):
  - Vitest; mock external dependencies; colocate in `__tests__`; deterministic
- Phase B2 (E2E Smoke):
  - Playwright; real services/data; ≤ 15s/test; golden-path smoke first
- Phase C (Accessibility):
  - Basic a11y checks (e.g., axe) pass; meaningful ARIA roles; keyboard navigation for interactive elements (tab/enter/space)
  - Color contrast meets WCAG AA for text/icons; focus states visible; labels for inputs/buttons
  - Checklist:
    - Page landmarks present (`main`, `nav`, `header`, `footer` where appropriate)
    - Interactive controls have discernible names (labels/aria-label)
    - Tab order logical; no keyboard traps; skip-to-content available if long nav
    - Images have `alt` text; decorative images marked appropriately
    - Forms: errors announced and inputs tied to error messages via `aria-describedby`
  - Example: add `role="dialog"` and `aria-modal="true"` to modal; verify with axe in a unit test
- Phase D (UX/Performance):
  - No obvious layout shifts in common interactions; spinners/skeletons for async states
  - Meets defined micro-performance budget (e.g., initial render and key interaction under target thresholds in CI)
  - Checklist:
    - Loading states: skeleton or spinner shown for async fetches > 200ms
    - CLS minimized: avoid image layout shift (set width/height or aspect classes)
    - Avoid long tasks on main thread (>50ms) during critical interaction in CI profile
    - Virtualize long lists; debounce expensive handlers
  - Example: verify first render < 100ms and filter interaction < 50ms in CI profile; assert skeleton visible during fetch
- Phase E (Security):
  - No secrets in code; inputs sanitized/escaped where applicable; safe link targets; CSP-compatible patterns
  - Client-side error paths avoid leaking sensitive data in messages/logs
  - Checklist:
    - External links use `rel="noopener noreferrer"`
    - No direct `innerHTML` without sanitization; encode user-provided strings in UI
    - Tokens/keys only from env; never committed; verify via lint/secret scan
    - Avoid exposing stack traces to users; generic error messages
  - Example: add lint rule or unit guard preventing `dangerouslySetInnerHTML` in feature components
- Phase F (PWA Readiness):
  - Manifest and Service Worker (when app-level applies); installability criteria verified; icons defined
  - Network strategies documented for critical routes/assets
  - Checklist:
    - `manifest.json` present with name, short_name, start_url, scope, display, icons
    - Service worker registers in production build; skip in dev/test
    - Add-to-home-screen prompt test on mobile emulation
    - Static assets have proper cache headers; runtime caching strategy selected (e.g., stale-while-revalidate)
  - Example: verify `beforeinstallprompt` flow in E2E; assert manifest link tag present in HTML
- Phase G (Offline Mode):
  - Critical views degrade gracefully offline; cached assets/data paths defined and verified (when app-level applies)
  - Checklist:
    - App shows offline banner/state; retry actions available
    - Cache shell and critical assets; fallback UI when API fails due to offline
    - Queue writes (if applicable) to sync when online
  - Example: E2E toggles network offline; verifies cached gallery list renders and actions show retry

## Task Granularity Contract
- Size: ≤ 2 hours per task; ≤ 3 files changed; ≤ 80 net LoC; ≤ 1 new file
- Vertical slices only; if wider, split into follow-ups with explicit dependencies
- DoD is multi-phased for each slice:
  - A: Build Green
  - B1: Unit Tests Green
  - B2: E2E Smoke Green
  - C: Accessibility Checks Green
  - D: UX/Performance Checks Green
  - E: Security Checks Green
  - F: PWA Readiness Green (when applicable)
  - G: Offline Mode Green (when applicable)
- Reuse-first: update canonical shared code instead of creating duplicates

## Parsing Directives for Taskmaster
- Generate many small tasks with explicit dependencies
- For each slice, create three subtasks:
  - A: Build Green
  - B1: Unit Tests Green (mock externals)
  - B2: E2E Smoke Green (real services)
  - C: Accessibility Checks Green
  - D: UX/Performance Checks Green
  - E: Security Checks Green
  - F: PWA Readiness Green (if applicable)
  - G: Offline Mode Green (if applicable)
- Prefer updating existing files over creating new ones
- Output a flat list with priorities

## Deliverables
- Code + Zod schemas + Drizzle changes (if any)
- Tests (unit colocated; E2E in Playwright suite)
- Docs/notes for env, run, and test commands

## Rollout / Risks
- Migration notes, toggles/flags if needed, known risks

## Open Questions
- <list>

---

### Vertical Slice Template (example)

#### Slice: <Name>
- User value: <one line>
- Files expected (≤ 3):
  - <path 1>
  - <path 2>
- Phase A acceptance:
  - <compile, type-check, minimal smoke>
- Phase B acceptance:
  - Unit: <describe mocked tests>
  - E2E: <describe golden-path scenario>


