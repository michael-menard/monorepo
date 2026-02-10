# Test Plan: SETS-MVP-0340 - Form Validation

**Generated:** 2026-02-09
**Story:** SETS-MVP-0340 (Form Validation)
**Component:** GotItModal Purchase Details Form

---

## Test Strategy

This test plan covers validation logic, keyboard accessibility, and WCAG compliance for the purchase details form. Testing focuses on ensuring data integrity through Zod schema validation and full keyboard navigation support.

---

## Unit Tests

### Price Validation Tests

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/validation.test.tsx`

```typescript
describe('Price Validation', () => {
  describe('AC18: Price fields accept valid decimals only (0.00 - 999999.99)', () => {
    it('accepts valid price at minimum boundary (0.00)', () => {
      // Test 0.00 is accepted
    })

    it('accepts valid price at maximum boundary (999999.99)', () => {
      // Test 999999.99 is accepted
    })

    it('accepts valid decimal prices (e.g., 99.99)', () => {
      // Test standard decimal format
    })

    it('rejects price below minimum (-0.01)', () => {
      // Test negative values are rejected
      // Expected error: validation message from validation-messages.ts
    })

    it('rejects price above maximum (1000000.00)', () => {
      // Test values over max are rejected
      // Expected error: validation message from validation-messages.ts
    })

    it('rejects invalid decimal precision (99.999)', () => {
      // Test more than 2 decimal places rejected
    })

    it('accepts empty value for optional price fields', () => {
      // Test tax, shipping can be empty
    })

    it('rejects non-numeric input (abc)', () => {
      // Test alphabet characters rejected
    })

    it('rejects scientific notation (1e6)', () => {
      // Test edge case notation
    })
  })

  describe('Tax field validation', () => {
    it('applies same validation rules as price paid', () => {
      // Tax uses same createEnhancedSchemas.price()
    })
  })

  describe('Shipping field validation', () => {
    it('applies same validation rules as price paid', () => {
      // Shipping uses same createEnhancedSchemas.price()
    })
  })
})
```

### Date Validation Tests

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/validation.test.tsx`

```typescript
describe('Date Validation', () => {
  describe('AC19: Purchase date cannot be in the future', () => {
    it('accepts today\'s date', () => {
      const today = getTodayDateString()
      // Test today is valid
    })

    it('accepts past dates', () => {
      const yesterday = '2026-02-08'
      // Test past date is valid
    })

    it('rejects future dates', () => {
      const tomorrow = '2026-02-10'
      // Test future date rejected
      // Expected error: validationMessages.date.past('Purchase date')
    })

    it('HTML5 max attribute prevents future date selection', () => {
      // Test <input max={getTodayDateString()}> works
    })

    it('Zod validation catches future dates if HTML5 bypassed', () => {
      // Test schema validation as fallback
    })
  })
})
```

### Keyboard Accessibility Tests

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/keyboard.test.tsx`

```typescript
describe('Keyboard Accessibility', () => {
  describe('AC20: Form is keyboard accessible (tab order, enter to submit)', () => {
    it('tab order follows logical sequence', async () => {
      // Expected order: date → price → tax → shipping → build status → Skip → Save
      const user = userEvent.setup()
      render(<GotItModal {...props} />)

      await user.tab() // Focus date input
      expect(screen.getByLabelText('Purchase Date')).toHaveFocus()

      await user.tab() // Focus price input
      expect(screen.getByLabelText('Price Paid')).toHaveFocus()

      await user.tab() // Focus tax input
      expect(screen.getByLabelText('Tax')).toHaveFocus()

      await user.tab() // Focus shipping input
      expect(screen.getByLabelText('Shipping')).toHaveFocus()

      await user.tab() // Focus build status select
      expect(screen.getByLabelText('Build Status')).toHaveFocus()

      await user.tab() // Focus Skip button
      expect(screen.getByRole('button', { name: /skip/i })).toHaveFocus()

      await user.tab() // Focus Save button
      expect(screen.getByRole('button', { name: /save/i })).toHaveFocus()
    })

    it('Enter key submits form from any input field', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      render(<GotItModal {...props} onSave={onSave} />)

      const priceInput = screen.getByLabelText('Price Paid')
      await user.click(priceInput)
      await user.type(priceInput, '99.99{Enter}')

      expect(onSave).toHaveBeenCalled()
    })

    it('Enter key does not submit if validation errors exist', async () => {
      const user = userEvent.setup()
      const onSave = jest.fn()
      render(<GotItModal {...props} onSave={onSave} />)

      const priceInput = screen.getByLabelText('Price Paid')
      await user.type(priceInput, '-10{Enter}')

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText(/price must be/i)).toBeInTheDocument()
    })

    it('Esc key closes modal (already implemented)', async () => {
      const user = userEvent.setup()
      const onClose = jest.fn()
      render(<GotItModal {...props} onClose={onClose} />)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalled()
    })
  })
})
```

### Focus Management Tests

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/focus.test.tsx`

