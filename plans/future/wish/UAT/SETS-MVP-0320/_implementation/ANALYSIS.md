# SETS-MVP-0320: Purchase UX Polish - Analysis

**Story ID:** SETS-MVP-0320
**Status:** elaboration
**Depends On:** SETS-MVP-0310 (ready-for-qa)
**Split From:** SETS-MVP-003 (2 of 4)
**Estimated Points:** 1

---

## 8-Point Audit Checklist

### 1. Dependency Check

**Status:** ✅ PASS

**Dependencies:**
- **SETS-MVP-0310 (Status Update Flow):** ready-for-qa (UAT folder exists)
  - Location: `/Users/michaelmenard/Development/monorepo/plans/future/wish/UAT/SETS-MVP-0310/`
  - This story enhances the success toast from SETS-MVP-0310
  - GotItModal exists at `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`
  - Current implementation shows basic toast at line 177-182

**Blocking Check:**
- No blockers - dependency is complete and in QA
- GotItModal is implemented and working
- Basic success toast already exists (needs enhancement)

**Related Stories:**
- **SETS-MVP-0330 (Undo Support):** backlog - Will add "Undo" button to the same toast (sequential dependency)
- **SETS-MVP-0340 (Form Validation):** backlog - Different concern, no overlap
- **SETS-MVP-002 (Collection View):** UAT - Collection route exists at `/collection`

---

### 2. Scope Clarity

**Status:** ✅ PASS with CLARIFICATION

**Scope Definition:**
1. **Success Toast Enhancement:**
   - Replace basic toast with enhanced version
   - Message: "Added to your collection!"
   - Add "View in Collection" link/button
   - 5-second duration (existing default)

2. **Item Removal Animation:**
   - Animate item out of wishlist view after purchase
   - Use Framer Motion exit animation
   - Respect `prefers-reduced-motion`

3. **Navigation:**
   - Link to `/collection` route (confirmed to exist)
   - Use TanStack Router `useNavigate()` or `Link` component

**Boundaries:**
- ✅ Frontend-only story (no API changes)
- ✅ Enhances existing GotItModal success callback
- ✅ Single component affected primarily (GotItModal)
- ✅ Uses existing toast infrastructure

**Clarifications Needed:**
1. **Toast Action Implementation:**
   - Sonner v2.0.6 DOES support action buttons (confirmed via web search)
   - Pattern: `toast.success(title, { action: { label: 'Action', onClick: () => {} } })`
   - BuildStatusToggle (line 114-123) already uses this pattern successfully

2. **Item Removal Trigger:**
   - Current: `onSuccess?.()` callback in GotItModal (line 154)
   - Need to trigger list item removal after toast appears
   - Options:
     - A) RTK Query cache invalidation (refetch wishlist)
     - B) Optimistic update in parent component
     - C) Remove item from local state in parent

3. **Animation Location:**
   - Need to determine where animation is applied:
     - Option A: In WishlistCard component (wrap in motion.div)
     - Option B: In DraggableWishlistGallery (list-level AnimatePresence)
     - Option C: In parent page component (main-page.tsx)

**MVP Scope Validation:**
- ✅ Focused on single user action (purchase feedback)
- ✅ Clear acceptance criteria (4 ACs)
- ✅ No complex state management
- ✅ Reuses existing infrastructure
- ✅ 1 story point estimate is appropriate

---

### 3. Technical Feasibility

**Status:** ✅ PASS

**Infrastructure Status:**

1. **Toast System:** ✅ Ready
   - `@repo/app-component-library/src/hooks/useToast.ts` - Hook with success method
   - `@repo/app-component-library/src/notifications/toast-utils.tsx` - CustomToast component
   - Sonner v2.0.6 with action button support confirmed
   - BuildStatusToggle demonstrates action button usage (line 117-122)

2. **Navigation:** ✅ Ready
   - TanStack Router installed and configured
   - `useNavigate()` used in main-page.tsx (line 16)
   - `/collection` route exists and working (CollectionPage/index.tsx)

3. **Animation:** ✅ Ready
   - Framer Motion v12.23.24 installed
   - AnimatePresence pattern exists in BuildStatusToggle (line 172-185)
   - Exit animation pattern: `exit={{ scale: 0, opacity: 0 }}`
   - Reduced motion support pattern exists (BuildStatusToggle line 61-64)

