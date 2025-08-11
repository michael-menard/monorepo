# Code Consolidation & Package Optimization PRD

## Meta
- Tag: code-consolidation
- Owner: TBD
- Timeline: TBD
- Related: refactor-gallery-package.md, packages/features/gallery, packages/features/FileUpload, packages/features/shared

## Overview
Consolidate duplicate functionality across gallery, file upload, hooks, utils, and schemas into shared packages with a single source of truth, reducing maintenance and improving developer velocity.

## Goals
- 70% reduction in duplicate code across gallery and file upload
- 20% reduction in bundle size (target; no regressions)
- Consistent UI/UX and APIs across packages
- Clear package boundaries and responsibilities

## Non-Goals
- Changing backend contracts beyond response-envelope standardization

## Constraints & Standards (Must-Follow)
- Zod for schemas; avoid TypeScript enums
- Path aliases; prefer `packages/**` exports
- Tailwind-only styling; use shadcn/ui primitives
- RTK Query for app API calls
- Build: Vite; Tests: Vitest (frontend), Jest for backend
- E2E: Playwright, real services; ≤ 15s/test

## Dependencies & Environments
- Services: none (monorepo refactor)
- External: none
- Required env vars: none

## Domain Model & Schemas
- Shared `@shared/schemas` for File, Image, ApiResponse patterns
- Shared hooks: drag-and-drop, intersection observer, upload progress, infinite scroll

## Endpoints
- N/A (frontend packages); ensure response envelope alignment if/when used

## Acceptance Criteria (per vertical slice)
- Phase A: Compiles/type-checks; apps build
- Phase B1: Unit tests with mocks; colocated `__tests__`
- Phase B2: E2E smoke through key flows (gallery, upload) with real services
- Phase C: Basic a11y checks pass
- Phase D: Bundle/perf budgets met (no >10% regressions; tracked)
- Phase E: No high-severity security findings

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 net LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Create small tasks with explicit dependencies per consolidation area
- Subtasks A..E phases per slice
- Prefer updating canonical packages over app-level duplicates

## Deliverables
- `@shared/schemas`, `@shared/hooks`, `@shared/utils` packages populated
- `@features/gallery` unified APIs
- `@features/FileUpload` with plugin system
- Migration notes and updated imports across apps

## Rollout / Risks
- Breaking changes: maintain v1-compatible wrappers during migration
- Performance changes: bundle analysis gates in CI
- Team learning curve: docs and examples included

## Open Questions
- Which apps migrate first? Any feature flags needed?

---

### Vertical Slice: Shared Schemas
- Files: `packages/shared-schemas/src/index.ts`, tests, usage updates
- Budgets: compile/type-check; unit tests; CI bundle check ≤ +10%

### Vertical Slice: Shared Hooks
- Files: `packages/shared-hooks/src/*`, tests, docs

### Vertical Slice: Gallery Unification
- Files: `packages/features/gallery/*` unified API export; stories/tests

### Vertical Slice: FileUpload Plugin System
- Files: `packages/features/FileUpload/*` plugin API; tests; stories 