---
name: plan-cleanup
description: 'Investigate a KB plan and execute a full cleanup. Audits the plan itself against the current codebase (implemented? stale? architecturally drifted?), then audits linked stories for implementation status, content quality, and scope relevance. Categorizes stories into cancel/complete/rewrite/relocate/keep and executes all actions autonomously.'
---

# /plan-cleanup — Full Plan Cleanup

## Usage

```
/plan-cleanup <plan-slug> [--dry-run] [--review]
```

**Examples:**

```bash
/plan-cleanup humming-spinning-key           # autonomous — investigate + execute
/plan-cleanup workflow-roadmap-ui --dry-run  # show what would happen, execute nothing
/plan-cleanup my-plan --review               # opt-in to interactive review loop before execution
```

## Flags

| Flag | Behavior |
|------|----------|
| *(none)* | **Default: autonomous.** Investigate, challenge, synthesize, execute. No human gate. |
| `--dry-run` | Full investigation + DA challenge pass, print action plan, execute nothing. Use this first when nervous. |
| `--review` | Opt-in to Phase 2.5 interactive review. Surfaces only DA-unresolved conflicts for human decision. |

## Purpose

Plans accumulate cruft: empty story stubs, wrong statuses, stories that were completed but never advanced, scope that drifted with the architecture. But plans themselves also go stale — migrations get run, code gets refactored, and the plan's assumptions no longer match reality. This skill audits **both the plan and its stories** in one pass, using adversarial validation to prevent bad decisions.

The Devil's Advocate agent (Phase 1.5) challenges every weak verdict before it becomes an action. By the time execution starts, every decision has survived scrutiny.

---

## Phase 0: Plan Content Audit

This phase runs **before** story investigation and works even when the plan has zero stories. It validates the plan's `rawContent` against the actual codebase and database to determine if the plan is still needed, already done, or needs updating.

### Step 0.1 — Extract Auditable Claims

Parse the plan's `rawContent` and extract every concrete, verifiable claim. These fall into categories:

| Claim Type | Examples |
|------------|----------|
| **DB objects** | "enum `public.story_state_enum` exists", "function `public.audit_plan_mutations()` is orphaned" |
| **Code references** | "Drizzle schema references `public.{enum}`", "trigger function references `story_state_enum` values" |
| **Migration steps** | "DROP FUNCTION IF EXISTS public.audit_plan_mutations()", "ALTER column to use `workflow.{enum}`" |
| **Architecture assumptions** | "no BullMQ", "KB is source of truth", "workflow schema owns all workflow objects" |
| **Acceptance criteria** | Each `- [ ]` or `- [x]` item in the plan |

Store these as `PLAN_CLAIMS` — a list of `{ claim, type, verifiable: bool }`.

### Step 0.2 — Spawn Plan Audit Agent

Launch a single Explore agent (`subagent_type: "Explore"`, thoroughness: "very thorough") with the full plan content and extracted claims.

> **Task:** You are auditing a plan against the current codebase and database schema to determine what has already been done, what is still needed, and what assumptions have drifted.
>
> **Plan title:** {title}
> **Plan slug:** {plan_slug}
> **Plan content:** {rawContent}
>
> For each auditable claim, verify against the codebase:
>
> **For DB-related claims** (enums, functions, triggers, schemas):
> - Search `apps/api/knowledge-base/src/db/migrations/` for migrations that create, alter, or drop the referenced objects
> - Search `packages/backend/db/` for Drizzle schema definitions
> - Search for any SQL files referencing the objects: `*.sql` files across the repo
> - Check `apps/api/knowledge-base/src/db/schema.ts` and related schema files for enum definitions
>
> **For code-related claims** (imports, references, patterns):
> - Search the codebase for the specific patterns mentioned (e.g., `public.story_state_enum`, hardcoded schema references)
> - Check if referenced files/functions still exist
>
> **For architecture assumptions:**
> - Verify they match current reality (e.g., "no BullMQ" — is BullMQ actually gone?)
> - Check if the assumption was true when the plan was written but has since changed
>
> **For each claim, determine:**
> - **DONE**: The work described in this claim has been completed (cite migration file or commit)
> - **STILL_NEEDED**: The problem described still exists in the codebase (cite evidence)
> - **STALE**: The claim references something that no longer exists or has changed shape (explain what changed)
> - **UNVERIFIABLE**: Cannot determine from codebase alone (e.g., requires running a DB query)
>
> **For each acceptance criterion**, determine: MET / NOT_MET / PARTIALLY_MET / UNVERIFIABLE
>
> **Output format:**
> ```
> ## Claim Audit
>
> 1. {claim text}
>    Verdict: {DONE|STILL_NEEDED|STALE|UNVERIFIABLE}
>    Evidence: {file:line or migration name — REQUIRED for DONE; description of what still exists for STILL_NEEDED}
>
> ## Acceptance Criteria Audit
>
> 1. {AC text}
>    Verdict: {MET|NOT_MET|PARTIALLY_MET|UNVERIFIABLE}
>    Evidence: {what satisfies or blocks this}
>
> ## Plan-Level Verdict
>
> {STILL_VALID|NEEDS_UPDATE|ALREADY_IMPLEMENTED|SUPERSEDED}
>
> Rationale: {2-3 sentences explaining the overall assessment}
>
> Breakdown:
> - Claims DONE: {N}/{total}
> - Claims STILL_NEEDED: {N}/{total}
> - Claims STALE: {N}/{total}
> - Claims UNVERIFIABLE: {N}/{total}
> - AC MET: {N}/{total}
> ```

