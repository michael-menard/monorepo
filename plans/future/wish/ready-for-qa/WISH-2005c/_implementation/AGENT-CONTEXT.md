# Agent Context - WISH-2005c

## Story Context

```yaml
story_id: WISH-2005c
feature_dir: plans/future/wish
mode: implement
base_path: plans/future/wish/in-progress/WISH-2005c/
artifacts_path: plans/future/wish/in-progress/WISH-2005c/_implementation/
story_file: plans/future/wish/in-progress/WISH-2005c/WISH-2005c.md
elaboration_file: plans/future/wish/in-progress/WISH-2005c/ELAB-WISH-2005c.md
```

## Key Paths

- **Component Location**: `apps/web/app-wishlist-gallery/src/components/WishlistDragPreview/`
- **Test Location**: `apps/web/app-wishlist-gallery/src/components/WishlistDragPreview/__tests__/`
- **Integration Target**: `apps/web/app-wishlist-gallery/src/components/DraggableWishlistGallery/index.tsx`

## Dependencies

- **WISH-2005a**: Provides DnDContext, DragOverlay, useSortable hooks (Status: UAT - COMPLETE)
- **WishlistItem type**: From `@repo/api-client/schemas/wishlist`
- **Framer Motion**: For fade animations
- **Lucide React**: For Package icon fallback
- **Radix Tooltip**: From `@repo/app-component-library/_primitives/Tooltip`

## Acceptance Criteria Summary

| AC | Description | Category |
|----|-------------|----------|
| AC-1 | DragOverlay displays item thumbnail at 70% scale, 0.8 opacity | Core |
| AC-2 | Preview follows cursor/touch position | Core |
| AC-3 | Smooth fade-in (150ms) on drag start | Core |
| AC-4 | Smooth fade-out (150ms) on drag end | Core |
| AC-5 | Missing image fallback with Package icon | Fallback |
| AC-6 | Title truncation at 30 chars with tooltip (500ms delay) | Fallback |
| AC-7 | No layout shift during drag | Performance |
| AC-8 | Thumbnail caching | Performance |
| AC-9 | Test structure specification | From Elaboration |
| AC-10 | Image component specification | From Elaboration |
| AC-11 | Shadow configuration | From Elaboration |
| AC-12 | Border highlight | From Elaboration |
| AC-13 | Code-splitting/lazy load | From Elaboration |
