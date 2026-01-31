# Agent Context - WISH-2011

## Story Information

| Field | Value |
|-------|-------|
| story_id | WISH-2011 |
| feature_dir | plans/future/wish |
| mode | implement |
| command | /dev-implement-story |

## Paths

| Path Type | Location |
|-----------|----------|
| story_file | plans/future/wish/in-progress/WISH-2011/WISH-2011.md |
| base_path | plans/future/wish/in-progress/WISH-2011/ |
| artifacts_path | plans/future/wish/in-progress/WISH-2011/_implementation/ |

## Source Paths

| Package | Path |
|---------|------|
| app-wishlist-gallery | apps/web/app-wishlist-gallery/src/ |
| test-setup | apps/web/app-wishlist-gallery/src/test/setup.ts |
| mocks | apps/web/app-wishlist-gallery/src/test/mocks/ |
| fixtures | apps/web/app-wishlist-gallery/src/test/fixtures/ (create) |
| api-client | packages/core/api-client/src/ |

## Existing Infrastructure

### MSW Setup
- Server configured in `src/test/mocks/server.ts`
- Handlers in `src/test/mocks/handlers.ts`
- Setup in `src/test/setup.ts` with `onUnhandledRequest: 'error'`

### Schemas
- `PresignResponseSchema` in `@repo/api-client/schemas/wishlist`
  - Fields: `presignedUrl` (string.url), `key` (string), `expiresIn` (number.int.positive)

### Existing Tests
- `useS3Upload.test.ts` - 16+ tests with mocked @repo/upload-client and RTK Query hooks
- `WishlistForm.test.tsx` - Component tests with mocked useS3Upload hook
- `AddItemPage.test.tsx` - Page tests with mocked WishlistForm

## Implementation Notes

- API base URL: `http://localhost:3001`
- S3 URL pattern: `https://*.amazonaws.com/*`
- TypeScript 4.9+ required for `satisfies` operator (already supported)
