# Code Quality & Analysis Tools Integration PRD

## Meta
- Tag: code-quality
- Owner: TBD
- Timeline: 2–3 weeks (est.)
- Related: .github/workflows/ci.yml, quality scripts in package.json

## Overview
Integrate formatting, linting, complexity, security, testing, dependency, and bundle analysis into CI and local workflows to raise and enforce quality standards across the monorepo.

## Goals
- Pre-commit hooks prevent low-quality commits
- CI quality gates (lint, type, test, security, complexity) pass to merge
- Baseline and trend reports for complexity, coverage, and performance

## Non-Goals
- Replacing existing build toolchain beyond necessary config

## Constraints & Standards (Must-Follow)
- Use pnpm; scripts run non-watch (CI and local default)
- Tests: Vitest for frontend; Jest for backend APIs
- Coverage thresholds enforced in Phase B only (lines ≥ 90%, branches ≥ 85%, functions ≥ 90%, statements ≥ 90%)
- E2E: Playwright; real services; ≤ 15s/test; no MSW
- Security: zero high-severity vulnerabilities

## Dependencies & Environments
- GitHub Actions for CI
- Optional services: SonarQube/CodeClimate, Snyk

## Domain Model & Schemas
- N/A (tooling focus). Ensure API response envelope is enforced where applicable

## Endpoints
- N/A

## Acceptance Criteria (per vertical slice)
- Phase A: quality scripts exist; CI workflow runs; compiles/type-checks green
- Phase B1: unit tests run (mock externals); coverage collected
- Phase B2: E2E smoke job runs against real services
- Phase C: a11y checks run for UI packages (axe unit-level)
- Phase D: performance budgets enforced (Lighthouse or budgets)
- Phase E: security scanning gates CI (pnpm audit, eslint-plugin-security; optional Snyk)

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file per task

## Parsing Directives for Taskmaster
- Generate small, dependency-ordered tasks with subtasks A..E per slice
- Prefer updates to existing configs over new files, except where required

## Deliverables
- Updated package.json quality scripts
- .github/workflows/ci.yml with quality stages
- Husky + lint-staged pre-commit hooks
- Reports under `reports/*` (complexity, coverage, bundle)

## Rollout / Risks
- CI time increase → parallelize, cache, and stage
- Rule conflicts → harmonize ESLint/Prettier and document decisions

## Open Questions
- Choose SonarQube vs CodeClimate or skip initially?

---

### Vertical Slice: Prettier & ESLint Integration
- Files: `.prettierrc`, ESLint config updates, scripts
- Phases A..E as above

### Vertical Slice: Complexity Baseline
- Files: scripts for Plato/sonarjs; baseline report

### Vertical Slice: Security Scanning
- Files: add eslint-plugin-security, pnpm audit in CI; optional Snyk

### Vertical Slice: CI Workflow
- Files: `.github/workflows/ci.yml` running lint, type, test, coverage, audit, bundles