```typescript
describe('Focus Management', () => {
  it('focuses first error field when validation fails', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // First field with error should receive focus
    expect(priceInput).toHaveFocus()
  })

  it('does not change focus when form is submitting', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} isPurchasing={true} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.click(priceInput)

    await user.keyboard('{Enter}')

    // Focus should stay on input, not trigger submission
    expect(priceInput).toHaveFocus()
  })
})
```

### ARIA Attributes Tests

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/accessibility.test.tsx`

```typescript
describe('ARIA Attributes', () => {
  it('inputs have aria-invalid when errors present', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')
    await user.tab() // Trigger blur validation

    expect(priceInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('error messages associated with inputs via aria-describedby', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')
    await user.tab()

    const errorId = priceInput.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()

    const errorMessage = document.getElementById(errorId!)
    expect(errorMessage).toHaveTextContent(/price must be/i)
  })

  it('error messages have role="alert" for screen reader announcement', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')
    await user.tab()

    const errorMessage = screen.getByRole('alert')
    expect(errorMessage).toHaveTextContent(/price must be/i)
  })

  it('clears aria-invalid when error is corrected', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')
    await user.tab()
    expect(priceInput).toHaveAttribute('aria-invalid', 'true')

    await user.clear(priceInput)
    await user.type(priceInput, '99.99')
    await user.tab()
    expect(priceInput).toHaveAttribute('aria-invalid', 'false')
  })
})
```

---

## Integration Tests

### Form Submission Flow

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/integration.test.tsx`

```typescript
describe('Form Submission Integration', () => {
  it('valid data passes validation and submits', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<GotItModal {...props} onSave={onSave} />)

    await user.type(screen.getByLabelText('Purchase Date'), '2026-02-08')
    await user.type(screen.getByLabelText('Price Paid'), '99.99')
    await user.type(screen.getByLabelText('Tax'), '8.50')
    await user.type(screen.getByLabelText('Shipping'), '5.99')
    await user.selectOptions(screen.getByLabelText('Build Status'), 'not_started')

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith({
      purchaseDate: '2026-02-08',
      pricePaid: '99.99',
      tax: '8.50',
      shipping: '5.99',
      buildStatus: 'not_started',
    })
  })

  it('invalid data shows error messages and prevents submission', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<GotItModal {...props} onSave={onSave} />)

    await user.type(screen.getByLabelText('Price Paid'), '-10')
    await user.type(screen.getByLabelText('Purchase Date'), '2026-02-10') // future

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/price must be/i)).toBeInTheDocument()
    expect(screen.getByText(/date.*past/i)).toBeInTheDocument()
  })

  it('correcting errors clears error messages and allows submission', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<GotItModal {...props} onSave={onSave} />)

    // Enter invalid data
    await user.type(screen.getByLabelText('Price Paid'), '-10')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(screen.getByText(/price must be/i)).toBeInTheDocument()

    // Correct the error
    const priceInput = screen.getByLabelText('Price Paid')
    await user.clear(priceInput)
    await user.type(priceInput, '99.99')

    // Submit again
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalled()
    expect(screen.queryByText(/price must be/i)).not.toBeInTheDocument()
  })

  it('optional fields can be left empty', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<GotItModal {...props} onSave={onSave} />)

    // Only fill required date field
    await user.type(screen.getByLabelText('Purchase Date'), '2026-02-08')
    // Leave price, tax, shipping empty

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalled()
  })

  it('validation does not run while form is submitting', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...props} isPurchasing={true} />)

    const priceInput = screen.getByLabelText('Price Paid')
    await user.type(priceInput, '-10')

    // Should not show validation error while submitting
    expect(screen.queryByText(/price must be/i)).not.toBeInTheDocument()
  })
})
```

---

## E2E Tests (Playwright)

### Keyboard Navigation Flow

**File:** `apps/web/playwright/features/wishlist/purchase-form-keyboard.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Purchase Form - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to wishlist gallery
    await page.goto('/wishlist')

    // Click "Got It!" on an item
    await page.getByRole('button', { name: /got it/i }).first().click()
  })

  test('user can navigate entire form with keyboard only', async ({ page }) => {
    // Tab through all fields
    await page.keyboard.press('Tab') // Purchase date
    await expect(page.getByLabel('Purchase Date')).toBeFocused()

    await page.keyboard.press('Tab') // Price paid
    await expect(page.getByLabel('Price Paid')).toBeFocused()

    await page.keyboard.press('Tab') // Tax
    await expect(page.getByLabel('Tax')).toBeFocused()

    await page.keyboard.press('Tab') // Shipping
    await expect(page.getByLabel('Shipping')).toBeFocused()

    await page.keyboard.press('Tab') // Build status
    await expect(page.getByLabel('Build Status')).toBeFocused()

    await page.keyboard.press('Tab') // Skip button
    await expect(page.getByRole('button', { name: /skip/i })).toBeFocused()

    await page.keyboard.press('Tab') // Save button
    await expect(page.getByRole('button', { name: /save/i })).toBeFocused()
  })

  test('user can submit form with Enter key', async ({ page }) => {
    await page.getByLabel('Price Paid').fill('99.99')
    await page.keyboard.press('Enter')

    // Form should submit and modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Esc key closes modal', async ({ page }) => {
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
```

### Validation Error Display

