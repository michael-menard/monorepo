# Setup Phase Artifacts

## AGENT-CONTEXT Artifact

```yaml
artifact_type: context
artifact_name: AGENT-CONTEXT
phase: setup
story_id: ST-EPIC
content:
  feature_dir: plans/future/platform/story-generation-small-llm-compat
  prefix: ST
  stories_path: plans/future/platform/story-generation-small-llm-compat/stories.index.md
  story_count: 7
  scope: epic
  timestamp: "2026-02-28T00:00:00Z"
  artifacts:
    index: found
    bootstrap: found
```

## CHECKPOINT Artifact

```yaml
artifact_type: checkpoint
artifact_name: CHECKPOINT
phase: setup
story_id: ST-EPIC
content:
  feature_dir: plans/future/platform/story-generation-small-llm-compat
  prefix: ST
  scope: epic
  started: "2026-02-28T00:00:00Z"
  phase_status:
    setup: complete
    reviews: pending
    aggregation: pending
    interactive: pending
    updates: pending
  resume_from: 1
```

## Validation Summary

- Feature directory: ✓ Found
- Stories index: ✓ Found at `stories.index.md`
- Bootstrap context: ✓ Found at `_bootstrap/AGENT-CONTEXT.md`
- Story count: 7 (ST-1010, ST-1020, ST-1030, ST-1040, ST-2010, ST-2020, ST-3010, ST-3020)
- All story files: ✓ Present and validated

## Token Estimate

```yaml
phase_0_setup: ~2000 tokens
phase_1_reviews: ~30000 tokens (6 agents @ ~5k each)
phase_2_aggregation: ~3000 tokens
phase_3_interactive: ~10000 tokens
phase_4_updates: ~5000 tokens
total: ~50000 tokens
cost_estimate: "$0.15-0.25"
```
