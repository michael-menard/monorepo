# Epic Elaboration - Reference

## Architecture

```
/elab-epic {PREFIX}
    │
    ├─→ Phase 0: Setup Leader (haiku)
    │       └─→ AGENT-CONTEXT.md, CHECKPOINT.md
    │
    ├─→ Phase 1: Reviews Leader (haiku)
    │       ├─→ elab-epic-engineering (haiku) ──┐
    │       ├─→ elab-epic-product (haiku) ──────┤
    │       ├─→ elab-epic-qa (haiku) ───────────┼─→ 6 parallel
    │       ├─→ elab-epic-ux (haiku) ───────────┤
    │       ├─→ elab-epic-platform (haiku) ─────┤
    │       └─→ elab-epic-security (haiku) ─────┘
    │
    ├─→ Phase 2: Aggregation Leader (haiku)
    │       └─→ EPIC-REVIEW.yaml
    │
    ├─→ Phase 3: Interactive Leader (sonnet)
    │       └─→ DECISIONS.yaml
    │
    └─→ Phase 4: Updates Leader (haiku)
            └─→ UPDATES-LOG.yaml, FOLLOW-UPS.md
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

Primary artifact: `EPIC-REVIEW.yaml`

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `AGENT-CONTEXT.md` | Setup Leader | Context for all phases |
| `CHECKPOINT.md` | Setup Leader | Resume state |
| `REVIEW-*.yaml` | Workers (6) | Individual perspectives |
| `REVIEWS-SUMMARY.yaml` | Reviews Leader | Worker status |
| `EPIC-REVIEW.yaml` | Aggregation Leader | Unified findings |
| `DECISIONS.yaml` | Interactive Leader | User decisions |
| `UPDATES-LOG.yaml` | Updates Leader | Changes made |
| `FOLLOW-UPS.md` | Updates Leader | Deferred items |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Success | Blocked |
|-------|---------|---------|
| 0 Setup | `SETUP COMPLETE` | `SETUP BLOCKED: <reason>` |
| 1 Reviews | `REVIEWS COMPLETE` | `REVIEWS BLOCKED: <reason>` |
| 2 Aggregation | `AGGREGATION COMPLETE` | `AGGREGATION BLOCKED: <reason>` |
| 3 Interactive | `DECISIONS COMPLETE` | — |
| 4 Updates | `UPDATES COMPLETE` | `UPDATES BLOCKED: <reason>` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Estimated tokens per phase:
| Phase | Input | Output | Total |
|-------|-------|--------|-------|
| 0 Setup | ~2k | ~1k | ~3k |
| 1 Reviews | ~25k | ~5k | ~30k |
| 2 Aggregation | ~5k | ~2k | ~7k |
| 3 Interactive | ~8k | ~2k | ~10k |
| 4 Updates | ~5k | ~2k | ~7k |
| **Total** | ~45k | ~12k | **~57k** |

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| 0 Setup | Missing artifact | 0 - BLOCKED |
| 1 Reviews | Worker timeout | 1 per worker |
| 2 Aggregation | Parse error | 1 |
| 3 Interactive | User timeout | Save & resume |
| 4 Updates | Write error | 1 |

## Resume Capability

If interrupted, read `CHECKPOINT.md` and resume from `resume_from` phase.

```yaml
# CHECKPOINT.md
epic: {PREFIX}
phases:
  setup: complete
  reviews: complete
  aggregation: pending  # ← Resume here
  interactive: pending
  updates: pending
resume_from: 2
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| Missing stories index | Verify `plans/stories/{PREFIX}.stories.index.md` exists |
| Worker timeout | Check agent file syntax, re-run phase 1 |
| Aggregation fails | Check individual REVIEW-*.yaml files for parse errors |
| No decisions recorded | DECISIONS.yaml should exist even if user skipped |

## Verdicts

| Verdict | Meaning | Next Action |
|---------|---------|-------------|
| `READY` | No critical issues | `/pm-generate-story {PREFIX}-001` |
| `CONCERNS` | Minor issues noted | Proceed with awareness |
| `BLOCKED` | Critical issues | Address findings first |
