# BUGF-020: Future Enhancement Opportunities

**Story:** Fix Accessibility Issues and Improve A11y Test Coverage
**Date:** 2026-02-11
**Status:** Non-blocking enhancements logged

---

## Overview

During elaboration of BUGF-020, several enhancement opportunities were identified that are **not blocking MVP** but could improve the codebase in future iterations. These are logged here for future story creation.

---

## Enhancement 1: Implement KeyboardSensor for Drag-and-Drop

**Current State:**
- Drag-and-drop uses PointerSensor and TouchSensor only
- Keyboard users can navigate via roving tabindex (arrow keys) but cannot drag-and-drop
- Screen reader instructions correctly state "Drag to reorder. Use arrow keys to navigate between items."

**Enhancement:**
Add KeyboardSensor from @dnd-kit/core to enable keyboard drag-and-drop using Space key pattern:
1. Focus on item
2. Press Space to start dragging
3. Use arrow keys to move item
4. Press Space to drop, Escape to cancel

**Benefits:**
- Full keyboard accessibility for drag-and-drop
- Matches WAI-ARIA drag-and-drop pattern
- Improves user experience for keyboard-only users

**Complexity:**
- Medium: Requires careful integration with existing useRovingTabIndex
- Must avoid key binding conflicts (arrow keys used for both navigation and drag)
- State management for "dragging" vs "navigating" modes

**Estimated Effort:** 3-5 points

**Related:**
- BUGF-020 AC1 (fixes misleading instructions about keyboard drag)
- `@repo/accessibility` has `useKeyboardDragAndDrop` hook (not currently used)
- `DraggableWishlistGallery/index.tsx:417-418` comment: "Removed KeyboardSensor to avoid conflict with useRovingTabIndex"

**Tags:** accessibility, keyboard-navigation, drag-and-drop, ux-enhancement

---

## Enhancement 2: Visual Regression Tests for Focus States

**Current State:**
- AC8 verifies focus visible compliance via audit and code checks
- No automated visual regression tests for focus indicators

**Enhancement:**
Add visual regression tests using Playwright + Percy/Chromatic to capture focus states:
1. Take screenshots of interactive elements in focused state
2. Verify focus ring meets WCAG 2.4.7 criteria (2px outline, 3:1 contrast)
3. Catch regressions when Tailwind classes change

**Benefits:**
- Automated visual verification of focus indicators
- Catches CSS regressions before production
- Documents expected focus appearance

**Complexity:**
- Medium: Requires visual testing infrastructure setup
- Playwright already used for E2E tests
- Need Percy/Chromatic account or similar tool

**Estimated Effort:** 3-5 points

**Related:**
- BUGF-020 AC8 (focus visible compliance)
- BUGF-030 (comprehensive E2E test suite)
- `@repo/accessibility` focusRingClasses utility

**Tags:** accessibility, visual-regression, testing, focus-management

---

## Enhancement 3: Chart/Visualization Alternative Text Strategy

**Current State:**
- AC7 tests dashboard charts/visualizations for ARIA attributes
- No comprehensive strategy for chart alt text and data table fallbacks

**Enhancement:**
Create accessibility strategy for data visualizations:
1. Audit all chart components (bar, line, pie, etc.)
2. Add `aria-label` with summary of chart data
3. Provide data table fallback for complex charts
4. Document patterns in accessibility guide

**Example:**
```tsx
<BarChart aria-label="User signups by month. January: 120, February: 145, March: 132">
  {/* chart SVG */}
</BarChart>

<details>
  <summary>View data table</summary>
  <table>
    <caption>User signups by month</caption>
    {/* table rows */}
  </table>
</details>
```

**Benefits:**
- Screen reader users can understand chart data
- Meets WCAG 1.1.1 (Non-text Content)
- Provides multiple ways to consume data

**Complexity:**
- Medium: Requires designing alt text templates for each chart type
- Must balance brevity with informativeness
- Consider long description pattern for complex visualizations

**Estimated Effort:** 2-3 points

**Related:**
- BUGF-020 AC7 (dashboard a11y tests)
- BUGF-020 Non-Goals (deferred chart alt text)
- `apps/web/app-dashboard` components

**Tags:** accessibility, data-visualization, charts, wcag-compliance

---

## Enhancement 4: Comprehensive Accessibility Audit with Real Users

**Current State:**
- BUGF-020 adds automated tests (axe-core, ARIA validation)
- Manual testing checklist for screen readers and keyboard
- No testing with real assistive technology users

**Enhancement:**
Conduct comprehensive accessibility audit with real users:
1. Recruit users with disabilities (screen reader, keyboard-only, voice control)
2. Observe them completing key user journeys
3. Document pain points and unexpected behaviors
4. Prioritize fixes based on impact

**Benefits:**
- Uncover issues automated tests miss
- Validate real-world user experience
- Build empathy for accessibility concerns
- Discover edge cases

