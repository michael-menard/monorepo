# KB Write Requests - SETS-MVP-0330

This file tracks KB entries that should be created for non-blocking findings from elaboration.

## Edge Cases

### Finding #1: Item Re-Ordering After Undo
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** edge-case
**Tags:** edge-case, future-work, ux-trade-off
**Impact:** Low
**Effort:** Medium

**Content:**
Item may appear at bottom of list instead of original position after undo operation. This is an acceptable UX trade-off for MVP - users understand the item moved back to wishlist.

**Recommendation:** Add sortOrder preservation in future iteration if users report confusion. Consider using statusChangedAt for re-sort or persist original sort order before purchase.

---

### Finding #3: Toast Persistence Across Navigation
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** edge-case
**Tags:** edge-case, testing-needed, sonner-behavior
**Impact:** Medium
**Effort:** Low

**Content:**
Toast persistence across navigation not explicitly tested. E2E test AC7 assumes toast persists when modal closes.

**Recommendation:** Verify actual Sonner toast behavior during navigation events. Document whether undo is lost on navigation or if toast persists. If lost, document as known limitation or add session storage to preserve undo action.

---

### Finding #5: No Server-Side Time Validation
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** edge-case
**Tags:** edge-case, security, acceptable-risk
**Impact:** Low
**Effort:** Medium

**Content:**
No server-side time validation creates theoretical security gap - user could manually call unpurchase endpoint after 5-second window expires.

**Recommendation:** Acceptable risk for MVP. User can only undo own items due to ownership validation at service layer. Worst case: user undos after window via manual API call - still valid user action. Add server-side expiry (with generous buffer for clock skew) if abuse is detected in production.

---

## UX Polish

### Finding #2: No Visual Countdown Indicator
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** ux-polish
**Tags:** ux-polish, enhancement, visual-feedback
**Impact:** Low
**Effort:** Low

**Content:**
No visual countdown indicator for 5-second undo window. Users rely on toast auto-dismiss timing to understand remaining time.

**Recommendation:** Consider adding progress bar or countdown timer in future if analytics show high rate of missed undo attempts. May create anxiety vs clarity - validate with user research before implementing.

---

### Finding #4: No Undo Notification After Window Expires
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** ux-polish
**Tags:** ux-polish, future-work, extended-undo
**Impact:** Low
**Effort:** Low

**Content:**
After toast dismisses, user has no way to undo purchase except manual revert. No notification or reminder that undo was available.

**Recommendation:** Consider collection view banner for recent purchases (24h window) with undo action. Complements extended undo window enhancement (#6).

---

### Finding #7: Redo Functionality
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** enhancement
**Tags:** enhancement, undo-redo-pattern, user-research-needed
**Impact:** Medium
**Effort:** Medium

**Content:**
Redo functionality (undo the undo) not implemented in MVP. User may accidentally click undo and want to restore purchase immediately.

**Recommendation:** After undo, show "Redo" action in undo success toast - completes undo/redo pattern. Challenge: How to preserve original purchase field values? Requires caching in frontend or undo log on backend. Wait for user research to validate need before investing.

---

## Performance

### Finding #9: Optimistic UI Updates
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** performance
**Tags:** performance, optimization, quick-win
**Impact:** Medium
**Effort:** Low

**Content:**
Current implementation uses RTK Query cache invalidation (network round-trip). Optimistic updates would immediately update local cache and revert on error.

**Recommendation:** Quick win - Standard RTK Query pattern. Reduces perceived latency. Thoroughly test error scenarios to ensure clean revert on failure. Consider if current invalidation is fast enough before adding complexity.

**Implementation:**
```typescript
unpurchaseItem: builder.mutation<WishlistItem, string>({
  async onQueryStarted(itemId, { dispatch, queryFulfilled }) {
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
      patchResult.undo()
    }
  },
})
```

---

## Observability

### Finding #10: Analytics Tracking for Undo Usage
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** observability
**Tags:** observability, monitoring, analytics, quick-win
**Impact:** Medium
**Effort:** Low

**Content:**
No analytics tracking for undo usage patterns. Need data to inform future undo window tuning and validate need for extended undo features.

**Recommendation:** Quick win - Add analytics events to existing undo flow.

**Events to Track:**
- `wishlist_undo_clicked` - User clicks undo button in toast (include timeSincePurchase)
- `wishlist_undo_succeeded` - Undo operation succeeds
- `wishlist_undo_failed` - Undo operation fails (include error type)
- `wishlist_undo_timeout` - Toast dismisses without user clicking undo

**Privacy:** Ensure events use anonymized item IDs, no PII in event data.

---

## Future Work

### Finding #6: Extended Undo Window (24+ hours)
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** future-work
**Tags:** future-work, high-impact, roadmap-candidate
**Impact:** High
**Effort:** High

**Content:**
Extended undo window (24+ hours) via collection view history. Current MVP only supports 5-second window via toast.

**Recommendation:** High-impact future enhancement. Track undo usage analytics first to validate need for longer window beyond toast.

**Approach:**
1. Store purchase events in temporary undo log (Redis or DB table with TTL)
2. Add "Recently Purchased" section in collection view
3. Display undo action for items purchased within 24h
4. Expire undo log entries after 24h

**Design Considerations:**
- Should undo still clear purchase fields or preserve them?
- Should extended undo move item back to original position?
- What happens if user edits item before undoing? (need conflict resolution)

**New Risks:**
- Storage: Undo log grows with user activity (requires cleanup strategy)
- Data Consistency: Need conflict resolution if item modified before undo
- UX Complexity: Two undo entry points may confuse users (toast vs collection view)

---

### Finding #8: Undo History/Stack for Multiple Operations
**Entry Type:** finding
**Source Stage:** elab
**Story ID:** SETS-MVP-0330
**Category:** future-work
**Tags:** future-work, v2-candidate, complex
**Impact:** Medium
**Effort:** High

**Content:**
Undo history/stack for multiple operations. Current MVP only supports single-action undo (no undo chain or history).

**Recommendation:** Defer to v2. Requires significant investment:
- State management for undo/redo stack
- UI for displaying undo history list
- Complex undo chain logic (what happens when user undos operation #3 out of 5?)
- Storage for operation history

**Prioritization:** Wait for user research to validate need. Most users likely only need immediate undo (current MVP) or extended window for recent purchase (finding #6).

---

## Summary

**Total KB Entries:** 10

**By Category:**
- Edge Cases: 3
- UX Polish: 3
- Performance: 1
- Observability: 1
- Future Work: 2

**Quick Wins (High-Impact, Low-Effort):**
- Finding #10: Analytics tracking (validate undo usage patterns)
- Finding #9: Optimistic UI updates (reduce perceived latency)

**Future Roadmap (High-Impact, High-Effort):**
- Finding #6: Extended undo window (24h) via collection view

**Validate Before Building:**
- Finding #2: Visual countdown indicator (may create anxiety vs clarity)
- Finding #7: Redo functionality (validate need with user research)
