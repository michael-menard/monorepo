# Elaboration Report - WISH-2000

**Date**: 2026-01-25
**Verdict**: CONDITIONAL PASS

## Summary

Story describes database schema and Zod validation work where the core implementation already exists in the codebase. QA audit identified that Drizzle schema, Zod schemas, and tests are present but gaps in test coverage and validation need to be addressed. Story is conditionally approved to proceed with identified gaps added as acceptance criteria.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Drizzle schema and Zod schemas for wishlist_items table as specified. |
| 2 | Internal Consistency | PASS | — | Goals, AC, and technical details are internally consistent. No contradictions between goals and non-goals. |
| 3 | Reuse-First | PASS | — | Story explicitly references existing Drizzle patterns and Zod schema structures from Sets/Instructions. Reuse plan documented. |
| 4 | Ports & Adapters | PASS | — | Schema definition is inherently transport-agnostic. Database schema and validation schemas are properly separated. |
| 5 | Local Testability | FAIL (ADDRESSED) | High | Story mentions "31+ unit tests" but implementation has 16. Gap coverage added to ACs. |
| 6 | Decision Completeness | PASS | — | No TBDs or blocking decisions. Schema fields, types, indexes are fully specified. |
| 7 | Risk Disclosure | PASS | — | Risk noted: "changes after migration are costly." Appropriate for schema work. No hidden dependencies. |
| 8 | Story Sizing | PASS | — | 4 original ACs + gaps added. Well-scoped foundation story. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Schema and tests already exist | Critical | Incorporate existing implementation into story verification | RESOLVED - added gap ACs |
| 2 | Test count mismatch (31 vs 16) | High | Add missing test scenarios for complete coverage | RESOLVED - added as gap AC |
| 3 | Schema field type mismatch | High | Align story spec with actual implementation (text vs decimal, jsonb vs text[]) | RESOLVED - add schema validation tests AC |
| 4 | Missing Demo Script | High | Add verification steps section to story | NOTED - implementation phase concern |
| 5 | Index specification incomplete | Medium | Document all 4 indexes vs 2 mentioned | RESOLVED - add as part of schema tests AC |
| 6 | Currency default handling | Low | Ensure DB default and Zod default alignment | RESOLVED - add as schema validation AC |
| 7 | No migration file reference | Low | Migration to be handled by WISH-2007 | OUT-OF-SCOPE |

## Split Recommendation

Not applicable - story is appropriately sized and gaps have been incorporated as acceptance criteria.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| gap_1_schema_validation_tests | No schema validation tests (Drizzle schema compile/export tests) | **Add as AC** | Tests should verify DB schema compiles, exports correctly, and indexes are created. |
| gap_2_schema_zod_alignment | No test for schema<>Zod alignment | **Add as AC** | Integration test to ensure Drizzle schema fields map to Zod schema fields correctly. |
| gap_3_large_decimal_values | Missing edge case: very large decimal values | **Add as AC** | Test price field with values like 999999.99 to ensure precision maintained. Note: implementation uses text field, not decimal. |
| gap_4_tags_array_handling | No test for tags array handling in DB | **Add as AC** | Verify jsonb array serialization/deserialization for tags field. |
| gap_5_sortorder_conflicts | Missing test: sortOrder conflicts | **Add as AC** | Test behavior when multiple items have same sortOrder value. |
| gap_6_userid_source | No documentation for userId source | **Out-of-scope** | userId comes from Cognito JWT - authentication/authorization responsibility. |
| gap_7_timezone_handling | Release date timezone handling | **Out-of-scope** | Timezone handling is client-side display concern, UTC storage is standard. |
| gap_8_enum_validation_db | No test for enum validation at DB level | **Add as AC** | Test that store field enum values are enforced (either via pgEnum or constraint). |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| enh_1_db_enum_store | Add DB-level enum constraint for store field | **Add as AC** | Consider using pgEnum for store field to prevent invalid values at DB level. |
| enh_2_priority_check_constraint | Add check constraint for priority range (0-5) | **Add as AC** | Add DB constraint `CHECK (priority >= 0 AND priority <= 5)`. |
| enh_3_ts_types_from_drizzle | Generate TypeScript types from Drizzle schema | **Out-of-scope** | Project policy: only Zod types, never derive TS types independently. |
| enh_4_composite_index | Add composite index for common queries | **Add as AC** | Index for (userId, store, priority) used by gallery filtering. |
| enh_5_schema_evolution_docs | Document schema evolution strategy | **Add as AC** | Document post-WISH-2007 schema migration and backward compatibility approach. |
| enh_6_seed_data | Add seed data generation | **Add as AC** | Create seed data factory for local dev/testing. Helpful for WISH-2001 and later stories. |
| enh_7_soft_delete | Consider soft delete pattern | **Out-of-scope** | Deferring soft delete and "undo" to WISH-2004 design phase. |
| enh_8_audit_fields | Add created_by/updated_by audit fields | **Add as AC** | Track which user created/modified items. Useful for multi-user accounts. |

### Follow-up Stories Suggested

- [ ] Schema evolution and migration test suite (post-WISH-2007 deployment)
- [ ] Audit logging infrastructure for wishlist changes (created_by/updated_by)
- [ ] Soft delete implementation and "undo" recovery (WISH-2004 design)

### Items Marked Out-of-Scope

- **gap_6_userid_source**: userId comes from Cognito JWT - handled by authentication layer, not schema validation.
- **gap_7_timezone_handling**: UTC timestamp storage with client-side display conversion is standard practice.
- **enh_3_ts_types_from_drizzle**: Project policy requires Zod-first types only. TypeScript types derived from Zod via `z.infer<>`.

## Proceed to Implementation?

**YES** - story may proceed to implementation with gap ACs incorporated. The existing implementation provides strong foundation; gaps and enhancements add rigor and database-level integrity enforcement.

Recommended flow:
1. Incorporate gap ACs (8 items) and enhancement ACs (6 items) into acceptance criteria
2. Expand test suite from 16 to 31+ cases covering all identified gaps
3. Add DB-level constraints (enum, check) to schema
4. Add audit field tracking (created_by/updated_by)
5. Create seed data factory for downstream story testing
6. Document schema evolution strategy
