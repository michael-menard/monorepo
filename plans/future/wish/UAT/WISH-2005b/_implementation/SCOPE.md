# Scope - WISH-2005b

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | No backend changes - reuses existing PUT /api/wishlist/reorder endpoint from WISH-2005a |
| frontend | true | RTK Query optimistic updates + undo flow in DraggableWishlistGallery component |
| infra | false | No infrastructure changes |

## Scope Summary

This story adds RTK Query optimistic cache updates to the existing `reorderWishlist` mutation and implements a 5-second undo window via toast notification, following patterns established in WISH-2041 (delete) and WISH-2042 (purchase).
