---
created: 2026-01-24
updated: 2026-01-25
version: 5.2.0
agents:
  # Implementation Agent (spawned once)
  - dev-setup-leader.agent.md
  - dev-implement-planning-leader.agent.md
  - dev-implement-implementation-leader.agent.md
  - dev-verification-leader.agent.md
  - dev-documentation-leader.agent.md
  # Review Agent (spawned fresh each iteration)
  - code-review-lint.agent.md
  - code-review-style-compliance.agent.md
  - code-review-syntax.agent.md
  - code-review-security.agent.md
  - code-review-typecheck.agent.md
  - code-review-build.agent.md
  # Fix Agent (spawned fresh each iteration)
  - dev-fix-fix-leader.agent.md
---

/dev-implement-story {FEATURE_DIR} {STORY_ID} [flags]

You are the **Orchestrator**. You spawn agents and manage the loop.
Do NOT implement code. Do NOT review code. Do NOT fix code.
Your ONLY job is to spawn agents and track state.

**Context is cleared between Implementation, Review, and Fix by spawning fresh agents.**
**Auto-resume: Detects existing artifacts and skips completed stages automatically.**

## Usage

```
/dev-implement-story plans/future/wishlist WISH-001
/dev-implement-story plans/future/wishlist WISH-001 --dry-run
/dev-implement-story plans/future/wishlist WISH-001 --max-iterations=5
/dev-implement-story plans/future/wishlist WISH-001 --force-continue
```

---

## Architecture: Context Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (you)                              │
│  • Minimal context - only tracks: feature_dir, story_id, iteration      │
│  • Spawns fresh agents for each stage                                   │
│  • Reads CHECKPOINT.md and VERIFICATION.yaml to determine next action  │
└─────────────────────────────────────────────────────────────────────────┘
        │
        │ spawn fresh ──────────────────────────────────────┐
        ▼                                                   │
┌───────────────────────────┐                               │
│   IMPLEMENTATION AGENT    │  ← Fresh context              │
│   (Phases 0-4)            │                               │
│                           │                               │
│   Writes: CHECKPOINT.md   │                               │
│           PROOF-*.md      │                               │
│           *-LOG.md        │                               │
└───────────────────────────┘                               │
        │ completes                                         │
        ▼                                                   │
   ┌────────────────────────────────────────────┐           │
   │              REVIEW/FIX LOOP               │           │
   │      (max N iterations, default 3)         │           │
   │                                            │           │
   │    spawn fresh ─────────┐                  │           │
   │         ▼               │                  │           │
   │  ┌─────────────────┐    │                  │           │
   │  │  REVIEW AGENT   │ ←──┼── Fresh context  │           │
   │  │  (Phases 5-6)   │    │                  │           │
   │  │                 │    │                  │           │
   │  │  Reads: CHECKPOINT, PROOF, LOGs        │           │
   │  │  Writes: VERIFICATION.yaml             │           │
   │  └────────┬────────┘    │                  │           │
   │           │             │                  │           │
   │      PASS │    FAIL     │                  │           │
   │        ▼  │      │      │                  │           │
   │      EXIT │      ▼      │                  │           │
   │           │  spawn fresh                   │           │
   │           │      ▼      │                  │           │
   │           │ ┌─────────────────┐            │           │
   │           │ │   FIX AGENT     │ ← Fresh    │           │
   │           │ │   (Phases 7-9)  │   context  │           │
   │           │ │                 │            │           │
   │           │ │ Reads: VERIFICATION.yaml    │           │
   │           │ │ Updates: CHECKPOINT.md      │           │
   │           │ └────────┬────────┘            │           │
   │           │          │                     │           │
   │           │          └──── loop back ──────┘           │
   │           │               to REVIEW AGENT              │
   └───────────┼────────────────────────────────┘           │
               ▼                                            │
            DONE ───────────────────────────────────────────┘
```

---

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--dry-run` | — | Analyze story, output plan without executing |
| `--max-iterations=N` | 3 | Max review/fix loop iterations before stopping |
| `--force-continue` | false | After max iterations, proceed to QA with warnings instead of blocking |

