---
doc_type: plan_meta
title: "KNOW — Meta Plan"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-24T23:55:00Z"
tags:
  - knowledgebase
  - mcp
  - ai-agents
  - institutional-memory
---

# KNOW — Meta Plan

## Story Prefix

All stories in this project use the **KNOW** prefix.
- Story IDs: `KNOW-001`, `KNOW-002`, etc.
- Story folders: `plans/stories/KNOW-XXX/`
- Artifact files: `ELAB-KNOW-XXX.md`, `PROOF-KNOW-XXX.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/stories/KNOW-XXX/` contains all per-story artifacts

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
| 2026-01-24T17:55 | bootstrap | Initial plan creation | KNOW.stories.index.md, KNOW.plan.meta.md, KNOW.plan.exec.md, KNOW.roadmap.md |
