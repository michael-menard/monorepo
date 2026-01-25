---
created: 2026-01-20
updated: 2026-01-24
version: 3.0.0
type: orchestrator
agents: ["pm-bootstrap-setup-leader.agent.md", "pm-bootstrap-analysis-leader.agent.md", "pm-bootstrap-generation-leader.agent.md"]
---

/pm-bootstrap-workflow {FEATURE_DIR}

You are the Bootstrap Orchestrator. Convert raw plans into structured story artifacts. Do NOT generate files directly.

## Usage

```
/pm-bootstrap-workflow plans/future/wishlist
/pm-bootstrap-workflow plans/future/auth --dry-run
```

## Input: Feature Directory

The command takes a **feature directory path** as input. This directory must contain:
- `PLAN.md` or `PRD.md` - The raw plan content

The **directory name** becomes the **story prefix**:
- `plans/future/wishlist` → prefix `WISH`
- `plans/future/auth` → prefix `AUTH`
- `plans/future/cognito-scopes` → prefix `COGN`

Prefix derivation rules:
1. Take directory name (e.g., `wishlist`, `cognito-scopes`)
2. Remove hyphens, take first 4 characters
3. Convert to UPPERCASE
4. Result: `WISH`, `AUTH`, `COGN`, etc.

## Phases

| # | Agent | Model | Signal |
|---|-------|-------|--------|
| 0 | `pm-bootstrap-setup-leader.agent.md` | haiku | SETUP COMPLETE |
| 1 | `pm-bootstrap-analysis-leader.agent.md` | sonnet | ANALYSIS COMPLETE |
| 2 | `pm-bootstrap-generation-leader.agent.md` | haiku | GENERATION COMPLETE |

## Execution

### Resume Check

First, check for existing checkpoint:
```
Read: {FEATURE_DIR}/_bootstrap/CHECKPOINT.md
If exists and resume_from > 0:
  Skip to phase {resume_from}
  Use context from AGENT-CONTEXT.md
```

### Phase Execution

For each phase:
```
Task tool:
  subagent_type: "general-purpose"
  model: <from table>
  description: "Phase {N} Bootstrap {PREFIX}"
  prompt: |
    Read instructions: .claude/agents/{agent}
    Feature directory: {FEATURE_DIR}
    Context: {FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md
```

- Wait for signal
- BLOCKED → stop, report reason to user
- COMPLETE → proceed to next phase

## Input Validation

Before Phase 0, validate:
1. **Feature directory exists** - Path must be valid
2. **Contains PLAN.md or PRD.md** - Raw plan must exist
3. **Directory name is valid** - Can derive prefix (alphanumeric + hyphens)

If validation fails, prompt user with specific error.

## Dry-Run Mode

If `--dry-run` flag:
- Run Phase 0 (Setup) and Phase 1 (Analysis) only
- Output analysis summary
- Do NOT generate files
- Report: "Dry run complete. {N} stories extracted. Run without --dry-run to generate files."

## Error Handling

Report: "Bootstrap blocked at Phase {N}: {reason}"

Provide recovery guidance based on error type.

## Done

On `GENERATION COMPLETE`:
1. Read `{FEATURE_DIR}/_bootstrap/SUMMARY.yaml`
2. Report to user:

```
## Bootstrap Complete: {PREFIX}

| Metric | Value |
|--------|-------|
| Total Stories | {N} |
| Ready to Start | {N} |
| Critical Path | {N} stories |
| Max Parallel | {N} |
| Phases | {N} |

### Files Created (all in {FEATURE_DIR}/)
- stories.index.md
- PLAN.meta.md
- PLAN.exec.md
- roadmap.md
- _bootstrap/SUMMARY.yaml

**Next**: `/elab-epic {PREFIX}` (recommended) or `/elab-story {PREFIX}-001`
```

## Ref

`.claude/docs/pm-bootstrap-workflow-reference.md`
