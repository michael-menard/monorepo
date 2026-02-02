---
created: 2026-01-24
updated: 2026-02-01
version: 7.0.0
agents:
  # Implementation Agents (evidence-first architecture with E2E)
  - dev-setup-leader.agent.md
  - dev-plan-leader.agent.md
  - dev-execute-leader.agent.md
  - dev-implement-playwright.agent.md  # E2E tests (ADR-006)
  - dev-proof-leader.agent.md
  - knowledge-context-loader.agent.md
  # Review Workers (haiku for token efficiency)
  - code-review-lint.agent.md
  - code-review-style-compliance.agent.md
  - code-review-syntax.agent.md
  - code-review-security.agent.md
  - code-review-typecheck.agent.md
  - code-review-build.agent.md
  # Fix Agent
  - dev-fix-fix-leader.agent.md
artifacts:
  - CHECKPOINT.yaml
  - SCOPE.yaml
  - PLAN.yaml
  - KNOWLEDGE-CONTEXT.yaml
  - EVIDENCE.yaml  # Now includes e2e_tests section
  - REVIEW.yaml
---

/dev-implement-story {FEATURE_DIR} {STORY_ID} [flags]

You are the **Orchestrator**. You spawn agents and manage the loop.
Do NOT implement code. Do NOT review code. Do NOT fix code.
Your ONLY job is to spawn agents and track state.

**Evidence-First Architecture**: EVIDENCE.yaml is the single source of truth.
Review and QA read EVIDENCE.yaml, not story file or code.

**v7 Change (ADR-006)**: E2E tests now run during Execute phase with LIVE resources (no mocking).
This catches config issues while developer context is fresh.

## Usage

```
/dev-implement-story plans/future/wishlist WISH-001
/dev-implement-story plans/future/wishlist WISH-001 --dry-run
/dev-implement-story plans/future/wishlist WISH-001 --max-iterations=5
/dev-implement-story plans/future/wishlist WISH-001 --force-continue
```

---

## Architecture: Evidence-First Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR (you)                              │
│  • Minimal context - only tracks: feature_dir, story_id, iteration      │
│  • Reads CHECKPOINT.yaml to determine next phase                        │
│  • Spawns fresh agents for each phase                                   │
└─────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASES                               │
│                                                                        │
│   Phase 0: dev-setup-leader (haiku)                                    │
│       Reads: Story frontmatter (first 50 lines)                        │
│       Writes: CHECKPOINT.yaml, SCOPE.yaml                              │
│                         │                                              │
│                         ▼                                              │
│   Phase 1: dev-plan-leader (sonnet)                                    │
│       Reads: Story ACs, SCOPE.yaml                                     │
│       Spawns: knowledge-context-loader (haiku)                         │
│       Writes: PLAN.yaml, KNOWLEDGE-CONTEXT.yaml                        │
│                         │                                              │
│                         ▼                                              │
│   Phase 2: dev-execute-leader (sonnet)                                 │
│       Reads: PLAN.yaml, KNOWLEDGE-CONTEXT.yaml                         │
│       Steps: Unit tests → Build → E2E tests (LIVE mode)                │
│       Writes: EVIDENCE.yaml ← SINGLE SOURCE OF TRUTH                   │
│                         │                                              │
│                    [E2E with live APIs - ADR-006]                      │
│                    [Spawns: dev-implement-playwright]                  │
│                    [Config issues logged for feedback]                 │
│                         │                                              │
│                         ▼                                              │
│   Phase 3: dev-proof-leader (haiku)                                    │
│       Reads: EVIDENCE.yaml ONLY                                        │
│       Writes: PROOF-{STORY_ID}.md                                      │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────┐
│                    REVIEW/FIX LOOP                                     │
│                    (max 3 iterations)                                  │
│                                                                        │
│   Review Setup (haiku)                                                 │
│       Reads: EVIDENCE.yaml, SCOPE.yaml                                 │
│                         │                                              │
│                         ▼                                              │
│   Review Workers (haiku × N, parallel)                                 │
│       Reads: Touched files from EVIDENCE.yaml                          │
│                         │                                              │
│                         ▼                                              │
│   Review Aggregate (haiku)                                             │
│       Writes: REVIEW.yaml                                              │
│                         │                                              │
│                PASS ────┼──── FAIL                                     │
│                  │      │      │                                       │
│                  ▼      │      ▼                                       │
│                EXIT     │   dev-fix-fix-leader (sonnet)                │
│                         │      │                                       │
│                         │      └──── loop back                         │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
        │
        ▼
     QA READY
