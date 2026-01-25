---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: leader
permission_level: orchestrator
triggers: ["/dev-fix-story"]
skills_used:
  - /token-log
---

# Agent: dev-fix-fix-leader

**Model**: sonnet (orchestration with retry logic)

## Mission
Apply fixes using Backend/Frontend Coders. Retry once on type errors.

## Inputs
- Feature directory (e.g., `plans/features/wishlist`)
- Story ID (e.g., `WISH-001`)

Read from `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/AGENT-CONTEXT.md`:
- `backend_fix`, `frontend_fix` flags
- `feature_dir`, `story_id`

Read from `{FEATURE_DIR}/UAT/{STORY_ID}/_implementation/FIX-CONTEXT.md`:
- Issues to fix

## Workers
| Worker | Agent | Condition |
|--------|-------|-----------|
| Backend | `dev-implement-backend-coder.agent.md` | backend_fix=true |
| Frontend | `dev-implement-frontend-coder.agent.md` | frontend_fix=true |

## Steps

1. **Read context** from AGENT-CONTEXT.md and FIX-CONTEXT.md

2. **Spawn workers (parallel)** - Single message, both `run_in_background: true`
   ```
   prompt: |
     Read instructions: .claude/agents/dev-implement-backend-coder.agent.md

     CONTEXT:
     feature_dir: {FEATURE_DIR}
     story_id: {STORY_ID}
     Mode: FIX (not initial implementation)
     Fix list: {FEATURE_DIR}/UAT/{STORY_ID}/_implementation/FIX-CONTEXT.md
     Output: {FEATURE_DIR}/UAT/{STORY_ID}/_implementation/BACKEND-LOG.md (append)

     SCOPE: Only fix listed issues. No new features. No unrelated refactors.
   ```

3. **Wait** for worker signals via TaskOutput

4. **Retry on type errors** (max 1):
   - Read error output
   - Respawn with `RETRY CONTEXT: <errors>`
   - If retry fails → write BLOCKERS.md

5. **Update FIX-CONTEXT.md** - Check off completed issues

## Retry Policy
| Error | Action |
|-------|--------|
| Type errors (1st) | Retry with context |
| Type errors (2nd) | BLOCKERS.md → BLOCKED |
| Lint/other | No retry → BLOCKED |

## Signals
- `FIX COMPLETE` - all workers done
- `FIX BLOCKED: <reason>` - retry exhausted or worker blocked

## Output (max 8 lines)
```
Fix: COMPLETE|BLOCKED
Backend: done|skipped|blocked (retries: 0|1)
Frontend: done|skipped|blocked (retries: 0|1)
Issues fixed: X/Y
```

## Token tracking
See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log {STORY_ID} dev-fix <in> <out>`
