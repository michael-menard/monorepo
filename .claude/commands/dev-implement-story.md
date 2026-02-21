---
created: 2026-01-24
updated: 2026-02-06
version: 8.1.0
agents:
  - dev-setup-leader.agent.md
  - dev-plan-leader.agent.md
  - dev-execute-leader.agent.md
  - dev-implement-playwright.agent.md
  - dev-proof-leader.agent.md
  - knowledge-context-loader.agent.md
  - code-review-*.agent.md
  - dev-fix-fix-leader.agent.md
artifacts:
  - CHECKPOINT.yaml
  - SCOPE.yaml
  - PLAN.yaml
  - KNOWLEDGE-CONTEXT.yaml
  - EVIDENCE.yaml
  - REVIEW.yaml
shared:
  - _shared/decision-handling.md
  - _shared/autonomy-tiers.md
---

/dev-implement-story {FEATURE_DIR} {STORY_ID} [flags]

> **Fresh context recommended.** Run `/clear` before this command when starting a new story or switching stories. Prior session context can cause agent confusion, stale artifact references, and incorrect phase detection.

You are the **Orchestrator**. You spawn agents and manage the loop.
Do NOT implement code. Do NOT review code. Do NOT fix code.

**Evidence-First**: EVIDENCE.yaml is single source of truth.
**E2E Required**: Stories CANNOT complete without passing E2E tests (live mode).

## Usage

```bash
/dev-implement-story plans/future/wishlist WISH-001
/dev-implement-story plans/future/wishlist WISH-001 --gen
/dev-implement-story plans/future/wishlist WISH-001 --dry-run
/dev-implement-story plans/future/wishlist WISH-001 --max-iterations=5
/dev-implement-story plans/future/wishlist WISH-001 --force-continue
/dev-implement-story plans/future/wishlist WISH-001 --skip-worktree
```

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--gen` | — | Generate minimal story structure and bypass elab |
| `--dry-run` | — | Analyze only, no execution |
| `--max-iterations=N` | 3 | Max review/fix loops |
| `--force-continue` | false | Proceed with warnings |
| `--autonomous=LEVEL` | conservative | Escalation level (see below) |
| `--skip-worktree` | false | Skip worktree verification (Step 1.3); proceed without worktree context |

### --gen Flag (Story Generation)

When `--gen` is specified, the command will:

1. **Generate minimal story structure** - Creates basic `story.yaml` with provided context
2. **Skip elab phase** - Bypasses story elaboration and elab artifacts (ANALYSIS.md, DECISIONS.yaml, etc.)
3. **Move directly to implementation** - Starts Phase 0 (dev-setup-leader) immediately

**Story Structure Generated:**

```yaml
---
story_id: "{STORY_ID}"
title: "{provided or generated title}"
status: "in-progress"
created: "{ISO timestamp}"
updated: "{ISO timestamp}"
tags: []
acceptance_criteria: []
technical_notes: []
---

# {STORY_ID}: {Title}

[Story description provided by user or minimal placeholder]
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
/dev-implement-story plans/future/wishlist WISH-001 --gen
/dev-implement-story plans/future/wishlist WISH-001 --gen --autonomous=moderate
```

### Autonomy Levels

| Level | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|-------|--------|--------|--------|--------|--------|
| `conservative` | Escalate | Escalate | Escalate | Escalate | Escalate |
| `moderate` | Auto | Escalate | Auto | Escalate | Escalate |
| `aggressive` | Auto | Auto | Auto | Escalate | Auto* |

*Tier 5 auto-accepts only if risk is low.

See: `.claude/agents/_shared/autonomy-tiers.md` for tier definitions.
See: `.claude/agents/_shared/decision-handling.md` for decision protocol.

**Usage:**
```bash
/dev-implement-story plans/future/wishlist WISH-001 --autonomous=moderate
```

### Decision Storage

Decisions are stored in the Knowledge Base (not file artifacts):

| KB Tool | Purpose |
|---------|---------|
| `kb_add_decision` | Log auto-accepted and user-approved decisions |
| `kb_add_lesson` | Log deferred/moonshot items for follow-up |
| `kb_search` | Query prior decisions for context |

Query decisions later: `kb_search({ query: "{topic}", tags: ["tier-2"], limit: 5 })`

---

## Architecture

```
ORCHESTRATOR (you)
    │
    ▼
Phase 0: dev-setup-leader (haiku)
    → Writes: CHECKPOINT.yaml, SCOPE.yaml
    │
    ▼
Phase 1: dev-plan-leader (sonnet)
    → Writes: PLAN.yaml, KNOWLEDGE-CONTEXT.yaml
    │
    ▼
Phase 2: dev-execute-leader (sonnet)
    → Steps: Unit → Build → E2E (LIVE mode)
    → Writes: EVIDENCE.yaml ← SOURCE OF TRUTH
    │
    ▼
