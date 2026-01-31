# Test Plan - WISH-2012: Accessibility Testing Harness Setup

## Scope Summary

**Endpoints touched:** None - this is testing infrastructure only

**UI touched:** No - test utilities and configuration only

**Data/storage touched:** No

**Packages affected:**
- Root `package.json` - dependency verification
- `apps/web/app-wishlist-gallery/vitest.config.ts` - axe integration
- `apps/web/app-wishlist-gallery/src/test/` - test utilities
- `apps/web/playwright/` - E2E axe configuration
- Documentation files

---

## Happy Path Tests

### Test 1: Verify axe-core Dependencies Installed

**Setup:**
- Clean install: `pnpm install`

**Action:**
- Check `package.json` for `vitest-axe` and `@axe-core/react`
- Check `apps/web/playwright/package.json` for `@axe-core/playwright`
- Run `pnpm list vitest-axe @axe-core/react @axe-core/playwright`

**Expected outcome:**
- All three packages present in dependency tree
- No version conflicts
- Versions are compatible (vitest-axe ^0.1.0, @axe-core/react ^4.10.2, @axe-core/playwright latest)

**Evidence:**
- `pnpm list` output showing installed versions
- No peer dependency warnings in install logs

---

### Test 2: Vitest axe Integration Works

**Setup:**
- Create a simple test component with an accessibility violation (e.g., image without alt text)
- Write a Vitest test using `toHaveNoViolations()` matcher

**Action:**
- Run `pnpm --filter @repo/app-wishlist-gallery test`
- Verify axe scan detects the violation

**Expected outcome:**
- Test fails with clear axe violation report
- Violation includes rule ID, impact level, and affected elements
- Error message is actionable

**Evidence:**
- Test output showing axe violation details
- Rule ID (e.g., "image-alt")
- Impact level (e.g., "critical")
- HTML snippet of violating element

---

### Test 3: Keyboard Navigation Test Utility Works

**Setup:**
- Create keyboard navigation test utility in `src/test/utils/keyboard.ts`
- Write a test using the utility to simulate Tab, Arrow, and Enter keys

**Action:**
- Use utility in a component test (e.g., WishlistCard keyboard navigation)
- Verify focus moves correctly between interactive elements

**Expected outcome:**
- Utility simulates keyboard events correctly
- Focus state is trackable in tests
- Tab order is verifiable

**Evidence:**
- Test passes showing correct focus order
- Console logs showing focus events (if debugging enabled)
- Assertions on `document.activeElement` pass

---

### Test 4: Playwright axe Scan Runs

**Setup:**
- Create E2E test in `apps/web/playwright/` using AxeBuilder
- Target wishlist gallery page

**Action:**
- Run `pnpm --filter @repo/playwright test:a11y`
- Verify axe scan runs on rendered page

**Expected outcome:**
- Axe scan completes without errors
- Violations (if any) are reported with details
- Test can filter by WCAG tags (wcag2a, wcag2aa, wcag21aa)

**Evidence:**
- Playwright test report showing axe results
- JSON output with violations array
- Tagged violations grouped by impact

---

### Test 5: Screen Reader Testing Guide is Accessible

**Setup:**
- Create `SCREEN-READER-TESTING.md` in `apps/web/app-wishlist-gallery/docs/`

**Action:**
- Review guide for clarity and completeness
- Verify it includes: VoiceOver commands, NVDA setup, testing checklist

**Expected outcome:**
- Guide is comprehensive and actionable
- Includes platform-specific instructions (macOS, Windows)
- Has example announcements for wishlist components

**Evidence:**
- Markdown file exists and is well-formatted
- Contains all required sections
- Examples are relevant to wishlist feature

---

## Error Cases

### Error 1: Missing axe-core Dependency

**Setup:**
- Remove `vitest-axe` from `package.json`

**Action:**
- Import `toHaveNoViolations` in a test
- Run test suite

**Expected:**
- Clear error message: "Cannot find module 'vitest-axe'"
- Build fails at import time (not runtime)

**Evidence:**
- Error message in test output
- Exit code 1

---

### Error 2: Invalid axe Configuration

**Setup:**
- Configure AxeBuilder with invalid WCAG tag (e.g., `wcag99z`)

**Action:**
- Run Playwright axe test

