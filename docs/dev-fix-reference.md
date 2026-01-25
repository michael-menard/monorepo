# Dev Fix Story - Reference

## Architecture

```
ORCHESTRATOR (dev-fix-story.md)
    │
    ├─▶ Phase 0: SETUP (haiku)
    │   └─▶ Creates: AGENT-CONTEXT.md, FIX-CONTEXT.md
    │
    ├─▶ Phase 1: FIX (sonnet)
    │   ├─▶ Backend Coder (parallel, reused)
    │   └─▶ Frontend Coder (parallel, reused)
    │
    ├─▶ Phase 2: VERIFICATION (haiku)
    │   └─▶ Verifier (reused)
    │
    └─▶ Phase 3: DOCUMENTATION (haiku)
        └─▶ Proof Writer (reused)
```

## Failure Sources

| Status | Report |
|--------|--------|
| `code-review-failed` | `CODE-REVIEW-STORY-XXX.md` |
| `needs-work` | `QA-VERIFY-STORY-XXX.md` |

## Artifacts

| File | Created By | Purpose |
|------|------------|---------|
| `AGENT-CONTEXT.md` | Setup | Shared context for all phases |
| `FIX-CONTEXT.md` | Setup | Issue list with checklist |
| `FIX-VERIFICATION-SUMMARY.md` | Verification | Quick pass/fail |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

## Retry Policy

| Phase | Error | Retries |
|-------|-------|---------|
| Fix | Type errors | 1 |
| Fix | Lint/other | 0 |
| Verification | Any | 0 |

## Status Flow

```
code-review-failed ─┐
                    ├─▶ in-progress ─▶ ready-for-code-review
needs-work ─────────┘
```

## Scope Constraints

- Fix listed issues only
- No new features
- No scope changes
- No unrelated refactors

## Troubleshooting

| Issue | Check |
|-------|-------|
| Invalid status | Story must be `code-review-failed` or `needs-work` |
| Worker blocked | See `_implementation/BLOCKERS.md` |
| Verification failed | See `FIX-VERIFICATION-SUMMARY.md`, may need another cycle |
