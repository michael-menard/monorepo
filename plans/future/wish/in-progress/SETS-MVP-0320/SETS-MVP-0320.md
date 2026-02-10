---
doc_type: story
title: "SETS-MVP-0320: Purchase UX Polish"
story_id: SETS-MVP-0320
story_prefix: SETS-MVP
status: in-progress
split_from: SETS-MVP-003
split_part: 2 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-02-09T14:30:00Z"
depends_on: [SETS-MVP-0310]
estimated_points: 1
---

# SETS-MVP-0320: Purchase UX Polish

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 2 of 4 (UX polish for purchase flow)
- **Dependency:** Depends on SETS-MVP-0310 (Status Update Flow)

## Context

After a user marks an item as purchased (SETS-MVP-0310), we need to provide clear feedback that the action was successful and guide them to view their collection. This story adds the success toast notification, navigation link, and smooth visual transition when items move from wishlist to owned status.

## Goal

Provide clear user feedback after purchase and smooth visual transition when items leave the wishlist, improving the perceived quality and intuitiveness of the purchase flow.

## Non-goals

- Undo functionality (covered in SETS-MVP-0330)
- Form validation (covered in SETS-MVP-0340)
- Collection view implementation (dependency on SETS-MVP-002)
- Complex animation sequences or transitions

## Scope

Add success toast with "View in Collection" link and item removal animation when an item is marked as purchased. The toast appears after successful purchase, provides positive feedback, and offers navigation to the collection view. The item smoothly animates out of the wishlist view if the user is currently on the wishlist page.

## Acceptance Criteria

### Success Feedback
- [ ] AC11: Success toast appears after purchase: "Added to your collection!"
- [ ] AC12: Toast includes "View in Collection" link
- [ ] AC13: Item disappears from wishlist view after purchase
- [ ] AC14: If user is on wishlist page, item animates out

## Reuse Plan

### Existing Components
- Toast notification system (check if exists in `@repo/ui` or app)
- Existing list item components from wishlist gallery
- Animation utilities (Framer Motion per CLAUDE.md)

### Shared Packages
- `@repo/ui` - Toast component (or implement if not exists)
- Framer Motion - For item removal animation

### New Components (if needed)
- Toast component (if not already in `@repo/ui`)
- May need to wrap existing toast with purchase-specific content

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Add toast trigger after purchase
    hooks/
      useToast.ts                    # Toast hook (may already exist)
```

### Toast Implementation

```typescript
// After successful purchase in GotItModal
toast.success("Added to your collection!", {
  action: {
    label: "View in Collection",
    onClick: () => router.push('/collection')
  },
  duration: 5000
})
```

### Animation Approach

```typescript
// Item removal animation with Framer Motion
<motion.div
  exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
>
  {/* Wishlist item */}
