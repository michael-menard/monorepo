# WISH-2005c: Drag preview thumbnail

**Status:** ready-for-code-review
**Depends On:** WISH-2005a
**Follow-up From:** WISH-2005a QA Elaboration
**Phase:** 4 - UX Polish
**Complexity:** Small
**Effort:** 1-2 points
**Priority:** Medium (nice-to-have UX enhancement)

## Summary

Enhanced visual feedback during drag operations with item preview thumbnail displayed in DragOverlay instead of generic ghost.

## User Story

As a user reordering my wishlist items via drag-and-drop, I want to see a thumbnail preview of the item I'm dragging so that I have clear visual confirmation of which item I'm moving and where it will land.

## Scope

- Display WishlistCard thumbnail in DragOverlay (reduced opacity, 70% scale)
- Show item image, title, and price in preview
- Smooth transition into and out of drag state

## Acceptance Criteria

### Core Drag Preview (4 ACs)

1. **AC-1: DragOverlay displays item thumbnail**
   - When user starts dragging a WishlistCard, the DragOverlay shows a thumbnail preview of the card
   - Preview includes: item image, title, and price
   - Preview is styled at 70% scale with reduced opacity (0.8)

2. **AC-2: Preview follows cursor/touch position**
   - The drag preview follows the cursor (mouse) or touch point smoothly
   - Preview maintains consistent offset from pointer (e.g., 10px right, 10px down)

3. **AC-3: Smooth transition into drag state**
   - When drag starts, the preview fades in (opacity 0 → 0.8) over 150ms
   - The original card remains in place with reduced opacity (0.5) as a placeholder

4. **AC-4: Smooth transition out of drag state**
   - When drag ends (drop or cancel), the preview fades out over 150ms
   - The item animates smoothly to its new position (or back to original if cancelled)

### Fallback Behavior (2 ACs)

5. **AC-5: Missing image fallback**
   - If item has no image, show a placeholder icon (Package icon from Lucide) in the preview
   - Placeholder maintains same dimensions as image would have

6. **AC-6: Long title truncation**
   - Titles longer than 30 characters are truncated with ellipsis in the preview
   - Full title shown via tooltip on hover if preview is stationary for 500ms+

### Performance (2 ACs)

7. **AC-7: No layout shift during drag**
   - Original card maintains its space in the grid during drag (no collapse)
   - Other cards do not shift position while item is being dragged

8. **AC-8: Thumbnail caching**
   - Thumbnail images are cached after first load
   - Subsequent drags of same item show preview instantly (no flicker)

## Technical Notes

### dnd-kit DragOverlay Usage

```tsx
import { DragOverlay } from '@dnd-kit/core'

// In the component that wraps the sortable list:
<DragOverlay>
  {activeItem ? (
    <WishlistDragPreview item={activeItem} />
  ) : null}
</DragOverlay>
```

### WishlistDragPreview Component

New component: `apps/web/app-wishlist-gallery/src/components/WishlistDragPreview/index.tsx`

Props:
- `item: WishlistItem` - The item being dragged

Styling:
- Uses Framer Motion for fade transitions
- Applies `transform: scale(0.7)` and `opacity: 0.8`
- Shadow effect for visual lift (shadow-lg)

### Integration Points

- Integrates with WISH-2005a drag-and-drop implementation
- Uses same WishlistItem type from `@repo/api-client`
- Reuses image component from WishlistCard

## Out of Scope

- Haptic feedback (covered by WISH-2005d)
- Drop zone indicators (covered by WISH-2005e)
- Spring physics animations (covered by WISH-2005f)
- Custom cursor during drag

## Dependencies

- WISH-2005a: Core drag-and-drop must be implemented first (provides DnDContext, useSortable hooks)

## Test Plan

### Unit Tests

1. WishlistDragPreview renders with item data (image, title, price)
2. Preview scales to 70% with correct opacity
3. Missing image shows placeholder icon
4. Long titles are truncated with ellipsis
5. Fade-in animation triggers on mount
6. Fade-out animation triggers on unmount

### Integration Tests

1. DragOverlay shows preview when drag starts
2. Preview follows cursor during drag
3. Original card shows placeholder styling during drag
4. Preview disappears on drop
5. Preview disappears on cancel (Escape key)

## Source

Follow-up from QA Elaboration of WISH-2005a (Enhancement Opportunity #1)

**Original Finding:** Enhanced visual feedback during drag operations with item preview thumbnail displayed in DragOverlay instead of generic ghost.

**Impact:** Medium (improves UX clarity)
**Effort:** Small (1-2 points)

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-28_

### Gaps Identified
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing test file location | Add as AC | Added to AC 9 (Test Structure specification) |
| 2 | Image component reuse ambiguity | Add as AC | Added to AC 10 (Image Component Specification) |

### Enhancement Opportunities
| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Preview animation variants | Skip | Deferred to WISH-2005f (Spring physics animations) - appropriate separation of concerns |
| 2 | Multi-item drag preview | Out-of-scope | Requires multi-select implementation first (not planned for MVP) |
| 3 | Preview shadow customization | Add as AC | Added to AC 11 (Shadow Configuration) - improves visual hierarchy |
| 4 | Preview rotation on drag | Out-of-scope | Deferred to WISH-2005f (Spring physics animations) - matches physics phase |
| 5 | Preview border highlight | Add as AC | Added to AC 12 (Border Highlight) - enhances visual clarity on busy backgrounds |
| 6 | High contrast mode support | Out-of-scope | Deferred to WISH-2006 accessibility audit - broader initiative |
| 7 | Lazy load preview component | Add as AC | Added to AC 13 (Code-Splitting) - reduces initial bundle by ~2-3KB |
| 8 | Analytics for preview engagement | Out-of-scope | Deferred to WISH-2005g (Analytics integration) - separate concern |
| 9 | Preview content customization | Out-of-scope | Deferred to advanced personalization phase - user research needed |
| 10 | Cross-item preview comparison | Out-of-scope | Deferred to advanced UX patterns - high effort, requires research |

### Follow-up Stories Suggested
- [ ] WISH-2005f: Spring physics animations (Preview rotation on drag, animation variants)
- [ ] WISH-2006: Accessibility audit for wishlist drag operations (High contrast mode support)
- [ ] WISH-2005g: Analytics integration for reorder engagement tracking

### Items Marked Out-of-Scope
- Multi-item drag preview: Requires multi-select implementation first; not planned for MVP
- Preview animation variants: Deferred to WISH-2005f (Spring physics animations) for cohesive physics-based interactions
- Preview rotation on drag: Deferred to WISH-2005f; pairs well with spring physics implementation
- High contrast mode support: Part of broader accessibility audit in WISH-2006
- Analytics for preview engagement: Deferred to WISH-2005g (Analytics integration phase)
- Preview content customization: Deferred to advanced personalization phase; requires user research
- Cross-item preview comparison: Advanced UX pattern; high effort, requires design research
