# Elaboration Report - WISH-2006

**Date**: 2026-01-31
**Verdict**: PASS

## Summary

WISH-2006 (Accessibility) is a well-scoped frontend-only story that adds comprehensive keyboard navigation and screen reader support to the wishlist gallery. All audit checks pass with three medium/low findings that have been addressed through user decisions, elevating the verdict to PASS.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Frontend-only accessibility enhancements with no scope creep. |
| 2 | Internal Consistency | PASS | — | Goals align with AC, non-goals properly exclude advanced features. Test plan covers all AC. |
| 3 | Reuse-First | PASS | — | Acknowledges existing @repo/accessibility package. Story correctly creates app-local utilities first, with plan to migrate to shared package later. Uses Radix Dialog focus trap from @repo/ui. |
| 4 | Ports & Adapters | PASS | — | No API changes. Frontend-only story doesn't require hexagonal architecture compliance. |
| 5 | Local Testability | PASS | — | Playwright E2E tests specified. Unit tests for hooks. axe-core integration. Manual screen reader testing (best effort). |
| 6 | Decision Completeness | PASS | — | All findings addressed through user decisions (see below). Grid detection strategy and keyboard shortcut scope clarified. |
| 7 | Risk Disclosure | PASS | — | All major risks disclosed: grid complexity, focus return, shortcut conflicts, screen reader testing coverage, dynamic modal content. Mitigations specified for each. |
| 8 | Story Sizing | PASS | — | 7 indicators checked: 7 AC sections (acceptable), 0 endpoints, frontend-only (not both layers), single feature, reasonable test scenarios, 1 package touched. Story is appropriately sized for accessibility work. |

## Issues Found & Resolution

| # | Issue | Severity | Required Fix | Resolution |
|---|-------|----------|--------------|------------|
| 1 | Missing decision: Responsive grid column detection strategy | Medium | Add Architecture Note specifying CSS Grid auto-fill + ResizeObserver strategy | RESOLVED: User decision adds explicit Architecture Note documenting CSS Grid auto-fill + ResizeObserver approach |
| 2 | Missing decision: Keyboard shortcut activation scope | Medium | Add Architecture Note specifying gallery-scoped shortcuts | RESOLVED: User decision adds explicit Architecture Note specifying gallery-scoped shortcuts (active only when gallery has focus) |
| 3 | @repo/accessibility package reuse not evaluated | Low | Evaluate existing exports and document decision | RESOLVED: User decision adds Architecture Note documenting that existing @repo/accessibility exports (useKeyboardDragAndDrop, KeyboardDragDropArea) are drag-and-drop specific and don't cover this use case. New hooks will be created app-local first. |

## Split Recommendation

Not applicable - Story is appropriately sized and all findings have been resolved.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Missing decision: Responsive grid column detection strategy | Add as AC | Add Architecture Note specifying CSS Grid auto-fill + ResizeObserver strategy |
| 2 | Missing decision: Keyboard shortcut activation scope | Add as AC | Add Architecture Note specifying gallery-scoped shortcuts (active only when gallery has focus) |
| 3 | @repo/accessibility package reuse not evaluated | Add as AC | Add Architecture Note documenting that existing @repo/accessibility exports (useKeyboardDragAndDrop, KeyboardDragDropArea) are drag-and-drop specific and don't cover this use case. New hooks (useRovingTabIndex, useKeyboardShortcuts, useAnnouncer) will be created app-local first, with migration to shared package as future work. |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Migrate accessibility hooks to @repo/accessibility | Deferred to future | Story correctly creates app-local utilities first. Once proven in production, migrate useRovingTabIndex, useKeyboardShortcuts, useAnnouncer to shared @repo/accessibility package for reuse across apps. |
| 2 | React Aria GridCollection integration | Deferred to future | Story includes fallback to simplify navigation if 2D grid proves complex. Consider Adobe react-aria GridCollection for robust grid keyboard navigation. |
| 3 | WCAG AAA compliance (7:1 contrast) | Deferred to future | Deferred per Non-goals. Consider future story if required by enterprise customers. |
| 4 | Automated screen reader testing (@guidepup) | Deferred to future | Story correctly defers to manual testing. Consider future story once @guidepup matures. |
| 5 | Advanced ARIA features (landmarks, skip links, heading hierarchy) | Deferred to future | Deferred per Non-goals. Consider future story for semantic navigation links. |
| 6 | Voice control support | Deferred to future | Deferred per Non-goals. Consider future story if user research indicates demand. |
| 7 | Custom keyboard shortcut configuration | Deferred to future | Deferred per Non-goals. Consider future story to allow users to remap shortcuts. |
| 8 | High contrast theme / forced colors mode | Deferred to future | Deferred per Non-goals. Consider future story for Windows High Contrast Mode support. |
| 9 | Keyboard navigation hints/tooltips | Deferred to future | Consider adding tooltip hints on first visit to improve discoverability. |
| 10 | Reduced motion preference support | Deferred to future | Consider future story to support `prefers-reduced-motion` media query. |

