# /pm-generate-story-000-harness - Reference

## Architecture

```
/pm-generate-story-000-harness {PREFIX}
    │
    ├─→ Phase 0: pm-harness-setup-leader.agent.md (haiku)
    │       ├─→ Validate prefix provided
    │       ├─→ Check harness doesn't exist
    │       ├─→ Verify bootstrap completed
    │       ├─→ Create directory structure
    │       └─→ Write AGENT-CONTEXT.md
    │
    └─→ Phase 1: pm-harness-generation-leader.agent.md (haiku)
            ├─→ Generate {PREFIX}-000-HARNESS.md
            ├─→ Generate _pm/TEST-PLAN.md
            ├─→ Generate _pm/DEV-FEASIBILITY.md
            └─→ Generate _pm/BLOCKERS.md
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `AGENT-CONTEXT.md` | setup-leader | Context for all phases |
| `{PREFIX}-000-HARNESS.md` | generation-leader | Main harness story |
| `_pm/TEST-PLAN.md` | generation-leader | Verification approach |
| `_pm/DEV-FEASIBILITY.md` | generation-leader | Technical notes |
| `_pm/BLOCKERS.md` | generation-leader | Known blockers |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Success Signal | Block Signal |
|-------|----------------|--------------|
| Setup | `SETUP COMPLETE` | `SETUP BLOCKED: <reason>` |
| Generation | `GENERATION COMPLETE` | `GENERATION FAILED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens per phase:

| Phase | Model | Est. Input | Est. Output |
|-------|-------|------------|-------------|
| Setup | haiku | ~5k | ~1k |
| Generation | haiku | ~8k | ~3k |
| **Total** | — | ~13k | ~4k |

## Retry Policy

| Phase | Error | Retries | Action |
|-------|-------|---------|--------|
| Setup | Missing bootstrap files | 0 | Block - user must run /pm-bootstrap-workflow |
| Setup | Harness exists | 0 | Block - harness already created |
| Generation | Write failure | 1 | Retry once, then fail |

## Troubleshooting

| Issue | Check |
|-------|-------|
| "No prefix provided" | Pass PREFIX as argument: `/pm-generate-story-000-harness WRKF` |
| "Bootstrap not complete" | Run `/pm-bootstrap-workflow` first |
| "Harness already exists" | Check `plans/stories/{PREFIX}-000/` |
| Story not in index | This is expected - harness is special, not in index |

## Status Transition

After successful completion:
- Story status: `backlog`
- Next step: `/elab-story {PREFIX}-000`

## When to Use

Run **once** per epic, after `/pm-bootstrap-workflow` and before any feature stories.

The harness:
1. Validates the workflow mechanics work
2. Creates reusable templates for future stories
3. Establishes "process law" that all stories must follow