**Auto-resume**: No flag needed. The orchestrator automatically detects existing artifacts and skips to the appropriate stage.

**Model Escalation**: Iterations 1-2 use Sonnet. After 2 failures, iteration 3+ escalates to Opus for stronger reasoning on complex issues.

**Selective Re-Review**: On iteration 2+, only re-runs failed workers + typecheck + build. Passed workers are carried forward.

---

## File-Based State (How Agents Communicate)

All state passes through files, NOT through conversation context:

| File | Written By | Read By | Purpose |
|------|------------|---------|---------|
| `CHECKPOINT.md` | All agents | Orchestrator, all agents | Track completed phases, iteration count |
| `VERIFICATION.yaml` | Review Agent | Orchestrator, Fix Agent | Review results, what failed |
| `PROOF-{STORY_ID}.md` | Implementation Agent | Review Agent | What was implemented |
| `BACKEND-LOG.md` | Implementation Agent | Review Agent | Files touched (backend) |
| `FRONTEND-LOG.md` | Implementation Agent | Review Agent | Files touched (frontend) |

---

## Orchestrator Execution

### Step 1: Initialize & Auto-Detect

```python
# Orchestrator state (minimal)
feature_dir = "{FEATURE_DIR}"
story_id = "{STORY_ID}"
story_path = f"{feature_dir}/in-progress/{story_id}/"
artifacts_path = f"{story_path}_implementation/"
iteration = 0
max_iterations = parse_flag("--max-iterations", default=3)
force_continue = parse_flag("--force-continue", default=False)
```

### Step 2: Auto-Detect Stage (replaces --resume)

Check existing artifacts to determine where to start:

```python
def detect_stage():
    checkpoint = read_file(f"{artifacts_path}/CHECKPOINT.md")

    if checkpoint exists:
        # Resume from checkpoint
        stage = checkpoint.stage
        iteration = checkpoint.iteration or 0

        # If checkpoint says "done", we're already complete
        if stage == "done":
            print(f"Story already complete. Nothing to do.")
            return "done", iteration

        return stage, iteration

    # No checkpoint - check artifacts to determine stage

    # Check for review artifacts (VERIFICATION.yaml)
    verification = read_file(f"{artifacts_path}/VERIFICATION.yaml")
    if verification exists:
        if verification.code_review.verdict == "FAIL":
            # Review done but failed, skip to fix
            iteration = verification.iteration or 1
            print(f"Detected failed review (iter {iteration}). Skipping to fix.")
            return "fix", iteration
        elif verification.code_review.verdict == "PASS":
            # Already passed, nothing to do
            print(f"Review already passed. Nothing to do.")
            return "done", iteration

    # Check for implementation artifacts
    proof_exists = file_exists(f"{story_path}/PROOF-{story_id}.md")
    logs_exist = file_exists(f"{artifacts_path}/BACKEND-LOG.md") or \
                 file_exists(f"{artifacts_path}/FRONTEND-LOG.md")

    if proof_exists and logs_exist:
        # Implementation done, skip to review
        print(f"Detected existing implementation artifacts. Skipping to review.")
        return "review", 0

    # Fresh start
    return "implementation", 0

stage, iteration = detect_stage()
```

**Auto-detect priority:**
1. CHECKPOINT.md (most authoritative)
2. VERIFICATION.yaml with FAIL → skip to Fix
3. VERIFICATION.yaml with PASS → done
4. PROOF + LOGs exist → skip to Review
5. Nothing → start from Implementation

### Step 3: Spawn Implementation Agent (if stage == "implementation")

```
Task tool:
  subagent_type: "general-purpose"
  description: "Implementation {STORY_ID}"
  prompt: |
    You are the Implementation Agent. Execute phases 0-4.

    Read these agent files and execute in sequence:
    - .claude/agents/dev-setup-leader.agent.md (Mode: implement)
    - .claude/agents/dev-implement-planning-leader.agent.md
    - .claude/agents/dev-implement-implementation-leader.agent.md
    - .claude/agents/dev-verification-leader.agent.md (Mode: implement)
    - .claude/agents/dev-documentation-leader.agent.md (Mode: implement)

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    artifacts_path: {artifacts_path}

    When complete, write CHECKPOINT.md with:
      stage: review
      implementation_complete: true

    Signal: IMPLEMENTATION COMPLETE
```

