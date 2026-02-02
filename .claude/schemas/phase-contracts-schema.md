---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
doc_type: schema
---

# Phase Contracts Schema

Defines the structure, expectations, and validation rules for phase contracts in the flow-convergence workflow.

---

## Overview

Phase contracts establish explicit expectations for each workflow phase, enabling proper interpretation of churn metrics and enforcement of commitment boundaries. They define:

- **Expected churn levels** - what is normal for each phase
- **Cost implications** - how expensive changes are at each phase
- **Ownership** - who is responsible for activity in each phase
- **Healthy vs unhealthy patterns** - how to distinguish learning from waste

Contracts are enforced at phase transitions, not during phase execution.

---

## Phase Contract Structure

### Core Contract Record

```yaml
# Phase identification
phase_id: string          # Format: "phase-{N}" (e.g., "phase-1")
phase_name: string        # Human-readable name (e.g., "Discovery / Story Creation")
phase_number: number      # 1-4 for ordering

# Expectations
churn_expected: enum      # HIGH | MEDIUM | LOW | VERY_LOW
churn_cost: enum          # LOW | MEDIUM | HIGH | VERY_HIGH
owner: string[]           # Primary owners (e.g., ["PM", "Architect", "System"])

# Purpose and boundaries
purpose: string           # One-line description of phase intent
entry_conditions: array   # What must be true to enter this phase
exit_conditions: array    # What must be true to exit this phase

# Patterns
healthy_patterns: array   # Expected and encouraged activities
unhealthy_patterns: array # Warning signs indicating problems
anti_goals: array         # Explicitly discouraged behaviors

# Metrics configuration
metrics_apply: boolean    # Whether negative metrics are tracked
metric_exceptions: array  # Specific metrics that do not apply
```

### Example Contract Record

```yaml
phase_id: phase-2
phase_name: "Elaboration / Readiness"
phase_number: 2

churn_expected: MEDIUM
churn_cost: MEDIUM
owner: ["System", "HiTL"]

purpose: "Collapse ambiguity and prepare for commitment"

entry_conditions:
  - "Story seed exists with initial ACs"
  - "Gap analysis from Phase 1 complete"
  - "Story in 'elaboration' status"

exit_conditions:
  - "Readiness score >= 85"
  - "Blockers = 0"
  - "Known unknowns <= 5"
  - "All mvp_blocking gaps resolved"

healthy_patterns:
  - "AC refinement for testability"
  - "Testability clarification"
  - "UX/a11y tightening"
  - "Architectural sanity checks"
  - "Non-goal definition"

unhealthy_patterns:
  - "Scope expansion without acknowledgement"
  - "Endless refinement loops (>3 iterations same section)"
  - "New major features introduced"
  - "Readiness score declining over iterations"

anti_goals:
  - "Premature commitment (score < 85)"
  - "Hidden scope expansion"
  - "Perfection seeking"

metrics_apply: true
metric_exceptions:
  - "turn_count"  # Pre-commitment turns don't count
```

---

## Phase Definitions

### Phase 1: Discovery / Story Creation

```yaml
phase_id: phase-1
phase_name: "Discovery / Story Creation"
phase_number: 1

churn_expected: HIGH
churn_cost: LOW
owner: ["PM", "Architect", "System"]

purpose: "Explore uncertainty, surface gaps, shape scope"

entry_conditions:
  - "Feature or epic defined"
  - "Reality baseline available"
  - "Story creation initiated"

exit_conditions:
  - "Story seed complete"
  - "Initial gap analysis performed"
  - "Attack findings documented"
  - "Story moved to elaboration"

healthy_patterns:
  - "Gap analysis with refinement cycles"
  - "PM to UX iteration"
  - "Architectural questioning"
  - "Scope reshaping and clarification"
  - "Assumption surfacing"
  - "Edge case discovery"
  - "Non-goal identification"

unhealthy_patterns:
  - "Silent assumptions (gaps not surfaced)"
  - "Early commitment pressure"
  - "Skipping gap analysis"
  - "Ignoring attack findings"
  - "Scope lock without stakeholder alignment"

anti_goals:
  - "Silent assumptions"
  - "Early commitment"
  - "Skipping validation steps"

metrics_apply: false
metric_exceptions:
  - "All negative metrics excluded"
  - "Only gap yield tracked for learning"
```

