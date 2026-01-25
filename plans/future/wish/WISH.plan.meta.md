---
doc_type: plan_meta
title: "WISH — Meta Plan"
status: active
story_prefix: "WISH"
created_at: "2026-01-25T23:20:00Z"
updated_at: "2026-01-25T23:20:00Z"
tags:
  - wishlist
  - feature-epic
  - frontend
  - backend
---

# WISH — Meta Plan

## Story Prefix

All stories in this project use the **WISH** prefix.
- Story IDs: `WISH-2000`, `WISH-2001`, etc.
- Story folders: `plans/stories/WISH-XXX/`
- Artifact files: `ELAB-WISH-XXX.md`, `PROOF-WISH-XXX.md`, etc.

## Documentation Structure

- `plans/future/wish/` contains cross-cutting strategy and execution docs
- `plans/stories/WISH-XXX/` contains all per-story artifacts

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
| 2026-01-25 | bootstrap | Initial plan creation | WISH.stories.index.md, WISH.plan.meta.md, WISH.plan.exec.md, WISH.roadmap.md |
