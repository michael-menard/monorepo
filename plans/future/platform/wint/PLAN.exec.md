---
doc_type: plan_exec
title: "WINT — Execution Plan"
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

# WINT — Execution Plan

## Story Prefix

All stories use the **WINT** prefix. Commands use the full prefixed ID:
- `/elab-story WINT-1010`
- `/dev-implement-story WINT-1010`
- `/pm-refine-story WINT-1010`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/WINT-XXXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `WINT-XXXX.md` |
| Elaboration | `ELAB-WINT-XXXX.md` |
| Proof | `PROOF-WINT-XXXX.md` |
| Code Review | `CODE-REVIEW-WINT-XXXX.md` |
| QA Verify | `QA-VERIFY-WINT-XXXX.md` |
| QA Gate | `QA-GATE-WINT-XXXX.yaml` |

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
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-09 15:30 | pm-bootstrap-generation-leader | Initial execution plan | WINT.plan.exec.md |
