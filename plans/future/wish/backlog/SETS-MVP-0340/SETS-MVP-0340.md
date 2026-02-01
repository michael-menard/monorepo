---
doc_type: story
title: "SETS-MVP-0340: Form Validation"
story_id: SETS-MVP-0340
story_prefix: SETS-MVP
status: backlog
split_from: SETS-MVP-003
split_part: 4 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-01-31T15:30:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
---

# SETS-MVP-0340: Form Validation

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 4 of 4 (Form validation and accessibility)
- **Dependency:** Depends on SETS-MVP-0310 (Status Update Flow)

## Context

The purchase details form (SETS-MVP-0310) captures price information and purchase dates from users. This story adds client-side validation to ensure data integrity and keyboard accessibility to ensure all users can complete the purchase flow efficiently.

This is a polish story that ensures the form meets quality and accessibility standards.

## Goal

Ensure purchase data is valid (price formats, date constraints) and the form is fully accessible via keyboard, meeting WCAG accessibility standards.

## Non-goals

- Server-side validation (backend should still validate, but not in scope of this story)
- Complex validation rules (e.g., price comparison with retail price)
- Custom validation error messages (use default error messages for MVP)
- Touch/gesture accessibility (focus on keyboard only)

## Scope

Add client-side validation for price fields (decimal format, range constraints) and purchase date (cannot be in future). Ensure full keyboard accessibility with proper tab order and enter-to-submit support. Validation should provide clear error messages and prevent form submission with invalid data.

## Acceptance Criteria

### Form Validation
- [ ] AC18: Price fields accept valid decimals only (0.00 - 999999.99)
- [ ] AC19: Purchase date cannot be in the future
- [ ] AC20: Form is keyboard accessible (tab order, enter to submit)

## Reuse Plan

### Existing Components
- Purchase details form (from SETS-MVP-0310)
- Form components from `@repo/ui` (Input, Select, Button)
- Existing form validation utilities (if any)

### Shared Packages
- `@repo/ui` - Form components with built-in validation support
- `@repo/accessibility` - Keyboard navigation utilities (if exists)
- Zod - Schema validation (for form validation)

### New Components
- Validation schemas for purchase form
- May need to enhance existing Input components with validation props

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        PurchaseDetailsStep/
          index.tsx                    # Add validation logic
          __types__/
            index.ts                   # Zod validation schemas
```

### Validation Schema (Zod)

```typescript
// PurchaseDetailsStep/__types__/index.ts
import { z } from 'zod'

export const PurchaseDetailsFormSchema = z.object({
  purchaseDate: z.date()
    .max(new Date(), "Purchase date cannot be in the future"),
  purchasePrice: z.number()
    .min(0, "Price must be positive")
    .max(999999.99, "Price must be less than 1,000,000")
    .optional(),
  purchaseTax: z.number()
    .min(0, "Tax must be positive")
    .max(999999.99, "Tax must be less than 1,000,000")
    .optional(),
  purchaseShipping: z.number()
    .min(0, "Shipping must be positive")
    .max(999999.99, "Shipping must be less than 1,000,000")
    .optional(),
  buildStatus: z.enum(['in_pieces', 'built']),
})

export type PurchaseDetailsForm = z.infer<typeof PurchaseDetailsFormSchema>
```

### Keyboard Accessibility

```typescript
// Ensure proper tab order
<form onKeyDown={(e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  }
}}>
  <Input name="purchaseDate" tabIndex={1} />
  <Input name="purchasePrice" tabIndex={2} />
  <Input name="purchaseTax" tabIndex={3} />
  <Input name="purchaseShipping" tabIndex={4} />
  <Select name="buildStatus" tabIndex={5} />
  <Button type="button" onClick={handleSkip} tabIndex={6}>Skip</Button>
  <Button type="submit" tabIndex={7}>Save</Button>
