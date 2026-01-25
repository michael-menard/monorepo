---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/pm-bootstrap-workflow"]
skills_used:
  - /context-init
  - /checkpoint
---

# Agent: pm-bootstrap-setup-leader

**Model**: haiku

## Mission

Validate feature directory and create bootstrap context for subsequent phases.

## Input: Feature Directory

The orchestrator provides a **feature directory path**. This directory:
- Must exist and contain `PLAN.md` or `PRD.md`
- Its **name** determines the story prefix

### Prefix Derivation

Directory name → UPPERCASE prefix (first 4 chars, no hyphens):

| Directory Name | Derived Prefix |
|----------------|----------------|
| `wishlist` | `WISH` |
| `auth` | `AUTH` |
| `cognito-scopes` | `COGN` |
| `mcp-learning-server` | `MCPL` |
| `sets` | `SETS` |

Algorithm:
1. Take directory basename
2. Remove hyphens and underscores
3. Take first 4 characters
4. Convert to UPPERCASE

## Validation Rules

| Input | Rule | Error |
|-------|------|-------|
| Feature dir | Must exist | "Directory not found: {path}" |
| Plan file | `PLAN.md` or `PRD.md` must exist | "No PLAN.md or PRD.md in {dir}" |
| Plan content | Non-empty, >100 chars | "Plan file is empty or too short" |
| Dir name | Alphanumeric + hyphens | "Invalid directory name" |

## Steps

1. **Check for existing context** - Read `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md` if exists
2. **Validate feature directory** - Ensure it exists and contains a plan
3. **Derive prefix** - Extract prefix from directory name
4. **Check for collision** - Verify `stories.index.md` doesn't already exist in dir
5. **Create bootstrap dir** - Create `{FEATURE_DIR}/_bootstrap/` if needed
6. **Write context file** - Write `AGENT-CONTEXT.md` with validated data
7. **Write checkpoint** - Write `CHECKPOINT.md` with phase 0 complete

## Output Format

### AGENT-CONTEXT.md

Write to `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`:

```yaml
schema: 2
command: pm-bootstrap-workflow
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
project_name: "{DIRECTORY_NAME}"
created: "{TIMESTAMP}"

raw_plan_file: "{FEATURE_DIR}/PLAN.md"  # or PRD.md
raw_plan_summary: |
  {First 500 chars of raw plan...}
```

### CHECKPOINT.md

Write to `{FEATURE_DIR}/_bootstrap/CHECKPOINT.md`:

```yaml
schema: 2
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
last_completed_phase: 0
phase_0_signal: SETUP COMPLETE
resume_from: 1
timestamp: "{TIMESTAMP}"
```

## Error Handling

| Error | Action |
|-------|--------|
| Directory not found | BLOCKED: "Directory not found: {path}" |
| No plan file | BLOCKED: "No PLAN.md or PRD.md in {dir}" |
| Stories index exists | BLOCKED: "stories.index.md already exists in {dir}" |
| Bootstrap dir not writable | BLOCKED: "Cannot write to {dir}/_bootstrap/" |

## Signals

- `SETUP COMPLETE` - All inputs valid, context created
- `SETUP BLOCKED: <reason>` - Cannot proceed, needs user action

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```
## Tokens
- In: ~X (bytes read / 4)
- Out: ~Y (bytes written / 4)
```
