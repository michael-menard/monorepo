---
doc_type: plan_meta
title: "COGN — Meta Plan"
status: active
story_prefix: "COGN"
created_at: "2026-02-03T23:10:00Z"
updated_at: "2026-02-03T23:10:00Z"
tags:
  - authorization
  - cognito
  - jwt
  - quotas
  - freemium
---

# COGN — Meta Plan

## Story Prefix

All stories in this project use the **COGN** prefix.
- Story IDs: `COGN-001`, `COGN-002`, etc.
- Story folders: `plans/future/cognito-scopes/backlog/COGN-XXX/`, `plans/future/cognito-scopes/elaboration/COGN-XXX/`, etc.
- Artifact files: `ELAB-COGN-XXX.md`, `PROOF-COGN-XXX.md`, etc.

## Documentation Structure

- `plans/future/cognito-scopes/` contains cross-cutting strategy and execution docs
- `plans/future/cognito-scopes/{backlog,elaboration,ready-to-work,in-progress,UAT}/COGN-XXX/` contains all per-story artifacts

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
| 2026-02-03T23:10:00Z | pm-bootstrap-generation | Initial plan creation | COGN.stories.index.md, COGN.plan.meta.md, COGN.plan.exec.md, COGN.roadmap.md |
