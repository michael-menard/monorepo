# Agent: dev-implement-verification-leader

## Role
Phase 3 Leader - Verify build, tests, and E2E

## Mission
Orchestrate Verifier and Playwright workers in parallel.
Aggregate results into a unified verification summary.

---

## Workers

| Worker | Agent File | Output | Condition |
|--------|------------|--------|-----------|
| Verifier | `dev-implement-verifier.agent.md` | `VERIFICATION.md` | Always |
| Playwright | `dev-implement-playwright.agent.md` | Appends to `VERIFICATION.md` | `scope.frontend = true` |

---

## Inputs

From orchestrator context:
- Story ID (e.g., STORY-007)
- Base path: `plans/stories/in-progress/STORY-XXX/`
- Artifacts path: `plans/stories/in-progress/STORY-XXX/_implementation/`

From filesystem:
- `STORY-XXX/STORY-XXX.md` - story definition
- `_implementation/SCOPE.md` - scope flags
- `_implementation/IMPLEMENTATION-PLAN.md` - for test plan
- `_implementation/BACKEND-LOG.md` (if exists)
- `_implementation/FRONTEND-LOG.md` (if exists)

---

## Execution Flow

### Step 1: Read Scope

Read `_implementation/SCOPE.md` and extract:
- `frontend_impacted`: true/false (determines if Playwright runs)

### Step 2: Spawn Verification Workers (PARALLEL)

Spawn workers IN A SINGLE MESSAGE for parallel execution:

**Always spawn Verifier:**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Verify STORY-XXX build/tests"
  run_in_background: true
  prompt: |
    <contents of dev-implement-verifier.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Output file: plans/stories/in-progress/STORY-XXX/_implementation/VERIFICATION.md
```

**If frontend_impacted = true (same message):**

```
Task tool:
  subagent_type: "general-purpose"
  description: "Run STORY-XXX Playwright tests"
  run_in_background: true
  prompt: |
    <contents of dev-implement-playwright.agent.md>

    ---
    STORY CONTEXT:
    Story ID: STORY-XXX
    Story file: plans/stories/in-progress/STORY-XXX/STORY-XXX.md
    Append to: plans/stories/in-progress/STORY-XXX/_implementation/VERIFICATION.md
```

### Step 3: Wait for Workers

Use TaskOutput to wait for each background worker to complete.
Track completion status:
- Verifier: VERIFICATION COMPLETE / FAILED / BLOCKED
- Playwright: PLAYWRIGHT COMPLETE / FAILED / BLOCKED (if spawned)

### Step 4: Aggregate Results

Read `VERIFICATION.md` and extract results. Create `VERIFICATION-SUMMARY.md`:

```markdown
# Verification Summary - STORY-XXX

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

Write to `_implementation/VERIFICATION-SUMMARY.md`.

### Step 5: Determine Overall Result

- If ANY check is FAIL → overall FAIL
- If ALL checks are PASS → overall PASS

---

## Completion Signal

End with exactly one of:
- `VERIFICATION COMPLETE` - all checks passed
- `VERIFICATION FAILED: <summary>` - one or more checks failed
- `VERIFICATION BLOCKED: <reason>` - worker blocked

---

## Retry Policy

| Scenario | Action |
|----------|--------|
| Build fails | No retry - return FAILED |
| Type check fails | No retry - return FAILED |
| Lint fails | No retry - return FAILED |
| Tests fail | No retry - return FAILED |
| Playwright fails | No retry - return FAILED |
| Worker blocked | No retry - return BLOCKED |

Note: Verification does not retry. Failures are reported back to Implementation Leader
or user for manual intervention.

---

## Output Summary

When complete, report:

```markdown
## Verification Phase Summary

**Status**: COMPLETE / FAILED / BLOCKED

**Results**:
| Check | Result |
|-------|--------|
| Build | PASS/FAIL |
| Types | PASS/FAIL |
| Lint | PASS/FAIL |
| Unit Tests | X/Y |
| E2E Tests | X/Y or SKIPPED |

**Artifacts Created**:
- VERIFICATION.md: created
- VERIFICATION-SUMMARY.md: created

**Token Usage**:
| Worker | Tokens (est) |
|--------|--------------|
| Verifier | — |
| Playwright | — |
| Leader overhead | — |
| **Total** | **—** |
```

---

## Token Log (REQUIRED)

```markdown
## Token Log

| Operation | Type | Bytes | Tokens (est) |
|-----------|------|-------|--------------|
| Read: SCOPE.md | input | — | — |
| Read: agent files | input | — | — |
| Read: VERIFICATION.md | input | — | — |
| Spawn: Verifier | — | — | (see worker log) |
| Spawn: Playwright | — | — | (see worker log) |
| Write: VERIFICATION-SUMMARY.md | output | — | — |
| **Leader Total** | — | — | **—** |
```

---

## Non-Negotiables

- Do NOT fix code (verification only)
- Do NOT skip any verification step
- Do NOT retry failures (report them)
- ALWAYS spawn parallel workers in a SINGLE message
- ALWAYS create VERIFICATION-SUMMARY.md
- ALWAYS report specific failure details
