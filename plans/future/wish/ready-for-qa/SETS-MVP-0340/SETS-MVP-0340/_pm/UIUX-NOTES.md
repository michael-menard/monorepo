# UI/UX Recommendations: SETS-MVP-0340 - Form Validation

**Generated:** 2026-02-09
**Story:** SETS-MVP-0340 (Form Validation)
**Component:** GotItModal Purchase Details Form

---

## Overview

This story enhances the purchase details form with comprehensive validation and keyboard accessibility. The UI/UX approach must maintain the existing LEGO-inspired design while ensuring WCAG compliance and providing clear, accessible feedback for validation errors.

---

## Design Principles

### 1. Accessibility-First
- All validation errors must be perceivable, operable, understandable, and robust (WCAG POUR principles)
- Keyboard navigation must be seamless and intuitive
- Screen reader users must receive clear, actionable feedback

### 2. Progressive Enhancement
- HTML5 validation as first line of defense (max attribute for dates, type="number" for prices)
- Zod schema validation as comprehensive fallback
- Client-side validation doesn't replace server-side (backend still validates)

### 3. Consistency with Existing Design
- Maintain LEGO Sky/Teal color palette
- Follow existing modal layout and responsive behavior
- Match current button variants and spacing

---

## Error Display Patterns

### Current Implementation
Errors currently display as:
```tsx
<p className="text-sm text-red-500">{errorMessage}</p>
```

### Enhanced Implementation

**Error Message Styling:**
```tsx
<p
  id="{fieldName}-error"
  className="text-sm text-red-600 dark:text-red-400 mt-1"
  role="alert"
>
  {errorMessage}
</p>
```

**Rationale:**
- `text-red-600` for better contrast (WCAG AA compliance)
- `dark:text-red-400` for dark mode support
- `mt-1` for consistent spacing below input
- `role="alert"` for immediate screen reader announcement
- `id` attribute for `aria-describedby` association

**Color Contrast Requirements:**
- Light mode: `text-red-600` on white background = 4.56:1 (passes WCAG AA)
- Dark mode: `text-red-400` on dark background = 4.8:1 (passes WCAG AA)
- Alternative: Consider `text-red-700` for AAA compliance (7.0:1)

### Error Icon (Optional Enhancement)
Consider adding an icon for visual reinforcement:
```tsx
<div className="flex items-start gap-1 mt-1">
  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" aria-hidden="true" />
  <p id="{fieldName}-error" className="text-sm text-red-600" role="alert">
    {errorMessage}
  </p>
</div>
```

**Trade-off:** Adds visual weight but improves scannability for users with cognitive disabilities.

---

## Input Field States

### Normal State
```tsx
<Input
  type="number"
  className="..." // Existing styles
  aria-invalid="false"
/>
```

### Error State
```tsx
<Input
  type="number"
  className="border-red-500 focus:ring-red-500 focus:border-red-500"
  aria-invalid="true"
  aria-describedby="pricePaid-error"
/>
```

**Visual Indicators:**
- Red border on error (`border-red-500`)
- Red focus ring on error (`focus:ring-red-500`)
- Maintains existing focus ring width and style

### Loading/Disabled State
During form submission:
```tsx
<Input
  type="number"
  disabled={isPurchasing}
  className="opacity-50 cursor-not-allowed"
  aria-invalid="false"
/>
```

**Rationale:** Validation doesn't run while submitting, so clear error state.

---

## Focus Management

### Focus Ring Styling
Use existing `focusRingClasses` from `utils/a11y.ts`:
```typescript
import { focusRingClasses } from '@/utils/a11y'

<Input
  className={cn(
    "...",
    focusRingClasses,
    errors.pricePaid && "border-red-500 focus:ring-red-500"
  )}
/>
```

**Focus Ring Requirements:**
- Minimum 2px visible outline
- High contrast against background (3:1 minimum)
- Not obscured by other elements
- Visible for all interactive elements

### Focus on Error
When validation fails on submit:
1. Focus moves to first field with error
2. Error message announced by screen reader
3. User can correct and resubmit

**Implementation:**
```typescript
const firstErrorField = Object.keys(errors)[0]
if (firstErrorField) {
  const element = document.getElementById(firstErrorField)
  element?.focus()
}
```

---

## Validation Timing

