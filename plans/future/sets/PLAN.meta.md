---
doc_type: plan_meta
title: "SETS — Meta Plan"
status: active
story_prefix: "SETS"
created_at: "2026-01-25T23:58:00Z"
updated_at: "2026-01-25T23:58:00Z"
tags:
  - collection-management
  - lego-ecosystem
  - gallery-feature
---

# SETS — Meta Plan

## Story Prefix

All stories in this project use the **SETS** prefix.
- Story IDs: `SETS-001`, `SETS-002`, etc.
- Story folders: `plans/stories/SETS-XXX/`
- Artifact files: `ELAB-SETS-XXX.md`, `PROOF-SETS-XXX.md`, etc.

## Documentation Structure

- `plans/future/sets/` contains cross-cutting strategy and execution docs
- `plans/stories/SETS-XXX/` contains all per-story artifacts

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package

### Package Boundary Rules

- Core logic in `packages/core/*`
- Backend utilities in `packages/backend/*`
- Frontend components in `packages/core/app-component-library`

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-25 17:58 | pm-bootstrap-generation-leader | Initial plan creation | SETS.stories.index.md, SETS.plan.meta.md, SETS.plan.exec.md, SETS.roadmap.md |
