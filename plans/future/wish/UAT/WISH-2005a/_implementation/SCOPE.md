# Scope - WISH-2005a

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | false | PUT /api/wishlist/reorder endpoint already exists |
| frontend | true | New drag-and-drop components with dnd-kit |
| infra | false | No infrastructure changes required |

## Scope Summary

This story implements frontend drag-and-drop reordering for wishlist items using the existing dnd-kit library (from @repo/gallery). It creates SortableWishlistCard and DraggableWishlistGallery components, adds an RTK Query mutation for the existing reorder endpoint, and integrates into main-page.tsx with error handling and rollback support.
