---
created: 2026-02-07
updated: 2026-02-07
version: 1.1.0
doc_type: schema
story_id: WKFL-001
extended_by: WKFL-008
---

# OUTCOME.yaml Schema

Defines the structure for capturing story implementation outcomes. This data enables workflow learning, calibration, and retrospective analysis.

---

## Overview

OUTCOME.yaml is generated after story completion and captures metrics across all workflow phases. It serves as the foundation for:
- Token budget calibration (WKFL-002)
- Pattern detection (WKFL-006)
- Experiment framework (WKFL-008)
- Human feedback integration (WKFL-004)

---

## Schema Definition

```yaml
# OUTCOME.yaml - Story Implementation Outcome Record
# Version: 1.1 (extended by WKFL-008)

schema_version: 1
story_id: string           # e.g., "WISH-2045"
epic_id: string            # e.g., "wishlist"
completed_at: datetime     # ISO 8601 timestamp

# Experiment tracking (WKFL-008)
experiment_variant: string | null  # e.g., "exp-fast-track", "control", or null

# Phase-by-phase metrics
phases:
  pm_story:                # Optional - only if story went through PM generation
    tokens_in: number
    tokens_out: number
    duration_ms: number
    status: enum           # complete | skipped | failed

  elaboration:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    verdict: enum          # PASS | FAIL | SKIP
    cycles: number         # Number of elaboration iterations

  dev_setup:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    status: enum           # complete | failed

  dev_plan:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    status: enum           # complete | failed

  dev_implementation:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    review_cycles: number  # How many code review iterations
    findings:              # Findings by review agent
      code-review-security: number
      code-review-lint: number
      code-review-build: number
      code-review-typecheck: number
      code-review-syntax: number

  dev_documentation:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    status: enum           # complete | failed

  qa_verify:
    tokens_in: number
    tokens_out: number
    duration_ms: number
    verdict: enum          # PASS | FAIL

  qa_gate:
    verdict: enum          # PASS | CONCERNS | FAIL | WAIVED
    concerns: number       # Number of concerns raised

# Aggregated totals
totals:
  tokens_in: number        # Sum of all phases
  tokens_out: number
  tokens_total: number     # tokens_in + tokens_out
  duration_ms: number
  review_cycles: number    # Total review iterations
  gate_attempts: number    # How many QA gate attempts

# Decision metrics (from autonomy framework)
decisions:
  auto_accepted: number    # Tier decisions auto-approved
  escalated: number        # Decisions escalated to human
  overridden: number       # Human overrode auto-decision
  deferred: number         # Decisions deferred to future

# Estimation accuracy (populated by WKFL-002 calibration)
predictions: null          # Placeholder for future calibration data
  # When implemented:
  # estimated_tokens: number
  # actual_tokens: number
  # variance_percent: number
  # confidence: number

# Human feedback (populated by WKFL-004 feedback loop)
human_feedback: []         # Placeholder for future feedback
  # When implemented:
  # - rating: number (1-5)
  #   category: string
  #   comment: string
  #   timestamp: datetime

# Source artifact references
sources:
  token_log: string        # Path to TOKEN-LOG.md
  checkpoint: string       # Path to CHECKPOINT.yaml
  verification: string     # Path to VERIFICATION.yaml
  decisions: string        # Path to DECISIONS.yaml (if exists)
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | number | Yes | Schema version for migration support |
| `story_id` | string | Yes | Story identifier (e.g., WISH-2045) |
| `epic_id` | string | Yes | Epic/feature identifier |
| `completed_at` | datetime | Yes | When story completed |
| `experiment_variant` | string \| null | No | Experiment variant assignment (WKFL-008) |

### Experiment Variant Field (WKFL-008)

| Value | Meaning |
|-------|---------|
| `"exp-{id}"` | Story was assigned to treatment variant of experiment {id} |
| `"control"` | Story was in control group (not assigned to any experiment) |
| `null` | Story predates experiment tracking (legacy stories) |

**Backward Compatibility**: This field is nullable to support legacy OUTCOME.yaml files created before WKFL-008 implementation. Null means the story was completed before experiment tracking was available, NOT that it was in the control group.

**Treatment vs Control**: Only stories with `experiment_variant: "control"` are considered control group members. Null-variant stories are excluded from experiment analysis entirely.

### Phase Metrics

Each phase captures:

| Field | Type | Description |
|-------|------|-------------|
| `tokens_in` | number | Input tokens consumed |
| `tokens_out` | number | Output tokens generated |
| `duration_ms` | number | Wall-clock time in milliseconds |
| `status` / `verdict` | enum | Phase completion status |

### Totals

| Field | Type | Description |
|-------|------|-------------|
| `tokens_total` | number | Grand total tokens (in + out) |
| `review_cycles` | number | Total code review iterations |
| `gate_attempts` | number | QA gate submission attempts |

### Decisions

Captures autonomy framework metrics:

| Field | Description |
|-------|-------------|
| `auto_accepted` | Decisions approved without escalation |
| `escalated` | Decisions that required human input |
| `overridden` | Human changed auto-decision |
| `deferred` | Logged for future consideration |

---

## Example

```yaml
schema_version: 1
story_id: WISH-2045
epic_id: wishlist
completed_at: 2026-02-06T15:00:00Z
experiment_variant: "exp-fast-track"