4. **Component Architecture:** ✅ Ready
   - GotItModal exists with success callback
   - Purchase mutation exists: `useUpdateItemPurchaseMutation`
   - Modal closes before showing toast (line 148-151)

**Technical Risks:**

1. **Toast Action Button Pattern:** ⚠️ LOW RISK
   - BuildStatusToggle uses direct `toast.success()` with action prop (line 114-123)
   - Current GotItModal uses `toast.success()` without action (line 178-181)
   - **Solution:** Add action prop to existing toast call
   - **Complexity:** Minimal - 1 line change

2. **Item Removal Timing:** ⚠️ MEDIUM RISK
   - Toast appears immediately after purchase
   - Item should disappear from list
   - Risk: Race condition between toast display and list update
   - **Solution:** Use RTK Query cache invalidation after mutation success
   - **Alternative:** Optimistic update with rollback on error

3. **Animation Integration:** ⚠️ LOW RISK
   - Need to wrap list items in AnimatePresence
   - Risk: May conflict with drag-and-drop if active
   - **Solution:** DraggableWishlistGallery already handles item rendering
   - Check if AnimatePresence compatible with drag-and-drop library

**Implementation Path:**

1. **Toast Enhancement (AC11-12):**
   ```typescript
   // In GotItModal/index.tsx line 177-182 (replace existing toast)
   toast.success('Added to your collection!', {
     description: wishlistItem.title,
     duration: 5000,
     action: {
       label: 'View in Collection',
       onClick: () => {
         // Use router navigation
         navigate({ to: '/collection' })
       }
     }
   })
   ```

2. **Item Removal (AC13):**
   ```typescript
   // After mutation success in GotItModal
   await updateItemPurchase({ itemId, input }).unwrap()

   // Invalidate cache to trigger refetch
   // OR call onSuccess callback to notify parent
   onSuccess?.()
   ```

3. **Animation (AC14):**
   ```typescript
   // In DraggableWishlistGallery or parent component
   <AnimatePresence mode="popLayout">
     {items.map(item => (
       <motion.div
         key={item.id}
         exit={{ opacity: 0, height: 0 }}
         transition={{ duration: 0.3 }}
       >
         <WishlistCard {...item} />
       </motion.div>
     ))}
   </AnimatePresence>
   ```

**Feasibility Rating:** ✅ HIGH - All infrastructure exists, minimal new code required

---

### 4. Testing Requirements

**Status:** ✅ PASS

**Test Coverage Analysis:**

**Existing Tests:**
- `GotItModal/__tests__/` - Existing modal tests
- `@repo/app-component-library/src/__tests__/toast-utils.test.tsx` - Toast utilities
- BuildStatusToggle has action button test pattern to reference

**Required Tests (per story):**

1. **Unit Tests - GotItModal:**
   - [ ] Toast appears after successful purchase
   - [ ] Toast contains "Added to your collection!" message
   - [ ] Toast includes "View in Collection" action button
   - [ ] Action button onClick calls navigate with /collection route
   - [ ] Toast duration is 5000ms (5 seconds)

2. **Integration Tests - Item Removal:**
   - [ ] Item is removed from wishlist state after purchase
   - [ ] List updates correctly without the purchased item
   - [ ] RTK Query cache invalidation works correctly

3. **E2E Tests (Playwright) - per ADR-006:**
   - [ ] Happy path: User purchases item, sees toast with correct message
   - [ ] User clicks "View in Collection" link, navigates to /collection
   - [ ] Item disappears from wishlist view after purchase
   - [ ] Animation: Item animates out smoothly (visual regression test)
   - [ ] Toast auto-dismisses after 5 seconds

**Accessibility Tests:**
- [ ] Toast announced to screen readers (role="alert" or role="status")
- [ ] Action button is keyboard accessible (Tab + Enter)
- [ ] Animation respects prefers-reduced-motion

**Test Strategy:**
- Follow existing GotItModal test patterns
- Reference BuildStatusToggle tests for action button patterns
- Use RTL's `waitFor` for async toast appearance
- Use `findByRole` for action button discovery
- E2E test should verify actual navigation occurs

