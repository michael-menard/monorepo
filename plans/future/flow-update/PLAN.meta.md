---
doc_type: plan_meta
title: "FLOW — Meta Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T12:50:00Z"
updated_at: "2026-02-01T12:50:00Z"
tags:
  - workflow-refactor
  - token-optimization
  - evidence-driven-architecture
---

# FLOW — Meta Plan

## Story Prefix

All stories in this project use the **FLOW** prefix.
- Story IDs: `FLOW-001`, `FLOW-002`, etc.
- Story folders: `plans/future/flow-update/`
- Artifact files: `ELAB-FLOW-XXX.md`, `PROOF-FLOW-XXX.md`, etc.

## Documentation Structure

- `plans/` contains cross-cutting strategy and execution docs
- `plans/future/flow-update/` contains feature-level artifacts
- `plans/future/flow-update/backlog/`, `elaboration/`, `ready-to-work/`, `in-progress/`, `UAT/` contain per-story work artifacts

## Naming Rule

All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles

- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

### Reuse First (Non-Negotiable)

- Prefer reusing existing workspace packages under `packages/**`
- Prefer reusing existing agents under `.claude/agents/`
- If capability missing: extend existing package or agent, or create new shared capability
- No per-story one-off utilities or agents

### Package Boundary Rules

- Core logic in `packages/core/*`
- Backend utilities in `packages/backend/*`
- Agent implementations in `.claude/agents/`

### Import Policy

- Shared code MUST be imported via workspace package names
- No deep relative imports across package boundaries

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-01T12:50 | pm-bootstrap-generation-leader | Initial plan creation | stories.index.md, PLAN.meta.md, PLAN.exec.md, roadmap.md |
