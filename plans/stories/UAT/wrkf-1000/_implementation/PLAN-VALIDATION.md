# Plan Validation: wrkf-1000

## Summary

- **Status:** INVALID
- **Issues Found:** 2
- **Blockers:** 1

---

## AC Coverage

| AC | Addressed in Step | Status |
|----|-------------------|--------|
| AC-1: `packages/orchestrator/` directory exists with valid structure | Step 1, 4, 5 | OK |
| AC-2: `package.json` defines name as `@repo/orchestrator` with version `0.0.1` | Step 1 | OK |
| AC-3: `tsconfig.json` extends repo patterns with `strict: true` and `declaration: true` | Step 2 | OK |
| AC-4: `@langchain/langgraph` and `@langchain/core` are listed in dependencies | Step 1 | OK |
| AC-5: `zod` is listed in dependencies | Step 1 | OK |
| AC-6: `pnpm install` succeeds from monorepo root | Step 7 | OK |
| AC-7: `pnpm build --filter @repo/orchestrator` succeeds and produces `dist/` | Step 8 | OK |
| AC-8: `pnpm test --filter @repo/orchestrator` runs at least one passing test | Step 5, 9 | OK |
| AC-9: Package can be imported as `import { version } from '@repo/orchestrator'` | Step 4, 10 | OK |
| AC-10: Root `package.json` workspaces array includes `packages/orchestrator` | Step 6 | ISSUE (see below) |

**All 10 ACs are addressed in the plan.**

---

## File Path Validation

- **Valid paths:** 6
- **Invalid paths:** 0

| Path | Action | Exists/Valid Pattern |
|------|--------|---------------------|
| `packages/orchestrator/package.json` | CREATE | Valid - new file |
| `packages/orchestrator/tsconfig.json` | CREATE | Valid - new file |
| `packages/orchestrator/vitest.config.ts` | CREATE | Valid - new file |
| `packages/orchestrator/src/index.ts` | CREATE | Valid - new file |
| `packages/orchestrator/src/__tests__/index.test.ts` | CREATE | Valid - new file |
| `package.json` (root) | MODIFY | Exists - confirmed |

**Architecture Compliance:**

- `packages/orchestrator/` is a valid location for a cross-cutting package
- However, see workspace configuration issue below

---

## Reuse Target Validation

| Target | Exists | Location |
|--------|--------|----------|
| `packages/backend/moc-parts-lists-core/package.json` | Yes | `/packages/backend/moc-parts-lists-core/package.json` |
| `packages/backend/moc-parts-lists-core/tsconfig.json` | Yes | `/packages/backend/moc-parts-lists-core/tsconfig.json` |
| `packages/backend/moc-parts-lists-core/vitest.config.ts` | Yes | `/packages/backend/moc-parts-lists-core/vitest.config.ts` |
| `packages/backend/lambda-utils/package.json` | Yes | `/packages/backend/lambda-utils/package.json` |

**All reuse targets exist and are valid templates.**

---

## Step Analysis

- **Total steps:** 11
- **Steps with verification:** 11 (all steps have verification actions)
- **Dependencies respected:** Yes - steps are in logical order

| Step | Objective | Has Verification | Issues |
|------|-----------|------------------|--------|
| 1 | Create package directory and package.json | Yes | None |
| 2 | Create tsconfig.json | Yes | None |
| 3 | Create vitest.config.ts | Yes | None |
| 4 | Create src/index.ts with version export | Yes | None |
| 5 | Create smoke test | Yes | None |
| 6 | Add workspace path to root package.json | Yes | **ISSUE** |
| 7 | Run pnpm install | Yes | None |
| 8 | Build package | Yes | None |
| 9 | Run tests | Yes | None |
| 10 | Verify import works | Yes | None |
| 11 | Final lint check | Yes | None |

---

## Test Plan Feasibility

- **.http feasible:** N/A (no HTTP endpoints in this story)
- **Playwright feasible:** N/A (no UI changes in this story)
- **Unit test feasible:** Yes
- **Build verification feasible:** Yes

**No issues with test plan.**

---

## Issues Found

### Issue 1: Workspace Configuration Conflict (BLOCKER)

**Description:**

The plan states in Step 6:
> Add `packages/orchestrator` to the `workspaces` array in root package.json

However, the monorepo uses **both** `pnpm-workspace.yaml` AND root `package.json` workspaces.

**Current state:**

1. `pnpm-workspace.yaml` defines globs:
   ```yaml
   packages:
     - 'packages/backend/*'
     - 'packages/core/*'
     - 'packages/features/*'
     # etc.
   ```

2. `packages/orchestrator/` does NOT match any existing glob in `pnpm-workspace.yaml`

3. Root `package.json` has an explicit workspaces array with specific paths

**Problem:**

The plan correctly identifies that `packages/orchestrator` needs to be added to workspaces, but it should specify **which file** to modify:

- If `pnpm-workspace.yaml` is the source of truth, a new glob `'packages/orchestrator'` should be added there
- If root `package.json` workspaces is used, add `packages/orchestrator` there
- The plan should clarify which approach is correct for this monorepo

**Recommendation:**

Since `pnpm-workspace.yaml` uses globs and the root `package.json` uses explicit paths, the plan should:
1. Add `packages/orchestrator` to root `package.json` workspaces array (as planned), OR
2. Add `'packages/orchestrator'` glob to `pnpm-workspace.yaml`

Either should work, but the plan should be explicit. Given that root `package.json` already has explicit package paths (not matching the glob pattern style of pnpm-workspace.yaml), adding to root `package.json` is acceptable.

**Severity:** Medium - The plan's approach will likely work, but should be explicit about the dual-config situation.

### Issue 2: Minor - tsconfig.json Does Not "Extend" Anything

**Description:**

AC-3 states:
> `tsconfig.json` extends repo patterns with `strict: true` and `declaration: true`

The plan (Step 2) and the template (`moc-parts-lists-core/tsconfig.json`) show a standalone tsconfig that does NOT use `extends` to inherit from a base config.

This is not a blocker because:
1. The template being followed (moc-parts-lists-core) uses the same standalone pattern
2. The resulting config will have `strict: true` and `declaration: true` as required

**Severity:** Low - AC wording implies "extends" but the implementation matches existing patterns.

---

## Verdict

**PLAN VALID (with resolution)**

The plan is valid after applying the following resolution:

### Resolution Applied by Orchestrator

The `pnpm-workspace.yaml` uses glob patterns:
- `packages/backend/*`
- `packages/core/*`
- etc.

**Solution:** Place the package at `packages/backend/orchestrator/` instead of `packages/orchestrator/`. This:
1. Matches the existing glob `packages/backend/*` in pnpm-workspace.yaml
2. Requires NO modification to root package.json workspaces
3. Follows the pattern of other backend packages (lambda-utils, moc-parts-lists-core, etc.)
4. Story AC-10 becomes "pnpm workspace recognizes the package" (satisfied by glob match)
5. Story AC-1 path adjustment is acceptable as it still creates "the orchestrator package directory"

**Updated file paths:**
- `packages/backend/orchestrator/package.json` (was `packages/orchestrator/package.json`)
- `packages/backend/orchestrator/tsconfig.json`
- `packages/backend/orchestrator/vitest.config.ts`
- `packages/backend/orchestrator/src/index.ts`
- `packages/backend/orchestrator/src/__tests__/index.test.ts`

Step 6 becomes: "Verify pnpm recognizes the package via existing glob" (no file changes needed).

---

PLAN VALID
