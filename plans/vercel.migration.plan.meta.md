---
doc_type: plan_meta
title: "Vercel Migration — Meta Plan"
status: active
created_at: "2026-01-17T19:50:34-07:00"
updated_at: "2026-01-17T19:50:34-07:00"
tags:
  - vercel
  - migration
  - planning
---

# Vercel Migration — Meta Plan

## Documentation Structure
- `plans/` contains cross-cutting migration strategy and execution docs
- `plans/stories/story-XXX/` contains all per-story artifacts

## Naming Rule (timestamps in filenames)
All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)

## Principles
- Story folders are atomic and self-contained
- Documentation structure must be automation-friendly
- Stories represent units of intent, validation, and evidence

## Principles (additions)

### Reuse First (Non-Negotiable)
- Prefer reusing existing workspace packages under `packages/**` over creating per-story utilities.
- Story implementation MUST NOT introduce “one-off” copies of shared concerns (logging, auth, response shaping, request parsing, error mapping, env validation).
- If a needed capability is missing, the default action is:
  1) extend an existing package, or
  2) create a new shared package in `packages/backend/*` or `packages/core/*` (not inside an app).

### Package Boundary Rules
- `packages/core/*` must not depend on `packages/backend/*` (core stays portable).
- `packages/backend/*` may depend on `packages/core/*`.
- `packages/tools/*` is for CLIs/scripts only and must not be required at runtime.

### Import Policy
- Shared code MUST be imported via workspace package names (no deep relative imports across apps).

---

## Agent Log
Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-17T19:50:34-07:00 | doc-migration | Added structure + naming rule + agent sign-off log | `plans/vercel.migration.plan.meta.20260117-1950.md` |
