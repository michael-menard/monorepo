---
story_id: KNOW-036
title: Model Diversity Enforcement - Prevent Reviewer Confirmation Bias
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: high
depends_on:
  - KNOW-035  # leaderboard must be in DB before routing decisions can consult it
---

# KNOW-036: Model Diversity Enforcement - Prevent Reviewer Confirmation Bias

## Context

When the same model writes a story implementation and then reviews it (code review or QA verification), there is a systematic confirmation bias risk: the model is unlikely to identify flaws in reasoning patterns it itself produced. This is the AI equivalent of a developer reviewing their own PR.

Current routing selects the best-value model for each task type independently — there is no constraint preventing the same model from handling implementation AND code review AND QA verification for the same story.

Model diversity across a story's lifecycle serves two purposes:
1. **Quality** — a different model brings a genuinely different "perspective" and is more likely to catch errors
2. **Bake-off value** — varied model assignments across stories create natural experiments for the leaderboard to learn from

## Goal

Add a model diversity constraint to the routing system: the model selected for code review must differ from the implementation model, and the model selected for QA verification must differ from both. Record model assignments per story phase in the KB so this constraint is enforced and the diversity is queryable.

## Non-goals

- Requiring different model *families* (Sonnet vs Sonnet is fine if they're different instances or versions)
- Enforcing diversity for setup/completion/hygiene agents (low-stakes, mechanical tasks)
- Retroactively re-routing stories already in progress

## Scope

### Story Phase Model Tracking

Add a `story_model_assignments` table:

```sql
CREATE TABLE story_model_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL,
  phase TEXT NOT NULL,           -- 'implementation', 'code-review', 'qa-verification', 'elaboration'
  task_id TEXT NOT NULL,         -- leaderboard task ID used for selection
  model_selected TEXT NOT NULL,  -- model actually used
  tier INTEGER NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_id, phase)
);

CREATE INDEX ON story_model_assignments (story_id);
```

### Diversity Constraint in Router

Update `task-selector.ts` to accept a `story_id` and `exclude_models` list when selecting a model:

```typescript
selectModelForTask(contract: TaskContract, options?: {
  story_id?: string,
  exclude_models?: string[],   // Models already used in this story
})
```

When `story_id` is provided:
1. Query `story_model_assignments` for models already used in this story
2. Add those models to the exclusion list
3. Select the best-value model that is NOT in the exclusion list
4. If no eligible model exists in the preferred tier, escalate one tier and retry
5. Record the new assignment in `story_model_assignments`

### Agent Integration Points

Three agents must pass `story_id` to the router:

- `dev-implement-planning-leader` — records `phase: 'implementation'`
- `dev-code-review` / review aggregate leader — records `phase: 'code-review'`, excludes implementation model
- `qa-verify-completion-leader` — records `phase: 'qa-verification'`, excludes implementation + code-review models

### Leaderboard Outcome Correlation (extends KNOW-035)

After a story completes, update `model_leaderboard` to populate:
- `story_churn_rate` — weighted running average of regression count for stories using this (task, model)
- `qa_first_pass_rate` — weighted running average of QA first-pass for stories using this (task, model)

This closes the loop: the leaderboard now knows not just "quality score on the task" but "outcomes for stories where this model did this task."

### MCP Tools

**`kb_record_model_assignment`** — called by agents when selecting a model:
```typescript
{
  story_id: string
  phase: 'implementation' | 'code-review' | 'qa-verification' | 'elaboration'
  task_id: string
  model_selected: string
  tier: number
}
```

**`kb_get_story_models`** — router queries before selecting:
```typescript
{
  story_id: string
} // returns: { phase, model }[]
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — `story_model_assignments` table
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 2 new tools
- `packages/backend/orchestrator/src/models/task-selector.ts` — add exclusion logic
- `packages/backend/orchestrator/src/models/unified-interface.ts` — pass story_id context
- `.claude/agents/dev-implement-planning-leader.agent.md` — record assignment
- `.claude/commands/dev-code-review.md` — pass story_id, record assignment
- `.claude/agents/qa-verify-completion-leader.agent.md` — pass story_id, record assignment

## Acceptance Criteria

- [ ] `story_model_assignments` table exists and records one row per story per phase
- [ ] Router excludes models already used in a story when selecting for review/QA phases
- [ ] Code review model differs from implementation model for every story
- [ ] QA model differs from both implementation and code review models
- [ ] If no eligible model exists in the preferred tier, router escalates rather than violating diversity
- [ ] `kb_record_model_assignment` and `kb_get_story_models` MCP tools work correctly
- [ ] After story completion, `model_leaderboard.story_churn_rate` and `qa_first_pass_rate` are updated
- [ ] Model diversity is queryable: "what % of stories had 3 distinct models across implementation/review/QA?"
