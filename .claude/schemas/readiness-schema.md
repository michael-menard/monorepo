---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
doc_type: schema
---

# Readiness Schema

Defines the structure, scoring algorithm, and threshold meanings for readiness scoring in the flow-convergence workflow.

---

## Overview

Readiness scoring provides a quantitative signal (0-100) for commitment decisions. It aggregates multiple factors into a single score that indicates whether a story is ready for development commitment.

The system uses a **deduction-based model** starting from a perfect score of 100, with bonuses available for strong context and alignment.

---

## Readiness Score Structure

### Core Readiness Record

```yaml
# Unique identifier and timestamp
story_id: string         # Story being scored (e.g., "WISH-0500")
scored: datetime         # When score was calculated

# Score result
score: number            # 0-100, target >= 85
readiness: enum          # READY | CONCERNS | NOT_READY | BLOCKED
threshold_target: 85     # Fixed target for commitment

# Breakdown structure
breakdown:
  base: 100              # Starting score
  deductions: object     # All deductions applied
  bonuses: object        # All bonuses applied
  caps_applied: array    # Any caps that limited score
  final_calculation: string  # Human-readable calculation

# Summary counts
summary:
  mvp_blocking_gaps: number
  mvp_important_gaps: number
  unknowns: number
  missing_acs: number
  vague_acs: number
  unvalidated_assumptions: number

# Gate check result
gate_check:
  score_passes: boolean       # score >= 85
  no_blockers: boolean        # mvp_blocking = 0
  unknowns_acceptable: boolean # unknowns <= 5
  ready_for_commitment: boolean # all three pass

# Improvement recommendations
recommendations:
  gap_resolutions: array
  quality_improvements: array
  quick_wins: array
```

### Example Readiness Record

```yaml
story_id: "WISH-0500"
scored: "2026-02-01T10:30:00Z"

score: 72
readiness: CONCERNS
threshold_target: 85

breakdown:
  base: 100

  deductions:
    gaps:
      mvp_blocking:
        count: 0
        deduction: 0
        items: []
      mvp_important:
        count: 4
        deduction: -20
        items: [GAP-003, GAP-004, GAP-007, GAP-008]

    unknowns:
      count: 3
      deduction: -9
      items: ["data format undefined", "API rate limits unknown", "auth flow TBD"]

    story_quality:
      missing_acs:
        count: 1
        deduction: -5
        items: ["error handling for timeout"]
      vague_acs:
        count: 2
        deduction: -4
        items: ["AC-3: user sees feedback", "AC-5: data loads quickly"]
      no_test_plan: false
      no_test_plan_deduction: 0
      no_non_goals: false
      no_non_goals_deduction: 0

    assumptions:
      unvalidated_critical:
        count: 1
        deduction: -5
        items: ["ASMP-002"]

    total_deductions: -43

  bonuses:
    context_strength:
      baseline_present: true
      baseline_bonus: 5
      dependencies_mapped: true
      dependencies_bonus: 3

    baseline_alignment:
      aligned: true
      alignment_bonus: 5
      no_conflicts: true
      no_conflicts_bonus: 2

    total_bonuses: 15

  caps_applied:
    - cap: "mvp_blocking > 0 → max 50"
      applied: false
    - cap: "mvp_important > 3 → max 70"
      applied: true

  final_calculation: "100 - 43 + 15 = 72, capped at 70 → 72 (cap not needed)"

summary:
  mvp_blocking_gaps: 0
  mvp_important_gaps: 4
  unknowns: 3
  missing_acs: 1
  vague_acs: 2
  unvalidated_assumptions: 1

gate_check:
  score_passes: false    # 72 < 85
  no_blockers: true      # mvp_blocking = 0
  unknowns_acceptable: true  # 3 <= 5
  ready_for_commitment: false  # score fails

recommendations:
  gap_resolutions:
    - gap_id: GAP-003
      action: "Add AC for loading state"
      gain: 5
      priority: 1
    - gap_id: GAP-004
      action: "Clarify error handling scope"
      gain: 5
      priority: 2
  quality_improvements:
    - issue: "Vague AC-3"
      action: "Specify feedback type and timing"
      gain: 2
    - issue: "Missing timeout AC"
      action: "Add AC for timeout handling"
      gain: 5
  quick_wins:
    - action: "Validate ASMP-002 assumption"
      gain: 5
```

---

## Scoring Algorithm

### Deduction Rules