</motion.div>
```

## Test Plan

### Unit Tests
- `GotItModal.test.tsx` updates:
  - Toast appears after successful purchase
  - Toast contains correct message
  - Toast includes "View in Collection" link
  - Link onClick navigates to /collection

### Integration Tests
- Item removal from list:
  - Item is removed from wishlist state after purchase
  - List updates correctly without the purchased item

### E2E Tests (Playwright)
- Happy path: User purchases item, sees toast, clicks "View in Collection"
- Animation: Item animates out of view on wishlist page
- Toast persistence: Toast disappears after timeout

## Risks / Edge Cases

### Edge Cases
1. **Collection view doesn't exist yet**: SETS-MVP-002 may not be implemented
   - Mitigation: Check if /collection route exists, show placeholder or disable link if not
   - Alternative: Link to home page or show "Coming soon" message

2. **Toast link target undefined**: Where should "View in Collection" navigate?
   - Decision needed: Route path for collection view
   - Temporary solution: Disable link until SETS-MVP-002 complete

3. **Animation timing**: Item may animate out before user sees it was purchased
   - Mitigation: Delay animation start by ~300ms to allow toast to appear first

4. **Multiple items purchased quickly**: Toast stacking/queueing
   - Mitigation: Use toast system's built-in queueing (most toast libraries handle this)

### Low-Priority Risks
- Animation performance on low-end devices
- Toast accessibility (screen reader announcements)

## Definition of Done

- [ ] Success toast appears after purchase
- [ ] Toast includes "View in Collection" link (or appropriate placeholder)
- [ ] Item is removed from wishlist view after purchase
- [ ] Item animates out smoothly if on wishlist page
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed
- [ ] No regression in purchase flow

---

## Implementation Notes

### Toast System Check
Verify if toast component exists in `@repo/ui`:
- If yes: Use existing toast with action button support
- If no: Consider adding toast to `@repo/ui` or using a lightweight library (e.g., sonner, react-hot-toast)

### Collection Route Handling
Check SETS-MVP-002 implementation status:
- If collection view exists: Use actual route (/collection)
- If not: Either disable link with "Coming soon" or link to home with filter

### Animation Reuse
Check for existing item removal animations:
- May already exist in delete flow for wishlist items
- Reuse same animation for consistency

### Accessibility
- Toast should be announced to screen readers (role="status" or role="alert")
- Action link should be keyboard accessible
- Animation should respect prefers-reduced-motion

---

## QA Discovery Notes (Elaboration Complete)

### Audit Summary
- **Status:** ✅ PASS
- **Mode:** Autonomous
- **Generated:** 2026-02-09T12:30:00Z
- **Audit Checks:** 8 of 8 PASSED
- **Issues Resolved:** 0 blocking gaps
- **KB Entries Logged:** 12 non-blocking enhancements

### MVP Gaps Resolved

| Gap | Severity | Resolution | Status |
|-----|----------|-----------|--------|
| *None identified* | — | All critical infrastructure exists | ✅ RESOLVED |

### Non-Blocking Items Logged to KB

12 future opportunities identified and logged to knowledge base:

| # | Item | Category | Effort | Status |
|---|------|----------|--------|--------|
| 1 | Toast Component Library Documentation | Developer Experience | Low (0.5 pts) | KB-logged |
| 2 | Advanced Animation Choreography | UX Polish | Medium (3 pts) | KB-logged |
| 3 | Toast Action Button Keyboard Shortcuts | Accessibility | Low (2 pts) | KB-logged |
| 4 | Optimistic UI Updates with Rollback | Performance | Medium (2 pts) | KB-logged |
| 5 | Custom Toast Positioning and Stacking | UX Enhancement | Low (1 pt) | KB-logged |
| 6 | Analytics and Tracking | Product Analytics | Low (1 pt) | KB-logged |
| 7 | Toast Notification Preferences | User Preferences | Medium (3 pts) | KB-logged |
| 8 | Cross-Page Toast Persistence | UX Enhancement | Low (1 pt) | KB-logged |
| 9 | Toast Action Button Variants | Design System | Low (1 pt) | KB-logged |
| 10 | Animation Performance Monitoring | Performance | Low (2 pts) | KB-logged |
| 11 | Multi-Item Purchase Batch Feedback | UX Enhancement | Medium (3 pts) | KB-logged |
| 12 | Toast Notification Sound/Haptic Feedback | Accessibility | Medium (2 pts) | KB-logged |

### Summary Counts

| Metric | Count |
|--------|-------|
| Audit Checks Passed | 8/8 ✅ |
| MVP-Critical Gaps | 0 |
| Non-Blocking Items Logged | 12 |
| Stories Unblocked | 1 (ready-to-work) |
| Implementation Ready | YES ✅ |

### Elaboration Verdict

**Status:** ✅ **PASS - READY FOR IMPLEMENTATION**

Story is fully elaborated with clear scope, technical decisions documented, and all infrastructure validated. No blocking gaps identified. 1 story point estimate confirmed as appropriate. All future opportunities deferred and logged to KB.