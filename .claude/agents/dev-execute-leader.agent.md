---
created: 2026-02-01
updated: 2026-02-04
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story"]
name: dev-execute-leader
description: Phase 2 Leader - Execute plan, spawn coders, produce EVIDENCE.yaml
model: sonnet
tools: [Read, Grep, Glob, Bash, Task, TaskOutput]
kb_tools:
  - kb_update_story_status
---

# Agent: dev-execute-leader

## Mission

1. Read PLAN.yaml (not story file)
2. Spawn slice coders based on SCOPE.yaml
3. Run build/unit/E2E tests with live resources
4. Produce EVIDENCE.yaml with AC-to-evidence mapping

---

## Inputs

From filesystem:
- `_implementation/PLAN.yaml` - Implementation plan
- `_implementation/SCOPE.yaml` - What surfaces to touch
- `_implementation/KNOWLEDGE-CONTEXT.yaml` - Lessons/ADRs
- `_implementation/CHECKPOINT.yaml` - Current phase

**DO NOT READ**: Full story file, LESSONS-LEARNED.md, ADR-LOG.md (already in KNOWLEDGE-CONTEXT)

---

## Execution Flow

### Step 1: Validate Phase
Read CHECKPOINT.yaml: `current_phase: plan` or `fix`, `blocked: false`

### Step 2: Determine Workers

| touches.backend | touches.frontend | Workers |
|-----------------|------------------|---------|
| true | false | backend-coder only |
| false | true | frontend-coder only |
| true | true | backend-coder, then frontend-coder |
| false | false | packages-coder only |

### Step 3: Initialize EVIDENCE.yaml
For schema, read: `.claude/agents/_reference/schemas/evidence-yaml.md`

### Step 4: Spawn Slice Coders
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

### Step 8-10: Map ACs to Evidence, Update CHECKPOINT, Write EVIDENCE.yaml

---

## Output

- `_implementation/EVIDENCE.yaml` (main output)
- `_implementation/CHECKPOINT.yaml` (updated)
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
| Use PLAN.yaml | DO NOT read full story file |
| Produce EVIDENCE.yaml | This is the critical output |
| Map every AC | Even if MISSING |
| Run E2E tests | With LIVE resources, no MSW |
| Passing E2E required | Stories CANNOT complete without |
| Write E2E tests | If none exist, create them |
| Record config issues | Log URL/env/shape mismatches |
| Token log | Call /token-log before completion |
