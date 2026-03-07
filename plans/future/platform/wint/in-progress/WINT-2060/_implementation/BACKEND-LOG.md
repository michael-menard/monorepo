# BACKEND-LOG — WINT-2060 Fix Iteration 2

**Date**: 2026-03-06
**Mode**: FIX (post-review, iteration 1 → 2)

## Issue Fixed

**HIGH priority — reusability**: Duplicated `readDoc` utility function across three populate scripts.

- `populate-library-cache.ts` (line 55 before fix)
- `populate-domain-kb.ts` (line 38 before fix)
- `populate-project-context.ts` (line 43 before fix)

All three had identical implementations differing only in the log tag string.

## Fix Applied

Created shared utility:
- `packages/backend/mcp-tools/src/scripts/utils/read-doc.ts`

Exported `readDoc(relPath, callerTag?)` accepting an optional caller tag parameter (defaults to `[read-doc]`).

Updated all three scripts to:
1. Remove `readFileSync` and `resolve` imports (no longer needed directly)
2. Remove local `MONOREPO_ROOT` constant (moved to shared utility)
3. Import `readDoc as readDocUtil` from `./utils/read-doc.js`
4. Define a `CALLER_TAG` constant per script (e.g. `[populate-library-cache]`)
5. Keep a thin local `readDoc(relPath)` wrapper that calls `readDocUtil(relPath, CALLER_TAG)`

This preserves the distinct log prefixes in each script while eliminating the duplicated implementation.

## Verification

```
pnpm --filter @repo/mcp-tools check-types   PASS
pnpm --filter @repo/mcp-tools test          PASS  (37 files, 362 tests)
```
