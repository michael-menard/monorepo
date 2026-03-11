---
story_id: KNOW-035
title: Migrate Model Leaderboard from YAML to Knowledge Base
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: high
---

# KNOW-035: Migrate Model Leaderboard from YAML to Knowledge Base

## Context

The model leaderboard — which tracks per-task, per-model quality scores, run counts, value scores, convergence status, and quality trends — is currently stored in YAML files on disk. This violates the core principle: **if it's not in the DB, it doesn't exist** for other developers, agents, or analytics queries.

Consequences of YAML-based leaderboard:
- Not visible to other developers working on the project
- Cannot be correlated with story outcome data (`workflow_metrics`, `story_state_transitions`)
- Lost when a developer's local environment is wiped or a worktree is cleaned
- Cannot be queried via MCP tools by agents making routing decisions
- No audit trail for leaderboard mutations

The DB is the right home. Once migrated, the leaderboard can be joined against workflow metrics to answer: "do stories where model X handled implementation have lower churn rates?"

## Goal

Create a `model_leaderboard` table in the KB database that mirrors the current YAML schema, migrate existing YAML data into it, update the leaderboard tracker to read/write from DB instead of YAML, and expose it via MCP tools.

## Non-goals

- Changing the leaderboard algorithm or convergence logic (KNOW-036/037 build on top of this)
- Real-time streaming updates (batch writes per run, same as current YAML approach)
- Removing the YAML writer in v1 — keep as backup, remove in follow-up

## Scope

### DB Schema

```sql
CREATE TABLE model_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,           -- e.g. 'code_generation_complex', 'gap_analysis'
  model TEXT NOT NULL,             -- e.g. 'anthropic/claude-sonnet-4.6', 'ollama/qwen2.5-coder:14b'
  tier INTEGER NOT NULL,           -- 0-3

  -- Performance metrics
  runs_count INTEGER NOT NULL DEFAULT 0,
  avg_quality FLOAT NOT NULL DEFAULT 0,
  avg_cost_usd FLOAT NOT NULL DEFAULT 0,
  avg_latency_ms FLOAT NOT NULL DEFAULT 0,
  value_score FLOAT NOT NULL DEFAULT 0,

  -- Trend analysis
  recent_run_scores FLOAT[] NOT NULL DEFAULT '{}',  -- Rolling window, last 5
  quality_trend TEXT NOT NULL DEFAULT 'stable'
    CHECK (quality_trend IN ('improving', 'stable', 'degrading')),

  -- Convergence
  convergence_status TEXT NOT NULL DEFAULT 'exploring'
    CHECK (convergence_status IN ('exploring', 'converging', 'converged')),
  convergence_confidence FLOAT NOT NULL DEFAULT 0,

  -- Outcome correlation (populated by KNOW-036)
  story_churn_rate FLOAT,          -- avg regression count for stories using this (task, model)
  qa_first_pass_rate FLOAT,        -- % of stories passing QA first attempt
  outcome_sample_count INTEGER DEFAULT 0,

  -- Timestamps
  first_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (task_id, model)
);

CREATE INDEX ON model_leaderboard (task_id);
CREATE INDEX ON model_leaderboard (value_score DESC);
CREATE INDEX ON model_leaderboard (convergence_status);
```

### Migration Script

One-time script to read existing `leaderboard.yaml` files and insert rows into `model_leaderboard`.

### Leaderboard Tracker Update

Update `packages/backend/orchestrator/src/model-selector/leaderboard.ts`:
- Replace YAML read/write with DB calls via MCP tools or direct DB client
- `recordRun()` → upsert to `model_leaderboard`
- `getLeaderboard()` → query from `model_leaderboard`
- Keep YAML write as backup (feature-flagged off by default)

### MCP Tools

**`kb_leaderboard_record`** — record a model run result:
```typescript
{
  task_id: string
  model: string
  tier: number
  quality_score: number
  cost_usd: number
  latency_ms: number
}
```

**`kb_leaderboard_query`** — query leaderboard:
```typescript
{
  task_id?: string
  model?: string
  min_runs?: number
  convergence_status?: 'exploring' | 'converging' | 'converged'
  sort_by?: 'value_score' | 'avg_quality' | 'runs_count'
  limit?: number
}
```

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — new table + migration script
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 2 new tools
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handlers
- `apps/api/knowledge-base/src/crud-operations/leaderboard-operations.ts` — new file
- `packages/backend/orchestrator/src/model-selector/leaderboard.ts` — swap YAML for DB

## Acceptance Criteria

- [ ] `model_leaderboard` table exists with all specified columns and constraints
- [ ] Existing YAML leaderboard data is migrated to the DB without data loss
- [ ] `kb_leaderboard_record` upserts a run result and recomputes averages, value score, and quality trend
- [ ] `kb_leaderboard_query` returns filtered, sorted results
- [ ] The leaderboard tracker reads from and writes to DB, not YAML
- [ ] `/model-leaderboard` CLI command reads from DB via MCP (not YAML)
- [ ] Multiple developers querying `kb_leaderboard_query` see the same data
- [ ] `story_churn_rate` and `qa_first_pass_rate` columns exist but are nullable (populated by KNOW-036)
