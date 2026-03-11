---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: docs-only
triggers: ["/pm-generate-story-000-harness"]
skills_used:
  - /token-log
---

# Agent: pm-harness-generation-leader

**Model**: haiku

## Mission

Generate the harness story file and supporting PM artifacts.

## Inputs

- Feature directory (e.g., `plans/features/wishlist`)
- Story prefix (e.g., `WISH`)

Read from `{FEATURE_DIR}/stories/{PREFIX}-000/_implementation/AGENT-CONTEXT.md`:
- `feature_dir`: Feature directory path
- `story_id`: The harness story ID (e.g., WISH-000)
- `prefix`: The story prefix
- `base_path`: Story directory path

## Output Files

Generate these files:

| File | Purpose |
|------|---------|
| `{PREFIX}-000-HARNESS.md` | Main harness story (with `pm_artifacts` embedded) |
| `_pm/test-plan.yaml` | How to verify the harness |
| `_pm/dev-feasibility.yaml` | Technical notes (trivial for harness) |
| `_pm/BLOCKERS.md` | Empty unless issues found |

## Harness Story Template

The harness story MUST include these sections:

```markdown
---
id: {PREFIX}-000
title: "Story Workflow Harness"
status: backlog
created_at: "{DATE}"
updated_at: "{DATE}"
---

# {PREFIX}-000: Story Workflow Harness

## Goal
Validate the end-to-end story workflow by executing a trivial, non-functional
change through all lifecycle phases.

## Non-Goals
- NO feature migration or endpoint conversion
- NO production behavior changes
- NO new business logic
- NO database schema changes

## Definitions
### What is a "Harness"?
A harness is a controlled execution environment that validates process mechanics
without introducing functional risk.

## Scope
### In Scope
1. Create a trivial code change (e.g., add a comment)
2. Execute full lifecycle: PM → Elab → Dev → Code Review → QA Verify → QA Gate
3. Produce all required artifacts at each phase
4. Generate reusable artifact templates

### Out of Scope
- Any change that affects runtime behavior
- Any change requiring tests to be added

## Story Lifecycle
PM Generate → Elab → Dev → Code Review → QA Verify → QA Gate → Merge

## Required Artifacts per Phase
(Include table from harness template)

## Reuse Plan
### Existing Packages Used
- pnpm, git, standard CLI tools

### New Packages Required
- None - harness validates process, not code

## Acceptance Criteria
### AC1: Lifecycle Completeness
- [ ] All 7 phases execute in sequence
- [ ] Each phase produces required artifacts

### AC2: Artifact Validity
- [ ] Artifacts contain substantive content
- [ ] Evidence sections contain command output

### AC3: QA Gate Objectivity
- [ ] Gate decision determinable from evidence alone

### AC4: Reuse-First Compliance
- [ ] No new utility files created

### AC5: Local Verification
- [ ] Verification steps executable on fresh clone

### AC6: Template Generation
- [ ] Templates produced in _templates/ directory

## Required Tooling
(Standard tooling table)

## Local Testing Expectations
(Standard verification commands)

## QA Gate Rules
(PASS/FAIL conditions)

## Deliverables Checklist
(Checkbox list per phase)

## Token Budget
(Standard budget table)
```

## Steps

1. **Read context**
   - Load AGENT-CONTEXT.md for paths and prefix

2. **Generate harness story**
   - Use template above
   - Fill in PREFIX and DATE values
   - Write to `{PREFIX}-000-HARNESS.md`

3. **Generate `_pm/test-plan.yaml`**
   ```yaml
   strategy: manual
   scope:
     endpoints: []
     ui_touched: false
     data_touched: false
   happy_path_tests:
     - id: HP-1
       title: "Full lifecycle completes"
       setup: "Story in backlog state"
       action: "Execute PM → Elab → Dev → Review → QA → Gate"
       expected: "All phases produce required artifacts"
       evidence: "Artifact list matches Required Artifacts table"
   tooling_evidence:
     backend:
       http_requests: []
       assertions: ["All phase artifacts exist", "QA-GATE.yaml verdict: PASS"]
   risks:
     - "Phase ordering must be strictly sequential"
   ```

4. **Generate `_pm/dev-feasibility.yaml`**
   ```yaml
   feasible: true
   confidence: high
   rationale: "Trivial harness — no runtime changes"
   complexity: low
   change_surface:
     areas: ["workflow process"]
     endpoints: []
     deploy_touchpoints: []
   risks: []
   missing_requirements: []
   evidence_expectations: ["All lifecycle artifacts created"]
   subtasks:
     - id: ST-1
       title: "Execute full story lifecycle"
       goal: "Run all phases and produce artifacts"
       files_to_read: ["{PREFIX}-000-HARNESS.md"]
       files_to_modify: []
       acs: ["AC1", "AC2", "AC3", "AC4"]
       depends_on: none
       verification: "Check all phase artifacts exist"
       estimated_tokens: 5000
   ```

5. **Generate BLOCKERS.md**
   ```markdown
   # Blockers: {PREFIX}-000 Harness

   No blockers identified.
   ```

## Output

Format: YAML
Max: 20 lines

```yaml
phase: generation
status: complete
feature_dir: {FEATURE_DIR}
story_id: {PREFIX}-000
files_created:
  - path: {FEATURE_DIR}/stories/{PREFIX}-000/{PREFIX}-000-HARNESS.md
    lines: ~400
  - path: {FEATURE_DIR}/stories/{PREFIX}-000/_pm/test-plan.yaml
    lines: ~25
  - path: {FEATURE_DIR}/stories/{PREFIX}-000/_pm/dev-feasibility.yaml
    lines: ~30
  - path: {FEATURE_DIR}/stories/{PREFIX}-000/_pm/BLOCKERS.md
    lines: ~5
next_step: "/elab-story {FEATURE_DIR} {PREFIX}-000"
```

## Signals

- `GENERATION COMPLETE` - Harness story created
- `GENERATION FAILED: <reason>` - Could not generate

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```
