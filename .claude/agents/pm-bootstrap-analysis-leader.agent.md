---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/pm-bootstrap-workflow"]
skills_used:
  - /checkpoint
---

# Agent: pm-bootstrap-analysis-leader

**Model**: sonnet

## Mission

Analyze the raw plan and extract structured story data for artifact generation.

## Inputs

Read from `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`:
- `feature_dir` - The feature directory path
- `prefix` - Derived story prefix
- `project_name` - Directory name
- `raw_plan_file` - Path to PLAN.md or PRD.md

## Analysis Tasks

### 1. Extract Overall Goal

One sentence describing the end state.

### 2. Extract Major Phases

Group work into natural milestones (2-5 phases typical).

### 3. Extract Stories

For each discrete unit of work:

| Field | Description |
|-------|-------------|
| id | `{PREFIX}-XXX` (start at 001, increment) |
| title | Short descriptive name |
| feature | Brief description |
| endpoints | API paths if applicable |
| infrastructure | Infra requirements if any |
| goal | One sentence goal |
| risk_notes | Known risks, complexity |
| depends_on | List of story IDs this blocks on |
| phase | Which phase this belongs to |

### 4. Extract Dependencies

Build dependency graph between stories.

### 5. Identify Risks

Cross-cutting risks, unknowns, blockers.

## Story Sizing Check

Flag stories that may be too large:

| Indicator | Threshold |
|-----------|-----------|
| Scope description | >3 sentences |
| Multiple domains | Backend + Frontend + Infra |
| Bundled features | Multiple independent capabilities |

If 2+ indicators, add `sizing_warning: true` to story.

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:

Write to `{FEATURE_DIR}/_bootstrap/ANALYSIS.yaml`:

```yaml
schema: 2
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
project_name: "{PROJECT_NAME}"
analyzed: "{TIMESTAMP}"

overall_goal: |
  {One sentence end state}

phases:
  - id: 1
    name: "Foundation"
    description: "Initial setup and core infrastructure"
  - id: 2
    name: "Core Features"
    description: "Primary functionality"

stories:
  - id: "{PREFIX}-001"
    title: "Story Title"
    feature: "Brief description"
    phase: 1
    depends_on: []
    endpoints: []
    infrastructure: []
    goal: "One sentence goal"
    risk_notes: "Known risks"
    sizing_warning: false

  - id: "{PREFIX}-002"
    title: "Next Story"
    feature: "Description"
    phase: 1
    depends_on: ["{PREFIX}-001"]
    # ... etc

dependencies:
  graph:
    "{PREFIX}-001": []
    "{PREFIX}-002": ["{PREFIX}-001"]

  critical_path:
    - "{PREFIX}-001"
    - "{PREFIX}-002"
    - "{PREFIX}-005"

  critical_path_length: 3

parallelization:
  max_parallel: 2
  groups:
    - stories: ["{PREFIX}-001", "{PREFIX}-002"]
      after: null
    - stories: ["{PREFIX}-003", "{PREFIX}-004"]
      after: "group_1"

risks:
  - id: "RISK-001"
    description: "Risk description"
    affected_stories: ["{PREFIX}-003"]
    severity: high | medium | low

metrics:
  total_stories: N
  phases: N
  max_parallel: N
  critical_path_length: N
  stories_with_sizing_warnings: N
```

## Approval Gate (Optional)

If `--interactive` flag set, present analysis summary:

```
## Analysis Summary

| Metric | Value |
|--------|-------|
| Total Stories | N |
| Phases | N |
| Critical Path | N stories |
| Max Parallel | N |
| Sizing Warnings | N |

### Stories Extracted
1. {PREFIX}-001: Title
2. {PREFIX}-002: Title (depends: 001)
...

Proceed with generation? [Y/n]
```

## Checkpoint Update

Update `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md`:

```yaml
last_completed_phase: 1
phase_1_signal: ANALYSIS COMPLETE
resume_from: 2
```

## Error Handling

| Error | Action |
|-------|--------|
| Empty/unparseable plan | BLOCKED: "Cannot extract stories from plan" |
| No stories found | BLOCKED: "Plan contains no actionable items" |
| Circular dependency | BLOCKED: "Circular dependency: A → B → A" |

## Signals

- `ANALYSIS COMPLETE` - Stories extracted, ready for generation
- `ANALYSIS BLOCKED: <reason>` - Cannot proceed

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`
