# UI/UX Notes: REPA-009

## Verdict

**PASS-WITH-NOTES**

This story enhances GalleryCard with selection and drag-and-drop UI patterns that are critical for gallery app functionality. The MVP requirements are sound, with noted design decisions needed for position conflicts and accessibility. Polish opportunities tracked in FUTURE-UIUX.md.

---

## MVP Component Architecture

### Core Components Required

**Enhanced GalleryCard** (`packages/core/gallery/src/components/GalleryCard.tsx`):
- Selection checkbox overlay (when selectable=true)
- Drag handle overlay (when draggable=true)
- Hover overlay slot (when hoverOverlay provided)
- All overlays positioned absolutely within image container

**Refactored Domain Cards**:
- InspirationCard: Wraps GalleryCard, uses hoverOverlay for title/badges/tags
- AlbumCard: Wraps GalleryCard, preserves stacked card effect outside GalleryCard

### Reuse Targets

**From @repo/app-component-library**:
- Card (for non-gallery use cases, keep existing)
- Button (if custom drag handle needed)
- Use `_primitives` pattern for all shadcn components

**From @repo/accessibility**:
- focusRingClasses (for focus states on checkbox and drag handle)

**From lucide-react**:
- Check icon (selection checkbox)
- GripVertical icon (drag handle)

---

## MVP Accessibility (Blocking Only)

### Selection Checkbox

**Required ARIA**:
- Card container: role="button" or role="article" (existing)
- Card container: aria-selected="true|false" when selectable=true
- Checkbox overlay: No separate role (decorative, selection state on card itself)

**Keyboard Navigation**:
- Enter/Space on focused card toggles selection (calls onSelect)
- Tab navigation moves between cards (existing behavior preserved)

**Screen Reader Support**:
- Card announces selected state: "Card title, selected" or "Card title, not selected"
- Use aria-label or aria-labelledby on card container

**Color Contrast** (WCAG AA):
- Selected checkbox: border-primary bg-primary text-primary-foreground (verify 4.5:1 contrast)
- Unselected checkbox: border-white bg-black/40 text-white (verify 4.5:1 contrast on image backgrounds)

### Drag Handle

**Required ARIA**:
- Button: aria-label="Drag to reorder {title}" (dynamic title)
- Button: role="button" (implicit from `<button>`)

**Keyboard Navigation**:
- Drag handle is focusable (default button behavior)
- Keyboard reordering via arrow keys (handled by SortableGallery, not GalleryCard)

**Touch Target** (WCAG 2.5.5):
- Minimum 44x44px touch target: Use h-11 w-11 (44px)
- Ensure touch-none class to prevent scroll interference

**Screen Reader Support**:
- Announces "Drag to reorder {title}" when focused
- Screen reader users: Announce reorder instructions (handled by SortableGallery context)

### Hover Overlay

**No Blocking A11y Requirements**:
- Hover overlay is visual enhancement only
- All critical info (title, badges) must also be available via screen reader (aria-label on card)

---

## MVP Design System Rules

### Color Tokens (HARD GATE)

**Selection Checkbox**:
- Selected: `border-primary bg-primary text-primary-foreground` (token-only)
- Unselected: `border-white bg-black/40 text-white` (exception: white/black are neutral tokens)

**Drag Handle**:
- Background: `bg-background/80 backdrop-blur-sm` (token-only)
- Border: `border-border` (token-only)
- Icon: `text-muted-foreground` (token-only)

**Hover Overlay**:
- Gradient: `bg-gradient-to-t from-black/60 via-transparent to-transparent` (exception: neutral gradients allowed)

**All custom colors PROHIBITED**. Use design tokens only.

### Component Import Pattern

**MUST use `_primitives` pattern**:
```typescript
// CORRECT
import { Button } from '@repo/ui/_primitives/button'
import { Card } from '@repo/ui/_primitives/card'

// WRONG - never import from individual paths
import { Button } from '@repo/ui/button'
```

**Shared utility imports**:
```typescript
import { cn } from '@repo/ui'
import { focusRingClasses } from '@repo/accessibility'
```

---

## MVP Playwright Evidence

### Core Journey Demonstration

**Scenario 1: Select Multiple Cards**:
1. Navigate to inspiration gallery
2. Enable selection mode (if toggle exists)
3. Click 3 cards to select them
4. Verify checkboxes show Check icons
5. Verify cards have aria-selected="true"

**Scenario 2: Drag to Reorder (if REPA-007 complete)**:
1. Navigate to wishlist gallery (drag-enabled)
2. Hover over card to reveal drag handle
3. Click and drag card to new position
4. Verify card moves to new position
5. Verify order persists (if backend integrated)

**Required Assertions**:
- Selection checkbox visible and styled correctly
- Drag handle visible on hover (desktop) or always (mobile)
- Accessibility tree includes correct ARIA attributes
- No console errors or warnings

**Artifacts**:
- Screenshot of selected cards with checkboxes
- Screenshot of drag handle on hover
- Trace file for drag-and-drop interaction (if testable)

---

## Design Decisions Required (MVP-Critical)

### Decision 1: Checkbox and Drag Handle Position Conflict

**Problem**: If both selectable=true and draggable=true, and both use top-right position, overlays will collide.

**Options**:
1. Force checkbox to top-left, drag handle to top-right (fixed positions)
2. Allow position props but warn if conflict (dev-time warning)
3. Support both at same position with careful z-index/spacing

