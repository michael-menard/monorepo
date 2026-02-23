---
created: 2026-01-20
updated: 2026-02-22
version: 4.0.0
type: orchestrator
agents: ["pm-bootstrap-setup-leader.agent.md", "pm-bootstrap-analysis-leader.agent.md", "pm-bootstrap-generation-leader.agent.md"]
---

/pm-bootstrap-workflow {plan_slug | --file {FEATURE_DIR}}

You are the Bootstrap Orchestrator. Convert a plan into structured story artifacts. Do NOT generate files directly.

## Usage

```
/pm-bootstrap-workflow agent-monitor-dashboard
/pm-bootstrap-workflow agent-monitor-dashboard --feature-dir plans/future/platform/agent-dashboard
/pm-bootstrap-workflow agent-monitor-dashboard --prefix AGMD
/pm-bootstrap-workflow agent-monitor-dashboard --dry-run
/pm-bootstrap-workflow --file plans/future/wishlist          # legacy file mode
```

## Input Modes

### KB Mode (default)

Provide a `plan_slug` that exists in the `plans` table. The orchestrator fetches the plan content from the DB — no files are read.

Optional overrides:
- `--feature-dir {path}` — where to create story files (default: `plans/future/platform/{plan_slug}`)
- `--prefix {PREFIX}` — story prefix override (default: derived from plan_slug)

### File Mode (`--file`)

Legacy mode. Reads `PLAN.md` or `PRD.md` from the given directory. Agents write intermediate artifacts to `{FEATURE_DIR}/_bootstrap/` as before.

## Pre-Phase: Resolve Plan Content

### KB Mode

Query the plans table:

```sql
SELECT plan_slug, title, summary, raw_content, plan_type, feature_dir, story_prefix
FROM plans
WHERE plan_slug = '{plan_slug}'
```

If no row found → BLOCKED: "No plan found with slug '{plan_slug}'. Run /list-plans to see available plans."

Extract:
- `plan_content` = `raw_content`
- `feature_dir` = `--feature-dir` arg OR `feature_dir` column (if set) OR `plans/future/platform/{plan_slug}`
- `prefix` = `--prefix` arg OR `story_prefix` column (if set) OR derived from plan_slug

Prefix derivation from plan_slug:
1. Split on hyphens → words
2. Remove common filler words: `the`, `a`, `an`, `to`, `for`, `from`, `and`, `or`, `with`, `add`, `fix`, `update`, `plan`
3. Take first letter of each remaining word, uppercase
4. Take first 4 characters
5. If fewer than 4, pad from first word's letters

Examples:
- `agent-monitor-dashboard` → `[agent, monitor, dashboard]` → `AMD` + pad → `AGMD`
- `kb-first-agent-command-migration` → `[kb, first, agent, command, migration]` → `KFAC`
- `worktree-first-draft-pr-lifecycle` → `[worktree, first, draft, pr, lifecycle]` → `WFDP`
- `monorepo-health-audit-fix-plan` → `[monorepo, health, audit]` (fix/plan filtered) → `MHA` + pad → `MHEA` (pad from monorepo)

### File Mode

Read `PLAN.md` or `PRD.md` from `{FEATURE_DIR}`. Set `plan_content` from file contents.

## Phases

| # | Agent | Model | Context Passing | Signal |
|---|-------|-------|-----------------|--------|
| 0 | `pm-bootstrap-setup-leader.agent.md` | haiku | plan_content inline | SETUP COMPLETE |
| 1 | `pm-bootstrap-analysis-leader.agent.md` | sonnet | plan_content + Phase 0 context inline | ANALYSIS COMPLETE |
| 2 | `pm-bootstrap-generation-leader.agent.md` | haiku | Phase 1 analysis inline | GENERATION COMPLETE |

## Phase Execution

### KB Mode — Inline Context Passing

Phases communicate through the orchestrator. Each phase returns its output inline (YAML block). The orchestrator captures it and passes it to the next phase.

**Phase 0:**
```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 0 Bootstrap Setup {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/pm-bootstrap-setup-leader.agent.md

    Mode: KB (no file IO for intermediate artifacts)
    Plan slug: {plan_slug}
    Plan content:
    ---
    {plan_content}
    ---
    Feature dir: {feature_dir}
    Prefix: {prefix}

    Return your output as a YAML block labelled SETUP-CONTEXT.
```

Capture the `SETUP-CONTEXT` YAML block from the response.

**Phase 1:**
```
Task tool:
  subagent_type: "general-purpose"
  model: sonnet
  description: "Phase 1 Bootstrap Analysis {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/pm-bootstrap-analysis-leader.agent.md

    Mode: KB (no file IO for intermediate artifacts)
    Setup context:
    {SETUP-CONTEXT from Phase 0}

    Plan content:
    ---
    {plan_content}
    ---

    Return your output as a YAML block labelled ANALYSIS.
```

Capture the `ANALYSIS` YAML block from the response.

**Phase 2:**
```
Task tool:
  subagent_type: "general-purpose"
  model: haiku
  description: "Phase 2 Bootstrap Generation {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/pm-bootstrap-generation-leader.agent.md

    Mode: KB (story files written to disk, stories inserted into KB stories table)
    Setup context:
    {SETUP-CONTEXT from Phase 0}

    Analysis:
    {ANALYSIS from Phase 1}

    Return your output as a YAML block labelled SUMMARY.
```

### File Mode — Legacy Disk-Based

```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase {N} Bootstrap {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/{agent}
    Mode: FILE
    Feature directory: {FEATURE_DIR}
    Context: {FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md
```

- Wait for signal
- BLOCKED → stop, report reason to user
- COMPLETE → proceed to next phase

## Dry-Run Mode

If `--dry-run` flag:
- Run Phase 0 (Setup) and Phase 1 (Analysis) only
- Output analysis summary to user
- Do NOT generate story files
- Report: "Dry run complete. {N} stories extracted. Run without --dry-run to generate files."

## Done

On `GENERATION COMPLETE`:

### KB Mode
1. Update the plan record with derived metadata:
   ```sql
   UPDATE plans
   SET feature_dir = '{feature_dir}',
       story_prefix = '{prefix}',
       estimated_stories = {total_stories},
       status = 'active',
       updated_at = NOW()
   WHERE plan_slug = '{plan_slug}'
   ```
   Execute via psql or the KB db client.

2. Seed all generated stories into the KB database:
   ```bash
   pnpm --filter @repo/knowledge-base run migrate:stories 2>/dev/null
   ```
   (Idempotent, non-blocking if DB unavailable.)

3. Report to user.

### File Mode
1. Seed stories:
   ```bash
   pnpm --filter @repo/knowledge-base run migrate:stories 2>/dev/null
   ```
2. Report to user.

### Completion Report

```
## Bootstrap Complete: {PREFIX}

| Metric | Value |
|--------|-------|
| Plan | {plan_slug} |
| Total Stories | {N} |
| Ready to Start | {N} |
| Critical Path | {N} stories |
| Max Parallel | {N} |
| Phases | {N} |

### Files Created
- {feature_dir}/stories.index.md
- {feature_dir}/{PREFIX}-*/story.yaml ({N} files)

**Next**: `/elab-epic {PREFIX}` (recommended) or `/elab-story {PREFIX}-1010`
```

## Error Handling

Report: "Bootstrap blocked at Phase {N}: {reason}"

Provide recovery guidance based on error type.

## Ref

`.claude/docs/pm-bootstrap-workflow-reference.md`
