---
created: 2026-03-03
updated: 2026-03-03
version: 1.0.0
doc_type: schema
story_id: AC-1010
---

# ELAB.yaml Schema

Golden reference schema for story elaboration artifacts. Produced by `elab-analyst.agent.md` and finalized by `elab-completion-leader.agent.md`.

---

## Overview

`ELAB.yaml` is the single elaboration artifact written to `{FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/ELAB.yaml`. It captures the full elaboration lifecycle: audit findings, gap analysis, opportunity discovery, and final verdict.

This file replaces all legacy elaboration artifacts:
- `ANALYSIS.md` (superseded)
- `DECISIONS.yaml` (elab-specific variant — superseded; note: `ARCHITECTURAL-DECISIONS.yaml`, `BATCH-DECISIONS.yaml`, `DECISIONS-AUTO.yaml`, and `PENDING-DECISIONS.yaml` are separate, unchanged artifacts)
- `FUTURE-OPPORTUNITIES.md` (superseded)
- `ELAB-{ID}.md` / `ELAB-STORY-XXX.md` (superseded)

---

## Schema Definition

```yaml
# ELAB.yaml - Story Elaboration Record
# Written to: {FEATURE_DIR}/elaboration/{STORY_ID}/_implementation/ELAB.yaml

schema_version: 1           # REQUIRED — first field, used for migration support
story_id: string            # e.g., "WISH-001"
timestamp: datetime         # ISO 8601 timestamp of analysis

audit:                      # 9-point audit results, populated by elab-analyst
  - id: scope_alignment
    status: PASS | FAIL | WARN
    note: string

  - id: internal_consistency
    status: PASS | FAIL | WARN
    note: string

  - id: reuse_first
    status: PASS | FAIL | WARN
    note: string

  - id: ports_adapters
    status: PASS | FAIL | WARN
    note: string

  - id: testability
    status: PASS | FAIL | WARN
    note: string

  - id: decision_completeness
    status: PASS | FAIL | WARN
    note: string

  - id: risk_disclosure
    status: PASS | FAIL | WARN
    note: string

  - id: story_sizing
    status: PASS | FAIL | SPLIT
    note: string

  - id: subtask_decomposition
    status: PASS | CONDITIONAL | FAIL
    note: string

gaps:                       # MVP-blocking issues only; populated by elab-analyst
  - id: gap-1
    check: string           # which audit check triggered this (e.g., risk_disclosure)
    finding: string         # description of the gap
    severity: critical | high | medium | low
    decision: null          # filled by autonomous-decider or completion-leader
    ac_added: null          # "AC-7: description" if decision=add_ac

opportunities:              # Non-blocking improvements; populated by elab-analyst
  - id: opp-1
    category: edge_cases | ux_polish | performance | observability | integrations
    finding: string         # description of the opportunity
    effort: low | medium | high
    decision: null          # filled by autonomous-decider or completion-leader
    kb_entry_id: null       # KB ID if opportunity was logged

split_recommendation:       # Only present when story_sizing=SPLIT
  splits:
    - id: A
      scope: string
      ac_allocation: []
      dependency: none | string

preliminary_verdict: null   # Set by elab-analyst: PASS | CONDITIONAL_PASS | FAIL | SPLIT_REQUIRED
verdict: null               # Set by autonomous-decider or completion-leader
decided_at: null            # ISO 8601 timestamp when verdict was finalized

summary:
  gaps_found: number        # Total gaps identified
  gaps_resolved: number     # Gaps with decision != null
  opportunities_found: number
  opportunities_logged: number  # Opportunities with kb_entry_id != null
  acs_added: number         # New ACs added as result of gap resolution
```

---

## Field Descriptions

### Core Fields

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `schema_version` | number | Yes | elab-analyst | Always 1; used for migration support |
| `story_id` | string | Yes | elab-analyst | Story identifier |
| `timestamp` | datetime | Yes | elab-analyst | ISO 8601 analysis timestamp |

### Audit Fields

Each entry in `audit[]`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Audit check identifier (see 9-point checklist) |
| `status` | enum | Yes | `PASS`, `FAIL`, `WARN`, `SPLIT`, or `CONDITIONAL` |
| `note` | string | Yes | Explanation of the result |

### Gap Fields

Each entry in `gaps[]`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique gap identifier (e.g., `gap-1`) |
| `check` | string | Yes | Which audit check triggered this gap |
| `finding` | string | Yes | Description of the gap |
| `severity` | enum | Yes | `critical`, `high`, `medium`, `low` |
| `decision` | string \| null | No | Resolution decision (filled downstream) |
| `ac_added` | string \| null | No | New AC created if decision=add_ac |

### Opportunity Fields

Each entry in `opportunities[]`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique opportunity identifier (e.g., `opp-1`) |
| `category` | enum | Yes | `edge_cases`, `ux_polish`, `performance`, `observability`, `integrations` |
| `finding` | string | Yes | Description of the opportunity |
| `effort` | enum | Yes | `low`, `medium`, `high` |
| `decision` | string \| null | No | Resolution decision (filled downstream) |
| `kb_entry_id` | string \| null | No | KB entry ID if opportunity was logged |

