# Performance PRD

## Meta
- Tag: ops-performance
- Owner: TBD
- Timeline: TBD
- Related: code-quality-prd.md, ci workflow

## Overview
Define performance budgets, monitoring, and reporting (Lighthouse, bundle analyzer) across apps/packages.

## Goals
- Performance budgets enforced in CI
- Reports published for visibility

## Non-Goals
- App-level optimizations beyond monitoring and budgets (tracked per feature)

## Constraints & Standards (Must-Follow)
- Lighthouse CI optional; bundle analyzer; budgets checked in CI

## Dependencies & Environments
- GitHub Actions

## Acceptance Criteria (per vertical slice)
- Phase A: scripts configured
- Phase B1: unit perf checks for critical components (where applicable)
- Phase B2: Lighthouse CI/perf job runs
- Phase C: N/A
- Phase D: budgets enforced
- Phase E: N/A

## Task Granularity Contract
- ≤ 2 hours; ≤ 3 files; ≤ 80 LoC; ≤ 1 new file

## Parsing Directives for Taskmaster
- Small tasks with A..D subtasks

## Deliverables
- Bundle reports, Lighthouse results, budgets

## Rollout / Risks
- CI time ↑ → cache and stage runs
