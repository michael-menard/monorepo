# Future Opportunities - REPA-009

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | renderDragHandle prop may be over-engineered for MVP | Low | Medium | Story includes custom drag handle rendering (AC-4, AC-5) but no current consumers identified. Consider deferring to future work if InspirationCard/AlbumCard don't need custom handles. |
| 2 | No error handling for invalid Zod schema values at runtime | Low | Low | Story validates props via Zod but doesn't specify behavior when invalid values passed at runtime. Add error boundaries or graceful fallbacks in future iteration. |
| 3 | No animation for checkbox selection state change | Low | Low | Checkbox immediately shows/hides Check icon. Consider adding micro-animation (fade-in, scale) for better UX. Not MVP-critical. |
| 4 | Drag handle always renders even when not dragging | Low | Low | Drag handle button exists in DOM even when opacity-0. Could optimize by conditionally rendering on hover state, but minimal performance impact. |
| 5 | No keyboard shortcut for bulk select (Cmd/Ctrl+A) | Medium | Medium | Users must click each card individually in selection mode. Keyboard shortcut for "Select All" would improve power-user UX. Requires parent gallery context. |
| 6 | No visual feedback during drag operation | Medium | Medium | Story adds drag handle UI but doesn't specify drag preview or active-dragging state (cursor-grabbing, opacity, transform). Likely handled by SortableGallery (REPA-007) but worth documenting. |
| 7 | selectionPosition and dragHandlePosition props ignored when both enabled | Low | Low | DEV-FEASIBILITY.md recommends fixed positions to avoid conflicts. If use cases emerge for flexible positioning, revisit in future iteration with conflict resolution logic. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Multi-select drag-and-drop | High | High | Allow dragging multiple selected cards simultaneously. Requires SortableGallery (REPA-007) + custom drag preview. High user value for gallery reorganization. Track for REPA-010. |
| 2 | Undo/redo for card reordering | Medium | Medium | After drag-and-drop, provide undo button to restore previous order. Requires state management in parent gallery. Track for REPA-010 or later. |
| 3 | Keyboard reordering via drag handle | Medium | High | Allow keyboard users to reorder cards (focus drag handle, press arrow keys to move). WCAG best practice. Requires SortableGallery keyboard support. Track for REPA-010. |
| 4 | Custom selection checkbox styles | Low | Medium | Story hardcodes checkbox style (rounded-full, border-2, Check icon). Future: allow custom checkbox render prop for brand variations. Low priority unless design system evolves. |
| 5 | Batch actions toolbar for selected cards | High | Medium | When cards selected, show floating action bar (Delete, Move to Album, Add Tags). Requires parent gallery component. High user value. Track for REPA-010+. |
| 6 | Selection count badge | Low | Low | Show "X selected" badge when in selection mode. Simple visual feedback. Add to GalleryFilterBar or parent gallery in future iteration. |
| 7 | Hover overlay fade-in delay | Low | Low | Current hover overlay has no delay (group-hover:opacity-100). Consider 100-200ms delay to avoid flicker on quick mouse movements. Polish for future. |
| 8 | Drag handle icon customization | Low | Low | Story uses GripVertical icon. Future: allow custom icon via prop (e.g., Menu icon, DragIndicator). Low value unless brand requires it. |
| 9 | Accessible selection count announcement | Medium | Low | When cards selected, announce "X items selected" to screen readers. Use useAnnouncer from @repo/accessibility. Good a11y enhancement for future. |
| 10 | Touch-optimized drag gestures | Medium | High | On mobile, drag handle requires precision. Consider touch-swipe gestures for reordering (swipe right to select, long-press to drag). Requires user research. |
| 11 | Selection persistence across page navigation | Medium | Medium | When user selects cards and navigates away, selection state is lost. Persist in URL params or session storage for better UX. Track for REPA-010+. |
| 12 | Drag handle position based on card aspect ratio | Low | Medium | For vertical cards (tall aspect), drag handle at top-right may be awkward. Auto-position based on aspect ratio? Low priority unless UX feedback indicates issue. |
| 13 | Hover overlay gradient customization | Low | Low | Story hardcodes gradient (from-black/60 via-transparent to-transparent). Future: allow custom gradient via prop for brand variations. |
| 14 | Selection mode toggle animation | Low | Low | When entering/exiting selection mode, checkboxes appear instantly. Consider fade-in animation for smoother transition. Polish for future. |
| 15 | Drag handle touch target verification in CI | Low | Medium | AC-6 requires 44x44px touch target but relies on manual testing. Add automated visual regression test (Playwright + getBoundingClientRect) to verify in CI. |