</form>
```

## Test Plan

### Unit Tests
- `PurchaseDetailsStep.test.tsx` updates:
  - Price validation: Rejects negative numbers
  - Price validation: Rejects numbers > 999999.99
  - Price validation: Accepts valid decimals (0.00 - 999999.99)
  - Date validation: Rejects future dates
  - Date validation: Accepts today and past dates
  - Keyboard: Tab order is correct
  - Keyboard: Enter key submits form
  - Keyboard: Focus management after validation error

### Integration Tests
- Form submission:
  - Valid data passes validation and submits
  - Invalid data shows error messages and prevents submission
  - Error messages are cleared when user corrects input

### E2E Tests (Playwright)
- Keyboard navigation: User can navigate entire form with Tab key
- Keyboard submission: User can submit form with Enter key
- Validation errors: Invalid input shows error message
- Validation recovery: User can correct errors and resubmit

## Risks / Edge Cases

### Edge Cases
1. **Decimal precision**: User enters more than 2 decimal places (e.g., 9.999)
   - Mitigation: Round to 2 decimal places or show validation error
   - Recommendation: Round to 2 places on blur

2. **Large numbers**: User enters scientific notation (e.g., 1e6)
   - Mitigation: Input type="number" may accept this - add pattern validation
   - Alternative: Parse and validate in Zod schema

3. **Negative numbers**: User may enter negative sign via keyboard
   - Mitigation: Input type="number" with min="0" should prevent this
   - Fallback: Zod validation catches negative numbers

4. **Future date edge case**: User's clock is wrong
   - Mitigation: Client-side validation uses client's clock (acceptable)
   - Backend should also validate using server time

5. **Tab order with optional fields**: Skip button vs Save button focus
   - Mitigation: Ensure logical tab order (form fields → Skip → Save)

6. **Screen reader announcements**: Validation errors should be announced
   - Mitigation: Use aria-live region for error messages
   - Ensure form fields have aria-invalid when errors present

### Low-Priority Risks
- Custom number formatting (e.g., currency symbols) - out of scope for MVP
- Autocomplete behavior for price fields
- Browser autofill conflicts with validation

## Definition of Done

- [ ] Price fields validate decimal format (0.00 - 999999.99)
- [ ] Price validation prevents negative numbers
- [ ] Purchase date validation prevents future dates
- [ ] Proper tab order through all form fields
- [ ] Enter key submits form
- [ ] Validation error messages are clear and accessible
- [ ] All tests pass (unit, integration, E2E)
- [ ] Code review completed
- [ ] No regression in purchase flow

---

## Implementation Notes

### Validation Approach
Use Zod schemas for validation (per CLAUDE.md requirement):
- Define schema in `__types__/index.ts`
- Use schema for both client-side and type inference
- Integrate with form library (React Hook Form recommended)

### Form Library Options
1. **React Hook Form** (recommended)
   - Built-in Zod integration
   - Excellent performance
   - Good accessibility support

2. **Formik**
   - More boilerplate
   - Requires manual Zod integration

3. **Manual state management**
   - More code to write
   - Full control over validation logic

Recommendation: React Hook Form for better DX and built-in validation.

### Input Component Enhancement
Check `@repo/ui` Input component:
- Should support `type="number"` with min/max
- Should support error states and messages
- Should have proper ARIA attributes (aria-invalid, aria-describedby)

If Input component lacks validation support:
- Enhance it in `@repo/ui` (preferred - benefits all apps)
- Or create wrapper in app-wishlist-gallery (quick fix)

### Accessibility Checklist
Per CLAUDE.md design system (accessibility-first):
- [ ] All inputs have labels (visible or aria-label)
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Error state visually indicated and announced (aria-invalid)
- [ ] Keyboard navigation works without mouse
- [ ] Focus indicators are visible
- [ ] Tab order is logical
- [ ] Enter key submits form

### Date Input Consideration
HTML `<input type="date">` has built-in future date prevention via `max` attribute:
```html
<input type="date" max={new Date().toISOString().split('T')[0]} />
```
But still validate in Zod schema for fallback.