| Category | Item | Deduction | Cap | Rationale |
|----------|------|-----------|-----|-----------|
| `mvp_blocking` gap | Per gap | -20 | Uncapped | Critical blockers are severe |
| `mvp_important` gap | Per gap | -5 | -25 | Important but not critical |
| Known unknown | Per unknown | -3 | -15 | Uncertainty adds risk |
| Missing AC | Per missing | -5 | -15 | Incomplete requirements |
| Vague AC | Per vague | -2 | -10 | Unclear requirements |
| No test plan | Presence | -10 | -10 | Verification risk |
| No non-goals | Presence | -5 | -5 | Scope creep risk |
| Unvalidated critical assumption | Per assumption | -5 | -15 | Risk of wrong direction |

### Deduction Formula

```
deduction_total =
  (mvp_blocking_count × -20) +                     # Uncapped
  min(mvp_important_count × -5, -25) +              # Capped at -25
  min(unknown_count × -3, -15) +                    # Capped at -15
  min(missing_ac_count × -5, -15) +                 # Capped at -15
  min(vague_ac_count × -2, -10) +                   # Capped at -10
  (no_test_plan ? -10 : 0) +                        # Binary
  (no_non_goals ? -5 : 0) +                         # Binary
  min(unvalidated_assumption_count × -5, -15)       # Capped at -15
```

### Bonus Rules

| Category | Condition | Bonus | Rationale |
|----------|-----------|-------|-----------|
| Baseline present | Reality baseline exists | +5 | Strong foundation |
| Dependencies mapped | All deps identified | +3 | Reduced surprise risk |
| Baseline aligned | Story aligns with reality | +5 | Consistent direction |
| No conflicts | No baseline conflicts | +2 | Clean integration path |

### Bonus Formula

```
bonus_total =
  (baseline_present ? +5 : 0) +
  (dependencies_mapped ? +3 : 0) +
  (baseline_aligned ? +5 : 0) +
  (no_conflicts ? +2 : 0)
```

### Cap Rules

```yaml
caps:
  - condition: "mvp_blocking_count > 0"
    max_score: 50
    reason: "Critical blockers prevent commitment"

  - condition: "mvp_important_count > 3"
    max_score: 70
    reason: "Too many important gaps indicate insufficient clarity"
```

### Final Score Formula

```
raw_score = 100 + deduction_total + bonus_total
capped_score = apply_caps(raw_score, mvp_blocking_count, mvp_important_count)
final_score = clamp(capped_score, 0, 100)
```

---

## Threshold Meanings

### Readiness Levels

```yaml
readiness_levels:
  READY:
    range: [85, 100]
    meaning: "Story is ready for commitment to development"
    action: "Proceed to development phase"
    gate_requirements:
      - "mvp_blocking = 0"
      - "unknowns <= 5"

  CONCERNS:
    range: [70, 84]
    meaning: "Story has important gaps that should be addressed"
    action: "Address mvp_important gaps before commitment"
    typical_causes:
      - "Multiple mvp_important gaps"
      - "Several unknowns"
      - "Missing or vague ACs"

  NOT_READY:
    range: [50, 69]
    meaning: "Story requires significant work before commitment"
    action: "Iterate on story definition and gap resolution"
    typical_causes:
      - "Many mvp_important gaps (>3 triggers cap)"
      - "Multiple structural issues"
      - "Weak baseline alignment"

  BLOCKED:
    range: [0, 49]
    meaning: "Story has critical blockers preventing commitment"
    action: "Resolve blocking gaps before proceeding"
    typical_causes:
      - "One or more mvp_blocking gaps"
      - "Severe accumulation of issues"
```

### Gate Check Requirements

```yaml
commitment_gate:
  requirements:
    - name: "score_passes"
      condition: "score >= 85"
      failure_message: "Score below commitment threshold"

    - name: "no_blockers"
      condition: "mvp_blocking_count = 0"
      failure_message: "Critical blocking gaps must be resolved"

    - name: "unknowns_acceptable"
      condition: "unknown_count <= 5"
      failure_message: "Too many known unknowns (max 5)"

  result:
    ready_for_commitment: "all requirements pass"
```

---

## Deduction Item Definitions

### Gap Classification

Gaps are classified by the gap-hygiene-agent:

```yaml
gap_categories:
  mvp_blocking:
    criteria: "risk_score >= 24 OR (severity=critical AND likelihood>=medium)"
    impact_on_score: -20 per gap
    cap_trigger: "any count > 0 caps score at 50"

  mvp_important:
    criteria: "risk_score >= 12 AND < 24"
    impact_on_score: -5 per gap, max -25
    cap_trigger: "count > 3 caps score at 70"
```

### Unknown Classification