**Coverage Target:** 45% minimum (per CLAUDE.md)
- GotItModal changes should maintain existing coverage
- New toast logic should be 100% covered (critical user feedback)

---

### 5. Migration/Data Impact

**Status:** ✅ PASS - No migration needed

**Data Changes:**
- ✅ No database schema changes
- ✅ No API endpoint changes
- ✅ No data migration required

**State Management:**
- Frontend state only (toast display, animation)
- RTK Query cache invalidation (existing pattern)
- No persistent state changes

**Backward Compatibility:**
- ✅ 100% backward compatible
- ✅ Enhances existing flow without breaking changes
- ✅ Existing GotItModal functionality preserved

---

### 6. Documentation Needs

**Status:** ✅ PASS

**Code Documentation:**
- [ ] Update GotItModal JSDoc comments to reflect enhanced toast
- [ ] Document toast action button pattern in implementation
- [ ] Add comments explaining animation timing and reduced motion support
- [ ] Document navigation pattern (TanStack Router)

**User-Facing Documentation:**
- ⚠️ No user docs in scope (internal feature)
- Collection route already documented in SETS-MVP-002

**Developer Documentation:**
- [ ] Update IMPLEMENTATION-PLAN.md with technical decisions
- [ ] Document toast enhancement pattern for future reference
- [ ] Note any animation integration challenges discovered

**ADR Requirements:**
- No new ADRs required
- Follows ADR-006 (E2E tests in dev phase)
- Follows ADR-005 (testing strategy with real services)

---

### 7. Edge Cases & Error Handling

**Status:** ✅ PASS with GAPS

**Edge Cases Identified:**

1. **Collection Route Availability:** ✅ HANDLED
   - Risk: Collection view may not be fully implemented
   - Reality: CollectionPage exists and working (SETS-MVP-002 in UAT)
   - Mitigation: Not needed - route is confirmed working

2. **Multiple Items Purchased Quickly:** ⚠️ NEEDS CONSIDERATION
   - Risk: Toast stacking/queueing
   - Reality: Sonner handles queueing automatically
   - Test: Verify toast queue behavior with multiple purchases
   - Mitigation: None needed if Sonner handles gracefully

3. **Animation Timing Coordination:** ⚠️ NEEDS CONSIDERATION
   - Risk: Item may animate out before user sees toast
   - Reality: Toast appears immediately, animation should be delayed
   - Mitigation: Consider 200-300ms delay before starting exit animation
   - Implementation: `setTimeout(() => removeItem(), 300)` after toast

4. **Navigation During Toast Display:** ⚠️ NEEDS CONSIDERATION
   - Risk: User navigates away before clicking "View in Collection"
   - Reality: Toast should persist across page navigation (Sonner default)
   - Test: Verify toast remains after user navigates elsewhere
   - Mitigation: None needed if Sonner handles cross-page toasts

5. **Toast Dismissed Before Clicking Link:** ✅ EXPECTED BEHAVIOR
   - Risk: User manually closes toast before clicking link
   - Reality: This is expected - user chose not to navigate
   - Mitigation: None needed (user can manually navigate to collection)

6. **Item Already Removed From List:** ⚠️ NEEDS CONSIDERATION
   - Risk: Cache invalidation removes item before animation completes
   - Reality: Potential race condition
   - Mitigation: Delay cache invalidation OR use optimistic update with animation

7. **Animation Performance on Low-End Devices:** ⚠️ DEFERRED
   - Risk: Janky animation on slow devices
   - Reality: Simple opacity/height animation is performant
   - Mitigation: Respect prefers-reduced-motion (already planned)
   - Further optimization: Defer to future if performance issues reported

8. **Screen Reader Announcement:** ⚠️ NEEDS VERIFICATION
   - Risk: Toast content not announced to screen readers
   - Reality: CustomToast has role="alert" (line 114 in toast-utils.tsx)
   - Test: Verify action button is announced correctly
   - Mitigation: May need aria-label on action button

**Error Scenarios:**

1. **Purchase API Call Fails:** ✅ HANDLED
   - Existing error toast in GotItModal (line 157-159)
   - No success toast shown, no animation triggered
   - No changes needed to error handling