**Complexity:**
- High: Requires budget, recruiting, scheduling, ethical review
- May uncover significant issues requiring refactoring
- Ongoing process, not one-time audit

**Estimated Effort:** 8-13 points (multi-sprint effort)

**Related:**
- BUGF-020 Non-Goals (deferred comprehensive audit)
- Manual testing checklist (lines 579-594)

**Tags:** accessibility, user-research, usability-testing, wcag-compliance

---

## Enhancement 5: Accessibility Monitoring and Alerting

**Current State:**
- BUGF-020 adds a11y tests to CI/CD pipeline
- Tests run on every PR, block merge on failure
- No production monitoring for a11y issues

**Enhancement:**
Add accessibility monitoring to production:
1. Integrate axe-core in production (sample % of page loads)
2. Report violations to error tracking (Sentry, Datadog)
3. Dashboard showing a11y health over time
4. Alerts on new violation types

**Benefits:**
- Catch a11y regressions in production
- Monitor impact of third-party scripts
- Track a11y improvement trends

**Complexity:**
- Medium: Requires error tracking integration
- Performance impact must be minimized (sampling)
- May generate noise (false positives)

**Estimated Effort:** 2-3 points

**Related:**
- BUGF-020 AC4-AC7 (axe-core integration in tests)
- CI/CD pipeline (automated testing)

**Tags:** accessibility, monitoring, production, observability

---

## Enhancement 6: Accessibility Documentation Hub

**Current State:**
- AC8 creates `docs/accessibility/focus-management.md`
- Accessibility patterns documented in component comments
- No centralized accessibility documentation

**Enhancement:**
Create comprehensive accessibility documentation hub:
1. `/docs/accessibility/README.md` - Overview and philosophy
2. `/docs/accessibility/patterns.md` - ARIA patterns, focus management, keyboard nav
3. `/docs/accessibility/testing.md` - How to test with screen readers, axe-core
4. `/docs/accessibility/checklist.md` - Checklist for new components
5. `/docs/accessibility/resources.md` - Links to WCAG, WAI-ARIA, tools

**Benefits:**
- Onboarding resource for new developers
- Reference for existing team
- Demonstrates accessibility commitment to stakeholders

**Complexity:**
- Low: Consolidate existing knowledge into docs
- Ongoing maintenance as patterns evolve

**Estimated Effort:** 2-3 points

**Related:**
- BUGF-020 AC8 (focus-management.md documentation)
- UI/UX Notes section (lines 596-710)
- Accessibility Checklist (lines 636-649)

**Tags:** documentation, accessibility, onboarding, knowledge-sharing

---

## Enhancement 7: ARIA Live Region Consistency Audit

**Current State:**
- `useAnnouncer` hook used in drag-and-drop components
- Live regions use `aria-live="polite"` for most announcements
- No audit of live region timing and priority consistency

**Enhancement:**
Audit all aria-live usage for consistency:
1. Map all live regions across apps
2. Categorize by priority (polite vs assertive)
3. Verify timing (immediate vs debounced)
4. Document when to use each priority
5. Standardize announcement patterns

**Example Patterns:**
- Assertive: Form errors, critical alerts
- Polite: Status updates, drag-and-drop feedback, toast notifications
- Off: Static content, duplicate information

**Benefits:**
- Consistent screen reader experience
- Reduces announcement fatigue
- Clear guidelines for developers

**Complexity:**
- Low: Audit existing usage, document patterns
- No code changes unless inconsistencies found

**Estimated Effort:** 1-2 points

**Related:**
- BUGF-020 AC4-AC7 (live region testing)
- `@repo/accessibility` useAnnouncer hook
- ARIA Patterns section (lines 333-356)

**Tags:** accessibility, screen-reader, aria-live, consistency

---

## Enhancement 8: Keyboard Shortcut Help Modal

**Current State:**
- Keyboard shortcuts exist (arrow keys, Enter, Escape, Delete)
- Shortcuts announced via `aria-describedby` on individual components
- No centralized documentation of shortcuts

**Enhancement:**
Create keyboard shortcut help modal:
1. Modal triggered by `?` key (standard pattern)
2. List all keyboard shortcuts by section (navigation, actions, editing)
3. Platform-specific shortcuts (Cmd vs Ctrl)
4. Searchable/filterable list

**Example:**
```
Navigation:
- Arrow keys: Navigate between items
- Tab: Move between sections
- Escape: Close modals

Actions:
- Enter: Select/activate
- Space: Toggle/activate
- Delete: Remove item

Editing:
- Cmd/Ctrl + S: Save
- Cmd/Ctrl + Z: Undo
```

**Benefits:**
- Keyboard users can discover shortcuts
- Reduces need for mouse
- Improves power user experience

**Complexity:**
- Medium: Requires modal component, shortcut registry
- Must avoid conflicts with browser shortcuts

**Estimated Effort:** 2-3 points

