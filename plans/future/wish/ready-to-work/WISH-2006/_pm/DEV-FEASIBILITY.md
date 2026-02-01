# Dev Feasibility: WISH-2006 - Accessibility

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- All UI components already exist (built in WISH-2005)
- Accessibility features are additive enhancements (no breaking changes)
- React hooks pattern is well-established for keyboard/focus management
- Radix UI (via shadcn) provides built-in focus trap for modals
- Standard ARIA patterns and WCAG guidelines are well-documented
- No backend changes required (frontend-only story)
- Testing tools (axe-core, Playwright) are already integrated

---

## Likely Change Surface (Core Only)

### Areas/Packages for Core Journey

**Frontend (React) - `apps/web/app-wishlist-gallery`:**
- `src/hooks/useRovingTabIndex.ts` - NEW: 2D grid keyboard navigation
- `src/hooks/useKeyboardShortcuts.ts` - NEW: Global shortcut manager
- `src/hooks/useAnnouncer.ts` - NEW: Screen reader live region hook
- `src/utils/a11y.ts` - NEW: ARIA label generators
- `src/components/WishlistGallery/index.tsx` - MODIFY: Add roving tabindex
- `src/components/WishlistCard/index.tsx` - MODIFY: Add ARIA labels, focus styles
- `src/components/AddItemModal/index.tsx` - MODIFY: Verify focus trap
- `src/components/EditItemModal/index.tsx` - MODIFY: Verify focus trap
- `src/components/DeleteConfirmModal/index.tsx` - MODIFY: Verify focus trap
- `src/components/GotItModal/index.tsx` - MODIFY: Verify focus trap

**Testing - `apps/web/app-wishlist-gallery`:**
- `e2e/accessibility.spec.ts` - NEW: Playwright accessibility tests
- `src/hooks/__tests__/useRovingTabIndex.test.ts` - NEW: Unit tests
- `src/hooks/__tests__/useKeyboardShortcuts.test.ts` - NEW: Unit tests
- `src/hooks/__tests__/useAnnouncer.test.ts` - NEW: Unit tests

**Styling - `apps/web/app-wishlist-gallery`:**
- `src/styles/globals.css` - MODIFY: Add focus ring utilities (if not in Tailwind)
- Tailwind config - VERIFY: Focus ring colors meet WCAG AA

### Endpoints for Core Journey

**None** - This is a frontend-only story. No API changes.

### Critical Deploy Touchpoints

**None** - No infrastructure or backend changes.

**Frontend deployment:**
- Standard Next.js build and deploy (Vercel or AWS Amplify)
- No feature flags needed (accessibility is always enabled)
- No database migrations
- No environment variable changes

---

## MVP-Critical Risks (Max 5)

### Risk 1: Roving Tabindex Grid Calculation Complexity

**Why it blocks MVP:** Incorrect grid position calculations break keyboard navigation entirely.

**Details:**
- Responsive grid changes column count (3 → 2 → 1)
- Arrow Up/Down must calculate row/column positions dynamically
- Edge cases: wrapping, last row with fewer items

**Required Mitigation:**
- Comprehensive unit tests for grid calculation logic
- Use ResizeObserver to detect column count changes
- Test with 1, 2, 3, 4, 5+ column layouts
- Consider using `react-aria` GridCollection if custom implementation is too complex

**Fallback:** If grid navigation is too complex, simplify to linear navigation (Left/Right only, ignore Up/Down).

---

### Risk 2: Focus Return After Item Deletion

**Why it blocks MVP:** Deleting focused item can lose focus entirely, breaking keyboard-only flow.

**Details:**
- User focuses item 5, deletes it
- Focus must move to next item (previously item 6, now item 5)
- If last item deleted, focus must move to new last item
- If trigger element is gone, focus trap can't return focus

**Required Mitigation:**
- Store next/previous item ref before deletion
- Check if next item exists after delete, fallback to previous
- If gallery becomes empty, focus Add button
- Unit tests for all deletion scenarios

---

### Risk 3: Keyboard Shortcut Conflicts with Browser/OS

**Why it blocks MVP:** Shortcuts like Delete key may conflict with browser back button on some platforms.

**Details:**
- Delete key: May trigger browser back on Windows/Linux
- Ctrl+A: Conflicts with Select All
- Shortcuts in form inputs: Must be disabled

