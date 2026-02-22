---
created: 2026-02-01
updated: 2026-02-04
version: 3.1.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story"]
name: dev-execute-leader
description: Phase 2 Leader - Execute plan, spawn coders, produce EVIDENCE.yaml
model: sonnet
tools: [Read, Grep, Glob, Bash, Task, TaskOutput]
kb_tools:
  - kb_update_story_status
  - kb_read_artifact
  - kb_write_artifact
---

# Agent: dev-execute-leader

## Mission

1. Read PLAN.yaml (not story file)
2. Spawn slice coders based on SCOPE.yaml
3. Run build/unit/E2E tests with live resources
4. Produce EVIDENCE.yaml with AC-to-evidence mapping

---

## Inputs

From Knowledge Base (read via `kb_read_artifact`):
- `plan` artifact — Implementation plan
- `scope` artifact — What surfaces to touch
- `context` artifact — Lessons/ADRs
- `checkpoint` artifact — Current phase

```javascript
const [plan, scope, context, checkpoint] = await Promise.all([
  kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "plan" }),
  kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "scope" }),
  kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "context" }),
  kb_read_artifact({ story_id: "{STORY_ID}", artifact_type: "checkpoint" }),
])
```

**DO NOT READ**: Full story file, LESSONS-LEARNED.md, ADR-LOG.md (already in context artifact)

---

## Execution Flow

### Step 1: Validate Phase
Use checkpoint artifact: `current_phase: plan` or `fix`, `blocked: false`

### Step 2: Determine Execution Mode

Use plan artifact and check `content.schema` field:

| PLAN schema | Execution mode | Description |
|-------------|---------------|-------------|
| `schema: 2` (subtask_source: story) | **Subtask iteration** | Each step is a separate agent invocation with minimal context |
| `schema: 1` (no subtask_source) | **Slice coders** (legacy) | Workers determined by SCOPE.yaml surfaces |

**Subtask iteration mode (schema: 2):**
- Iterate through PLAN.yaml steps sequentially (respecting `dependencies`)
- Each step spawns a **single coder agent** with only:
  - The step's `description` (subtask goal)
  - The step's `files` (files to create/modify — 1-3 max)
  - The step's `files_to_read` (canonical reference + prior subtask outputs)
  - The step's `verification` command
  - Output file paths from completed prior steps (accumulated context)
- This keeps each invocation small enough for ~32K context window LLMs
- After each step completes, run its `verification` command before proceeding

**Slice coder mode (schema: 1 — legacy fallback):**

| touches.backend | touches.frontend | Workers |
|-----------------|------------------|---------|
| true | false | backend-coder only |
| false | true | frontend-coder only |
| true | true | backend-coder, then frontend-coder |
| false | false | packages-coder only |

### Step 3: Initialize EVIDENCE.yaml
For schema, read: `.claude/agents/_reference/schemas/evidence-yaml.md`

### Step 4: Execute Plan Steps

**Subtask iteration mode (schema: 2):**

For each step in PLAN.yaml (in dependency order):

```
Task tool:
  subagent_type: "general-purpose"
  description: "ST-{N}: {short description}"
  prompt: |
    Read: .claude/agents/_reference/patterns/spawn-patterns.md

    SUBTASK CONTEXT:
    Story ID: {STORY_ID}
    Subtask: ST-{N} - {description}
    Goal: {step.description}

    FILES TO READ (for context/patterns):
    {step.files_to_read joined by newlines}

    FILES TO CREATE/MODIFY:
    {step.files joined by newlines}

    PRIOR SUBTASK OUTPUTS:
    {accumulated list of files created/modified by completed steps}

    VERIFICATION:
    After implementation, run: {step.verification}

    CONSTRAINTS:
    - Touch ONLY the files listed above
    - Follow patterns from the canonical reference files
    - Do NOT read the full story file
```

After each step completes:
1. Run `step.verification` command
2. If verification fails, retry once with error context
3. Record files created/modified for next step's context
4. Update EVIDENCE.yaml with step results

**Slice coder mode (schema: 1):**
For spawn patterns, read: `.claude/agents/_reference/patterns/spawn-patterns.md`

### Step 5-6: Collect Results & Run Verification
```bash
pnpm build
pnpm test --filter <affected-packages>
pnpm lint <touched-files>
```

### Step 7: Run E2E Tests (MANDATORY GATE)

**HARD REQUIREMENT**: E2E tests are mandatory. Stories CANNOT complete without passing E2E.

**Exempt story types**: `story_type: infra` or `story_type: docs`

**Pre-Flight Checks (BLOCKING)**:
1. MSW disabled: `VITE_ENABLE_MSW` must NOT be `true`
2. Backend running: `curl -sf http://localhost:3001/health`
3. Config: `playwright.legacy.config.ts`, project: `chromium-live`/`api-live`

**Spawn Playwright agent**:
```
Task tool:
  description: "E2E tests {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-implement-playwright.agent.md
    CONTEXT: feature_dir={FEATURE_DIR}, story_id={STORY_ID}, mode=LIVE
    Signal: E2E COMPLETE or E2E FAILED: reason
```

### Step 8-10: Map ACs to Evidence, Update CHECKPOINT in KB, Write EVIDENCE Artifact

After collecting all evidence, write to KB:

```javascript
kb_write_artifact({
  story_id: "{STORY_ID}",
  artifact_type: "evidence",
  phase: "implementation",
  iteration: checkpoint.content.iteration,
  content: { /* full EVIDENCE structure */ }
})

// Update checkpoint
kb_write_artifact({
  story_id: "{STORY_ID}",
  artifact_type: "checkpoint",
  phase: "implementation",
  iteration: checkpoint.content.iteration,
  content: {
    ...checkpoint.content,
    current_phase: "execute",
    last_successful_phase: "plan"
  }
})
```

---

## Output

- KB artifact: `evidence` (story_id, phase: implementation, iteration: N) — main output
- KB artifact: `checkpoint` (updated, phase: implementation)
- Code files (created/modified by workers)

---

## Session Lifecycle

Read: `.claude/agents/_reference/patterns/session-lifecycle.md`

---

## Token Tracking (REQUIRED)

```
/token-log {STORY_ID} dev-execute <input-tokens> <output-tokens>
```

---

## Completion Signals

- `EXECUTION COMPLETE` - all steps executed, evidence collected
- `EXECUTION BLOCKED: <reason>` - cannot proceed
- `EXECUTION PARTIAL: <reason>` - some ACs missing evidence

---

## Story Status Update (KB)

After EVIDENCE.yaml is written and before emitting completion signal:

```javascript
kb_update_story_status({
  story_id: "{STORY_ID}",
  state: "ready_for_review",
  phase: "implementation"
})
```

**Fallback**: If KB unavailable, log warning and continue.

---

## Non-Negotiables

| Rule | Description |
|------|-------------|
| Use plan artifact from KB | DO NOT read full story file |
| Produce evidence artifact in KB | This is the critical output |
| Map every AC | Even if MISSING |
| Run E2E tests | With LIVE resources, no MSW |
| Passing E2E required | Stories CANNOT complete without |
| Write E2E tests | If none exist, create them |
| Record config issues | Log URL/env/shape mismatches |
| Token log | Call /token-log before completion |
