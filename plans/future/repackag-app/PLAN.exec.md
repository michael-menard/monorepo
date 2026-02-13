---
doc_type: plan_exec
title: "REPA — Execution Plan"
status: active
story_prefix: "REPA"
created_at: "2026-02-09"
updated_at: "2026-02-09"
tags:
  - code-reuse
  - package-consolidation
  - monorepo
  - deduplication
---

# REPA — Execution Plan

## Story Prefix

All stories use the **REPA** prefix. Commands use the full prefixed ID:
- `/pm-generate-story REPA-001`
- `/elab-story REPA-001`
- `/dev-implement-story REPA-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/REPA-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `REPA-XXX.md` |
| Elaboration | `ELAB-REPA-XXX.md` |
| Proof | `PROOF-REPA-XXX.md` |
| Code Review | `CODE-REVIEW-REPA-XXX.md` |
| QA Verify | `QA-VERIFY-REPA-XXX.md` |
| QA Gate | `QA-GATE-REPA-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Step 0 — Harness Validation (if applicable)

- Produce Story 000 as a structural harness to validate the workflow
- Commit outputs to: `plans/stories/REPA-000/`

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
| 2026-02-09 | bootstrap | Initial execution plan | PLAN.exec.md |