### Step 0.3 — Evaluate Plan Verdict

Based on the audit agent's results, determine the plan-level action:

| Plan Verdict | Criteria | Action |
|-------------|----------|--------|
| **ALREADY_IMPLEMENTED** | >80% of claims are DONE AND all critical AC are MET | Mark plan `implemented`, archive, skip story investigation |
| **SUPERSEDED** | Plan references patterns/objects that no longer exist AND replacement patterns are already in place | Mark plan `superseded`, archive, skip story investigation |
| **NEEDS_UPDATE** | Mix of DONE and STILL_NEEDED claims, or STALE assumptions that change the scope | Update plan `rawContent` with current-state annotations, continue to story investigation |
| **STILL_VALID** | Most claims are STILL_NEEDED, assumptions hold | Continue to story investigation unchanged |

**Print the Plan Audit Report:**

```
══════════════════════════════════════════════
PHASE 0: PLAN CONTENT AUDIT
══════════════════════════════════════════════
Plan: {title} ({plan_slug})

Claims: {done}/{total} done | {needed}/{total} still needed | {stale}/{total} stale | {unverifiable}/{total} unverifiable
AC:     {met}/{total} met | {not_met}/{total} not met | {partial}/{total} partial

Plan Verdict: {STILL_VALID | NEEDS_UPDATE | ALREADY_IMPLEMENTED | SUPERSEDED}
Rationale: {agent's rationale}

{If NEEDS_UPDATE, list the stale claims that need rewriting}
{If ALREADY_IMPLEMENTED, list the key evidence of completion}
══════════════════════════════════════════════
```

### Step 0.4 — Early Exit or Continue

- **ALREADY_IMPLEMENTED or SUPERSEDED**: Execute the plan status update immediately (see Phase 3 "Plan Metadata Update"), cancel all non-completed stories if any exist, print the Phase 4 summary, and stop. No need for story investigation.
- **NEEDS_UPDATE**: Before continuing to Phase 1, update the plan's `rawContent` via `kb_update_plan` to annotate which sections are done, which are stale, and what the current state actually is. Prepend a `## Current State ({date})` section to the plan content. Then continue to Phase 1 with the updated context.
- **STILL_VALID**: Continue to Phase 1 unchanged.

**Zero-story plans**: If the plan has zero linked stories AND the verdict is STILL_VALID or NEEDS_UPDATE, print a recommendation to generate stories (suggest `/story-generation-from-refined-plan` or `/pm-story generate`) and stop after Phase 0. There are no stories to investigate.

---

## Phase 1: Investigation (parallel workers)

### Step 1.1 — Load Plan + Stories

Load the `kb_get_plan` and `kb_list_stories` MCP tools via ToolSearch, then:

1. Call `kb_get_plan` with `plan_slug` and `include_content: true`
2. If not found, error and stop
3. Call `kb_list_stories` with `plan_slug` to get all linked stories (paginate if needed — repeat with offset: 100, 200 until exhausted)
4. Skip stories with state `completed` or `cancelled` — never process them
5. Store the remaining list as `LINKED_STORIES`

