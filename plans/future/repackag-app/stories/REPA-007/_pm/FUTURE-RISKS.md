# Future Risks: REPA-007

**Story**: Add SortableGallery Component to @repo/gallery

**Status**: Non-MVP concerns, important but not blocking launch

---

## Non-MVP Risks

### Risk 1: Virtual Scrolling Integration with dnd-kit

**Description**: For galleries with 1000+ items, rendering all items in DOM causes performance issues. Virtual scrolling (react-virtual, react-window) renders only visible items, but integrating with dnd-kit drag-and-drop is complex.

**Impact (if not addressed post-MVP)**:
- Large galleries (1000+ items) will have slow initial render
- Scrolling may feel janky
- Memory usage increases linearly with item count
- Users may avoid component for large datasets

**Recommended timeline**: Q2 2026 or when first large gallery use case identified

**Implementation notes**:
- dnd-kit does not natively support virtual scrolling
- Requires custom collision detection and drop zone calculation
- May need to fork/extend dnd-kit or use alternative library (react-beautiful-dnd has similar issues)

---

### Risk 2: Toast Adapter Abstraction

**Description**: SortableGallery is tightly coupled to sonner toast library. If apps switch to different toast libraries (react-hot-toast, Chakra UI toast, etc.), component breaks.

**Impact (if not addressed post-MVP)**:
- Apps stuck with sonner even if they prefer other toast libraries
- Cannot use SortableGallery in apps with existing toast systems
- Duplication if apps need to wrap component with adapter layer

**Recommended timeline**: Q1 2026 or when first non-sonner app requests support

**Implementation notes**:
- Add optional `toastAdapter` prop with interface:
  ```typescript
  interface ToastAdapter {
    success: (message: string, action?: ReactNode) => void
    error: (message: string, action?: ReactNode) => void
    dismiss: (toastId: string) => void
  }
  ```
- Provide sonner adapter as default
- Document how to create custom adapters

---

### Risk 3: Multi-Select Drag State Management

**Description**: Users may want to drag multiple selected items at once (e.g., reorder 10 wishlist items together). Current implementation only supports single-item drag.

**Impact (if not addressed post-MVP)**:
- Power users need to drag items one-by-one (tedious for bulk operations)
- Apps may implement workaround (custom multi-drag component) leading to fragmentation
- Missing feature parity with desktop file managers (Finder, Explorer)

**Recommended timeline**: Q3 2026 or when power user feedback indicates need

**Implementation notes**:
- Requires complex state management (which items are selected, where do they drop)
- Drag preview must show multiple items (count badge or stacked preview)
- Undo flow becomes more complex (undo multi-item move)
- May require new AC set and 3 SP story

---

### Risk 4: Drag Between Galleries (Cross-Gallery Reorder)

**Description**: Users may want to drag items from one gallery to another (e.g., move wishlist item to album). Current implementation only supports reordering within single gallery.

**Impact (if not addressed post-MVP)**:
- Cannot reorganize items across categories
- Users need to use alternative UI (modal with move button, dropdown menu)
- Missing feature parity with Trello, Notion, etc.

**Recommended timeline**: Q4 2026 or when cross-gallery use case identified

**Implementation notes**:
- Requires shared DndContext across multiple SortableGallery instances
- onReorder callback must include source and destination gallery IDs
- Needs careful collision detection (which gallery is drop target?)
- May require new API design and 5 SP story

---

### Risk 5: Keyboard Drag-and-Drop (Full ARIA Authoring Practices)

**Description**: Current implementation supports keyboard navigation (arrow keys, Tab) but not keyboard-initiated drag-and-drop. ARIA Authoring Practices Guide recommends Space/Enter to "grab" item, arrows to move, Space/Enter to "drop".

**Impact (if not addressed post-MVP)**:
- Keyboard-only users cannot reorder items (must use mouse/touch)
- WCAG 2.1 Level AA compliance gap (Success Criterion 2.1.1 Keyboard)
- Accessibility advocates may flag as blocker for inclusive design

**Recommended timeline**: Q2 2026 (high priority for accessibility)

**Implementation notes**:
- Requires custom keyboard drag state machine (separate from dnd-kit)
- ARIA announcements for drag mode ("Drag mode activated. Item 3. Use arrows to move.")
- Escape key to cancel drag
- Separate focus management during drag mode
- Likely 3 SP story (complex state management)

