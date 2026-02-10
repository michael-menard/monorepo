---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: SETS-MVP-0320

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No active baseline reality file found. Seed generated from codebase scanning and story context only.

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Toast notification system | Exists | `@repo/app-component-library/src/hooks/useToast.ts`, `toast-utils.tsx` | Uses Sonner v2.0.7 with custom toast component |
| GotItModal | Exists | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | Purchase flow modal (WISH-2042, SETS-MVP-0310) |
| CollectionPage | Exists | `apps/web/app-wishlist-gallery/src/pages/CollectionPage/index.tsx` | Collection view at /collection route (SETS-MVP-002) |
| Framer Motion | Exists | Used in BuildStatusToggle, WishlistDragPreview | exit animations with AnimatePresence |
| TanStack Router | Exists | `main-page.tsx` uses `useNavigate`, `Link` | Navigation infrastructure ready |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| SETS-MVP-0310 | backlog (dependency) | High | This story depends on 0310 being complete. GotItModal exists with basic toast. |
| SETS-MVP-0330 | backlog | Medium | Undo Support (adds "Undo" button to same toast) - sequential dependency |
| SETS-MVP-0340 | backlog | Low | Form Validation (different concern) |

### Constraints to Respect

1. **Dependency on SETS-MVP-0310**: The status update flow must be complete before this story can be implemented
2. **Toast System Architecture**: Must use existing `useToast` hook and `toast-utils` from `@repo/app-component-library`
3. **Collection Route Availability**: /collection route exists but may not be fully implemented (SETS-MVP-002)
4. **Animation Standards**: Use Framer Motion with AnimatePresence for exit animations (CLAUDE.md requirement)
5. **Import Rules**: Always use `@repo/app-component-library` for UI components (CLAUDE.md)

---

## Retrieved Context

### Related Endpoints

**Existing:**
- `PATCH /api/v2/wishlist/items/:id` - Updates item purchase status (SETS-MVP-0310)
- `GET /api/v2/wishlist/items?status=owned` - Fetches owned items for collection view

**Not Found:**
- No specific endpoint needed - this story uses existing endpoints

### Related Components

**Toast System:**
- `@repo/app-component-library/src/hooks/useToast.ts` - Hook with success/error/warning/info methods
- `@repo/app-component-library/src/notifications/toast-utils.tsx` - CustomToast component with progress bar, hover pause, icons

**Purchase Flow:**
- `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` - Purchase modal (lines 177-182 show basic success toast)

**Collection View:**
- `apps/web/app-wishlist-gallery/src/pages/CollectionPage/index.tsx` - Renders at /collection with status='owned' filter

**Animation Examples:**
- `apps/web/app-wishlist-gallery/src/components/BuildStatusToggle/index.tsx` - Uses AnimatePresence with exit={{ scale: 0, opacity: 0 }}
- `apps/web/app-wishlist-gallery/src/components/WishlistDragPreview/WishlistDragPreviewContent.tsx` - Uses exit={{ opacity: 0 }}

### Reuse Candidates

**High Confidence:**
1. `useToast()` hook - Already available with success() method
2. Framer Motion + AnimatePresence - Already used in multiple components
3. TanStack Router `useNavigate()` - Already used in main-page.tsx
4. CustomToast component - Supports title/description/duration

**Medium Confidence:**
1. Sonner action buttons - Need to verify if Sonner v2.0.7 supports action prop (not currently used in codebase)

**Low Confidence:**
1. Existing item removal animation - May need custom implementation for list items

---

## Knowledge Context

### Lessons Learned

**Warning:** No knowledge base search was performed. Operating without lessons learned from past stories.

### Blockers to Avoid

Based on ADRs and codebase analysis:
- API path mismatch between frontend/backend (ADR-001 addresses this)
- Missing toast component (already exists in @repo/app-component-library)
- Collection route not existing (route exists, confirmed in CollectionPage)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain}. Already handled by existing API client. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. E2E tests required in dev phase. |
| ADR-006 | E2E Tests Required in Dev Phase | Minimum one happy-path E2E test per story during dev implementation. |

### Patterns to Follow

**From CLAUDE.md:**
- Use Zod schemas for all types (never interfaces)
- Import from `@repo/app-component-library` (never individual paths)
- Use Framer Motion for animations
- Component directory structure: `ComponentName/index.tsx`, `__tests__/`, `__types__/`

**From existing toast implementation:**
- Toast utilities provide consistent UX (progress bar, hover pause, icons)
- Success toasts use green color scheme with CheckCircle icon
- Default duration is 5000ms (5 seconds)

### Patterns to Avoid

**From CLAUDE.md:**
- Don't use console.log (use `@repo/logger`)
- Don't create barrel files
- Don't skip type errors
- Don't use TypeScript interfaces without Zod

---

## Conflict Analysis

**No conflicts detected.**

All dependencies are isolated to the success toast enhancement and item removal animation. No overlap with protected features or active work.

---

## Story Seed

