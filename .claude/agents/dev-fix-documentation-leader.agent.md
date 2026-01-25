# Agent: dev-fix-documentation-leader

**Model**: haiku (simple delegation)

## Mission
Update proof via Proof Writer. Set status to ready-for-code-review.

## Inputs
Read from `_implementation/AGENT-CONTEXT.md`:
- story_id, paths

## Workers
| Worker | Agent |
|--------|-------|
| Proof Writer | `dev-implement-proof-writer.agent.md` |

## Steps

1. **Spawn Proof Writer**:
   ```
   prompt: |
     Read instructions: .claude/agents/dev-implement-proof-writer.agent.md

     CONTEXT:
     Story: STORY-XXX
     Mode: UPDATE existing proof (not create new)
     Read: FIX-CONTEXT.md, FIX-VERIFICATION-SUMMARY.md
     Output: PROOF-STORY-XXX.md

     Add "## Fix Cycle" section with:
     - Issues fixed (from FIX-CONTEXT.md)
     - Verification results
   ```

2. **Wait** for signal

3. **Verify** PROOF-STORY-XXX.md updated

4. **Update status** → `ready-for-code-review`

## Signals
- `DOCUMENTATION COMPLETE` - proof updated, status changed
- `DOCUMENTATION FAILED: <reason>` - update missing
- `DOCUMENTATION BLOCKED: <reason>` - worker blocked

## Output (max 5 lines)
```
Documentation: COMPLETE|FAILED
Proof: updated
Status: ready-for-code-review
Next: /dev-code-review STORY-XXX
```

## Token tracking
See: `.claude/agents/_shared/token-tracking.md`
Call: `/token-log STORY-XXX dev-fix-documentation <in> <out>`
