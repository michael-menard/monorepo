# Gallery Component Refactor PRD

## Meta
- Tag: feature-gallery-refactor
- Owner: TBD
- Timeline: TBD
- Related: packages/features/gallery, packages/ui, code-consolidation-prd.md

## Overview
Refactor the Gallery into a production-ready, extensible component system built on shadcn/ui primitives and Tailwind, preserving the stacked-album visual effect and supporting single items and albums.

## Goals
- Unified, typed API and layouts (stack, grid, masonry)
- Backward compatibility for existing usages
- A11y and performance budgets enforced

## Non-Goals
- Backend changes; non-gallery feature rewrites

## Constraints & Standards (Must-Follow)
- Zod for schemas/types; no TypeScript enums
- Tailwind-only; use `@ui/*` components; `cn()` for class merging
- Path aliases; prefer `packages/**` exports
- Vite build; Vitest unit tests; Playwright E2E (no mocks; ≤ 15s)

## Dependencies & Environments
- None (frontend package refactor)

## Domain Model & Schemas
- Base card, MOC card, Inspiration card, layout/config schemas (Zod)

## Endpoints
- N/A

## Acceptance Criteria (per vertical slice)
- Phase A (Build): compiles/type-checks; Storybook renders
- Phase B1 (Unit): Vitest; mock externals
- Phase B2 (E2E): app smoke renders gallery and basic interactions
- Phase C (A11y): axe checks; keyboard navigation; ARIA as needed
- Phase D (UX/Perf): initial render and key interactions within budgets; lazy image loading
- Phase E (Security): no unsafe HTML; links safe; no secrets

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file per task

## Parsing Directives for Taskmaster
- Generate small tasks with explicit dependencies
- Subtasks per slice: A, B1, B2, C, D, E
- Prefer updating canonical shared code; avoid duplication

## Deliverables
- Updated `packages/features/gallery` (and/or `packages/ui` export)
- Zod schemas + unit tests; Storybook examples
- Notes on usage and migration

## Rollout / Risks
- Visual regressions → migration stories, parity checks
- Performance regressions → lazy/virtualization; measure in CI
- API churn → Zod transforms for v1 wrappers

---

### Vertical Slice: Zod + shadcn integration
- Files: `gallery-schemas.ts`, `gallery.tsx`, `__tests__/gallery.test.tsx`
- A: compile/story; B: unit; B2: app smoke

### Vertical Slice: Layout Strategy (stack/grid)
- Files: `gallery-stack.tsx`, `gallery-grid.tsx`, `gallery-layouts.test.tsx`
- A..E as above
