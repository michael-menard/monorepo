---
story_id: KNOW-037
title: Model Bake-Off Framework for Task Topology Experiments
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - KNOW-035  # leaderboard in DB required
  - KNOW-036  # story model assignments required for outcome correlation
---

# KNOW-037: Model Bake-Off Framework for Task Topology Experiments

## Context

As new models are added (Kimi, Minimax, OpenAI, Llama-code, and others), the existing leaderboard approach of observational convergence is slow — it waits for naturally-occurring runs to accumulate before declaring a winner. For new models entering the 4-tier structure, this means weeks of mixed-quality results before the router has enough data to route confidently.

A bake-off framework provides a controlled, accelerated alternative: deliberately route a configurable percentage of a specific task to a challenger model in parallel with the incumbent, compare outcomes on the same stories, and converge faster with statistical confidence.

This is also the mechanism for testing the hypothesis "what if we use Kimi for implementation and Claude for code review?" — topological experiments that the current router can't express.

## Non-goals

- Automated champion/challenger promotion (a human reviews bake-off results and updates routing config)
- Running bake-offs on security-sensitive or critical-quality tasks without explicit opt-in
- Full A/B testing infrastructure (this is workflow-internal, not user-facing)

## Scope

### Bake-Off Configuration

New `model_bakeoffs` table:

```sql
CREATE TABLE model_bakeoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                -- 'kimi-vs-sonnet-implementation-q1-2026'
  task_id TEXT NOT NULL,             -- Which task type is being tested
  incumbent_model TEXT NOT NULL,     -- Current best model for this task
  challenger_model TEXT NOT NULL,    -- New model being evaluated
  traffic_split FLOAT NOT NULL DEFAULT 0.3,  -- 30% to challenger
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  min_runs_per_model INTEGER NOT NULL DEFAULT 20,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  verdict TEXT CHECK (verdict IN ('challenger-wins', 'incumbent-wins', 'inconclusive')),
  verdict_notes TEXT,
  created_by TEXT                    -- agent or human who started the bake-off
);

CREATE INDEX ON model_bakeoffs (task_id, status);
```

### Bake-Off Routing Integration

Update `task-selector.ts` to check for active bake-offs before finalizing model selection:

```typescript
// After tier selection, before returning model
const activeBakeoff = await getActiveBakeoff(taskId)
if (activeBakeoff) {
  const useChallenger = Math.random() < activeBakeoff.traffic_split
  if (useChallenger) {
    return activeBakeoff.challenger_model
  }
}
```

Record which model was used (incumbent or challenger) in `story_model_assignments` with a `bakeoff_id` foreign key.

### Topology Experiments

Beyond single-task bake-offs, support **topology experiments** — predefined model assignments across multiple phases for a story:

```sql
CREATE TABLE model_topology_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  phase_assignments JSONB NOT NULL,
  -- e.g. {"implementation": "kimi/k1", "code-review": "anthropic/claude-sonnet-4.6", "qa": "openai/gpt-4o"}
  traffic_split FLOAT NOT NULL DEFAULT 0.2,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  stories_assigned INTEGER DEFAULT 0,
  min_stories INTEGER NOT NULL DEFAULT 10
);
```

When a new story starts and a topology experiment is active, it has a `traffic_split` chance of having its entire model topology determined by the experiment rather than individual task selection.

### Results Analysis

**`kb_bakeoff_results`** MCP tool — compare incumbent vs challenger performance:
```typescript
{
  bakeoff_id: string
} // returns: {
  //   incumbent: { runs, avg_quality, avg_cost, story_churn_rate, qa_first_pass_rate },
  //   challenger: { runs, avg_quality, avg_cost, story_churn_rate, qa_first_pass_rate },
  //   statistical_significance: number,  // 0.0-1.0
  //   recommendation: 'promote-challenger' | 'keep-incumbent' | 'inconclusive'
  // }
```

### MCP Tools

- **`kb_bakeoff_create`** — start a new bake-off
- **`kb_bakeoff_pause`** / **`kb_bakeoff_complete`** — lifecycle management
- **`kb_bakeoff_results`** — compare performance with recommendation
- **`kb_topology_experiment_create`** — define a full topology experiment

### CLI Command Extension

Extend `/model-leaderboard` with bake-off subcommands:
```
/model-leaderboard bakeoffs                    # List active bake-offs
/model-leaderboard bakeoff-results {id}        # Results for a specific bake-off
/model-leaderboard topology-experiments        # List active topology experiments
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — 2 new tables
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 4+ new tools
- `packages/backend/orchestrator/src/models/task-selector.ts` — bake-off routing hook
- `packages/backend/orchestrator/src/model-selector/leaderboard.ts` — record bakeoff_id on runs
- `.claude/commands/model-leaderboard.md` — bake-off subcommands

## Acceptance Criteria

- [ ] `model_bakeoffs` and `model_topology_experiments` tables exist
- [ ] When a bake-off is active for a task, `traffic_split`% of runs use the challenger model
- [ ] `story_model_assignments` records `bakeoff_id` when a run is part of a bake-off
- [ ] `kb_bakeoff_results` returns per-model quality, cost, churn rate, and QA first-pass rate
- [ ] `kb_bakeoff_results` returns a `recommendation` based on outcome comparison
- [ ] Topology experiments assign a full model topology to a story at start time
- [ ] `/model-leaderboard bakeoffs` lists active experiments with run counts
- [ ] Security-sensitive tasks (`allowOllama=false`) cannot have challenger models below Tier 1
- [ ] Completing a bake-off does not automatically change routing config — requires explicit human action