---

### Risk 6: Undo History Stack (Multi-Level Undo)

**Description**: Current implementation only supports single-level undo (undo last action). Power users may expect multi-level undo/redo (Cmd+Z/Cmd+Shift+Z).

**Impact (if not addressed post-MVP)**:
- Users cannot undo multiple consecutive reorders
- Must manually fix mistakes one at a time
- Missing feature parity with desktop apps

**Recommended timeline**: Q3 2026 or when power user feedback indicates need

**Implementation notes**:
- Requires history stack state management (array of past orders)
- UI for undo stack visualization (optional)
- Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
- Performance considerations (how many history entries to keep?)

---

### Risk 7: Touch Gesture Conflicts

**Description**: TouchSensor has 300ms delay to disambiguate tap vs drag. If apps have other touch gestures (swipe to delete, pinch to zoom), conflicts may occur.

**Impact (if not addressed post-MVP)**:
- Swipe gesture on card may trigger drag instead of delete
- Pinch gesture on gallery may trigger drag on individual items
- User frustration with unexpected behavior

**Recommended timeline**: Q2 2026 or when first touch gesture conflict reported

**Implementation notes**:
- Make TouchSensor delay configurable (current: 300ms hardcoded)
- Document touch gesture best practices in Storybook
- Consider alternative sensors (PinchSensor, SwipeSensor) if dnd-kit supports

---

### Risk 8: Drag Preview Customization API Surface

**Description**: `renderDragOverlay` prop allows custom drag preview, but API may not cover all use cases (e.g., multi-item preview, preview with metadata, animated preview).

**Impact (if not addressed post-MVP)**:
- Apps need complex workarounds for custom drag previews
- Inconsistent drag preview patterns across apps
- API may need breaking changes if use cases not anticipated

**Recommended timeline**: Q1 2026 (iterate based on early adopter feedback)

**Implementation notes**:
- Collect feedback from first 3 apps using SortableGallery
- Extend `renderDragOverlay` API if needed (e.g., pass drag state, coordinates)
- Document common patterns in Storybook

---

### Risk 9: Performance with Framer Motion on Low-End Devices

**Description**: Framer Motion layout animations use GPU acceleration, but on low-end devices (budget Android phones, old iPads), animations may cause frame drops.

**Impact (if not addressed post-MVP)**:
- Users on low-end devices experience janky reorder animations
- May disable animations entirely (loses polish)
- Negative perception of app quality

**Recommended timeline**: Q2 2026 (test on real low-end devices)

**Implementation notes**:
- Add `disableAnimations` prop (already in plan)
- Use `matchMedia('(prefers-reduced-motion)')` to auto-disable on low-end devices
- Document performance thresholds (e.g., "Works smoothly up to 50 items on mid-range devices")

---

### Risk 10: Server-Side Rendering (SSR) Compatibility

**Description**: dnd-kit may have issues with SSR (Next.js, Remix) due to DOM-dependent APIs (window, document). SortableGallery may not render correctly on server.

**Impact (if not addressed post-MVP)**:
- Cannot use SortableGallery in SSR apps
- Must use dynamic import with `ssr: false` (Next.js)
- Flicker on initial page load (hydration mismatch)

**Recommended timeline**: Q1 2026 (before Next.js adoption)

**Implementation notes**:
- Test SortableGallery in Next.js app with SSR enabled
- Add SSR guards (`typeof window !== 'undefined'`) if needed
- Document SSR limitations in README

---

## Scope Tightening Suggestions

### Suggestion 1: Defer List Layout to REPA-007b

**Current scope**: AC-33, AC-34 include list layout mode and Framer Motion animations.

**Recommendation**: Focus MVP on grid layout only. List layout can be added in follow-up story.

**Rationale**:
- Grid layout covers 80% of use cases (wishlist, inspiration, sets galleries all use grid)
- List layout requires different sorting strategy (verticalListSortingStrategy vs rectSortingStrategy)
- Simplifies initial implementation

**Effort saved**: ~1 day (100 LOC + tests)

---

### Suggestion 2: Make Keyboard Navigation Optional in MVP

**Current scope**: AC-23 to AC-26 include full keyboard navigation (arrow keys, Home/End, roving tabindex).

