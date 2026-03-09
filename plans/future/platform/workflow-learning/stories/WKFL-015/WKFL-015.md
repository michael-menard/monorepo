---
story_id: WKFL-015
title: Agent Audit Process - Detect and Reduce Prompt Bloat
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: WKFL
feature: Workflow Learning
type: feature
priority: medium
depends_on:
  - KNOW-041  # agent registry must exist before audit can track changes over time
---

# WKFL-015: Agent Audit Process - Detect and Reduce Prompt Bloat

## Context

Agent prompt files grow over time. Instructions are added when problems are discovered, edge cases are handled, and clarifications are bolted on — but instructions are rarely removed. The result is prompt bloat:

- A 200-line agent file that could be 80 lines
- Contradictory instructions where a newer rule conflicts with an older one
- Dead instructions that handle conditions that no longer occur in the workflow
- Redundant instructions repeated across multiple agents that could be shared
- Overloaded agents doing three distinct tasks that should be three separate agents

Bloat has direct costs: longer prompts consume more input tokens on every invocation, increase latency, and reduce the model's effective focus on the instructions that matter. An agent with 50 relevant instructions and 150 obsolete ones performs worse than one with just the 50.

## Goal

Create a `agent-auditor` agent that periodically reviews agent files for bloat, redundancy, and contradictions, and produces a structured audit report with specific reduction recommendations.

## Non-goals

- Automatically editing agent files (proposals only, human applies changes)
- Auditing command files with complex branching logic (agent files only in v1)
- Real-time monitoring (periodic manual invocation, weekly in v1)

## Scope

### `agent-auditor.agent.md`

A focused analysis agent that takes a single agent file (or all agent files) and performs four checks:

---

**Check 1: Instruction Density**

Count meaningful instruction lines vs boilerplate/formatting:
- Flag agents where `prompt_token_count > 2000` (from `agent_registry`)
- For flagged agents, identify sections that are likely redundant context vs active instructions
- Output: `density_score` (0-100), `estimated_reducible_tokens`

---

**Check 2: Contradiction Detection**

Scan for instruction pairs that conflict:
```
Examples:
- "Always ask the user before creating stories" vs "Do NOT ask the user, decide autonomously"
- "Use haiku for all completions" vs frontmatter `model: sonnet`
- "Mark the story as done after verification" vs "Never mark done without human approval"
```
Output: `contradictions[]` with line numbers and severity (`minor` | `major` | `critical`)

---

**Check 3: Dead Instruction Detection**

Compare agent instructions against current workflow state:
- Instructions referencing files or tools that no longer exist
- Instructions referencing workflow phases that have been renamed or removed
- Instructions with conditions that are no longer reachable given current routing logic

Cross-reference against `agent_registry` (file hashes) and the current tool schemas to detect references to deprecated tools.

Output: `dead_instructions[]` with line numbers and reason

---

**Check 4: Cross-Agent Redundancy**

Compare agent instructions across all agent files to find:
- Identical or near-identical paragraphs repeated across agents
- Shared constraints that belong in a shared context file rather than individual agents
- Agents that could be merged (two small agents always spawned together)

Output: `redundancy_findings[]` with pairs of agents and the duplicate content

---

### Audit Report Format

```yaml
agent: elab-analyst
file_path: .claude/agents/elab-analyst.agent.md
prompt_token_count: 3240
audit_date: 2026-02-22

density:
  score: 42        # Low — lots of boilerplate
  estimated_reducible_tokens: 890
  recommendation: "Steps 4-6 are verbose context-setting that could be 3 bullet points"

contradictions:
  - line_a: 45
    line_b: 112
    severity: major
    description: "Line 45 says 'query KB before each audit step', line 112 says 'do not make additional KB calls during audit'"

dead_instructions:
  - lines: [78, 79, 80]
    reason: "References ELAB-REVIEW.yaml which was renamed to ELAB.yaml in WKFL-003"

redundancy:
  - shared_with: [dev-plan-leader, qa-verify-verification-leader]
    content_preview: "When KB is unavailable, log warning and continue..."
    recommendation: "Move to KB-AGENT-INTEGRATION.md shared context"

overall_health: poor   # excellent | good | fair | poor | critical
reduction_potential: 27%
```

### Invocation

```bash
/agent-audit                             # Audit all agents, produce summary
/agent-audit elab-analyst                # Single agent deep audit
/agent-audit --threshold=2000            # Only audit agents above token threshold
/agent-audit --check=contradictions      # Run single check across all agents
```

### Output Destinations

1. Per-agent YAML report written to `agent_registry` (as JSONB `last_audit_result`)
2. Summary written to `plans/future/platform/workflow-learning/AGENT-AUDIT-REPORT.md`
3. Critical findings (contradictions severity=critical, dead instructions) surfaced as tasks in KB via `kb_add_task`

### Packages / Files Affected

- `.claude/agents/agent-auditor.agent.md` — new agent
- `.claude/commands/agent-audit.md` — new command
- `apps/api/knowledge-base/src/db/migrations/` — add `last_audit_result JSONB` to `agent_registry` (from KNOW-041)
- `plans/future/platform/workflow-learning/AGENT-AUDIT-REPORT.md` — output file

## Acceptance Criteria

- [ ] `agent-auditor` runs against a single agent file and produces a structured YAML audit report
- [ ] Contradiction detection identifies at least one real contradiction in the current agent corpus when run
- [ ] Dead instruction detection flags references to renamed/removed files and tools
- [ ] Cross-agent redundancy detection identifies the shared "KB unavailable" pattern present across multiple agents
- [ ] Agents with `overall_health: poor` or `critical` have tasks created in KB
- [ ] `/agent-audit` command runs the auditor against all agents and produces a summary report
- [ ] Audit results are stored in `agent_registry.last_audit_result` for trend tracking over time
- [ ] The auditor does NOT modify any agent files — reports and tasks only
- [ ] Running the audit weekly allows tracking whether `reduction_potential` is trending down (agents getting leaner)
