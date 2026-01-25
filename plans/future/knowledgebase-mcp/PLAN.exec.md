---
doc_type: plan_exec
title: "KNOW — Execution Plan"
status: active
story_prefix: "KNOW"
created_at: "2026-01-24T23:55:00Z"
updated_at: "2026-01-24T23:55:00Z"
tags:
  - knowledgebase
  - mcp
  - ai-agents
---

# KNOW — Execution Plan

## Story Prefix

All stories use the **KNOW** prefix. Commands use the full prefixed ID:
- `/pm-generate-story KNOW-001`
- `/elab-story KNOW-001`
- `/dev-implement-story KNOW-001`

## Artifact Rules

- Each story outputs artifacts under: `plans/stories/KNOW-XXX/`
- A story folder is the source of truth for all related documentation
- Story docs MUST include:
  - YAML front matter with status
  - A Token Budget section
  - An append-only Agent Log section

## Artifact Naming Convention

| Artifact | Filename |
|----------|----------|
| Story file | `KNOW-XXX.md` |
| Elaboration | `ELAB-KNOW-XXX.md` |
| Proof | `PROOF-KNOW-XXX.md` |
| Code Review | `CODE-REVIEW-KNOW-XXX.md` |
| QA Verify | `QA-VERIFY-KNOW-XXX.md` |
| QA Gate | `QA-GATE-KNOW-XXX.yaml` |

## Token Budget Rule

- Each story MUST include a `## Token Budget` section
- Before starting a phase, record `/cost` session total
- After completing a phase, record delta

## Step 0 — Harness Validation (if applicable)

- Produce Story 000 as a structural harness to validate the workflow
- Commit outputs to: `plans/stories/KNOW-000/`

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
| 2026-01-24T17:55 | bootstrap | Initial execution plan | KNOW.plan.exec.md |
