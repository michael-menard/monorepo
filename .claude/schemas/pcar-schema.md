---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
doc_type: schema
---

# PCAR Schema

Defines the structure, event classification, and reporting format for Post-Commitment Ambiguity Rate (PCAR) metrics in the flow-convergence workflow.

---

## Overview

PCAR is the **NORTH STAR METRIC** for planning quality. It measures clarification and scope-change events that occur AFTER commitment to development. The metric answers a critical question:

> "Did we reduce ambiguity at commitment time without suppressing learning?"

From PLAN.md:
- Churn before commitment = **learning**
- Churn after commitment = **risk**

PCAR specifically tracks the "risk" side - events that indicate planning gaps leaked through the commitment boundary.

**IMPORTANT**: PCAR is for SYSTEM LEARNING only, NOT performance evaluation.

---

## Ambiguity Event Types

Only two event types count toward PCAR:

### 1. Clarification Events

Events where developers need to ask questions or seek clarity after commitment.

```yaml
clarification_event:
  type: "clarification"
  definition: "Request for information that should have been known at commitment"

  detection_criteria:
    explicit_markers:
      - "?"  # Direct questions in implementation context
      - "clarify"
      - "clarification"
      - "what do you mean"
      - "can you explain"
      - "please elaborate"

    implicit_markers:
      - "not sure about"
      - "unclear"
      - "ambiguous"
      - "which approach"
      - "should I"
      - "is this correct"
      - "confirm my understanding"

    stakeholder_turns:
      - "asked PM"
      - "checked with UX"
      - "confirmed with QA"
      - "pinged architect"

  severity_indicators:
    high:
      - "blocks implementation"
      - "fundamental question"
      - "architectural ambiguity"
    medium:
      - "edge case question"
      - "behavior clarification"
    low:
      - "minor detail"
      - "preference question"
```

### 2. Scope Change Events

Events where acceptance criteria or scope boundaries change after commitment.

```yaml
scope_change_event:
  type: "scope_change"
  definition: "Modification to what was agreed at commitment"

  detection_criteria:
    ac_changes:
      - "AC added"
      - "AC modified"
      - "AC removed"
      - "acceptance criteria updated"
      - "new requirement"

    constraint_changes:
      - "constraint added"
      - "constraint modified"
      - "constraint removed"
      - "scope expanded"
      - "scope reduced"

    file_changes:
      - "affected files changed"
      - "new files added to scope"
      - "files removed from scope"

    complexity_changes:
      - "complexity estimate increased"
      - "estimate updated"

  severity_indicators:
    high:
      - "major scope expansion"
      - "AC added after dev start"
      - "fundamental change"
    medium:
      - "AC clarification"
      - "constraint adjustment"
    low:
      - "minor wording change"
      - "cosmetic update"
```

---

## Post-Commitment Definition

### Commitment Boundary

Commitment occurs when:
1. Readiness score >= 85
2. Blockers = 0
3. Known unknowns <= 5
4. Commitment gate passes

### Post-Commitment Phases

Events in these phases are automatically post-commitment:

```yaml
post_commitment_phases:
  - phase: "implementation"
    description: "Active development work"
    churn_expected: LOW
    churn_cost: HIGH

  - phase: "verification"
    description: "QA verification and testing"
    churn_expected: VERY_LOW
    churn_cost: VERY_HIGH

  - phase: "complete"
    description: "Story completed"
    churn_expected: NONE
    churn_cost: VERY_HIGH
```

### Temporal Boundary

For events not in post-commitment phases, use timestamp comparison:

```yaml
temporal_check:
  condition: "event.timestamp > commitment.timestamp"
  applies_to:
    - Events during commitment phase but after gate pass
    - Events with ambiguous phase
```

---

## PCAR Metrics Structure

### Core Metrics Record

