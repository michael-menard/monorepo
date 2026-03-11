---
story_id: KNOW-025
title: Migrate CHECKPOINT.md Artifacts to Database
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: medium
---

# KNOW-025: Migrate CHECKPOINT.md Artifacts to Database

## Context

The `/checkpoint` command writes a `CHECKPOINT.md` YAML file to `_implementation/CHECKPOINT.md` inside a story's working directory. This file is used by agents to resume interrupted workflows — it records which phases completed, the current iteration, QA/review verdicts, and the model used.

Because checkpoints live on disk as YAML files, they are:
- Not queryable across stories
- Lost when a worktree is cleaned up
- Not visible in the KB alongside other story artifacts
- A separate read path that agents must handle independently from DB-backed artifacts

The `story_artifacts` table (with JSONB content) is the correct home for this data — it is already used for verification results, review findings, evidence, and implementation plans.

## Goal

Write checkpoint data to `story_artifacts` (type `checkpoint`) in addition to (or instead of) the YAML file, so that checkpoint state is DB-backed, queryable, and survives worktree cleanup.

## Non-goals

- Removing the YAML file in v1 — keep writing it as a fallback for agents that read it directly; this story adds the DB write, a follow-up removes the file
- Changing the checkpoint schema — the existing schema 2 format is correct and maps cleanly to JSONB

## Scope

### New Artifact Type

Register `checkpoint` as a valid `artifact_type` in `story_artifacts`:

```typescript
// In artifact type definitions
'checkpoint' // schema: 2, fields: phase, iteration, max_iterations, phases_completed, implementation_complete, code_review_verdict, stage, model_used
```

### MCP Tool

Add a `kb_write_checkpoint` MCP tool (or extend `kb_write_artifact` to accept type `checkpoint`) that:
1. Writes the checkpoint JSONB to `story_artifacts`
2. Upserts (one checkpoint row per story, updated on each phase completion)

### Command Change

Update `.claude/commands/checkpoint.md` to call `kb_write_checkpoint` (or `kb_write_artifact` with type `checkpoint`) after writing the YAML file. No change to the YAML write path in v1.

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — add `kb_write_checkpoint` or extend `kb_write_artifact`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler with upsert
- `packages/backend/orchestrator/src/artifacts/checkpoint.ts` — new Zod schema
- `.claude/commands/checkpoint.md` — add DB write step

## Acceptance Criteria

- [ ] A `checkpoint` artifact type is defined with a Zod schema matching the existing CHECKPOINT.md schema 2 format
- [ ] `kb_write_checkpoint` (or equivalent) MCP tool exists and upserts one row per story in `story_artifacts`
- [ ] The `/checkpoint` command writes to both the YAML file and the DB without breaking existing agents
- [ ] A completed story's checkpoint is readable via `kb_get_artifact` by story ID and type `checkpoint`
- [ ] Checkpoint rows survive worktree deletion (data is in DB, not filesystem-only)
- [ ] No existing checkpoint-reading agents break (YAML file still written)