phases:
  pm_story:
    tokens_in: 5000
    tokens_out: 7340
    duration_ms: 45000
    status: complete

  elaboration:
    tokens_in: 4000
    tokens_out: 4900
    duration_ms: 32000
    verdict: SKIP
    cycles: 0

  dev_setup:
    tokens_in: 2000
    tokens_out: 1500
    duration_ms: 15000
    status: complete

  dev_plan:
    tokens_in: 8000
    tokens_out: 12000
    duration_ms: 60000
    status: complete

  dev_implementation:
    tokens_in: 80000
    tokens_out: 76000
    duration_ms: 890000
    review_cycles: 2
    findings:
      code-review-security: 3
      code-review-lint: 1
      code-review-build: 0
      code-review-typecheck: 0
      code-review-syntax: 0

  dev_documentation:
    tokens_in: 3000
    tokens_out: 4000
    duration_ms: 25000
    status: complete

  qa_verify:
    tokens_in: 12000
    tokens_out: 11000
    duration_ms: 120000
    verdict: PASS

  qa_gate:
    verdict: PASS
    concerns: 0

totals:
  tokens_in: 114000
  tokens_out: 116740
  tokens_total: 230740
  duration_ms: 1187000
  review_cycles: 2
  gate_attempts: 1

decisions:
  auto_accepted: 8
  escalated: 1
  overridden: 0
  deferred: 2

predictions: null
human_feedback: []

sources:
  token_log: "_implementation/TOKEN-LOG.md"
  checkpoint: "_implementation/CHECKPOINT.yaml"
  verification: "_implementation/VERIFICATION.yaml"
  decisions: "_implementation/DECISIONS.yaml"
```

---

## Generation

OUTCOME.yaml is generated by `dev-documentation-leader.agent.md` after the documentation phase completes. The leader:

1. Reads `TOKEN-LOG.md` to extract per-phase token counts
2. Reads `CHECKPOINT.yaml` for timing and cycle information
3. Reads `VERIFICATION.yaml` for verdict information
4. Reads `DECISIONS.yaml` (if exists) for decision metrics
5. **Reads `story.yaml` to extract `experiment_variant` field** (WKFL-008)
6. Aggregates totals
7. Writes OUTCOME.yaml to `_implementation/`

**Experiment Variant Propagation** (WKFL-008):
- Read `experiment_variant` from story.yaml frontmatter
- Include in OUTCOME.yaml exactly as specified
- If field missing from story.yaml, write `null` (legacy story)

---

## Consumers

| Agent/System | Usage |
|--------------|-------|
| `workflow-retro.agent.md` | Analyzes patterns across completed stories |
| `calibration.agent.md` (WKFL-002) | Compares predictions vs actuals |
| `pattern-miner.agent.md` (WKFL-006) | Detects cross-story patterns |
| `experiment-analyzer.agent.md` (WKFL-008) | Statistical analysis by variant |
| Knowledge Base | Stores significant findings |

---

## Validation Rules

1. **Required phases**: At minimum, `dev_implementation` and `qa_gate` must be present
2. **Token sanity**: `tokens_in` and `tokens_out` must be > 0 for active phases
3. **Duration sanity**: `duration_ms` must be > 0 for active phases
4. **Verdict values**: Must be valid enum values as documented
5. **Totals consistency**: `tokens_total` must equal sum of phase tokens
6. **Experiment variant**: Must be string matching `exp-{id}`, `"control"`, or `null`

---

## Evolution Notes

This schema is designed for backward-compatible evolution:

1. **New phases**: Add optional phase entries
2. **New metrics**: Add optional fields within phases
3. **Predictions/feedback**: Placeholder fields are ready for WKFL-002/004
4. **Experiment tracking**: Added in v1.1 (WKFL-008) with nullable field
5. **Breaking changes**: Increment `schema_version`, document migration

When evolving, maintain backward compatibility or provide migration tooling.

---

## Changelog

### Version 1.1.0 (2026-02-07 - WKFL-008)
- Added `experiment_variant` field (nullable for backward compatibility)
- Updated generation process to read variant from story.yaml
- Added experiment-analyzer as consumer
- Added validation rule for experiment_variant format

### Version 1.0.0 (2026-02-07 - WKFL-001)
- Initial schema definition
- Core phase metrics, totals, decisions
- Placeholders for predictions and human feedback
