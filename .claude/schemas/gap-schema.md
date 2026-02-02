---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
doc_type: schema
---

# Gap Schema

Defines the structure, ranking algorithm, and deduplication rules for gaps in the flow-convergence workflow.

---

## Overview

Gaps represent identified issues, missing requirements, risks, or concerns that emerge during story creation. They flow from:
- **Fanout agents** (PM, UX, QA perspectives)
- **Attack agent** (adversarial analysis)
- **Manual input** (HiTL decisions)

Gaps are **NEVER deleted** — only ranked, categorized, and status-tracked. This enables system learning.

---

## Gap Structure

### Core Gap Record

```yaml
# Unique identifier
id: string  # Format: "GAP-{NNN}" for canonical, "{SOURCE}-{NNN}" for raw

# Ranking metadata
rank: number           # 1 = highest priority (assigned by hygiene agent)
risk_score: number     # Calculated: severity × likelihood × business_impact (1-48)
category: enum         # mvp-blocking | mvp-important | future | resolved | merged

# Source tracking
source: enum           # pm | ux | qa | attack | merged | manual
original_ids: string[] # Original IDs before merge (for traceability)

# Risk dimensions
severity: enum         # critical | high | medium | low
likelihood: enum       # high | medium | low
business_impact: enum  # core_journey_blocked | feature_degraded | ux_impacted | minor_inconvenience

# Content
description: string    # One line: what the gap is
impact: string         # One line: why it matters
recommended_action: string  # One line: how to address

# Lifecycle
status: enum           # open | resolved | merged | deferred
resolution: string?    # How it was resolved (if status=resolved)
merged_into: string?   # Canonical gap ID (if status=merged)

# History
created_at: datetime   # When first identified
updated_at: datetime   # Last status change
story_id: string       # Story where gap originated
```

### Example Gap Record

```yaml
id: GAP-007
rank: 3
risk_score: 24
category: mvp-blocking
source: merged
original_ids: ["PM-003", "UX-005", "EDGE-002"]
severity: high
likelihood: high
business_impact: feature_degraded
description: "Missing loading state for async operation"
impact: "User has no feedback during 2-3 second API call"
recommended_action: "Add AC for loading indicator with spinner component"
status: open
resolution: null
merged_into: null
created_at: "2026-02-01T10:30:00Z"
updated_at: "2026-02-01T10:30:00Z"
story_id: "WISH-0500"
```

---

## Ranking Algorithm

### Weight Definitions

```yaml
severity_weights:
  critical: 4  # Prevents core journey completion
  high: 3      # Causes data loss or security issue
  medium: 2    # Degrades experience significantly
  low: 1       # Minor inconvenience

likelihood_weights:
  high: 3      # Will occur (>50% of users/sessions)
  medium: 2    # May occur (10-50%)
  low: 1       # Rare (<10%)

business_impact_weights:
  core_journey_blocked: 4   # User cannot complete primary task
  feature_degraded: 3       # Feature works but poorly
  ux_impacted: 2            # Usability issue, workaround exists
  minor_inconvenience: 1    # Cosmetic or rare edge case
```

### Score Calculation

```
risk_score = severity_weight × likelihood_weight × business_impact_weight
```

### Score Range

| Min | Max | Formula |
|-----|-----|---------|
| 1   | 48  | 1×1×1 to 4×3×4 |

### Category Thresholds

```yaml
categorization_rules:
  mvp_blocking:
    - condition: "risk_score >= 24"
    - OR_condition: "severity = critical AND likelihood IN (high, medium)"

  mvp_important:
    - condition: "risk_score >= 12 AND risk_score < 24"
    - NOT_condition: "matches mvp_blocking"

  future:
    - condition: "risk_score < 12"
    - OR_condition: "explicitly_marked_non_mvp = true"

  resolved:
    - condition: "status = resolved"
    - note: "Preserves historical record, not actioned"

  merged:
    - condition: "status = merged"
    - note: "Points to canonical gap via merged_into field"
```

