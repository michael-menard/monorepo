---
story_id: KNOW-042
title: Broaden Feedback Schema for Workflow-Level Observations
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-042: Broaden Feedback Schema for Workflow-Level Observations

## Context

The `/feedback` command requires a `finding_id` from a `VERIFICATION.yaml` entry. This means feedback can only be written in response to a specific QA or code review finding. It captures:

- "This finding was a false positive"
- "This finding's severity was wrong"
- "This check was missing"

These are valuable but narrow. They only fire at the end of the workflow (QA/review stage) and only about specific agent findings.

There is no mechanism to capture broader workflow observations:
- "This story was over-scoped — it took 3x the expected effort"
- "The elaboration missed the real problem — the AC was technically correct but wrong"
- "The QA agent passed this story but it broke in production"
- "The story split was in the wrong place — the two halves were tightly coupled"

These observations are the highest-value qualitative signal the system can receive, and there is currently no structured path to capture them. They end up as Slack messages or developer notes that never reach the KB.

## Goal

Add a `kb_add_workflow_observation` MCP tool that accepts free-form workflow observations at any phase — not tied to a specific finding — and a `/observe` command that agents and developers can invoke to record them.

## Non-goals

- Replacing the existing `/feedback` command (that stays for finding-specific feedback)
- Building a UI for observations
- Automating observation collection (agents may be prompted to observe, but humans can also submit)

## Scope

### New Schema: `WorkflowObservationSchema`

```typescript
const WorkflowObservationSchema = z.object({
  story_id: z.string(),
  phase: z.enum([
    'elaboration', 'development', 'code-review',
    'qa-verification', 'post-completion', 'general'
  ]),
  observation_type: z.enum([
    'scope-wrong',          // Story was over/under-scoped
    'elaboration-missed',   // Elaboration failed to identify the real problem
    'implementation-drift', // Implementation diverged from the AC intent
    'qa-wrong-pass',        // QA passed but the feature doesn't work correctly
    'qa-wrong-fail',        // QA failed on something that was actually correct (broader than a single finding)
    'split-wrong',          // Story split created tight coupling
    'estimate-wrong',       // Token/time estimate was significantly off
    'dependency-wrong',     // Dependency order was incorrect
    'workflow-observation',  // General workflow observation
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  observed_by: z.string(),   // Agent name or 'human'
  observation: z.string(),   // Free-text description
  recommendation: z.string().optional(),  // What should change
  created_at: z.string().datetime(),
})
```

Stored in `knowledge_entries` with `entry_type: 'observation'`.

### New MCP Tool: `kb_add_workflow_observation`

```typescript
kb_add_workflow_observation({
  story_id: string
  phase: ObservationPhase
  observation_type: ObservationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  observed_by: string
  observation: string
  recommendation?: string
})
```

Auto-tags: `['observation', 'phase:{phase}', 'type:{observation_type}', 'story:{story_id}', 'date:{YYYY-MM}']`

### New Command: `/observe`

```bash
/observe {STORY_ID} --type=scope-wrong --severity=high "The story included both the API and UI work but the AC only described the API. The UI was a surprise."
/observe {STORY_ID} --type=qa-wrong-pass --severity=critical "QA passed but the feature fails when the user has no profile photo."
/observe {STORY_ID} --phase=post-completion --type=workflow-observation "The dependency on KNOW-024 wasn't actually needed — could have shipped independently."
```

### Agent Prompt Opportunities

Three agents are natural observation points:

**`qa-verify-completion-leader`** — after a story passes QA, prompted to write a `post-completion` observation if anything notable occurred (e.g. high iteration count, unusual proof complexity).

**`dev-documentation-leader`** — before writing OUTCOME.yaml, check if the actual scope differed significantly from the estimated scope; if so, write a `scope-wrong` or `estimate-wrong` observation.

**`workflow-retro`** — query `entry_type: 'observation'` alongside feedback when analyzing a story, treating observations as qualitative context for quantitative patterns.

### Retro Integration

Extend `workflow-retro` to query observations:
```javascript
kb_search({
  entry_type: 'observation',
  tags: ['observation'],
  query: 'scope wrong estimate drift',
  limit: 20
})
```

Aggregate by `observation_type` — if `scope-wrong` appears in 3+ stories, that's a pattern worth surfacing.

### Packages Affected

- `apps/api/knowledge-base/src/__types__/index.ts` — `WorkflowObservationSchema`
- `apps/api/knowledge-base/src/mcp-server/tool-schemas.ts` — `kb_add_workflow_observation`
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — implement handler
- `.claude/commands/observe.md` — new command
- `.claude/agents/qa-verify-completion-leader.agent.md` — post-completion observation prompt
- `.claude/agents/dev-documentation-leader.agent.md` — scope drift observation
- `.claude/agents/workflow-retro.agent.md` — query observations in analysis

## Acceptance Criteria

- [ ] `WorkflowObservationSchema` Zod schema defined with all observation types
- [ ] `kb_add_workflow_observation` MCP tool writes to `knowledge_entries` with `entry_type: 'observation'`
- [ ] `/observe` command accepts `story_id`, `--type`, `--severity`, `--phase`, and free-text note
- [ ] `qa-verify-completion-leader` writes a post-completion observation when iteration count > 1
- [ ] `dev-documentation-leader` writes a scope drift observation when actual effort significantly exceeds estimate
- [ ] `workflow-retro` queries observations alongside feedback and surfaces `observation_type` patterns
- [ ] Observations with `severity: critical` are immediately added as KB tasks for follow-up
- [ ] Human developers can also invoke `/observe` manually (not agent-only)