**Expected:**
- Axe warns about unknown tag or ignores it gracefully
- Test still runs (doesn't crash)

**Evidence:**
- Warning in console output
- Test completes (pass or fail on violations)

---

### Error 3: Keyboard Utility Used on Non-Interactive Element

**Setup:**
- Use keyboard navigation utility on a `<div>` without tabindex

**Action:**
- Attempt to focus the element and press Enter

**Expected:**
- Element is not focusable (as expected)
- Test assertion fails with clear message
- No JavaScript errors thrown

**Evidence:**
- Assertion error: "Expected element to be focusable"
- No uncaught exceptions

---

## Edge Cases (Reasonable)

### Edge 1: Testing Component with Dynamic ARIA Attributes

**Setup:**
- Create component that changes `aria-live` region content dynamically
- Write test to verify announcements

**Action:**
- Trigger state change that updates live region
- Use test utility to assert announcement was made

**Expected:**
- Live region content is updated
- Utility can detect change (via MutationObserver or polling)

**Evidence:**
- Test passes showing live region content changed
- Assertion on `aria-live` element's textContent

---

### Edge 2: Testing Large Page with Many Violations

**Setup:**
- Create test page with 50+ accessibility violations (stress test)

**Action:**
- Run axe scan with default configuration

**Expected:**
- Axe completes scan (may take longer)
- All violations are reported (no truncation)
- Performance is acceptable (<5 seconds for scan)

**Evidence:**
- Test output showing all violations
- Timing logs showing scan duration
- Memory usage within limits

---

### Edge 3: Conflicting ARIA Attributes

**Setup:**
- Create component with conflicting ARIA (e.g., `role="button"` but `aria-disabled="true"` and still clickable)

**Action:**
- Run axe scan

**Expected:**
- Axe detects conflicting attributes as violation
- Rule ID indicates ARIA conflict
- Impact level is "serious" or higher

**Evidence:**
- Violation report showing conflict rule
- Recommended fix in violation message

---

## Required Tooling Evidence

### Backend
**Not applicable** - this story is frontend testing infrastructure only.

---

### Frontend

#### Vitest Tests

**Required runs:**
1. Component test with `toHaveNoViolations()` matcher
   - Example: `WishlistCard.a11y.test.tsx`
   - Assert: No critical/serious violations
   - Artifact: Test output showing "0 violations"

2. Keyboard navigation test using utility
   - Example: `WishlistCard.keyboard.test.tsx`
   - Assert: Tab order is correct, Enter activates button
   - Artifact: Test output with passing assertions

3. Form validation accessibility test
   - Example: `WishlistForm.a11y.test.tsx`
   - Assert: Error messages linked to inputs via `aria-describedby`
   - Artifact: Test output showing correct ARIA associations

**Required test file structure:**
```
apps/web/app-wishlist-gallery/src/components/
  WishlistCard/
    __tests__/
      WishlistCard.a11y.test.tsx     # axe-core tests
      WishlistCard.keyboard.test.tsx # keyboard nav tests
```

---

#### Playwright E2E Tests

**Required runs:**
1. Full page axe scan
   - File: `apps/web/playwright/features/wishlist/wishlist-a11y.feature`
   - Assert: Zero critical/serious violations on gallery page
   - Artifact: HTML report with axe results

2. Keyboard navigation flow
   - File: `apps/web/playwright/steps/wishlist-keyboard.steps.ts`
   - Assert: Can navigate entire wishlist flow with keyboard only
   - Artifact: Video recording of keyboard-only navigation

3. Focus management test
   - Test: Modal open → focus trapped → Escape → focus returns
   - Assert: Focus is on trigger button after modal closes
   - Artifact: Trace file showing focus events

**Playwright assertions needed:**
```typescript
// Example from test file
const accessibilityScanResults = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
  .analyze()

const violations = accessibilityScanResults.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
)

expect(violations).toHaveLength(0)
```

---

## Risks to Call Out

### Risk 1: axe-core May Not Catch All Issues
**Description:** Automated tools like axe-core catch ~30-40% of accessibility issues. Manual testing with screen readers is still required.

**Mitigation:** Provide comprehensive screen reader testing guide with specific test cases for wishlist feature.

---

### Risk 2: Keyboard Navigation Tests May Be Flaky
**Description:** Focus management and keyboard event simulation in JSDOM can be unreliable.

**Mitigation:**
- Use Playwright for critical keyboard nav tests (real browser)
- Keep Vitest keyboard tests simple (single component focus)
- Document known limitations of JSDOM keyboard testing

---

### Risk 3: WCAG AA Compliance is a Moving Target
**Description:** WCAG 2.2 introduces new criteria. Current setup targets WCAG 2.1 AA.

**Mitigation:**
- Use `wcag21aa` tag explicitly in axe config
- Document WCAG version in test files
- Plan to upgrade to WCAG 2.2 in future story

---

### Risk 4: Test Utilities May Become Stale
**Description:** Custom keyboard nav utilities may not keep pace with framework updates (React 19, Vitest 3.x).

**Mitigation:**
- Use Testing Library's `userEvent` API where possible (maintained)
- Keep custom utilities minimal and well-documented
- Add integration tests for test utilities themselves

---

## Test Coverage Expectations

### Vitest Component Tests
- **Minimum:** 10 a11y tests (2 per major component: WishlistCard, WishlistForm, GotItModal, DeleteConfirmModal, FilterPanel)
- **Focus areas:** Form labels, button semantics, ARIA attributes, color contrast (manual review)

### Playwright E2E Tests
- **Minimum:** 3 E2E a11y tests (gallery page, add item flow, got it flow)
- **Focus areas:** Full page scans, keyboard navigation flows, focus management

### Screen Reader Testing (Manual)
- **Minimum:** 5 manual test cases documented in guide
- **Focus areas:** Card announcements, form errors, modal interactions, state changes, live regions

---

## Definition of Done for Test Infrastructure

- [ ] `vitest-axe` integrated in app-wishlist-gallery Vitest config
- [ ] `toHaveNoViolations()` matcher works in component tests
- [ ] Keyboard navigation test utility exists in `src/test/utils/keyboard.ts`
- [ ] Playwright axe integration works with AxeBuilder
- [ ] Screen reader testing guide exists with VoiceOver/NVDA instructions
- [ ] At least 1 example test passes for each category (axe, keyboard, E2E)
- [ ] Documentation added to `apps/web/app-wishlist-gallery/README.md`
- [ ] CI runs accessibility tests (smoke suite includes 1 axe test)