Phase 3: dev-proof-leader (haiku)
    → Reads: EVIDENCE.yaml ONLY
    → Writes: PROOF-{STORY_ID}.md
    │
    ▼
REVIEW/FIX LOOP (max 3 iterations)
    → Review workers (haiku, parallel)
    → REVIEW.yaml
    → PASS → Exit | FAIL → Fix Agent → Loop
```

---

## Execution

### Step 0: Claim Work Order

Read `.claude/agents/_shared/work-order-claim.md` for the full protocol.

Find `{STORY_ID}` in `{FEATURE_DIR}/WORK-ORDER-BY-BATCH.md` and update the row:
- Set Status to `🔧`
- Set Worker to the worktree name (e.g., `wint-1012`) or `main`

If the file or story row doesn't exist, skip silently.

### Step 1: Initialize
```
feature_dir = "{FEATURE_DIR}"
story_id = "{STORY_ID}"
artifacts_path = f"{feature_dir}/in-progress/{story_id}/_implementation/"
autonomy_level = flags.autonomous || "conservative"
batch_mode = false  # true only when called from /workflow-batch
gen_mode = flags.gen || false
skip_worktree = flags.skip_worktree || false
```

### Step 1.1: Claim Story in KB

**Immediately** claim the story to prevent other agents from picking it up:

1. Call `kb_update_story_status({ story_id: "{STORY_ID}", state: "in_progress", phase: "setup" })`
2. **Guard:** If the call reveals the story is already `in_progress`, another agent likely claimed it. STOP with:
   `"Story {STORY_ID} is already in_progress — another agent may be working on it. Use /wt:status to check."`
   Unless `--force-continue` is set.

### Step 1.5: Generate Story (if --gen flag)

**IF `--gen` flag is present:**

1. **Check if story already exists**
   ```bash
   # Check for existing story in any stage
   if exists({feature_dir}/*/{ story_id}/):
       STOP: "Story {STORY_ID} already exists. Remove --gen flag or use different ID."
   ```

2. **Prompt user for story context** (if not in batch mode)
   ```
   Ask user:
   - Story title (required)
   - Brief description (optional, use placeholder if not provided)
   - Tags (optional, comma-separated)
   ```

3. **Create story directory structure**
   ```bash
   mkdir -p {feature_dir}/in-progress/{story_id}
   ```

4. **Generate minimal story.yaml**
   ```yaml
   ---
   story_id: "{STORY_ID}"
   title: "{user_provided_title or 'Generated Story'}"
   status: "in-progress"
   created: "{ISO_TIMESTAMP}"
   updated: "{ISO_TIMESTAMP}"
   tags: [{user_provided_tags or []}]
   acceptance_criteria: []
   technical_notes: []
   ---

   # {STORY_ID}: {title}

   {user_provided_description or 'Auto-generated story for implementation.'}

   ## Implementation Notes

   This story was generated using `--gen` flag and bypassed elaboration.
   Add acceptance criteria and details as needed during implementation.
   ```

5. **Update feature index** (if exists)
   ```
   /index-update {FEATURE_DIR} {STORY_ID} --status=in-progress
   ```

6. **Report story generation**
   ```
   Story generated: {STORY_ID}
   Location: {feature_dir}/in-progress/{STORY_ID}/
   Elaboration: SKIPPED (--gen mode)

   Proceeding to Phase 0 (setup)...
   ```

**IF `--gen` flag NOT present:**

- Skip story generation
- Expect story to exist in `ready-to-work/` stage (standard flow)
- Validate story exists with elab artifacts

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
       (a) Switch to existing worktree at {worktreePath}
       (b) Take over — mark old worktree as abandoned and create new worktree
       (c) Abort — stop implementation
     ```

     **Autonomy behavior for option selection:**

     | Autonomy | Option (a) switch | Option (b) take-over | Option (c) abort |
     |----------|-------------------|---------------------|-----------------|
     | conservative | Prompt required | Prompt required | Prompt required |
     | moderate | Auto-select | **ALWAYS prompt** | Prompt required |
     | aggressive | Auto-select | **ALWAYS prompt** | Prompt required |

     **CRITICAL — Option (b) take-over ALWAYS requires explicit user confirmation.**
     **This rule overrides all autonomy levels including aggressive. Never auto-select option (b).**

     **If user selects option (a) — switch:**
     - Run `/wt:switch` to navigate to the existing worktree
     - Continue to step 4

     **If user selects option (b) — take-over (ordered sequence, WINT-1160 AC-6):**

     First, show confirmation prompt regardless of autonomy level:
     ```
     WARNING: This will mark the following worktree as abandoned:
       Story: {storyId}
       Branch: {branchName}
       Path: {worktreePath}
       Registered: {createdAt}
     This action cannot be undone. Type 'yes' to confirm take-over:
     ```

     If user confirms (types 'yes'):
     1. Call `worktree_mark_complete({ worktreeId: <old_worktree_id>, status: 'abandoned' })`
     2. Check result — if null or error: emit "Take-over aborted: failed to mark old worktree as abandoned" and STOP (do NOT proceed to step 3)
     3. Only if step 1 succeeded: call `/wt:new story/{STORY_ID} main` to create new worktree
     4. Register new worktree, continue to step 4

     If user cancels (does not confirm):
     - Re-present options (a), (b), (c) OR show abort message
     - Do NOT call `worktree_mark_complete` or `/wt:new`

     **If user selects option (c) — abort:**
     - Emit: "Implementation aborted by user."
     - STOP. Do not proceed to Phase 0.

4. **Read CHECKPOINT.yaml** — Load `pr_number` and `pr_url` if present (set by pm-story via wt-new output).
   If `pr_number` is not in CHECKPOINT.yaml, discover it:
   ```bash
   gh pr list --head story/{STORY_ID} --state open --json number,url
   ```
   Write discovered `pr_number` and `pr_url` to CHECKPOINT.yaml.

Continue to Step 2.

---

### Step 2: Detect Phase
Read CHECKPOINT.yaml → determine current_phase and iteration.

**IF `--gen` mode AND no CHECKPOINT.yaml exists:**
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
Expect minimal story structure without elab artifacts (ANALYSIS.md, DECISIONS.yaml, etc.).
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

| After Phase | Commit Message |
|-------------|---------------|
| Phase 0 (setup) | `chore({STORY_ID}): setup artifacts` |
| Phase 1 (plan) | `chore({STORY_ID}): implementation plan` |
| Phase 2 (execute) | `feat({STORY_ID}): implementation` |
| Phase 3 (proof) | `docs({STORY_ID}): proof artifacts` |
| Review/Fix loop | `fix({STORY_ID}): review fixes iteration N` |

### Why leaders only?

- Workers run in parallel (backend + frontend coders, review specialists)
- Parallel `git add -A && git commit && git push` causes race conditions
- Leader waits for all workers → single atomic commit → push
- Clean, linear commit history on the draft PR

### Step 4-8: Execute Phases
For spawn patterns, read: `.claude/agents/_reference/patterns/dev-workflow-spawn.md`

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
1. Update CHECKPOINT.yaml: `current_phase: done`, `e2e_gate: passed`
2. **Release Work Order**: Update `{FEATURE_DIR}/WORK-ORDER-BY-BATCH.md` — set Status to `🚧`, clear Worker column (see `_shared/work-order-claim.md`)
3. Final commit+push (if uncommitted changes remain):
   ```bash
   git add -A
   git commit -m "feat({STORY_ID}): implementation complete"
   git push
   ```
4. Move story to code review queue:
   ```
   /story-move {FEATURE_DIR} {STORY_ID} needs-code-review --update-status
   ```
5. Report: `IMPLEMENTATION COMPLETE: {STORY_ID}`
6. State next command: `/dev-code-review {FEATURE_DIR} {STORY_ID}`

### Forced Continue
1. CHECKPOINT.yaml: `forced: true`, `warnings: [...]`
2. **Release Work Order**: Update `{FEATURE_DIR}/WORK-ORDER-BY-BATCH.md` — set Status to `🚧`, clear Worker column (see `_shared/work-order-claim.md`)
3. Final commit+push (if uncommitted changes remain):
   ```bash
   git add -A
   git commit -m "feat({STORY_ID}): implementation complete (forced)"
   git push
   ```
4. Move story to code review queue:
   ```
   /story-move {FEATURE_DIR} {STORY_ID} needs-code-review --update-status
   ```
5. Report with warnings
6. State next command: `/dev-code-review {FEATURE_DIR} {STORY_ID}`

---

## Reference

- `.claude/agents/_reference/patterns/dev-workflow-spawn.md` - Spawn patterns
- `.claude/agents/_reference/schemas/evidence-yaml.md` - EVIDENCE.yaml schema
- `.claude/agents/_reference/patterns/session-lifecycle.md` - Session lifecycle
- `.claude/agents/_shared/decision-handling.md` - Decision protocol
- `.claude/agents/_shared/autonomy-tiers.md` - Tier definitions
- `.claude/config/autonomy.yaml` - Autonomy configuration
- `.claude/config/preferences.yaml` - Project preferences

## Abort / Error Recovery

If this command is interrupted after Step 1.1, the story stays `in_progress` in the KB (preventing other agents from picking it up). To release manually:
`kb_update_story_status({ story_id: "{STORY_ID}", state: "ready_to_work" })`