```

---

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--dry-run` | — | Analyze story, output plan without executing |
| `--max-iterations=N` | 3 | Max review/fix loop iterations before stopping |
| `--force-continue` | false | After max iterations, proceed to QA with warnings |

---

## File-Based State (YAML Artifacts)

| Artifact | Written By | Read By | Purpose |
|----------|------------|---------|---------|
| `CHECKPOINT.yaml` | All leaders | Orchestrator | Track phase, enable resume |
| `SCOPE.yaml` | Setup Leader | All subsequent phases | What surfaces touched |
| `PLAN.yaml` | Plan Leader | Execute Leader | Structured plan |
| `KNOWLEDGE-CONTEXT.yaml` | Knowledge Loader | Plan, Execute, QA | Lessons + ADRs |
| `EVIDENCE.yaml` | Execute Leader | Review, QA | **Single source of truth** (includes e2e_tests) |
| `REVIEW.yaml` | Review Aggregate | Fix Agent, QA | Review findings |
| `PROOF-{STORY_ID}.md` | Proof Leader | Human review | Human-readable evidence |

**v7 Change**: EVIDENCE.yaml now includes `e2e_tests` section with:
- Test results (pass/fail/skipped)
- Config issues discovered (for workflow feedback loop)
- Videos/screenshots for failures

**Token Savings**: Review and QA read EVIDENCE.yaml (~2k tokens) instead of story+logs+code (~20k+ tokens).

---

## Orchestrator Execution

### Step 1: Initialize

```python
feature_dir = "{FEATURE_DIR}"
story_id = "{STORY_ID}"
story_path = f"{feature_dir}/in-progress/{story_id}/"
artifacts_path = f"{story_path}_implementation/"
max_iterations = parse_flag("--max-iterations", default=3)
force_continue = parse_flag("--force-continue", default=False)
```

### Step 2: Auto-Detect Phase (from CHECKPOINT.yaml)

```python
def detect_phase():
    checkpoint_path = f"{artifacts_path}/CHECKPOINT.yaml"

    if not file_exists(checkpoint_path):
        # Check if story is in ready-to-work stage
        story_in_ready = dir_exists(f"{feature_dir}/ready-to-work/{story_id}")
        if story_in_ready:
            return "setup", 0
        else:
            return "blocked", 0  # Story not found or not ready

    checkpoint = read_yaml(checkpoint_path)

    if checkpoint.blocked:
        return "blocked", checkpoint.iteration

    if checkpoint.current_phase == "done":
        return "done", checkpoint.iteration

    return checkpoint.current_phase, checkpoint.iteration

phase, iteration = detect_phase()
```

### Step 3: Execute Phase (spawn appropriate leader)

```python
if phase == "setup":
    spawn_setup_leader()
    phase = "plan"

if phase == "plan":
    spawn_plan_leader()
    phase = "execute"

if phase == "execute":
    spawn_execute_leader()
    phase = "proof"

if phase == "proof":
    spawn_proof_leader()
    phase = "review"

if phase in ["review", "fix"]:
    run_review_fix_loop()
```

