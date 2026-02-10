# Future Opportunities - SETS-MVP-0330

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Item re-ordering after undo: Item may appear at bottom of list instead of original position | Low | Medium | Accept for MVP - Add sortOrder preservation in future iteration if users report confusion |
| 2 | No visual countdown indicator for 5-second undo window | Low | Low | Users rely on toast auto-dismiss timing - Add progress bar in future if analytics show missed undo attempts |
| 3 | Toast persistence across navigation not explicitly tested | Medium | Low | E2E test AC7 assumes toast persists - Verify actual Sonner behavior; document if undo is lost on navigation |
| 4 | No undo notification if user misses window | Low | Low | After toast dismisses, user must manually revert - Consider collection view banner for recent purchases (24h window) |
| 5 | No server-side time validation creates theoretical security gap | Low | Medium | Acceptable risk (user can only undo own items due to ownership validation) - Add server-side expiry if abuse detected |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Extended undo window (24+ hours) via collection view history | High | High | User research: Track undo usage analytics to validate need for longer window beyond toast |
| 2 | Redo functionality (undo the undo) | Medium | Medium | After undo, show "Redo" action in undo success toast - completes undo/redo pattern |
| 3 | Undo history/stack for multiple operations | Medium | High | Defer to v2 - Requires state management, UI for history list, complex undo chain logic |
| 4 | Optimistic UI updates for undo operation | Medium | Low | Immediately update UI while backend processes - Reduces perceived latency but adds complexity |
| 5 | Keyboard shortcut for undo (Cmd+Z / Ctrl+Z) | Low | Medium | Desktop power-user feature - Requires global keyboard listener and context awareness |
| 6 | Undo confirmation modal for accidental clicks | Low | Low | Toast action is already low-friction - May add unnecessary friction; validate with user testing |
| 7 | Analytics tracking: undo usage frequency | Medium | Low | Track: undo_clicked, undo_succeeded, undo_timeout events - Inform future undo window tuning |
| 8 | Batch undo for multiple purchases | Low | High | Edge case: User marks multiple items as purchased in quick succession - Complex UX and backend logic |
| 9 | Undo available in collection view (not just toast) | High | Medium | "Recently purchased" section with undo actions - Complements 24h extended window enhancement |
| 10 | Visual feedback during undo operation (loading spinner) | Low | Low | Toast action button could show loading state - Minor polish improvement |

## Categories

### Edge Cases
- **Gap #1**: Item re-ordering after undo (low priority - acceptable UX trade-off)
- **Gap #3**: Toast persistence across navigation (needs verification)
- **Gap #5**: Server-side time validation (theoretical security gap with low risk)

### UX Polish
- **Enhancement #2**: Redo functionality (complete undo/redo pattern)
- **Enhancement #4**: Optimistic UI updates (reduce perceived latency)
- **Enhancement #6**: Undo confirmation modal (may add friction - needs validation)
- **Enhancement #10**: Visual loading feedback during undo operation

### Performance
- **Enhancement #4**: Optimistic UI updates (immediate UI response)
- No other performance concerns identified - operation is simple status revert

### Observability
- **Enhancement #7**: Analytics tracking for undo usage patterns
  - Metrics: undo_clicked, undo_succeeded, undo_failed, undo_timeout
  - Inform future undo window tuning (5s vs longer window)

### Integrations
- No integration opportunities identified for MVP
- Future: Could notify external systems (inventory tracking, analytics) of purchase reversals

### Power-User Features
- **Enhancement #1**: Extended undo window (24h) via collection view
- **Enhancement #3**: Undo history/stack for multiple operations
- **Enhancement #5**: Keyboard shortcut (Cmd+Z) for desktop users
- **Enhancement #8**: Batch undo for multiple purchases
- **Enhancement #9**: Undo available in collection view (persistent access beyond toast)

---

## Implementation Notes for Future Work

### Extended Undo Window (24h)

**Approach:**
1. Store purchase events in temporary undo log (Redis or DB table)
2. Add "Recently Purchased" section in collection view
3. Display undo action for items purchased within 24h
4. Expire undo log entries after 24h