## Categories

### Edge Cases
- Invalid Zod schema values (Gap #2)
- Drag handle position conflicts (Gap #7)
- Touch target size regression (Enhancement #15)

### UX Polish
- Checkbox animation (Gap #3)
- Hover overlay fade-in delay (Enhancement #7)
- Selection mode toggle animation (Enhancement #14)
- Selection count badge (Enhancement #6)

### Performance
- Conditional drag handle rendering (Gap #4)
- No significant performance concerns identified

### Observability
- No logging or analytics specified for selection/drag events
- Consider adding telemetry for feature usage in future iteration

### Integrations
- Multi-select drag-and-drop requires SortableGallery integration (Enhancement #1)
- Batch actions toolbar requires parent gallery context (Enhancement #5)
- Keyboard reordering requires SortableGallery keyboard support (Enhancement #3)
- Selection persistence requires URL state management (Enhancement #11)

### Accessibility
- Keyboard shortcut for bulk select (Gap #5)
- Keyboard reordering via drag handle (Enhancement #3)
- Accessible selection count announcement (Enhancement #9)
- Touch-optimized drag gestures for mobile users (Enhancement #10)

---

## Prioritization Recommendations

### High Impact, Low Effort (Quick Wins)
- Selection count badge (Enhancement #6)
- Accessible selection count announcement (Enhancement #9)
- Checkbox animation (Gap #3)

### High Impact, High Effort (Future Epics)
- Multi-select drag-and-drop (Enhancement #1)
- Batch actions toolbar (Enhancement #5)
- Keyboard reordering (Enhancement #3)
- Touch-optimized drag gestures (Enhancement #10)

### Low Impact, Deferred
- Custom checkbox styles (Enhancement #4)
- Drag handle icon customization (Enhancement #8)
- Hover overlay gradient customization (Enhancement #13)

---

## Dependencies for Future Work

**REPA-007 (SortableGallery)** must complete before:
- Multi-select drag-and-drop (Enhancement #1)
- Keyboard reordering (Enhancement #3)
- Drag preview customization (Gap #6)

**REPA-010 (app-inspiration-gallery refactor)** provides context for:
- Batch actions toolbar (Enhancement #5)
- Selection persistence (Enhancement #11)
- Undo/redo for reordering (Enhancement #2)

**@repo/accessibility (useAnnouncer)** already available for:
- Selection count announcements (Enhancement #9)

---

## Notes for PM

1. **Multi-select drag-and-drop** (Enhancement #1) has high user value but requires SortableGallery support. Consider including in REPA-010 scope if REPA-007 delivers drag preview customization.

2. **Batch actions toolbar** (Enhancement #5) is a common gallery pattern. If inspiration gallery roadmap includes bulk operations (delete, tag, move), prioritize this enhancement.

3. **Keyboard reordering** (Enhancement #3) is a WCAG best practice for drag-and-drop interfaces. Recommend including in REPA-010 or REPA-011 for accessibility compliance.

4. **renderDragHandle prop** (Gap #1) may be over-engineered for current needs. Consider removing from MVP scope if no consumers identified during implementation.

5. Most enhancements require parent gallery context (SortableGallery, GalleryFilterBar, or page-level state). Track as part of REPA-010 (app-inspiration-gallery refactor) rather than standalone stories.
