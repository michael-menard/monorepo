# Proof Report - WINT-1050

**Story**: WINT-1050 — Update /story-update Command to Write Status to Database via Compatibility Shim
**Date**: 2026-02-17
**Verdict**: PASS

## Summary

Updated `.claude/commands/story-update.md` from v2.1.0 to v3.0.0, adding DB-first write via `shimUpdateStoryStatus` as the primary status write target. All 10 acceptance criteria satisfied.

## Changes Made

### `.claude/commands/story-update.md` (v2.1.0 → v3.0.0)

1. **Version bump**: v2.1.0 → v3.0.0 (major: DB integration is breaking behavioral change)
2. **Description updated**: Now mentions database as primary write target
3. **Status → DB State Mapping table**: 14-row table mapping command statuses to DB `newState` values, with explicit skip decisions for 6 non-mappable statuses
4. **Step 3 (DB Write)**: New step inserted before frontmatter update, calling `shimUpdateStoryStatus` with mapped state, null-return handling, and --no-index independence
5. **Step 3.5 (Frontmatter)**: Existing Step 3 renamed to 3.5, always runs after DB write
6. **Step 5 (Result YAML)**: Added `db_updated: true | false` field
7. **Error Handling**: Added DB write failure and non-mappable status rows
8. **Integration Test Scenarios**: 6 scenarios (A-F) documenting happy path, DB unavailable, invalid transition, uat→completed order, non-mappable skip, and BLOCKED mapping

## Execution Order (verified)

1. Step 1: Locate story file
2. Step 2: Worktree cleanup (uat → completed only)
3. Step 3: DB write via shimUpdateStoryStatus
4. Step 3.5: Frontmatter update (always)
5. Step 4: Index update (unless --no-index)
6. Step 5: Return result with db_updated field

## AC Traceability

| AC | Status | Location in File |
|----|--------|-----------------|
| AC-1 | PASS | Step 3 before Step 3.5 |
| AC-2 | PASS | Mapping table (14 rows) |
| AC-3 | PASS | Step 3 null-return handling |
| AC-4 | PASS | Step 5 result YAML |
| AC-5 | PASS | Step 2 → Step 3 → Step 3.5 order |
| AC-6 | PASS | Step 3 prerequisite |
| AC-7 | PASS | Step 3 note on --no-index |
| AC-8 | PASS | Frontmatter version: 3.0.0 |
| AC-9 | PASS | Integration Test Scenarios section |
| AC-10 | PASS | Mapping table skip decisions |

## E2E Gate

**Exempt**: Docs-only story modifying a single markdown command spec. No runtime code changes, no E2E tests applicable.

## Risk Assessment

- **Low risk**: Single file change, no TypeScript code modified
- **Backward compatible**: Frontmatter + index writes retained alongside DB write
- **Graceful degradation**: DB failure → WARNING + filesystem fallback (no hard failure)