**Required Mitigation:**
- Only activate shortcuts when gallery container has focus (not input fields)
- Check `event.target` - if input/textarea, ignore shortcuts
- Prevent default for arrow keys (prevents page scroll)
- Document known conflicts in help text

---

### Risk 4: Screen Reader Testing Coverage

**Why it blocks MVP:** Manual screen reader testing requires specific hardware/software we may not have.

**Details:**
- VoiceOver: macOS only (may not have Mac)
- NVDA: Windows only (may not have Windows VM)
- Results vary by screen reader version

**Required Mitigation:**
- Use axe-core for automated ARIA/WCAG checks (must pass)
- Test aria-live regions programmatically (check DOM textContent)
- Document screen reader versions tested (if any)
- Consider cloud-based testing (Assistiv Labs) if budget allows
- MVP acceptance: Automated tests pass, manual testing is best-effort

---

### Risk 5: Modal Focus Trap with Dynamic Content

**Why it blocks MVP:** Modals with async content (loading states) may break focus trap.

**Details:**
- Modal opens with loading spinner (no focusable elements)
- Content loads, focusable elements appear
- Focus trap may not re-calculate focusable elements
- Radix Dialog's focus trap must handle this

**Required Mitigation:**
- Test modals with async content loading
- Verify Radix Dialog re-calculates focusable elements on content change
- If broken, manually trigger focus on first element after load
- Add loading state test to Playwright suite

---

## Missing Requirements for MVP

### 1. Responsive Grid Column Count Strategy

**Missing:** How to determine column count for responsive layouts?

**Concrete Decision PM Must Include:**
- Use CSS Grid auto-fill with min/max width?
- Or use breakpoint-based column count (3 on lg, 2 on md, 1 on sm)?
- Or use ResizeObserver to count actual rendered columns?

**Recommended:** Use CSS Grid auto-fill, detect with ResizeObserver.

```css
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
```

---

### 2. Focus Ring Color and Contrast

**Missing:** What color should focus ring be to meet WCAG AA on all backgrounds?

**Concrete Decision PM Must Include:**
- Focus ring color: `ring-sky-500` (from design system)?
- Contrast ratio verified: 4.5:1 on lightest background?
- Ring offset to avoid overlap with content: 2px?

**Recommended:** Use `ring-2 ring-sky-500 ring-offset-2`, verify contrast with axe-core.

---

### 3. Keyboard Shortcut Activation Scope

**Missing:** Should shortcuts work globally or only when gallery is focused?

**Concrete Decision PM Must Include:**
- Option A: Global (press A anywhere on page opens Add Item)
- Option B: Gallery-scoped (must Tab into gallery first, then A works)

**Recommended:** Gallery-scoped (Option B) to avoid conflicts and confusion.

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

**1. Playwright E2E Test Suite:**
- `apps/web/app-wishlist-gallery/e2e/accessibility.spec.ts`
- All tests pass (keyboard nav, shortcuts, focus trap, screen reader)
- Test artifacts: screenshots, video, axe report

**2. axe-core Accessibility Scan:**
- No violations (WCAG AA)
- Contrast checks pass
- ARIA labels present and correct
- Run in CI pipeline

**3. Unit Tests for Hooks:**
- `useRovingTabIndex.test.ts` - grid navigation logic
- `useKeyboardShortcuts.test.ts` - shortcut handlers
- `useAnnouncer.test.ts` - live region updates
- All tests pass, coverage > 80% for new code

**4. Manual Verification (Best Effort):**
- VoiceOver on macOS (if Mac available)
- NVDA on Windows (if Windows VM available)
- Document tested versions

### Critical CI/Deploy Checkpoints

**CI Checks (must pass):**
- Playwright accessibility tests pass
- axe-core scan reports zero violations
- Unit tests for hooks pass
- TypeScript compilation succeeds
- Linting passes (ESLint accessibility rules)

**Pre-Deploy Checklist:**
- Verify focus ring visible on all components
- Test keyboard navigation on staging
- Verify modals trap focus correctly
- Run manual smoke test with keyboard-only

**Post-Deploy Verification:**
- Load production app, test keyboard navigation
- Run axe-core scan on production
- Verify no console errors

---
