---
created: 2026-01-24
updated: 2026-03-14
version: 9.0.0
agents:
  - dev-setup-leader.agent.md
  - dev-plan-leader.agent.md
  - dev-execute-leader.agent.md
  - dev-implement-playwright.agent.md
  - knowledge-context-loader.agent.md
  - code-review-*.agent.md
  - dev-fix-fix-leader.agent.md
  - graph-checker.agent.md
kb_artifacts:
  - checkpoint (phase: setup)
  - scope (phase: setup)
  - plan (phase: planning)
  - context (phase: planning)
  - evidence (phase: implementation)
  - review (phase: code_review)
shared:
  - _shared/decision-handling.md
  - _shared/autonomy-tiers.md
---

/dev-implement-story {STORY_ID} [flags]

> **Fresh context recommended.** Run `/clear` before this command when starting a new story or switching stories. Prior session context can cause agent confusion, stale artifact references, and incorrect phase detection.

You are the **Orchestrator**. You spawn agents and manage the loop.
Do NOT implement code. Do NOT review code. Do NOT fix code.

**Evidence-First**: `evidence` KB artifact is single source of truth.
**E2E Required**: Stories CANNOT complete without passing E2E tests (live mode).

## Usage

```bash
/dev-implement-story WISH-001
/dev-implement-story WISH-001 --gen
/dev-implement-story WISH-001 --dry-run
/dev-implement-story WISH-001 --max-iterations=5
/dev-implement-story WISH-001 --force-continue
/dev-implement-story WISH-001 --skip-worktree
/dev-implement-story WISH-001 --skip-cohesion
```

## Flags

| Flag                 | Default      | Purpose                                                                         |
| -------------------- | ------------ | ------------------------------------------------------------------------------- |
| `--gen`              | —            | Generate minimal story structure and bypass elab                                |
| `--dry-run`          | —            | Analyze only, no execution                                                      |
| `--max-iterations=N` | 3            | Max review/fix loops                                                            |
| `--force-continue`   | false        | Proceed with warnings                                                           |
| `--autonomous=LEVEL` | conservative | Escalation level (see below)                                                    |
| `--skip-worktree`    | false        | Skip worktree verification (Step 1.3); proceed without worktree context         |
| `--skip-cohesion`    | false        | Skip Phase 2.5 cohesion check (advisory only; does not affect story completion) |

### --gen Flag (Story Generation)

When `--gen` is specified, the command will:

1. **Create minimal story in KB** - Calls `kb_create_story` with provided context; no files written
2. **Skip elab phase** - Bypasses story elaboration and elab KB artifacts (analysis, elaboration)
3. **Move directly to implementation** - Starts Phase 0 (dev-setup-leader) immediately

**KB Record Created:**

```javascript
kb_create_story({
  story_id: '{STORY_ID}',
  title: '{provided or generated title}',
  description: '[Story description provided by user or minimal placeholder]',
  status: 'in_progress',
  phase: 'implementation',
  tags: [],
  acceptance_criteria: [],
})
```

**When to use --gen:**

- Rapid prototyping or experimental features
- Stories with well-understood requirements (no need for elab)
- Agent-driven development where story structure is minimal
- Integration tests or infrastructure stories

**When NOT to use --gen:**

- Feature stories requiring PM review
- User-facing changes needing UX/UI elaboration
- Complex stories with dependencies or architectural decisions

**Usage:**

```bash
/dev-implement-story WISH-001 --gen
/dev-implement-story WISH-001 --gen --autonomous=moderate
```

### Autonomy Levels

| Level          | Tier 1   | Tier 2   | Tier 3   | Tier 4   | Tier 5   |
| -------------- | -------- | -------- | -------- | -------- | -------- |
| `conservative` | Escalate | Escalate | Escalate | Escalate | Escalate |
| `moderate`     | Auto     | Escalate | Auto     | Escalate | Escalate |
| `aggressive`   | Auto     | Auto     | Auto     | Escalate | Auto\*   |

