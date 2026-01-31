# Test Plan: WISH-2005a - Drag-and-drop reordering with dnd-kit

## Scope Summary

**Endpoints touched:**
- `PUT /api/wishlist/reorder` (already exists, backend complete)

**UI touched:** Yes
- Drag-and-drop functionality in wishlist gallery
- Sortable wishlist cards
- Visual feedback during drag operations

**Data/storage touched:** Yes
- Updates `sortOrder` field in `wishlist_items` table
- Batch updates in transaction

---

## Happy Path Tests

### Test 1: Single Item Reorder via Drag-and-Drop

**Setup:**
- User logged in
- Wishlist with 5 items (sort orders 0-4)
- Gallery view loaded

**Action:**
- Drag item from position 0 to position 2
- Drop item

**Expected outcome:**
- Item visually moves to new position immediately
- Other items shift to accommodate
- PUT /api/wishlist/reorder called with updated sortOrder array
- Server responds 200 OK
- Gallery maintains new order after API response

**Evidence:**
- Network tab shows PUT /api/wishlist/reorder with correct payload
- Response body contains updated items array
- UI reflects new order
- Page reload preserves new order

### Test 2: Multiple Items Reordered in Sequence

**Setup:**
- Wishlist with 10 items
- Gallery view loaded

**Action:**
- Drag item from position 0 to position 9
- Wait for API response
- Drag item from position 5 to position 1

**Expected outcome:**
- Each drag operation triggers separate API call
- Both operations persist correctly
- Final order matches expected positions

**Evidence:**
- Two separate PUT requests in network tab
- Database reflects final order
- No race conditions or lost updates

### Test 3: Drag-and-Drop with Pointer (Mouse)

**Setup:**
- Desktop browser
- Wishlist with items

**Action:**
- Click and hold on drag handle (GripVertical icon)
- Move mouse to new position
- Release mouse

**Expected outcome:**
- Item follows cursor during drag
- Drop zone highlights
- Item snaps to position on release

**Evidence:**
- Visual feedback during drag (opacity 0.5, scale 1.02)
- Smooth transition animation
- Cursor changes (grab → grabbing)

### Test 4: Drag-and-Drop with Touch (Mobile)

**Setup:**
- Mobile device or touch simulator
- Wishlist with items

**Action:**
- Long-press on item (300ms)
- Drag finger to new position
- Release

**Expected outcome:**
- Touch drag initiates after 300ms
- Item follows touch position
- Drop works on finger release

**Evidence:**
- Touch event logs show TouchSensor activation
- Visual feedback during touch drag
- Reorder persists

### Test 5: Keyboard Reorder (Accessibility)

**Setup:**
- Wishlist with items
- Focus on first item

**Action:**
- Press Space to activate drag mode
- Press Down Arrow to move item down
- Press Space to confirm new position

**Expected outcome:**
- Keyboard navigation works
- Screen reader announces position changes
- Reorder persists via API call

**Evidence:**
- Keyboard events logged
- API call triggered on Space press (confirm)
- Screen reader announcements (test with VoiceOver/NVDA)

---

## Error Cases

### Error 1: API Reorder Failure (500)

**Setup:**
- Wishlist with items
- Mock API to return 500 error

**Action:**
- Drag item to new position
- API fails with 500

**Expected outcome:**
- Error toast appears: "Failed to save order. Try again."
- Items revert to original positions
- No partial state left

**Evidence:**
- Toast message visible
- UI reverted
- Console shows error logged

### Error 2: Unauthorized Reorder (403)

**Setup:**
- Item belongs to different user
- Mock API to return 403

**Action:**
- Attempt to reorder

**Expected outcome:**
- Error toast: "You don't have permission to reorder this item"
- Items revert

**Evidence:**
- 403 status code in network tab
- Error toast shown
- No optimistic update persists

### Error 3: Item Not Found (404)

**Setup:**
- Item ID in reorder payload doesn't exist
- Mock API to return 404

**Action:**
- Drag item that was deleted in another tab

**Expected outcome:**
- Error toast: "Item not found. Refreshing list."
- Gallery refreshes to show current state

**Evidence:**
- 404 response
- Gallery re-fetches via RTK Query invalidation

### Error 4: Network Timeout

**Setup:**
- Slow network or timeout simulation

**Action:**
- Drag item
- Network request times out

**Expected outcome:**
- Timeout error after 30 seconds (RTK Query default)
- Error toast shown
- Items revert

**Evidence:**
- Network timeout in DevTools
- Error handling triggered

---

## Edge Cases

### Edge 1: Drag Beyond Pagination Boundary

**Setup:**
- Pagination enabled (20 items per page)
- Currently on page 1 (items 0-19)

**Action:**
- Drag item from position 0 toward bottom of page

**Expected outcome:**
- Item can only be reordered within current page
- Cannot drag beyond page boundary
- Warning toast: "Reordering across pages not supported. Apply filters to see all items."

**Evidence:**
- DnD constrained to current page
- Toast message shown
- Documentation in UI/UX notes

### Edge 2: Rapid Drag Operations (Debouncing)

**Setup:**
- Wishlist with items

**Action:**
- Drag item A to position 5
- Immediately drag item B to position 2 (within 500ms)

**Expected outcome:**
- First operation completes
- Second operation queued or rejected
- No race conditions

**Evidence:**
- Network tab shows sequential requests (not concurrent)
- Final state is consistent