**Recommendation**: Option 1 (fixed positions) for MVP simplicity.
- Selection checkbox: always top-left
- Drag handle: always top-right
- Ignore selectionPosition and dragHandlePosition props if both features enabled

**Rationale**: Eliminates edge case complexity. Most gallery apps use selection OR drag, not both simultaneously.

**PM Decision Required**: Confirm fixed position approach or allow position props.

### Decision 2: Hover Overlay vs Actions Overlay

**Problem**: GalleryCard already has an actions overlay (top-right, opacity-0 on hover). Adding hoverOverlay prop may conflict.

**Options**:
1. Replace actions overlay with hoverOverlay (breaking change)
2. Keep both, hoverOverlay at z-10, actions at z-20 (layering)
3. Merge actions into hoverOverlay slot (require consumers to manage actions in hover content)

**Recommendation**: Option 3 (merge into hoverOverlay) for MVP.
- Remove fixed actions overlay from GalleryCard
- Consumers pass actions content via hoverOverlay prop
- InspirationCard/AlbumCard manage their own action buttons in hover overlay

**Rationale**: Cleaner API, no z-index conflicts, more flexible.

**PM Decision Required**: Confirm removal of built-in actions overlay.

### Decision 3: Mobile Drag Handle Always-Visible Threshold

**Problem**: Drag handle uses opacity-0 group-hover:opacity-100 on desktop. On mobile (no hover), need different visibility.

**Options**:
1. Always visible on mobile: No opacity-0, remove hover requirement
2. Use md: breakpoint: opacity-0 md:group-hover:opacity-100 (hover on desktop only)
3. Add showDragHandle prop for explicit control

**Recommendation**: Option 2 (md: breakpoint) for MVP.
- Mobile (< 768px): Drag handle always visible (opacity-100)
- Desktop (>= 768px): Drag handle visible on hover (opacity-0 group-hover:opacity-100)

**Rationale**: Matches existing patterns in SortableInspirationCard/SortableWishlistCard. No new props needed.

**PM Decision Required**: Confirm md: breakpoint approach.

---

## Z-Index Layering Strategy

**Stack Order (bottom to top)**:
1. Image container: z-0 (default)
2. Hover overlay: z-10 (behind interactive overlays)
3. Selection checkbox: z-10 (same layer as hover, positioned separately)
4. Drag handle: z-10 (same layer as hover, positioned separately)

**No Conflicts Expected**: All overlays at z-10 use absolute positioning at different corners (top-left vs top-right). No overlap.

**Edge Case**: If checkbox and drag handle both at top-right (design decision 1), use z-10 and z-20 to layer.

---

## Focus Indicators

### Selection Checkbox

**Focus Style**: Use focusRingClasses from @repo/accessibility
- Ring color: ring-primary (token)
- Ring width: ring-2
- Ring offset: ring-offset-2

**Visible on Keyboard Focus Only**:
- focus-visible:ring-2
- Not triggered by mouse click

### Drag Handle

**Focus Style**: Same as checkbox (focusRingClasses)
- Ensure drag handle button has focusRingClasses applied

**Cursor States**:
- Default: cursor-grab
- Active (dragging): cursor-grabbing
- Focus: focus-visible:ring-2

---

## Responsive Behavior

### Mobile (<768px)

**Selection Checkbox**:
- Same size: h-6 w-6 (24px)
- Same position: top-2 left-2
- Touch target: Entire card body is tappable (no separate checkbox tap)

**Drag Handle**:
- Always visible: No opacity-0 (remove hover requirement)
- Touch target: h-11 w-11 (44px) minimum

**Hover Overlay**:
- No hover on mobile: Always visible or tap-to-reveal (decision needed)
- Recommendation: Always visible gradient with content

### Desktop (>=768px)

**Selection Checkbox**:
- Same size and position as mobile

**Drag Handle**:
- Hover-visible: opacity-0 group-hover:opacity-100
- Transition: transition-opacity duration-200

**Hover Overlay**:
- Hover-visible: opacity-0 group-hover:opacity-100

---

## MVP Constraints Summary

**Blocking Constraints**:
1. Use token-only colors (no hardcoded hex/rgb)
2. Use `_primitives` imports for shadcn components
3. 44x44px minimum touch target for drag handle (WCAG 2.5.5)
4. aria-label on drag handle with dynamic title
5. aria-selected on card when selectable=true
6. Resolve checkbox/drag handle position conflict (Decision 1)
7. Resolve hover overlay vs actions overlay (Decision 2)

**Non-Blocking (Polish)**:
- Animation timing curves (default duration-200 acceptable)
- Checkbox icon animation (not required for MVP)
- Drag handle icon size (default h-5 w-5 acceptable)

---

## Open Questions for PM

1. **Position Conflict**: Confirm fixed positions (checkbox=top-left, drag=top-right) or allow props?
2. **Actions Overlay**: Confirm removal of built-in actions overlay in favor of hoverOverlay slot?
3. **Mobile Hover Overlay**: Always visible or tap-to-reveal on mobile?
4. **renderDragHandle Prop**: Is custom drag handle rendering a MVP requirement or future work?

**Recommendation**: Proceed with fixed positions and hoverOverlay slot for MVP. Defer renderDragHandle to future work if not needed by current consumers.
