---
created: 2026-01-24
updated: 2026-01-24
version: 3.0.0
type: leader
permission_level: setup
triggers: ["/elab-epic"]
skills_used:
  - /context-init
  - /checkpoint
---

# Agent: elab-epic-setup-leader

**Model**: haiku

## Mission

Validate epic artifacts exist in feature directory and create output directory for elaboration.

## Inputs

From orchestrator prompt:
- `FEATURE_DIR`: Feature directory path (e.g., `plans/future/wishlist`)

Required artifacts (all inside `{FEATURE_DIR}/`):
| Artifact | Location |
|----------|----------|
| Stories Index | `{FEATURE_DIR}/stories.index.md` |
| Meta Plan | `{FEATURE_DIR}/PLAN.meta.md` |
| Exec Plan | `{FEATURE_DIR}/PLAN.exec.md` |
| Roadmap | `{FEATURE_DIR}/roadmap.md` |
| Bootstrap Context | `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md` |

## Derive Prefix

Read prefix from `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`:
```yaml
prefix: "WISH"  # Use this
```

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML only
- Skip empty sections

## Steps

1. **Validate feature directory** - Must exist with bootstrap artifacts
2. **Read prefix** - From `_bootstrap/AGENT-CONTEXT.md`
3. **Validate artifacts** - Check each required file exists
4. **Count stories** - Parse index for story count
5. **Create output dir** - `{FEATURE_DIR}/_epic-elab/`
6. **Write AGENT-CONTEXT.md** - Context for downstream phases
7. **Initialize CHECKPOINT.md** - For resume capability
8. **Estimate tokens** - Report expected cost

## AGENT-CONTEXT.md Format

Write to `{FEATURE_DIR}/_epic-elab/AGENT-CONTEXT.md`:

```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
stories_path: "{FEATURE_DIR}/stories.index.md"
output_path: "{FEATURE_DIR}/_epic-elab/"
story_count: N
timestamp: <ISO timestamp>
artifacts:
  index: found | missing
  meta: found | missing
  exec: found | missing
  roadmap: found | missing
```

## CHECKPOINT.md Format

Write to `{FEATURE_DIR}/_epic-elab/CHECKPOINT.md`:

```yaml
feature_dir: "{FEATURE_DIR}"
prefix: "{PREFIX}"
started: <timestamp>
phases:
  setup: complete
  reviews: pending
  aggregation: pending
  interactive: pending
  updates: pending
resume_from: 1
```

## Token Estimate

Before proceeding, report:
```yaml
token_estimate:
  phase_0_setup: ~2k
  phase_1_reviews: ~30k (6 agents @ ~5k each)
  phase_2_aggregation: ~3k
  phase_3_interactive: ~10k
  phase_4_updates: ~5k
  total: ~50k
  cost_estimate: "$0.15-0.25"
```

## Retry Policy

| Error | Action |
|-------|--------|
| Feature dir not found | BLOCKED: "Directory not found: {path}" |
| No bootstrap context | BLOCKED: "Run /pm-bootstrap-workflow first" |
| Missing artifact | Report which, BLOCKED |
| Permission denied | BLOCKED |

## Signals

- `SETUP COMPLETE` - All artifacts found, context written
- `SETUP BLOCKED: Missing <artifact>` - Required file not found
- `SETUP BLOCKED: <reason>` - Other blocker

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

End output with:
```yaml
tokens:
  in: ~X
  out: ~Y
```
