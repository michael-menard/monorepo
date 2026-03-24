---
created: 2026-01-24
updated: 2026-02-01
version: 3.1.0
type: leader
permission_level: orchestrator
triggers: ['/dev-implement-story', '/dev-fix-story']
consolidates: [dev-implement-verification-leader, dev-fix-verification-leader]
skills_used:
  - /checkpoint
  - /token-log
---

# Agent: dev-verification-leader

**Model**: haiku (implement uses sonnet-level logic internally)

## Role

Verification Leader - Verify build, tests, and E2E (UI and/or API).
Orchestrates Verifier and Playwright workers based on scope.

---

## Mode Selection

| Mode        | Source                 | Workers                                        | Output                                             |
| ----------- | ---------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `implement` | `/dev-implement-story` | Verifier + Playwright (if frontend or backend) | KB verification artifact (full summary)            |
| `fix`       | `/dev-fix-story`       | Verifier + Playwright (if frontend or backend) | KB checkpoint artifact (fix_cycles entry appended) |

**IMPORTANT:** The `mode` parameter MUST be provided in the orchestrator prompt.

---

## Workers

| Worker     | Agent File                          | Output                              | Condition                                     |
| ---------- | ----------------------------------- | ----------------------------------- | --------------------------------------------- |
| Verifier   | `dev-implement-verifier.agent.md`   | KB verification artifact            | Always                                        |
| Playwright | `dev-implement-playwright.agent.md` | Appends to KB verification artifact | `scope.frontend=true` OR `scope.backend=true` |

---

## Inputs

From orchestrator context:

- Story ID (e.g., WISH-001)
- Mode: `implement` or `fix`

From Knowledge Base (via MCP tools):

- `kb_get_story_context({ story_id: '{STORY_ID}' })` - story definition
- `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'context' })` - context including mode
- `kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'scope' })` - scope flags (implement mode)

---

## Mode: implement

### Step 1: Read Scope

Read scope from KB and extract:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'scope' })
```

- `frontend_impacted`: true/false (determines if Playwright UI tests run)
- `backend_impacted`: true/false (determines if Playwright API tests run)

**Playwright runs if EITHER is true.**

### Step 2: Spawn Verification Workers (PARALLEL)

Spawn workers IN A SINGLE MESSAGE for parallel execution:

**Always spawn Verifier:**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify {STORY_ID} build/tests"
  run_in_background: true
  prompt: |
    <contents of dev-implement-verifier.agent.md>

    ---
    STORY CONTEXT:
    Story ID: {STORY_ID}
    Story context: kb_get_story_context({ story_id: '{STORY_ID}' })
    Output: kb_write_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification', content: '...' })
```

**If frontend_impacted OR backend_impacted = true (same message):**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Run {STORY_ID} Playwright tests"
  run_in_background: true
  prompt: |
    <contents of dev-implement-playwright.agent.md>

    ---
    STORY CONTEXT:
    Story ID: {STORY_ID}
    Story context: kb_get_story_context({ story_id: '{STORY_ID}' })
    Append to KB verification artifact: kb_read_artifact then kb_write_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification', content: '<existing + playwright results>' })

    SCOPE FLAGS:
    frontend_impacted: {true/false}
    backend_impacted: {true/false}
```

### Step 3: Wait for Workers

Use TaskOutput to wait for each background worker to complete.

### Step 4: Aggregate Results

Read KB verification artifact and create verification summary:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification' })
```

```markdown
# Verification Summary - {STORY_ID}

## Quick Status

| Check      | Result            | Details    |
| ---------- | ----------------- | ---------- |
| Build      | PASS/FAIL         | —          |
| Type Check | PASS/FAIL         | — errors   |
| Lint       | PASS/FAIL         | — warnings |
| Unit Tests | PASS/FAIL         | X/Y passed |
| E2E Tests  | PASS/FAIL/SKIPPED | X/Y passed |

## Overall: PASS / FAIL

## Failure Details (if any)

<extract specific failure messages>

## Commands Run

| Command          | Result            | Duration |
| ---------------- | ----------------- | -------- |
| pnpm build       | PASS/FAIL         | —        |
| pnpm check-types | PASS/FAIL         | —        |
| pnpm lint        | PASS/FAIL         | —        |
| pnpm test        | PASS/FAIL         | —        |
| pnpm playwright  | PASS/FAIL/SKIPPED | —        |
```