### Score Examples

| Severity | Likelihood | Business Impact | Score | Category |
|----------|------------|-----------------|-------|----------|
| critical | high | core_journey_blocked | 48 | mvp-blocking |
| critical | medium | feature_degraded | 24 | mvp-blocking |
| high | high | feature_degraded | 27 | mvp-blocking |
| high | medium | ux_impacted | 12 | mvp-important |
| medium | medium | ux_impacted | 8 | future |
| low | low | minor_inconvenience | 1 | future |

---

## Deduplication Rules

### Similarity Detection

Gaps are considered duplicates when ANY of these conditions are met:

#### 1. Semantic Overlap (Token-Based)

```yaml
rule: token_overlap
threshold: 0.8  # 80% overlap
fields_compared: [description, impact]
algorithm: jaccard_similarity
normalization:
  - lowercase
  - remove_stopwords
  - stem_tokens
```

#### 2. Same Root Cause

```yaml
rule: root_cause_match
detection:
  - Extract "cause" keywords from description
  - Compare cause keywords across gaps
  - Match if cause keywords overlap ≥ 50%
examples:
  - cause: "missing loading state"
    matches: ["no spinner", "no feedback", "loading indicator absent"]
  - cause: "undefined error handling"
    matches: ["error state missing", "no error message", "exception unhandled"]
```

#### 3. Cross-Perspective Echo

```yaml
rule: cross_perspective
conditions:
  - gaps from 2+ different sources (pm, ux, qa, attack)
  - AND reference same component/feature
  - AND describe same user impact
example:
  pm: "Missing AC for error display"
  ux: "Error state not designed"
  qa: "Error scenario untestable"
  # All refer to error handling for same feature → merge
```

#### 4. Attack Amplification

```yaml
rule: attack_amplifies_fanout
conditions:
  - attack finding references same concern as fanout gap
  - attack provides additional context (counter-evidence, edge case)
merge_strategy: keep_attack_as_canonical  # Attack has deeper analysis
```

### Merge Strategy

When duplicates are detected:

```yaml
merge_process:
  1_select_canonical:
    criteria: highest_risk_score
    tiebreaker: attack > qa > ux > pm  # Deeper analysis wins

  2_mark_non_canonical:
    status: merged
    merged_into: canonical_id

  3_combine_context:
    description: keep canonical
    impact: combine unique aspects from all
    recommended_action: keep most specific
    original_ids: aggregate all source IDs

  4_preserve_history:
    all_gaps_retained: true
    merge_record_created: true
```

### Merge Record Structure

```yaml
merge_record:
  canonical_id: string      # The surviving gap ID
  merged_ids: string[]      # IDs that were merged
  merge_reason: string      # Which rule triggered merge
  combined_context: string  # What was added from merged gaps
  merged_at: datetime
```

---

## Gap History Schema

History is append-only and lives at `{feature_dir}/_gaps/GAP-HISTORY.yaml`.

### History File Structure

```yaml
schema: 1
feature_dir: "{FEATURE_DIR}"
created_at: "{ISO_TIMESTAMP}"
updated_at: "{ISO_TIMESTAMP}"

# Aggregate statistics (updated each processing)
totals:
  gaps_processed: number
  gaps_merged: number
  gaps_by_source:
    pm: number
    ux: number
    qa: number
    attack: number
    manual: number
  gaps_by_category:
    mvp_blocking: number
    mvp_important: number
    future: number
    resolved: number

# Processing history (append-only)
history:
  - processed: "{ISO_TIMESTAMP}"
    story_id: "{STORY_ID}"
    gaps_ingested: number
    gaps_after_dedup: number
    gaps_merged: number
    gaps_by_source:
      pm: number
      ux: number
      qa: number
      attack: number
    category_distribution:
      mvp_blocking: number
      mvp_important: number
      future: number
    top_gaps:
      - id: GAP-001
        score: number
        category: string
      - id: GAP-002
        score: number
        category: string
```