Print a quick inventory:

```
Plan: {title} ({plan_slug})
Status: {status} | Priority: {priority} | Stories: {total} ({skipped} already done/cancelled)
Mode: {AUTONOMOUS | DRY-RUN | REVIEW}
```

### Step 1.2 — Spawn 3 Parallel Explore Agents

Launch all 3 sub-agents simultaneously using the Task tool (`subagent_type: "Explore"`).

**Provide each agent with:** the plan title, plan slug, full story content (ID, title, description, current state) for every story in `LINKED_STORIES`.

---

#### Agent 1: Codebase Audit

> **Task:** For each story in the provided list, check whether the described feature is already implemented in the codebase.
>
> Search these locations first:
> - `apps/web/workflow-roadmap/src/` — roadmap UI components, hooks, pages
> - `apps/api/workflow-admin/` — admin API routes, services
> - `apps/web/main-app/src/` — main app features
> - `apps/api/knowledge-base/src/` — KB MCP tools, CRUD operations
> - `packages/backend/orchestrator/src/` — LangGraph graphs, nodes, state
> - `.claude/skills/` and `.claude/agents/` — skills and agents
>
> For each story, determine:
> - **IMPLEMENTED**: Feature clearly exists in code (cite exact file:line — this is mandatory)
> - **PARTIALLY**: Some of it exists, some doesn't (cite what exists and what doesn't)
> - **NOT_FOUND**: No evidence in codebase (list locations searched)
>
> Evidence requirements:
> - IMPLEMENTED claims with no file:line citation will be overruled by the Devil's Advocate
> - PARTIALLY claims must describe *what* is present and *what* is missing — vague "some of it exists" is insufficient
>
> Output format per story:
> ```
> {STORY_ID}: {IMPLEMENTED|PARTIALLY|NOT_FOUND}
>   Evidence: {file:line — REQUIRED for IMPLEMENTED; "searched X, Y, Z — not found" for NOT_FOUND}
>   Partial detail: {what exists | what's missing — REQUIRED for PARTIALLY}
>   Notes: {any relevant context}
> ```

---

#### Agent 2: Story Content Quality

> **Task:** For each story in the provided list, assess content quality and KB state accuracy.
>
> For each story, check:
>
> 1. **Title quality**: Is the title a real description or just the story ID (e.g., "WISH-2045") or a generic stub?
> 2. **Description quality**: Does it have a meaningful description, or is it null/empty?
> 3. **State accuracy**: Does the current KB state make sense? Flag obviously wrong states:
>    - `in_progress` or `in_qa` with no description → likely a stub, wrong status
>    - `backlog` but the title suggests a sub-task of completed work → likely should be cancelled
>    - `ready_for_qa` or `needs_code_review` for non-critical stubs → suspicious
>    - `blocked` with no blocked_reason or blockedByStory → stale block
> 4. **Stub detection**: Mark a story as a stub if: title equals story ID, OR title is ≤ 3 words AND description is null/empty
>
> Output format per story:
> ```
> {STORY_ID} [{current_state}]: {GOOD|STUB|SUSPECT}
>   Title quality: {real|stub|generic}
>   Description: {present|missing}
>   State concern: {none | "description of concern"}
> ```

---

#### Agent 3: Scope Relevance

> **Task:** For each story in the provided list, assess whether its scope still makes sense given the current architecture.
>
> Current architecture context:
> - **Frontend**: React 19 + Tailwind + shadcn/ui. Component library at `@repo/app-component-library`. Zod-first types, no TypeScript interfaces.
> - **Backend**: AWS Lambda + API Gateway. Aurora PostgreSQL. No BullMQ, no Redis for workflow.
> - **Workflow tools**: KB MCP server (`apps/api/knowledge-base`) is the source of truth for stories/plans/artifacts. Claude Code agents in `.claude/agents/` and skills in `.claude/skills/`. LangGraph orchestrator at `packages/backend/orchestrator`.
> - **Testing**: Vitest + React Testing Library for unit tests. Playwright + Cucumber/BDD for E2E. MSW for API mocking in unit tests only (not Playwright).
> - **Stories**: KB-only (no filesystem story directories). No WORK-ORDER-BY-BATCH.md, no story.yaml files.
>
> For each story, determine:
> - **IN_SCOPE**: Story scope is valid for this plan and architecture
> - **WRONG_PLAN**: Story clearly belongs to a different plan/feature (you MUST suggest where, or this verdict is invalid)
> - **STALE_SCOPE**: Story references obsolete patterns (BullMQ, Redis, filesystem stories, barrel files, etc.) — cite the specific obsolete reference
> - **DUPLICATE**: Scope overlaps significantly with another story in this plan (cite the overlapping story ID)
>
> Output format per story:
> ```
> {STORY_ID}: {IN_SCOPE|WRONG_PLAN|STALE_SCOPE|DUPLICATE}
>   Reason: {1-2 sentence explanation with specific evidence}
>   Suggestion: {concrete action — "move to plan X", "rewrite to replace Redis with KB MCP pattern"}
> ```