Wait for `IMPLEMENTATION COMPLETE`.

### Step 4: Review/Fix Loop

```python
verdict = None

while iteration < max_iterations:
    iteration += 1

    # Model escalation: use opus after 2 failures for more reasoning power
    model = "opus" if iteration >= 3 else "sonnet"

    # Spawn fresh Review Agent
    review_result = spawn_review_agent(model=model)
    verdict = review_result.verdict

    if verdict == "PASS":
        break  # Exit loop, success!

    if iteration >= max_iterations:
        break  # Don't spawn fix agent on last iteration

    # Spawn fresh Fix Agent (same model escalation)
    spawn_fix_agent(model=model)

    # Loop continues with fresh Review Agent

# Handle loop exhaustion
if verdict != "PASS":
    if force_continue:
        # Proceed to QA with warnings
        proceed_with_warnings()
    else:
        # Block and require manual intervention
        report_blocked()
```

**Model Escalation**: After 2 failed iterations, escalate to Opus for iterations 3+. This provides stronger reasoning for complex issues that simpler fixes couldn't resolve.

### Step 4a: Spawn Review Agent (fresh each time)

**IMPORTANT: Selective Re-Review Optimization**

On iteration 1, run all 6 workers. On iteration 2+, only re-run:
- Workers that FAILED in the previous iteration
- `typecheck` and `build` (always re-run - fixes could break compilation)

Carry forward PASS results from previous iteration for skipped workers.

```
Task tool:
  subagent_type: "general-purpose"
  model: "{model}"  # sonnet for iter 1-2, opus for iter 3+
  description: "Code Review {STORY_ID} (iter {iteration})"
  prompt: |
    You are the Review Agent. Execute code review phases.

    READ these files first to understand what was implemented:
    - {artifacts_path}/CHECKPOINT.md
    - {feature_dir}/in-progress/{story_id}/PROOF-{story_id}.md
    - {artifacts_path}/BACKEND-LOG.md (if exists)
    - {artifacts_path}/FRONTEND-LOG.md (if exists)
    - {artifacts_path}/VERIFICATION.yaml (if exists - for iteration 2+)

    Extract touched_files from the logs.

    ## SELECTIVE RE-REVIEW (iteration 2+)

    If iteration > 1 AND VERIFICATION.yaml exists:
    1. Read previous VERIFICATION.yaml
    2. Identify which workers had verdict: FAIL
    3. ALWAYS re-run: typecheck, build (fixes could break compilation)
    4. RE-RUN: any worker with verdict: FAIL
    5. SKIP: workers with verdict: PASS (carry forward their results)

    Example: If previous iteration had:
    - lint: PASS, style: PASS, syntax: PASS, security: FAIL, typecheck: PASS, build: PASS

    Then this iteration runs ONLY:
    - security (failed)
    - typecheck (always)
    - build (always)

    And carries forward: lint: PASS, style: PASS, syntax: PASS

    ## FIRST REVIEW (iteration 1)

    If iteration == 1 OR no VERIFICATION.yaml:
    Spawn ALL 6 review workers IN PARALLEL (single message):
    - .claude/agents/code-review-lint.agent.md
    - .claude/agents/code-review-style-compliance.agent.md
    - .claude/agents/code-review-syntax.agent.md
    - .claude/agents/code-review-security.agent.md
    - .claude/agents/code-review-typecheck.agent.md
    - .claude/agents/code-review-build.agent.md

    CONTEXT for workers:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    touched_files: <from logs>
    iteration: {iteration}

    After workers complete, aggregate into VERIFICATION.yaml:
      verdict: PASS | FAIL (any FAIL = FAIL)
      iteration: {iteration}
      lint/style/syntax/security/typecheck/build: <results or carried forward>

    Include `skipped: true` for carried-forward results:
    ```yaml
    lint:
      verdict: PASS
      skipped: true  # Carried forward from iteration N-1
      errors: 0
    ```

    Update CHECKPOINT.md with:
      stage: fix (if FAIL) or done (if PASS)
      code_review_verdict: PASS | FAIL

    Signal: REVIEW PASS or REVIEW FAIL
```

