# Elaboration Report - REPA-015

**Date**: 2026-02-10
**Verdict**: CONDITIONAL PASS

## Summary

Story REPA-015 (Extract Generic A11y Utilities to @repo/accessibility) is implementation-ready with conditional pass. All 8 audit checks passed, scope is well-defined, and no MVP-critical gaps exist. Two low-severity documentation issues identified but do not block implementation.

## Audit Results

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Scope Alignment | PASS | Story scope matches index exactly: Extract focusRingClasses, keyboardShortcutLabels, getKeyboardShortcutLabel(), ContrastRatioSchema (~50 LOC). Domain-specific ARIA generators stay in app. useAnnouncer already completed by REPA-008. |
| 2 | Internal Consistency | PASS | Goals, Non-goals, Decisions, and ACs are internally consistent. Non-goals explicitly exclude domain-specific ARIA generators, generic ARIA framework, useAnnouncer (already done), refactoring, and new features. ACs match scope exactly. |
| 3 | Reuse-First | PASS | Reuses existing @repo/accessibility package from REPA-008. No new package creation. Zod already in package dependencies. Pattern proven with useAnnouncer migration. |
| 4 | Ports & Adapters | PASS | Utilities are pure functions/constants with no transport coupling. No API endpoints involved. Dependency constraint verified: @repo/accessibility MUST NOT depend on @repo/api-client (verified in story). |
| 5 | Local Testability | PASS | Unit tests specified for each utility file (focus-styles.test.ts, keyboard-labels.test.ts, contrast-validation.test.ts). Manual testing checklist included for focus styling, keyboard labels, build verification. All tests are concrete and executable. |
| 6 | Decision Completeness | PASS | No blocking TBDs. All design decisions are clear: 3 separate utility files, keep domain functions in app, extract tests with utilities, maintain 45% coverage. |
| 7 | Risk Disclosure | PASS | Risks explicitly disclosed with mitigations. Low risk factors identified (small scope, proven pattern, no new deps, high test coverage). Risk predictions: split risk LOW (0.15), 1-2 review cycles, 80k-120k token cost. |
| 8 | Story Sizing | PASS | Appropriately sized at 1 SP. Only 4 utilities (~50 LOC) + tests (~80 LOC). 2 consumer files to update. Estimated 1.5-2 hours. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Minor AC inconsistency in priority removal | Low | AC-1 references "priority 5 of 5" in test expectation but story scope shows priority should NOT include "of 5". Update test expectation or clarify AC. | Documentation fix |
| 2 | Story path mismatch in index | Low | stories.index.md shows path as "plans/future/repackag-app/backlog/REPA-015" but actual path is "plans/future/repackag-app/elaboration/REPA-015". Update index after moving story to ready-to-work. | Documentation fix |

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| None | — | — | All 8 audit checks passed. No MVP-critical gaps found. Story is implementation-ready. |

### Enhancement Opportunities

| # | Finding | Decision | KB Entry |
|---|---------|----------|----------|
| 1 | No usage of getKeyboardShortcutLabel() in current codebase | KB-logged | Future: keyboard shortcut help modal (low impact, low effort) |
| 2 | No usage of ContrastRatioSchema in current codebase | KB-logged | Future: design system lint rules or build-time WCAG checks (low impact, low effort) |
| 3 | keyboardShortcutLabels only covers basic keys | KB-logged | Missing modifier keys (Ctrl, Alt, Shift, Meta), function keys (F1-F12), media keys, numpad keys. Extend as needed (medium impact, low effort). |
| 4 | focusRingClasses hardcodes sky-500 color | KB-logged | Future: Support theme variants or allow apps to override focus color via CSS custom properties (low impact, medium effort). |
| 5 | Generic ARIA Label Builder Framework | KB-logged | ~200 LOC of domain-specific ARIA generators follow similar patterns. Create generic builder utilities if other apps need similar patterns (medium impact, high effort). |
| 6 | Keyboard Shortcut Help Component | KB-logged | Create reusable KeyboardShortcutsHelp component in @repo/app-component-library using getKeyboardShortcutLabel(). Improves discoverability (medium impact, medium effort). |
| 7 | Screen Reader Text Utilities | KB-logged | Add srOnlyClasses constant and VisuallyHidden component to complement existing accessibility utilities (medium impact, low effort). |
| 8 | Keyboard Event Utilities | KB-logged | Add utilities for keyboard event handling: isNavigationKey(), isActionKey(), isModifierPressed(). Complements getKeyboardShortcutLabel() (medium impact, low effort). |
| 9 | ARIA Live Region Hook | KB-logged | Create useAriaLive() hook for polite/assertive live regions with automatic cleanup. Complements useAnnouncer (high impact, medium effort). |
| 10 | Contrast Validation CLI Tool | KB-logged | Build on ContrastRatioSchema to create CLI tool that validates Tailwind color combinations meet WCAG AA standards (medium impact, medium effort). |

### Follow-up Stories Suggested

None - all follow-up opportunities logged to KB for future prioritization.

### Items Marked Out-of-Scope

None - all scoping explicitly addressed in Non-Goals section of story.

### KB Entries Created (Autonomous Mode)

Knowledge base entries documented for manual KB integration when KB system becomes available:
- Future-opportunities: getKeyboardShortcutLabel() usage expansion
- Future-opportunities: ContrastRatioSchema active usage patterns
- Future-opportunities: keyboardShortcutLabels key coverage expansion
- Future-opportunities: focusRingClasses theme variant support
- Enhancement-opportunities: Generic ARIA Label Builder Framework
- Enhancement-opportunities: Keyboard Shortcut Help Component
- Enhancement-opportunities: Screen Reader Text Utilities
- Enhancement-opportunities: Keyboard Event Utilities
- Enhancement-opportunities: ARIA Live Region Hook
- Enhancement-opportunities: Contrast Validation CLI Tool

## Proceed to Implementation?

**YES** - Story may proceed to implementation.

**Conditions:**
- Two low-severity documentation issues should be addressed before implementation begins (test expectation clarity, story path index update)
- Follow implementation phases in story (1. Create utilities, 2. Migrate tests, 3. Update exports, 4. Update imports, 5. Cleanup)
- Verify all 7 ACs pass before merge
- Maintain 45% minimum test coverage

**Story is ready to be moved from elaboration/ to ready-to-work/ directory and scheduled for implementation.**
