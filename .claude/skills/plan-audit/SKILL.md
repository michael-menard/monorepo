---
name: plan-audit
description: 'Deep audit of a KB plan against current codebase reality. Determines if the plan is still valid/needed, what has already been implemented, and what modifications are required before implementation.'
---

# /plan-audit — Audit Plan Against Current Reality

## Usage

```
/plan-audit <plan-slug>
/plan-audit --all [--status=draft] [--dry-run]
/plan-audit --report
```

## Purpose

Plans go stale. This skill reads a plan from the KB, then spawns parallel sub-agents to audit it against the current codebase, schema, and other plans. A devil's advocate agent then challenges the findings, demanding proof for every claim. It produces a grounded verdict on whether the plan should proceed, be modified, be merged with another plan, or be archived.

Results are persisted to a JSON audit file for cumulative tracking across multiple runs. Every decision made and action taken is recorded in the entry.

## Inputs

| Argument       | Required | Description                                                          |
| -------------- | -------- | -------------------------------------------------------------------- |
| plan-slug      | yes\*    | The slug of the plan to audit (from `kb_get_plan`)                   |
| `--all`        | no       | Audit all non-archived/superseded/implemented plans sequentially     |
| `--status=X`   | no       | With `--all`, filter to only plans with this status (e.g., `draft`)  |
| `--dry-run`    | no       | With `--all`, list plans that would be audited without running       |
| `--report`     | no       | Display summary of the current audit file without running new audits |
| `--auto-apply` | no       | Automatically apply ARCHIVE verdicts without prompting               |

\*Required unless `--all`, `--report`, or `--dry-run` is used.

## Audit Output File

All audit results are persisted to a single JSON file per session:

**Path:** `.claude/plan-audit-{YYYY-MM-DD}.json`

If the file already exists for today's date, append to it (skip plans already audited unless `--force` is passed).

### File Schema

```json
{
  "auditDate": "2026-03-20",
  "totalPlans": 67,
  "audited": 15,
  "summary": {
    "PROCEED": 3,
    "PROCEED_WITH_CHANGES": 4,
    "PARTIALLY_IMPLEMENTED": 2,
    "MERGE": 1,
    "NEEDS_REWRITE": 2,
    "ARCHIVE": 3
  },
  "entries": [
    {
      "slug": "worktree-first-draft-pr-lifecycle",
      "title": "Worktree-First Development Workflow",
      "status": "draft",
      "priority": "P1",
      "planType": "monorepo:tooling",
      "verdict": "ARCHIVE",
      "verdictRationale": "65-70% implemented across wt-* skills and agent leaders. Remaining gaps are minor wiring issues. Plan references obsolete filesystem architecture.",
      "validity": {
        "stillNeeded": "partially",
        "problemStillReal": false,
        "duplicates": ["sequential-dancing-lobster"],
        "architectureAlignment": "drifted",
        "notes": "Core workflow already implemented in pm-story-generation-leader Phase 5.5, git-ops agent, qa-verify-completion-leader"
      },
      "implementationStatus": {
        "estimatedCompletion": 70,
        "implemented": [
          "wt-new creates worktrees",
          "wt-commit-and-pr repurposed for draft PR updates",
          "wt-merge-pr squash-merges on QA PASS",
          "CHECKPOINT.yaml stores pr_number via KB artifacts"
        ],
        "notImplemented": [
          "wt-new doesn't auto-create draft PR",
          "Code-review doesn't call gh pr ready",
          "Leader-only commit policy not enforced"
        ]
      },
      "modifications": {
        "staleReferences": [
          ".claude/commands/*.md referenced but agents are now primary",
          "CHECKPOINT.yaml assumed as filesystem, now KB artifacts",
          "FEATURE_DIR pattern obsolete — KB-only stories"
        ],
        "architectureChanges": [
          "Update to KB artifact model (kb_read_artifact/kb_write_artifact)",
          "Use correct KB state names (ready_for_review not needs-code-review)"
        ],
        "newPatterns": [
          "LangGraph orchestrator integration not mentioned",
          "Worktree MCP tools (worktree_register etc.) not referenced"
        ]
      },
      "devilsAdvocate": {
        "challengesSustained": [
          {
            "claim": "Plan is 70% implemented",
            "challenge": "Draft PR creation — the core feature — is NOT wired. That's the headline deliverable, not a minor gap.",
            "resolution": "Sustained — but the infrastructure exists (git-ops has create-draft-pr action). It's a wiring task, not a design task.",
            "evidencePaths": [".claude/agents/git-ops.agent.md:103-111"]
          }
        ],
        "challengesOverruled": [
          {
            "claim": "CHECKPOINT.yaml is obsolete",
            "challenge": "dev-implement-story.md Step 1.3 still reads CHECKPOINT.yaml at line 366",
            "resolution": "Overruled — it reads via kb_read_artifact now, not filesystem. The field name persists but the mechanism changed.",
            "evidencePaths": [".claude/commands/dev-implement-story.md:366-386"]
          }
        ],
        "confidenceAdjustment": "Verdict stands. Devil's advocate confirmed the core finding: plan is mostly implemented but the flagship feature (auto-draft-PR) needs wiring."
      },
      "decisions": [
        {
          "question": "Should remaining gaps (draft PR wiring, gh pr ready) be tracked as new stories?",
          "options": [
            "Create stories under pipeline-orchestrator-activation",
            "Create a new slimmed-down plan",
            "Defer — not blocking anything"
          ],
          "recommendation": "Create 2-3 focused stories under an existing plan",
          "decided": true,
          "choice": "Defer — archive the plan, track gaps informally",
          "decidedBy": "user",
          "decidedAt": "2026-03-21T03:30:00Z"
        }
      ],
      "recommendedActions": [
        "Archive this plan and its duplicate (sequential-dancing-lobster)",
        "Create focused stories for: wire draft PR into wt-new, add gh pr ready to code-review",
        "No plan rewrite needed — remaining work is tactical"
      ],
      "actionsTaken": [
        {
          "action": "Updated plan status to archived",
          "target": "worktree-first-draft-pr-lifecycle",
          "timestamp": "2026-03-21T03:30:25Z",
          "tool": "kb_update_plan"
        },
        {
          "action": "Updated duplicate plan status to archived",
          "target": "sequential-dancing-lobster",
          "timestamp": "2026-03-21T03:30:25Z",
          "tool": "kb_update_plan"
        }
      ],
      "suggestedStatusChange": {
        "from": "draft",
        "to": "archived"
      },
      "applied": true,
      "appliedAt": "2026-03-20T03:30:25Z"
    }
  ]
}
```