Wait for signal. Parse verdict.

### Step 4b: Spawn Fix Agent (fresh, only if FAIL)

```
Task tool:
  subagent_type: "general-purpose"
  model: "{model}"  # sonnet for iter 1-2, opus for iter 3+
  description: "Fix {STORY_ID} (iter {iteration})"
  prompt: |
    You are the Fix Agent. Fix the issues found in code review.

    READ these files first:
    - {artifacts_path}/VERIFICATION.yaml  ← What failed and why
    - {artifacts_path}/CHECKPOINT.md

    Execute these phases in sequence:
    - .claude/agents/dev-fix-fix-leader.agent.md
    - .claude/agents/dev-verification-leader.agent.md (Mode: fix)
    - .claude/agents/dev-documentation-leader.agent.md (Mode: fix)

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    artifacts_path: {artifacts_path}
    iteration: {iteration}
    failures: <from VERIFICATION.yaml>

    Update CHECKPOINT.md with:
      stage: review
      fix_iteration: {iteration}

    Signal: FIX COMPLETE
```

Wait for `FIX COMPLETE`. Loop back to Step 4a.

---

## CHECKPOINT.md Schema

```yaml
# {artifacts_path}/CHECKPOINT.md
schema: 2
feature_dir: "{FEATURE_DIR}"
story_id: "{STORY_ID}"
timestamp: "<ISO timestamp>"

# Current stage for resume
stage: implementation | review | fix | done

# Implementation tracking
implementation_complete: true | false
phases_completed:
  - setup
  - planning
  - implementation
  - verification
  - documentation

# Review/Fix loop tracking
iteration: 0  # Current iteration (0 = not started, 1-N = in loop)
max_iterations: 3  # Configured max
code_review_verdict: null | PASS | FAIL
fix_iterations_completed: []  # List of completed fix iterations
model_used: sonnet | opus  # Model escalation: opus after 2 failures

# Force-continue tracking (if used)
forced: false  # True if --force-continue was used
warnings: []   # Unresolved issues when forced
```

---

## VERIFICATION.yaml Schema

```yaml
# {artifacts_path}/VERIFICATION.yaml
schema: 4
feature_dir: "{FEATURE_DIR}"
story_id: "{STORY_ID}"
updated: "<timestamp>"
iteration: 1  # Which review iteration

code_review:
  verdict: PASS | FAIL
  workers_run: [lint, style, syntax, security, typecheck, build]  # Which workers ran this iteration
  workers_skipped: []  # Workers carried forward from previous PASS

  lint:
    verdict: PASS | FAIL
    skipped: false  # true if carried forward from previous iteration
    errors: 0
    findings: []
  style:
    verdict: PASS | FAIL
    skipped: false
    errors: 0
    findings: []
  syntax:
    verdict: PASS | FAIL
    skipped: false
    errors: 0
    findings: []
  security:
    verdict: PASS | FAIL
    skipped: false
    errors: 0
    findings: []
  typecheck:
    verdict: PASS | FAIL
    skipped: false
    errors: 0
    findings: []
  build:
    verdict: PASS | FAIL
    skipped: false
    errors: 0
    findings: []
```

**Selective Re-Review**: On iteration 2+, workers that passed in previous iteration are skipped (marked `skipped: true`) and their results carried forward. Only failed workers + typecheck + build are re-run.

---

## Error Handling

**Implementation fails:**
- Write CHECKPOINT with `stage: implementation`, `blocked: true`, `reason: <why>`
- Report: "{STORY_ID} blocked during implementation: <reason>"
- STOP

**Review/Fix loop exhausted (without --force-continue):**
- After N iterations with FAIL verdict
- Write CHECKPOINT with `stage: blocked`, `blocked: true`
- Report: "{STORY_ID} blocked: Code review failed after {N} fix iterations"
- STOP

