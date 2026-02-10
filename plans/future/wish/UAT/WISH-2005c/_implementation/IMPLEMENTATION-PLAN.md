# Implementation Plan - WISH-2005c

## Overview

Create WishlistDragPreview component that displays an enhanced drag preview thumbnail during wishlist item reordering. This integrates with the existing DragOverlay in DraggableWishlistGallery.

## File Structure

```
apps/web/app-wishlist-gallery/src/components/
  WishlistDragPreview/
    index.tsx                  # Main component (lazy-loaded)
    WishlistDragPreviewContent.tsx  # Actual preview content (for lazy loading)
    __tests__/
      WishlistDragPreview.test.tsx  # Unit tests
    __types__/
      index.ts                 # Zod schemas for props
```

## Implementation Chunks

### Chunk 1: Create Type Definitions (AC-9, AC-10)

Create `__types__/index.ts`:
- WishlistDragPreviewPropsSchema with Zod
- Type for WishlistItem reuse from `@repo/api-client/schemas/wishlist`

### Chunk 2: Create WishlistDragPreviewContent Component

Create `WishlistDragPreviewContent.tsx`:
- Renders thumbnail preview with:
  - Image at 4:3 aspect ratio (AC-1, AC-10)
  - Title with 30-char truncation (AC-6)
  - Price display (AC-1)
- Styling:
  - 70% scale (transform: scale(0.7)) (AC-1)
  - 0.8 opacity (AC-1)
  - Shadow (shadow-xl) (AC-11)
  - Border highlight (ring-2 ring-primary) (AC-12)
- Framer Motion animation:
  - Fade-in (opacity 0 -> 0.8) over 150ms (AC-3)
  - Fade-out over 150ms (AC-4)
- Missing image fallback:
  - Package icon from Lucide (AC-5)
  - Same dimensions as image
- Tooltip on hover for long titles:
  - Uses @repo/app-component-library Tooltip primitives
  - 500ms delay (AC-6)

### Chunk 3: Create Main WishlistDragPreview with Lazy Loading (AC-13)

Create `index.tsx`:
- React.lazy() wrapper for WishlistDragPreviewContent
- Suspense fallback (minimal loading state)
- Export for use in DraggableWishlistGallery

### Chunk 4: Integrate with DraggableWishlistGallery

Modify `DraggableWishlistGallery/index.tsx`:
- Import WishlistDragPreview (lazy)
- Replace current DragOverlay content with WishlistDragPreview
- Pass activeItem as prop
- Ensure original card shows 0.5 opacity during drag (AC-3, AC-7)

### Chunk 5: Create Unit Tests

Create `__tests__/WishlistDragPreview.test.tsx`:
- Test: Renders with item data (image, title, price) (AC-1)
- Test: Scales to 70% with correct opacity (AC-1)
- Test: Missing image shows Package icon (AC-5)
- Test: Long titles are truncated with ellipsis (AC-6)
- Test: Tooltip shows on hover for long titles (AC-6)
- Test: Fade-in animation triggers on mount (AC-3)
- Test: Shadow and border are applied (AC-11, AC-12)
- Test: Layout is maintained (no shift) (AC-7)

## AC to Implementation Mapping

| AC | Implementation |
|----|----------------|
| AC-1 | WishlistDragPreviewContent: scale(0.7), opacity 0.8, shows image/title/price |
| AC-2 | Handled by dnd-kit DragOverlay (no code needed) |
| AC-3 | Framer Motion initial/animate with 150ms fade |
| AC-4 | Framer Motion exit with 150ms fade |
| AC-5 | Package icon fallback when imageUrl is null/empty |
| AC-6 | Title slice(0, 30) + ellipsis, Tooltip with 500ms delayDuration |
| AC-7 | SortableWishlistCard already handles this with style.opacity = 0.5 |
| AC-8 | Browser handles image caching natively |
| AC-9 | __tests__/WishlistDragPreview.test.tsx file location |
| AC-10 | Uses same img rendering approach as WishlistCard with GalleryCard |
| AC-11 | shadow-xl class on preview container |
| AC-12 | ring-2 ring-primary class for border highlight |
| AC-13 | React.lazy() in index.tsx, Suspense wrapper |

## Dependencies

- `framer-motion` - already in package.json
- `@repo/app-component-library` - Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
- `lucide-react` - Package icon
- `@repo/api-client/schemas/wishlist` - WishlistItem type

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Framer Motion exit animation not firing | Use AnimatePresence wrapper in DragOverlay |
| Tooltip provider missing | Check if TooltipProvider is already in app tree; add if not |
| Lazy loading bundle issue | Use dynamic import with Suspense fallback |

## Estimated Token Usage

- Chunk 1 (Types): ~200 tokens
- Chunk 2 (Preview Content): ~800 tokens
- Chunk 3 (Lazy Loading): ~200 tokens
- Chunk 4 (Integration): ~400 tokens
- Chunk 5 (Tests): ~1000 tokens
- **Total Estimated**: ~2,600 tokens
