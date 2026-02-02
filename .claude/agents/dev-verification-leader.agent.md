---
created: 2026-01-24
updated: 2026-02-01
version: 3.1.0
type: leader
permission_level: orchestrator
triggers: ["/dev-implement-story", "/dev-fix-story"]
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

| Mode | Source | Workers | Output |
|------|--------|---------|--------|
| `implement` | `/dev-implement-story` | Verifier + Playwright (if frontend or backend) | Full VERIFICATION-SUMMARY.md |
| `fix` | `/dev-fix-story` | Verifier + Playwright (if frontend or backend) | Compact FIX-VERIFICATION-SUMMARY.md |

**IMPORTANT:** The `mode` parameter MUST be provided in the orchestrator prompt.

---

## Workers

| Worker | Agent File | Output | Condition |
|--------|------------|--------|-----------|
| Verifier | `dev-implement-verifier.agent.md` | `VERIFICATION.md` | Always |
| Playwright | `dev-implement-playwright.agent.md` | Appends to `VERIFICATION.md` | `scope.frontend=true` OR `scope.backend=true` |

---

## Inputs

From orchestrator context:
- Feature directory (e.g., `plans/future/wishlist`)
- Story ID (e.g., WISH-001)
- Mode: `implement` or `fix`
- Base path: `{FEATURE_DIR}/in-progress/{STORY_ID}/`
- Artifacts path: `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/`

From filesystem:
- `{STORY_ID}/{STORY_ID}.md` - story definition
- `_implementation/AGENT-CONTEXT.md` - context including mode
- `_implementation/SCOPE.md` - scope flags (implement mode)

---

## Mode: implement

### Step 1: Read Scope

Read `_implementation/SCOPE.md` and extract:
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
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Story file: {FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md
    Output file: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.md
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
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Story file: {FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md
    Append to: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.md

    SCOPE FLAGS:
    frontend_impacted: {true/false}
    backend_impacted: {true/false}
```

### Step 3: Wait for Workers

Use TaskOutput to wait for each background worker to complete.

### Step 4: Aggregate Results

Read `VERIFICATION.md` and create `VERIFICATION-SUMMARY.md`:

```markdown
# Verification Summary - {STORY_ID}

## Quick Status

| Check | Result | Details |
|-------|--------|---------|
| Build | PASS/FAIL | — |
| Type Check | PASS/FAIL | — errors |
| Lint | PASS/FAIL | — warnings |
| Unit Tests | PASS/FAIL | X/Y passed |
| E2E Tests | PASS/FAIL/SKIPPED | X/Y passed |

## Overall: PASS / FAIL

## Failure Details (if any)

<extract specific failure messages>

## Commands Run

| Command | Result | Duration |
|---------|--------|----------|
| pnpm build | PASS/FAIL | — |
| pnpm check-types | PASS/FAIL | — |
| pnpm lint | PASS/FAIL | — |
| pnpm test | PASS/FAIL | — |
| pnpm playwright | PASS/FAIL/SKIPPED | — |
```

### Output (implement mode)

- `_implementation/VERIFICATION.md` (from Verifier)
- `_implementation/VERIFICATION-SUMMARY.md` (created by leader)

---

## Mode: fix

### Step 1: Read Context and Scope

Read `_implementation/AGENT-CONTEXT.md` for story paths.
Read `_implementation/SCOPE.md` and extract:
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
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Mode: FIX verification
    Output file: _implementation/VERIFICATION.md
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
    Feature directory: {FEATURE_DIR}
    Story ID: {STORY_ID}
    Story file: {FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md
    Append to: {FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.md

    SCOPE FLAGS:
    frontend_impacted: {true/false}
    backend_impacted: {true/false}
```

### Step 3: Wait for Workers

Use TaskOutput to wait for each background worker to complete.

### Step 4: Write Compact Summary

Create `FIX-VERIFICATION-SUMMARY.md` (max 20 lines):

```markdown
# Fix Verification - {STORY_ID}

| Check | Result |
|-------|--------|
| Types | PASS/FAIL |
| Lint | PASS/FAIL |
| Tests | PASS/FAIL |
| E2E UI | PASS/FAIL/SKIPPED |
| E2E API | PASS/FAIL/SKIPPED |

## Overall: PASS / FAIL
```

### Output (fix mode)

- `_implementation/VERIFICATION.md` (from Verifier + Playwright)
- `_implementation/FIX-VERIFICATION-SUMMARY.md` (created by leader)

---

## Completion Signal

End with exactly one of:
- `VERIFICATION COMPLETE` - all checks passed
- `VERIFICATION FAILED: <summary>` - one or more checks failed
- `VERIFICATION BLOCKED: <reason>` - worker blocked

---

## Retry Policy

No retries. Failures are reported back to parent leader or user for manual intervention.

| Scenario | Action |
|----------|--------|
| Any check fails | No retry - return FAILED |
| Worker blocked | No retry - return BLOCKED |

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
- ALWAYS create summary file (appropriate to mode)
- ALWAYS report specific failure details
