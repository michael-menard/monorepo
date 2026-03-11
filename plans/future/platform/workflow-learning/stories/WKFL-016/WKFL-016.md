---
story_id: WKFL-016
title: Connect Feedback to Retro and Elaboration Pipeline
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: high
depends_on:
  - WKFL-013  # retro must be automated before this connection has regular effect
---

# WKFL-016: Connect Feedback to Retro and Elaboration Pipeline

## Context

The `/feedback` command writes structured entries to `knowledge_entries` with `entry_type='feedback'` and a corresponding calibration entry. These entries capture valuable signal: "this finding was a false positive," "this severity was wrong," "this check was missing."

The `confidence-calibrator` agent reads calibration entries and adjusts agent confidence scores. The `improvement-proposer` agent reads feedback for proposal generation. But two critical consumers are missing:

1. **`workflow-retro`** does not read feedback — the retro analyzes OUTCOME.yaml, token usage, and verification results, but never asks "what did agents get wrong this month according to feedback?" Patterns like "code-review-security has a 40% false positive rate this month" would be high-value retro findings, but they're invisible.

2. **`elab-analyst`** does not read feedback — when the same agent generates the same type of false positive across 10 stories, every elaboration is blind to that pattern. A future story gets elaborated with the same QA trap built in because the elaboration agent never learned from past false positives.

## Goal

Add a feedback aggregation step to `workflow-retro` and a false-positive awareness query to `elab-analyst`, so the feedback signal actively shapes both retrospective learning and future elaboration quality.

## Non-goals

- Changing the `/feedback` command schema
- Making feedback influence real-time QA decisions (only retro and elaboration)
- Automatic agent confidence adjustment (that's `confidence-calibrator`'s job)

## Scope

### Change 1: Retro Feedback Aggregation

Add a new analysis category to `workflow-retro.agent.md` — **Feedback Pattern Analysis**:

```
### Category 5: Feedback Pattern Analysis

Query feedback entries for the analysis period:
kb_search({
  entry_type: 'feedback',
  tags: ['feedback'],
  query: 'false positive missing severity',
  limit: 50
})

Aggregate by agent_id and feedback_type:
- Compute false_positive_rate per agent: (false_positive count / total findings count)
- Compute missing_rate per agent: (missing count / total findings count)
- Identify agents with false_positive_rate > 25% across 3+ stories

Threshold for KB write: agent with false_positive_rate > 25% across 3+ distinct stories

Pattern format:
{
  pattern_type: 'agent-false-positive-rate',
  agent_id: '{agent}',
  false_positive_rate: N%,
  story_count: N,
  examples: ['{story_id}: {finding description}', ...]
}
```

This adds a fifth analysis category alongside the existing four (token budget, review cycles, agent correlation, AC success rate).

### Change 2: Elab False-Positive Awareness

Add a query to `elab-analyst.agent.md` Step 0 (alongside the ADR load from KNOW-039):

```
### Step 0b: Load Known False Positive Patterns

Query feedback for recurring false positives relevant to this story's domain:

kb_search({
  entry_type: 'feedback',
  tags: ['feedback', 'type:false_positive'],
  query: '{story domain} {epic} false positive',
  limit: 5
})

For each result:
- Note which agent_id produces this false positive
- Note the finding description pattern
- Add to ELAB.yaml under `known_false_positives[]`:
  "QA agent {agent_id} may flag {pattern} as a finding — this is a known false positive
   in {N} prior stories. AC should be written to explicitly address this."
```

This gives the elaboration agent the opportunity to write more precise ACs that preemptively satisfy known false-positive traps — reducing QA churn before it starts.

### Change 3: Retro Feedback Summary in WORKFLOW-RECOMMENDATIONS.md

Extend the WORKFLOW-RECOMMENDATIONS.md output to include a monthly feedback section:

```markdown
## Feedback Signals — {YYYY-MM}

### Agent False Positive Rates
| Agent | False Positive Rate | Stories | Top Finding Type |
|---|---|---|---|
| code-review-security | 38% | 8 | SQL injection in parameterized queries |
| qa-verify-verification | 22% | 5 | Missing error handling (already handled by framework) |

### Missing Coverage Patterns
- Auth stories consistently miss rate limiting checks (5 stories)
```

### Packages / Files Affected

- `.claude/agents/workflow-retro.agent.md` — add Category 5 feedback pattern analysis
- `.claude/agents/elab-analyst.agent.md` — add Step 0b false-positive awareness query
- `.claude/agents/workflow-retro.agent.md` — extend WORKFLOW-RECOMMENDATIONS output

## Acceptance Criteria

- [ ] `workflow-retro` queries feedback entries for the analysis period as Category 5
- [ ] Agents with false positive rate > 25% across 3+ stories generate a KB pattern entry
- [ ] `elab-analyst` queries known false positives for the story's domain before beginning audit
- [ ] Known false positive patterns appear in ELAB.yaml under `known_false_positives[]`
- [ ] WORKFLOW-RECOMMENDATIONS.md includes a monthly feedback signals section after batch retro
- [ ] A story elaborated after 5 false-positive feedback entries on the same pattern includes a preemptive AC addressing it
- [ ] The feedback query in elab-analyst falls back gracefully when no relevant false positives exist