---

## Phase 1.5: Devil's Advocate Challenge

After all 3 agents return, **before synthesis**, spawn a Devil's Advocate agent (`subagent_type: "Explore"`) to challenge weak verdicts.

> **Task:** You are the Devil's Advocate for a plan cleanup process. Three specialist agents have assessed a set of stories. Your job is to challenge every verdict that lacks sufficient evidence or contains logical gaps. You are not looking for reasons to agree — you are looking for reasons to doubt.
>
> You have received:
> - Agent 1 (Codebase Audit) results
> - Agent 2 (Content Quality) results
> - Agent 3 (Scope Relevance) results
>
> **Challenge every verdict that matches these patterns:**
>
> 1. **Unproven IMPLEMENTED** — Agent 1 says IMPLEMENTED but provides no file:line citation. Overrule → reclassify as NOT_FOUND.
>
> 2. **Reckless CANCEL candidate** — A story has a real title AND a real description (Agent 2 = GOOD), yet the synthesis would cancel it. Challenge: "This story has real content. What makes it unsalvageable vs. rewritable? If the only crime is stale architecture references, REWRITE_SCOPE is more appropriate than CANCEL."
>
> 3. **Premature COMPLETE** — Agent 1 says PARTIALLY implemented, but the synthesis wants to mark it completed. Challenge: "Partial implementation is not complete implementation. Reclassify as KEEP or REWRITE_SCOPE until the remaining work is defined."
>
> 4. **Ungrounded WRONG_PLAN** — Agent 3 says WRONG_PLAN but provides no specific destination plan/feature. Challenge: "Cannot relocate without a target. Reclassify as KEEP until a destination is identified."
>
> 5. **Vague STALE_SCOPE** — Agent 3 says STALE_SCOPE but doesn't name the specific obsolete reference. Challenge: "What specifically is stale? Without a named pattern, this verdict is unverifiable."
>
> 6. **Agent disagreement with no clear winner** — Agents 1, 2, and 3 disagree and no verdict has supporting evidence strong enough to win. Mark these as ESCALATED with a summary of the disagreement.
>
> For each story, output:
> ```
> {STORY_ID}: {CONFIRMED | OVERRULED | CHALLENGED | ESCALATED}
>   Original verdicts: A1={...} A2={...} A3={...}
>   DA ruling: {what you decided and why}
>   Final recommendation: {CANCEL | COMPLETE | REWRITE_SCOPE | RELOCATE | KEEP}
>   Confidence: {HIGH | MEDIUM | LOW}
> ```
>
> CONFIRMED = all 3 agents agree, evidence is strong, DA has no objection.
> OVERRULED = DA found a fatal flaw in a verdict, DA's recommendation replaces it.
> CHALLENGED = DA found a concern but agents provided enough evidence to survive — DA recommends but notes the concern.
> ESCALATED = DA cannot resolve — genuine conflict with no clear answer.

---

## Phase 2: Synthesize Findings

After the DA returns, synthesize into the final action plan using DA verdicts as ground truth.

Cross-reference DA output for each story and assign a **primary action**:

