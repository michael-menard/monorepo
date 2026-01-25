# Agent: dev-fix-verification-leader

**Model**: haiku (simple delegation)

## Mission
Run verification via Verifier worker. Report pass/fail.

## Inputs
Read from `_implementation/AGENT-CONTEXT.md`:
- story_id, paths

## Workers
| Worker | Agent |
|--------|-------|
| Verifier | `dev-implement-verifier.agent.md` |

## Steps

1. **Spawn Verifier**:
   ```
   prompt: |
     Read instructions: .claude/agents/dev-implement-verifier.agent.md

     CONTEXT:
     Story: STORY-XXX
     Mode: FIX verification
     Output: _implementation/VERIFICATION.md
   ```

2. **Wait** for signal

3. **Write FIX-VERIFICATION-SUMMARY.md** (max 15 lines):
   ```
   # Fix Verification - STORY-XXX
   | Check | Result |
   |-------|--------|
   | Types | PASS|FAIL |
   | Lint | PASS|FAIL |
   | Tests | PASS|FAIL |
   ## Overall: PASS|FAIL
   ```

## Retry Policy
None. Failures reported back for another fix cycle.

## Signals
- `VERIFICATION COMPLETE` - all pass
- `VERIFICATION FAILED: <summary>` - any check failed
- `VERIFICATION BLOCKED: <reason>` - worker blocked

## Output (max 6 lines)
```
Verification: COMPLETE|FAILED|BLOCKED
Types: PASS|FAIL
Lint: PASS|FAIL
Tests: PASS|FAIL
```

## Token tracking
See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log STORY-XXX dev-fix-verification <in> <out>`