## Step 0 — Initialize or Load Audit File

1. Determine today's date in `YYYY-MM-DD` format
2. Set audit file path: `.claude/plan-audit-{date}.json`
3. If file exists, read it with the Read tool and parse the JSON
4. If file does not exist, initialize with empty structure:
   ```json
   {
     "auditDate": "{date}",
     "totalPlans": 0,
     "audited": 0,
     "summary": {},
     "entries": []
   }
   ```
5. Check if the current plan slug already has an entry — if so, skip unless `--force`

## Step 1 — Load the Plan

1. Load the `kb_get_plan` MCP tool via ToolSearch
2. Call `kb_get_plan` with the provided slug, requesting full content (`include_content: true`)
3. If not found, display error and stop
4. Extract: title, status, priority, plan_type, tags, raw_content, story_prefix, dependencies, summary

## Step 2 — Load Related Context

In parallel:

1. **Related stories**: If the plan has a story_prefix, call `kb_list_stories` filtered by that prefix to see what stories exist and their statuses
2. **Related plans**: Call `kb_get_related` or `kb_search` for plans with overlapping tags/keywords to detect duplicates or superseding plans
3. **Plan dependencies**: If the plan has dependencies, call `kb_get_plan` for each to check their current status

## Step 3 — Spawn Parallel Audit Agents (Round 1)

Launch 3 sub-agents in parallel using the Task tool (subagent_type: "Explore"):

### Agent 1: "Validity & Need Check"

Prompt the agent with the plan's raw_content and ask it to determine:

- Is the problem this plan solves still a real problem?
- Has the ecosystem/architecture changed in a way that makes this plan irrelevant?
- Are there newer plans that supersede or overlap with this one?
- Is this a duplicate of another plan?

The agent should search for:

- Code patterns mentioned in the plan (do they still exist as described?)
- Architecture references (are they still accurate?)
- Keywords from the plan title/summary across other plan contents

**Output requirement:** For every claim, the agent MUST cite a file path and line number or search result as evidence. Unsupported claims will be challenged in Round 2.

### Agent 2: "Implementation Status Check"

Prompt the agent with the plan's raw_content and ask it to determine:

- What specific deliverables does the plan describe?
- For each deliverable, search the codebase: does it already exist?
- Percentage estimate: how much of the plan is already implemented?
- What remains unimplemented?

The agent should search for:

- File paths, function names, schema names mentioned in the plan
- Features/components described in the plan
- Database tables, columns, migrations referenced
- API endpoints, MCP tools, UI components described

**Output requirement:** For every "implemented" item, cite the exact file path where the implementation lives. For every "not implemented" item, describe what search was done to confirm absence.

### Agent 3: "Modification Requirements Check"

Prompt the agent with the plan's raw_content and ask it to determine:

- Does the plan reference files, packages, or patterns that no longer exist?
- Does the plan assume an architecture or schema that has changed?
- Are there new patterns or conventions in the codebase that the plan should adopt?
- Does the plan reference deprecated tools, APIs, or approaches?

