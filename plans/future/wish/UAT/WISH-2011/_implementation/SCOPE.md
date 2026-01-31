# Scope - WISH-2011

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No backend changes - test infrastructure only |
| frontend | true | Test files in apps/web/app-wishlist-gallery/src/test/ |
| infra | false | No infrastructure changes - tests run locally and in CI |

## Scope Summary

This story creates MSW handlers and test fixtures for S3 upload flows, enabling reliable integration tests without external dependencies. All changes are within the test infrastructure - no production code modifications.

## Key Files to Create/Modify

### Create
- `apps/web/app-wishlist-gallery/src/test/fixtures/s3-mocks.ts` - Test fixtures
- `apps/web/app-wishlist-gallery/src/test/fixtures/index.ts` - Re-exports

### Modify
- `apps/web/app-wishlist-gallery/src/test/mocks/handlers.ts` - Add presign and S3 PUT handlers
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/WishlistForm.test.tsx` - Add integration tests
- `apps/web/app-wishlist-gallery/src/pages/__tests__/AddItemPage.test.tsx` - Add integration tests

### Verify
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` - Existing 16+ tests must pass
