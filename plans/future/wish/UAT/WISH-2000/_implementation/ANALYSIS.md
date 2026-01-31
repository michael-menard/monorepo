# Elaboration Analysis - WISH-2000

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md. Drizzle schema and Zod schemas for wishlist_items table as specified. |
| 2 | Internal Consistency | PASS | — | Goals, AC, and technical details are internally consistent. No contradictions between goals and non-goals. |
| 3 | Reuse-First | PASS | — | Story explicitly references existing Drizzle patterns and Zod schema structures from Sets/Instructions. Reuse plan documented. |
| 4 | Ports & Adapters | PASS | — | Schema definition is inherently transport-agnostic. Database schema and validation schemas are properly separated. |
| 5 | Local Testability | FAIL | High | Story mentions "31+ unit tests" but provides no Demo Script, .http requests, or concrete test execution plan. AC references tests but no executable test plan exists. |
| 6 | Decision Completeness | PASS | — | No TBDs or blocking decisions. Schema fields, types, indexes are fully specified. |
| 7 | Risk Disclosure | PASS | — | Risk noted: "changes after migration are costly." Appropriate for schema work. No hidden dependencies. |
| 8 | Story Sizing | PASS | — | 4 ACs, no endpoints, backend-only schema work. Single package touched. Well-scoped foundation story. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Schema and tests already exist in codebase | Critical | Story is describing work that has ALREADY BEEN COMPLETED. Drizzle schema exists at `apps/api/core/database/schema/index.ts` (lines 359-400). Zod schemas exist at `packages/core/api-client/src/schemas/wishlist.ts`. Tests exist at `packages/core/api-client/src/schemas/__tests__/wishlist.test.ts` with 16 test cases. Story must be marked DONE or rescoped. |
| 2 | Test count mismatch | High | Story claims "31+ unit tests" required, but only 16 test cases currently exist. Either: (a) accept existing 16 tests as sufficient, (b) identify 15+ missing test scenarios, or (c) revise AC to reflect actual coverage needs. |
| 3 | Schema field type mismatch | High | Drizzle schema uses `text('price')` for decimal storage (line 377 in index.ts), but story specifies `decimal(10,2)` in Technical Details table. Schema uses `jsonb('tags')` but story says `text[]`. Actual implementation differs from story spec. |
| 4 | Missing Demo Script | High | Story has no Demo Script section. Foundation stories should include verification steps (e.g., "compile schema", "run test suite", "verify exports"). |
| 5 | Index specification incomplete | Medium | Story specifies indexes `(userId, createdAt DESC)` and `(userId, sortOrder)`, but actual schema has 4 indexes: `idx_wishlist_user_id`, `idx_wishlist_user_sort`, `idx_wishlist_user_store`, `idx_wishlist_user_priority`. Schema includes indexes not mentioned in story. |
| 6 | Currency default handling | Low | Story says currency defaults to "USD" in Drizzle schema, but actual schema uses `default('USD')` via text field. Zod schema also defaults to 'USD'. Minor: ensure alignment between DB default and Zod default. |
| 7 | No migration file reference | Low | Story mentions WISH-2007 will run migration, but no migration file path or naming convention is specified for the schema migration itself. |

## Split Recommendation

Not applicable - story is appropriately sized.

## Preliminary Verdict

**Verdict**: FAIL

**Rationale**: Story describes work that has already been implemented. The Drizzle schema, Zod schemas, and tests already exist in the codebase. This is either:
1. A documentation-only story that should be marked DONE with verification of existing work, OR
2. A story that needs complete rescoping to address gaps in the existing implementation (e.g., missing test cases, schema alignment issues)

**Blocking Issues**:
1. Schema and tests already exist (Critical)
2. Test count mismatch vs. reality (High)
3. Schema field type mismatches (High)
4. Missing Demo Script (High)

**Recommendation**: PM should investigate why this story was generated for already-completed work. Suggest one of:
- Mark story DONE and verify existing implementation meets requirements
- Rescope story to "WISH-2000-VERIFY: Audit existing schema/tests and fill gaps"
- Move story to "completed" with timestamp indicating when work was actually done

---

## Discovery Findings

### Gaps & Blind Spots

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No schema validation tests | High | Low | Add tests validating Drizzle schema compiles and exports correctly. Current tests only cover Zod validation, not DB schema. |
| 2 | No test for schema<>Zod alignment | High | Medium | Add integration test ensuring Drizzle schema fields map correctly to Zod schema fields. Type mismatches could cause runtime errors. |
| 3 | Missing edge case: very large decimal values | Medium | Low | Test price field with values like "999999.99" to ensure decimal precision is maintained. Story specifies decimal(10,2) but implementation uses text. |
| 4 | No test for tags array handling in DB | Medium | Low | Verify jsonb array serialization/deserialization for tags field. Current tests only validate Zod schema for tags. |
| 5 | Missing test: sortOrder conflicts | Medium | Medium | Test behavior when multiple items have same sortOrder value. No uniqueness constraint mentioned. Could cause reorder bugs in WISH-2005a. |
| 6 | No documentation for userId source | Low | Low | Story notes userId is from Cognito JWT but doesn't specify validation. Should Zod schema validate userId format? |
| 7 | Release date timezone handling | Low | Low | Story specifies `timestamp` type but doesn't address timezone storage. Should be UTC with client-side display conversion. |
| 8 | No test for enum validation at DB level | Medium | Low | Store field accepts free text in Drizzle but Zod restricts to specific enum values. DB doesn't enforce enum - data integrity risk. |

### Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add DB-level enum constraint for store | High | Low | Consider using pgEnum for store field instead of text. Would prevent invalid store values at DB level, not just API level. |
| 2 | Add check constraint for priority range | Medium | Low | Add DB constraint `CHECK (priority >= 0 AND priority <= 5)` to enforce valid priority values at DB level. |
| 3 | Generate TypeScript types from Drizzle schema | Medium | Medium | Use `drizzle-kit introspect` to generate TS types from schema, then compare with Zod-inferred types. Reduces drift risk. |
| 4 | Add composite index for common queries | Medium | Low | Story mentions gallery view will query by (userId, store, priority). Consider composite index for filter combinations. |
| 5 | Document schema evolution strategy | Low | Low | Add section documenting how schema changes will be handled post-WISH-2007 (migrations, backward compatibility, rollback). |
| 6 | Add seed data generation | Low | Medium | Create seed data factory using existing schema for local dev/testing. Helpful for WISH-2001 gallery development. |
| 7 | Consider soft delete pattern | Low | High | Add `deletedAt` timestamp field for soft deletes. Allows "undo" functionality and prevents accidental data loss. Defer to WISH-2004 design decision. |
| 8 | Add created_by/updated_by audit fields | Low | Low | Track which user created/modified each item. Useful for multi-user accounts or admin features. Currently only userId (owner) is tracked. |

---

## Worker Token Summary

- Input: ~47k tokens (files read: WISH-2000.md, stories.index.md, PLAN.exec.md, PLAN.meta.md, qa.agent.md, schema files, test files)
- Output: ~2k tokens (ANALYSIS.md)
