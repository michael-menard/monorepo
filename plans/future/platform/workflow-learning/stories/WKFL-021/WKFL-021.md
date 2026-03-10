---
story_id: WKFL-021
title: Decision Outcome Capture — Feed the Heuristic-Evolver Data Pipeline
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
depends_on:
  - WKFL-003  # heuristic-evolver agent must be complete before its data feed is useful
  - LNGG-006  # blocked until LangGraph migration completes
---

# WKFL-021: Decision Outcome Capture — Feed the Heuristic-Evolver Data Pipeline

## Context

WKFL-003 (Emergent Heuristic Discovery) designed a `heuristic-evolver` agent that analyzes historical autonomy decisions to propose tier adjustments — moving patterns up or down between autonomy tiers based on whether decisions required escalation or were safely handled autonomously. The agent is fully specified and the `HEURISTIC-PROPOSALS.yaml` output schema is defined.

The entire pipeline is inert because **no agent writes `decision_outcome` KB entries**. The heuristic-evolver's first step is:

```javascript
kb_search({ query: "type:decision_outcome", limit: 1000 })
```

This query returns zero results today. The `decision-outcome-schema.md` schema has been defined, the heuristic-evolver knows exactly what fields to expect, but the data producers were never wired up.

Simultaneously, a `/heuristic-evolver` command file does not exist, so even if data were present, the agent could not be invoked.

The downstream consequence: `decision-classification.yaml` — the file that controls which workflow decisions agents handle autonomously vs. escalate — has never been updated based on empirical evidence. Every autonomy tier assignment is frozen at its initial manual value, regardless of what the data would suggest.

## Goal

Wire `decision_outcome` KB entry writes into the agents that make autonomy-relevant decisions during elaboration, implementation planning, and QA. Create the `/heuristic-evolver` command. This unblocks WKFL-003 to run against real data.

## Non-goals

- Backfilling historical decision outcomes (start accumulating from this story forward)
- Changing the heuristic-evolver's analysis algorithm (WKFL-003 owns that)
- Automatically applying proposals to `decision-classification.yaml` (human approval still required per WKFL-003 design)

## Scope

### `decision_outcome` Entry Format

Per the existing `decision-outcome-schema.md`:

```typescript
kb_add({
  entry_type: 'note',
  content: JSON.stringify({
    schema: 'decision_outcome',
    pattern_id: string,          // e.g., "scope-change-during-implementation"
    story_id: string,
    phase: string,               // "elaboration" | "implementation" | "review" | "qa"
    decision_type: string,       // "autonomous" | "escalated" | "blocked"
    outcome: string,             // "correct" | "incorrect" | "user-override"
    confidence: string,          // "high" | "medium" | "low"
    rationale: string,           // brief description of what was decided
    escalation_reason?: string,  // if escalated: why
  }),
  tags: ['decision_outcome', `pattern:${pattern_id}`, `story:${story_id}`, `date:${YYYY_MM}`],
  story_id: story_id,
})
```

### Agents to Write Decision Outcomes

**`elab-autonomous-decider.agent.md`** — primary producer. For every autonomous decision made on a gap or opportunity, emit a `decision_outcome` entry:

```
After each autonomous decision (add-as-ac | log-to-kb | defer):
  kb_add({
    entry_type: 'note',
    content: {
      schema: 'decision_outcome',
      pattern_id: derived from gap.category + gap.severity,
      story_id: STORY_ID,
      phase: 'elaboration',
      decision_type: 'autonomous',
      outcome: 'pending',        // Updated to 'correct'/'incorrect' after story completion
      confidence: gap.confidence,
      rationale: gap.recommendation
    },
    tags: ['decision_outcome', 'phase:elaboration', ...]
  })
```

**`commitment-gate-agent.agent.md`** — when a PASS is given despite concerns (conditional pass), or when escalating a BLOCKED verdict, emit an outcome:

```
On CONDITIONAL_PASS or BLOCKED:
  kb_add({ schema: 'decision_outcome', decision_type: 'escalated', phase: 'elaboration', ... })
```

**`dev-plan-leader.agent.md`** — when making scope or split decisions during implementation planning:

```
On SPLIT_DECISION or SCOPE_REDUCTION:
  kb_add({ schema: 'decision_outcome', decision_type: 'autonomous'|'escalated', phase: 'implementation', ... })
```

### Outcome Verification at Story Completion

When `dev-documentation-leader.agent.md` writes OUTCOME.yaml, update any `decision_outcome` entries for this story from `outcome: 'pending'` to their actual outcome:

```
For each decision_outcome KB entry tagged story:{STORY_ID}:
  if story_split_occurred AND decision was 'autonomous scope decision':
    update outcome → 'incorrect'
  if review_cycles > predicted AND decision was 'autonomous quality pass':
    update outcome → 'incorrect'
  else:
    update outcome → 'correct'
```

This uses `kb_update` on the existing entries. The heuristic-evolver then has verified outcomes, not just pending decisions.

### `/heuristic-evolver` Command

Create `.claude/commands/heuristic-evolver.md`:

```
Usage: /heuristic-evolver [--since=YYYY-MM-DD] [--pattern=PATTERN_ID] [--dry-run]

Spawns the heuristic-evolver agent to analyze decision_outcome KB entries
and generate HEURISTIC-PROPOSALS.yaml with tier adjustment recommendations.

Arguments:
  --since       Only analyze decisions since this date (default: 90 days)
  --pattern     Analyze a specific pattern only
  --dry-run     Show what would be proposed without writing HEURISTIC-PROPOSALS.yaml

Minimum dataset: 10+ decision_outcome entries required. Exits with warning if insufficient data.
```

### Packages Affected

- `.claude/agents/elab-autonomous-decider.agent.md` — write `decision_outcome` KB entries for each autonomous decision
- `.claude/agents/commitment-gate-agent.agent.md` — write outcome entry on CONDITIONAL_PASS/BLOCKED
- `.claude/agents/dev-plan-leader.agent.md` — write outcome entry on split/scope decisions
- `.claude/agents/dev-documentation-leader.agent.md` — update pending outcomes to verified on story completion
- `.claude/commands/heuristic-evolver.md` — new command file to invoke WKFL-003 agent

## Acceptance Criteria

- [ ] `elab-autonomous-decider` writes one `decision_outcome` KB entry per autonomous decision made on a gap/opportunity
- [ ] Each `decision_outcome` entry is tagged with `decision_outcome`, `pattern:{id}`, `story:{id}`, `date:YYYY-MM`
- [ ] `commitment-gate-agent` writes a `decision_outcome` entry when issuing a CONDITIONAL_PASS or BLOCKED verdict
- [ ] When `dev-documentation-leader` writes OUTCOME.yaml, it resolves `pending` decision outcomes to `correct` or `incorrect` for that story
- [ ] `/heuristic-evolver` command file exists and invokes the heuristic-evolver agent from WKFL-003
- [ ] Running `/heuristic-evolver` against a project with 10+ completed stories produces a non-empty `HEURISTIC-PROPOSALS.yaml`
- [ ] `kb_search({ query: "type:decision_outcome" })` returns entries after a story with autonomous decisions completes
- [ ] `/heuristic-evolver --dry-run` exits with a warning (not error) if fewer than 10 `decision_outcome` entries exist