### Phase 2: Elaboration / Readiness

```yaml
phase_id: phase-2
phase_name: "Elaboration / Readiness"
phase_number: 2

churn_expected: MEDIUM
churn_cost: MEDIUM
owner: ["System", "HiTL"]

purpose: "Collapse ambiguity and prepare for commitment"

entry_conditions:
  - "Story seed exists with initial ACs"
  - "Gap analysis from Phase 1 complete"
  - "Story in 'elaboration' status"

exit_conditions:
  - "Readiness score >= 85"
  - "Blockers = 0"
  - "Known unknowns <= 5"
  - "All mvp_blocking gaps resolved"

healthy_patterns:
  - "AC refinement for measurability"
  - "Testability clarification"
  - "UX/a11y tightening"
  - "Architectural sanity checks"
  - "Non-goal refinement"
  - "Test hint elaboration"
  - "Readiness score convergence"

unhealthy_patterns:
  - "Scope expansion without acknowledgement"
  - "Endless refinement loops (>3 iterations same section)"
  - "New major features introduced"
  - "Readiness score declining"
  - "Blockers added without resolution path"

anti_goals:
  - "Scope expansion without acknowledgement"
  - "Endless refinement loops"
  - "Perfection seeking over sufficiency"

metrics_apply: true
metric_exceptions:
  - "turn_count"  # Pre-commitment turns excluded

primary_signal: "Convergence toward readiness >= 85"
```

### Phase 3: Development (Commitment Boundary)

```yaml
phase_id: phase-3
phase_name: "Development"
phase_number: 3
commitment_boundary: true  # This is the commitment point

churn_expected: LOW
churn_cost: HIGH
owner: ["Developer"]

purpose: "Execute on agreed understanding"

entry_conditions:
  - "Readiness score >= 85"
  - "Blockers = 0"
  - "Known unknowns <= 5"
  - "Commitment gate passed"
  - "Story in 'ready-to-work' or 'in-progress' status"

exit_conditions:
  - "All ACs implemented"
  - "Tests passing"
  - "Code review approved"
  - "Ready for QA verification"

healthy_patterns:
  - "Refactoring for code quality"
  - "Performance tuning"
  - "Test improvement"
  - "Code review feedback incorporation"
  - "Technical debt reduction"

unhealthy_patterns:
  - "Clarification questions to PM/UX/QA"
  - "Scope changes requested"
  - "Requirement reinterpretation"
  - "New unknowns discovered"
  - "Blockers surfacing"

anti_goals:
  - "Requirement clarification"
  - "Scope negotiation"
  - "Design changes"

metrics_apply: true
metric_exceptions: []

negative_signals:
  - "clarification_events"
  - "scope_change_events"
  - "stakeholder_turns"
  - "unknown_leakage"
```

### Phase 4: Post-Dev / QA

```yaml
phase_id: phase-4
phase_name: "Post-Dev / QA"
phase_number: 4

churn_expected: VERY_LOW
churn_cost: VERY_HIGH
owner: ["System", "QA"]

purpose: "Validate, not rediscover intent"

entry_conditions:
  - "Development complete"
  - "All tests passing"
  - "Code review approved"
  - "Story in 'ready-for-qa' status"

exit_conditions:
  - "All verification criteria met"
  - "QA sign-off"
  - "Story moved to 'complete'"

healthy_patterns:
  - "Verification of ACs"
  - "Edge case validation"
  - "Performance verification"
  - "Accessibility validation"
  - "Bug fixes for AC violations"

unhealthy_patterns:
  - "Scope or requirement churn"
  - "New feature requests"
  - "Requirement reinterpretation"
  - "Missing AC discovery"
  - "Fundamental design issues"

anti_goals:
  - "Scope changes"
  - "Requirement changes"
  - "Design rework"

metrics_apply: true
metric_exceptions: []

system_failure_signals:
  - "Any scope churn = upstream system failure"
  - "Any requirement churn = upstream system failure"
  - "Any new unknowns = upstream system failure"
```

