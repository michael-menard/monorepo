---
story_id: KNOW-040
title: Migrate OUTCOME.yaml to Knowledge Base
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: tech-debt
priority: high
---

# KNOW-040: Migrate OUTCOME.yaml to Knowledge Base

## Context

`OUTCOME.yaml` is the primary data source for workflow retrospectives, pattern mining, experiment analysis, and token budget calibration. It is written by `dev-documentation-leader` at story completion and currently lives at:

```
{FEATURE_DIR}/done/{STORY_ID}/_implementation/OUTCOME.yaml
```

This is a file on disk. Four agents consume it:
- `workflow-retro.agent.md` — pattern detection and KB lesson writing
- `pattern-miner.agent.md` (WKFL-006) — cross-story pattern analysis
- `experiment-analyzer.agent.md` (WKFL-008) — A/B experiment statistical analysis
- `calibration.agent.md` (WKFL-002) — token budget adjustment

All four agents are reading files from the local filesystem, which means:
- A developer running `/workflow-retro --batch` only sees OUTCOME.yaml files in their worktree
- Cross-developer story comparisons are impossible
- Files are lost when worktrees are cleaned
- No structured query interface — agents read YAML and parse it themselves

This mirrors the same problem as `CHECKPOINT.yaml` (KNOW-025) and `ADR-LOG.md` (KNOW-038). The pattern is consistent: **if it's not in the DB, it doesn't exist for the team.**

`OUTCOME.yaml` is the most important artifact to migrate because it gates the entire self-improvement loop — retros, pattern mining, and calibration all depend on it.

## Goal

Write `OUTCOME.yaml` data to `story_artifacts` in the DB (as artifact type `outcome`) at story completion, and update all four consuming agents to read from the DB instead of the filesystem.

## Non-goals

- Removing `OUTCOME.yaml` files immediately (keep writing for backwards compatibility; remove in follow-up)
- Changing the OUTCOME schema
- Migrating historical OUTCOME.yaml files for stories already completed (document as manual follow-up)

## Scope

### New Artifact Type: `outcome`

```typescript
const OutcomeSchema = z.object({
  story_id: z.string(),
  epic_id: z.string().optional(),
  completed_at: z.string().datetime(),
  experiment_variant: z.string().optional(),

  phases: z.array(z.object({
    phase: z.string(),
    tokens_in: z.number(),
    tokens_out: z.number(),
    duration_ms: z.number(),
    status: z.string(),
    verdict: z.string().optional(),
  })),

  totals: z.object({
    tokens_in: z.number(),
    tokens_out: z.number(),
    tokens_total: z.number(),
    duration_ms: z.number(),
    review_cycles: z.number(),
    gate_attempts: z.number(),
  }),

  decisions: z.object({
    auto_accepted: z.number(),
    escalated: z.number(),
    overridden: z.number(),
    deferred: z.number(),
  }),
})
```

### Write Path

Update `dev-documentation-leader.agent.md` to call `kb_write_artifact` with type `outcome` after writing `OUTCOME.yaml`:

```javascript
kb_write_artifact({
  story_id: "{STORY_ID}",
  artifact_type: "outcome",
  content: { ...outcomeData }
})
```

Both writes happen — file and DB. DB write failure does not block story completion but is logged as a warning.

### Read Path Updates

All four consuming agents updated to query DB first, fall back to file if not found:

```javascript
// 1. Try DB first
const outcome = await kb_get_artifact({ story_id, artifact_type: 'outcome' })
// 2. Fall back to filesystem for older stories
if (!outcome) { /* read OUTCOME.yaml */ }
```

**Agents updated:**
- `workflow-retro.agent.md` — primary consumer
- `pattern-miner.agent.md`
- `experiment-analyzer.agent.md`
- `calibration.agent.md`

### New MCP Tool: `kb_query_outcomes`

For batch operations (retro, pattern-miner) that need multiple outcomes at once:

```typescript
kb_query_outcomes({
  epic?: string,
  since?: string,        // ISO date
  status?: string,       // 'done'
  limit?: number,
  include_phases?: boolean,
})
// Returns: OutcomeSchema[]
```

This replaces the current pattern of agents globbing filesystem directories for OUTCOME.yaml files.

### Packages Affected

- `packages/backend/orchestrator/src/artifacts/outcome.ts` — Zod schema
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_query_outcomes`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `.claude/agents/dev-documentation-leader.agent.md` — add DB write
- `.claude/agents/workflow-retro.agent.md` — DB-first read
- `.claude/agents/pattern-miner.agent.md` — DB-first read
- `.claude/agents/experiment-analyzer.agent.md` — DB-first read
- `.claude/agents/calibration.agent.md` — DB-first read

## Acceptance Criteria

- [ ] `outcome` artifact type is defined with the full Zod schema
- [ ] `dev-documentation-leader` writes OUTCOME data to `story_artifacts` at story completion
- [ ] DB write failure does not block story completion
- [ ] `kb_query_outcomes` returns outcome records filtered by epic, date range, and status
- [ ] `workflow-retro` reads from DB via `kb_query_outcomes` for batch mode
- [ ] `workflow-retro` falls back to filesystem for stories predating this migration
- [ ] Running `/workflow-retro --batch` from any worktree returns the same stories (no worktree divergence)
- [ ] `OUTCOME.yaml` files continue to be written (backwards compatibility preserved)
