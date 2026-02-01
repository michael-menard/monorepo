# Elaboration Report - WISH-2010

**Date**: 2026-01-28
**Verdict**: CONDITIONAL PASS

## Summary

Shared Zod schemas for wishlist feature have correct architecture (centralized in @repo/api-client) and sufficient test coverage (54+ existing tests). However, schema field definitions must align with existing Drizzle database schema from WISH-2000 before implementation. Key discovery: schemas already exist in codebase, story should pivot from "Create schemas" to "Schema Alignment and Documentation."

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

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Schema field mismatch with database | Medium | **ADDED AS AC**: Align WishlistItemSchema with Drizzle schema from WISH-2000. Field names: `title` not `name`, priority as integer 0-5 not enum, etc. | AC-NEW-1 |
| 2 | Missing presigned URL schemas | Low | Story AC6 mentions PurchaseItemSchema but AC7-9 do not export PresignRequestSchema/PresignResponseSchema which already exist. Verify if existing schemas satisfy all export requirements. | DEFERRED |
| 3 | Filter schema fields differ | Low | WishlistFilterSchema uses `search` but existing uses `q`. Reconcile field naming with actual API. | DEFERRED |
| 4 | Enum validation missing | Medium | **ADDED AS AC**: Priority field must validate as integer 0-5 (from database) not string enum. | AC-NEW-2 |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Schema drift from database | **add_as_ac** | Add acceptance criteria requiring alignment with WISH-2000 Drizzle schema before implementation. Core CRUD will fail if schemas don't match database structure. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Custom Zod error messages | **follow_up_story** | Create follow-up story for custom Zod error messages for better form UX. Platform-wide initiative. |
| 2 | Type-safe API client generation | **out_of_scope** | Platform-wide initiative beyond wishlist scope. |
| 3-8 | Schema snapshot testing, form helpers, Hono middleware, shared utils, OpenAPI gen, docs site | **out_of_scope** | Keep story focused on core schema alignment and documentation. |

### Follow-up Stories Suggested

- [ ] WISH-XXXX: Custom Zod error messages for wishlist forms (design, internationalization)

### Items Marked Out-of-Scope

- **Type-safe API client generation**: Platform-wide initiative beyond wishlist MVP scope.
- **Schema snapshot testing**: Out of scope for this story; can be added to regression suite later.
- **Hono middleware for validation**: Implementation detail; teams can build as needed.
- **Shared form helpers**: Out of scope; form libraries are team-specific.
- **OpenAPI spec generation**: Future enhancement for API documentation.
- **Docs site for schemas**: Out of scope; JSDoc comments sufficient for MVP.

## Key Discovery

**Schemas already exist** in `packages/core/api-client/src/schemas/wishlist.ts` with 54+ tests. This story should pivot from:
- ❌ "Create schemas from scratch"
- ✅ "Align schemas with database and document for use"

The implementation work is:
1. Verify schemas match WISH-2000 Drizzle structure
2. Update field names/types where needed (title vs name, priority type, etc.)
3. Export all required schemas from index.ts
4. Backend imports schemas from @repo/api-client
5. Add/update JSDoc and README documentation

## Proceed to Implementation?

**YES** - story may proceed to implementation with:
- Required Fix #1: Reconcile schema field names with WISH-2000 Drizzle schema
- Required Fix #2: Align priority enum to integer 0-5 from database
- New AC-NEW-1: Verify all field names match database schema
- New AC-NEW-2: Priority field validation matches database constraints
- Pivot scope: Focus on alignment and documentation of existing schemas, not creation from scratch
