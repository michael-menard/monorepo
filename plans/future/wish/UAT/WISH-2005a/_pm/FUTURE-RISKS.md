# Future Risks: WISH-2005a - Drag-and-drop reordering

## Non-MVP Risks

### Risk 1: Cross-Page Reordering Performance

**Risk:** Fetching all items for cross-page reordering could cause performance issues with large wishlists (100+ items).

**Impact (if not addressed post-MVP):**
- Users with large wishlists cannot reorder items on different pages
- Manual workaround: adjust filters to see all items on one page (cumbersome)
- Power users frustrated by pagination constraint

**Recommended Timeline:** Post-MVP (WISH-2005c or similar)

**Suggested Approach:**
- Implement "Reorder Mode" toggle
- Fetch all items when entering reorder mode (with loading state)
- Use virtualization (`react-window` or `react-virtual`) for large lists
- Cache full list for session duration

---

### Risk 2: Optimistic Update Conflicts with Concurrent Actions

**Risk:** User reorders item while another user (or another tab) deletes or updates the same item.

**Impact (if not addressed post-MVP):**
- Optimistic update shows reordered item, but API fails with 404
- User sees item disappear unexpectedly
- Confusion about why reorder failed

**Recommended Timeline:** Post-MVP (Phase 2 polish)

**Suggested Approach:**
- Add version/timestamp to items for optimistic concurrency control
- Show conflict resolution modal: "This item was modified. Refresh and try again?"
- Add WebSocket support for real-time updates (overkill for MVP)

---

### Risk 3: Undo Functionality Complexity

**Risk:** Full undo/redo stack for multiple reorder operations requires state management complexity.

**Impact (if not addressed post-MVP):**
- Users can only undo last reorder (5-second window)
- No redo functionality
- Accidental reorders require manual fix

**Recommended Timeline:** WISH-2005b (Optimistic updates and undo flow)

**Suggested Approach:**
- Track reorder history in Redux state (last 10 operations)
- Implement undo/redo with keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
- Show undo button in app header (persistent, not just toast)

---

### Risk 4: Accessibility - Advanced Screen Reader Support

**Risk:** Basic screen reader support (ARIA live regions) might not be sufficient for complex drag operations.

**Impact (if not addressed post-MVP):**
- Screen reader users get minimal announcements
- No announcement of relative position ("moved 3 positions down")
- No announcement of item details during drag

**Recommended Timeline:** WISH-2006 (Accessibility epic)

**Suggested Approach:**
- Add detailed ARIA announcements with item metadata
- Announce relative position changes
- Add keyboard shortcuts cheat sheet (modal)
- User testing with screen reader users

---

### Risk 5: Mobile Touch Gesture Conflicts

**Risk:** Long-press delay (300ms) might conflict with native iOS/Android gestures (3D Touch, long-press context menu).

**Impact (if not addressed post-MVP):**
- Some mobile users experience accidental activations
- Scroll vs. drag conflict on certain devices
- User frustration with touch sensitivity

**Recommended Timeline:** Post-MVP (mobile UX refinement)

**Suggested Approach:**
- A/B test different activation delays (200ms vs. 300ms vs. 400ms)
- Add user preference setting: "Touch sensitivity"
- Consider alternative gesture (swipe to reorder instead of drag)

---

### Risk 6: Large Payload Performance

**Risk:** Reordering 100+ items in a single operation could cause slow API response or timeout.

**Impact (if not addressed post-MVP):**
- Users with very large wishlists experience slow reorders
- Potential API timeout (> 30s)
- Database lock contention on batch update

**Recommended Timeline:** Post-MVP (performance optimization)

**Suggested Approach:**
- Add server-side pagination for reorder operations
- Batch update items in chunks (20 at a time)
- Add loading progress bar for large reorders
- Monitor API response times and optimize if needed

---

### Risk 7: Multi-Select Reordering

**Risk:** Reordering multiple items at once (bulk operations) adds complexity to drag-and-drop logic.

