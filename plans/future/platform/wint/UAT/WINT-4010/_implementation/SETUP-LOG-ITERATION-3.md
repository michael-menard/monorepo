# Setup Log — Iteration 3

**Story**: WINT-4010 (Create Cohesion Sidecar)
**Phase**: fix
**Started**: 2026-03-08T15:45:00Z
**Mode**: fix (code-review-failed)

## Preconditions

- [x] Story exists in failed-code-review
- [x] Status is failed-code-review
- [x] REVIEW.yaml present with findings

## Actions Completed

### 1. Checkpoint Updated (Iteration 2 → 3)

- Previous iteration: 2 (completed with PASS, no issues fixed — indicates needs rework)
- Current iteration: 3
- Current phase: fix
- Last successful phase: code_review
- Max iterations: 3
- E2E gate: skipped_no_ui_surface

### 2. Story Moved

- **From**: `plans/future/platform/wint/failed-code-review/WINT-4010`
- **To**: `plans/future/platform/wint/in-progress/WINT-4010`
- Status updated in frontmatter: `failed-code-review` → `in-progress`

### 3. Fix Summary Created (FIX-SUMMARY-ITERATION-3.yaml)

Code Review findings requiring critical fixes:

**Critical Issues (CR-1, CR-2)**:

1. **innerJoin excludes zero-capability features** (CR-1)
   - File: `packages/backend/sidecars/cohesion/src/compute-audit.ts:69`
   - Issue: Query uses `.innerJoin(capabilities, ...)` which silently excludes features without any CRUD mappings
   - Fix: Change to `.leftJoin` so features with zero capabilities are included as franken-features
   - AC Impact: AC-3, AC-8
   - Severity: critical

2. **packageName filter applied in-memory** (CR-2)
   - File: `packages/backend/sidecars/cohesion/src/compute-audit.ts:74-77`
   - Issue: Fetches all rows then filters by packageName in TypeScript, avoiding DB-level index usage
   - Fix: Push filter to SQL WHERE clause for index optimization
   - AC Impact: AC-3
   - Severity: medium

**Focus Files**:
- `packages/backend/sidecars/cohesion/src/compute-audit.ts`
- `packages/backend/sidecars/cohesion/src/compute-check.ts`
- `packages/backend/sidecars/cohesion/src/routes/cohesion.ts`

## Iteration History

- **Iteration 1**: Fixed 7 issues (type aliases, helpers, imports, assertions, comments) → PASS
- **Iteration 2**: No issues fixed → PASS (indicates CR findings were not addressed in previous iteration)
- **Iteration 3**: Critical CR findings pending fix (this iteration)

## Next Steps

1. Read story elaboration and test plan
2. Apply critical fixes:
   - Change innerJoin → leftJoin in computeAudit query
   - Move packageName filter to SQL WHERE clause
   - Update DrizzleDb type to support leftJoin and conditional where()
   - Handle nullable lifecycle_stage in grouping logic
3. Update downstream compute-check.ts to work with nullable results
4. Run unit and integration tests
5. Verify AC-3 and AC-8 acceptance criteria

## Constraints (from CLAUDE.md)

- Use Zod schemas for all types
- No barrel files — import from source directly
- Use @repo/logger, not console
- Minimum 45% test coverage
- Named exports preferred
- TypeScript strict mode enabled

## Risk Flags

- Critical join logic change (innerJoin → leftJoin) requires thorough testing
- Query optimization may affect performance or result shape
- Nullable fields require downstream logic updates
