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
```

## Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--gen` | — | Generate minimal story structure and bypass elab |
| `--dry-run` | — | Analyze only, no execution |
| `--max-iterations=N` | 3 | Max review/fix loops |
| `--force-continue` | false | Proceed with warnings |
| `--autonomous=LEVEL` | conservative | Escalation level (see below) |

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

### Step 1: Initialize
```
feature_dir = "{FEATURE_DIR}"
story_id = "{STORY_ID}"
artifacts_path = f"{feature_dir}/in-progress/{story_id}/_implementation/"
autonomy_level = flags.autonomous || "conservative"
batch_mode = false  # true only when called from /workflow-batch
gen_mode = flags.gen || false
```

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
2. Move: `in-progress/{STORY_ID}` → `ready-for-qa/{STORY_ID}`
3. Report: `IMPLEMENTATION COMPLETE: {STORY_ID}`

### Forced Continue
1. CHECKPOINT.yaml: `forced: true`, `warnings: [...]`
2. Move to `ready-for-qa-with-warnings`
3. Report with warnings

---

## Reference

- `.claude/agents/_reference/patterns/dev-workflow-spawn.md` - Spawn patterns
- `.claude/agents/_reference/schemas/evidence-yaml.md` - EVIDENCE.yaml schema
- `.claude/agents/_reference/patterns/session-lifecycle.md` - Session lifecycle
- `.claude/agents/_shared/decision-handling.md` - Decision protocol
- `.claude/agents/_shared/autonomy-tiers.md` - Tier definitions
- `.claude/config/autonomy.yaml` - Autonomy configuration
- `.claude/config/preferences.yaml` - Project preferences