| Action | Criteria |
|--------|----------|
| **CANCEL** | DA CONFIRMED or OVERRULED → CANCEL. Story is stub (title = ID or ≤3 words + no description) with no codebase evidence. |
| **COMPLETE** | DA CONFIRMED → COMPLETE. Story is IMPLEMENTED in codebase (file:line evidence present) but KB state is not `completed`. |
| **REWRITE_SCOPE** | DA CONFIRMED or CHALLENGED → REWRITE_SCOPE. Story has real value but stale/wrong description. |
| **RELOCATE** | DA CONFIRMED → RELOCATE. Story belongs elsewhere AND a target plan/feature is identified. |
| **KEEP** | DA CONFIRMED → KEEP. Story is correctly scoped, right state, no action needed. |
| **KEEP** | DA ESCALATED in autonomous mode. Cannot resolve → preserve. (See Phase 2.5 for --review mode.) |
| **KEEP** | PARTIALLY implemented (Agent 1) + real description (Agent 2). Keep until scope is clarified. |

**PARTIAL default rule:** PARTIALLY implemented stories are NOT auto-completed. They default to KEEP unless:
- The description is stale/wrong AND the partial implementation is clear → REWRITE_SCOPE
- The title is a stub AND the partial implementation is trivial → CANCEL (DA must confirm)

Print the assessment table:

```
## Cleanup Assessment: {plan_title}
## DA Challenge Log

| Story | Title | State | A1 | A2 | A3 | DA | Action | Confidence |
|-------|-------|-------|----|----|----|-----|--------|------------|
| ...   | ...   | ...   | .. | .. | .. | ..  | ...    | ...        |

CANCEL: {N} stories
COMPLETE: {N} stories
REWRITE_SCOPE: {N} stories
RELOCATE: {N} stories
KEEP: {N} stories (no action)
ESCALATED → KEEP: {N} stories (DA could not resolve, preserved)
```

---

## Phase 2.5: Interactive Review (--review mode only)

This phase runs **only when `--review` is passed** or **when DA has ESCALATED items and you want human input**.

In autonomous mode (default): skip entirely. Proceed directly to Phase 3.

### What to surface (--review mode)

Only surface:

1. **DA ESCALATED items** — DA could not resolve, genuine agent conflict. Present DA's conflict summary and ask once.
2. **Plan status change** — if considering archiving or marking the plan implemented. One question covers all.

### What NOT to surface

- Anything DA CONFIRMED or OVERRULED → trust the process
- Already-`completed` or `cancelled` stories → never surface
- Clear stubs → DA handles these

### Questions

Batch all open questions into at most 2 `AskUserQuestion` calls. For each question, offer concrete options with a clear default. Never ask "what should I do?" — offer a table with recommended answers pre-selected.

After incorporating answers, proceed immediately to Phase 3. No final "proceed?" gate.

---

## Phase 3: Execute All Actions

Execute in this order: CANCEL → COMPLETE → REWRITE_SCOPE → RELOCATE. Load required MCP tools via ToolSearch as needed.

In `--dry-run` mode: print each action that *would* be taken but execute nothing. Print `[DRY RUN]` before each action.

**If during execution you encounter an unexpected state** (e.g., a state transition fails, an artifact write is rejected), log the failure, skip that story, and continue. Surface failures in the Phase 4 summary under "EXECUTION ERRORS" — do not pause mid-execution to ask.

### Cancellations

For each story in CANCEL:

```javascript
kb_update_story_status({ story_id, state: "cancelled" })
```

Print: `✓ Cancelled {STORY_ID}: {title}`

### Status Corrections (COMPLETE)

For stories that are implemented but have the wrong KB state, walk them through the state machine to `completed`.

The DB state transition trigger requires artifacts to exist before allowing certain advances. Write retroactive artifacts as needed using `kb_write_artifact` with `retroactive: true`.

State machine path: `backlog → created → elab → ready → in_progress → needs_code_review → ready_for_qa → in_qa → completed`

Required artifacts per transition:
- `in_progress → needs_code_review`: needs an `evidence` artifact
- `needs_code_review → ready_for_qa`: needs a `code_review` artifact
- `ready_for_qa → in_qa`: needs a `qa_gate` artifact
- `in_qa → completed`: qa_gate artifact must exist

Retroactive artifact template:
```javascript
kb_write_artifact({
  story_id: STORY_ID,
  artifact_type: "evidence",   // or code_review, qa_gate, elaboration
  content: {
    retroactive: true,
    note: "Work completed as part of {plan_title}. Status correction applied {date}.",
    verdict: "PASS",
    evidence: "{file:line from Agent 1 codebase audit}",
    timestamp: new Date().toISOString()
  }
})
```

