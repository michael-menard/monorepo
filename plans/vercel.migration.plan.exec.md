---
doc_type: plan_exec
title: "Vercel Migration — Execution Plan"
status: active
created_at: "2026-01-17T19:50:34-07:00"
updated_at: "2026-01-17T19:50:34-07:00"
tags:
  - vercel
  - migration
  - execution
---

# Vercel Migration — Execution Plan

## Artifact Rules
- Each execution step that produces story-level intent or validation MUST output artifacts under:
  `plans/stories/story-XXX/`
- A story folder is the source of truth for all related documentation.
- Story docs MUST include:
  - YAML front matter
  - An append-only Agent Log section (at bottom)

## Naming Rule (timestamps in filenames)
All docs MUST include a timestamp in the filename:
- Format: `YYYYMMDD-HHMM` (America/Denver)
- Example: `story.20260117-0930.md`

## Step 0 — Harness Validation
- Produce Story 000 as a structural harness
- Commit outputs to:
  `plans/stories/story-000/story.20260117-1950.md`

## Subsequent Steps
- Each migration phase generates a new story directory
- No loose story markdown files at the root of `plans/`

## Artifact Rules (additions)

### Reuse Gate (Required for QA PASS)
For each story, the PM story doc MUST include a section:
- `## Reuse Plan`

And the Dev proof MUST include:
- `## Reuse Verification`

The Reuse Plan must explicitly list:
- Which existing packages will be used (e.g. `packages/core/logger`, `packages/backend/db`, `packages/backend/vercel-adapter`)
- What will be extended (if anything)
- What new shared package(s) will be created (only if necessary), and where

### Prohibited Patterns
- Duplicating adapter logic per endpoint when a shared adapter package exists
- Copy/pasting logger initialization per endpoint
- Recreating response helpers instead of using shared `lambda-responses` / equivalent
- Introducing “temporary” shared utilities inside `apps/*` instead of `packages/*`

### Story Acceptance Rule
A story may be marked “Done” only if:
- It reuses shared packages where applicable, OR
- It documents why reuse was not possible and creates the shared package instead.

---

## Agent Log
Append-only.

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-17T19:50:34-07:00 | doc-migration | Updated exec plan to enforce timestamped filenames + front matter + agent sign-off log | `plans/vercel.migration.plan.exec.20260117-1950.md` |