The agent should search for:

- Specific file paths mentioned in the plan (do they exist?)
- Import patterns or package names referenced
- Database schema/table names referenced
- Technology choices mentioned (are they still in use?)

**Output requirement:** For every stale reference, show what the plan says vs. what actually exists now. For every "new pattern to adopt", cite where that pattern is used in the codebase.

## Step 3.5 — Devil's Advocate (Round 2)

After Round 1 agents complete, launch a 4th sub-agent using Task tool (subagent_type: "Explore"):

### Agent 4: "Devil's Advocate"

This agent receives the combined findings from Agents 1-3 and the plan's raw_content. Its job is to **challenge every recommendation and demand proof**.

Prompt the agent with:

- The plan's raw_content
- A summary of findings from Agents 1-3 (validity, implementation status, modifications)
- The proposed verdict

The agent MUST:

1. **Challenge the verdict.** If the verdict is ARCHIVE, argue why the plan might still be needed. If PROCEED, argue why it might be obsolete. Always take the opposing position.

2. **Demand evidence for every claim.** For each finding from Round 1:
   - "Agent 2 says X is implemented — verify this by searching for the actual code"
   - "Agent 1 says this plan is a duplicate of Y — search for Y and compare scope"
   - "Agent 3 says file Z is stale — check if Z actually exists"

3. **Look for what the other agents missed:**
   - Are there downstream dependencies that break if this plan is archived?
   - Are there stories in flight that depend on this plan?
   - Is there user-facing functionality described that was overlooked?
   - Are there edge cases in the plan that the implementation doesn't cover?

4. **Score each challenged claim:**
   - `sustained` — The devil's advocate found a genuine problem with the original finding
   - `overruled` — The original finding holds up under scrutiny

5. **Provide a confidence adjustment:**
   - Does the devil's advocate review change the recommended verdict?
   - If not, state explicitly that the verdict stands and why

**Output format:**

```
CHALLENGES SUSTAINED:
- Claim: "{original claim}"
  Challenge: "{why this is wrong or incomplete}"
  Evidence: {file paths searched, what was found}

CHALLENGES OVERRULED:
- Claim: "{original claim}"
  Challenge: "{attempted counter-argument}"
  Resolution: "{why the original claim holds}"
  Evidence: {file paths that confirm the original}

CONFIDENCE ADJUSTMENT:
{Does the verdict change? If so, to what? If not, why does it stand?}
```

## Step 4 — Synthesize Results

Combine findings from all 4 agents into a structured verdict. The devil's advocate findings are integrated as follows:

- If any `sustained` challenge materially changes the picture, adjust the verdict
- Record all challenges (sustained and overruled) in the `devilsAdvocate` section of the entry
- If the devil's advocate agrees with the verdict, note this as additional confidence

### Verdict Categories

| Verdict                 | Meaning                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `PROCEED`               | Plan is valid, needed, and can be implemented as-is                                |
| `PROCEED_WITH_CHANGES`  | Plan is valid and needed but requires specific modifications before implementation |
| `PARTIALLY_IMPLEMENTED` | Some deliverables are done; plan should be scoped down to remaining work           |
| `MERGE`                 | Plan overlaps significantly with another plan; should be merged                    |
| `NEEDS_REWRITE`         | Core assumptions are invalid; plan needs fundamental rework                        |
| `ARCHIVE`               | Plan is fully implemented, obsolete, or no longer needed                           |

### Decisions

For each finding that requires human judgment, create a decision entry:

```json
{
  "question": "Clear question requiring a decision",
  "options": ["Option A", "Option B", "Option C"],
  "recommendation": "Which option is recommended and why",
  "decided": false,
  "choice": null,
  "decidedBy": null,
  "decidedAt": null
}
```

Common decision types:

- Should this plan be merged with {other-plan}?
- Should remaining gaps be tracked as stories or a new plan?
- Is the approach still valid or should it be redesigned?
- Should this be deferred, deprioritized, or fast-tracked?

## Step 5 — Write Entry to Audit File

1. Build the entry object following the schema above, including:
   - All fields from the synthesis
   - `devilsAdvocate` section with sustained/overruled challenges
   - `decisions[]` with `decided: false` for pending items
   - `actionsTaken: []` (empty — populated as actions happen)
   - `applied: false`
2. Read the current audit file
3. Append the new entry to `entries[]`
4. Update `audited` count and `summary` tallies
5. Write the updated file using the Write tool

## Step 6 — Output Report

Display the report in this format:

