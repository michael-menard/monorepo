---
story_id: KNOW-024
title: Add Churn Reason Tracking to Story State Transitions
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
---

# KNOW-024: Add Churn Reason Tracking to Story State Transitions

## Context

The `story_state_transitions` table records every status change a story goes through, providing a full audit trail. However, when a story regresses (moves backward — e.g. `ready-for-qa` → `failed-qa` → `in-progress`), there is no structured reason captured on the transition row itself.

The root cause *does* exist — it's buried in the `verifications` or `review` artifacts (e.g. `blocking_issues`, `ranked_patches`) — but it requires joining across tables and parsing JSONB artifact content to recover. This makes churn analysis expensive and non-queryable at scale.

There are three distinct regression trigger points today:
1. **QA verification failure** — `qa-verify-completion-leader` regresses `ready-for-qa` → `failed-qa`
2. **Code review failure** — `dev-code-review` regresses `needs-code-review` → `failed-code-review`
3. **Fix iteration** — stays `in-progress` but iteration count increments with no root cause recorded

Without a structured reason on the transition row, questions like "what percentage of QA failures are caused by spec gaps vs agent errors?" are unanswerable from the DB alone.

## Goal

Denormalize a `reason_category` and `source_artifact_id` onto every backward `story_state_transitions` row, so that churn analysis is a single query.

## Non-goals

- Changing how agents detect or decide on failures (only changes what they write)
- Retroactively backfilling old transition rows (future transitions only)
- Adding reason tracking to forward transitions (only regressions)

## Scope

### DB Schema Change

Add two nullable columns to `story_state_transitions`:

```sql
ALTER TABLE story_state_transitions
  ADD COLUMN reason_category TEXT CHECK (reason_category IN (
    'qa-failure',
    'code-review-failure',
    'spec-gap',
    'agent-error',
    'scope-change',
    'blocked-dependency',
    'manual-override'
  )),
  ADD COLUMN source_artifact_id UUID REFERENCES story_artifacts(id),
  ADD COLUMN reason_notes TEXT;
```

### MCP Tool Change

`kb_update_story_status` (or the underlying `shimUpdateStoryStatus`) must accept optional `reason_category`, `source_artifact_id`, and `reason_notes` fields and write them to the transition row.

### Agent Changes

Three agents must be updated to pass reason data when triggering regressions:

- `qa-verify-completion-leader.agent.md` — pass `reason_category: 'qa-failure'` and the verification artifact id
- `dev-code-review.md` — pass `reason_category: 'code-review-failure'` and the review artifact id
- `dev-fix-fix-leader.agent.md` — pass `reason_category: 'agent-error'` when fix iteration exceeds 1 with no improvement

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — new migration
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — update `kb_update_story_status` schema
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — pass fields through
- `packages/backend/mcp-tools/src/story-compatibility/` — update shim
- `.claude/agents/qa-verify-completion-leader.agent.md` — add reason fields
- `.claude/commands/dev-code-review.md` — add reason fields
- `.claude/agents/dev-fix-fix-leader.agent.md` — add reason fields

## Acceptance Criteria

- [ ] `story_state_transitions` table has `reason_category`, `source_artifact_id`, and `reason_notes` columns
- [ ] `reason_category` is constrained to the defined enum values
- [ ] `kb_update_story_status` (and shim) accept and persist the new optional fields
- [ ] `qa-verify-completion-leader` writes `reason_category: 'qa-failure'` and the verification artifact id on QA regression
- [ ] `dev-code-review` writes `reason_category: 'code-review-failure'` and the review artifact id on code review regression
- [ ] A SQL query over `story_state_transitions` can return all regressions with their reason category without joining to artifact tables
- [ ] Columns are nullable — no existing agents break from the schema change
- [ ] Migration is idempotent and does not affect existing rows
