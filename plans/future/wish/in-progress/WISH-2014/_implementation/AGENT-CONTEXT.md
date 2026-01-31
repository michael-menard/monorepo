# Agent Context - WISH-2014

## Story Information

```yaml
story_id: WISH-2014
feature_dir: plans/future/wish
mode: implement
base_path: plans/future/wish/in-progress/WISH-2014/
artifacts_path: plans/future/wish/in-progress/WISH-2014/_implementation/
```

## Key Files to Modify

### Backend (apps/api/lego-api/domains/wishlist/)

| File | Changes |
|------|---------|
| types.ts | Extend ListWishlistQuerySchema sort enum with 'bestValue', 'expiringSoon', 'hiddenGems' |
| adapters/repositories.js | Implement SQL sorting logic with CASE statements for calculated fields |
| application/services.ts | Update listItems filter type to include new sort values |

### Shared Schemas (packages/core/api-client/src/schemas/)

| File | Changes |
|------|---------|
| wishlist.ts | Extend WishlistQueryParamsSchema sort enum with new values |

### Frontend (apps/web/app-wishlist-gallery/src/)

| File | Changes |
|------|---------|
| pages/main-page.tsx | Add new sort options with icons and tooltips to wishlistSortOptions array |

## Test Files to Create/Modify

| File | Purpose |
|------|---------|
| apps/api/lego-api/domains/wishlist/__tests__/smart-sorting.test.ts | 15 unit tests for sorting algorithms |
| apps/api/lego-api/__http__/wishlist-smart-sorting.http | Integration tests for API endpoints |
| apps/web/app-wishlist-gallery/src/pages/__tests__/smart-sorting.test.tsx | 5 component tests for dropdown |
| apps/web/playwright/wishlist/smart-sorting.spec.ts | E2E test for full sort flow |

## Algorithm Specifications

### Best Value (AC2)
- Formula: `price / pieceCount` (lowest ratio first)
- Null handling: Items with null price OR null pieceCount placed at end
- Zero handling: pieceCount = 0 treated as null (NULLIF)
- Order: Ascending (best value first)

### Expiring Soon (AC3)
- Sort by: `releaseDate` ascending (oldest first)
- Null handling: Items with null releaseDate placed at end
- Order: Ascending

### Hidden Gems (AC4)
- Formula: `score = (5 - priority) * pieceCount`
- Null handling: Items with null pieceCount placed at end
- Order: Descending (highest score first)

## Dependencies

- Story depends on: WISH-2001 (Gallery MVP) - COMPLETE
- No blocking dependencies

## Key Constraints

- Must use Zod schemas (no TypeScript interfaces)
- Must use @repo/app-component-library primitives
- Must maintain schema alignment between backend and frontend
- Query performance must be < 2s for 1000+ items