**Walk each story through state transitions one step at a time.** After each `kb_update_story_status` call, verify the state changed before proceeding to the next transition.

Print per story:
```
✓ Completed {STORY_ID}: {title}
  Path: {old_state} → ... → completed
  Artifacts written: {list}
```

### Scope Updates (REWRITE_SCOPE)

For each story in REWRITE_SCOPE:

```javascript
kb_update_story({
  story_id: STORY_ID,
  title: "Updated title reflecting current scope",
  description: "SCOPE UPDATE ({date}): {new description reflecting current architecture and actual intent}"
})
```

Print: `✓ Rewrote scope for {STORY_ID}: "{old_title}" → "{new_title}"`

### Relocations (RELOCATE)

For each story in RELOCATE:

```javascript
kb_update_story({
  story_id: STORY_ID,
  feature: "correct-feature-slug",
  epic: "CORRECT-PREFIX"   // if known
})
```

Print: `✓ Relocated {STORY_ID} to feature: {new_feature}`

### Plan Metadata Update — HARD GATES

After all story actions, update the plan. The behavior differs based on whether the plan is being retired or continuing active work.

#### Step 1: Determine final plan status

- If all non-completed stories were cancelled → `archived`
- If all stories are now completed → `implemented`
- If some stories are still active → plan continues (V2 path below)
- Otherwise → leave status unchanged

#### Step 2A: Retiring a plan (archived or implemented)

If the plan is being archived or marked implemented, update it in place:

```javascript
kb_update_plan({
  plan_slug: PLAN_SLUG,
  status: newStatus,  // "archived" or "implemented"
  summary: `${existing_summary ?? ''} [Cleanup {YYYY-MM-DD}: ${newStatus}]`.trim(),
  tags: [...existing_tags, "cleanup-{YYYY-MM-DD}"]
})
```

#### Step 2B: Creating a V2 plan (HARD GATE — non-retired plans)

**THIS IS MANDATORY.** If the plan is NOT being retired, you MUST create a new V2 plan and supersede the original. This is not optional. Do not skip any step.

**Step 2B.1 — Create the V2 plan:**

