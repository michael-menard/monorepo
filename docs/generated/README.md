# Generated Documentation

> ⚠️ **DO NOT EDIT THESE FILES MANUALLY**

Files in this directory are auto-generated from TypeScript schemas in `packages/backend/orchestrator/src/`.

## Regenerating

```bash
npx tsx scripts/generate-workflow-docs.ts
```

## Source Files

| Generated File | Source |
|----------------|--------|
| `STATUS-ENUM.md` | `packages/backend/orchestrator/src/state/story-state-machine.ts` |
| `ERROR-TYPES.md` | `packages/backend/orchestrator/src/errors/workflow-errors.ts` |
| `TOKEN-LIMITS.md` | `packages/backend/orchestrator/src/utils/token-budget.ts` |
| `MODEL-ASSIGNMENTS.md` | `.claude/config/model-assignments.yaml` |

## Sync Enforcement

- **Pre-commit hook**: Runs `check-workflow-sync.ts` on workflow-related changes
- **CI workflow**: Verifies sync on PRs touching workflow files
- **Generated docs check**: Ensures generated files match source schemas

## When to Regenerate

Regenerate when you:
1. Add/remove/rename story statuses in `StoryStatusSchema`
2. Add/remove/rename error types in `WorkflowErrorTypeSchema`
3. Change token limits in `DEFAULT_LIMITS`
4. Update model assignments in `model-assignments.yaml`