**Review/Fix loop exhausted (with --force-continue):**
- After N iterations with FAIL verdict
- Write CHECKPOINT with `stage: done`, `forced: true`, `warnings: [...]`
- Update story status to `ready-for-qa-with-warnings`
- Report:
  ```
  ⚠️  FORCED CONTINUE: {STORY_ID}
  Code review failed after {N} iterations.
  Proceeding to QA with the following unresolved issues:
  - <list failures from VERIFICATION.yaml>

  Status: ready-for-qa-with-warnings
  Next: /qa-verify-story {FEATURE_DIR} {STORY_ID}
  ```
- Continue (do not block)

**Any agent returns BLOCKED:**
- Update CHECKPOINT with blocked state
- Report to user
- STOP (re-run will auto-resume from checkpoint)

---

## Done

### Clean Pass (REVIEW PASS)

1. Update CHECKPOINT:
   ```yaml
   stage: done
   code_review_verdict: PASS
   completed_at: "<timestamp>"
   ```

2. Move story to ready-for-qa directory:
   ```bash
   mv {FEATURE_DIR}/in-progress/{STORY_ID} {FEATURE_DIR}/ready-for-qa/{STORY_ID}
   ```

3. Update story status to `ready-for-qa` in stories.index.md

### Forced Continue (--force-continue after max iterations)

1. Update CHECKPOINT:
   ```yaml
   stage: done
   code_review_verdict: FAIL
   forced: true
   warnings: [<failures from VERIFICATION.yaml>]
   completed_at: "<timestamp>"
   ```

2. Move story to ready-for-qa directory:
   ```bash
   mv {FEATURE_DIR}/in-progress/{STORY_ID} {FEATURE_DIR}/ready-for-qa/{STORY_ID}
   ```

3. Update story status to `ready-for-qa-with-warnings` in stories.index.md

### Common Steps

4. Log tokens:
   ```
   /token-log {STORY_ID} implementation <in> <out>
   /token-log {STORY_ID} review-{N} <in> <out>  # Per iteration
   /token-log {STORY_ID} fix-{N} <in> <out>     # Per iteration
   ```

5. Report (clean pass):
   ```
   ✓ IMPLEMENTATION COMPLETE: {STORY_ID}
   Iterations: {iteration}
   Status: ready-for-qa
   Next: /qa-verify-story {FEATURE_DIR} {STORY_ID}
   ```

   Report (forced continue):
   ```
   ⚠️  IMPLEMENTATION COMPLETE (WITH WARNINGS): {STORY_ID}
   Iterations: {iteration} (max reached)
   Unresolved: <count> issues
   Status: ready-for-qa-with-warnings
   Next: /qa-verify-story {FEATURE_DIR} {STORY_ID}
   ```

---

## Dry-Run Mode

If `--dry-run`:

1. Read story file, analyze scope
2. Check for existing artifacts (auto-detect)
3. Output report (do not execute):

```markdown
## Dry-Run Report: {STORY_ID}

**Feature**: {FEATURE_DIR}
**Scope**: Backend: yes/no, Frontend: yes/no

**Existing Artifacts Detected**:
- CHECKPOINT.md: yes/no (stage: X, iteration: N)
- PROOF-{STORY_ID}.md: yes/no
- VERIFICATION.yaml: yes/no

**Will Start From**: implementation | review | fix

**Stages to Execute**:
1. Implementation Agent (phases 0-4) ← skipped if artifacts exist
2. Review Agent (6 parallel workers)
3. Fix Agent (if needed, max {N} iterations)

**Configuration**:
- Max iterations: {max_iterations}
- Force continue: {force_continue}

**Context Boundaries**: Fresh agent per stage (Implementation, Review, Fix)

**Ready**: Yes/No
**Blockers**: <if any>
```

---

## Reference

- `.claude/docs/dev-implement-reference.md`
- `docs/dev-code-review-reference.md`
- `docs/dev-fix-reference.md`
