# Future Opportunities - WISH-2041

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Keyboard Shortcut for Delete** | Low | Low | Add keyboard shortcut (e.g., `Shift+Delete` or `Delete` key) to trigger delete flow from card focus. Improves power-user efficiency. Reference: WISH-2006 (Accessibility). |
| 2 | **Undo Across Sessions** | Low | High | Store undo data in localStorage with timestamp. Allow undo even after page refresh within 5-minute window. Requires cache persistence strategy and localStorage quota management. |
| 3 | **Bulk Delete** | Medium | Medium | Story implements single-item delete. Users may want to select multiple cards and delete in batch. Requires checkbox selection UI and batch endpoint. Deferred to future story. |
| 4 | **Soft Delete Option** | Medium | High | Story implements hard delete only (Non-goal line 40). Future: Add "Archive" option for non-destructive removal with 30-day recovery window. Requires schema change (archived_at column, archive table). |
| 5 | **Delete Confirmation Skip Preference** | Low | Low | Users who delete frequently may want "Don't ask again" checkbox. Store preference in localStorage or user settings. Add settings toggle to re-enable confirmation. |
| 6 | **Undo Animation** | Low | Low | Item removal is instant. Future: Fade-out animation on delete, fade-in on undo. Uses Framer Motion (already in stack). Improves perceived quality. |
| 7 | **Retry on Undo Failure** | Medium | Medium | Story AC 14 shows error toast if undo restoration fails, but no recovery path. Future: Add "Retry" button on undo error toast to re-attempt restoration. |
| 8 | **Concurrent Delete Detection** | Low | Medium | Risk 2 (story line 302) accepts "Item not found" toast on concurrent delete. Future: Detect concurrent delete via optimistic lock or WebSocket and show more helpful message ("This item was already deleted in another tab"). |
| 9 | **Analytics Tracking** | Low | Low | Story defers analytics (Non-goal line 43). Future: Track delete frequency, undo usage rate, error rates, undo window expiration for product insights. Helps optimize undo window duration. |
| 10 | **Email Confirmation for High-Value Items** | Low | High | Users may accidentally delete expensive items. Future: Send email confirmation with restore link for items > $500 or priority 5. Requires email service integration. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Toast Auto-Focus Implementation Detail** | Medium | Low | Story AC 16 says "Toast announced via role='alert'" but doesn't specify focus management. Verify Sonner auto-focuses action button or add explicit focus() call. Critical for screen reader UX. |
| 2 | **Modal Item Preview Enhancement** | Medium | Low | Story shows "thumbnail + title" (AC 9). Enhance with item metadata: price, piece count, store, priority. Helps user confirm correct item before delete. Uses existing WishlistItem data. |
| 3 | **Toast Position Specification** | Low | Low | Story doesn't specify toast position. Recommendation: Bottom-right for consistency with app patterns. Verify Sonner default or configure explicitly. |
| 4 | **Countdown Timer in Toast** | Medium | Medium | Toast auto-dismisses after 5 seconds (AC 11) but no visual countdown. Future: Show circular progress bar or "Undo (3s)" countdown text. Improves UX by making time limit visible. Uses Sonner duration props. |
| 5 | **Delete Confirmation Animation** | Low | Low | Modal appears/disappears instantly. Future: Add scale-in animation on open, fade-out on close. Uses Framer Motion (already in stack). Improves polish. |
| 6 | **Undo History Log** | Low | High | Store undo actions in temporary history (component state or session storage). Allow multiple undo operations within session. Deferred - complexity vs value trade-off. |
| 7 | **Optimistic Delete with Skeleton** | Medium | Medium | Story doesn't specify UI during delete request flight. Future: Show skeleton loader or fade-out animation on card during delete mutation. Improves perceived performance. Uses RTK Query `isLoading` state. |
| 8 | **Smart Undo Window** | Low | Medium | 5-second window is fixed (AC 11). Future: Extend to 10 seconds if user is actively interacting with page (mouse movement, keyboard). Pause countdown on toast hover. Improves accessibility. |
| 9 | **Delete Reason Tracking** | Low | Low | Optional "Why are you removing this?" dropdown in modal (Not interested, Already purchased, Too expensive, Other). Provides analytics for product team insights. |
| 10 | **Restore from Recently Deleted** | Medium | High | Add "Recently Deleted" view showing deleted items from last 7-30 days with restore option. Requires soft delete (Gap #4). Significant UX improvement inspired by iOS Photos app. |
| 11 | **Confirmation Modal Variant for Purchased Items** | Low | Medium | Users may delete purchased items differently. Future: Detect if user wants to delete purchased item and offer "Mark as Got It" option instead. Cross-references WISH-2042. |
| 12 | **Undo Toast Sound/Haptic Feedback** | Low | Low | Add subtle sound or haptic feedback on successful delete and undo. Improves mobile UX. Requires `window.navigator.vibrate()` or Web Audio API. |

## Categories

### Edge Cases
- Gap #3: Bulk delete (multi-select use case)
- Gap #8: Concurrent delete detection (multi-tab scenario)
- Gap #7: Retry on undo failure (network error recovery)

### UX Polish
- Enhancement #2: Modal item preview enhancement (confirm correct item)
- Enhancement #4: Countdown timer in toast (visual time limit)
- Enhancement #5: Delete confirmation animation (scale-in/fade-out)
- Enhancement #6: Undo animation (fade in/out on restore)
- Enhancement #7: Optimistic delete with skeleton state (loading feedback)
- Enhancement #12: Undo toast sound/haptic feedback (mobile UX)

### Performance
- Enhancement #8: Smart undo window (adaptive timing based on user activity)
- Gap #2: Undo across sessions (localStorage persistence)

### Observability
- Gap #9: Analytics tracking (delete/undo metrics, undo window optimization)
- Enhancement #9: Delete reason tracking (product insights)

### Integrations
- Gap #10: Email confirmation for high-value items (email service integration)
- Gap #4: Archive/soft delete option (non-destructive alternative)
- Enhancement #10: Recently Deleted view (30-day recovery window)
- Enhancement #11: Purchased item detection (cross-reference WISH-2042)

### Accessibility
- Enhancement #1: Toast auto-focus improvement (screen reader clarity)
- Gap #1: Keyboard shortcuts for power users (Shift+Delete, Delete key)
- Enhancement #8: Smart undo window (pause on toast hover)

## Priority Recommendations

**P0 (Immediately after MVP):**
- Enhancement #1: Toast auto-focus verification - Critical for accessibility compliance with AC 16
- Gap #9: Basic analytics (delete count, undo rate) - Cheap to add, high insight value

**P1 (Next iteration):**
- Enhancement #4: Countdown timer in toast - High user value, medium effort, prevents confusion about undo window
- Enhancement #2: Modal item preview enhancement - Prevents accidental deletes, low effort (data already available)
- Gap #1: Keyboard shortcut for delete - Referenced in WISH-2006, should be consistent

**P2 (Future sprint):**
- Gap #3: Bulk delete - Common user request, requires new UI patterns
- Enhancement #10: Recently Deleted view - High value but requires schema change (soft delete)
- Gap #7: Retry on undo failure - Better error recovery UX

**Deferred:**
- Gap #10: Email confirmation - Complex, low ROI, may annoy users
- Enhancement #6: Undo history log - Complexity outweighs benefit for single-item delete
- Gap #2: Undo across sessions - Edge case, high implementation cost

## Cross-Story Synergies

1. **WISH-2042 (Purchase Flow):** Will reuse undo pattern from this story. Enhancement #11 suggests cross-referencing delete and purchase flows.
2. **WISH-2006 (Accessibility):** Gap #1 (keyboard shortcuts) should align with comprehensive accessibility work.
3. **WISH-2005a (Drag-and-drop):** Gap #3 (bulk delete) could integrate with multi-select patterns from reordering.
4. **WISH-2009 (Feature flags):** Gap #9 (analytics) could use feature flag infrastructure for gradual rollout of new features.
5. **WISH-2001 (Gallery MVP):** Enhancement #7 (optimistic delete) uses same patterns as gallery filtering/sorting.

## Notes for Implementation

- **Sonner Action API:** Verify Sonner is installed and supports `action: { label, onClick }` API before implementation.
- **204 Response Handling:** RTK Query may require `transformResponse` to handle null body from 204 status. Test during implementation.
- **Hook Export:** Ensure `useRemoveFromWishlistMutation()` is exported alongside other hooks in `wishlistGalleryApi.ts` (lines 116-122).
- **Focus Management:** Test screen reader announcements and focus trap behavior with real assistive technologies, not just automated tools.
- **Undo Pattern Reuse:** Document undo implementation pattern for WISH-2042 to reuse (store item → mutate → restore on undo → handle failure).