```yaml
# Identification
story_id: string           # Story being measured
calculated_at: datetime    # When PCAR was calculated

# Commitment context
commitment:
  found: boolean           # Whether commitment event exists
  timestamp: datetime      # When commitment occurred (if found)
  phase: string            # Phase when committed

# Event counts
metrics:
  clarification_count: number    # Total clarification events
  scope_change_count: number     # Total scope change events
  total_ambiguity: number        # clarification + scope_change
  rate: number                   # total_ambiguity / stories_analyzed
  stories_analyzed: number       # Number of stories (usually 1)

  # Phase breakdown
  by_phase:
    implementation: number
    verification: number
    complete: number

# Individual events
events: array              # List of ambiguity events

# Assessment
assessment:
  level: enum              # excellent | moderate | high | critical
  pcar_exceeds_high: boolean
  pcar_exceeds_critical: boolean

# Insights
insights: array            # System learning insights

# Status
success: boolean
error: string | null
```

### Individual Event Record

```yaml
event:
  type: "clarification" | "scope_change"
  timestamp: datetime
  phase: "implementation" | "verification" | "complete"
  description: string      # Brief description of what happened
  actor: string            # Who triggered (dev, system, pm, ux, qa)
  related_ids: array       # Related entity IDs (AC IDs, gap IDs)
  metadata: object         # Additional context
```

---

## PCAR Rate Calculation

### Formula

```
PCAR = total_ambiguity_events / stories_analyzed
```

For single-story analysis:
```
PCAR = (clarification_count + scope_change_count) / 1
```

### Thresholds

```yaml
pcar_thresholds:
  excellent:
    range: [0, 0]
    meaning: "Zero post-commitment ambiguity - planning was thorough"
    action: "Celebrate and document what worked"

  moderate:
    range: [1, 2]
    meaning: "Minor ambiguity - acceptable but room for improvement"
    action: "Review events in retrospective"

  high:
    range: [3, 4]
    meaning: "Significant ambiguity - elaboration phase needs improvement"
    action: "Investigate root causes, improve upstream processes"
    threshold_name: "high_pcar"

  critical:
    range: [5, infinity]
    meaning: "Critical planning gaps - system failure upstream"
    action: "Stop and fix process, do not proceed without investigation"
    threshold_name: "critical_pcar"
```

---

## Insight Generation

### Rate-Based Insights

```yaml
rate_insights:
  - condition: "rate == 0"
    insight: "Excellent: Zero post-commitment ambiguity events - planning was thorough"

  - condition: "rate >= critical_threshold (5)"
    insight: "Critical PCAR ({rate} events/story) - significant planning gaps need investigation"

  - condition: "rate >= high_threshold (3)"
    insight: "High PCAR ({rate} events/story) - consider improving elaboration phase"

  - condition: "rate > 0"
    insight: "Moderate PCAR ({rate} events/story) - room for improvement in planning"
```

### Pattern-Based Insights

```yaml
pattern_insights:
  clarification_heavy:
    condition: "clarification_count > scope_change_count * 2"
    insight: "Clarification-heavy ({clarification_count} vs {scope_change_count} scope changes) - requirements may lack clarity"
    recommendation: "Improve AC specificity in elaboration"

  scope_change_heavy:
    condition: "scope_change_count > clarification_count * 2"
    insight: "Scope-change-heavy ({scope_change_count} vs {clarification_count} clarifications) - scope may not be fully defined at commitment"
    recommendation: "Improve scope boundary definition"

  implementation_concentrated:
    condition: "by_phase.implementation / total_ambiguity > 0.7"
    insight: "{percentage}% of ambiguity in implementation phase - consider more thorough pre-dev review"
    recommendation: "Add implementation kickoff checkpoint"

  verification_events:
    condition: "by_phase.verification > 0"
    insight: "{count} ambiguity events during verification - QA is finding gaps that should be caught earlier"
    recommendation: "Improve QA involvement in elaboration"
```

---

## PCAR History Schema

History is stored at `{feature_dir}/_metrics/PCAR-HISTORY.yaml`.

### History File Structure

