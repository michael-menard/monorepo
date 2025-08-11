# Coverage Report & Badge PRD

## Meta
- Tag: ops-coverage
- Owner: TBD
- Timeline: TBD
- Related: code-quality-prd.md, ops-ci-cd

## Overview
Publish coverage reports in CI and expose a coverage badge in README or docs.

## Goals
- Automated coverage generation and artifact upload
- Coverage badge kept up-to-date

## Non-Goals
- Enforcing thresholds here (handled in testing/code-quality)

## Constraints & Standards (Must-Follow)
- Vitest coverage (frontend), Jest coverage (backend)
- CI uploads reports to `reports/coverage`

## Dependencies & Environments
- GitHub Actions

## Acceptance Criteria (per vertical slice)
- Phase A: scripts and CI steps exist
- Phase B1: unit coverage artifacts produced
- Phase B2: optional E2E coverage if applicable
- Phase C/D/E: N/A

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Create small tasks with A..B subtasks

## Deliverables
- Coverage reports and badge

## Rollout / Risks
- Badge drift → ensure CI updates badge on default branch
