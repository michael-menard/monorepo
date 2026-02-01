# Plan Validation - WISH-20180

## Validation Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | All ACs covered | PASS | 20 ACs mapped to 6 implementation chunks |
| 2 | Chunks are independently testable | PASS | Each chunk produces verifiable output |
| 3 | Dependencies clearly defined | PASS | Execution order specified with dependency graph |
| 4 | No external package additions | PASS | Uses existing tsx, no new dependencies |
| 5 | Verification steps defined | PASS | 5 verification steps listed |
| 6 | Risk mitigations included | PASS | 3 risks identified with mitigations |

## AC Coverage Matrix

| AC | Chunk | Implementation |
|----|-------|---------------|
| AC 1 | Chunk 3 | Workflow triggers on PR paths |
| AC 2 | Chunk 3 | Workflow runs `pnpm validate:schema` |
| AC 3 | Chunk 3 | Workflow posts PR comment via github-script |
| AC 4 | Chunk 3 | Workflow exits with code 1 on critical violations |
| AC 5 | Chunk 3 | Workflow passes with warnings/no violations |
| AC 6 | Chunk 1 | `validateMigrationNaming()` function |
| AC 7 | Chunk 1 | `validateJournalEntry()` function |
| AC 8 | Chunk 1 | `parseMigrationSQL()` function |
| AC 9 | Chunk 1 | `detectDuplicateMigrationNumbers()` function |
| AC 10 | Chunk 1 | `detectBreakingChanges()` - DROP COLUMN |
| AC 11 | Chunk 1 | `detectBreakingChanges()` - DROP TABLE |
| AC 12 | Chunk 1 | `detectBreakingChanges()` - enum removal |
| AC 13 | Chunk 1 | `detectBreakingChanges()` - ALTER TYPE |
| AC 14 | Chunk 1 | Deprecation comment detection |
| AC 15 | Chunk 1 | `validateNonBreakingChanges()` - optional columns |
| AC 16 | Chunk 1 | `validateNonBreakingChanges()` - required columns |
| AC 17 | Chunk 1 | `validateNonBreakingChanges()` - CONCURRENTLY |
| AC 18 | Chunk 1 | `validateNonBreakingChanges()` - enum addition |
| AC 19 | Chunk 6 | CI-SCHEMA-VALIDATION.md documentation |
| AC 20 | Chunk 6 | Policy references in validation messages |

## Architectural Decisions

No architectural decisions requiring user input identified. The implementation uses:
- Existing project patterns (tsx for scripts)
- Standard GitHub Actions patterns from ci.yml
- Regex-based SQL analysis (no external parser)

## PLAN VALID

The implementation plan covers all acceptance criteria with clear execution order, dependencies, and verification steps. Proceed to implementation.