\*Tier 5 auto-accepts only if risk is low.

See: `.claude/agents/_shared/autonomy-tiers.md` for tier definitions.
See: `.claude/agents/_shared/decision-handling.md` for decision protocol.

**Usage:**

```bash
/dev-implement-story WISH-001 --autonomous=moderate
```

### Decision Storage

Decisions are stored in the Knowledge Base (not file artifacts):

| KB Tool           | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `kb_add_decision` | Log auto-accepted and user-approved decisions |
| `kb_add_lesson`   | Log deferred/moonshot items for follow-up     |
| `kb_search`       | Query prior decisions for context             |

Query decisions later: `kb_search({ query: "{topic}", tags: ["tier-2"], limit: 5 })`

---

## Architecture

```
ORCHESTRATOR (you)
    │
    ▼
Phase 0: dev-setup-leader (haiku)
    → KB: checkpoint, scope artifacts
    │
    ▼
Phase 1: dev-plan-leader (sonnet)
    → KB: plan, context artifacts
    │
    ▼
Phase 2: dev-execute-leader (sonnet)
    → Steps: Unit → Build → E2E (LIVE mode)
    → KB: evidence artifact ← SOURCE OF TRUTH
    │
    ▼
Phase 2.5: Cohesion Check (haiku — ADVISORY)
    → graph-checker: detects franken-features + rule violations
    → cohesion-prosecutor: adversarial prosecution (if agent available)
    → Output: graph-check-results.json (advisory only, never blocks)
    │
    ▼
REVIEW/FIX LOOP (max 3 iterations)
    → Review workers (haiku, parallel)
    → KB: review artifact
    → PASS → Exit | FAIL → Fix Agent → Loop
```

---

## Execution

### Step 0.6: Claim Story in KB

1. Call `kb_update_story_status({ story_id: "{STORY_ID}", state: "in_progress", phase: "implementation" })`
2. **Guard:** If already `in_progress`, STOP: "Story {STORY_ID} is already being implemented by another agent."
3. If `kb_update_story_status` returns null or throws, emit `WARNING: DB state update failed for {STORY_ID} — proceeding with implementation only.` and continue.

**Abort / Error Recovery:** If interrupted after Step 0.6, release manually:
`kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review" })`

### Step 1: Initialize

```
story_id = "{STORY_ID}"
# Note: story data and artifacts stored in KB — no filesystem paths needed
autonomy_level = flags.autonomous || "conservative"
batch_mode = false  # true only when called from /workflow-batch
gen_mode = flags.gen || false
skip_worktree = flags.skip_worktree || false
skip_cohesion = flags.skip_cohesion || false
```

### Step 1.5: Generate Story (if --gen flag)

**IF `--gen` flag is present:**

1. **Check if story already exists in KB**

   ```javascript
   const existing = await kb_get_story({ story_id: "{STORY_ID}" })
   if (existing !== null):
       STOP: "Story {STORY_ID} already exists in KB. Remove --gen flag or use different ID."
   ```

2. **Prompt user for story context** (if not in batch mode)

   ```
   Ask user:
   - Story title (required)
   - Brief description (optional, use placeholder if not provided)
   - Tags (optional, comma-separated)
   ```

3. **Create story in KB**

   ```javascript
   kb_create_story({
     story_id: "{STORY_ID}",
     title: "{user_provided_title or 'Generated Story'}",
     description: "{user_provided_description or 'Auto-generated story for implementation.'}",
     status: "in_progress",
     phase: "implementation",
     tags: [{user_provided_tags or []}],
     acceptance_criteria: [],
   })
   ```

4. **Report story generation**

   ```
   Story generated: {STORY_ID} (KB record created)
   Elaboration: SKIPPED (--gen mode)

   Proceeding to Phase 0 (setup)...
   ```

**IF `--gen` flag NOT present:**

- Skip story generation
- Expect story to exist in KB with state `ready` (standard flow)
- Validate `kb_get_story({ story_id: "{STORY_ID}" })` returns non-null with elaboration artifact

