---
created: 2026-02-01
updated: 2026-02-25
version: 1.3.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story"]
replaces: [dev-implement-planning-leader, dev-implement-planner, dev-implement-plan-validator]
schema: packages/backend/orchestrator/src/artifacts/plan.ts
skills_used:
  - /token-log
kb_tools:
  - kb_read_artifact
  - artifact_write
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
- `{FEATURE_DIR}/stories/{STORY_ID}/{STORY_ID}.md` - Story file (ACs section only)

From Knowledge Base (read via `kb_read_artifact`):
- `checkpoint` artifact — Current phase
- `scope` artifact — What surfaces are touched
- `context` artifact — Lessons + ADRs (written by knowledge-context-loader)
- `elaboration` artifact — Autonomous decisions (if elab ran)

---

## Execution Flow

### Step 1: Validate Phase

Read checkpoint from KB and verify:
```javascript
const checkpoint = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "checkpoint" })
// Verify: checkpoint.content.current_phase === "setup" && !checkpoint.content.blocked
```

If not valid, signal `PLANNING BLOCKED: Invalid checkpoint state`

### Step 2: Load Knowledge Context

Read scope from KB (needed to spawn context loader with correct domain):
```javascript
const scope = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "scope" })
```

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
    story_domain: {domain from scope.content}
    story_scope: {summary from scope.content}
    feature_dir: {FEATURE_DIR}
```

Wait for `KNOWLEDGE-CONTEXT COMPLETE` signal. The loader writes a `context` artifact to KB.

Then read context from KB:
```javascript
const context = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "context" })
```

If elab ran, also read elaboration decisions:
```javascript
const elaboration = await kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "elaboration" })
// May be null if elab was skipped
```

### Step 3: Read Story ACs, Subtasks, and Canonical References

Read the following sections from the story file (DO NOT read the full story — token optimization):

1. `## Acceptance Criteria` — AC list (numbered), mentioned files/components, non-goals
2. `## Subtasks` — Pre-decomposed subtasks from story generation (if present)
3. `## Canonical References` — Exemplar files for pattern guidance (if present)

**Subtask-aware planning**: If the story contains a `## Subtasks` section, use it as the primary input for PLAN.yaml step generation. Each story subtask (ST-1, ST-2, etc.) maps **1:1** to a PLAN.yaml step. This ensures the execution phase can run each step as a separate, small-context agent invocation.

If no subtasks are present, fall back to generating steps from ACs and SCOPE.yaml as before.

### Step 4: Generate PLAN.yaml

Based on scope, context, ACs, and **subtasks** (if present), generate:

**When subtasks are present** — map 1:1 from story subtasks:

```yaml
schema: 2
story_id: "{STORY_ID}"
timestamp: "{ISO timestamp}"
subtask_source: story  # indicates steps derived from story subtasks

steps:
  - id: 1
    subtask_id: "ST-1"  # maps to story subtask
    description: "Step description (from subtask goal)"
    files: ["path/to/file.ts"]
    files_to_read: ["canonical/reference.ts"]  # context files for agent
    dependencies: []
    slice: backend | frontend | packages
    verification: "pnpm check-types --filter @repo/db"
    acs_covered: ["AC-1", "AC-2"]
```

**When no subtasks present** — generate from ACs as before:

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
```

**Common sections (both modes)**:

```yaml
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
6. If subtask-sourced (schema: 2): each step has `subtask_id`, `files_to_read`, `verification`, and `acs_covered`
7. If subtask-sourced: no step touches more than 3 files

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

### Step 7: Update Checkpoint (dual-write: file + KB)

```javascript
artifact_write({
  story_id: "{STORY_ID}",
  artifact_type: "checkpoint",
  phase: "planning",
  iteration: checkpoint.content.iteration,
  file_path: "{FEATURE_DIR}/stories/{STORY_ID}/_implementation/CHECKPOINT.yaml",
  content: {
    ...checkpoint.content,
    current_phase: "plan",
    last_successful_phase: "setup"
  }
})
```

**Graceful failure**: If KB write fails, `artifact_write` returns `file_written: true` with a `kb_write_warning`. Planning proceeds without blocking — do not stop on KB write failure.

### Step 8: Write Plan Artifact (dual-write: file + KB)

```javascript
artifact_write({
  story_id: "{STORY_ID}",
  artifact_type: "plan",
  phase: "planning",
  iteration: 0,
  file_path: "{FEATURE_DIR}/stories/{STORY_ID}/_implementation/PLAN.yaml",
  content: { /* full PLAN structure as defined above */ }
})
```

**Graceful failure**: If KB write fails, `artifact_write` returns `file_written: true` with a `kb_write_warning`. Planning proceeds without blocking — do not stop on KB write failure.

---

## Output

- File: `{FEATURE_DIR}/stories/{STORY_ID}/_implementation/PLAN.yaml`
- File: `{FEATURE_DIR}/stories/{STORY_ID}/_implementation/CHECKPOINT.yaml` (updated)
- KB artifact: `plan` (story_id, phase: planning, iteration: 0) — written via `artifact_write`
- KB artifact: `context` (written by knowledge-context-loader worker)
- KB artifact: `checkpoint` (updated, phase: planning) — written via `artifact_write`

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
- MUST write artifacts via `artifact_write` (not direct file writes or `kb_write_artifact`)
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