### Edge 3: Empty Wishlist

**Setup:**
- Wishlist with 0 items

**Action:**
- Load gallery

**Expected outcome:**
- No drag handles shown
- Empty state displayed instead

**Evidence:**
- DnD context not initialized
- Empty state component rendered

### Edge 4: Single Item Wishlist

**Setup:**
- Wishlist with 1 item

**Action:**
- Attempt to drag single item

**Expected outcome:**
- Drag handle visible but drag has no effect
- No API call made (sortOrder unchanged)

**Evidence:**
- DnD handlers attached but no reorder triggered
- No network request

### Edge 5: Large Payload (100+ items reordered)

**Setup:**
- Wishlist with 100+ items
- Select all and batch reorder

**Action:**
- Drag item from position 0 to position 99

**Expected outcome:**
- API request with 100 item payloads
- Request completes within 3 seconds
- No payload size errors

**Evidence:**
- Network payload size within limits
- Server handles batch update
- Performance acceptable

---

## Required Tooling Evidence

### Backend Testing

**HTTP Requests Required:**

Create file: `__http__/wishlist-reorder.http`

```http
### Reorder wishlist items (happy path)
PUT {{baseUrl}}/api/wishlist/reorder
Content-Type: application/json
Cookie: {{authCookie}}

{
  "items": [
    { "id": "{{item1Id}}", "sortOrder": 2 },
    { "id": "{{item2Id}}", "sortOrder": 0 },
    { "id": "{{item3Id}}", "sortOrder": 1 }
  ]
}

### Expected: 200 OK with updated items array

### Reorder with invalid item ID (404)
PUT {{baseUrl}}/api/wishlist/reorder
Content-Type: application/json
Cookie: {{authCookie}}

{
  "items": [
    { "id": "00000000-0000-0000-0000-000000000000", "sortOrder": 0 }
  ]
}

### Expected: 404 NOT_FOUND

### Reorder another user's item (403)
PUT {{baseUrl}}/api/wishlist/reorder
Content-Type: application/json
Cookie: {{otherUserCookie}}

{
  "items": [
    { "id": "{{item1Id}}", "sortOrder": 0 }
  ]
}

### Expected: 403 FORBIDDEN
```

**Fields/Status Codes to Assert:**
- 200 OK for successful reorder
- Response contains all items with updated `sortOrder`
- Response contains `updatedAt` timestamps
- 400 for validation errors (invalid payload)
- 403 for permission errors
- 404 for missing items
- 500 for database errors

### Frontend Testing (Playwright)

**Playwright Test File:**
`apps/web/app-wishlist-gallery/playwright/drag-drop-reorder.spec.ts`

**Required Assertions:**

1. **Visual Feedback During Drag:**
   - Item opacity changes to 0.5
   - Cursor changes to "grabbing"
   - Drop zone highlights

2. **Drag Completes Successfully:**
   - Item moves to new position
   - Other items shift
   - Network request sent
   - Order persists after reload

3. **Touch Drag:**
   - Long-press activates drag (300ms)
   - Touch drag works
   - Drop on release

4. **Keyboard Navigation:**
   - Space activates drag mode
   - Arrow keys move item
   - Space confirms position
   - Escape cancels

5. **Error Handling:**
   - API failure shows error toast
   - Items revert on error
   - Retry button works

**Artifacts Required:**
- Video recording for visual feedback verification
- Trace file for debugging failures
- Screenshots for each state (drag start, dragging, drop)

---

## Risks to Call Out

### Risk 1: Pagination Boundary Complexity

**Issue:** Reordering across pagination boundaries requires full list context, which conflicts with paginated data fetching.

**Mitigation in Story:**
- SCOPE: Reordering is limited to current page only
- Show warning toast if user attempts cross-page reorder
- Document in UI/UX notes for user clarity

**Test Coverage:**
- Edge Case #1 covers this scenario

### Risk 2: Race Conditions with Concurrent Drags

**Issue:** Rapid drag operations could cause race conditions if API calls overlap.

**Mitigation in Story:**
- Debounce drag operations (500ms)
- Queue or reject concurrent requests
- Use RTK Query mutation state to block concurrent calls

**Test Coverage:**
- Edge Case #2 covers this scenario

### Risk 3: Touch Support Fragility

**Issue:** Touch drag requires careful tuning (long-press delay, scroll conflict).

**Mitigation in Story:**
- Use dnd-kit's TouchSensor with 300ms delay
- Test on real mobile devices (not just simulators)
- Disable scroll during drag

**Test Coverage:**
- Happy Path #4 covers touch drag

### Risk 4: Performance with Large Lists

**Issue:** Reordering 100+ items could cause performance issues.

**Mitigation in Story:**
- Batch updates in single transaction
- Use virtualization if needed (future enhancement)
- Monitor API response time (< 3s requirement)

**Test Coverage:**
- Edge Case #5 covers large payloads

### Risk 5: Accessibility Compliance

**Issue:** Drag-and-drop is inherently inaccessible without keyboard support.

**Mitigation in Story:**
- Use dnd-kit's KeyboardSensor
- Screen reader announcements
- ARIA attributes for sortable items
- Defer comprehensive a11y testing to WISH-2006

**Test Coverage:**
- Happy Path #5 covers keyboard navigation
- Full a11y audit deferred to WISH-2006
