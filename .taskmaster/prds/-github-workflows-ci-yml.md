# CI/CD Workflow PRD

## Meta
- Tag: ops-ci-cd
- Owner: TBD
- Timeline: TBD
- Related: .github/workflows/ci.yml, code-quality-prd.md

## Overview
Provide a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs lint, type-check, unit tests (coverage), security scans, dependency checks, and optional bundle/performance checks.

## Goals
- Reliable, parallelized CI with clear quality gates
- Fast feedback (≤10m typical run)

## Non-Goals
- Deployment strategy details (documented separately if needed)

## Constraints & Standards (Must-Follow)
- pnpm; no watch flags in CI
- Frontend tests: Vitest; Backend tests: Jest/Supertest
- E2E: Playwright uses real services; ≤ 15s/test
- Security: fail CI on high severity vulnerabilities

## Dependencies & Environments
- GitHub Actions runners; caching for pnpm and build artifacts

## Acceptance Criteria (per vertical slice)
- Phase A: CI file exists; runs lint+type
- Phase B1: unit tests + coverage report
- Phase B2: E2E smoke job (optional stage) against real services
- Phase C: basic a11y unit checks in UI packages
- Phase D: bundle/perf checks (report or budget gate)
- Phase E: security scans (pnpm audit, eslint-plugin-security; optional Snyk)

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Generate small tasks with A..E subtasks

## Deliverables
- `.github/workflows/ci.yml` with stages and caching
- Coverage/artifact upload to `reports/*`

## Rollout / Risks
- Longer CI time → cache and parallelize
- Tool conflicts → harmonize configs

---

### Vertical Slice: Baseline CI
- Files: `ci.yml` with lint, type, unit stages

### Vertical Slice: Security + Coverage
- Files: extend `ci.yml` with audit, coverage upload

### Vertical Slice: E2E Smoke (optional gated)
- Files: add Playwright job with required services up
