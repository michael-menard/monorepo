---
story_id: KNOW-041
title: Agent Improvement Signal Pipeline - Connect Workflow Learning to Agent Evolution
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - KNOW-024  # churn reason tracking needed to attribute failures to specific agents
  - KNOW-027  # workflow metrics needed to identify which agents correlate with poor outcomes
  - WKFL-013  # retro must be running automatically to generate improvement signals
---

# KNOW-041: Agent Improvement Signal Pipeline - Connect Workflow Learning to Agent Evolution

## Context

Agent prompts are currently static markdown files. When the workflow learns something — churn analysis shows `dev-fix-fix-leader` consistently produces low-quality fixes, a retro detects that `elab-analyst` misses security ACs in auth stories, a model bake-off reveals a prompt is poorly structured for a new model — there is no path for that signal to reach the agent's prompt.

The gap is not the inability to edit files (that's a pre-LangGraph limitation); it's that **no one knows which agents need improving** because the signals aren't being tracked or surfaced.

This story closes that gap by:
1. Tracking each agent file in the KB (version hash + performance correlation)
2. Collecting improvement signals from retros, churn analysis, and model leaderboard
3. Routing actionable signals to the PO approval queue as agent improvement proposals
4. Providing a foundation for automated prompt updates in the LangGraph migration

## Non-goals

- Automatically editing agent files (LangGraph migration responsibility)
- Reviewing agent files for bloat (WKFL-015)
- Storing full agent prompt versions in the DB (file hashes only in v1)

## Scope

### Agent Registry in KB

New `agent_registry` table:

```sql
CREATE TABLE agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,          -- 'elab-analyst', 'qa-verify-completion-leader'
  agent_type TEXT NOT NULL                  -- 'agent' | 'command' | 'skill'
    CHECK (agent_type IN ('agent', 'command', 'skill')),
  file_path TEXT NOT NULL,                  -- Relative path from repo root
  file_hash TEXT NOT NULL,                  -- SHA256 of current file content
  prompt_token_count INTEGER,               -- Approximate token count of the prompt
  tier TEXT,                                -- 'orchestrator' | 'leader' | 'worker'
  model TEXT,                               -- Model assigned in frontmatter
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hash_change_at TIMESTAMPTZ,          -- When file content last changed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Agent Performance Correlation

New `agent_performance` table — populated by retro and churn analysis:

```sql
CREATE TABLE agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL REFERENCES agent_registry(agent_name),
  story_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  outcome TEXT NOT NULL              -- 'pass' | 'fail' | 'churn'
    CHECK (outcome IN ('pass', 'fail', 'churn')),
  churn_reason TEXT,                 -- from story_state_transitions.reason_category
  signal_source TEXT NOT NULL        -- 'retro' | 'churn-analysis' | 'leaderboard' | 'qa-gate'
    CHECK (signal_source IN ('retro', 'churn-analysis', 'leaderboard', 'qa-gate')),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON agent_performance (agent_name, outcome);
CREATE INDEX ON agent_performance (recorded_at DESC);
```

### Signal Collection

**From churn analysis (KNOW-024):** When a story regression has `reason_category = 'agent-error'`, record a `fail` signal for the agent responsible for that phase.

**From retro (WKFL-013):** When a retro detects a pattern correlated with a specific agent (e.g. "qa-verify-verification-leader consistently misses edge-case ACs"), record a `churn` signal.

**From model leaderboard (KNOW-035):** When a `quality_trend: degrading` alert fires for a specific `(task_id, model)` pair, record a signal for the agent type that uses that task_id.

### Improvement Proposal Generation

A `kb-agent-improver` agent (or extension of `po-groomer` from KNOW-031) that:

1. Queries `agent_performance` for agents with:
   - `fail` rate > 20% across 5+ stories, OR
   - `churn` signals from 3+ distinct stories, OR
   - `quality_trend: degrading` in leaderboard

2. For each flagged agent, reads:
   - The agent file content
   - The specific failure notes from `agent_performance`
   - Related KB lessons tagged with the agent name

3. Generates a plain-language improvement proposal:
   ```
   Agent: elab-analyst
   Issue: Missing security ACs in auth stories (5 occurrences)
   Evidence: Stories WISH-001, WISH-045, KNOW-012 all had security gaps flagged at QA
   Suggested prompt change: Add explicit security AC checklist to Step 3 when story touches auth, payments, or PII
   ```

4. Writes the proposal to `po_approval_queue` with:
   - `proposed_type: 'tech-debt'`
   - `proposed_epic: 'WKFL'`
   - `autonomy_tier: 'approval-required'`  ← always requires human review for agent changes
   - `rationale:` the improvement proposal text

### MCP Tools

- **`kb_register_agent`** — upsert an agent in the registry with current file hash
- **`kb_record_agent_signal`** — write a performance signal for an agent
- **`kb_get_agent_performance`** — query performance summary for an agent or all agents

### Registry Sync

A lightweight scan step added to the `/doc-sync` skill or run standalone: walks `.claude/agents/` and `.claude/commands/`, hashes each file, and upserts into `agent_registry`. Detects files that have changed since last sync.

### Packages Affected

- `apps/api/knowledge-base/src/db/migrations/` — 2 new tables
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — 3 new tools
- `.claude/agents/kb-agent-improver.agent.md` — new agent (or extend po-groomer)
- `.claude/skills/doc-sync/` — add registry sync step
- `.claude/agents/workflow-retro.agent.md` — record agent signals from patterns
- `.claude/agents/qa-verify-completion-leader.agent.md` — record agent signals on failure

## Acceptance Criteria

- [ ] `agent_registry` table tracks all agents with file hash and prompt token count
- [ ] `agent_performance` table receives signals from churn analysis, retro, and QA failures
- [ ] Agents with fail rate > 20% across 5+ stories are surfaced as improvement proposals
- [ ] Improvement proposals appear in `po_approval_queue` with `autonomy_tier: approval-required`
- [ ] Registry sync detects when an agent file changes and updates `last_hash_change_at`
- [ ] A developer can query "which agents have the most failure signals this month" via `kb_get_agent_performance`
- [ ] No automated changes to agent files — proposals only