---

## Commitment Boundary Definition

The commitment boundary marks the transition from exploration to execution.

### Gate Requirements

```yaml
commitment_gate:
  trigger: "Transition from Phase 2 to Phase 3"

  hard_requirements:
    - name: "readiness_score"
      condition: "score >= 85"
      type: "quantitative"

    - name: "no_blockers"
      condition: "mvp_blocking_count = 0"
      type: "boolean"

    - name: "bounded_unknowns"
      condition: "known_unknowns <= 5"
      type: "quantitative"

  soft_requirements:
    - name: "context_strength"
      condition: "baseline_aligned = true"
      type: "boolean"
      waivable: true

    - name: "stakeholder_alignment"
      condition: "all_gaps_reviewed = true"
      type: "boolean"
      waivable: true

  override:
    requires: "Explicit HiTL approval with documented rationale"
    logged: true
    escalation_required: true
```

### Pre-Commitment vs Post-Commitment

```yaml
pre_commitment:
  phases: [1, 2]
  characteristics:
    - "Churn is learning"
    - "Iterations are encouraged"
    - "Exploration is valuable"
    - "No negative metrics"

post_commitment:
  phases: [3, 4]
  characteristics:
    - "Churn is risk"
    - "Iterations are expensive"
    - "Execution is expected"
    - "Negative metrics apply"
```

---

## Churn Pattern Classification

### Healthy Churn Indicators

```yaml
healthy_churn:
  phase_1:
    - "Gap count increasing then stabilizing"
    - "Scope questions being resolved"
    - "Assumptions being validated"
    - "Non-goals being identified"
    - "Fanout analysis yielding findings"

  phase_2:
    - "Readiness score increasing"
    - "AC specificity improving"
    - "Test hints being added"
    - "Blocker count decreasing"
    - "Unknown count stabilizing"

  phase_3:
    - "Code quality improvements"
    - "Test coverage increasing"
    - "Performance optimizations"
    - "Code review feedback"

  phase_4:
    - "Verification passing"
    - "Minor bug fixes"
    - "Documentation updates"
```

### Unhealthy Churn Indicators

```yaml
unhealthy_churn:
  phase_1:
    signal: "Premature lock"
    indicators:
      - "Skipping gap analysis"
      - "Ignoring attack findings"
      - "Rushing to elaboration"
      - "Silent assumptions"

  phase_2:
    signal: "Endless elaboration"
    indicators:
      - "Readiness score not improving over 3+ iterations"
      - "Same sections being refined repeatedly"
      - "Scope expanding without acknowledgement"
      - "New blockers appearing faster than resolved"

  phase_3:
    signal: "Upstream failure"
    indicators:
      - "Clarification questions to PM/UX"
      - "Scope change requests"
      - "Requirement reinterpretation"
      - "New unknowns discovered"
      - "Blockers surfacing"

  phase_4:
    signal: "System failure"
    indicators:
      - "Any scope or requirement churn"
      - "Missing AC discovery"
      - "Fundamental design issues"
      - "Intent reinterpretation"
```

---

## Phase Transition Validation

### Transition Rules

```yaml
transitions:
  phase_1_to_2:
    name: "Story Seed to Elaboration"
    validation:
      - "Story seed complete"
      - "Gap analysis performed"
      - "Attack findings documented"
    on_failure: "Block transition, surface gaps"

  phase_2_to_3:
    name: "Elaboration to Development (Commitment)"
    validation:
      - "Readiness score >= 85"
      - "Blockers = 0"
      - "Known unknowns <= 5"
      - "Commitment gate passed"
    on_failure: "Block transition, return to elaboration"
    enforcement: "strict"

  phase_3_to_4:
    name: "Development to QA"
    validation:
      - "All ACs implemented"
      - "Tests passing"
      - "Code review approved"
    on_failure: "Block transition, continue development"

  phase_4_to_complete:
    name: "QA to Complete"
    validation:
      - "All verification criteria met"
      - "QA sign-off"
    on_failure: "Return to phase 3 or 4 based on issue type"
```

