---
doc_type: plan_meta
title: "INSP — Meta Plan"
status: active
story_prefix: "INSP"
created_at: "2026-02-04T00:00:00Z"
updated_at: "2026-02-04T00:00:00Z"
tags:
  - inspiration-gallery
  - frontend
  - backend
  - gallery-system
---

# INSP — Meta Plan

## Story Prefix

All stories in this project use the **INSP** prefix.
- Story IDs: `INSP-001`, `INSP-002`, etc.
- Story folders: `plans/stories/INSP-XXX/`
- Artifact files: `ELAB-INSP-XXX.md`, `PROOF-INSP-XXX.md`, etc.

## Documentation Structure

- `plans/future/inspiration-gallery/` contains cross-cutting strategy and execution docs
- `plans/stories/INSP-XXX/` contains all per-story artifacts

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)
- Example: `ELAB-INSP-001-20260204-1030.md`

## Principles

### Story Folders are Atomic and Self-Contained

Each story folder (`INSP-XXX/`) is the single source of truth for all related documentation:
- Story definition
- Elaboration
- Implementation proof
- Code review findings
- QA verification
- Architectural decisions

### Documentation Structure Must Be Automation-Friendly

- Consistent file naming
- YAML frontmatter on all files
- Structured data (tables, lists) over prose
- Status fields for query/filtering
- Append-only agent logs

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- No per-story one-off utilities
- If capability missing: extend existing package or create new shared package
- Document reuse decisions in `## Reuse Plan` section (PM) and `## Reuse Verification` section (Dev)

### Package Boundary Rules

| Category | Package Path |
|----------|--------------|
| Core logic | `packages/core/*` |
| Backend utilities | `packages/backend/*` |
| Frontend components | `packages/core/app-component-library` |
| Design system | `packages/core/design-system` |
| Logger | `packages/core/logger` |
| Accessibility | `packages/core/accessibility` |

### Import Policy

- Shared code MUST be imported via workspace package names (`@repo/...`)
- No deep relative imports across package boundaries
- No circular dependencies between packages

---

## Agent Log

Append-only record of all agents touching this plan.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-04 | pm-bootstrap-generation-leader | Initial plan creation | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |

---