### Follow-up Stories Suggested

- [ ] WISH-20XX (future): Migrate accessibility hooks to @repo/accessibility package once proven in production
- [ ] WISH-20XX (future): Add WCAG AAA compliance (7:1 contrast) if required by enterprise customers
- [ ] WISH-20XX (future): Implement automated screen reader testing with @guidepup once library matures
- [ ] WISH-20XX (future): Add advanced ARIA features (landmarks, skip links, heading hierarchy)

### Items Marked Out-of-Scope

- WCAG AAA compliance (7:1 contrast): Deferred to future story. MVP targets WCAG AA (4.5:1 / 3:1).
- Voice control support: Deferred to future story. MVP focuses on keyboard navigation.
- Custom keyboard shortcut configuration: Deferred to future story. MVP uses fixed shortcuts.
- Automated screen reader testing (@guidepup): Deferred to future story. MVP uses manual testing.
- Advanced ARIA features (landmarks, skip links): Deferred to future story. MVP focuses on basic navigation and labels.
- High contrast theme or forced colors mode: Deferred to future story. MVP uses standard theme.

## Proceed to Implementation?

**YES** - Story may proceed to implementation. All audit checks pass. Three medium/low findings have been addressed and clarified through explicit Architecture Notes:

1. **Grid column detection**: Use CSS Grid `auto-fill` with `minmax(300px, 1fr)` + ResizeObserver for responsive column detection
2. **Keyboard shortcut scope**: Gallery-scoped activation (shortcuts only active when gallery container has focus)
3. **@repo/accessibility reuse**: Existing exports are drag-and-drop specific. New hooks (useRovingTabIndex, useKeyboardShortcuts, useAnnouncer) will be created app-local first, with future migration to shared package.

Story is well-scoped, internally consistent, and includes comprehensive test coverage (Playwright E2E, unit tests, axe-core). Ready for development.

---

## Architecture Notes Added

### Grid Column Detection Strategy

**Decision**: Use CSS Grid `auto-fill` with ResizeObserver for responsive column detection.

**Implementation**:
- CSS Grid definition: `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`
- ResizeObserver monitors container width changes
- Calculate actual column count by checking rendered element positions
- Update roving tabindex logic when column count changes
- Test with 3 columns (desktop), 2 columns (tablet), 1 column (mobile)

**Rationale**: Automatic column wrapping respects actual viewport, avoids hardcoded breakpoints, handles all responsive scenarios.

### Keyboard Shortcut Activation Scope

**Decision**: Gallery-scoped activation (shortcuts only active when gallery container has focus).

**Implementation**:
- Shortcuts only work when gallery container has focus
- User must Tab into gallery first, then use shortcuts
- Check `event.target` - if input/textarea, ignore shortcuts
- Prevents conflicts with browser shortcuts
- Prevents shortcuts firing in form inputs
- Document shortcuts in tooltips: "Add Item (A)"

**Rationale**: Scoped activation prevents global shortcut conflicts with assistive technology and browser shortcuts. Explicit focus requirement is standard accessibility pattern.

### @repo/accessibility Package Reuse Evaluation

**Decision**: Existing @repo/accessibility exports are drag-and-drop specific; new hooks will be created app-local first.

**Evaluation**:
- Existing exports: `useKeyboardDragAndDrop`, `KeyboardDragDropArea`
- These are drag-and-drop specific and don't cover roving tabindex grid navigation, global shortcuts, or screen reader announcements
- New hooks needed: `useRovingTabIndex`, `useKeyboardShortcuts`, `useAnnouncer`
- Create in app-local `src/hooks/` first
- Plan to migrate to shared `@repo/accessibility` package once proven in production and when multiple apps need these patterns

**Rationale**: Avoids forcing unrelated utilities into shared package. App-local development allows quick iteration; migration to shared happens when reuse patterns emerge.

