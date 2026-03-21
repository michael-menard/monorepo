---
name: plan-audit
description: "Deep audit of a KB plan against current codebase reality. Determines if the plan is still valid/needed, what has already been implemented, and what modifications are required before implementation."
---

# /plan-audit — Audit Plan Against Current Reality

## Usage

```
/plan-audit <plan-slug>
```

## Purpose

Plans go stale. This skill reads a plan from the KB, then spawns parallel sub-agents to audit it against the current codebase, schema, and other plans. It produces a grounded verdict on whether the plan should proceed, be modified, be merged with another plan, or be archived.

## Inputs

| Argument | Required | Description |
|----------|----------|-------------|
| plan-slug | yes | The slug of the plan to audit (from `kb_get_plan`) |

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

## Step 3 — Spawn Parallel Audit Agents

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

## Step 4 — Synthesize Results

Combine findings from all 3 agents into a structured verdict.

### Verdict Categories

| Verdict | Meaning |
|---------|---------|
| `PROCEED` | Plan is valid, needed, and can be implemented as-is |
| `PROCEED_WITH_CHANGES` | Plan is valid and needed but requires specific modifications before implementation |
| `PARTIALLY_IMPLEMENTED` | Some deliverables are done; plan should be scoped down to remaining work |
| `MERGE` | Plan overlaps significantly with another plan; should be merged |
| `NEEDS_REWRITE` | Core assumptions are invalid; plan needs fundamental rework |
| `ARCHIVE` | Plan is fully implemented, obsolete, or no longer needed |

## Step 5 — Output Report

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
  - {item 1}
  - {item 2}
- Not yet implemented:
  - {item 1}
  - {item 2}

### 3. Required Modifications
{Findings from Agent 3}
- Stale references: {list}
- Architecture changes needed: {list}
- New patterns to adopt: {list}

---

### Recommended Actions
1. {action 1}
2. {action 2}
3. {action 3}

### Suggested Status Change
Current: {status} → Recommended: {new_status}
```

## Step 6 — Offer to Update

After displaying the report, ask the user:

> Would you like me to update this plan's status in the KB based on these findings?

If yes and verdict is `ARCHIVE`, update status to `archived`.
If yes and verdict is `MERGE`, ask which plan to merge into.
For other verdicts, offer to add an annotation/note to the plan.

## Notes

- This skill is read-only by default — it only modifies the KB if the user approves
- Each sub-agent should search broadly but report concisely
- Focus on concrete evidence (file paths, code snippets, schema state) not speculation
- When in doubt, flag uncertainty rather than guessing
