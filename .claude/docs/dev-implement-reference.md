---
created: 2026-01-24
updated: 2026-01-24
version: 1.0.0
---

# /dev-implement-story - Reference

## Architecture

```
/dev-implement-story STORY-XXX
    │
    ├─→ Phase 0: Setup Leader (haiku)
    │       └─→ Validates preconditions, moves story, creates SCOPE.md
    │
    ├─→ Phase 1: Planning Leader (sonnet)
    │       ├─→ Planner Worker → IMPLEMENTATION-PLAN.md
    │       └─→ Plan Validator Worker → PLAN-VALIDATION.md
    │
    ├─→ Phase 2: Implementation Leader (sonnet)
    │       ├─→ Backend Coder Worker (parallel) → BACKEND-LOG.md
    │       ├─→ Frontend Coder Worker (parallel) → FRONTEND-LOG.md
    │       └─→ Contracts Worker (after backend) → CONTRACTS.md
    │
    ├─→ Phase 3: Verification Leader (sonnet)
    │       ├─→ Verifier Worker (parallel) → VERIFICATION.md
    │       └─→ Playwright Worker (parallel, if UI) → appends to VERIFICATION.md
    │
    └─→ Phase 4: Documentation Leader (sonnet)
            ├─→ Proof Writer Worker → PROOF-STORY-XXX.md
            └─→ Learnings Worker → appends to LESSONS-LEARNED.md
```

## Output Format

All agents follow `.claude/agents/_shared/lean-docs.md`:
- YAML over markdown prose
- Skip empty sections
- Structured data (tables/lists, not paragraphs)

## Artifacts

| File | Created By | Location | Purpose |
|------|------------|----------|---------|
| `SCOPE.md` | Setup Leader | `_implementation/` | Backend/frontend/infra flags |
| `IMPLEMENTATION-PLAN.md` | Planner | `_implementation/` | Step-by-step plan |
| `PLAN-VALIDATION.md` | Plan Validator | `_implementation/` | Plan validation results |
| `BACKEND-LOG.md` | Backend Coder | `_implementation/` | Backend implementation log |
| `FRONTEND-LOG.md` | Frontend Coder | `_implementation/` | Frontend implementation log |
| `CONTRACTS.md` | Contracts | `_implementation/` | API contracts, .http evidence |
| `VERIFICATION.md` | Verifier + Playwright | `_implementation/` | Build/test/E2E results |
| `VERIFICATION-SUMMARY.md` | Verification Leader | `_implementation/` | Aggregated verification |
| `TOKEN-LOG.md` | Leaders | `_implementation/` | Per-phase token tracking |
| `TOKEN-SUMMARY.md` | Documentation Leader | `_implementation/` | Aggregated token usage |
| `PROOF-STORY-XXX.md` | Proof Writer | Story root | Final proof document |
| `BLOCKERS.md` | Any worker | `_implementation/` | Blocker details (if any) |
| `CHECKPOINT.md` | Orchestrator | `_implementation/` | Resume state (if interrupted) |

## Signals

See: `.claude/agents/_shared/completion-signals.md`

| Phase | Success Signal | Failure Signals |
|-------|----------------|-----------------|
| 0 - Setup | `SETUP COMPLETE` | `SETUP BLOCKED: <reason>` |
| 1 - Planning | `PLANNING COMPLETE` | `PLANNING BLOCKED`, `PLANNING FAILED` |
| 2 - Implementation | `IMPLEMENTATION COMPLETE` | `IMPLEMENTATION BLOCKED` |
| 3 - Verification | `VERIFICATION COMPLETE` | `VERIFICATION FAILED`, `VERIFICATION BLOCKED` |
| 4 - Documentation | `DOCUMENTATION COMPLETE` | `DOCUMENTATION FAILED`, `DOCUMENTATION BLOCKED` |

## Token Tracking

See: `.claude/agents/_shared/token-tracking.md`

Each leader calls `/token-log STORY-XXX <phase> <in> <out>` before completion.
Documentation Leader calls `/token-report STORY-XXX` to generate TOKEN-SUMMARY.md.