Generate the V2 slug by appending `-v2` to the original slug. Build a new summary from Phase 0 audit findings (what's done, what remains, what changed). Copy the `raw_content` from the original plan, prepending a `## Current State ({date})` section.

```javascript
const v2Slug = PLAN_SLUG + "-v2"
const v2Title = existing_title + " V2"
const v2Summary = buildCleanupSummary(phase0AuditResults, storyActionSummary)
// e.g. "Migrate workflow enums from public to workflow schema. 3/7 claims done, 4 still needed. 2 stories cancelled (stubs), 1 scope rewritten."

kb_upsert_plan({
  plan_slug: v2Slug,
  title: v2Title,
  raw_content: updatedRawContent,  // original content with "## Current State" prepended
  summary: v2Summary,
  status: "in-progress",
  story_prefix: existing_story_prefix,  // inherit from original
  priority: existing_priority,           // inherit from original
  tags: [...existing_tags, "v2", "cleanup-{YYYY-MM-DD}"],
  supersedes_plan_slug: PLAN_SLUG,      // link V2 → original
  parent_plan_slug: existing_parent_plan_slug,  // inherit hierarchy
})
```

**Step 2B.2 — Supersede the original plan:**

Mark the original plan as `superseded`. The V2 plan's ID is needed for the `superseded_by` field, but if you don't have the UUID, just set the status — the `supersedes_plan_slug` on the V2 already establishes the link.

```javascript
kb_update_plan({
  plan_slug: PLAN_SLUG,
  status: "superseded",
  summary: `${existing_summary ?? ''} [Superseded by ${v2Slug} on {YYYY-MM-DD}]`.trim(),
  tags: [...existing_tags, "cleanup-{YYYY-MM-DD}"]
})
```

**Step 2B.3 — Move active stories to the V2 plan:**

All stories that are NOT `cancelled` or `completed` must be re-linked to the V2 plan. For each active story:

```javascript
kb_update_story({
  story_id: STORY_ID,
  plan_slug: v2Slug
})
```

Print per story: `  → Moved {STORY_ID} to {v2Slug}`

**HARD GATE CHECKLIST — all must be true before proceeding to Phase 4:**
- [ ] V2 plan exists with `-v2` slug suffix
- [ ] V2 plan title ends with " V2"
- [ ] V2 plan has `v2` tag
- [ ] V2 plan has `supersedes_plan_slug` pointing to original
- [ ] V2 plan has updated summary reflecting current state
- [ ] Original plan status is `superseded`
- [ ] All active stories are linked to V2 plan (not the original)

If any gate fails, log the failure and **do not proceed to Phase 4**. Print the gate checklist with pass/fail status.

Print:
```
✓ V2 plan created: {v2Slug} | status: in-progress | tags: {tags}
✓ Original plan superseded: {PLAN_SLUG} → superseded
✓ Stories moved: {N} stories relocated to {v2Slug}
```

---

## Phase 4: Summary Report

```
═══════════════════════════════════════════════════════════════
PLAN CLEANUP COMPLETE: {plan_title}
Date: {date} | Mode: {AUTONOMOUS | DRY-RUN | REVIEW}
═══════════════════════════════════════════════════════════════

PLAN CONTENT AUDIT (Phase 0)
──────────────────────────────────────────────────────────────
Plan Verdict:    {STILL_VALID | NEEDS_UPDATE | ALREADY_IMPLEMENTED | SUPERSEDED}
Claims:          {done}/{total} done | {needed}/{total} needed | {stale}/{total} stale
Acceptance:      {met}/{total} met | {not_met}/{total} not met
{If early exit: "⚡ Early exit — plan {archived/implemented}, no story investigation needed"}

DA CHALLENGE LOG
──────────────────────────────────────────────────────────────
Confirmed (no challenge):  {N}
Overruled (DA corrected):  {N}
Challenged (survived DA):  {N}
Escalated → KEEP:          {N}

ACTION SUMMARY
──────────────────────────────────────────────────────────────
Category         Count   Story IDs
──────────────── ─────── ──────────────────────────────────────
Cancelled        {N}     {STORY_ID, ...}
Completed        {N}     {STORY_ID, ...}
Scope rewritten  {N}     {STORY_ID, ...}
Relocated        {N}     {STORY_ID, ...}
Kept as-is       {N}     {STORY_ID, ...}
Preserved (DA)   {N}     {STORY_ID, ...}  ← escalated, kept safe
──────────────── ─────── ──────────────────────────────────────
Total processed  {N}

CANCELLED DETAILS
  {STORY_ID}: {title} — {reason} [DA: CONFIRMED|OVERRULED]
  ...

COMPLETED DETAILS
  {STORY_ID}: {title} — walked from {old_state} → completed
  Evidence: {file:line}
  ...

SCOPE REWRITES
  {STORY_ID}: "{old_title}" → "{new_title}"
  ...

RELOCATIONS
  {STORY_ID}: moved to feature {new_feature}
  ...

ESCALATED (preserved, needs manual review)
  {STORY_ID}: {title} — {DA conflict summary}
  ...

EXECUTION ERRORS
  {STORY_ID}: {what failed} — skipped
  ...

PLAN STATUS
  {plan_slug}: {old_status} → {new_status}
  Title: "{old_title}" → "{new_title}"
  Tags: {tags}
═══════════════════════════════════════════════════════════════
```

---

## Notes

- **Phase 0 always runs first** — even with zero stories, the plan content itself is audited against the codebase
- Phase 0 can trigger early exit (ALREADY_IMPLEMENTED / SUPERSEDED) — no story investigation needed
- Zero-story plans that are STILL_VALID or NEEDS_UPDATE end after Phase 0 with a recommendation to generate stories
- Stories with state `completed` or `cancelled` are skipped entirely before investigation
- DA ESCALATED stories always default to KEEP in autonomous mode — never destroy when uncertain
- COMPLETE actions require writing retroactive artifacts — if `kb_write_artifact` is unavailable, fall back to advancing state directly and note the artifact gap
- Load MCP tools lazily via ToolSearch — don't assume all tools are pre-loaded
- The Explore agents (Phase 0 audit, 1, 2, 3, DA) search the codebase and evaluate; all KB mutations happen in the main conversation after all agents return
- Execution errors do not halt the run — log and continue, surface in Phase 4
- `--dry-run` is the safe first pass. Run it to build confidence, then run without it to execute.
