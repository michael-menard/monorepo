# PRD: Cline Workspace Rules Expansion and Hardening

Author: Cline  
Owners: Eng Platform / Frontend / Backend  
Status: Draft  
Target folder: `.clinerules/` (workspace rules Cline loads automatically)  
Related: `.cursor/rules` (source policies), `__docs__/SECURITY.md`, `__docs__/PLAYWRIGHT_TESTING.md`, `__docs__/MONITORING.md`, `__docs__/SEMANTIC_VERSIONING_SETUP_COMPLETE.md`, `__docs__/CHANGESET_GUIDE.md`, `drizzle.config.ts`, `scripts/test-security-headers.js`

## 1. Summary

Expand the active Cline ruleset to cover key gaps (security, API standards, observability, data, CI gates, performance, accessibility, error UX, assets, feature flags, routing, naming) while aligning with existing Cursor rules and repository conventions. This PRD defines new rule files to add under `.clinerules/`, acceptance criteria, and a minimal, risk‑controlled rollout plan consistent with “Build‑First” policy.

## 2. Goals

- Codify missing high-value policies as Cline workspace rules to improve consistency and delivery quality.
- Keep rules modular and discoverable (one topic per file).
- Ensure rules align with existing monorepo practices and docs.
- Avoid scope creep: Phase A is rules authoring + build green; enforcement automation comes later.

## 3. Non-Goals

- Changing library choices or project architecture beyond what’s already documented.
- Rewriting existing rules in `.cursor/rules` except where clarifications are needed in `.clinerules`.
- Building new CI jobs in this PRD; we only specify rules and acceptance criteria for future enforcement.

## 4. Background / Current State

- Workspace rules for Cline live under `.clinerules/`. Cline aggregates all Markdown files there as active rules.
- Project already has robust Cursor rules under `.cursor/rules` (build-first, testing, UI, architecture, imports, editing scope, etc.).
- Some topics are not fully covered in the active Cline rules (e.g., observability/logging, RTK Query usage policy, API standards/versioning, secrets handling, DB migration policy, CI quality gates, performance budgets, a11y testing, error UX patterns, assets/images, feature flags, routing/loading patterns, file naming).

## 5. Scope (Rule files to add)

Create the following rule files in `.clinerules/`:

1. `commit-and-release.md`
   - Conventional Commits enforced for all commits
   - Use Changesets for versioning any public package changes
   - Reference: `__docs__/SEMANTIC_VERSIONING_SETUP_COMPLETE.md`, `__docs__/CHANGESET_GUIDE.md`

2. `security-secrets-and-cookies.md`
   - HttpOnly, Secure, SameSite (strict or lax per route) cookie policy
   - CSRF strategy for cookie-based auth
   - Secret handling: never commit secrets; approved env var names/locations; rotation guidance
   - Reference: `__docs__/SECURITY.md`, `__docs__/AUTH-DEV-SETUP.md`, `scripts/test-security-headers.js`

3. `api-standards.md`
   - Error response shape (option: RFC7807 or uniform `{ statusCode, message, data }`)
   - Pagination, idempotency keys for unsafe ops, rate limit headers, API versioning & deprecation policy
   - Backend/Frontend error mapping guidelines

4. `observability.md`
   - Structured logging with request/correlation IDs, PII scrubbing, log levels
   - Where to log (client vs server), redaction policy
   - Reference: `__docs__/MONITORING.md`

5. `rtk-query-standards.md`
   - Central API slice placement and export pattern
   - `tagTypes`, invalidation rules, cache lifetimes, refetch policy
   - Normalized error format; mutation side-effects pattern

6. `redux-structure.md`
   - Feature slices structure, file layout, selector memoization, store composition
   - Middleware guidelines (prefer RTK Query over thunks for network IO)

7. `drizzle-migrations.md`
   - Migration creation/review, seeding strategy, safe rollbacks
   - Local dev DB via docker-compose, test DB isolation
   - Reference: `drizzle.config.ts`, app-level compose files

8. `ci-quality-gates.md`
   - Required checks per PR: lint, typecheck, unit (Vitest), backend (Jest), build
   - Coverage thresholds and exceptions, Turbo selective execution, PR required checks, concurrency/cancel-in-progress
   - Reference: `__docs__/monorepo_ci_cd_scaffold/*`

9. `performance-budgets.md`
   - Per-app bundle/Lighthouse budgets, initial JS/CSS limits
   - Dynamic import & route-level code splitting, image formats (webp/avif), memoization expectations

10. `a11y-testing.md`

- Axe checks in CI on key routes/components
- Semantic landmarks, focus-visible, contrast, SR sanity checks for primary flows
- Reference: `__docs__/PLAYWRIGHT_TESTING.md` (for E2E constraints)