**Impact (if not addressed post-MVP):**
- Users must drag items one at a time
- Tedious for large reorganization tasks
- Power users frustrated

**Recommended Timeline:** Future enhancement (Phase 3+)

**Suggested Approach:**
- Add checkbox mode for multi-select
- Drag group of selected items together
- Show count badge on drag preview: "3 items"
- Batch API call for all selected items

---

## Scope Tightening Suggestions

### 1. Defer Undo to WISH-2005b

**Clarification:** This story (WISH-2005a) should focus ONLY on drag-and-drop core functionality. Undo/redo is explicitly deferred to WISH-2005b.

**Why:** Optimistic updates with undo require additional state management complexity (Redux history stack, mutation rollback). Separating concerns keeps WISH-2005a focused.

**OUT OF SCOPE for WISH-2005a:**
- Undo button in toast (5-second window) - Deferred to WISH-2005b
- Redo functionality - Deferred to WISH-2005b
- Undo/redo keyboard shortcuts - Deferred to WISH-2005b

**IN SCOPE for WISH-2005a:**
- Error rollback (revert on API failure) - This is MVP-critical

---

### 2. Defer Cross-Page Reordering

**Clarification:** Reordering is constrained to current page only. Cross-page reordering is explicitly out of scope.

**Why:** Cross-page reordering requires fetching all items (performance concern) and virtualization (complexity). Pagination boundary constraint is acceptable for MVP.

**OUT OF SCOPE for WISH-2005a:**
- "Reorder Mode" toggle - Future story
- Fetch all items for reordering - Future story
- Virtualization for large lists - Future story

**IN SCOPE for WISH-2005a:**
- Show toast when user attempts cross-page drag: "Reordering across pages not supported. Apply filters to see all items on one page."
- Help text near pagination controls

---

### 3. Defer Advanced Accessibility Features

**Clarification:** Basic keyboard navigation and screen reader support is MVP-critical. Advanced features deferred to WISH-2006.

**Why:** WISH-2006 is dedicated accessibility epic. Focus WISH-2005a on core drag-and-drop, defer comprehensive a11y audit.

**OUT OF SCOPE for WISH-2005a:**
- Detailed ARIA announcements with item metadata - WISH-2006
- Keyboard shortcuts cheat sheet - WISH-2006
- High contrast mode testing - WISH-2006
- Reduced motion support - WISH-2006

**IN SCOPE for WISH-2005a:**
- Basic keyboard navigation (Space + Arrow keys) - MVP-critical
- Basic ARIA live regions - MVP-critical
- Basic screen reader announcements (drag start/end) - MVP-critical

---

## Future Requirements

### Nice-to-Have Requirements

1. **Drag Preview Customization**
   - Allow users to choose drag preview style (ghost vs. full preview)
   - User preference setting in profile

2. **Reorder Analytics**
   - Track reorder metrics (frequency, items moved, success rate)
   - Product insights for future optimizations

3. **Reorder Tutorial**
   - First-time user tooltip: "Drag items to reorder your wishlist"
   - Interactive demo with sample data

4. **Haptic Feedback**
   - Vibration feedback on mobile drag start/drop
   - Platform-specific implementation (iOS vs. Android)

5. **Reorder Confirmation for Large Operations**
   - Show confirmation modal for moving 10+ items
   - "Are you sure?" safety prompt

### Polish and Edge Case Handling

1. **Animated Transitions**
   - Spring physics for item movements
   - Stagger animation for multiple items

2. **Drop Zone Visual Indicators**
   - Animated borders for valid drop zones
   - Red tint for invalid drop zones

3. **Drag Handle Design Variants**
   - Offer multiple drag handle styles (horizontal/vertical/icon)
   - User preference or theme-based

4. **Desktop Power Features**
   - Alt+drag to duplicate item
   - Shift+drag to swap positions
   - Ctrl+drag to move to top/bottom

5. **Mobile Gesture Refinements**
   - Swipe gestures as alternative to drag
   - Context-aware activation (scroll vs. drag)
