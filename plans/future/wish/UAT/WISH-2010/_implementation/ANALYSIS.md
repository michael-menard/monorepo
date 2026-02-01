# Elaboration Analysis - WISH-2010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md entry. Story creates shared schemas only, no endpoints or infrastructure. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. Story focuses on schema definitions, excludes implementation details. |
| 3 | Reuse-First | PASS | — | Creates schemas in shared `@repo/api-client` package for reuse across frontend/backend. No one-off utilities. |
| 4 | Ports & Adapters | PASS | — | Story is schema-only, no endpoint implementation. Backend will import schemas (AC8 confirms). |
| 5 | Local Testability | PASS | — | AC10-12: 20+ unit tests for schema validation. No .http tests needed (schema-only story). |
| 6 | Decision Completeness | FAIL | Medium | Missing decision on schema field drift vs Drizzle database schema (see Issue #1). |
| 7 | Risk Disclosure | PASS | — | Three risks disclosed: circular dependency, schema drift, build order. All have mitigations. |
| 8 | Story Sizing | PASS | — | 2 points estimated. 14 ACs, schema definitions only. Well-sized for foundation work. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Schema field mismatch with database | Medium | WishlistItemSchema in story uses `name` field, but Drizzle schema uses `title`. UpdateWishlistItemSchema references fields not in Drizzle (store is enum, price constraints differ). Story must reference WISH-2000 Drizzle schema for field names. |
| 2 | Missing presigned URL schemas | Low | Story AC6 mentions PurchaseItemSchema but AC7-9 do not export PresignRequestSchema/PresignResponseSchema which already exist in the codebase. Should these be exported? |
| 3 | Filter schema fields differ | Low | WishlistFilterSchema in story uses `search` but existing schemas use `q`. Story uses `page/limit` correctly but missing `sort/order` vs `sortBy/sortOrder` clarification. |
| 4 | Enum validation missing | Medium | Story schema uses string enums (`priority: z.enum(['low', 'medium', 'high'])`) but database uses integer priority (0-5). Schema must match database design from WISH-2000. |

## Split Recommendation (if applicable)

N/A - Story is appropriately sized for schema setup work.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning**: Story has correct architecture (shared schemas in `@repo/api-client`) and sufficient test coverage (20+ tests). However, schema field definitions do not align with existing Drizzle database schema from WISH-2000. Must reconcile field names, types, and validation rules with database schema before implementation.

**Required Fixes Before Implementation**:
1. Review WISH-2000 Drizzle schema and align all field names/types
2. Reconcile priority enum (string vs integer 0-5)
3. Update WishlistItemSchema to use `title` not `name`
4. Align filter schema field names (`search` vs `q`)
5. Document schema design decisions in story

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Schema drift from database | Core CRUD operations will fail validation if schemas don't match database | Align WishlistItemSchema fields with Drizzle wishlistItems table from WISH-2000 |

**Analysis**: The story references WISH-2000 database schema but proposes schemas that don't match the actual Drizzle definition. This will cause runtime validation failures when backend services attempt to validate database results against Zod schemas.

**Specific Mismatches**:
- Story uses `name` field, database has `title`
- Story uses `priority: z.enum(['low', 'medium', 'high'])`, database has `priority: integer (0-5)`
- Story uses `notes: z.string().max(1000)`, database has no length constraint
- Story uses `store: z.string()`, database has `wishlistStoreEnum` with specific values

---

## Worker Token Summary

- Input: ~4,200 tokens (story, index, api-layer.md, existing schemas, database schema)
- Output: ~1,800 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~6,000 tokens
