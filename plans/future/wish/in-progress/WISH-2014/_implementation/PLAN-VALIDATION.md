# Plan Validation - WISH-2014

## Validation Summary

**Result**: PLAN VALID

## Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | All ACs mapped to implementation chunks | PASS | AC1-18 covered across 8 chunks |
| 2 | File paths exist or are valid new paths | PASS | All target files verified in codebase |
| 3 | No architectural decisions required | PASS | Extends existing patterns |
| 4 | Dependencies ordered correctly | PASS | Schema -> Repository -> Service -> Tests |
| 5 | Test coverage meets minimum requirements | PASS | 15 backend + 5 frontend + 1 E2E |

## AC to Chunk Mapping

| AC | Description | Chunk |
|----|-------------|-------|
| AC1 | Extend ListWishlistQuerySchema | Chunk 1 |
| AC2 | Best Value algorithm | Chunk 2 |
| AC3 | Expiring Soon algorithm | Chunk 2 |
| AC4 | Hidden Gems algorithm | Chunk 2 |
| AC5 | 15 backend unit tests | Chunk 4 |
| AC6 | Integration tests (.http) | Chunk 5 |
| AC7 | Frontend dropdown options | Chunk 6 |
| AC8 | _primitives Select component | Chunk 6 |
| AC9 | Tooltips for options | Chunk 6 |
| AC10 | RTK Query integration | Chunk 6 |
| AC11 | Frontend component tests | Chunk 7 |
| AC12 | Playwright E2E test | Chunk 8 |
| AC13 | Schema synchronization | Chunk 1 |
| AC14 | Invalid sort error handling | Chunk 2, 5 |
| AC15 | Null value handling | Chunk 2, 4 |
| AC16 | Query performance < 2s | Chunk 2 |
| AC17 | Keyboard navigation | Chunk 7, 8 |
| AC18 | Screen reader support | Chunk 6, 7 |

## Risks Acknowledged

| Risk | Mitigation in Plan |
|------|-------------------|
| Division by zero | NULLIF in SQL (Chunk 2) |
| Null value handling | CASE statements placing nulls at end (Chunk 2) |
| Schema sync | Both files updated in Chunk 1 |
| Query performance | SQL-level sorting (no application layer) |

## Validation Notes

- Plan follows hexagonal architecture (repository layer handles sorting)
- No new database columns required
- Existing RTK Query hooks work without modification (schema extension only)
- Icons from lucide-react (already in project dependencies)