```yaml
schema: 1
feature_dir: "{FEATURE_DIR}"
created_at: "{ISO_TIMESTAMP}"
updated_at: "{ISO_TIMESTAMP}"

# Aggregate statistics
totals:
  stories_analyzed: number
  total_ambiguity_events: number
  average_pcar: number
  stories_at_excellent: number
  stories_at_moderate: number
  stories_at_high: number
  stories_at_critical: number

# Trend data
trends:
  - period: "2026-W05"
    stories: number
    average_pcar: number
    clarification_total: number
    scope_change_total: number

# Story-level tracking
stories:
  STORY-001:
    calculated_at: "{ISO_TIMESTAMP}"
    commitment_timestamp: "{ISO_TIMESTAMP}"
    metrics:
      clarification_count: number
      scope_change_count: number
      total_ambiguity: number
      rate: number
    assessment:
      level: string
    events:
      - type: string
        timestamp: string
        phase: string
        description: string
```

---

## Integration Points

### Consumed By

| Agent/Node | Usage |
|------------|-------|
| `scrum-master-loop-leader` | Tracks PCAR across story workflow |
| `dev-verification-leader` | Reports PCAR in verification summary |
| `gap-analytics-agent` | Correlates PCAR with gap patterns |
| `metrics.aggregate` | Aggregates PCAR across features |

### Produces

| Output | Location |
|--------|----------|
| Story PCAR | `{output_dir}/_implementation/PCAR.yaml` |
| PCAR history | `{feature_dir}/_metrics/PCAR-HISTORY.yaml` |
| Insights | Included in PCAR output |

### Consumes

| Input | From |
|-------|------|
| Workflow events | `collect-events` node / EVENTS.yaml |
| Commitment timestamp | `commitment-gate-agent` output |
| Story structure | Story file |
| Checkpoint data | CHECKPOINT.md |

---

## Reporting Format

### Story-Level Report

```yaml
# PCAR.yaml - Story-level PCAR report
schema: 1
story_id: "WISH-0500"
calculated_at: "2026-02-01T14:30:00Z"

commitment:
  found: true
  timestamp: "2026-02-01T10:00:00Z"

metrics:
  clarification_count: 2
  scope_change_count: 1
  total_ambiguity: 3
  rate: 3.0
  stories_analyzed: 1
  by_phase:
    implementation: 2
    verification: 1
    complete: 0

assessment:
  level: high
  pcar_exceeds_high: true
  pcar_exceeds_critical: false

insights:
  - "High PCAR (3.0 events/story) - consider improving elaboration phase"
  - "Clarification-heavy (2 vs 1 scope changes) - requirements may lack clarity"

events:
  - type: clarification
    timestamp: "2026-02-01T11:30:00Z"
    phase: implementation
    description: "Developer asked about error handling edge case"

success: true
```

### Feature-Level Summary

```yaml
# PCAR-SUMMARY.yaml - Feature-level aggregation
schema: 1
feature_dir: "plans/future/wish"
generated_at: "2026-02-01T15:00:00Z"

summary:
  stories_analyzed: 12
  average_pcar: 1.8
  total_ambiguity_events: 22
  stories_with_zero_pcar: 4
  stories_exceeding_high: 2
  stories_exceeding_critical: 0

distribution:
  excellent: 4
  moderate: 6
  high: 2
  critical: 0

top_issues:
  - pattern: "clarification_heavy"
    occurrence: 5
    recommendation: "Improve AC specificity in elaboration"

  - pattern: "implementation_concentrated"
    occurrence: 3
    recommendation: "Add implementation kickoff checkpoint"

trends:
  - period: "2026-W04"
    average_pcar: 2.3

  - period: "2026-W05"
    average_pcar: 1.8
    delta: -0.5
    direction: improving
```

---

## Evolution Notes

This schema is designed for evolution:

1. **New event types**: Add to ambiguity event classification
2. **Threshold tuning**: Adjust based on delivery outcomes
3. **Pattern detection**: Add new insight patterns as discovered
4. **Aggregation levels**: Add team/org level PCAR tracking

When evolving, increment schema version and document migration path.

---

## Key Principles

### 1. Post-Commitment Only

PCAR only measures events AFTER commitment. Pre-commitment activity is learning, not waste.

### 2. System Learning, Not Performance

PCAR identifies process gaps, not individual performance issues. Never use for evaluation.

### 3. Actionable Insights

Every PCAR measurement should include insights that point to process improvements.

### 4. Trend Over Snapshot

Single PCAR values matter less than trends over time. Track improvement trajectories.
