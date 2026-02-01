# Agent Context - WISH-2027

## Story Information

| Field | Value |
|-------|-------|
| story_id | WISH-2027 |
| feature_dir | plans/future/wish |
| mode | qa-verify |
| command | qa-verify-story |
| timestamp | 2026-01-31T12:36:00-07:00 |

## Paths

| Path Type | Location |
|-----------|----------|
| base_path | plans/future/wish/UAT/WISH-2027/ |
| story_file | plans/future/wish/UAT/WISH-2027/WISH-2027.md |
| artifacts_path | plans/future/wish/UAT/WISH-2027/_implementation/ |
| elaboration_file | plans/future/wish/UAT/WISH-2027/ELAB-WISH-2027.md |
| proof_file | plans/future/wish/UAT/WISH-2027/PROOF-WISH-2027.md |
| verification_file | plans/future/wish/UAT/WISH-2027/_implementation/VERIFICATION.yaml |

## Story Summary

Documentation-only story to create Enum Evolution Runbook and example migration scripts for safely modifying PostgreSQL ENUMs (wishlist_store, wishlist_currency) in the wishlist feature.

## Deliverables

1. **Enum Evolution Runbook**: `packages/backend/database-schema/docs/enum-evolution-guide.md`
2. **Example Migration Scripts**: `packages/backend/database-schema/docs/enum-migration-examples/`
   - `add-store-example.sql`
   - `add-currency-example.sql`
   - `deprecate-store-example.sql`
   - `enum-to-table-migration.sql`

## Surfaces

| Surface | Impacted |
|---------|----------|
| backend | true (documentation) |
| frontend | false |
| infra | false |

## Dependencies

- WISH-2007 (parent story - defines the ENUMs being documented)

## Notes

- No code changes required
- No test files required (documentation only)
- SQL scripts are examples only, not actual migrations