**File:** `apps/web/playwright/features/wishlist/purchase-form-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Purchase Form - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/wishlist')
    await page.getByRole('button', { name: /got it/i }).first().click()
  })

  test('displays error for invalid price', async ({ page }) => {
    await page.getByLabel('Price Paid').fill('-10')
    await page.getByLabel('Tax').click() // Blur to trigger validation

    await expect(page.getByText(/price must be/i)).toBeVisible()
  })

  test('displays error for price above maximum', async ({ page }) => {
    await page.getByLabel('Price Paid').fill('1000000')
    await page.getByLabel('Tax').click()

    await expect(page.getByText(/price must be less than/i)).toBeVisible()
  })

  test('displays error for future date', async ({ page }) => {
    const futureDate = '2026-02-10'
    await page.getByLabel('Purchase Date').fill(futureDate)
    await page.getByLabel('Price Paid').click()

    await expect(page.getByText(/date.*past/i)).toBeVisible()
  })

  test('clears error when input is corrected', async ({ page }) => {
    // Enter invalid value
    await page.getByLabel('Price Paid').fill('-10')
    await page.getByLabel('Tax').click()
    await expect(page.getByText(/price must be/i)).toBeVisible()

    // Correct the value
    await page.getByLabel('Price Paid').fill('99.99')
    await page.getByLabel('Tax').click()
    await expect(page.getByText(/price must be/i)).not.toBeVisible()
  })

  test('prevents submission when validation errors exist', async ({ page }) => {
    await page.getByLabel('Price Paid').fill('-10')
    await page.getByRole('button', { name: /save/i }).click()

    // Modal should still be visible (not submitted)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/price must be/i)).toBeVisible()
  })
})
```

### Screen Reader Compatibility

**File:** `apps/web/playwright/features/wishlist/purchase-form-a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Purchase Form - Accessibility', () => {
  test('form passes axe accessibility audit', async ({ page }) => {
    await page.goto('/wishlist')
    await page.getByRole('button', { name: /got it/i }).first().click()

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('error messages have proper ARIA attributes', async ({ page }) => {
    await page.goto('/wishlist')
    await page.getByRole('button', { name: /got it/i }).first().click()

    await page.getByLabel('Price Paid').fill('-10')
    await page.getByLabel('Tax').click()

    const priceInput = page.getByLabel('Price Paid')
    await expect(priceInput).toHaveAttribute('aria-invalid', 'true')

    const errorId = await priceInput.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()

    const errorElement = page.locator(`#${errorId}`)
    await expect(errorElement).toHaveAttribute('role', 'alert')
  })

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/wishlist')
    await page.getByRole('button', { name: /got it/i }).first().click()

    await page.keyboard.press('Tab')

    // Check that focused element has visible outline
    const focusedElement = page.locator(':focus')
    const outline = await focusedElement.evaluate(el =>
      window.getComputedStyle(el).outline
    )
    expect(outline).not.toBe('none')
  })
})
```

---

## Test Coverage Requirements

**Minimum Coverage:** 45% (per CLAUDE.md)

**Expected Coverage:**
- Price validation logic: 100%
- Date validation logic: 100%
- Keyboard event handlers: 100%
- Form submission logic: 90%
- ARIA attribute management: 90%

---

## Manual Testing Checklist

### Keyboard Navigation
- [ ] Tab through all fields in logical order
- [ ] Enter key submits form from any field
- [ ] Shift+Tab moves focus backward
- [ ] Esc key closes modal
- [ ] Focus indicators are visible on all elements

### Screen Reader Testing (NVDA/JAWS/VoiceOver)
- [ ] All form fields announced with labels
- [ ] Error messages announced when they appear
- [ ] Build status dropdown announces options
- [ ] Submit/Skip buttons announced clearly
- [ ] Modal title announced when opened

### Validation Behavior
- [ ] Validation triggers on blur (not on every keystroke)
- [ ] Validation triggers on submit attempt
- [ ] Error messages appear below respective fields
- [ ] Error messages have sufficient color contrast
- [ ] Multiple errors can display simultaneously
- [ ] Errors clear when input is corrected

### Edge Cases
- [ ] Decimal precision (99.999 should reject)
- [ ] Scientific notation (1e6 handling)
- [ ] Negative sign input
- [ ] Copy/paste large numbers
- [ ] Browser autofill compatibility
- [ ] Form submission while loading (should be disabled)

---

## Regression Testing

Ensure no regression in existing functionality:
- [ ] "Got It!" button still opens modal
- [ ] Skip button still works
- [ ] Build status dropdown still functional
- [ ] Modal closes on background click (if implemented)
- [ ] Multiple modals can open/close in sequence
- [ ] Item status updates correctly after save
- [ ] Toast notifications still appear

---

## Performance Considerations

- Validation should not cause noticeable lag
- React Hook Form uses uncontrolled inputs (good performance)
- Zod validation is fast for simple schemas
- No validation should run during form submission

---

## Definition of Done

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual keyboard testing completed
- [ ] Screen reader testing completed
- [ ] Axe accessibility audit passes
- [ ] Test coverage meets 45% minimum
- [ ] No regression in existing features
