# Future Opportunities - WISH-2010

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | OpenAPI spec generation deferred | Medium - Would improve API documentation | Medium | Add OpenAPI schema generation from Zod schemas in Phase 3+ for auto-generated API docs |
| 2 | Schema versioning strategy not defined | Low - Not needed until breaking changes | Low | Document schema versioning approach when first breaking change is needed |
| 3 | No schema evolution migration guide | Low - Schemas will change over time | Low | Create guide for safely updating shared schemas without breaking clients |
| 4 | Missing JSDoc examples for complex schemas | Low - Developers can read Zod directly | Low | Add code examples in JSDoc for ReorderItemsSchema and WishlistFilterSchema |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Schema validation error messages | Medium - Better UX for form validation | Low | Customize Zod error messages with user-friendly text (e.g., "Title must be between 1-200 characters" instead of "String must contain at least 1 character(s)") |
| 2 | Runtime performance optimization | Low - Zod parsing is fast enough for MVP | Medium | Add schema compilation/caching if validation becomes bottleneck (measure first) |
| 3 | Type-safe API client generation | High - Would eliminate manual RTK Query typing | High | Generate RTK Query endpoints from Zod schemas (similar to tRPC) |
| 4 | Schema snapshot testing | Medium - Prevents accidental breaking changes | Low | Add snapshot tests for schemas to detect unintended changes during refactoring |
| 5 | Shared validation utilities | Low - Keep schemas pure in MVP | Low | Extract common patterns (e.g., UUID validation, price regex) into reusable Zod utilities |
| 6 | Frontend form integration helpers | Medium - Reduces boilerplate | Medium | Create React Hook Form integration helpers that auto-wire Zod schemas |
| 7 | Backend middleware integration | Medium - DRY validation logic | Low | Create Hono middleware that auto-validates request bodies using schemas |
| 8 | Schema documentation site | Medium - Searchable schema reference | High | Generate documentation site from JSDoc comments (similar to TypeDoc) |

## Categories

- **Edge Cases**: Schema drift detection, versioning strategy
- **UX Polish**: Custom error messages, form integration helpers
- **Performance**: Schema compilation/caching if needed
- **Observability**: Schema snapshot testing, documentation generation
- **Integrations**: OpenAPI generation, type-safe client generation

## Notes

### Already Implemented (Not Gaps)

The following items from the story are already implemented in the codebase:

1. **WishlistItemSchema**: Already exists in `packages/core/api-client/src/schemas/wishlist.ts` with full field definitions
2. **CreateWishlistItemSchema**: Already exists with proper field validation
3. **UpdateWishlistItemSchema**: Already exists using `.partial()`
4. **WishlistQueryParamsSchema**: Already exists (though field names differ from story)
5. **BatchReorderSchema**: Already exists as `ReorderItemsSchema`
6. **PresignRequestSchema/PresignResponseSchema**: Already exist for S3 image upload
7. **MarkAsPurchasedInputSchema**: Already exists for "Got It" flow (WISH-2004)
8. **Comprehensive test coverage**: 54+ existing tests in `__tests__/wishlist.test.ts`

**Recommendation**: Story should be updated to "Schema Alignment and Documentation" rather than "Create schemas from scratch". The work is aligning existing schemas with database and documenting import patterns.

### Schema Design Philosophy

The existing implementation demonstrates good practices:

- **Dual schemas**: Separate schemas for database output (`WishlistItemSchema` with dates as strings) vs input (`CreateWishlistItemSchema` with validation)
- **Reusability**: `UpdateWishlistItemSchema` reuses `CreateWishlistItemSchema.partial()`
- **Type inference**: All types derived via `z.infer<>`
- **Enum safety**: Store and currency use Zod enums matching database enums
- **Decimal precision**: Price stored as string to avoid floating-point errors

These patterns should be maintained when aligning with database schema.
