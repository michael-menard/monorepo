# Story lnch-1043: Accessibility Audit (WCAG 2.1 AA)

## Status

Draft

## Story

**As a** user with disabilities,
**I want** the application to be fully accessible,
**so that** I can use all features regardless of ability.

## Epic Context

This is **Story 5 of Launch Readiness Epic: UX Readiness Workstream**.
Priority: **Critical** - Legal compliance and ethical requirement.

**Epic Reference**: `docs/prd/epic-0-launch-readiness.md`

## Dependencies

- None (can be done in parallel with other UX stories)

## Related Stories

- lnch-1002: README for accessibility Package (uses this package)
- lnch-1052: E2E UX Verification (includes a11y verification)

## Acceptance Criteria

1. All pages pass axe-core automated testing
2. Keyboard navigation works on all interactive elements
3. Focus indicators are visible on all focusable elements
4. Color contrast meets WCAG AA (4.5:1 text, 3:1 UI)
5. All images have appropriate alt text
6. Forms have associated labels
7. Screen reader testing passes for critical flows

## Tasks / Subtasks

- [ ] **Task 1: Run Automated Audit** (AC: 1)
  - [ ] Install axe-core or similar
  - [ ] Run on all pages
  - [ ] Document violations
  - [ ] Prioritize fixes

- [ ] **Task 2: Fix Keyboard Navigation** (AC: 2)
  - [ ] Tab order is logical
  - [ ] All interactive elements focusable
  - [ ] Escape closes modals/dropdowns
  - [ ] Arrow keys work in menus

- [ ] **Task 3: Fix Focus Indicators** (AC: 3)
  - [ ] Visible focus rings on all elements
  - [ ] High contrast focus styles
  - [ ] No outline:none without alternative

- [ ] **Task 4: Fix Color Contrast** (AC: 4)
  - [ ] Audit text colors
  - [ ] Audit button/UI colors
  - [ ] Fix any failures
  - [ ] Document approved palette

- [ ] **Task 5: Add Alt Text** (AC: 5)
  - [ ] Decorative images: alt=""
  - [ ] Meaningful images: descriptive alt
  - [ ] MOC thumbnails: MOC title as alt
  - [ ] User avatars: "[Name]'s avatar"

- [ ] **Task 6: Fix Form Labels** (AC: 6)
  - [ ] All inputs have labels
  - [ ] Labels are associated (htmlFor)
  - [ ] Required fields indicated
  - [ ] Error messages linked to inputs

- [ ] **Task 7: Screen Reader Testing** (AC: 7)
  - [ ] Test with VoiceOver (Mac)
  - [ ] Test with NVDA (Windows)
  - [ ] Document issues found
  - [ ] Fix critical issues

## Dev Notes

### WCAG 2.1 AA Requirements

| Criterion | Requirement |
|-----------|-------------|
| 1.1.1 Non-text Content | Alt text for images |
| 1.3.1 Info and Relationships | Semantic HTML |
| 1.4.3 Contrast (Minimum) | 4.5:1 text, 3:1 UI |
| 2.1.1 Keyboard | All functions via keyboard |
| 2.4.3 Focus Order | Logical tab order |
| 2.4.7 Focus Visible | Visible focus indicator |
| 3.3.2 Labels or Instructions | Form labels |
| 4.1.2 Name, Role, Value | ARIA for custom widgets |

### Automated Testing
```bash
# Using axe-core in tests
pnpm add -D @axe-core/react

# In component tests
import { axe } from '@axe-core/react'

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Focus Styles (Tailwind)
```css
/* Ensure visible focus */
.focus-visible:focus {
  @apply outline-none ring-2 ring-primary ring-offset-2;
}
```

### Screen Reader Testing

**VoiceOver (Mac)**
1. Cmd + F5 to enable
2. Navigate with Tab and arrows
3. Verify all content announced
4. Check heading structure (Ctrl + Option + Cmd + H)

**NVDA (Windows)**
1. Install NVDA
2. Navigate with Tab and arrows
3. Use browse mode (B for buttons, H for headings)

### Critical Flows to Test
1. Login/signup
2. Create MOC (upload flow)
3. Browse gallery
4. View MOC detail
5. Edit profile

## Testing

### Test Requirements
- Automated: axe-core in unit tests
- Manual: Keyboard-only navigation
- Manual: Screen reader testing
- Report: Document all findings

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-12-27 | 0.1 | Initial draft | SM Agent (Bob) |