2. **Navigation Fails:** ⚠️ NEEDS HANDLING
   - Risk: Collection route throws error
   - Mitigation: Wrap navigate() in try-catch, show error toast if fails
   - Implementation:
     ```typescript
     onClick: () => {
       try {
         navigate({ to: '/collection' })
       } catch (err) {
         toast.error('Could not navigate to collection')
       }
     }
     ```

3. **Animation Interrupted:** ✅ HANDLED BY FRAMER
   - Framer Motion handles interrupted animations gracefully
   - No additional error handling needed

**MVP Priority:**
- Address items marked ⚠️ NEEDS CONSIDERATION in implementation
- Defer low-priority risks to future stories
- Focus on core happy path: purchase → toast → navigate → animate

---

### 8. MVP Alignment

**Status:** ✅ PASS - Well-aligned with MVP goals

**MVP Value Proposition:**
- ✅ Improves perceived quality of purchase flow (critical MVP moment)
- ✅ Provides clear user feedback (reduces user uncertainty)
- ✅ Guides user to next action (view purchased item in collection)
- ✅ Smooth visual transition reduces jarring UI changes

**Scope Discipline:**
- ✅ 4 focused acceptance criteria
- ✅ Single user action (purchase completion)
- ✅ Reuses existing infrastructure
- ✅ No complex state management
- ✅ 1 story point is appropriate

**Non-Goals Validation:**
- ✅ Undo functionality deferred to SETS-MVP-0330 (correct)
- ✅ Form validation deferred to SETS-MVP-0340 (correct)
- ✅ Complex animation sequences avoided (correct)
- ✅ Collection view implementation not in scope (already exists)

**User Impact:**
- **High Value:** Purchase is a critical conversion moment
- **Low Risk:** Enhancement only, doesn't change core functionality
- **Quick Feedback:** Toast provides immediate positive reinforcement
- **Clear Navigation:** Guides user to next logical step

**Dependency Management:**
- ✅ Depends on SETS-MVP-0310 (ready-for-qa) - unblocked
- ✅ Enables SETS-MVP-0330 (Undo Support) - sets up toast for undo button
- ✅ Independent of SETS-MVP-0340 (Form Validation)

**Risks to MVP Timeline:**
- ✅ LOW RISK - All infrastructure exists
- ✅ LOW COMPLEXITY - Minimal new code required
- ✅ LOW TESTING BURDEN - Leverages existing test patterns
- ✅ NO BLOCKERS - Dependency complete

---

## Gap Analysis

### Critical Gaps

**None identified** - All required infrastructure exists.

### Implementation Gaps

1. **Toast Action Button Pattern:**
   - **Gap:** GotItModal currently uses basic toast without action
   - **Solution:** Add action prop (1-line change)
   - **Effort:** Trivial
   - **Example exists:** BuildStatusToggle line 114-123

2. **Item Removal Strategy:**
   - **Gap:** No clear strategy for triggering item removal from list
   - **Options:**
     - A) RTK Query cache invalidation (simplest)
     - B) Optimistic update in parent
     - C) Parent component state update via callback
   - **Recommendation:** Option A (cache invalidation) for simplicity
   - **Effort:** Low (existing pattern in codebase)

3. **Animation Integration Point:**
   - **Gap:** Unclear where to add AnimatePresence wrapper
   - **Options:**
     - A) DraggableWishlistGallery component
     - B) WishlistCard component
     - C) Parent page component
   - **Recommendation:** Option A (DraggableWishlistGallery) for centralized control
   - **Effort:** Medium (need to verify drag-and-drop compatibility)

4. **Navigation Hook Import:**
   - **Gap:** Need to add useNavigate import to GotItModal
   - **Solution:** Import from '@tanstack/react-router'
   - **Effort:** Trivial
   - **Example exists:** main-page.tsx line 16

### Documentation Gaps

1. **Toast Action Pattern:**
   - Not documented in codebase
   - Should add example to component library docs
   - Defer to FUTURE-OPPORTUNITIES

2. **Animation Timing Coordination:**
   - No documented pattern for coordinating toast + animation
   - Should document timing decisions in implementation
   - Add to IMPLEMENTATION-PLAN.md

### Testing Gaps

1. **E2E Test for Navigation:**
   - Need Playwright test for "View in Collection" flow
   - Should verify actual page navigation occurs
   - Add to test plan

2. **Animation Performance Test:**
   - No performance testing for animations
   - Consider visual regression test
   - Defer to future unless issues arise