**Recommendation**: Support Tab navigation only in MVP. Full keyboard nav in REPA-007b or REPA-008.

**Rationale**:
- useRovingTabIndex is complex (362 LOC with ResizeObserver, grid detection)
- Extraction from app requires careful testing
- Mouse/touch drag covers 90% of user workflows

**Effort saved**: ~2 days (362 LOC hook + integration + tests)

**Risk**: Accessibility advocates may flag as blocker. Recommend keeping in MVP if schedule allows.

---

### Suggestion 3: Defer useAnnouncer Extraction to REPA-015

**Current scope**: AC-29 includes extracting useAnnouncer (153 LOC) to @repo/accessibility.

**Recommendation**: Keep useAnnouncer in SortableGallery component for MVP. Extract to @repo/accessibility in REPA-015 (Enhance @repo/accessibility) per index.

**Rationale**:
- Reduces cross-package coordination in single story
- useAnnouncer is simple enough to inline (~50 LOC if simplified)
- REPA-015 is dedicated to @repo/accessibility enhancements

**Effort saved**: ~0.5 days (cross-package wiring + tests)

---

### Suggestion 4: Simplify Undo Flow (No Toast Auto-Dismiss)

**Current scope**: AC-16 specifies 5-second auto-dismiss for success toast.

**Recommendation**: Success toast persists until user dismisses or clicks Undo (no auto-dismiss).

**Rationale**:
- Eliminates timeout state management
- Ensures user never misses undo opportunity
- Matches some desktop app patterns (Photoshop, Illustrator)

**Effort saved**: ~0.5 days (timeout logic + tests)

**Risk**: May clutter screen if user drags frequently. Recommend keeping auto-dismiss in MVP.

---

## Future Requirements

### Requirement 1: Storybook Accessibility Documentation

**Description**: Document keyboard shortcuts, ARIA patterns, and screen reader behavior in Storybook.

**Value**: Helps developers understand accessibility features without reading code.

**Effort**: Low (1-2 hours of Storybook MDX writing)

**Timeline**: Q1 2026 (before external adoption)

---

### Requirement 2: Performance Benchmarking

**Description**: Establish performance baselines for various gallery sizes (10, 50, 100, 500, 1000 items).

**Value**: Helps developers choose between SortableGallery and alternative solutions based on dataset size.

**Effort**: Medium (1 day of testing + documentation)

**Timeline**: Q2 2026 (after MVP adoption)

---

### Requirement 3: Migration Guide for Existing Apps

**Description**: Document how to migrate from DraggableWishlistGallery and DraggableInspirationGallery to SortableGallery.

**Value**: Reduces friction for app-wishlist-gallery and app-inspiration-gallery refactors.

**Effort**: Low (half day of documentation)

**Timeline**: Q1 2026 (before app migrations in REPA-009, REPA-010)

---

### Requirement 4: Error Handling Best Practices Guide

**Description**: Storybook examples showing common error scenarios (network failure, validation error, auth error) and how to handle with onError callback.

**Value**: Reduces developer confusion about error handling patterns.

**Effort**: Low (1 day of Storybook examples)

**Timeline**: Q1 2026 (before external adoption)

---

### Requirement 5: TypeScript Generic Wrapper Examples

**Description**: Provide boilerplate for creating typed wrappers (e.g., SortableWishlistGallery) in Storybook docs.

**Value**: Reduces learning curve for developers unfamiliar with generics.

**Effort**: Low (half day of documentation + example)

**Timeline**: Q1 2026 (before external adoption)

---

## Summary

**Total non-MVP risks**: 10 (ranging from performance to accessibility to extensibility)

**Highest priority**:
1. **Risk 5**: Keyboard drag-and-drop (accessibility compliance)
2. **Risk 10**: SSR compatibility (before Next.js adoption)
3. **Risk 2**: Toast adapter abstraction (extensibility)

**Scope tightening recommendations**:
1. Defer list layout to REPA-007b (saves 1 day)
2. Simplify undo flow (saves 0.5 days)
3. Consider deferring useAnnouncer extraction to REPA-015 (saves 0.5 days)

**Total potential effort savings**: ~2 days (reduces story from 8 days to 6 days, aligns with 3-4 SP)

**Recommendation**: Implement MVP as-is (5 SP) unless schedule is tight, then apply scope tightening suggestions to reduce to 3 SP.
