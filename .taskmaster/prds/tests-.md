# Testing PRD

## Meta
- Tag: ops-testing
- Owner: TBD
- Timeline: TBD
- Related: code-quality-prd.md, coverage report & badge.md

## Overview
Standardize testing across the monorepo with Vitest for frontend and Jest for backend, establishing coverage reporting and deterministic tests.

## Goals
- Deterministic, fast unit tests with mocks for externals
- Clear coverage reporting and thresholds

## Non-Goals
- Full E2E coverage (smoke only here; full suite tracked elsewhere)

## Constraints & Standards (Must-Follow)
- Vitest (frontend), Jest+Supertest (backend)
- Mock all external dependencies in unit/integration tests; E2E has no mocks
- Coverage thresholds enforced in Phase B only (lines ≥ 90%, branches ≥ 85%, functions ≥ 90%, statements ≥ 90%)
- No watch mode in CI

## Dependencies & Environments
- Node 18+, pnpm, GitHub Actions

## Acceptance Criteria (per vertical slice)
- Phase A: base configs compile
- Phase B1: unit tests green with coverage
- Phase B2: E2E smoke path defined and runs ≤ 15s/test
- Phase C: basic axe checks for UI
- Phase D: performance budgets for critical interactions
- Phase E: no security regressions in test helpers

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Generate small tasks with A..E subtasks

## Deliverables
- Updated configs, sample tests, and scripts

## Rollout / Risks
- Flaky tests → stabilize with proper mocks and cleanup

---

### Vertical Slice: Vitest Baseline
- Files: `vitest.config.ts`, example unit test, coverage config

### Vertical Slice: Jest for Backend
- Files: `jest.config.ts`, example Supertest

### Vertical Slice: E2E Smoke
- Files: Playwright smoke spec, service bootstrap notes