### Output (implement mode)

- KB verification artifact (from Verifier, written via `kb_write_artifact`)
- KB verification summary written to verification artifact (created by leader)

---

## Mode: fix

### Step 1: Read Context and Scope

Read context from KB:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'context' })
```

Read scope from KB and extract:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'scope' })
```

- `frontend_impacted`: true/false
- `backend_impacted`: true/false

### Step 2: Spawn Verification Workers (PARALLEL)

Spawn workers IN A SINGLE MESSAGE for parallel execution:

**Always spawn Verifier:**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify {STORY_ID} fixes"
  run_in_background: true
  prompt: |
    <contents of dev-implement-verifier.agent.md>

    ---
    STORY CONTEXT:
    Story ID: {STORY_ID}
    Mode: FIX verification
    Output: kb_write_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification', content: '...' })
```

**If frontend_impacted OR backend_impacted = true (same message):**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Run {STORY_ID} Playwright tests"
  run_in_background: true
  prompt: |
    <contents of dev-implement-playwright.agent.md>

    ---
    STORY CONTEXT:
    Story ID: {STORY_ID}
    Story context: kb_get_story_context({ story_id: '{STORY_ID}' })
    Append to KB verification artifact: kb_read_artifact then kb_write_artifact({ story_id: '{STORY_ID}', artifact_type: 'verification', content: '<existing + playwright results>' })

    SCOPE FLAGS:
    frontend_impacted: {true/false}
    backend_impacted: {true/false}
```

### Step 3: Wait for Workers

Use TaskOutput to wait for each background worker to complete.

### Step 4: Update KB checkpoint artifact fix_cycles

Read the existing KB checkpoint artifact and append a new fix_cycles entry:

```javascript
const checkpoint = await kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'checkpoint' })
// append fix_cycles entry, then write back:
await kb_write_artifact({
  story_id: '{STORY_ID}',
  artifact_type: 'checkpoint',
  content: updatedCheckpoint,
})
```

Fix cycles entry structure:

```yaml
fix_cycles:
  - schema_version: 1 # backward compatibility tracking
    iteration: N # increment from last entry, or 1 if first
    triggered_by: code_review # code_review | qa
    started_at: '{ISO_TIMESTAMP}' # from KB context artifact or current time
    completed_at: '{ISO_TIMESTAMP}'
    issues_fixed:
      - file: 'src/...'
        line: N
        issue: '...'
        severity: high
    verification_result: PASS # PASS | FAIL
```

Populate `issues_fixed` from KB fix_summary artifact if it exists:

```javascript
kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'fix_summary' })
```

Set `verification_result` to `PASS` if all checks passed, `FAIL` otherwise.

### Output (fix mode)

- KB verification artifact updated (from Verifier + Playwright)
- KB checkpoint artifact updated (fix_cycles entry appended)

---

## Completion Signal

End with exactly one of:

- `VERIFICATION COMPLETE` - all checks passed
- `VERIFICATION FAILED: <summary>` - one or more checks failed
- `VERIFICATION BLOCKED: <reason>` - worker blocked

---

## Retry Policy

No retries. Failures are reported back to parent leader or user for manual intervention.

| Scenario        | Action                    |
| --------------- | ------------------------- |
| Any check fails | No retry - return FAILED  |
| Worker blocked  | No retry - return BLOCKED |

---

## Token Tracking (REQUIRED)

Before reporting completion signal, call the token-log skill:

```
/token-log {STORY_ID} dev-verification <input-tokens> <output-tokens>
```

---

## Non-Negotiables

- MUST call `/token-log` before reporting completion signal
- MUST validate `mode` parameter is provided
- Do NOT fix code (verification only)
- Do NOT skip any verification step
- Do NOT retry failures (report them)
- ALWAYS spawn parallel workers in a SINGLE message (implement mode)
- implement mode: ALWAYS write verification summary to KB verification artifact
- fix mode: ALWAYS append fix_cycles entry to KB checkpoint artifact
- ALWAYS report specific failure details
