---
doc_type: plan_exec
title: "FLOW — Execution Plan"
status: active
story_prefix: "FLOW"
created_at: "2026-02-01T12:50:00Z"
updated_at: "2026-02-01T12:50:00Z"
tags:
  - workflow-refactor
  - token-optimization
  - evidence-driven-architecture
---

# FLOW — Execution Plan

## Story Prefix

All stories use the **FLOW** prefix. Commands use the full prefixed ID:
- `/elab-story FLOW-001`
- `/dev-implement-story FLOW-001`
- `/dev-code-review FLOW-001`
- `/qa-verify-story FLOW-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/future/flow-update/{stage}/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `FLOW-XXX.md` |
| Elaboration | `ELAB-FLOW-XXX.md` |
| Proof | `PROOF-FLOW-XXX.md` |
| Code Review | `CODE-REVIEW-FLOW-XXX.md` |
| QA Verify | `QA-VERIFY-FLOW-XXX.md` |
| QA Gate | `QA-GATE-FLOW-XXX.yaml` |

## Story Workflow Stages

Stories progress through these directories:
- `backlog/` — Stories not yet elaborated
- `elaboration/` — Stories being elaborated
- `ready-to-work/` — Stories ready for implementation
- `in-progress/` — Stories being implemented
- `UAT/` — Stories in QA/verification

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

## Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages/agents where applicable, OR
- It documents why reuse was not possible and creates the shared capability instead

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-01T12:50 | pm-bootstrap-generation-leader | Initial execution plan | PLAN.exec.md |