11. `error-ux.md`

- Error boundaries vs inline errors
- Toast/notification patterns, retry & fallback rules
- Distinguish empty, error, loading states

12. `assets-images.md`

- Use `packages/shared-image-utils` helpers, responsive images, lazy loading, placeholders
- Asset size limits and S3/CloudFront caching headers guidance

13. `feature-flags.md`

- Provider pattern, default-off for risky features, environment-scoped configs
- Kill-switch expectation and rollback plan

14. `routing-and-loading.md`

- Suspense-readiness (if applicable), skeletons over spinners for >300ms
- Route-level lazy imports, prefetching heuristics

15. `file-naming.md`

- Suffix conventions: `.types.ts`, `.schema.ts`, `.hooks.ts`, `.constants.ts`, `.test.tsx`
- One component per directory with `index.tsx`; colocated `__tests__/`

16. `e2e-env.md`

- Playwright bring-up: required services via docker-compose, health checks, seeded data/users
- No MSW; 15s max per test; retries and parallelism guidance
- Reference: `__docs__/PLAYWRIGHT_TESTING.md`

## 6. Acceptance Criteria

- All rule files above exist in `.clinerules/` with clear, actionable bullets and examples where useful.
- Rules explicitly cite relevant repository docs and code paths where applicable.
- Wording complements existing rules (e.g., Build-First Gate); no contradictions:
  - Build-First Gate remains primary for Phase A (compiles + type-checks).
  - Testing/enforcement automation are deferred to Phase B tasks.
- Each rule includes a short “Scope/Applies to” header to reduce ambiguity.

## 7. Implementation Plan

Phase A (Rules Authoring + Build Green):

- Add the 16 rule files to `.clinerules/`.
- Cross-check against `.cursor/rules` to avoid conflicts.
- Ensure repo builds and type-checks remain green (no CI policy changes yet).

Phase B (Enforcement + Tooling) [Future tasks]:

- Wire CI checks (Conventional Commits, coverage gates, axe checks for key routes).
- Add lint plugins / codegen templates if needed (non-blocking).
- Document “how to comply” examples in `__docs__/`.

## 8. Risks & Mitigations

- Risk: Rules sprawl or contradictions.  
  Mitigation: Keep one-topic-per-file; add “References” and “Applies to” sections; cross-reference existing rules.

- Risk: Over-enforcement increases friction.  
  Mitigation: Phase A only codifies guidance; enforcement is a separate, opt-in Phase B.

- Risk: Backend/Frontend mismatch in error or logging shape.  
  Mitigation: Define shape in `api-standards.md` and reference adapters on both sides.

## 9. Dependencies

- Existing docs: `__docs__/SECURITY.md`, `__docs__/PLAYWRIGHT_TESTING.md`, `__docs__/MONITORING.md`, `__docs__/SEMANTIC_VERSIONING_SETUP_COMPLETE.md`, `__docs__/CHANGESET_GUIDE.md`.
- Existing scripts: `scripts/test-security-headers.js`.
- Existing configs: `drizzle.config.ts`, CI workflows (future updates).

## 10. Success Metrics

- Qualitative: Fewer review comments about security, API shape, logging, RTK Query misuse, routing/loading UX, a11y gaps.
- Quantitative:
  - Bundle budgets respected; fewer Lighthouse regressions.
  - Stable CI with clear gates (after Phase B).
  - E2E runs don’t flap due to missing services or bad data (after Phase B).

## 11. Work Items (files to add)

Create the following under `.clinerules/`:

- `commit-and-release.md`
- `security-secrets-and-cookies.md`
- `api-standards.md`
- `observability.md`
- `rtk-query-standards.md`
- `redux-structure.md`
- `drizzle-migrations.md`
- `ci-quality-gates.md`
- `performance-budgets.md`
- `a11y-testing.md`
- `error-ux.md`
- `assets-images.md`
- `feature-flags.md`
- `routing-and-loading.md`
- `file-naming.md`
- `e2e-env.md`

Each file must include:

- Purpose / Scope (Applies to)
- Policies (actionable bullets)
- Examples (where beneficial)
- References (repo docs / code paths)

## 12. Open Questions

- Finalize API error shape: RFC7807 vs existing `{ statusCode, message, data }`.
- Preferred logging lib on server (Pino vs Winston), and client logging strategy.
- Exact budgets per app (establish by sampling current Lighthouse/bundle stats).

## 13. Appendix: Mapping to Existing Rules

- Build-First / Testing / UI / Architecture / Import Hygiene / Edit Scope constraints remain active and should be cross‑referenced as needed.
- These additions extend coverage; they do not supersede existing constraints unless explicitly noted.
