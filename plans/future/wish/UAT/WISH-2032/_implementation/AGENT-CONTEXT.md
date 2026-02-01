# Agent Context - WISH-2032

## Story Context
- **Story ID**: WISH-2032
- **Feature Directory**: plans/future/wish
- **Mode**: implement
- **Base Path**: plans/future/wish/in-progress/WISH-2032/
- **Artifacts Path**: plans/future/wish/in-progress/WISH-2032/_implementation/

## Key Files
- Story: `plans/future/wish/in-progress/WISH-2032/WISH-2032.md`
- Scope: `_implementation/SCOPE.md`
- Implementation Plan: `_implementation/IMPLEMENTATION-PLAN.md`

## Components to Modify
- `apps/web/app-wishlist-gallery/src/pages/AddItemPage.tsx`
- `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`
- `packages/core/api-client/src/rtk/wishlist-gallery-api.ts`

## Relevant Existing Code
- RTK Query mutation: `useAddWishlistItemMutation` in wishlist-gallery-api.ts
- Optimistic update pattern already in place for reorder: `reorderWishlist` endpoint
- Toast utilities: `showSuccessToast`, `showErrorToast` from @repo/app-component-library

## Implementation Notes
- Frontend-only story
- Uses RTK Query's `onQueryStarted` hook for optimistic updates
- Follows existing WISH-2005 pattern for optimistic updates
