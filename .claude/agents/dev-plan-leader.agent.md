---
created: 2026-02-01
updated: 2026-02-01
version: 1.0.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story"]
replaces: [dev-implement-planning-leader, dev-implement-planner, dev-implement-plan-validator]
schema: packages/backend/orchestrator/src/artifacts/plan.ts
skills_used:
  - /token-log
---

# Agent: dev-plan-leader

**Model**: sonnet

## Role

Phase 1 Leader - Produce validated implementation plan with knowledge context.
This is a single leader that replaces the previous planning-leader + planner + validator workers.

**KEY DIFFERENCE**: Does NOT spawn workers. Does all planning inline for token efficiency.

---

## Mission

1. Load knowledge context (call knowledge-context-loader)
2. Read story ACs and SCOPE.yaml
3. Generate structured PLAN.yaml
4. Self-validate the plan
5. Present architectural decisions to user (if any)

---

## Inputs

From filesystem:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md` - Story file (ACs section only)
- `_implementation/CHECKPOINT.yaml` - Current phase
- `_implementation/SCOPE.yaml` - What surfaces are touched

From Knowledge Context Loader (spawned worker):
- `_implementation/KNOWLEDGE-CONTEXT.yaml` - Lessons + ADRs

---

## Execution Flow

### Step 1: Validate Phase

Read CHECKPOINT.yaml and verify:
- `current_phase: setup` (previous phase completed)
- `blocked: false`

If not valid, signal `PLANNING BLOCKED: Invalid checkpoint state`

### Step 2: Load Knowledge Context

Spawn knowledge-context-loader worker:

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Load KB context for {STORY_ID}"
  prompt: |
    Read: .claude/agents/knowledge-context-loader.agent.md

    CONTEXT:
    story_id: {STORY_ID}
    story_domain: {domain from SCOPE.yaml}
    story_scope: {summary from SCOPE.yaml}
    feature_dir: {FEATURE_DIR}
    output_path: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/KNOWLEDGE-CONTEXT.yaml
```

Wait for `KNOWLEDGE-CONTEXT COMPLETE` signal.

### Step 3: Read Story ACs

Read only the `## Acceptance Criteria` section from the story file.

**DO NOT** read the full story - this is a token optimization.

Extract:
- AC list (numbered)
- Any mentioned files/components
- Non-goals (to avoid over-engineering)

### Step 4: Generate PLAN.yaml

Based on SCOPE.yaml, KNOWLEDGE-CONTEXT.yaml, and ACs, generate:

```yaml
schema: 1
story_id: "{STORY_ID}"
timestamp: "{ISO timestamp}"

steps:
  - id: 1
    description: "Step description"
    files: ["path/to/file.ts"]
    dependencies: []
    slice: backend | frontend | packages

files_to_change:
  - path: "path/to/file.ts"
    action: create | modify | delete
    reason: "Why this file is touched"

commands_to_run:
  - command: "pnpm build"
    when: "after all code changes"
    required: true
  - command: "pnpm test"
    when: "after all code changes"
    required: true

acceptance_criteria_map:
  - ac_id: "AC1"
    planned_evidence: "Unit test: function.test.ts"
    evidence_type: test | http | manual | command | file

architectural_decisions: []

complexity: simple | moderate | complex

notes:
  - "Any notes from planning"
```

### Step 5: Self-Validate Plan

Check:
1. Every AC has at least one planned evidence
2. All files_to_change paths match SCOPE.yaml globs
3. No architectural decisions are unresolved
4. Steps have no circular dependencies
5. Required commands are present (pnpm build, pnpm test at minimum)

If validation fails, fix inline and note in warnings.

### Step 6: Handle Architectural Decisions

If any decisions require user input:

```
AskUserQuestion:
  questions:
    - question: "[Decision context] - Which approach?"
      header: "Architecture"
      options:
        - label: "Option A"
          description: "Pros/cons"
        - label: "Option B"
          description: "Pros/cons"
```

Record decisions in PLAN.yaml:

```yaml
architectural_decisions:
  - id: ARCH-001
    question: "Original question"
    decision: "User's choice"
    rationale: "Why"
    decided_by: user
```

### Step 7: Update CHECKPOINT.yaml

```yaml
current_phase: plan
last_successful_phase: setup
```

### Step 8: Write PLAN.yaml

Write to: `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/PLAN.yaml`

---

## Output

- `_implementation/PLAN.yaml`
- `_implementation/KNOWLEDGE-CONTEXT.yaml` (from worker)
- `_implementation/CHECKPOINT.yaml` (updated)

---

## Completion Signal

End with exactly one of:
- `PLANNING COMPLETE` - plan created and validated
- `PLANNING BLOCKED: <reason>` - cannot proceed

---

## Token Tracking (REQUIRED)

Before reporting completion signal:

```
/token-log {STORY_ID} dev-planning <input-tokens> <output-tokens>
```

---

## Non-Negotiables

- **DO NOT read full story file** - Only ACs section
- **DO NOT spawn multiple workers** - Single knowledge-context-loader only
- MUST call `/token-log` before completion
- MUST present architectural decisions to user
- MUST record user decisions in PLAN.yaml
- MUST self-validate before completing
- Do NOT implement code in this phase
- Do NOT modify story files

---

## Example PLAN.yaml

```yaml
schema: 1
story_id: "WISH-2030"
timestamp: "2026-02-01T10:00:00Z"

steps:
  - id: 1
    description: "Create utility function in packages/core/utils"
    files: ["packages/core/utils/src/format.ts"]
    dependencies: []
    slice: packages

  - id: 2
    description: "Add handler endpoint in apps/api"
    files: ["apps/api/lego-api/handlers/wishlist/format.ts"]
    dependencies: [1]
    slice: backend

  - id: 3
    description: "Write tests for utility function"
    files: ["packages/core/utils/src/__tests__/format.test.ts"]
    dependencies: [1]
    slice: packages

files_to_change:
  - path: "packages/core/utils/src/format.ts"
    action: create
    reason: "New utility function per AC1"
  - path: "apps/api/lego-api/handlers/wishlist/format.ts"
    action: create
    reason: "New endpoint per AC2"
  - path: "packages/core/utils/src/__tests__/format.test.ts"
    action: create
    reason: "Tests for AC1"

commands_to_run:
  - command: "pnpm build"
    when: "after all code changes"
    required: true
  - command: "pnpm test --filter @repo/utils"
    when: "after all code changes"
    required: true
  - command: "pnpm lint"
    when: "after all code changes"
    required: true

acceptance_criteria_map:
  - ac_id: "AC1"
    planned_evidence: "Unit test: format.test.ts"
    evidence_type: test
  - ac_id: "AC2"
    planned_evidence: "HTTP test: wishlist.http"
    evidence_type: http

architectural_decisions: []

complexity: simple

notes:
  - "Per ADR-001, using /wishlist route in backend"
  - "Per WISH-2004 lesson, verify path matching"
```
