# Knowledge Base Entries - REPA-015

This document contains all KB entries that should be written when the KB system becomes available.

---

## Entry 1: Unused Keyboard Label Utility

**Type:** finding
**Category:** future-opportunities
**Tags:** `finding`, `story:repa-015`, `category:future-opportunities`, `date:2026-02`, `stage:elab`, `edge-case`, `enhancement`

**Content:**
```markdown
**[REPA-015] Future Opportunities - Keyboard Utilities**

- **Finding**: getKeyboardShortcutLabel() utility migrated to @repo/accessibility but not currently used in codebase
- **Impact**: Low
- **Effort**: Low
- **Recommendation**: Consider adding keyboard shortcut help modal that uses this utility to display human-readable labels (↑, ↓, Del, Esc, Enter)
```

---

## Entry 2: Unused Contrast Validation Schema

**Type:** finding
**Category:** future-opportunities
**Tags:** `finding`, `story:repa-015`, `category:future-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `wcag`

**Content:**
```markdown
**[REPA-015] Future Opportunities - Contrast Validation**

- **Finding**: ContrastRatioSchema defined in @repo/accessibility but not actively used for runtime validation
- **Impact**: Low
- **Effort**: Low
- **Recommendation**: Add design system lint rules or build-time checks that validate WCAG AA compliance using this schema
```

---

## Entry 3: Limited Keyboard Label Coverage

**Type:** finding
**Category:** future-opportunities
**Tags:** `finding`, `story:repa-015`, `category:future-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `keyboard-navigation`

**Content:**
```markdown
**[REPA-015] Future Opportunities - Keyboard Label Extension**

- **Finding**: keyboardShortcutLabels only covers basic keys (arrows, Delete, Enter, Escape, Home, End, single letters)
- **Impact**: Medium
- **Effort**: Low
- **Missing Coverage**: Modifier keys (Ctrl, Alt, Shift, Meta), function keys (F1-F12), media keys, numpad keys
- **Recommendation**: Extend mapping incrementally as new keyboard shortcuts are added to applications
```

---

## Entry 4: Hardcoded Focus Ring Color

**Type:** finding
**Category:** future-opportunities
**Tags:** `finding`, `story:repa-015`, `category:future-opportunities`, `date:2026-02`, `stage:elab`, `theming`, `ux-polish`

**Content:**
```markdown
**[REPA-015] Future Opportunities - Focus Ring Theming**

- **Finding**: focusRingClasses hardcodes sky-500 color, which works with current design system but lacks flexibility
- **Impact**: Low
- **Effort**: Medium
- **Recommendation**: Support theme variants or allow apps to override focus color via CSS custom properties for better theme flexibility in future design iterations
```

---

## Entry 5: Generic ARIA Builder Framework

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `aria`, `future-work`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - ARIA Builder**

- **Finding**: ~200 LOC of domain-specific ARIA generators in app-wishlist-gallery follow similar patterns (generateItemAriaLabel, generatePriorityChangeAnnouncement, etc.)
- **Impact**: Medium
- **Effort**: High
- **Current Status**: Explicitly excluded from REPA-015 (Non-goal #2)
- **Recommendation**: Create generic ARIA builder utilities (formatPosition, formatPrice, formatItemCount) that domain functions can compose. Would reduce duplication if other apps need similar ARIA patterns. Defer until pattern emerges in multiple apps.
```

---

## Entry 6: Keyboard Shortcut Help Component

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `ux-polish`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - Keyboard Help**

- **Finding**: With getKeyboardShortcutLabel() utility now in @repo/accessibility, foundation exists for keyboard shortcut help
- **Impact**: Medium
- **Effort**: Medium
- **Recommendation**: Create reusable KeyboardShortcutsHelp component in @repo/app-component-library that displays available shortcuts. Could be triggered by pressing "?" or through help menu. Would improve discoverability of keyboard navigation features.
```

---

## Entry 7: Screen Reader Text Utilities

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `screen-reader`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - Screen Reader Utilities**

- **Finding**: @repo/accessibility package would benefit from screen-reader-only text utilities
- **Impact**: Medium
- **Effort**: Low
- **Recommendation**: Add srOnlyClasses constant and VisuallyHidden component. Complements existing accessibility utilities. High value, low effort - good candidate for next iteration.
```

---

## Entry 8: Keyboard Event Utilities

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `keyboard-navigation`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - Keyboard Event Handlers**

- **Finding**: Keyboard event handling could be simplified with utility functions
- **Impact**: Medium
- **Effort**: Low
- **Recommendation**: Add utilities for keyboard event handling: isNavigationKey(key), isActionKey(key), isModifierPressed(event). Would complement getKeyboardShortcutLabel() and reduce boilerplate in keyboard handlers. High value, low effort.
```

---

## Entry 9: ARIA Live Region Hook

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `aria`, `hooks`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - Live Regions**

- **Finding**: useAnnouncer hook provides basic announcement functionality, but more granular control would be valuable
- **Impact**: High
- **Effort**: Medium
- **Recommendation**: Create useAriaLive() hook that manages polite/assertive live regions with automatic cleanup. Would complement existing useAnnouncer (already in package from REPA-008) for more granular announcement control. High-value enhancement.
```

---

## Entry 10: Contrast Validation CLI Tool

**Type:** finding
**Category:** enhancement-opportunities
**Tags:** `finding`, `story:repa-015`, `category:enhancement-opportunities`, `date:2026-02`, `stage:elab`, `accessibility`, `wcag`, `tooling`

**Content:**
```markdown
**[REPA-015] Enhancement Opportunities - WCAG Validation Tooling**

- **Finding**: ContrastRatioSchema provides foundation for automated WCAG compliance checking
- **Impact**: Medium
- **Effort**: Medium
- **Recommendation**: Build on ContrastRatioSchema to create CLI tool that scans Tailwind config and validates all color combinations meet WCAG AA standards. Could run as pre-commit hook or in CI pipeline. Automates accessibility compliance.
```

---

## Summary

- **Total Entries**: 10
- **Non-Blocking Gaps**: 4 (entries 1-4)
- **Enhancement Opportunities**: 6 (entries 5-10)
- **High-Value, Low-Effort**: Entries 7, 8 (recommended for next iteration)
- **High-Value, Medium-Effort**: Entries 6, 9, 10
- **Medium-Value**: Entries 3, 5
- **Low-Value**: Entries 1, 2, 4

## Integration Instructions

When KB system becomes available, spawn kb-writer agent for each entry with:

```yaml
kb_write_request:
  entry_type: finding
  source_stage: elab
  story_id: "REPA-015"
  category: "<category from entry>"
  content: "<content block from entry>"
  additional_tags: ["<tags from entry>"]
```