---

## MVP-Focused Recommendations

### Implementation Priority

**Phase 1: Toast Enhancement (AC11-12)**
- Replace basic toast with action button version
- Add navigation to /collection
- Test toast appearance and navigation

**Phase 2: Item Removal (AC13)**
- Implement cache invalidation or state update
- Test item disappears from list
- Verify no visual glitches

**Phase 3: Animation (AC14)**
- Add AnimatePresence wrapper
- Implement exit animation
- Add reduced motion support
- Test animation smoothness

### Risk Mitigation

1. **Animation Timing:**
   - Add 200-300ms delay before triggering removal
   - Ensures user sees toast before item disappears

2. **Navigation Error Handling:**
   - Wrap navigate() in try-catch
   - Show error toast if navigation fails

3. **Animation Compatibility:**
   - Test with drag-and-drop enabled
   - Ensure AnimatePresence doesn't conflict with DnD library

### Testing Strategy

1. **Unit Tests:** Focus on toast content and navigation logic
2. **Integration Tests:** Verify item removal and cache invalidation
3. **E2E Tests:** Happy path with real navigation and animation
4. **Accessibility Tests:** Screen reader and keyboard navigation

### Success Criteria

- ✅ User sees clear success message after purchase
- ✅ User can navigate to collection with one click
- ✅ Item smoothly disappears from wishlist view
- ✅ All animations respect user preferences
- ✅ No regressions in existing purchase flow

---

## Technical Decisions Required

### Decision 1: Item Removal Strategy

**Options:**
1. RTK Query cache invalidation (refetch)
2. Optimistic update in cache
3. Parent component state update

**Recommendation:** Option 1 (cache invalidation)
- **Pros:** Simple, reliable, existing pattern
- **Cons:** Network request overhead (acceptable for UX)

**Rationale:** Ensures data consistency, minimal code changes

### Decision 2: Animation Location

**Options:**
1. DraggableWishlistGallery (list-level)
2. WishlistCard (card-level)
3. Parent page component

**Recommendation:** Option 1 (DraggableWishlistGallery)
- **Pros:** Centralized, reusable, cleaner separation
- **Cons:** May need to verify drag-and-drop compatibility

**Rationale:** Best separation of concerns, single source of truth for list rendering

### Decision 3: Animation Timing

**Options:**
1. Immediate animation (0ms delay)
2. Short delay (200-300ms)
3. Delay tied to toast duration

**Recommendation:** Option 2 (200-300ms delay)
- **Pros:** User sees toast before item disappears
- **Cons:** Slight perceived lag

**Rationale:** Better UX - user understands what happened before visual change

### Decision 4: Toast Duration

**Given:** 5000ms (existing default)
**Validation:** Appropriate for message + action button
**No change needed**

---

## Dependencies Validation

### SETS-MVP-0310 (Status Update Flow)

**Status:** ready-for-qa ✅
**Validation:**
- GotItModal exists and working
- Purchase mutation implemented
- Success toast exists (needs enhancement)
- Modal closes after purchase

**Integration Points:**
- Line 177-182: `showPurchaseSuccessToast` - replace with enhanced version
- Line 154: `onSuccess?.()` callback - trigger item removal here

**No blockers identified**

### SETS-MVP-002 (Collection View)

**Status:** UAT ✅
**Validation:**
- CollectionPage exists at `/collection` route
- Route configured in router
- Page renders owned items correctly

**Integration Points:**
- Navigation target: `/collection` route

**No blockers identified**

---

## Conclusion

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Readiness Assessment:**
- ✅ All dependencies complete
- ✅ All infrastructure exists
- ✅ No blocking gaps identified
- ✅ Clear implementation path
- ✅ Appropriate MVP scope
- ✅ Low technical risk

**Effort Estimate:** 1 story point ✅ CONFIRMED
- Simple toast enhancement
- Straightforward animation integration
- Leverages existing patterns
- Minimal new code required

**Recommended Next Steps:**
1. Write detailed implementation plan
2. Create test plan (unit + integration + E2E)
3. Begin Phase 1 (toast enhancement)
4. Verify animation compatibility with drag-and-drop
5. Complete E2E test per ADR-006

---

**ANALYSIS COMPLETE**
