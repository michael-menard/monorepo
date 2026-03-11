---
story_id: KNOW-048
title: Runbook Adoption — Wire kb_add_runbook into Agent Lifecycle
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
depends_on:
  - LNGG-006  # blocked until LangGraph migration completes
---

# KNOW-048: Runbook Adoption — Wire kb_add_runbook into Agent Lifecycle

## Context

`kb_add_runbook` is a fully implemented MCP tool with a complete schema (title, purpose, prerequisites, steps, notes, role), a registered handler, deferred-write support, and a retrieval path via `kb_search({ entry_type: "runbook" })`. It was built to capture reusable operational procedures discovered during story execution.

Zero agents use it. Zero agents declare it in their `kb_tools` frontmatter. `kb-integration.md` — the shared guidance document that tells agents when to call `kb_add_lesson` and `kb_add_decision` — has no section on runbooks at all.

The tool is invisible to every agent in the system.

This matters because reusable procedures are discovered constantly during implementation:
- "How to roll back a DB migration safely in this project"
- "How to debug Lambda cold starts in X-Ray"
- "How to run the deferred-writes flush command"
- "How to force a worktree to sync with main"

These procedures live in individual developers' heads or in completed story files where they can't be found later. The `kb_add_runbook` infrastructure is ready to capture them — it just needs wiring.

## Goal

Document the "when to write a runbook" convention in `kb-integration.md`, add `kb_add_runbook` to the tool lists of agents that commonly discover operational procedures, and add a runbook check to the session-close lifecycle.

## Non-goals

- Retroactively writing runbooks for all past stories (let them accumulate naturally going forward)
- Auto-generating runbooks from code changes (too noisy)
- Requiring every agent to write a runbook (only agents that naturally discover procedures)

## Scope

### `kb-integration.md` — Add Runbook Section

Add a new section alongside the existing "When to use kb_add_lesson" and "When to use kb_add_decision" sections:

```markdown
## When to Use `kb_add_runbook`

Write a runbook when you discover a **multi-step operational procedure** that:
- Will need to be repeated (not a one-off)
- Is non-obvious and requires specific steps in order
- Was hard to figure out the first time

**Examples worth capturing:**
- Database migration rollback procedure
- How to invalidate CloudFront cache after frontend deployment
- Steps to promote a Lambda alias manually
- How to flush DEFERRED-KB-WRITES.yaml when KB was unavailable
- Debugging a specific class of Lambda errors in X-Ray

**Examples NOT worth capturing:**
- `git status` — obvious
- Single-step actions — just use kb_add_lesson
- Procedures already in official docs — link instead

**Timing:** Write at session close, after you've verified the procedure works.

**Format:**
kb_add_runbook({
  title: "Roll back DB migration for Aurora PostgreSQL",
  purpose: "Safely revert a migration when a deployment fails",
  prerequisites: ["AWS CLI configured", "DB admin credentials"],
  steps: [
    "1. Identify the migration version to roll back to",
    "2. Connect to Aurora via RDS Proxy",
    "3. Run: SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5",
    "4. Execute the down migration: ...",
    "5. Verify table state matches expected schema"
  ],
  role: "dev",
  story_id: STORY_ID,
  tags: ["database", "migration", "rollback"]
})
```

### Agents to Receive `kb_add_runbook`

Add to `kb_tools` frontmatter and session-close logic for:

| Agent | Rationale |
|---|---|
| `dev-implement-backend-coder.agent.md` | Discovers infra/DB procedures during implementation |
| `dev-fix-fix-leader.agent.md` | Fixes reveal non-obvious debugging procedures |
| `dev-setup-leader.agent.md` | Setup phase reveals environment configuration steps |
| `qa-verify-completion-leader.agent.md` | QA discovers test environment setup procedures |

**Session-close addition for each agent:**

```
## Session Close — Runbook Check

Before writing final KB entries, ask:
"Did I discover any multi-step operational procedure today that someone would need to repeat?"

If yes:
  kb_add_runbook({ title, purpose, steps, role: "dev", story_id })
  Log: "Runbook captured: {title}"

If no: skip (do not force a runbook where none is needed)
```

### Retrieval Usage

Add a runbook lookup step to `dev-setup-leader.agent.md` at the start of setup:

```
# Before beginning setup, check for relevant runbooks:
kb_search({
  query: "setup {story_domain} environment",
  entry_type: "runbook",
  limit: 3
})

If runbooks found: include them in context summary
```

This creates a virtuous cycle — runbooks written during one story are consumed during setup of the next related story.

### Packages Affected

- `.claude/agents/_shared/kb-integration.md` — add "When to use kb_add_runbook" section
- `.claude/agents/dev-implement-backend-coder.agent.md` — add `kb_add_runbook` to kb_tools + session close
- `.claude/agents/dev-fix-fix-leader.agent.md` — same
- `.claude/agents/dev-setup-leader.agent.md` — same + runbook retrieval at start
- `.claude/agents/qa-verify-completion-leader.agent.md` — same

## Acceptance Criteria

- [ ] `kb-integration.md` has a "When to use kb_add_runbook" section with clear examples of what qualifies vs. does not qualify as a runbook
- [ ] `dev-implement-backend-coder`, `dev-fix-fix-leader`, `dev-setup-leader`, and `qa-verify-completion-leader` all declare `kb_add_runbook` in their `kb_tools` frontmatter
- [ ] Each updated agent has a session-close step that prompts the agent to evaluate whether a runbook should be written
- [ ] `dev-setup-leader` performs a `kb_search({ entry_type: "runbook" })` at session start to surface relevant procedures
- [ ] The runbook check is a "write if applicable" pattern — agents are not penalized for not writing a runbook when none was discovered
- [ ] A test run of `dev-fix-fix-leader` on a non-trivial fix produces at least one runbook entry in the KB
