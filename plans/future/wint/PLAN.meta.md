---
doc_type: plan_meta
title: "WINT — Meta Plan"
status: active
story_prefix: "WINT"
created_at: "2026-02-09T22:30:00Z"
updated_at: "2026-02-09T22:30:00Z"
tags:
  - database
  - workflow
  - agents
  - ml-pipeline
---

# WINT — Meta Plan

## Story Prefix

All stories in this project use the **WINT** prefix.
- Story IDs: `WINT-{phase}{story}{variant}` (e.g., `WINT-1010`, `WINT-2030`)
- Story folders: `plans/stories/WINT-XXXX/`
- Artifact files: `ELAB-WINT-1010.md`, `PROOF-WINT-2030.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/WINT-XXX/` contains all per-story artifacts

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
| 2026-02-09 15:30 | pm-bootstrap-generation-leader | Phase 2 execution | WINT.stories.index.md, WINT.plan.meta.md, WINT.plan.exec.md, WINT.roadmap.md, stage directories, SUMMARY.yaml |
