---
doc_type: plan_meta
title: "REPA — Meta Plan"
status: active
story_prefix: "REPA"
created_at: "2026-02-09"
updated_at: "2026-02-09"
tags:
  - code-reuse
  - package-consolidation
  - monorepo
  - deduplication
---

# REPA — Meta Plan

## Story Prefix

All stories in this project use the **REPA** prefix.
- Story IDs: `REPA-001`, `REPA-002`, etc.
- Story folders: `plans/stories/REPA-XXX/`
- Artifact files: `ELAB-REPA-XXX.md`, `PROOF-REPA-XXX.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/REPA-XXX/` contains all per-story artifacts

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
| 2026-02-09 | bootstrap | Initial plan creation | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |
