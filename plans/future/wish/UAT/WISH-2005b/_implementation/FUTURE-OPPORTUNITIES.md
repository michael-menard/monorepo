# Future Opportunities - WISH-2005b

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No offline support during network outage | Low | High | Undo window expires during network failures. Future: implement local storage fallback for undo state to survive page refresh. Deferred until offline-first strategy is defined. |
| 2 | No visual diff indicator for undo | Low | Low | Users don't see which items moved during undo. Future: highlight affected items with subtle animation. Nice-to-have UX polish. |
| 3 | Single undo limitation | Low | Medium | Only most recent reorder can be undone. Future: implement multi-level undo history (5-10 operations). Requires more complex state management and UX patterns. |
| 4 | No conflict detection for concurrent edits | Medium | High | Multiple tabs/users can create conflicting reorders. Story explicitly calls this "out of scope" (Risk 4). Future: implement optimistic locking or last-write-wins strategy with conflict toast. |
| 5 | No undo after route navigation | Low | Medium | Undo window expires on route change (AC 13). Future: persist undo state across navigation using session storage. Requires route lifecycle integration. |
| 6 | Toast auto-dismiss may be too short for screen reader users | Low | Low | 5-second window may not allow enough time for screen reader users to discover and activate undo button. Future: extend timeout to 10 seconds or add "Keep open" option. Accessibility enhancement. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Undo confirmation toast could show item preview | Medium | Low | Success toast shows generic "Order restored" - could show item thumbnail + title for clarity. Similar to WISH-2041 delete confirmation. |
| 2 | Optimistic update animation polish | Medium | Medium | Cache update is instant - could add stagger animation for items sliding into new positions. Improve perceived quality. Requires Framer Motion spring transitions. |
| 3 | Reorder analytics event tracking | Low | Low | Track undo usage patterns (frequency, timing, success rate) to understand user behavior. Useful for future UX improvements. Requires analytics integration. |
| 4 | Keyboard shortcut for undo (Ctrl+Z) | Low | Medium | Power users may expect Ctrl+Z to undo last reorder. Requires global keyboard handler and focus management. Nice-to-have power-user feature. |
| 5 | Batch undo for multiple rapid reorders | Low | High | If user makes 5 reorders in 10 seconds, undo button could restore to initial state. Complex state tracking. Deferred until proven user need. |
| 6 | Visual progress indicator for API call | Low | Low | Optimistic update is instant, but API call happens in background. Could show subtle spinner in toast during API call. Transparency enhancement. |
| 7 | Undo button auto-focus for keyboard users | Medium | Low | AC 20 mentions keyboard accessibility but doesn't specify auto-focus. Sonner toast action buttons may not auto-focus by default. Future: investigate Sonner focus management and add explicit focus if needed. |
| 8 | Retry strategy for transient network errors | Medium | Medium | AC 16 mentions network timeout rollback, but doesn't implement retry. Future: add exponential backoff retry (2-3 attempts) before showing error toast. Resilience improvement. |
| 9 | Optimistic update for undo operation itself | Low | Medium | Undo triggers PUT /reorder with original order but waits for API. Could optimistically restore cache immediately and rollback if undo fails. Nested optimistic pattern - more complex. |
| 10 | Cache warming after undo failure invalidation | Low | Medium | AC 18 invalidates cache on undo failure, triggering re-fetch. Could pre-load expected data to reduce latency. Performance optimization. |

## Categories

### Edge Cases
- Offline network handling (#1)
- Concurrent edit conflicts (#4)
- Cross-navigation undo persistence (#5)
- Screen reader timeout constraints (#6)
- Batch undo for rapid operations (#5)

### UX Polish
- Visual diff for undo (#2)
- Item preview in confirmation toast (#1)
- Animation polish with spring physics (#2)
- Keyboard shortcuts (#4)
- Progress indicators (#6)
- Auto-focus management (#7)

### Performance
- Retry strategies for network errors (#8)
- Nested optimistic updates (#9)
- Cache warming (#10)

### Observability
- Analytics event tracking (#3)
- Undo usage patterns and success rates

### Architecture
- Multi-level undo history (#3)
- Session storage integration (#5)

## Prioritization Notes

**High Priority (Future Phase 4 Stories):**
- #6 (Screen reader timeout extension) - Accessibility improvement
- #1 (Item preview in undo confirmation) - Low-effort UX win
- #7 (Auto-focus on undo button) - Accessibility gap

**Medium Priority (Future Phase 5+):**
- #2 (Animation polish) - UX quality improvement
- #8 (Retry strategy) - Resilience enhancement
- #4 (Conflict detection) - Multi-user safety

**Low Priority (Backlog):**
- #3 (Multi-level undo) - Power user feature
- #4 (Keyboard shortcuts) - Power user feature
- #5 (Batch undo) - Edge case
- #9 (Nested optimistic updates) - Complexity vs. benefit trade-off
- #10 (Cache warming) - Premature optimization

**Out of Scope (Document Limitation):**
- #1 (Offline support) - Requires offline-first architecture decision
- #4 (Concurrent edit handling) - Explicitly out of scope per Risk 4