---

## Contract Violation Handling

### Violation Classification

```yaml
violation_severity:
  critical:
    description: "Commitment bypassed without gate"
    response: "Stop, escalate, remediate"
    examples:
      - "Development started with readiness < 85"
      - "Blockers present at commitment"
      - "Gate explicitly bypassed without approval"

  high:
    description: "Significant churn in wrong phase"
    response: "Flag, investigate root cause"
    examples:
      - "Scope changes in Phase 3"
      - "Multiple clarification requests in Phase 3"
      - "New blockers in Phase 4"

  medium:
    description: "Unhealthy patterns detected"
    response: "Log, surface in retrospective"
    examples:
      - "Endless elaboration loops"
      - "Readiness declining over iterations"
      - "Scope expansion without acknowledgement"

  low:
    description: "Minor pattern deviation"
    response: "Log for learning"
    examples:
      - "Single clarification in Phase 3"
      - "Minor scope adjustment"
```

### Violation Response Protocol

```yaml
response_protocol:
  critical:
    immediate:
      - "Stop current activity"
      - "Alert relevant stakeholders"
      - "Document violation"
    remediation:
      - "Return to appropriate phase"
      - "Re-validate gate requirements"
      - "Update baseline if needed"
    follow_up:
      - "Root cause analysis"
      - "Process improvement"

  high:
    immediate:
      - "Flag in current work"
      - "Log violation event"
    remediation:
      - "Surface in PCAR metrics"
      - "Track root cause"
    follow_up:
      - "Include in retrospective"

  medium:
    immediate:
      - "Log for analysis"
    follow_up:
      - "Pattern analysis"
      - "Process tuning"

  low:
    immediate:
      - "Log event"
    follow_up:
      - "Batch analysis"
```

---

## Contract History Schema

History is stored at `{feature_dir}/_contracts/CONTRACT-HISTORY.yaml`.

### History File Structure

```yaml
schema: 1
feature_dir: "{FEATURE_DIR}"
created_at: "{ISO_TIMESTAMP}"
updated_at: "{ISO_TIMESTAMP}"

# Aggregate statistics
totals:
  stories_tracked: number
  phase_transitions: number
  violations:
    critical: number
    high: number
    medium: number
    low: number
  average_phase_duration:
    phase_1: duration
    phase_2: duration
    phase_3: duration
    phase_4: duration

# Story-level tracking
stories:
  STORY-001:
    current_phase: number
    phase_history:
      - phase: 1
        entered: "{ISO_TIMESTAMP}"
        exited: "{ISO_TIMESTAMP}"
        duration: "{DURATION}"
        churn_events: number
        violations: []

      - phase: 2
        entered: "{ISO_TIMESTAMP}"
        exited: "{ISO_TIMESTAMP}"
        duration: "{DURATION}"
        churn_events: number
        readiness_progression: [52, 68, 79, 87]
        violations:
          - type: "medium"
            description: "Scope expansion detected"
            timestamp: "{ISO_TIMESTAMP}"
```

---

## Integration Points

### Consumed By

| Agent | Usage |
|-------|-------|
| `elab-phase-contract-agent` | Validates activities against contracts |
| `commitment.gate` | Enforces Phase 2 to 3 transition |
| `readiness-score-agent` | Uses phase context for scoring |
| `metrics.collect` | Applies phase-appropriate metrics |

### Produces

| Output | Location |
|--------|----------|
| Contract validation | Agent output |
| Violation records | `{feature_dir}/_contracts/CONTRACT-HISTORY.yaml` |
| Phase metrics | Metrics collection |

---

## Evolution Notes

This schema is designed for evolution:

1. **New phases**: Add phase definitions, update transitions
2. **Threshold tuning**: Adjust based on delivery outcomes
3. **Pattern updates**: Add new healthy/unhealthy patterns as discovered
4. **Violation handling**: Refine response protocols based on experience

When evolving, increment schema version and document migration path.