### Step 1.3: Verify Worktree Context

<!-- Cross-reference: WINT-1130 (MCP tools: worktree_get_by_story, worktree_mark_complete),
     WINT-1140 (original AC-4: 3-option conflict prompt UX),
     WINT-1160 (take-over hardening: AC-5 always-prompt, AC-6 ordered sequence) -->

**Flow position:**

- Standard flow: Step 1 → Step 1.3 → Step 2
- Gen flow: Step 1 → Step 1.5 → Step 1.3 → Step 2

The story worktree and draft PR are created upstream by `/pm-story` (Step 1.7). This step verifies we're in the correct worktree context AND checks for parallel-work conflicts via the database.

**IF `--skip-worktree` flag is present:**

```
WARN: Worktree verification skipped (--skip-worktree flag). Proceeding without worktree isolation.
```

Skip the rest of Step 1.3 and continue to Step 2.

**IF `--skip-worktree` NOT present:**

1. **Check current directory** — Confirm the current working directory is inside `tree/story/{STORY_ID}`.

2. **If not in worktree** — Locate and switch into it:

   ```bash
   cd tree/story/{STORY_ID}
   ```

   If the worktree directory doesn't exist, fall back to creating it:

   ```
   /wt:new story/{STORY_ID} main
   ```

3. **Check for parallel-work conflict** — Call `worktree_get_by_story({ storyId: "{STORY_ID}" })`.
   - If result is **null**: No active DB-tracked worktree. Continue to step 4.
   - If result is a **record for the current session** (path matches current worktree): No conflict. Continue to step 4.
   - If result is a **record for a different session**: Present the 3-option conflict prompt (WINT-1140 AC-4):

     ```
     WARNING: Story {STORY_ID} has an active worktree from another session:
       Story: {storyId}
       Branch: {branchName}
       Path: {worktreePath}
       Registered: {createdAt}

     Options:
       (1) Switch to existing worktree at {worktreePath}
       (2) Take over — PERMANENTLY ABANDON old worktree and create new worktree
       (3) Abort — stop implementation
     ```

     **Autonomy behavior for option selection:**

     | Autonomy     | Option (1) switch | Option (2) take-over | Option (3) abort |
     | ------------ | ----------------- | -------------------- | ---------------- |
     | conservative | Prompt required   | Prompt required      | Prompt required  |
     | moderate     | Auto-select       | **ALWAYS prompt**    | Prompt required  |
     | aggressive   | Auto-select       | **ALWAYS prompt**    | Prompt required  |

     **CRITICAL — Option (2) take-over is NEVER auto-selected at any autonomy level.**
     **This rule overrides all autonomy levels including aggressive. Never auto-select option (2).**

     <!-- Conflict resolution cross-reference:
       - WINT-1130: MCP tools (worktree_get_by_story, worktree_mark_complete)
       - WINT-1140: Original AC-4 specification (3-option prompt UX)
       - WINT-1160: Take-over hardening (AC-2, AC-3, AC-4, AC-5, AC-10)
     -->

     **If user selects option (1) — switch:**
     - Run `/wt:switch` to navigate to the existing worktree
     - Continue to step 4

     **If user selects option (2) — take-over (ordered sequence, WINT-1160 AC-3):**

     First, show secondary confirmation prompt regardless of autonomy level:

     ```
     CONFIRM TAKE-OVER:
     This will PERMANENTLY ABANDON the following worktree:
       Story: {storyId}
       Branch: {branchName}
       Path: {worktreePath}
       Registered: {createdAt}

     This action cannot be undone.
     Type "abandon" to confirm take-over:
     ```

     If user confirms (types exactly "abandon", case-sensitive):
     1. Call `worktree_mark_complete({ worktreeId: <old_worktree_id>, status: 'abandoned', metadata: { abandoned_reason: 'conflict_takeover', taken_over_at: '<ISO_TIMESTAMP>' } })`
     2. Check result — if null or error (WINT-1160 AC-10):

        ```
        WARN: worktree_mark_complete returned null. Old worktree may not have been marked as abandoned.
        [y] Proceed anyway — create new worktree without confirmed abandonment
        [n] Abort — stop and investigate
        ```

        - If user selects [y]: log warning and continue to step 3
        - If user selects [n]: STOP with message: "Take-over aborted. Use /wt:switch to resume the existing worktree, or re-run with --skip-worktree to bypass."

     3. Only if step 1 succeeded or user chose to proceed: call `/wt:new story/{STORY_ID} main` to create new worktree
     4. Register new worktree, continue to step 4

     If user cancels (does not type "abandon"):
     - Re-present options (1), (2), (3)
     - Do NOT call `worktree_mark_complete` or `/wt:new`

     **If user selects option (3) — abort:**
     - Emit:

       ```
       Implementation aborted by user.

       Next steps:
       - To resume with the existing worktree: run /wt:switch and then re-run this command.
       - To skip worktree isolation entirely: re-run this command with --skip-worktree.
       ```

     - STOP. Do not proceed to Phase 0.

