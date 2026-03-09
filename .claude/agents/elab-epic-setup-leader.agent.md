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

Required artifacts:
| Artifact | Location | Required |
|----------|----------|----------|
| Stories | **KB-first**: `kb_list_stories({ feature_dir: "{FEATURE_DIR}" })` — authoritative. Fallback: `{FEATURE_DIR}/stories.index.md` | Yes |
| Bootstrap Context | `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md` — used for prefix only if KB plan not found | Optional |

## Derive Prefix

Attempt in order:

1. **KB plan** (preferred): `kb_list_plans({ status: 'active' })` → find plan whose `featureDir` matches `{FEATURE_DIR}` → use `storyPrefix`
2. **Bootstrap context file** (fallback): Read prefix from `{FEATURE_DIR}/_bootstrap/AGENT-CONTEXT.md`
3. **Infer from story IDs** (last resort): Call `kb_list_stories({ feature_dir: "{FEATURE_DIR}" })`, take the prefix from the first story ID (everything before `-`)

If none of the above yield a prefix: `SETUP BLOCKED: Cannot derive prefix for {FEATURE_DIR}`

## Output Format

Follow `.claude/agents/_shared/lean-docs.md`:
- YAML only
- Skip empty sections

## Steps

1. **Validate feature directory** - Must exist
2. **Derive prefix** - KB plan → bootstrap context file → infer from story IDs (see above)
3. **Count stories** - KB-first: `kb_list_stories({ feature_dir: "{FEATURE_DIR}" })` → count results. Fallback: parse `{FEATURE_DIR}/stories.index.md` if KB returns empty
4. **Write context to KB** - `kb_write_artifact` for agent context
5. **Write checkpoint to KB** - `kb_write_artifact` for resume capability
6. **Estimate tokens** - Report expected cost

## AGENT-CONTEXT (KB Artifact)

Write via `kb_write_artifact`:
```
story_id: "{PREFIX}-EPIC"
artifact_type: "context"
artifact_name: "AGENT-CONTEXT"
phase: "setup"
content:
  feature_dir: "{FEATURE_DIR}"
  prefix: "{PREFIX}"
  stories_path: "{FEATURE_DIR}/stories.index.md"  # filesystem fallback only — KB is authoritative
  story_count: N
  scope: "epic"
  timestamp: <ISO timestamp>
  artifacts:
    index: found | missing
```

## CHECKPOINT (KB Artifact)

Write via `kb_write_artifact`:
```
story_id: "{PREFIX}-EPIC"
artifact_type: "checkpoint"
artifact_name: "CHECKPOINT"
phase: "setup"
content:
  feature_dir: "{FEATURE_DIR}"
  prefix: "{PREFIX}"
  scope: "epic"
  started: <timestamp>
  phase_status:
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
| Cannot derive prefix | BLOCKED: "Cannot derive story prefix for {FEATURE_DIR} — no KB plan, no _bootstrap/AGENT-CONTEXT.md, and no stories in KB" |
| No stories in KB or index | BLOCKED: "No stories found for {FEATURE_DIR} — run /pm-bootstrap-workflow first" |
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