## Retry Policy

| Phase | Error | Retries | Action |
|-------|-------|---------|--------|
| 0 - Setup | Precondition failed | 0 | Stop, report |
| 1 - Planning | Planner blocked | 0 | Stop, report |
| 1 - Planning | Validation failed | 0 | Stop, report |
| 2 - Implementation | Type errors | 1 | Retry with error context |
| 2 - Implementation | Type errors (2nd) | 0 | Create BLOCKERS.md, stop |
| 2 - Implementation | Worker blocked | 0 | Stop, report |
| 3 - Verification | Any check fails | 0 | Report FAILED |
| 4 - Documentation | Proof missing | 0 | Report FAILED |

## Parallelization

| Phase | Parallel Workers |
|-------|------------------|
| 2 | Backend Coder + Frontend Coder |
| 3 | Verifier + Playwright |

Workers are spawned in a single message with `run_in_background: true`.

## Status Transitions

```
ready-to-work → in-progress → ready-for-code-review
```

Story index is updated at:
- Phase 0: `ready-to-work` → `in-progress`
- Phase 4: `in-progress` → `ready-for-code-review`

## Checkpoint & Resume

If interrupted, the orchestrator writes `CHECKPOINT.md`:

```yaml
story: STORY-XXX
last_completed_phase: 2
phase_signals:
  0: SETUP COMPLETE
  1: PLANNING COMPLETE
  2: IMPLEMENTATION COMPLETE
resume_from: 3
timestamp: <ISO timestamp>
```

On restart with `--resume`, orchestrator:
1. Reads CHECKPOINT.md
2. Skips phases 0-2
3. Starts from phase 3

## Dry-Run Mode

Usage: `/dev-implement-story STORY-XXX --dry-run`

Runs Setup phase only and outputs:
- Scope analysis (backend/frontend/infra)
- Estimated phases to run
- Files likely to be modified
- Does NOT move story or create artifacts

## Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| Story not found | `plans/stories/ready-to-work/STORY-XXX/` | Verify path and status |
| QA-AUDIT not passed | Story contains `## QA-AUDIT` with `PASS` | Run `/elab-story` first |
| Already has implementation | `_implementation/` directory exists | Use `--resume` or clean up |
| Dependencies not met | Index shows `**Depends On:** <list>` | Complete dependencies first |
| Type errors after retry | BLOCKERS.md created | Manual fix required |
| Build/test failures | VERIFICATION.md shows FAIL | Fix code, run `/dev-fix-story` |

## Related Commands

| Command | When to Use |
|---------|-------------|
| `/elab-story STORY-XXX` | Before implementation (prerequisite) |
| `/dev-code-review STORY-XXX` | After implementation (next step) |
| `/dev-fix-story STORY-XXX` | After code review failures |

## Agent Files

| Role | File |
|------|------|
| Orchestrator | `.claude/commands/dev-implement-story.md` |
| Setup Leader | `.claude/agents/dev-implement-setup-leader.agent.md` |
| Planning Leader | `.claude/agents/dev-implement-planning-leader.agent.md` |
| Implementation Leader | `.claude/agents/dev-implement-implementation-leader.agent.md` |
| Verification Leader | `.claude/agents/dev-implement-verification-leader.agent.md` |
| Documentation Leader | `.claude/agents/dev-implement-documentation-leader.agent.md` |
| Planner | `.claude/agents/dev-implement-planner.agent.md` |
| Plan Validator | `.claude/agents/dev-implement-plan-validator.agent.md` |
| Backend Coder | `.claude/agents/dev-implement-backend-coder.agent.md` |
| Frontend Coder | `.claude/agents/dev-implement-frontend-coder.agent.md` |
| Contracts | `.claude/agents/dev-implement-contracts.agent.md` |
| Verifier | `.claude/agents/dev-implement-verifier.agent.md` |
| Playwright | `.claude/agents/dev-implement-playwright.agent.md` |
| Proof Writer | `.claude/agents/dev-implement-proof-writer.agent.md` |
| Learnings | `.claude/agents/dev-implement-learnings.agent.md` |