### Title
SETS-MVP-0320: Purchase UX Polish

### Description

**Context:**
After SETS-MVP-0310 implements the basic purchase flow, users need clear feedback that their purchase action was successful and guidance on where to find their newly owned item. The current implementation (GotItModal line 177-182) shows a simple success toast with just the item title. This story enhances that toast with a "View in Collection" link and adds a smooth visual transition when items are removed from the wishlist view after purchase.

**Problem:**
1. Success feedback lacks actionable next step (where did my purchased item go?)
2. Item remains visible in wishlist view after purchase (no visual feedback)
3. Abrupt removal of item can be jarring without animation

**Solution:**
Enhance the success toast with a navigation link to /collection and add a Framer Motion exit animation for purchased items. The toast will provide positive reinforcement and clear navigation, while the animation provides smooth visual feedback that the item has transitioned to owned status.

### Initial Acceptance Criteria

- [ ] AC11: Success toast appears after purchase with message "Added to your collection!"
- [ ] AC12: Toast includes "View in Collection" link that navigates to /collection route
- [ ] AC13: Item is removed from wishlist view after successful purchase (may require refetch or cache invalidation)
- [ ] AC14: If user is on wishlist page, item animates out with Framer Motion exit animation (fade + height collapse)

### Non-Goals

- Undo functionality (covered in SETS-MVP-0330)
- Form validation (covered in SETS-MVP-0340)
- Complex animation sequences or staggered animations
- Collection view implementation (dependency on SETS-MVP-002 - already exists)
- Toast action buttons for any purpose other than navigation (Undo is SETS-MVP-0330)

### Reuse Plan

**Components:**
- `useToast()` from `@repo/app-component-library` - Success toast with title/description
- `CustomToast` component - Already supports title, description, duration, onClose
- `useNavigate()` from `@tanstack/react-router` - Navigation to /collection
- Framer Motion `motion.div` + `AnimatePresence` - Exit animations

**Patterns:**
- Exit animation pattern from BuildStatusToggle: `exit={{ scale: 0, opacity: 0 }}, transition={{ duration: 0.3 }}`
- Toast pattern from GotItModal: `toast.success(title, { description, duration: 5000 })`

**Packages:**
- Sonner v2.0.7 (already installed) - May need to verify action button support
- Framer Motion 12.23.24 (already installed)
- TanStack Router (already installed)

**Investigation Required:**
- Verify Sonner v2.0.7 supports action buttons (not currently used in codebase)
- If Sonner doesn't support actions, need custom toast implementation or upgrade

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Context:**
- GotItModal already has tests at `src/components/GotItModal/__tests__/`
- Toast utilities have tests at `@repo/app-component-library/src/__tests__/toast-utils.test.tsx`
- CollectionPage has tests at `src/pages/CollectionPage/__tests__/CollectionPage.test.tsx`

**Considerations:**
- Unit tests should verify toast content and navigation behavior
- E2E tests (per ADR-006) must verify real toast appears and navigation works
- Animation testing may require `waitFor` or `findBy` queries to handle exit timing
- Consider testing both "click link" and "toast auto-dismiss" scenarios

### For UI/UX Advisor

**Context:**
- Existing toast system uses LEGO-inspired theme (green for success)
- CollectionPage already exists with similar card layout to wishlist
- Current toast has 5-second default duration with hover pause

**Considerations:**
- "View in Collection" link should be visually distinct (button or link styling?)
- Animation duration (0.3s suggested) should feel responsive but not jarring
- Toast should remain long enough for user to read message and decide to click link
- Consider mobile/touch UX - link target size should be adequate
- Accessibility: Link should be keyboard accessible and announced by screen readers

### For Dev Feasibility

**Context:**
- Sonner v2.0.7 may not support action buttons natively
- May need custom toast implementation or Sonner upgrade
- Animation requires wrapping gallery items in AnimatePresence

**Considerations:**
1. **Toast Action Investigation**: Check if Sonner v2.0.7 supports action prop. If not:
   - Option A: Extend CustomToast to accept action button prop
   - Option B: Upgrade Sonner to latest version (verify breaking changes)

2. **Item Removal**: After purchase, how to trigger item removal?
   - Option A: RTK Query cache invalidation (refetch wishlist)
   - Option B: Optimistic update in cache
   - Option C: Listen to purchase mutation success and filter item locally

3. **Animation Timing**: Exit animation before or after API response?
   - Option A: Animate on API success (may have delay)
   - Option B: Optimistic animation with rollback on error

4. **Collection Route**: Verify /collection route is properly configured in router
   - Check if route registration exists
   - Verify route is accessible without auth issues

**Risk Areas:**
- If CollectionPage (SETS-MVP-002) is not fully implemented, link may navigate to broken page
- Animation may conflict with drag-and-drop functionality if active
- Toast action button may require custom implementation if Sonner doesn't support it

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning:**
- No baseline reality file found. Seed generated from codebase scanning only. May be missing context about in-progress work or recently changed constraints.