### On Blur (Recommended)
Validate when user leaves a field:
- Non-intrusive (doesn't interrupt typing)
- Provides immediate feedback after input
- Aligns with user expectations

### On Submit (Always)
Always validate on submit attempt:
- Catches errors in fields user skipped
- Prevents invalid data submission
- Shows all errors at once (if multiple)

### NOT On Change
Avoid validating on every keystroke:
- Interrupts user flow
- Annoying for screen reader users (constant announcements)
- Can't enter negative sign or decimal point without error

**Exception:** Clear error message on change if field was previously invalid (progressive validation).

---

## Responsive Considerations

### Current Layout
```tsx
<div className="grid grid-cols-2 gap-4">
  <div> {/* Tax input */} </div>
  <div> {/* Shipping input */} </div>
</div>
```

### Mobile Considerations
On small screens, error messages may wrap:
- Ensure `min-h-[20px]` for error message container to prevent layout shift
- Test that error text doesn't overflow or overlap inputs
- Consider `break-words` for long error messages

### Layout Shift Prevention
```tsx
<div className="min-h-[calc(theme(spacing.4)+theme(fontSize.sm))]">
  {errors.pricePaid && (
    <p className="text-sm text-red-600 mt-1" role="alert">
      {errors.pricePaid.message}
    </p>
  )}
</div>
```

**Rationale:** Prevents content jumping when error appears/disappears.

---

## User Feedback Patterns

### Success State (Optional)
Brief success indicator when validation passes:
```tsx
{!errors.pricePaid && wasPreviouslyInvalid && (
  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
    <CheckCircle className="h-4 w-4" aria-hidden="true" />
    Valid
  </p>
)}
```

**Trade-off:** Adds positive reinforcement but may clutter UI. Consider A/B testing.

### Loading State During Validation
If validation is async (not the case here), show loading indicator:
```tsx
{isValidating && (
  <Spinner className="h-4 w-4 text-gray-400" aria-label="Validating..." />
)}
```

---

## Keyboard Shortcuts

### Enter to Submit
Form should submit when Enter pressed in any field:
```tsx
<form onKeyDown={(e) => {
  if (e.key === 'Enter' && !isPurchasing) {
    e.preventDefault()
    handleSubmit(onSubmit)()
  }
}}>
```

**UX Consideration:** Power users expect Enter to submit. Ensure it's not triggered during dropdown navigation (build status select).

### Esc to Cancel
Already implemented - modal closes on Esc:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  // ...
}, [onClose])
```

**Maintain this behavior** - it's a standard pattern.

---

## Tab Order

### Natural DOM Order (Preferred)
```tsx
<form>
  <Input name="purchaseDate" /> {/* Tab stop 1 */}
  <Input name="pricePaid" />   {/* Tab stop 2 */}
  <Input name="tax" />          {/* Tab stop 3 */}
  <Input name="shipping" />     {/* Tab stop 4 */}
  <AppSelect name="buildStatus" /> {/* Tab stop 5 */}
  <Button variant="outline">Skip</Button> {/* Tab stop 6 */}
  <Button type="submit">Save</Button> {/* Tab stop 7 */}
</form>
```

**Do NOT use explicit tabIndex** unless DOM order cannot be fixed. Natural order is more maintainable.

### Tab Trap (Not Needed)
Modal should NOT trap focus - user can Tab outside modal to interact with browser chrome. Only trap focus for critical dialogs (e.g., "Unsaved changes" warning).

---

## Microcopy and Error Messages

### Use Validation Messages Library
```typescript
import { validationMessages } from '@repo/app-component-library/forms/validation-messages'

// Price validation
validationMessages.number.min('Price', 0)
// → "Price must be at least 0"

validationMessages.number.max('Price', 999999.99)
// → "Price must be at most 999999.99"

// Date validation
validationMessages.date.past('Purchase date')
// → "Purchase date cannot be in the future"
```

### Tone and Voice
- **Clear:** "Price must be between 0.00 and 999999.99"
- **Concise:** Avoid verbose explanations
- **Actionable:** User knows how to fix the error
- **Friendly:** Avoid blame language (no "invalid" or "wrong")

### Avoid:
- ❌ "Invalid input"
- ❌ "Error: field validation failed"
- ❌ "You entered an incorrect value"

### Prefer:
- ✅ "Price must be between 0.00 and 999999.99"
- ✅ "Purchase date cannot be in the future"
- ✅ "Please enter a valid price"

---

## Button States

### Submit Button
```tsx
<Button
  type="submit"
  disabled={isPurchasing}
  aria-busy={isPurchasing}
