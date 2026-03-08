# WINT-2120 Fix Setup — Iteration 1

**Date:** 2026-03-07T17:00:00Z  
**Mode:** fix  
**Previous Phase:** execute (completed with code review failure)  
**Current Phase:** fix  
**Iteration:** 1 / 3

## Failure Summary

The prior implementation (WINT-2120) completed execute phase successfully, with all acceptance criteria passing. However, code review identified a TypeScript compilation error:

**TS2307 Error (Line 412):**
```
Cannot find module 'drizzle-orm/node-postgres'
```

**Location:** `packages/backend/orchestrator/src/__tests__/integration/token-reduction-benchmark.integration.test.ts:412`

**Context:**
The benchmark integration test dynamically imports `drizzle-orm/node-postgres` to establish a database connection and read pack content sizes from `wint.context_packs`. This import was added as part of AC-3 implementation, but the underlying dependency was not declared in the @repo/orchestrator package.json.

## Root Cause

`drizzle-orm` is an integration test dependency (used only in test environments when connecting to PostgreSQL), but was never added to either `dependencies` or `devDependencies` in `packages/backend/orchestrator/package.json`.

## Issues to Fix

### Issue #1: Missing drizzle-orm dependency
- **File:** `packages/backend/orchestrator/package.json`
- **Severity:** Critical (blocks TypeScript type-checking)
- **Action Required:** Add `drizzle-orm` to `devDependencies`

### Issue #2: Verify dynamic import still works post-fix
- **File:** `packages/backend/orchestrator/src/__tests__/integration/token-reduction-benchmark.integration.test.ts`
- **Severity:** High
- **Action Required:** Run `pnpm check-types` to verify module resolution passes

## Fix Scope

### Touched Files
1. `packages/backend/orchestrator/package.json` — Add drizzle-orm to devDependencies
2. `packages/backend/orchestrator/src/__tests__/integration/token-reduction-benchmark.integration.test.ts` — No changes needed (import is correct, dependency was just missing)

### Risk Flags
- **Dependency Addition:** Low risk — drizzle-orm is already used in database-schema package
- **Dynamic Import:** No risk — syntax unchanged, only the underlying package becomes available

## Next Steps

1. Add `drizzle-orm` to `packages/backend/orchestrator/package.json` devDependencies
2. Run `pnpm install` to install the new dependency
3. Run `pnpm --filter orchestrator check-types` to verify TS2307 is resolved
4. Run full test suite: `pnpm --filter orchestrator test`
5. Verify no new errors were introduced

## Constraints & Decisions

- **Placement in Dependencies:** drizzle-orm goes in `devDependencies` because it's only needed for integration tests, not runtime
- **No Code Changes:** The test file implementation is correct; only the package.json was incomplete
- **Dynamic Import Pattern:** Maintained as-is; the dynamic import is appropriate for optional dependencies in tests

## Checkpoint Status

- **Current Phase:** fix
- **Last Successful Phase:** execute
- **Iteration:** 1
- **Blocked:** false
- **Gen Mode:** false

## Log Artifacts

- **CHECKPOINT.yaml** — Updated iteration to 1, phase to fix
- **FIX-SUMMARY.yaml** — Detailed issue breakdown and recommended actions
- **FIX-SETUP-LOG.md** — This file, documenting setup decisions

---

**Status:** READY FOR IMPLEMENTATION

Setup complete. Developer can now proceed to fix the identified issue.
