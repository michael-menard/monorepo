---
doc_type: plan_exec
title: "BUGF — Execution Plan"
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

# BUGF — Execution Plan

## Story Prefix

All stories use the **BUGF** prefix. Commands use the full prefixed ID:
- `/pm-generate-story BUGF-001`
- `/elab-story BUGF-001`
- `/dev-implement-story BUGF-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/future/bug-fix/BUGF-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `BUGF-XXX.md` |
| Elaboration | `ELAB-BUGF-XXX.md` |
| Proof | `PROOF-BUGF-XXX.md` |
| Code Review | `CODE-REVIEW-BUGF-XXX.md` |
| QA Verify | `QA-VERIFY-BUGF-XXX.md` |
| QA Gate | `QA-GATE-BUGF-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Subsequent Steps

- Each phase generates a new story directory
- No loose story markdown files at root of `plans/`

### Reuse Gate (Required for QA PASS)

For each story:
- PM story doc MUST include: `## Reuse Plan`
- Dev proof MUST include: `## Reuse Verification`

### Story Acceptance Rule

A story may be marked "Done" only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead

---

## Agent Log

Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-02-10 00:00:00 | pm-bootstrap-generation-leader | Initial execution plan | BUGF.plan.exec.md |