**Design Considerations:**
- Should undo still clear purchase fields or preserve them?
- Should extended undo move item back to original position?
- What happens if user edits item before undoing?

**Effort:** High (new storage, UI section, state management)

### Analytics Tracking

**Events to Track:**
```typescript
// User clicks undo button in toast
analytics.track('wishlist_undo_clicked', { itemId, timeSincePurchase })

// Undo operation succeeds
analytics.track('wishlist_undo_succeeded', { itemId })

// Undo operation fails
analytics.track('wishlist_undo_failed', { itemId, error })

// Toast dismisses without undo
analytics.track('wishlist_undo_timeout', { itemId })
```

**Effort:** Low (add analytics calls to existing undo flow)

### Optimistic UI Updates

**Current:** RTK Query invalidation triggers refetch (network round-trip)
**Optimistic:** Immediately update local cache, revert on error

**Implementation:**
```typescript
unpurchaseItem: builder.mutation<WishlistItem, string>({
  query: (itemId) => ({
    url: `/api/v2/wishlist/${itemId}/unpurchase`,
    method: 'PATCH',
  }),
  async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
    // Optimistic update
    const patchResult = dispatch(
      api.util.updateQueryData('getWishlistItem', itemId, (draft) => {
        draft.status = 'wishlist'
        draft.purchaseDate = null
        // ... clear other fields
      })
    )

    try {
      await queryFulfilled
    } catch {
      // Revert on error
      patchResult.undo()
    }
  },
}),
```

**Effort:** Low (standard RTK Query pattern)

### Redo Functionality

**User Flow:**
1. User clicks "Undo" in purchase success toast
2. Undo success toast shows: "Purchase reverted" with "Redo" action
3. User clicks "Redo" to re-apply purchase (restore status='owned' and fields)

**Backend:**
- New endpoint: `PATCH /api/v2/wishlist/:id/repurchase`
- Restore previous purchase field values (requires caching or accepting new values)

**Challenge:** How to preserve original purchase field values?
- Option 1: Cache in frontend state (simple, but lost on refresh)
- Option 2: Store in undo log on backend (complex, requires new storage)

**Recommendation:** Wait for user research to validate need before investing in redo

---

## Prioritization Guidance

**High-Impact, Low-Effort (Quick Wins):**
- Enhancement #7: Analytics tracking (validate undo usage patterns)
- Enhancement #4: Optimistic UI updates (reduce perceived latency)

**High-Impact, High-Effort (Future Roadmap):**
- Enhancement #1: Extended undo window (24h) via collection view
- Enhancement #9: Undo available in collection view (persistent access)

**Low-Priority (Nice-to-Have):**
- Enhancement #2: Redo functionality (validate need first)
- Enhancement #5: Keyboard shortcuts (desktop power-user feature)
- Enhancement #10: Loading spinner on undo button (minor polish)

**Validate Before Building:**
- Enhancement #6: Undo confirmation modal (may add friction vs reduce errors)
- Gap #2: Visual countdown indicator (may create anxiety vs clarity)

---

## Risk Mitigation for Future Work

### Extended Undo Window (24h)

**New Risks Introduced:**
- **Storage**: Undo log grows with user activity (requires cleanup strategy)
- **Data Consistency**: What if user edits item before undoing? (need conflict resolution)
- **UX Complexity**: Two undo entry points (toast + collection view) may confuse users

**Mitigations:**
- Use TTL on undo log entries (auto-expire after 24h)
- Disable undo if item has been modified since purchase
- Clear UX distinction: "Immediate Undo" (toast) vs "Purchase History" (collection view)

### Analytics Tracking

**Privacy Considerations:**
- Ensure analytics events don't include PII (item titles, user names)
- Use anonymized item IDs and aggregate metrics

### Optimistic Updates

**Complexity Risks:**
- UI flicker if optimistic update conflicts with server response
- Error handling must revert state cleanly

**Mitigations:**
- Thoroughly test error scenarios (network failures, 403/404 responses)
- Consider disabling optimistic updates if RTK Query cache invalidation is fast enough