```
## Plan Audit: {title}

**Slug:** {slug}
**Status:** {current_status}
**Priority:** {priority}
**Type:** {plan_type}

---

### Verdict: {VERDICT}

{1-3 sentence summary of the verdict rationale}

---

### 1. Validity & Need
{Findings from Agent 1}
- Still needed: Yes/No/Partially
- Duplicates/overlaps: {list any overlapping plans}
- Architecture alignment: {still aligned / drifted}

### 2. Implementation Status
{Findings from Agent 2}
- Estimated completion: {X}%
- Already implemented:
  - {item 1} — evidence: {file:line}
  - {item 2} — evidence: {file:line}
- Not yet implemented:
  - {item 1} — searched: {what was searched}
  - {item 2} — searched: {what was searched}

### 3. Required Modifications
{Findings from Agent 3}
- Stale references: {list with before/after}
- Architecture changes needed: {list}
- New patterns to adopt: {list with codebase examples}

### 4. Devil's Advocate Review
**Challenges sustained:** {N}
**Challenges overruled:** {N}

{For each sustained challenge:}
- **Claim:** {what was claimed}
  **Challenge:** {why it's wrong}
  **Impact on verdict:** {how this changes things}

{If all overruled:}
- Verdict confirmed — all challenges answered with evidence.

**Confidence adjustment:** {verdict change or confirmation}

### 5. Decisions Needed
{For each decision}
- **Q:** {question}
  - Options: {options}
  - Recommended: {recommendation}

---

### Recommended Actions
1. {action 1}
2. {action 2}
3. {action 3}

### Suggested Status Change
Current: {status} → Recommended: {new_status}

---
*Written to: .claude/plan-audit-{date}.json (entry {N} of {total})*
```

## Step 7 — Offer to Update and Record Everything

After displaying the report, ask the user:

> Would you like me to update this plan's status in the KB based on these findings?

If `--auto-apply` is set and verdict is `ARCHIVE`, apply without prompting.

If yes and verdict is `ARCHIVE`, update status to `archived`.
If yes and verdict is `MERGE`, ask which plan to merge into.
For other verdicts, offer to add an annotation/note to the plan.

### Recording decisions and actions

**Every decision the user makes** must be recorded in the entry's `decisions[]` array:

- Set `decided: true`
- Set `choice` to what the user chose
- Set `decidedBy` to `"user"` or `"auto-apply"`
- Set `decidedAt` to current ISO timestamp

**Every action taken** (KB updates, status changes, merges, story creation, etc.) must be recorded in the entry's `actionsTaken[]` array:

```json
{
  "action": "Description of what was done",
  "target": "The slug, ID, or path affected",
  "timestamp": "ISO timestamp",
  "tool": "The MCP tool or skill used"
}
```

After recording, re-write the audit file with the updated entry.

Examples of actions to record:

- Plan status updated via `kb_update_plan`
- Duplicate plan archived
- Stories created from remaining gaps
- Plan merged into another plan
- User chose to defer/skip
- User overrode the recommended verdict

If the user declines to take action, record that too:

```json
{
  "action": "User declined suggested status change",
  "target": "plan-slug",
  "timestamp": "...",
  "tool": "none"
}
```

## --all Mode

When `--all` is passed:

1. Call `kb_list_plans` with `limit: 100`
2. Filter out plans with status: `archived`, `superseded`, `implemented`
3. If `--status=X` is provided, further filter to only that status
4. Sort by priority (P1 first), then by creation date (oldest first)
5. If `--dry-run`, display the list and stop
6. For each plan:
   a. Check if already in today's audit file — skip if present (unless `--force`)
   b. Run the full audit (Steps 1-7)
   c. If not `--auto-apply`, ask user for each plan
   d. Display running tally: `[{N}/{total}] {verdict} — {title}`
7. After all plans, display summary table

## --report Mode

When `--report` is passed:

1. Find the most recent `plan-audit-*.json` file in `.claude/`
2. Read and parse it
3. Display summary:

```
## Plan Audit Report — {date}

**Audited:** {audited} / {totalPlans} plans

| Verdict | Count |
|---------|-------|
| PROCEED | {n} |
| PROCEED_WITH_CHANGES | {n} |
| PARTIALLY_IMPLEMENTED | {n} |
| MERGE | {n} |
| NEEDS_REWRITE | {n} |
| ARCHIVE | {n} |

### Pending Decisions
{List all decisions from entries where decided is false}

### Applied Changes
{List all actionsTaken from all entries}

### Plans Not Yet Audited
{List remaining plan slugs not in the audit file}
```

## Notes

- This skill is read-only by default — it only modifies the KB if the user approves
- Each sub-agent should search broadly but report concisely
- Focus on concrete evidence (file paths, code snippets, schema state) not speculation
- When in doubt, flag uncertainty rather than guessing
- The audit file is cumulative within a day — re-running adds entries, doesn't replace them
- Use `--report` to review findings before making bulk decisions
- The devil's advocate agent is NOT optional — it runs on every audit to ensure quality
- Every interaction after the audit (decisions, actions, deferrals) MUST be recorded in the entry
