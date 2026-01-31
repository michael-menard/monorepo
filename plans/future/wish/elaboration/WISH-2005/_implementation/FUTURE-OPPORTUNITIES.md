# Future Opportunities - WISH-2005

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | KeyboardSensor accessibility without WISH-2006 | Low | Low | Defer keyboard drag to WISH-2006 (Accessibility story). Mouse/touch drag is sufficient for MVP. AC should be revised to remove KeyboardSensor or accept it as bonus MVP feature. |
| 2 | Empty states ownership unclear after split | Low | Low | Clarify in WISH-2005a or WISH-2005b which story owns empty states + loading skeletons. Current story has AC for these but split stories don't mention them per index. |
| 3 | No specification for undo timeout persistence | Low | Low | Story specifies 5-second undo window but doesn't specify if user can dismiss toast early or extend timeout. Consider adding AC for toast interaction patterns. |
| 4 | Image in empty state not specified | Low | Low | Story describes empty state illustrations (icons) but doesn't specify image assets or icon library source. Should reference @repo/app-component-library or Lucide icons. |
| 5 | Skeleton count not responsive | Low | Low | Story hardcodes "6 skeleton cards" but doesn't specify behavior on mobile (fewer cards visible) or larger screens. Consider responsive skeleton count. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Drag preview thumbnail | Medium | Medium | dnd-kit supports DragOverlay with custom preview. Show mini card preview instead of generic ghost for better UX. Track in WISH-2005c (already in stories.index.md). |
| 2 | Haptic feedback on mobile drag | Medium | Low | Use Vibration API for tactile feedback on drag start/drop for mobile users. Track in WISH-2005d (already in stories.index.md). |
| 3 | Undo all recent reorders | Medium | Medium | Extend undo to stack multiple reorder operations (last 5 minutes) instead of just last operation. Requires undo history state management. |
| 4 | Drag-and-drop between pages | High | High | Story mentions "awareness of pagination boundaries" but doesn't specify behavior. Allow dragging items to "next page" zone to reorder across pages. Complex feature - defer to Phase 5+. |
| 5 | Bulk reorder mode | Medium | High | Allow selecting multiple items and reordering them as a group. Power user feature - defer to Phase 6+. |
| 6 | Reorder analytics | Low | Low | Track reorder frequency, depth (how far items move), and patterns to understand user engagement. Track in WISH-2005g (already in stories.index.md). |
| 7 | Smart drop zones with validation | Medium | Medium | Visual indicators for valid/invalid drop positions with constraint validation. Track in WISH-2005e (already in stories.index.md). |
| 8 | Spring physics animations | Low | Low | Replace linear transitions with spring-based physics for more natural feel. Track in WISH-2005f (already in stories.index.md). |
| 9 | Empty state personalization | Low | Medium | "You got everything!" empty state could include stats (e.g., "You've purchased 47 sets!") or celebration confetti animation. |
| 10 | Loading skeleton shimmer effect | Low | Low | Add shimmer/gradient animation to skeletons for more polished loading state (currently just pulse). |
| 11 | Drag conflict resolution | Medium | High | If two users reorder the same list simultaneously, last write wins. Consider CRDT or operational transform for collaborative reordering (very advanced). |
| 12 | Reorder history / audit log | Low | Medium | Track reorder operations in database for debugging and analytics. Useful for support ("Why did my order change?"). |

## Categories

### Edge Cases
- Drag-and-drop between pages (pagination boundary behavior)
- Undo timeout interaction (dismiss early, extend timeout)
- Concurrent reorder operations from multiple devices

### UX Polish
- Drag preview thumbnail (WISH-2005c)
- Haptic feedback (WISH-2005d)
- Spring physics animations (WISH-2005f)
- Empty state personalization with stats
- Loading skeleton shimmer effect

### Performance
- Responsive skeleton count (mobile vs desktop)
- Optimistic update batching for multiple rapid reorders
- Skeleton lazy rendering (render as they appear in viewport)

### Observability
- Reorder analytics (WISH-2005g)
- Reorder history / audit log

### Integrations
- Smart drop zones (WISH-2005e)
- Bulk reorder mode (select multiple items)
- Collaborative reordering (CRDT/OT for multi-user)

### Accessibility
- KeyboardSensor integration (depends on WISH-2006)
- Screen reader announcements for drag operations
- High contrast mode for drop zone highlights

### Data Integrity
- Drag conflict resolution (CRDT/OT)
- Reorder validation (prevent invalid sortOrder gaps)
- Transaction rollback on server error
