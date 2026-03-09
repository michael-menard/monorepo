---
story_id: WKFL-013
title: Automate Workflow Retrospective Trigger
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
depends_on:
  - KNOW-040  # OUTCOME.yaml must be in DB before retro can read cross-developer story data
---

# WKFL-013: Automate Workflow Retrospective Trigger

## Context

The `/workflow-retro` command is fully functional — it reads story artifacts, detects patterns, writes lessons to the KB, and produces `WORKFLOW-RECOMMENDATIONS.md`. But it has never been run. Both `WORKFLOW-RECOMMENDATIONS.md` files in the project show "0 stories analyzed, No patterns detected yet."

The retro is manual and ad-hoc, meaning the self-improvement loop it was designed to close has never actually closed. Every completed story is a learning opportunity that is currently being discarded.

Two automation modes are needed:
1. **Per-story retro** — triggered automatically when a story reaches `done`, analyzing that single story while context is fresh
2. **Batch retro** — run weekly across all stories completed in the past 7 days, where pattern detection (requiring 3+ occurrences) becomes meaningful

## Goal

Trigger `/workflow-retro` automatically on story completion and on a weekly schedule, ensure output is written to the KB and to `WORKFLOW-RECOMMENDATIONS.md`, and surface newly detected patterns to the work queue so they can be actioned.

## Non-goals

- Changing the retro analysis logic or pattern detection thresholds
- Running retro on stories that did not reach `done` (abandoned, cancelled)
- Real-time retro during story execution

## Scope

### Trigger 1: Per-Story Retro on Completion

**Where to add:** `qa-verify-completion-leader.agent.md` — after writing the PASS verdict and before token logging, spawn `/workflow-retro {STORY_ID}` as a non-blocking background step.

The per-story retro is intentionally lightweight — it won't detect patterns (needs 3+ stories) but it will:
- Write the `RETRO-{STORY_ID}.yaml` artifact to DB (via KNOW-040)
- Add single-story observations to KB with low confidence
- Update `WORKFLOW-RECOMMENDATIONS.md` with the story's metrics

The per-story retro must not block the QA completion signal. If it fails, log a warning but do not regress the story.

### Trigger 2: Weekly Batch Retro

**Implementation:** A `kb_schedule_retro` MCP tool that records a scheduled job in the DB:

```sql
CREATE TABLE scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,          -- 'weekly-batch-retro'
  schedule_cron TEXT NOT NULL,     -- '0 9 * * 1'  (Monday 9am)
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB                     -- { days: 7, min_stories: 3 }
);
```

In the LangGraph context, this job is triggered by the orchestrator checking `scheduled_jobs` at workflow start and running overdue jobs before proceeding.

In the current CLI context, `/next-actions` checks for overdue scheduled jobs and surfaces them as the first recommended action: `"Weekly batch retro is overdue — run: /workflow-retro --batch --days=7"`

### Pattern → Workflow Story Pipeline

When the batch retro detects a significant pattern (3+ occurrences) and writes it to `knowledge_entries`, it should also evaluate whether the pattern warrants a workflow improvement story:

**Pattern categories that auto-generate a WKFL backlog story:**
- Token overrun patterns (consistently underestimated phase) → story to calibrate budget
- Review failure patterns (same failure type recurring) → story to add a pre-review check
- Agent correlation patterns (agent X consistently causes regressions) → story to retrain or replace agent prompt

**Mechanism:** After writing a pattern to KB, the retro calls `kb_po_queue_add` (from KNOW-030) with `proposed_epic: 'WKFL'` and `autonomy_tier: 'approval-required'` — putting the improvement in the PO approval queue rather than auto-creating a story.

### WORKFLOW-RECOMMENDATIONS.md as a Live Document

Update the retro to append new findings to `WORKFLOW-RECOMMENDATIONS.md` rather than overwriting it, with a datestamp per entry. This gives a running history of what the workflow has learned.

### Packages Affected

- `.claude/agents/qa-verify-completion-leader.agent.md` — spawn per-story retro on PASS
- `apps/api/knowledge-base/src/db/migrations/` — `scheduled_jobs` table
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_schedule_retro`, `kb_get_due_jobs`
- `.claude/skills/next-actions` — surface overdue scheduled jobs
- `.claude/agents/workflow-retro.agent.md` — call `kb_po_queue_add` for pattern-triggered stories
- `plans/future/platform/workflow-learning/WORKFLOW-RECOMMENDATIONS.md` — switch to append mode

## Acceptance Criteria

- [ ] Per-story retro runs automatically after every QA PASS without blocking the completion signal
- [ ] Per-story retro writes `RETRO-{STORY_ID}.yaml` artifact to DB
- [ ] Weekly batch retro schedule is recorded in `scheduled_jobs` table
- [ ] `/next-actions` surfaces overdue batch retro as a recommended action
- [ ] Batch retro detects and writes patterns meeting the 3+ occurrence threshold to KB
- [ ] Patterns that meet the workflow-story threshold are added to `po_approval_queue` with `proposed_epic: WKFL`
- [ ] `WORKFLOW-RECOMMENDATIONS.md` appends new findings with datestamps rather than overwriting
- [ ] Per-story retro failure does not regress the story or block completion
- [ ] After 5 completed stories, at least one KB lesson entry with `tags: ['retro', 'pattern']` exists
