# Scope - WISH-2010

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Backend types.ts must import shared schemas from @repo/api-client instead of duplicating definitions |
| frontend | true | Frontend already uses @repo/api-client schemas; may need additional exports for ReorderResponseSchema, PresignRequest/Response |
| infra | false | No infrastructure changes required |

## Scope Summary

This story aligns the existing Zod schemas in `packages/core/api-client/src/schemas/wishlist.ts` with the WISH-2000 database schema, adds JSDoc documentation to all exports, and updates the backend `apps/api/lego-api/domains/wishlist/types.ts` to import from `@repo/api-client` instead of duplicating schema definitions. The schemas already exist with 54+ tests passing - this is an alignment and documentation story, not a creation-from-scratch story.

## Key Discovery

**Schemas Already Exist**: All required schemas are already defined in `packages/core/api-client/src/schemas/wishlist.ts`:
- WishlistItemSchema (aligned with WISH-2000 database schema)
- CreateWishlistItemSchema
- UpdateWishlistItemSchema
- WishlistQueryParamsSchema (equivalent to WishlistFilterSchema)
- BatchReorderSchema (equivalent to ReorderItemsSchema)
- MarkAsPurchasedInputSchema (equivalent to PurchaseItemSchema)
- PresignRequestSchema, PresignResponseSchema
- ReorderResponseSchema

## Implementation Pivot

Instead of creating schemas from scratch:
1. Add JSDoc documentation to existing schemas
2. Export additional schemas from index.ts (ReorderResponseSchema, PresignRequest/Response, MarkAsPurchased, GotItForm, SetItem)
3. Update backend types.ts to import from @repo/api-client instead of duplicating
4. Verify all acceptance criteria are met by existing implementation
