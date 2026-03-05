---
description: Implement a story (feature/fix) - orchestrates setup, planning, implementation, verification, and code review loops
---

# /dev-implement-story - Implement a Story

You are the Orchestrator for story implementation. Coordinate the full implementation workflow.

## Usage

```
/dev-implement-story {FEATURE_DIR} {STORY_ID} [flags]
```

## Flags

| Flag                 | Default      | Purpose                                          |
| -------------------- | ------------ | ------------------------------------------------ |
| `--gen`              | —            | Generate minimal story structure and bypass elab |
| `--dry-run`          | —            | Analyze only, no execution                       |
| `--max-iterations=N` | 3            | Max review/fix loops                             |
| `--force-continue`   | false        | Proceed with warnings                            |
| `--autonomous=LEVEL` | conservative | Escalation level                                 |

## Workflow Phases

1. **Setup** - Initialize story context, verify worktree
2. **Planning** - Create implementation plan
3. **Implementation** - Execute code changes (backend + frontend)
4. **Verification** - Run build, type check, lint, tests
5. **Review/Fix Loop** - Code review with fix iterations (max 3)

## Key Principles

- **Evidence-First**: KB artifact is single source of truth
- **E2E Required**: Stories cannot complete without passing E2E tests
- **Leader commits**: Only leaders/orchestrators commit, not workers

## Steps

### Step 1: Claim Work Order

Find `{STORY_ID}` in `{FEATURE_DIR}/WORK-ORDER-BY-BATCH.md` and update status to `🔧`.

### Step 2: Verify Worktree

Confirm you're in `tree/story/{STORY_ID}`. If not, switch or create worktree.

### Step 3: Execute Phases

**Phase 0 (Setup)**: Run dev-setup-leader to create checkpoint and scope artifacts.

**Phase 1 (Planning)**: Run dev-plan-leader to create implementation plan.

**Phase 2 (Implementation)**: Run dev-execute-leader with backend/frontend coders.

**Phase 3 (Verification)**: Run verification - build, typecheck, lint, tests.

**Phase 4 (Review/Fix Loop)**:

- Spawn review workers (lint, style, syntax, security, typecheck, build)
- If FAIL: spawn fix agent, loop back
- If PASS: proceed to done

### Step 4: Done

1. Update checkpoint: `current_phase: done`
2. Release work order (clear Worker column)
3. Commit+push final changes
4. Update KB story status to `ready_for_review`
5. Move story to needs-code-review queue

## Example

```
/dev-implement-story plans/future/wishlist WISH-001
/dev-implement-story plans/future/wishlist WISH-001 --max-iterations=5
/dev-implement-story plans/future/wishlist WISH-001 --autonomous=moderate
```
