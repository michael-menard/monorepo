# Agent Context - KBAR-0060 Fix Setup

## Story Information

- **Story ID**: KBAR-0060
- **Title**: Sync Integration Tests
- **Feature Directory**: `plans/future/platform/kb-artifact-migration`
- **Story File**: `plans/future/platform/kb-artifact-migration/failed-code-review/KBAR-0060/KBAR-0060.md`
- **Status**: code-review-failed
- **Mode**: fix
- **Iteration**: 3

## Fix Context

### Failure Report
- **Source**: PR #382 (fix/KBAR-0060-code-review-fixes)
- **Reviewer**: CodeRabbitAI
- **Review Cycle**: 3
- **Reviewed At**: 2026-02-22T01:00:00Z

### Issues Fixed
1. **CR-1 (Critical)**: QueueItem.stage required field never populated
   - File: `.claude/scripts/refresh-work-queue.ts`
   - Line: 89
   - Status: FIXED - Added stageMap lookup before queue.push()

2. **CR-2 (Major)**: buildStageMap() never called in parseWorkOrder
   - File: `.claude/scripts/refresh-work-queue.ts`
   - Lines: 162-199, 307-308
   - Status: FIXED - buildStageMap now called and result used for stage/feature_dir population

## Artifacts Available

- `CHECKPOINT.yaml` - Fix checkpoint with iteration 3 tracking
- `SCOPE.yaml` - Scope analysis showing backend/packages/db touches
- `REVIEW.yaml` - Original code review verdict (FAIL) with ranked patches
- `EVIDENCE.yaml` - Evidence of fixes applied and verified

## Next Steps

1. Move story to `in-progress/`
2. Run verification workers (Verifier + optional Playwright if backend impacted)
3. Update CHECKPOINT.yaml with verification results
4. Move to `needs-code-review/` if verification passes

## Constraints (from CLAUDE.md)

- Use Zod schemas for all types
- No barrel files
- Use @repo/logger, not console
- Minimum 45% test coverage
- Named exports preferred

## Files Modified in This Fix

- `.claude/scripts/refresh-work-queue.ts` - Stage population and buildStageMap wiring