### Step 4: Spawn Setup Leader

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Setup {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-setup-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    mode: implement

    Signal: SETUP COMPLETE or SETUP BLOCKED: reason
```

Wait for signal. If BLOCKED, stop.

### Step 5: Spawn Plan Leader

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Plan {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-plan-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: PLANNING COMPLETE or PLANNING BLOCKED: reason
```

Wait for signal. If BLOCKED, stop.

### Step 6: Spawn Execute Leader

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Execute {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-execute-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: EXECUTION COMPLETE or EXECUTION BLOCKED: reason
```

Wait for signal. If BLOCKED, stop.

### Step 7: Spawn Proof Leader

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Proof {STORY_ID}"
  prompt: |
    Read: .claude/agents/dev-proof-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}

    Signal: PROOF COMPLETE or PROOF BLOCKED: reason
```

Wait for signal. If BLOCKED, stop.

### Step 8: Review/Fix Loop

```python
while iteration < max_iterations:
    iteration += 1

    # Spawn review workers (haiku, parallel)
    review_result = spawn_review_phase(iteration)

    if review_result.verdict == "PASS":
        break

    if iteration >= max_iterations:
        break  # Don't fix on last iteration

    # Spawn fix agent
    spawn_fix_agent(iteration)
    # Loop continues

# Handle exhaustion
if review_result.verdict != "PASS":
    if force_continue:
        proceed_with_warnings()
    else:
        report_blocked()
```

### Step 8a: Spawn Review Workers

```
Task tool:
  subagent_type: "general-purpose"
  model: "haiku"
  description: "Review {STORY_ID} (iter {iteration})"
  prompt: |
    You are the Review Orchestrator.

    Read EVIDENCE.yaml to get:
    - touched_files list
    - scope from SCOPE.yaml

    Spawn review workers IN PARALLEL (haiku model):
    - code-review-lint
    - code-review-style-compliance
    - code-review-syntax
    - code-review-security
    - code-review-typecheck
    - code-review-build

    Workers should output YAML findings only.

    Aggregate results into REVIEW.yaml:
    ```yaml
    schema: 1
    story_id: "{STORY_ID}"
    timestamp: "<ISO>"
    iteration: {iteration}
    verdict: PASS | FAIL
    workers_run: [...]
    findings: {worker results}
    ranked_patches: [top 3 issues for fix agent]
    ```

    Signal: REVIEW PASS or REVIEW FAIL
```

### Step 8b: Spawn Fix Agent

```
Task tool:
  subagent_type: "general-purpose"
  model: "sonnet"
  description: "Fix {STORY_ID} (iter {iteration})"
  prompt: |
    Read: .claude/agents/dev-fix-fix-leader.agent.md

    CONTEXT:
    feature_dir: {FEATURE_DIR}
    story_id: {STORY_ID}
    iteration: {iteration}

    Read REVIEW.yaml for ranked_patches (top 3 issues to fix).
    Fix issues, update EVIDENCE.yaml with new evidence.

    Signal: FIX COMPLETE
```

---

## CHECKPOINT.yaml Schema

```yaml
schema: 1
story_id: "{STORY_ID}"
feature_dir: "{FEATURE_DIR}"
timestamp: "<ISO timestamp>"

current_phase: setup | plan | execute | proof | review | fix | done
last_successful_phase: null | setup | plan | execute | proof | review

iteration: 0  # Review/fix iteration
max_iterations: 3

blocked: false
blocked_reason: null

forced: false
warnings: []

completed_at: null
```

---

## Done

### Clean Pass

1. Update CHECKPOINT.yaml:
   ```yaml
   current_phase: done
   last_successful_phase: review
   completed_at: "<timestamp>"
   ```

2. Move story:
   ```bash
   mv {FEATURE_DIR}/in-progress/{STORY_ID} {FEATURE_DIR}/ready-for-qa/{STORY_ID}
   ```

3. Update story status to `ready-for-qa`

4. Report:
   ```
   ✓ IMPLEMENTATION COMPLETE: {STORY_ID}
   Iterations: {iteration}
   Status: ready-for-qa
   Next: /qa-verify-story {FEATURE_DIR} {STORY_ID}
   ```

### Forced Continue

1. Update CHECKPOINT.yaml:
   ```yaml
   current_phase: done
   forced: true
   warnings: [...]
   ```

2. Move story, update status to `ready-for-qa-with-warnings`

3. Report with warning:
   ```
   ⚠️  IMPLEMENTATION COMPLETE (WITH WARNINGS): {STORY_ID}
   Unresolved: <count> issues
   Status: ready-for-qa-with-warnings
   ```

---

## Token Savings Summary

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| Story file reads | 15+ times | 2 times | ~90k tokens |
| LESSONS-LEARNED.md | 3-5 times | 0 (cached in KNOWLEDGE-CONTEXT.yaml) | ~60k tokens |
| Review workers model | sonnet | haiku | ~50% cost |
| Proof generation | Re-read all logs | EVIDENCE.yaml only | ~13k tokens |

**Estimated total savings per story: 40%+ (~120k tokens)**

---

## Reference

- `.claude/agents/dev-setup-leader.agent.md`
- `.claude/agents/dev-plan-leader.agent.md`
- `.claude/agents/dev-execute-leader.agent.md`
- `.claude/agents/dev-proof-leader.agent.md`
- `.claude/agents/knowledge-context-loader.agent.md`
- `packages/backend/orchestrator/src/artifacts/` - YAML schemas