4. **Read checkpoint from KB** — Load `pr_number` and `pr_url` if present.
   ```javascript
   const checkpoint = await kb_read_artifact({
     story_id: '{STORY_ID}',
     artifact_type: 'checkpoint',
   })
   ```
   If `pr_number` is not in checkpoint, discover it:
   ```bash
   gh pr list --head story/{STORY_ID} --state open --json number,url
   ```
   Write discovered `pr_number` and `pr_url` to checkpoint artifact in KB:
   ```javascript
   kb_write_artifact({
     story_id,
     artifact_type: 'checkpoint',
     phase: 'setup',
     iteration: 0,
     content: { ...checkpoint.content, pr_number, pr_url },
   })
   ```

Continue to Step 2.

---

### Step 2: Detect Phase

Read checkpoint artifact from KB → determine current_phase and iteration.

```javascript
const checkpoint = await kb_read_artifact({ story_id: '{STORY_ID}', artifact_type: 'checkpoint' })
```

**IF `--gen` mode AND checkpoint artifact is null:**

- Treat as fresh implementation, proceed to Phase 0

### Step 3: Pass Context to Agents

When spawning any agent, include in the prompt:

```markdown
## Decision Context

autonomy_level: {autonomy_level}
batch_mode: {batch_mode}
gen_mode: {gen_mode}

Follow decision protocol in `.claude/agents/_shared/decision-handling.md`

**Note**: When gen_mode is true, this story was generated via --gen flag and bypassed elaboration.
Expect minimal story structure without elab artifacts (analysis, elaboration KB artifacts).
```

## Incremental Commit Policy (Race-Safe)

**Rule: Only leaders/orchestrators commit. Workers never commit.**

Workers (sub-agents spawned in parallel) only write files and return results.
After the leader collects ALL worker results for a phase, the leader performs
a single commit+push:

```bash
git add -A
git commit -m "feat({STORY_ID}): {brief description of completed phase}"
git push
```

This prevents race conditions when parallel workers (e.g., backend + frontend
coders in dev-execute-leader) write to the same worktree simultaneously.

### Commit Points (leader responsibility)

| After Phase       | Commit Message                                             |
| ----------------- | ---------------------------------------------------------- |
| Phase 0 (setup)   | `chore({STORY_ID}): setup complete (artifacts in KB)`      |
| Phase 1 (plan)    | `chore({STORY_ID}): implementation plan (artifacts in KB)` |
| Phase 2 (execute) | `feat({STORY_ID}): implementation`                         |
| Review/Fix loop   | `fix({STORY_ID}): review fixes iteration N`                |

### Why leaders only?

- Workers run in parallel (backend + frontend coders, review specialists)
- Parallel `git add -A && git commit && git push` causes race conditions
- Leader waits for all workers → single atomic commit → push
- Clean, linear commit history on the draft PR