Unknowns are surfaced by the attack agent:

```yaml
unknown_sources:
  - attack_challenges:
      field: "challenge"
      condition: "risk_rating IN (critical, high) AND mitigation = 'unknown'"

  - unresolved_questions:
      field: "scope_questions"
      condition: "default_if_unasked NOT specified"

  - missing_data:
      field: "data_assumptions"
      condition: "stated_or_implicit = 'implicit' AND unvalidated"
```

### AC Quality Assessment

```yaml
missing_ac_signals:
  - "Gap recommendation includes 'Add AC for...'"
  - "Core journey step has no corresponding AC"
  - "Attack edge case has no handling AC"

vague_ac_signals:
  - weasel_words: ["should", "might", "could", "may", "possibly"]
  - unmeasurable: ["performs well", "is user-friendly", "works correctly"]
  - missing_outcome: "action without expected result"
  - ambiguous_scope: ["all relevant", "appropriate", "suitable", "necessary"]
  - missing_actor: "passive voice without subject"
```

### Structural Checks

```yaml
test_plan_check:
  present_if:
    - "Test Plan section exists in story"
    - "Test scenarios defined"
    - "Coverage expectations stated"
  missing_signals:
    - "No Test Plan section"
    - "Test Plan section is empty or TBD"

non_goals_check:
  present_if:
    - "Non-Goals section exists"
    - "At least one explicit non-goal defined"
  missing_signals:
    - "No Non-Goals section"
    - "Non-Goals section is empty"
```

---

## Readiness History Schema

History is stored for trend analysis at `{feature_dir}/_readiness/READINESS-HISTORY.yaml`.

### History File Structure

```yaml
schema: 1
feature_dir: "{FEATURE_DIR}"
created_at: "{ISO_TIMESTAMP}"
updated_at: "{ISO_TIMESTAMP}"

# Aggregate statistics
totals:
  stories_scored: number
  average_initial_score: number
  average_final_score: number
  commitment_rate: number    # % that reached READY

# Score history per story
stories:
  WISH-0500:
    - scored: "{ISO_TIMESTAMP}"
      phase: "creation"
      score: 52
      readiness: NOT_READY
      mvp_blocking: 1
      mvp_important: 3
      unknowns: 5

    - scored: "{ISO_TIMESTAMP}"
      phase: "elaboration-1"
      score: 71
      readiness: CONCERNS
      mvp_blocking: 0
      mvp_important: 4
      unknowns: 3

    - scored: "{ISO_TIMESTAMP}"
      phase: "elaboration-2"
      score: 88
      readiness: READY
      mvp_blocking: 0
      mvp_important: 2
      unknowns: 2
      committed: true
```

---

## Integration Points

### Consumed By

| Agent | Usage |
|-------|-------|
| `story.synthesize` | Includes readiness score in final artifact |
| `commitment.gate` | Enforces gate requirements |
| `metrics.collect` | Captures score for analytics |

### Consumes

| Input | From |
|-------|------|
| Ranked gaps | `gap-hygiene-agent` output |
| Attack findings | `story-attack-agent` output |
| Story seed | `story-seed-agent` output |
| Baseline reality | `reality-intake` output |

---

## Score Improvement Guidance

### High-Impact Actions (by point gain)

| Action | Potential Gain | Typical Effort |
|--------|----------------|----------------|
| Resolve mvp_blocking gap | +20 per gap | High |
| Add missing test plan | +10 | Medium |
| Resolve mvp_important gap | +5 per gap | Medium |
| Clarify missing AC | +5 per AC | Low |
| Validate critical assumption | +5 per assumption | Medium |
| Establish baseline alignment | +5 | Low |
| Resolve unknown | +3 per unknown | Variable |
| Map dependencies | +3 | Low |
| Clarify vague AC | +2 per AC | Low |
| Eliminate conflicts | +2 | Low |

### Quick Wins (high gain, low effort)

1. Add explicit non-goals section (+5)
2. Map remaining dependencies (+3)
3. Clarify vague ACs (+2 each)
4. Document test approach (+10)

### Recommendations Priority

Order recommendations by:
1. Blockers first (resolve mvp_blocking)
2. Highest point gain per effort
3. Cap-breakers (e.g., 4th mvp_important gap triggers cap)

---

## Evolution Notes

This schema is designed for evolution:

1. **New deduction categories**: Add to algorithm, define cap behavior
2. **Threshold tuning**: Adjust based on delivery outcome data
3. **Bonus categories**: Add for new quality signals
4. **Learning integration**: History enables threshold calibration

When evolving, increment schema version and document migration path.
