# Story hskp-2008: Consolidate Wishlist Schemas to Single Source

## Status

Approved

## Story

**As a** developer,
**I want** a single source of truth for wishlist Zod schemas,
**so that** validation is consistent between API handlers and frontend clients.

## Background

During the wish-2000 QA review (QUAL-001), schema duplication was identified:
- `packages/core/api-client/src/schemas/wishlist.ts` - Client-facing schemas
- `apps/api/endpoints/wishlist/schemas/index.ts` - Handler-specific schemas

These schemas have subtle differences (e.g., userId validation, datetime types) that cause inconsistencies and maintenance burden.

## Acceptance Criteria

1. Single schema definition in `@repo/api-client` package
2. All endpoint handlers import from `@repo/api-client`
3. No schema duplication in `apps/api/endpoints/wishlist/schemas/`
4. Type consistency between request validation and response types
5. All tests pass

## Tasks / Subtasks

### Task 1: Audit Schema Differences (AC: 1, 4)

- [ ] Compare CreateWishlistItemSchema between packages
- [ ] Compare UpdateWishlistItemSchema between packages
- [ ] Compare WishlistItemSchema (response) between packages
- [ ] Document all differences (userId, datetime, price, etc.)

### Task 2: Consolidate to api-client (AC: 1, 2, 3)

- [ ] Update `packages/core/api-client/src/schemas/wishlist.ts` with unified schemas
- [ ] Add any missing schemas from handler package (ListWishlistQuerySchema, etc.)
- [ ] Ensure all handler-specific validation is covered
- [ ] Export all schemas and types from package index

### Task 3: Update Endpoint Handlers (AC: 2, 3)

- [ ] Update create-item handler imports
- [ ] Update update-item handler imports
- [ ] Update list handler imports
- [ ] Update delete-item handler imports
- [ ] Update reorder handler imports
- [ ] Update search handler imports
- [ ] Update get-item handler imports
- [ ] Update upload-image handler imports

### Task 4: Remove Duplicate Schemas (AC: 3)

- [ ] Delete `apps/api/endpoints/wishlist/schemas/index.ts` or reduce to re-exports
- [ ] Update any remaining local imports

### Task 5: Verify and Test (AC: 5)

- [ ] Run type checking across all packages
- [ ] Run existing tests
- [ ] Verify API responses match expected types

## Schema Alignment Needed

| Field | api-client | handlers | Resolution |
|-------|------------|----------|------------|
| userId | z.string().uuid() | z.string() | Use z.string() (Cognito sub not always UUID) |
| createdAt | z.string().datetime() | z.date() | Use z.string().datetime() for JSON |
| updatedAt | z.string().datetime() | z.date() | Use z.string().datetime() for JSON |
| store | z.string().min(1) | z.string().min(1) | Add WishlistStoreSchema enum |
| currency | z.string() | z.string() | Add CurrencySchema enum |
| price | z.string().regex() | z.string().regex() | Align regex patterns |

## Affected Files

| File | Action |
|------|--------|
| packages/core/api-client/src/schemas/wishlist.ts | Update as canonical source |
| packages/core/api-client/src/schemas/index.ts | Ensure all exports |
| apps/api/endpoints/wishlist/schemas/index.ts | Delete or minimize |
| apps/api/endpoints/wishlist/*/handler.ts | Update imports (8 files) |

## Definition of Done

- [ ] Single schema source in @repo/api-client
- [ ] All handlers use unified schemas
- [ ] No duplicate schema definitions
- [ ] Type checking passes
- [ ] Tests pass
- [ ] Code reviewed

## References

- QA Gate: docs/qa/gates/wish-2000-database-schema-types.yml (QUAL-001)
- Related: DEBT-002 (datetime inconsistency), QUAL-006 (userId type)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Created from wish-2000 QA findings | Quinn |