### Step 4-8: Execute Phases

For spawn patterns, read: `.claude/agents/_reference/patterns/dev-workflow-spawn.md`

### Step 2.5: Cohesion Check (Phase 4 — Advisory)

> **Advisory only.** This phase NEVER blocks story completion. All signals route to: log + continue.

**Pre-check: `--skip-cohesion` flag**

If `--skip-cohesion` is set:

```
WARN: Cohesion check skipped (--skip-cohesion flag). Phase 2.5 advisory step bypassed.
```

Skip the rest of Step 2.5 and proceed to Step 8 (Review/Fix Loop).

**Step 2.5a: graph-checker**

Spawn the graph-checker agent (haiku model):

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 2.5a graph-checker {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/graph-checker.agent.md
    Story ID: {STORY_ID}

    Output graph-check-results.json to: tree/story/{STORY_ID}/_implementation/

    Signal when done: GRAPH-CHECKER COMPLETE, GRAPH-CHECKER COMPLETE WITH WARNINGS, or GRAPH-CHECKER BLOCKED
```

Wait for signal:

- `GRAPH-CHECKER BLOCKED` → Log warning: `"Cohesion Advisory: graph-checker BLOCKED — skipping Phase 2.5"`. Proceed to Step 8.
- `graph-check-results.json` absent after completion → Log warning: `"Cohesion Advisory: graph-check-results.json not found — skipping Phase 2.5"`. Proceed to Step 8.
- `GRAPH-CHECKER COMPLETE` or `GRAPH-CHECKER COMPLETE WITH WARNINGS` → Proceed to Step 2.5b.

**Step 2.5b: cohesion-prosecutor**

Gate check: verify both conditions before spawning:

1. graph-checker did NOT signal BLOCKED
2. `cohesion-prosecutor.agent.md` file exists at `.claude/agents/cohesion-prosecutor.agent.md`

If either condition fails:

```
WARN: Cohesion Advisory: cohesion-prosecutor.agent.md not found (WINT-4070 not yet merged). Skipping prosecution step.
```

Proceed to Step 8.

If both conditions are met, spawn cohesion-prosecutor (haiku model):

```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 2.5b cohesion-prosecutor {STORY_ID}"
  prompt: |
    Read instructions: .claude/agents/cohesion-prosecutor.agent.md
    Story ID: {STORY_ID}
    graph-check-results.json: tree/story/{STORY_ID}/_implementation/graph-check-results.json

    Signal when done: PROSECUTION COMPLETE or PROSECUTION BLOCKED
```

Wait for signal:

- `PROSECUTION BLOCKED` → Log warning: `"Cohesion Advisory: prosecution BLOCKED — continuing to review"`. Proceed to Step 8.
- `PROSECUTION COMPLETE` → Read `prosecution-verdict.json` from `{story_path}/_implementation/prosecution-verdict.json`.
  - If `overall_verdict == "INCOMPLETE-BLOCKED"`: Surface advisory note in the evidence artifact:
    ```
    Cohesion Advisory [WINT-4120 Phase 2.5]: {details from prosecution-verdict.json}
    ```
  - All other verdicts: log result, no action required.
  - Proceed to Step 8 in all cases.

**Key rules for Phase 2.5:**

- ALL verdicts are ADVISORY — NEVER hard-block story completion
- BLOCKED signals always route to: log warning + continue
- Pre-Phase-4 stories (no graph data) complete normally via graceful degradation in graph-checker
- Advisory notes are informational only and do not affect review/fix loop

### Step 8: Review/Fix Loop

```
while iteration < max_iterations:
    review_result = spawn_review_phase()
    if review_result == "PASS": break
    if iteration >= max_iterations: break
    spawn_fix_agent()
```

---

## E2E Gate (MANDATORY)

Before marking done, verify:

- `e2e_tests.status == "pass"` OR `"exempt"` (for infra/docs)
- `e2e_tests.mode == "live"`
- `e2e_tests.results.passed > 0`

If gate fails → BLOCKED, do not proceed.

---

## Done

### Clean Pass

1. Update checkpoint artifact in KB: `current_phase: done`, `e2e_gate: passed`
2. Final commit+push (if uncommitted changes remain):
   ```bash
   git add -A
   git commit -m "feat({STORY_ID}): implementation complete"
   git push
   ```
3. Update KB: `kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review", phase: "implementation" })`
4. Log telemetry (fire-and-forget — never blocks workflow):
   ```
   /telemetry-log {STORY_ID} dev-implement-story execute success
   ```
   If the call returns null or throws, log a warning and continue.
5. Report: `IMPLEMENTATION COMPLETE: {STORY_ID}`
6. State next command: `/dev-code-review {STORY_ID}`

### Forced Continue

1. Update checkpoint artifact in KB: `forced: true`, `warnings: [...]`
2. Final commit+push (if uncommitted changes remain):
   ```bash
   git add -A
   git commit -m "feat({STORY_ID}): implementation complete (forced)"
   git push
   ```
3. Update KB: `kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_for_review", phase: "implementation" })`
4. Log telemetry (fire-and-forget — never blocks workflow):
   ```
   /telemetry-log {STORY_ID} dev-implement-story execute partial
   ```
   If the call returns null or throws, log a warning and continue.
5. Report with warnings
6. State next command: `/dev-code-review {STORY_ID}`

---

## Phase 4 Reference

### Cohesion Check (Phase 2.5)

| Component           | Agent file                     | Model | Output file                | Signal                                                          |
| ------------------- | ------------------------------ | ----- | -------------------------- | --------------------------------------------------------------- |
| graph-checker       | `graph-checker.agent.md`       | haiku | `graph-check-results.json` | `GRAPH-CHECKER COMPLETE` / `COMPLETE WITH WARNINGS` / `BLOCKED` |
| cohesion-prosecutor | `cohesion-prosecutor.agent.md` | haiku | `prosecution-verdict.json` | `PROSECUTION COMPLETE` / `PROSECUTION BLOCKED`                  |

**Signal routing (all paths are advisory — never block):**

| Signal                                               | Route                                         |
| ---------------------------------------------------- | --------------------------------------------- |
| `GRAPH-CHECKER BLOCKED`                              | Log warning, skip Phase 2.5 entirely          |
| `graph-check-results.json` absent                    | Log warning, skip Phase 2.5 entirely          |
| `GRAPH-CHECKER COMPLETE [WITH WARNINGS]`             | Proceed to Step 2.5b                          |
| `cohesion-prosecutor.agent.md` missing               | Log warning about WINT-4070, skip prosecution |
| `PROSECUTION BLOCKED`                                | Log warning, continue to Step 8               |
| `PROSECUTION COMPLETE` (verdict: INCOMPLETE-BLOCKED) | Surface advisory note, continue               |
| `PROSECUTION COMPLETE` (other verdicts)              | Log result, continue                          |

**Graceful degradation:** Stories without graph data (pre-Phase-4 infra) complete normally. graph-checker emits `COMPLETE WITH WARNINGS` for empty graph, which is handled by the signal routing table above.

**Skip flag:** Use `--skip-cohesion` to bypass Phase 2.5 entirely. Useful for docs/infra stories where cohesion checks are not meaningful.

---

## Reference

- `.claude/agents/_reference/patterns/dev-workflow-spawn.md` - Spawn patterns
- `.claude/agents/_reference/schemas/evidence-yaml.md` - EVIDENCE.yaml schema
- `.claude/agents/_reference/patterns/session-lifecycle.md` - Session lifecycle
- `.claude/agents/_shared/decision-handling.md` - Decision protocol
- `.claude/agents/_shared/autonomy-tiers.md` - Tier definitions
- `.claude/config/autonomy.yaml` - Autonomy configuration
- `.claude/config/preferences.yaml` - Project preferences