>
  {isPurchasing ? 'Saving...' : 'Save'}
</Button>
```

**Loading State:**
- Text changes to "Saving..."
- Button disabled
- `aria-busy="true"` for screen readers
- Optional: Add spinner icon

### Skip Button
```tsx
<Button
  type="button"
  variant="outline"
  onClick={handleSkip}
>
  Skip
</Button>
```

**No loading state** - skip action is immediate.

---

## Form Layout

### Current Structure (Maintain)
```tsx
<div className="space-y-4">
  {/* Date input - full width */}
  <div>
    <Label htmlFor="purchaseDate">Purchase Date</Label>
    <Input id="purchaseDate" type="date" />
    {errors.purchaseDate && <ErrorMessage />}
  </div>

  {/* Price input - full width */}
  <div>
    <Label htmlFor="pricePaid">Price Paid</Label>
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
      <Input id="pricePaid" type="number" className="pl-7" />
    </div>
    {errors.pricePaid && <ErrorMessage />}
  </div>

  {/* Tax & Shipping - 2 columns */}
  <div className="grid grid-cols-2 gap-4">
    <div>
      <Label htmlFor="tax">Tax</Label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
        <Input id="tax" type="number" className="pl-7" />
      </div>
      {errors.tax && <ErrorMessage />}
    </div>
    <div>
      <Label htmlFor="shipping">Shipping</Label>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
        <Input id="shipping" type="number" className="pl-7" />
      </div>
      {errors.shipping && <ErrorMessage />}
    </div>
  </div>

  {/* Build status - full width */}
  <div>
    <Label htmlFor="buildStatus">Build Status</Label>
    <AppSelect id="buildStatus">...</AppSelect>
    {errors.buildStatus && <ErrorMessage />}
  </div>
</div>

{/* Buttons */}
<div className="flex justify-end gap-2 mt-6">
  <Button variant="outline" onClick={handleSkip}>Skip</Button>
  <Button type="submit">Save</Button>
</div>
```

**Spacing:**
- `space-y-4` between form groups
- `gap-4` between tax/shipping columns
- `mt-6` before buttons (slightly more space)

---

## Accessibility Audit Checklist

### WCAG 2.1 Level AA Compliance

**Perceivable:**
- [ ] Error messages have sufficient color contrast (4.5:1)
- [ ] Error states indicated with more than color alone (border + text + icon)
- [ ] Labels visible for all inputs

**Operable:**
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Focus indicators visible (minimum 2px outline)
- [ ] Tab order follows logical reading order

**Understandable:**
- [ ] Error messages clear and actionable
- [ ] Labels clearly describe input purpose
- [ ] Required fields indicated (date is only required field)

**Robust:**
- [ ] Valid HTML5 (no duplicate IDs)
- [ ] Proper ARIA attributes (aria-invalid, aria-describedby, role="alert")
- [ ] Compatible with assistive technologies

---

## Interaction Patterns

### Error Recovery Flow
1. User enters invalid value (e.g., "-10" in price field)
2. User tabs to next field → validation runs on blur
3. Error message appears below input with `role="alert"`
4. Input border turns red, `aria-invalid="true"` set
5. Screen reader announces: "Price must be at least 0"
6. User tabs back to price field
7. User corrects value to "99.99"
8. User tabs to next field → validation runs again
9. Error message disappears, border returns to normal
10. `aria-invalid="false"` set

### Submit with Errors Flow
1. User clicks "Save" button with invalid data
2. Validation runs on all fields
3. All error messages appear simultaneously
4. Focus moves to first field with error
5. Screen reader announces first error
6. User corrects errors sequentially
7. User clicks "Save" again
8. Validation passes, form submits

---

## Dark Mode Support

Ensure error colors work in dark mode:
```tsx
<p className="text-red-600 dark:text-red-400">
  {errorMessage}
</p>

<Input
  className={cn(
    "border-gray-300 dark:border-gray-600",
    errors.field && "border-red-500 dark:border-red-400"
  )}