### History Entry Example

```yaml
- processed: "2026-02-01T10:30:00Z"
  story_id: "WISH-0500"
  gaps_ingested: 23
  gaps_after_dedup: 15
  gaps_merged: 8
  gaps_by_source:
    pm: 7
    ux: 5
    qa: 6
    attack: 5
  category_distribution:
    mvp_blocking: 3
    mvp_important: 5
    future: 7
  top_gaps:
    - id: GAP-001
      score: 48
      category: mvp-blocking
    - id: GAP-002
      score: 36
      category: mvp-blocking
    - id: GAP-003
      score: 24
      category: mvp-blocking
```

---

## Source-Specific Gap Formats

### PM Fanout Gaps

```yaml
# From story-fanout-pm.agent.md
mvp_gaps:
  - id: PM-001
    category: scope | requirements | dependency | prioritization
    gap: string
    impact: string
    action: string

# Maps to core gap:
severity: infer from category (scope/requirements=high, dependency=medium, prioritization=low)
likelihood: high  # PM gaps are typically high likelihood
business_impact: infer from impact text
```

### UX Fanout Gaps

```yaml
# From story-fanout-ux.agent.md
mvp_gaps:
  - id: UX-001
    category: accessibility | usability | design_pattern | user_flow
    gap: string
    impact: string
    action: string

a11y_blockers:
  - requirement: string
    wcag: string
    impact: string
    fix: string

# Maps to core gap:
severity: accessibility=high, usability=medium, design_pattern=low, user_flow=medium
likelihood: medium  # UX gaps may not affect all users
business_impact: a11y_blocker=ux_impacted, flow_gap=feature_degraded
```

### QA Fanout Gaps

```yaml
# From story-fanout-qa.agent.md
mvp_gaps:
  - id: QA-001
    category: testability | edge_case | ac_clarity | verification
    gap: string
    impact: string
    action: string

untestable_acs:
  - ac: string
    problem: string
    fix: string

# Maps to core gap:
severity: testability=medium, edge_case=low/medium, ac_clarity=high, verification=medium
likelihood: high  # QA gaps affect all verification
business_impact: untestable=feature_degraded
```

### Attack Findings

```yaml
# From story-attack-agent.agent.md
assumption_challenges:
  - id: CHAL-001
    targets: ASMP-XXX
    challenge: string
    counter_evidence: string
    risk_rating: critical | high | medium | low
    likelihood: high | medium | low
    impact_if_wrong: string
    mitigation: string

edge_cases:
  - id: EDGE-001
    category: boundary | timing | data | state | resource
    scenario: string
    trigger: string
    risk_rating: critical | high | medium | low
    likelihood: high | medium | low
    current_handling: none | partial | full
    recommendation: string

# Maps directly to core gap (already has severity/likelihood)
```

---

## Integration Points

### Consumed By

| Agent | Usage |
|-------|-------|
| `story.synthesize` | Uses ranked gaps to inform story requirements |
| `readiness.score` | Uses gap counts for readiness calculation |
| `gap.analytics` | Reads GAP-HISTORY for learning metrics |
| `commitment.gate` | Checks mvp-blocking count = 0 |

### Produces

| Output | Location |
|--------|----------|
| Ranked gaps | `{output_dir}/_pm/GAPS-RANKED.yaml` |
| Merge records | `{output_dir}/_pm/GAPS-RANKED.yaml` (merged_gaps section) |
| History entry | Appended to `{feature_dir}/_gaps/GAP-HISTORY.yaml` |

---

## Evolution Notes

This schema is designed for evolution:

1. **New sources**: Add new source enum values, define mapping rules
2. **New risk dimensions**: Extend weights, update score formula
3. **New categories**: Add thresholds, update categorization rules
4. **Learning integration**: History format supports metrics extraction

When evolving, increment schema version and document migration path.
