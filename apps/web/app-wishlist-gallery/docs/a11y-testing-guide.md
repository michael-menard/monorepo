# Accessibility Testing Guide

This guide covers accessibility testing for the Wishlist Gallery application, including automated testing with axe-core, keyboard navigation testing, and manual screen reader testing.

## Table of Contents

1. [Quick Start](#quick-start)
2. [axe-core Integration](#axe-core-integration)
3. [Keyboard Navigation Testing](#keyboard-navigation-testing)
4. [Screen Reader Testing](#screen-reader-testing)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)
7. [Resources](#resources)

---

## Quick Start

### Running Accessibility Tests

```bash
# Run all tests including a11y tests
pnpm test

# Run only a11y utility tests
pnpm test src/test/a11y

# Run tests with coverage
pnpm test:coverage
```

### Basic Usage

```typescript
import { render } from '@testing-library/react'
import { assertNoViolations, testKeyboardAccessibility } from '../test/a11y'

it('should be accessible', async () => {
  const { container } = render(<MyComponent />)

  // Check for WCAG violations
  await assertNoViolations(container)

  // Check keyboard accessibility
  const result = await testKeyboardAccessibility(container)
  expect(result.allAccessible).toBe(true)
})
```

---

## axe-core Integration

### Checking for WCAG Violations

The axe-core integration automatically scans components for WCAG 2.1 AA violations.

```typescript
import { checkAccessibility, assertNoViolations } from '../test/a11y'

describe('WishlistCard', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<WishlistCard item={mockItem} />)

    // Option 1: Get detailed results
    const result = await checkAccessibility(container)
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)

    // Option 2: Assert directly (throws on violations)
    await assertNoViolations(container)
  })
})
```

### Configuring axe-core

```typescript
import { createA11yChecker, createA11yConfig } from '../test/a11y'

// Custom configuration
const config = createA11yConfig({
  wcagLevel: 'wcag21aa', // Default WCAG level
  ruleExceptions: [
    {
      ruleId: 'color-contrast',
      justification: 'Third-party component, tracked in WISH-2006',
      selectors: ['.external-widget'],
    },
  ],
})

// Create reusable checker
const a11yCheck = createA11yChecker(config)

it('should pass with custom config', async () => {
  const { container } = render(<Component />)
  await a11yCheck.assertNoViolations(container)
})
```

### Color Contrast Testing

```typescript
import { checkColorContrast } from '../test/a11y'

it('should have sufficient color contrast', async () => {
  const { container } = render(<TextComponent />)

  const violations = await checkColorContrast(container)
  expect(violations).toHaveLength(0)
})
```

### Testing That Violations Are Detected

```typescript
import { assertViolationsExist } from '../test/a11y'

it('should detect missing alt text', async () => {
  const { container } = render(<img src="test.jpg" />)

  await assertViolationsExist(container, ['image-alt'])
})
```

---

## Keyboard Navigation Testing

### Tab Navigation

```typescript
import { createKeyboardUser, pressTab, tabThrough } from '../test/a11y'

it('should support Tab navigation', async () => {
  const user = createKeyboardUser()
  const { getByRole } = render(<Form />)

  // Focus first element
  getByRole('textbox', { name: /name/i }).focus()

  // Tab to next element
  const focused = await pressTab(user)
  expect(focused).toHaveAttribute('name', 'email')

  // Tab through multiple elements
  const result = await tabThrough(user, 3)
  expect(result.focusSequence).toHaveLength(3)
})
```

### Focus Management

```typescript
import { assertHasFocus, assertFocusWithin, testModalFocus } from '../test/a11y'

it('should manage focus in modal', async () => {
  const user = createKeyboardUser()
  const { getByRole } = render(<Modal isOpen />)

  const modal = getByRole('dialog')

  // Check focus is within modal
  assertFocusWithin(modal)

  // Test complete modal focus pattern
  const result = await testModalFocus(user, modal, triggerButton, closeModal)
  expect(result.initialFocus).toBe(true)
  expect(result.focusTrap).toBe(true)
  expect(result.focusRestoration).toBe(true)
})
```

### Roving Tabindex

```typescript
import { testRovingTabindex } from '../test/a11y'

it('should implement roving tabindex', async () => {
  const user = createKeyboardUser()
  const { getByRole } = render(<Tabs />)

  const tablist = getByRole('tablist')

  const result = await testRovingTabindex(user, tablist, {
    orientation: 'horizontal',
    wrap: true,
  })

  expect(result.singleTabStop).toBe(true)
  expect(result.arrowNavigation).toBe(true)
})
```

---

## Screen Reader Testing

### ARIA Validation

```typescript
import { validateAriaAttributes, getAccessibleName } from '../test/a11y'

it('should have valid ARIA attributes', () => {
  const { getByRole } = render(<Combobox />)

  const combobox = getByRole('combobox')
  const result = validateAriaAttributes(combobox)

  expect(result.valid).toBe(true)
  expect(result.issues).toHaveLength(0)
})

it('should have accessible name', () => {
  const { getByRole } = render(<Button>Submit</Button>)

  const button = getByRole('button')
  const name = getAccessibleName(button)

  expect(name).toBe('Submit')
})
```

### Live Regions

```typescript
import { createMockScreenReader, assertLiveRegion } from '../test/a11y'

it('should announce status updates', async () => {
  const sr = createMockScreenReader()
  sr.start()

  const { getByRole } = render(<StatusMessage />)

  // Trigger status update
  fireEvent.click(getByRole('button'))

  expect(sr.hasAnnounced('Item added')).toBe(true)

  sr.stop()
})

it('should have correct live region', () => {
  const { container } = render(<Alert message="Error!" />)

  const alert = container.querySelector('[role="alert"]')
  assertLiveRegion(alert, 'assertive')
})
```

### Semantic HTML

```typescript
import { validateSemanticHTML, findDuplicateIds } from '../test/a11y'

it('should use semantic HTML', () => {
  const { container } = render(<Page />)

  const result = validateSemanticHTML(container)
  expect(result.valid).toBe(true)
})

it('should not have duplicate IDs', () => {
  const { container } = render(<Form />)

  const duplicates = findDuplicateIds(container)
  expect(duplicates.size).toBe(0)
})
```

---

## Common Patterns

### Testing Buttons

```typescript
import { assertNoViolations, testKeyboardAccessibility } from '../test/a11y'

it('button should be accessible', async () => {
  const { container, getByRole } = render(
    <button aria-label="Add item">+</button>
  )

  await assertNoViolations(container)

  const button = getByRole('button')
  expect(button).toHaveAccessibleName('Add item')
})
```

### Testing Dropdowns

```typescript
import { validateAriaAttributes, pressArrow, pressEscape } from '../test/a11y'

it('dropdown should be accessible', async () => {
  const user = createKeyboardUser()
  const { getByRole, queryByRole } = render(<Dropdown />)

  const trigger = getByRole('button')

  // Check ARIA attributes
  const result = validateAriaAttributes(trigger)
  expect(result.valid).toBe(true)

  // Open with Enter
  trigger.focus()
  await pressEnter(user)
  expect(getByRole('listbox')).toBeInTheDocument()

  // Navigate with arrows
  await pressArrow(user, 'down')

  // Close with Escape
  await pressEscape(user)
  expect(queryByRole('listbox')).not.toBeInTheDocument()
})
```

### Testing Modals

```typescript
import { testModalFocus, assertNoViolations } from '../test/a11y'

it('modal should have proper focus management', async () => {
  const user = createKeyboardUser()
  const onClose = vi.fn()

  const { getByRole, rerender } = render(
    <>
      <button id="trigger">Open</button>
      <Modal isOpen onClose={onClose} />
    </>
  )

  const trigger = document.getElementById('trigger')!
  const modal = getByRole('dialog')

  // Test focus management
  const result = await testModalFocus(user, modal, trigger, onClose)

  expect(result.initialFocus).toBe(true)
  expect(result.focusTrap).toBe(true)
  expect(result.focusRestoration).toBe(true)
})
```

### Testing Forms

```typescript
import { assertNoViolations, validateAriaAttributes } from '../test/a11y'

it('form should be accessible', async () => {
  const { container, getByLabelText, getByRole } = render(<ContactForm />)

  // Check overall accessibility
  await assertNoViolations(container)

  // Verify labels are associated
  expect(getByLabelText('Email')).toBeInTheDocument()
  expect(getByLabelText('Message')).toBeInTheDocument()

  // Check submit button
  const submit = getByRole('button', { name: /submit/i })
  expect(submit).toHaveAccessibleName()
})
```

---

## Manual Screen Reader Testing

While automated testing catches many issues, manual testing with real screen readers is essential.

### Screen Readers to Test

| Platform | Screen Reader | Browser |
|----------|--------------|---------|
| macOS | VoiceOver | Safari, Chrome |
| Windows | NVDA | Firefox, Chrome |
| Windows | JAWS | Chrome, Edge |

### VoiceOver Testing Checklist (macOS)

1. **Enable VoiceOver**: `Cmd + F5`
2. **Navigation**:
   - Use `Tab` to move through interactive elements
   - Use `VO + Arrow` to read content
   - Verify headings with `VO + Cmd + H`
3. **Verify**:
   - All interactive elements are announced
   - Live regions announce updates
   - Modal focus is trapped
   - Focus returns after modal closes

### NVDA Testing Checklist (Windows)

1. **Enable NVDA**: Launch from Start menu
2. **Navigation**:
   - Browse mode: Arrow keys to read
   - Focus mode: `Tab` for interactive elements
   - Headings: `H` key
3. **Verify**:
   - Same as VoiceOver checklist

### Common Issues Found in Manual Testing

| Issue | Detection |
|-------|-----------|
| Missing announcements | Content changes silently |
| Focus lost | User is stranded after action |
| Reading order wrong | Content read in illogical order |
| Redundant announcements | Same info announced multiple times |

---

## Troubleshooting

### axe-core False Positives

```typescript
// Disable specific rule with justification
const config = createA11yConfig({
  ruleExceptions: [
    {
      ruleId: 'color-contrast',
      justification: 'False positive - gradient background',
      selectors: ['.gradient-bg'],
      approvedBy: 'WISH-2006',
    },
  ],
})
```

### Tests Timing Out

```typescript
// Increase timeout for complex components
it('complex component is accessible', async () => {
  const result = await checkAccessibility(container, {
    performance: { maxScanTime: 1000 },
  })
}, 10000) // Increase test timeout
```

### Focus Not Moving

```typescript
// Ensure element is focusable
expect(element).toHaveAttribute('tabindex', '0')

// Or check if it's natively focusable
expect(['BUTTON', 'A', 'INPUT'].includes(element.tagName)).toBe(true)
```

---

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### axe-core
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
- [axe-core API](https://github.com/dequelabs/axe-core/blob/master/doc/API.md)

### WAI-ARIA
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [ARIA Roles](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles)

### Screen Readers
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)

### Testing Libraries
- [Testing Library Accessibility](https://testing-library.com/docs/guide-disappearance/)
- [vitest-axe](https://github.com/chaance/vitest-axe)

---

## Related Stories

- **WISH-2012**: Accessibility Testing Harness Setup (this infrastructure)
- **WISH-2006**: Accessibility Implementation (uses this harness)
- **WISH-2121**: Playwright E2E Setup (browser-mode a11y testing)
