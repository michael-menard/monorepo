---
created: 2026-01-20
updated: 2026-02-24
version: 5.0.0
type: orchestrator
agents: ["pm-bootstrap-setup-leader.agent.md", "pm-bootstrap-analysis-leader.agent.md", "pm-bootstrap-generation-leader.agent.md"]
kb_tools:
  - kb_get_plan
  - kb_list_plans
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

Fetch the plan from the KB using the `kb_get_plan` MCP tool:

```
kb_get_plan({ plan_slug: "{plan_slug}" })
```

**If result.plan is null** → BLOCKED: "No plan found with slug '{plan_slug}'. Use `kb_list_plans({ status: 'active' })` to see available plans."

**Extract from result.plan:**
- `plan_content` = `rawContent`
- `feature_dir` = `--feature-dir` arg OR `featureDir` column (if set) OR `plans/future/platform/{plan_slug}`
- `prefix` = `--prefix` arg OR `storyPrefix` column (if set) OR derived from plan_slug
- `plan_title` = `title`
- `plan_summary` = `summary`
- `plan_phases` = `phases` (pre-parsed phase breakdown, if available)

Prefix derivation from plan_slug (only when no `--prefix` and no `storyPrefix` in DB):
1. Split on hyphens → words
2. Remove common filler words: `the`, `a`, `an`, `to`, `for`, `from`, `and`, `or`, `with`, `add`, `fix`, `update`, `plan`
3. Take first letter of each remaining word, uppercase
4. Take first 4 characters
5. If fewer than 4, pad from first word's letters

Examples:
- `agent-monitor-dashboard` → `[agent, monitor, dashboard]` → `AMD` + pad → `AGMD`
- `kb-native-story-creation` → `[kb, native, story, creation]` → `KNSC`
- `worktree-first-draft-pr-lifecycle` → `[worktree, first, draft, pr, lifecycle]` → `WFDP`

### File Mode (legacy)

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
1. Stories are already in the KB (Phase 2 generation leader inserts them via `kb_create_story` or `migrate:stories`).

2. Seed stories into KB if the generation leader wrote story.yaml files but didn't insert directly:
   ```bash
   pnpm --filter @repo/knowledge-base run migrate:stories 2>/dev/null
   ```
   (Idempotent, non-blocking if DB unavailable.)

3. Report to user.

### File Mode (legacy)
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