### Verdict Fields

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `preliminary_verdict` | enum \| null | Yes | elab-analyst | Initial verdict before user decisions |
| `verdict` | enum \| null | Yes | elab-completion-leader | Final verdict after all decisions |
| `decided_at` | datetime \| null | Yes | elab-completion-leader | When final verdict was set |

**Verdict values**: `PASS`, `CONDITIONAL_PASS`, `FAIL`, `SPLIT_REQUIRED`

### Summary Fields

| Field | Type | Description |
|-------|------|-------------|
| `gaps_found` | number | Total gaps identified by analyst |
| `gaps_resolved` | number | Gaps where decision field is set (non-null) |
| `opportunities_found` | number | Total opportunities identified |
| `opportunities_logged` | number | Opportunities where kb_entry_id is set |
| `acs_added` | number | New ACs added via gap resolution |

---

## Lifecycle

```
elab-analyst
  → writes audit[], gaps[], opportunities[], split_recommendation (if needed)
  → sets preliminary_verdict
  → sets summary.gaps_found, summary.opportunities_found

elab-autonomous-decider (autonomous mode only)
  → fills gaps[].decision, opportunities[].decision

elab-completion-leader
  → fills gaps[].decision, opportunities[].decision (interactive mode)
  → sets verdict, decided_at
  → sets summary.gaps_resolved, summary.opportunities_logged, summary.acs_added
```

---

## Decision Source by Mode

| Mode | Decision Source |
|------|----------------|
| Interactive | User decisions from orchestrator context, written by elab-completion-leader |
| Autonomous | `gaps[].decision` and `opportunities[].decision` fields (pre-filled by elab-autonomous-decider) |

---

## Example

```yaml
schema_version: 1
story_id: WISH-001
timestamp: 2026-03-03T10:00:00Z

audit:
  - id: scope_alignment
    status: PASS
    note: "Story matches stories.index.md scope exactly"
  - id: internal_consistency
    status: PASS
    note: "Goals, ACs, and scope are aligned"
  - id: reuse_first
    status: WARN
    note: "Consider reusing existing pagination from packages/core"
  - id: ports_adapters
    status: PASS
    note: "Service layer correctly isolated from HTTP"
  - id: testability
    status: PASS
    note: ".http tests specified, Playwright tests in scope"
  - id: decision_completeness
    status: PASS
    note: "No blocking TBDs"
  - id: risk_disclosure
    status: FAIL
    note: "No timeout handling specified for upload flow"
  - id: story_sizing
    status: PASS
    note: "5 ACs, backend only — within sizing limits"
  - id: subtask_decomposition
    status: CONDITIONAL
    note: "Subtask decomposition present but ST-3 touches 4 files — should be split"

gaps:
  - id: gap-1
    check: risk_disclosure
    finding: "No timeout handling specified for upload flow — upload can hang indefinitely"
    severity: high
    decision: null
    ac_added: null

opportunities:
  - id: opp-1
    category: ux_polish
    finding: "Add progress indicator to upload UI for better user feedback"
    effort: low
    decision: null
    kb_entry_id: null

preliminary_verdict: CONDITIONAL_PASS
verdict: null
decided_at: null

summary:
  gaps_found: 1
  gaps_resolved: 0
  opportunities_found: 1
  opportunities_logged: 0
  acs_added: 0
```

---

## Integration Points

### Producers

| Agent | Action |
|-------|--------|
| `elab-analyst.agent.md` | Creates ELAB.yaml with audit, gaps, opportunities, preliminary_verdict |
| `elab-autonomous-decider.agent.md` | Fills decision fields in gaps[] and opportunities[] |
| `elab-completion-leader.agent.md` | Finalizes verdict, decided_at, summary |

### Consumers

| Agent / Artifact | Usage |
|-----------------|-------|
| `elab-completion-leader.agent.md` | Reads gaps/opportunities for decision finalization |
| `dev-documentation-leader.agent.md` | Reads summary fields for OUTCOME.yaml decisions section |
| `pm-fix-story-reference.md` | Checks preliminary_verdict for FAIL/CONDITIONAL_PASS before fix |
| OUTCOME.yaml `sources.decisions` | Points to `_implementation/ELAB.yaml` |

---

## Validation Rules

1. `schema_version` must be the first field
2. `story_id` must match the story directory name
3. `audit[]` must contain all 9 required check IDs
4. `gaps[]` entries must have `severity` set (not null)
5. `preliminary_verdict` must be set by elab-analyst before writing file
6. `verdict` and `decided_at` must both be set together (or both null)
7. `summary.gaps_found` must equal `len(gaps[])`
8. `summary.opportunities_found` must equal `len(opportunities[])`

---

## Changelog

### Version 1.0.0 (2026-03-03 — AC-1010)
- Initial golden reference schema
- Consolidates ANALYSIS.md, DECISIONS.yaml (elab-specific), FUTURE-OPPORTUNITIES.md, ELAB-STORY-XXX.md into single ELAB.yaml artifact
- Adds `schema_version` as required first field