**Related:**
- BUGF-020 UI/UX Notes (keyboard shortcuts section)
- `@repo/gallery` useKeyboardShortcuts hook
- Keyboard Shortcuts section (lines 619-627)

**Tags:** accessibility, keyboard-navigation, ux-enhancement, documentation

---

## Enhancement 9: Focus Trap Testing Utilities

**Current State:**
- Modals have focus trap (per CLAUDE.md)
- No automated tests for focus trap behavior
- Manual testing only

**Enhancement:**
Add focus trap testing utilities to `@repo/accessibility-testing`:
1. `expectFocusTrapped(modal)` - Verify focus cannot escape
2. `expectFocusRestored(element)` - Verify focus returns after modal close
3. `testFocusSequence(container)` - Verify tab order within trap

**Example:**
```typescript
import { expectFocusTrapped, expectFocusRestored } from '@repo/accessibility/testing'

it('should trap focus in modal', () => {
  render(<Modal open={true} />)
  const modal = screen.getByRole('dialog')
  expectFocusTrapped(modal)
})

it('should restore focus on close', () => {
  const button = screen.getByRole('button', { name: 'Open' })
  button.click()
  const closeButton = screen.getByRole('button', { name: 'Close' })
  closeButton.click()
  expectFocusRestored(button)
})
```

**Benefits:**
- Automated verification of focus trap behavior
- Catches regressions in modal focus management
- Reusable across all apps

**Complexity:**
- Medium: Requires understanding of focus trap implementation
- Must handle various focus trap libraries

**Estimated Effort:** 2-3 points

**Related:**
- BUGF-020 AC3 (promote test utilities)
- Focus Management section (lines 351-357)
- Modal primitives in `@repo/app-component-library`

**Tags:** accessibility, testing, focus-management, test-utilities

---

## Enhancement 10: WCAG 2.2 Compliance Upgrade

**Current State:**
- BUGF-020 targets WCAG 2.1 AA compliance
- WCAG 2.2 was published in October 2023 with new criteria

**Enhancement:**
Upgrade to WCAG 2.2 AA compliance:
1. Audit against new WCAG 2.2 criteria:
   - 2.4.11 Focus Not Obscured (Minimum) - AA
   - 2.4.12 Focus Not Obscured (Enhanced) - AAA
   - 2.5.7 Dragging Movements - AA
   - 2.5.8 Target Size (Minimum) - AA
   - 3.2.6 Consistent Help - A
   - 3.3.7 Redundant Entry - A
   - 3.3.8 Accessible Authentication (Minimum) - AA
2. Implement fixes for any failures
3. Update axe-core config to test WCAG 2.2
4. Document WCAG 2.2 patterns

**Benefits:**
- Future-proof accessibility compliance
- Better user experience (new criteria address real pain points)
- Competitive advantage

**Complexity:**
- Medium: Most criteria are incremental improvements
- 2.5.8 (Target Size) may require design changes
- 2.5.7 (Dragging Movements) highly relevant to BUGF-020

**Estimated Effort:** 5-8 points

**Related:**
- BUGF-020 Goal (WCAG 2.1 AA compliance)
- Enhancement 1 (KeyboardSensor for drag-and-drop) addresses 2.5.7
- Color Contrast section (lines 629-634)

**Tags:** accessibility, wcag-compliance, standards, future-proof

---

## Summary

**Total Enhancements:** 10

**By Category:**
- Keyboard Navigation: 2 (KeyboardSensor, shortcut help)
- Testing: 3 (visual regression, focus trap, monitoring)
- Documentation: 2 (hub, patterns)
- User Research: 1 (comprehensive audit)
- Standards Compliance: 2 (WCAG 2.2, chart alt text)

**By Effort:**
- Small (1-3 points): 7 enhancements
- Medium (3-5 points): 2 enhancements
- Large (5-13 points): 1 enhancement

**Recommended Prioritization:**

**High Priority (Next Sprint):**
1. Enhancement 6: Accessibility Documentation Hub (2-3 points)
2. Enhancement 7: ARIA Live Region Consistency Audit (1-2 points)

**Medium Priority (Next Quarter):**
3. Enhancement 1: Implement KeyboardSensor for Drag-and-Drop (3-5 points)
4. Enhancement 8: Keyboard Shortcut Help Modal (2-3 points)
5. Enhancement 9: Focus Trap Testing Utilities (2-3 points)

**Low Priority (Future):**
6. Enhancement 2: Visual Regression Tests for Focus States (3-5 points)
7. Enhancement 3: Chart/Visualization Alternative Text Strategy (2-3 points)
8. Enhancement 5: Accessibility Monitoring and Alerting (2-3 points)
9. Enhancement 10: WCAG 2.2 Compliance Upgrade (5-8 points)
10. Enhancement 4: Comprehensive Accessibility Audit with Real Users (8-13 points)

---

**Note:** All enhancements are non-blocking for BUGF-020. The story can proceed to implementation without addressing these opportunities.
