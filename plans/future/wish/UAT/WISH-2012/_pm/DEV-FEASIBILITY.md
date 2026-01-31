# Development Feasibility Review - WISH-2012

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Core dependencies already installed (vitest-axe ^0.1.0, @axe-core/react ^4.10.2, @axe-core/playwright)
- Existing accessibility testing patterns in apps/web/playwright (AxeBuilder integration)
- Comprehensive documentation already exists (ACCESSIBILITY.md, accessibility-requirements.md)
- Testing Library and Vitest 3.x provide stable foundation for test utilities
- This is configuration and documentation work, not complex feature development
- No infrastructure dependencies (databases, APIs, etc.)

---

## Likely Change Surface (Core Only)

### Packages Affected (Core Journey)

1. **apps/web/app-wishlist-gallery/**
   - `vitest.config.ts` - Add axe matchers to test setup
   - `src/test/setup.ts` - Import and configure vitest-axe
   - `src/test/utils/keyboard.ts` - New keyboard navigation test utility (create)
   - `docs/ACCESSIBILITY-TESTING.md` - New documentation (create)

2. **apps/web/playwright/**
   - `features/wishlist/` - New wishlist a11y feature files (create)
   - `steps/wishlist-a11y.steps.ts` - New step definitions for axe scans (create)
   - `steps/pages/wishlist.page.ts` - Update with a11y-specific selectors

3. **Root workspace**
   - No changes (dependencies already installed)

---

### Critical Deploy Touchpoints

**None** - This is testing infrastructure only. No runtime code changes.

**CI/CD Impact:**
- Add accessibility tests to smoke suite (optional for MVP)
- Ensure axe-core dependencies are in CI cache

---

## MVP-Critical Risks

### Risk 1: vitest-axe May Not Work with Vitest 3.x
**Why it blocks MVP:** If vitest-axe is incompatible with Vitest 3.x, axe integration won't work.

**Required mitigation:**
- Verify vitest-axe ^0.1.0 compatibility with Vitest 3.2.4 (current version)
- Test `toHaveNoViolations()` matcher in a sample component test
- If incompatible, find alternative: use @axe-core/react directly with custom matcher

**Verification:** Run sample test with vitest-axe in apps/web/app-wishlist-gallery before starting work.

---

### Risk 2: Keyboard Event Simulation May Not Work in JSDOM
**Why it blocks MVP:** If keyboard events can't be simulated in Vitest tests, keyboard navigation utility is unusable.

**Required mitigation:**
- Use Testing Library's `userEvent.keyboard()` API (well-tested, maintained)
- Fall back to Playwright for complex keyboard flows
- Document limitations of JSDOM keyboard testing (e.g., no real focus ring, limited Tab behavior)

**Verification:** Test `userEvent.tab()` and `userEvent.keyboard('{Enter}')` in sample component test.

---

### Risk 3: Playwright axe Integration Already Exists Elsewhere
**Why it blocks MVP:** May create conflicting patterns if uploader a11y tests use different approach.

**Required mitigation:**
- Review `apps/web/playwright/steps/uploader-a11y.steps.ts` and `ACCESSIBILITY.md`
- Reuse existing AxeBuilder patterns (don't reinvent)
- Ensure wishlist tests follow same structure as uploader tests

**Verification:** Read existing uploader a11y tests before creating wishlist tests.

---

## Missing Requirements for MVP

### Requirement 1: Define "Pass" Criteria for axe Scans
**Concrete decision needed:**
> "Accessibility tests MUST have zero critical/serious violations. Moderate/minor violations are warnings only (do not fail tests)."

**Why needed:** Without clear pass/fail criteria, tests will be ambiguous. Developers won't know if violations are acceptable.

**PM must include in story:**
- Violation severity levels that fail tests: `critical`, `serious`
- Violation severity levels that warn only: `moderate`, `minor`
- Process for addressing warnings (e.g., track in backlog, address in WISH-2006)

---

### Requirement 2: Scope of Keyboard Navigation Test Utility
**Concrete decision needed:**
> "Keyboard utility MUST support: Tab, Shift+Tab, Enter, Space, Escape, Arrow keys (Up/Down/Left/Right). It does NOT need to support: Home, End, PageUp, PageDown (add in future if needed)."

**Why needed:** Keyboard APIs are complex. Scoping to essential keys keeps utility simple and testable.

**PM must include in story:**
- List of required keyboard actions (Tab, Enter, Escape, Arrows)
- Out of scope: Complex shortcuts (Ctrl+S, Alt+Tab, etc.)
- Out of scope: Roving tabindex helpers (defer to WISH-2006)

---

### Requirement 3: Manual Screen Reader Testing is Required
**Concrete decision needed:**
> "Screen reader testing guide is documentation only. Automated screen reader testing (e.g., with Orca, NVDA API) is out of scope for WISH-2012."

**Why needed:** Automated screen reader testing is complex and often unreliable. Manual testing with guide is sufficient for MVP.

**PM must include in story:**
- Guide provides step-by-step VoiceOver/NVDA instructions
- Guide includes example announcements for WishlistCard, GotItModal, etc.
- Automated screen reader testing deferred to future story

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **vitest-axe Integration Works**
   - Evidence: Sample component test with `toHaveNoViolations()` passes
   - File: `apps/web/app-wishlist-gallery/src/components/__tests__/SampleA11y.test.tsx`
   - Command: `pnpm --filter @repo/app-wishlist-gallery test SampleA11y`

2. **Keyboard Utility Works**
   - Evidence: Test navigates form fields with Tab and activates button with Enter
   - File: `apps/web/app-wishlist-gallery/src/test/utils/__tests__/keyboard.test.tsx`
   - Command: `pnpm --filter @repo/app-wishlist-gallery test keyboard`

3. **Playwright axe Scan Works**
   - Evidence: E2E test scans wishlist page and reports violations
   - File: `apps/web/playwright/features/wishlist/wishlist-a11y.feature`
   - Command: `pnpm --filter @repo/playwright test:bdd:wishlist:a11y`

4. **Screen Reader Guide is Usable**
   - Evidence: Guide reviewed by PM, includes all required sections
   - File: `apps/web/app-wishlist-gallery/docs/ACCESSIBILITY-TESTING.md`
   - Manual review: Check for VoiceOver commands, NVDA setup, wishlist-specific examples

---

### Critical CI/Deploy Checkpoints

**None for MVP** - Tests run locally. CI integration is optional (recommended but not blocking).

**Post-MVP:** Add 1 axe test to smoke suite to catch regressions.

---

## Future Risks (Non-MVP)

See `FUTURE-RISKS.md` for non-blocking concerns.

---

## Summary

WISH-2012 is **highly feasible** for MVP. All core dependencies are already installed, and existing patterns can be reused from uploader a11y tests. The main work is:

1. Configure vitest-axe in app-wishlist-gallery
2. Create simple keyboard navigation utility (or use Testing Library's userEvent)
3. Write example tests for vitest and Playwright
4. Document screen reader testing process

**Estimated effort:** 2-3 points (Small-Medium story)

**Recommended approach:**
- Start with vitest-axe setup (1 hour)
- Add keyboard utility (2 hours)
- Write example tests (3 hours)
- Create screen reader guide (2 hours)
- Total: ~1 day of work for experienced developer
