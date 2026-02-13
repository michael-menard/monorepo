# Future Opportunities - REPA-015

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No usage of getKeyboardShortcutLabel() in current codebase | Low | Low | Function is generic and useful but not currently consumed. Consider adding keyboard shortcut help modal in future that uses this utility to display human-readable labels. |
| 2 | No usage of ContrastRatioSchema in current codebase | Low | Low | Schema is defined but not actively used for runtime validation. Consider adding design system lint rules or build-time checks that validate WCAG AA compliance using this schema. |
| 3 | keyboardShortcutLabels only covers basic keys | Medium | Low | Current mapping includes arrows, Delete, Enter, Escape, Home, End, and single letters. Missing: modifier keys (Ctrl, Alt, Shift, Meta), function keys (F1-F12), media keys, numpad keys. Extend mapping as needed when new keyboard shortcuts are added. |
| 4 | No symbol-based arrow labels | Low | Low | Current arrow labels use text ("Up", "Down", "Left", "Right"). Could add symbol variants using Unicode arrows (↑, ↓, ←, →) for more compact display. Consider as enhancement if UI space is constrained. |
| 5 | focusRingClasses hardcodes sky-500 color | Low | Medium | Focus ring uses `ring-sky-500` which works with current design system. Future: Support theme variants or allow apps to override focus color via CSS custom properties for better theme flexibility. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Generic ARIA Label Builder Framework | Medium | High | Current story explicitly excludes this (Non-goal #2), but ~200 LOC of domain-specific ARIA generators in app-wishlist-gallery follow similar patterns (generateItemAriaLabel, generatePriorityChangeAnnouncement, etc.). Future: Create generic ARIA builder utilities (formatPosition, formatPrice, formatItemCount) that domain functions can compose. Would reduce duplication if other apps need similar ARIA patterns. |
| 2 | Keyboard Shortcut Help Component | Medium | Medium | With getKeyboardShortcutLabel() utility in place, create a reusable KeyboardShortcutsHelp component in @repo/app-component-library that displays available shortcuts. Could be triggered by pressing "?" or through help menu. Would improve discoverability of keyboard navigation. |
| 3 | Focus Ring Variants | Low | Low | Add utility for focus ring variants: focusRingDangerClasses (red ring), focusRingSuccessClasses (green ring), focusRingWarningClasses (yellow ring) for semantic focus states in forms or destructive actions. |
| 4 | Contrast Validation CLI Tool | Medium | Medium | Build on ContrastRatioSchema to create a CLI tool that scans Tailwind config and validates all color combinations meet WCAG AA standards. Could run as pre-commit hook or in CI. |
| 5 | Screen Reader Text Utilities | Medium | Low | Add utilities for screen-reader-only text: srOnlyClasses constant, VisuallyHidden component. Complements existing accessibility utilities. |
| 6 | Keyboard Event Utilities | Medium | Low | Add utilities for keyboard event handling: isNavigationKey(key), isActionKey(key), isModifierPressed(event). Would complement getKeyboardShortcutLabel() and reduce boilerplate in keyboard handlers. |
| 7 | ARIA Live Region Hook | High | Medium | Create useAriaLive() hook that manages polite/assertive live regions with automatic cleanup. Would complement useAnnouncer (already in package) for more granular announcement control. |

## Categories

### Edge Cases
- Keyboard label mapping for international keyboards (e.g., AZERTY, QWERTZ layouts)
- Focus ring visibility in high contrast mode
- Contrast validation for gradients and complex backgrounds

### UX Polish
- Animated focus ring transitions (smooth ring-width changes)
- Focus ring that follows element shape (rounded corners, custom shapes)
- Keyboard shortcut tooltips that appear on long-press
- Focus indicator sound effects for screen reader users (optional)

### Performance
- Memoize getKeyboardShortcutLabel() for frequently-accessed keys
- Lazy-load keyboard shortcut help modal to reduce initial bundle size
- Cache ContrastRatioSchema validations for repeated color checks

### Observability
- Track keyboard shortcut usage via analytics (which shortcuts are most used?)
- Monitor focus ring visibility issues in production (contrast failures)
- Log WCAG compliance violations for design system audit

### Integrations
- Integrate ContrastRatioSchema with Figma plugin for design-time validation
- Export keyboard shortcut labels to documentation site automatically
- Generate keyboard shortcut reference PDF from keyboardShortcutLabels mapping
- Integrate with browser extension for accessibility testing

### Technical Debt
- Migrate focusRingClasses from string constant to typed utility function for better IDE support
- Add Zod schemas for keyboard key types (instead of plain strings)
- Document WCAG references inline (add links to W3C specs in JSDoc)
- Add visual regression tests for focus rings across browsers

### Documentation
- Create Storybook stories showing focus ring usage examples
- Add keyboard shortcut best practices guide to docs
- Document contrast validation workflow for designers
- Create video tutorial on using accessibility utilities

### Testing
- Add visual regression tests for focus rings in different themes
- Add cross-browser testing for keyboard label display
- Add automated WCAG compliance tests using ContrastRatioSchema
- Add E2E tests for keyboard navigation flows using these utilities

---

## Priority Recommendations

**High Value, Low Effort (Do Next):**
1. Screen Reader Text Utilities (srOnlyClasses, VisuallyHidden)
2. Keyboard Event Utilities (isNavigationKey, isActionKey, isModifierPressed)
3. Extend keyboardShortcutLabels to cover modifier keys

**High Value, Medium Effort (Plan for Future Sprint):**
4. Keyboard Shortcut Help Component
5. ARIA Live Region Hook (useAriaLive)
6. Contrast Validation CLI Tool

**Medium Value, Lower Priority:**
7. Generic ARIA Label Builder Framework (only if pattern emerges in multiple apps)
8. Focus Ring Variants (semantic focus states)
9. Symbol-based arrow labels

**Nice to Have (Defer Until Demand):**
10. Focus ring theme variants
11. Keyboard shortcut analytics
12. Figma plugin integration
