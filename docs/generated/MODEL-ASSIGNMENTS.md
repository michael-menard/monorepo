# Model Assignments

> **Auto-generated from YAML config**
> Source: `.claude/config/model-assignments.yaml`

## Agent → Model Matrix

| Agent | Model |
|-------|-------|
| `pm-story-generation-leader` | sonnet |
| `pm-story-seed-agent` | sonnet |
| `pm-story-fix-leader` | sonnet |
| `pm-story-adhoc-leader` | sonnet |
| `pm-story-bug-leader` | sonnet |
| `pm-story-followup-leader` | sonnet |
| `pm-story-split-leader` | sonnet |
| `pm-triage-leader` | sonnet |
| `pm-bootstrap-analysis-leader` | sonnet |
| `elab-analyst` | sonnet |
| `elab-epic-interactive-leader` | sonnet |
| `dev-implement-planning-leader` | sonnet |
| `dev-implement-implementation-leader` | sonnet |
| `qa-verify-verification-leader` | sonnet |
| `commitment-gate` | sonnet |
| `dev-fix-fix-leader` | sonnet |
| `architect-aggregation-leader` | sonnet |
| `architect-api-leader` | sonnet |
| `architect-frontend-leader` | sonnet |
| `architect-packages-leader` | sonnet |
| `architect-story-review` | sonnet |
| `architect-types-leader` | sonnet |
| `audit-aggregate-leader` | sonnet |
| `audit-debt-map-leader` | sonnet |
| `audit-devils-advocate` | sonnet |
| `audit-moderator` | sonnet |
| `audit-promote-leader` | sonnet |
| `audit-trends-leader` | sonnet |
| `dev-execute-leader` | sonnet |
| `dev-plan-leader` | sonnet |
| `dev-verification-leader` | sonnet |
| `review-aggregate-leader` | sonnet |
| `scrum-master-loop-leader` | sonnet |
| `session-manager` | sonnet |
| `uat-orchestrator` | sonnet |
| `workflow-retro` | sonnet |
| `confidence-calibrator` | sonnet |
| `risk-predictor` | sonnet |
| `scope-defender` | sonnet |
| `elab-autonomous-decider` | sonnet |
| `elab-delta-review-agent` | sonnet |
| `elab-epic-reviews-leader` | sonnet |
| `elab-escape-hatch-agent` | sonnet |
| `elab-phase-contract-agent` | sonnet |
| `evidence-judge` | sonnet |
| `experiment-analyzer` | sonnet |
| `heuristic-evolver` | sonnet |
| `improvement-proposer` | sonnet |
| `gap-analytics-agent` | sonnet |
| `ui-ux-review-report-leader` | sonnet |
| `ui-ux-review-reviewer` | sonnet |

## By Model

### Haiku (Fast, Simple Tasks)
_No assignments_

### Sonnet (Analysis, Code Generation)
- `pm-story-generation-leader`
- `pm-story-seed-agent`
- `pm-story-fix-leader`
- `pm-story-adhoc-leader`
- `pm-story-bug-leader`
- `pm-story-followup-leader`
- `pm-story-split-leader`
- `pm-triage-leader`
- `pm-bootstrap-analysis-leader`
- `elab-analyst`
- `elab-epic-interactive-leader`
- `dev-implement-planning-leader`
- `dev-implement-implementation-leader`
- `qa-verify-verification-leader`
- `commitment-gate`
- `dev-fix-fix-leader`
- `architect-aggregation-leader`
- `architect-api-leader`
- `architect-frontend-leader`
- `architect-packages-leader`
- `architect-story-review`
- `architect-types-leader`
- `audit-aggregate-leader`
- `audit-debt-map-leader`
- `audit-devils-advocate`
- `audit-moderator`
- `audit-promote-leader`
- `audit-trends-leader`
- `dev-execute-leader`
- `dev-plan-leader`
- `dev-verification-leader`
- `review-aggregate-leader`
- `scrum-master-loop-leader`
- `session-manager`
- `uat-orchestrator`
- `workflow-retro`
- `confidence-calibrator`
- `risk-predictor`
- `scope-defender`
- `elab-autonomous-decider`
- `elab-delta-review-agent`
- `elab-epic-reviews-leader`
- `elab-escape-hatch-agent`
- `elab-phase-contract-agent`
- `evidence-judge`
- `experiment-analyzer`
- `heuristic-evolver`
- `improvement-proposer`
- `gap-analytics-agent`
- `ui-ux-review-report-leader`
- `ui-ux-review-reviewer`

### Opus (Complex Judgment)
_No assignments_

## Model Selection Criteria

| Complexity | Model | Use Case |
|------------|-------|----------|
| Simple validation | haiku | Setup leaders, completion leaders, simple checks |
| Analysis/reasoning | sonnet | Workers that analyze code, make decisions |
| Complex judgment | opus | Reserved for critical decisions (rarely needed) |