/>
```

**Test in both modes** to ensure:
- Sufficient contrast
- Readable error text
- Visible focus indicators

---

## Performance Considerations

### Minimize Re-renders
React Hook Form uses uncontrolled inputs:
- Better performance than controlled inputs
- Less frequent re-renders
- Validation only runs when needed (blur, submit)

### Animation Performance
If adding transitions for error messages:
```tsx
<div className="transition-opacity duration-200">
  {errors.pricePaid && <ErrorMessage />}
</div>
```

**Keep animations subtle** - avoid distracting from content.

---

## Recommendations Summary

### Must Have (P0)
1. Error messages with `role="alert"` and sufficient contrast
2. `aria-invalid` and `aria-describedby` on inputs with errors
3. Visible focus indicators for all interactive elements
4. Logical tab order (no explicit tabIndex unless necessary)
5. Enter key submits form
6. Validation on blur and submit (not on change)

### Should Have (P1)
7. Error icon for visual reinforcement
8. Layout shift prevention (min-height for error containers)
9. Focus management to first error field on submit
10. Loading state for submit button

### Nice to Have (P2)
11. Success state indicator when error is corrected
12. Smooth transitions for error message appearance
13. Dark mode support for all states

### Out of Scope
- Custom number formatting (e.g., thousands separators)
- Autocomplete/autofill customization
- Advanced validation (e.g., price comparison with retail)

---

## Design Mockups / Wireframes

### Error State Example

```
┌─────────────────────────────────────────┐
│ Got It! - Purchase Details              │
├─────────────────────────────────────────┤
│                                          │
│ Purchase Date                            │
│ ┌────────────────────────────────────┐  │
│ │ 2026-02-09                         │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Price Paid (optional)                    │
│ ┌────────────────────────────────────┐  │
│ │ $ -10                              │  │ ← Red border
│ └────────────────────────────────────┘  │
│ ⚠ Price must be at least 0              │ ← Red text + icon
│                                          │
│ Tax (optional)    Shipping (optional)    │
│ ┌──────────────┐  ┌──────────────────┐  │
│ │ $            │  │ $                │  │
│ └──────────────┘  └──────────────────┘  │
│                                          │
│ Build Status                             │
│ ┌────────────────────────────────────┐  │
│ │ Not Started               ▼        │  │
│ └────────────────────────────────────┘  │
│                                          │
│                   ┌────┐  ┌──────────┐  │
│                   │Skip│  │   Save   │  │
│                   └────┘  └──────────┘  │
└─────────────────────────────────────────┘
```

### Focus State Example

```
┌─────────────────────────────────────────┐
│ Got It! - Purchase Details              │
├─────────────────────────────────────────┤
│                                          │
│ Purchase Date                            │
│ ┌────────────────────────────────────┐  │
│ │ 2026-02-09                         │  │
│ └────────────────────────────────────┘  │
│                                          │
│ Price Paid (optional)                    │
│ ╔════════════════════════════════════╗  │ ← Blue outline
│ ║ $ 99.99                            ║  │   (focus ring)
│ ╚════════════════════════════════════╝  │
│                                          │
│ Tax (optional)    Shipping (optional)    │
│ ┌──────────────┐  ┌──────────────────┐  │
│ │ $            │  │ $                │  │
│ └──────────────┘  └──────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

---

## Testing Recommendations

### Manual Testing
- Test with keyboard only (no mouse)
- Test with NVDA/JAWS screen reader (Windows)
- Test with VoiceOver (macOS/iOS)
- Test in dark mode
- Test on mobile (responsive layout)

### Automated Testing
- Run axe-core accessibility audit (Playwright)
- Test tab order programmatically
- Test ARIA attributes with jest-axe

---

## Open Questions for Product/Design

1. Should we show a success indicator when validation passes? (adds positive feedback but may clutter UI)
2. Should error icons be added for visual reinforcement? (improves scannability but adds visual weight)
3. Should we prevent layout shift with min-height error containers? (better UX but adds empty space)
4. Should validation run on change after first error? (progressive validation - more responsive but may be noisy)

---

## Conclusion

This story enhances form validation without changing the existing design. Focus on:
- **Accessibility** - WCAG AA compliance with proper ARIA
- **Usability** - Clear errors, keyboard support, logical flow
- **Consistency** - Match existing LEGO theme and patterns
- **Performance** - React Hook Form for optimal re-render behavior

All recommendations align with CLAUDE.md design principles (accessibility-first, LEGO-inspired theme) and existing component patterns.
