---
doc_type: plan_meta
title: "BUGF — Meta Plan"
status: active
story_prefix: "BUGF"
created_at: "2026-02-10T00:00:00Z"
updated_at: "2026-02-10T00:00:00Z"
tags:
  - bug-fixes
  - feature-completion
  - testing
  - code-quality
---

# BUGF — Meta Plan

## Story Prefix

All stories in this project use the **BUGF** prefix.
- Story IDs: `BUGF-001`, `BUGF-002`, etc.
- Story folders: `plans/future/bug-fix/`
- Artifact files: `ELAB-BUGF-XXX.md`, `PROOF-BUGF-XXX.md`, etc.

## Documentation Structure

- `plans/future/bug-fix/` contains cross-cutting strategy and execution docs
- `plans/future/bug-fix/backlog/` contains backlog stories
- `plans/future/bug-fix/elaboration/` contains stories being elaborated
- `plans/future/bug-fix/ready-to-work/` contains stories ready for implementation
- `plans/future/bug-fix/in-progress/` contains stories being implemented
- `plans/future/bug-fix/UAT/` contains stories in QA/verification

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
| 2026-02-10 00:00:00 | pm-bootstrap-generation-leader | Initial plan creation | BUGF.stories.index.md, BUGF.plan.meta.md, BUGF.plan.exec.md, BUGF.roadmap.md |
