# Future Opportunities - WISH-2005a

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Cross-page reordering not supported | Medium | High | Explicitly deferred. Would require fetching all items or complex page-boundary logic. Recommend separate story (WISH-2005c) after MVP proves drag-and-drop value. |
| 2 | Multi-select drag operations | Low | High | Power-user feature for bulk reordering. Consider after user feedback shows demand. Would require modifier keys (Shift/Cmd) and different visual feedback. |
| 3 | Undo history beyond single operation | Low | Medium | Story includes 5-second undo (WISH-2005b). Full undo/redo stack would require undo history persistence and complex state management. Wait for user feedback. |
| 4 | Mobile-specific drag handles on demand | Low | Low | Story shows drag handles "always visible on mobile" (AC 4). Could add tap-to-enable drag mode to reduce visual clutter on small screens. Test with real users first. |
| 5 | Conflict resolution for concurrent reorders | Low | High | Edge case: Two users reordering same list simultaneously. Current approach: Last write wins. Consider operational transform or conflict detection if becomes problem. Defer until evidence of multi-user editing. |
| 6 | Drag animation customization | Low | Low | Story specifies 300ms animation (AC 24). Could make configurable via user preferences. Very low priority - current animation should work for 95% of users. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Drag preview thumbnail enhancement | Medium | Medium | Story uses WishlistCard clone in DragOverlay. Could create smaller, optimized preview card with just image + title. Would improve drag performance and reduce visual distraction. Recommend after MVP feedback. |
| 2 | Haptic feedback on mobile | Low | Low | Add vibration feedback on drag start/drop for tactile confirmation on mobile devices. Small UX polish that could improve perceived responsiveness. Easy win for Phase 2. |
| 3 | Smart drop zones with priority labels | Medium | Medium | Show priority level indicators in drop zones (e.g., "Drop here for High Priority"). Would make priority-based sorting more intuitive. Good enhancement after MVP. |
| 4 | Keyboard shortcut improvements | Low | Medium | Story supports Space/Arrow/Escape (AC 3). Could add Ctrl+Z for undo, number keys for priority jumps. Wait for keyboard user feedback before adding complexity. |
| 5 | Advanced screen reader announcements | Medium | Medium | Story includes basic ARIA live regions (AC 19). Could add contextual announcements like "Item X moved above Item Y, now position 3 of 10". Recommend dedicated accessibility audit in WISH-2006. |
| 6 | Drag handle visibility preferences | Low | Low | Some users may prefer always-visible handles, others prefer clean view. Could add user preference toggle. Very low priority - hover pattern is standard. |
| 7 | Auto-scroll during drag | Medium | Medium | Currently constrained to viewport. Could add auto-scroll when dragging near screen edges for long lists. Good enhancement for users with many items per page. |
| 8 | Drag animation spring physics | Low | Medium | Current animation is linear 300ms. Could upgrade to spring-based physics using Framer Motion for more natural feel. Polish item, not critical for MVP. |
| 9 | Reorder analytics | High | Low | Track drag-and-drop usage: frequency, items moved, average move distance. Data would inform future drag-and-drop features and justify investment. Recommend adding in observability pass. |
| 10 | Batch reorder optimization | Low | High | Currently sends one PUT request per reorder. For cross-page future feature, could batch multiple reorders with debouncing. Only relevant after cross-page support (WISH-2005c). |

## Categories

### Edge Cases
- **Gap #1**: Cross-page reordering (Medium impact, high effort)
- **Gap #2**: Multi-select operations (Low impact, high effort)
- **Gap #5**: Concurrent reorder conflicts (Low impact, high effort)

### UX Polish
- **Enhancement #1**: Drag preview optimization (Medium impact, medium effort)
- **Enhancement #2**: Haptic feedback (Low impact, low effort) - **Quick Win**
- **Enhancement #3**: Smart drop zones (Medium impact, medium effort)
- **Enhancement #7**: Auto-scroll during drag (Medium impact, medium effort)
- **Enhancement #8**: Spring physics animations (Low impact, medium effort)

### Accessibility
- **Enhancement #5**: Advanced screen reader announcements (Medium impact, medium effort) - **Belongs in WISH-2006**
- **Enhancement #4**: Keyboard shortcut enhancements (Low impact, medium effort)

### Observability
- **Enhancement #9**: Reorder analytics (High impact, low effort) - **Quick Win**

### Performance
- **Enhancement #10**: Batch reorder optimization (Low impact, high effort) - **Future only**

## Immediate Quick Wins (Post-MVP)

1. **Haptic feedback on mobile** (Enhancement #2) - Very low effort, improves mobile UX
2. **Reorder analytics** (Enhancement #9) - Low effort, high value for product decisions

## Deferred to Future Stories

- **WISH-2005c** (proposed): Cross-page reordering (Gap #1)
- **WISH-2006** (existing): Accessibility enhancements including advanced announcements (Enhancement #5)
- **WISH-2005b** (existing): Optimistic updates and undo flow (already planned)

## Notes for Implementation Phase

- Focus on **MVP happy path**: Mouse/touch/keyboard drag with basic error handling
- Resist scope creep from enhancement opportunities during implementation
- Quick wins (haptic feedback, analytics) can be added in separate micro-PRs after MVP ships
- Cross-page reordering (Gap #1) should remain firmly out of scope until user demand proven
