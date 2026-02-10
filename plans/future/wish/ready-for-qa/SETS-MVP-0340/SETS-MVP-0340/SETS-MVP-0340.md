---
doc_type: story
title: "SETS-MVP-0340: Form Validation"
story_id: SETS-MVP-0340
story_prefix: SETS-MVP
status: in-progress
split_from: SETS-MVP-003
split_part: 4 of 4
phase: 2
created_at: "2026-01-31T15:30:00-07:00"
updated_at: "2026-02-09T21:30:00-07:00"
depends_on: [SETS-MVP-0310]
estimated_points: 1
experiment_variant: control
---

# SETS-MVP-0340: Form Validation

## Split Context

This story is part of a split from SETS-MVP-003.
- **Original Story:** SETS-MVP-003 (Extended Got It Flow)
- **Split Reason:** Story was too large (20 ACs across 4 independent feature areas) with critical architecture violations and blocking dependencies
- **This Part:** 4 of 4 (Form validation and accessibility)
- **Dependency:** Depends on SETS-MVP-0310 (Status Update Flow)

## Context

The purchase details form in the GotItModal (implemented in SETS-MVP-0310) currently has basic regex-based validation for price fields and HTML5 date constraints. While functional, it lacks comprehensive validation (range constraints), uses manual error state management, and does not meet full keyboard accessibility requirements or WCAG compliance standards.

### Current State
- Price fields accept any decimal but don't enforce the 0.00-999999.99 range
- Validation logic is manual (regex-based), not Zod-based (violates CLAUDE.md)
- No keyboard-only form submission (Enter key doesn't submit)
- Error messages are hardcoded instead of using shared validation library
- Form state management is manual (useState), React Hook Form is already available but unused

### Problem
Users entering purchase details may submit invalid data (negative prices, future dates, out-of-range values). Keyboard-only users cannot efficiently complete the form. Screen reader users may not receive clear feedback about validation errors.

## Goal

Ensure purchase data is valid through comprehensive Zod schema validation (price formats 0.00-999999.99, date constraints) and make the form fully accessible via keyboard with proper WCAG compliance (ARIA attributes, focus management, keyboard navigation).

This is a **polish and compliance story** that brings the purchase form up to quality standards without changing functionality.

## Non-goals

- Server-side validation changes (backend should validate independently, but not in scope)
- Custom error message templates (use `validation-messages.ts` library)
- Complex validation rules (e.g., price comparison with retail price, tax percentage validation)
- Touch/gesture accessibility (keyboard only for this story)
- Form field masking or formatting (e.g., auto-inserting decimal points)
- Decimal precision handling beyond validation (e.g., rounding on blur)
- Negative number input prevention at keystroke level (Zod validation + HTML5 input type="number" with min="0" is sufficient)
- Currency symbol handling (already has static "$" prefix, no changes needed)

## Scope

Refactor the GotItModal purchase details form to use React Hook Form + Zod for validation, enforce price range constraints (0.00-999999.99), add keyboard accessibility (Enter to submit, proper tab order), and ensure WCAG compliance with proper ARIA attributes for errors.

### Surfaces
- **Frontend:** GotItModal component (`apps/web/app-wishlist-gallery/src/components/GotItModal/`)

### Packages
- **Apps:** `app-wishlist-gallery` (form refactoring)
- **Shared:** `@repo/app-component-library` (validation-messages.ts library)

## Acceptance Criteria

### AC18: Price fields accept valid decimals only (0.00 - 999999.99)
- [ ] Price Paid field validates decimal format and range
- [ ] Tax field validates decimal format and range
- [ ] Shipping field validates decimal format and range
- [ ] Use Zod schema validation with min/max constraints
- [ ] Display clear error message when value is out of range
- [ ] Use `createEnhancedSchemas.price()` from validation-messages.ts
- [ ] Validation happens on blur and on submit
- [ ] Error messages use validation-messages.ts library (not hardcoded)
- [ ] Boundary tests: 0.00 accepted, 999999.99 accepted, -0.01 rejected, 1000000.00 rejected
- [ ] Decimal precision: 99.99 accepted, 99.999 rejected
- [ ] Empty values accepted (optional fields)

### AC19: Purchase date cannot be in the future
- [ ] HTML5 date input has `max={getTodayDateString()}` (already implemented)
- [ ] Add Zod schema validation as fallback (client-side protection if HTML5 bypassed)
- [ ] Display error message if future date somehow entered
- [ ] Use `validationMessages.date.past('Purchase Date')` for error text
- [ ] Validation happens on blur and on submit
- [ ] Date validation tests: today accepted, past dates accepted, future dates rejected

### AC20: Form is keyboard accessible (tab order, enter to submit)
- [ ] Natural tab order through all form fields: date → price → tax → shipping → build status → Skip → Save
- [ ] No explicit tabIndex attributes unless DOM order cannot be fixed
- [ ] Enter key submits form (same as clicking Save button)
- [ ] Enter key does not submit if validation errors exist
- [ ] Esc key closes modal (already implemented, maintain behavior)
- [ ] Focus management: first error field focused when validation fails on submit
- [ ] All inputs have proper labels (already implemented, verify no regression)
- [ ] Error messages associated with inputs via `aria-describedby`
- [ ] Error state indicated via `aria-invalid="true"`
- [ ] Error messages have `role="alert"` for screen reader announcement
- [ ] Focus indicators visible for all interactive elements
- [ ] Keyboard navigation tests: Tab order verified, Enter submission tested, Esc close tested
- [ ] Screen reader tests: NVDA/JAWS/VoiceOver announce errors correctly

### AC21: Price schema handles HTML input string-to-number conversion
- [ ] Use React Hook Form `valueAsNumber` option for number input fields
- [ ] Register price fields with: `register('pricePaid', { valueAsNumber: true })`
- [ ] Register tax field with: `register('tax', { valueAsNumber: true })`
- [ ] Register shipping field with: `register('shipping', { valueAsNumber: true })`
- [ ] Zod schema validation receives number type (not string) from form
- [ ] HTML5 `step="0.01"` enforces decimal precision at input level
- [ ] Empty values handled correctly (optional fields return undefined with valueAsNumber)
- [ ] Type consistency test: Verify form values match PurchaseDetailsForm type (numbers not strings)
- [ ] Decimal precision enforcement: HTML5 step + Zod validation work together (99.999 rejected)
_Added by autonomous elaboration to resolve type mismatch between Zod schema (expects number) and React Hook Form register() (returns string by default)_

## Reuse Plan

### Components to Enhance
- `GotItModal` (`apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`)
  - Refactor from manual validation to React Hook Form
  - Add Zod schema in `__types__/index.ts`
  - Add keyboard event handling (Enter to submit)
  - Add ARIA attributes (aria-invalid, aria-describedby)

### Shared Packages to Use
- `react-hook-form` (already installed: v7.71.1)
- `@hookform/resolvers/zod` (already installed: v5.2.2)
- `@repo/app-component-library` - validation-messages.ts library
- `zod` (already installed: v3.25.76)

### Patterns to Follow
- **LoginPage.tsx** - React Hook Form + Zod pattern
  - Use `useForm` hook with `zodResolver`
  - Set `mode: 'onBlur'` for validation timing
  - Use `register()` for input fields
  - Use `handleSubmit()` for form submission

- **validation-messages.ts** - Enhanced schemas
  - Use `createEnhancedSchemas.price()` for price fields
  - Use `validationMessages.date.past()` for date error
  - Use `validationMessages.number.*` for number errors

- **useKeyboardShortcuts.ts** - Keyboard event handling
  - Pattern for scoped keyboard event handlers
  - `shouldIgnoreKeyEvent()` utility

- **utils/a11y.ts** - Accessibility utilities
  - `focusRingClasses` for consistent focus styling
  - ARIA announcement patterns for form errors

## Architecture Notes

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    components/
      GotItModal/
        index.tsx                    # Main modal component (refactor target)
        __types__/
          index.ts                   # Add: PurchaseDetailsFormSchema
        __tests__/
          GotItModal.test.tsx        # Update: Add validation tests
          validation.test.tsx        # New: Focused validation tests
          keyboard.test.tsx          # New: Keyboard accessibility tests
          accessibility.test.tsx     # New: ARIA attribute tests
```

### Validation Schema (Zod)

```typescript
// GotItModal/__types__/index.ts
import { z } from 'zod'
import { createEnhancedSchemas, validationMessages } from '@repo/app-component-library/forms/validation-messages'

export const PurchaseDetailsFormSchema = z.object({
  purchaseDate: z.string().refine(
    (date) => {
      if (!date) return true // Optional field
      return new Date(date) <= new Date()
    },
    { message: validationMessages.date.past('Purchase date') }
  ),
  pricePaid: createEnhancedSchemas.price('Price paid').optional(),
  tax: createEnhancedSchemas.price('Tax').optional(),
  shipping: createEnhancedSchemas.price('Shipping').optional(),
  buildStatus: z.enum(['not_started', 'in_progress', 'completed']),
})

export type PurchaseDetailsForm = z.infer<typeof PurchaseDetailsFormSchema>
```

### React Hook Form Integration

```typescript
// GotItModal/index.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PurchaseDetailsFormSchema, type PurchaseDetailsForm } from './__types__'

const {
  register,
  handleSubmit,
  formState: { errors },
  reset,
  setFocus,
} = useForm<PurchaseDetailsForm>({
  resolver: zodResolver(PurchaseDetailsFormSchema),
  mode: 'onBlur', // Validate on blur, not on change
  reValidateMode: 'onChange', // Re-validate on change after first error
  defaultValues: {
    purchaseDate: getTodayDateString(),
    pricePaid: item.price || '',
    tax: '',
    shipping: '',
    buildStatus: 'not_started',
  },
})

const onSubmit = async (data: PurchaseDetailsForm) => {
  // Existing submission logic
  await updateItemStatus({
    id: item.id,
    status: 'got_it',
    purchaseDate: data.purchaseDate,
    pricePaid: data.pricePaid ? parseFloat(data.pricePaid) : undefined,
    tax: data.tax ? parseFloat(data.tax) : undefined,
    shipping: data.shipping ? parseFloat(data.shipping) : undefined,
    buildStatus: data.buildStatus,
  })
}
```

### Keyboard Accessibility

```typescript
// Add form-level keyboard handler
const onKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !isPurchasing) {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  },
  [handleSubmit, onSubmit, isPurchasing]
)

// Focus management on error
const onSubmitWithErrorFocus = handleSubmit(
  onSubmit,
  (errors) => {
    const firstErrorField = Object.keys(errors)[0] as keyof PurchaseDetailsForm
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }
)

return (
  <form onSubmit={onSubmitWithErrorFocus} onKeyDown={onKeyDown}>
    {/* ... form inputs ... */}
  </form>
)
```

### Input Field Updates

```typescript
// Update inputs with validation props
<Input
  {...register('pricePaid')}
  id="pricePaid"
  type="number"
  step="0.01"
  min="0"
  max="999999.99"
  aria-invalid={!!errors.pricePaid}
  aria-describedby={errors.pricePaid ? 'pricePaid-error' : undefined}
  className={cn(
    focusRingClasses,
    errors.pricePaid && "border-red-500 focus:ring-red-500"
  )}
/>
{errors.pricePaid && (
  <p
    id="pricePaid-error"
    className="text-sm text-red-600 dark:text-red-400 mt-1"
    role="alert"
  >
    {errors.pricePaid.message}
  </p>
)}
```

## Test Plan

Comprehensive test plan available at: `_pm/TEST-PLAN.md`

### Test Coverage Summary

**Unit Tests:**
- Price validation: boundary values, decimal precision, empty values, non-numeric input
- Date validation: today, past dates, future dates, HTML5 max attribute, Zod fallback
- Keyboard accessibility: tab order, Enter key submission, Esc key modal close
- Focus management: focus moves to first error field on validation failure
- ARIA attributes: aria-invalid, aria-describedby, role="alert", error clearing

**Integration Tests:**
- Form submission with valid data passes validation and submits
- Form submission with invalid data shows errors and prevents submission
- Error messages clear when user corrects input
- Optional fields can be left empty
- Validation does not run while form is submitting

**E2E Tests (Playwright):**
- Keyboard navigation: Tab through all fields in logical order
- Enter key submits form from any field
- Esc key closes modal
- Validation errors display correctly
- Errors clear when input is corrected
- Screen reader compatibility (axe-core audit)
- Focus indicators visible
- ARIA attributes correct

**Manual Testing:**
- Test with keyboard only (no mouse)
- Test with NVDA/JAWS screen reader (Windows)
- Test with VoiceOver (macOS)
- Test in dark mode
- Test on mobile (responsive layout)

**Target Coverage:** 90%+ for validation logic, 45% global minimum (per CLAUDE.md)

## UI/UX Notes

Comprehensive UI/UX recommendations available at: `_pm/UIUX-NOTES.md`

### Design Principles
- **Accessibility-First:** WCAG POUR principles (Perceivable, Operable, Understandable, Robust)
- **Progressive Enhancement:** HTML5 validation + Zod fallback + backend validation
- **Consistency:** Maintain LEGO Sky/Teal color palette, existing modal layout

### Error Display Pattern

**Enhanced Error Styling:**
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
- `text-red-600` for better contrast (WCAG AA: 4.56:1)
- `dark:text-red-400` for dark mode support (WCAG AA: 4.8:1)
- `role="alert"` for immediate screen reader announcement
- `mt-1` for consistent spacing below input

### Focus Management
- Focus rings use existing `focusRingClasses` from utils/a11y.ts
- Red focus ring on error state (`focus:ring-red-500`)
- First error field receives focus when validation fails on submit
- Visible focus indicators (minimum 2px outline, 3:1 contrast)

### Validation Timing
- **On Blur (Primary):** Validate when user leaves field (non-intrusive)
- **On Submit (Always):** Validate all fields on submit attempt
- **NOT On Change:** Avoid validating on every keystroke (interrupts user flow)
- **Exception:** Clear error on change if field was previously invalid (progressive validation)

### Responsive Considerations
- Layout shift prevention: `min-h-[calc(theme(spacing.4)+theme(fontSize.sm))]` for error containers
- Error text uses `break-words` for long messages
- Test that errors don't overflow or overlap inputs on mobile

### Accessibility Checklist
- [ ] Error messages have sufficient color contrast (WCAG AA: 4.5:1)
- [ ] Error states indicated with more than color (border + text + icon optional)
- [ ] Labels visible for all inputs
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Focus indicators visible (minimum 2px outline)
- [ ] Tab order follows logical reading order
- [ ] Error messages clear and actionable
- [ ] Valid HTML5 (no duplicate IDs)
- [ ] Proper ARIA attributes (aria-invalid, aria-describedby, role="alert")

## Dev Feasibility Review

Comprehensive feasibility review available at: `_pm/DEV-FEASIBILITY.md`

### Feasibility Rating: ✅ **HIGH** (Low risk, well-established patterns)

**Estimated Complexity:** LOW (1 story point)
**Estimated Duration:** 1-2 days (12-15 hours)
**Blocking Dependencies:** SETS-MVP-0310 (Status Update Flow) in UAT

### Implementation Phases

**Phase 1: Schema Definition** (30 minutes)
- Create `__types__/index.ts` with Zod schema
- Export `PurchaseDetailsFormSchema` and type
- Write unit tests for schema validation

**Phase 2: React Hook Form Integration** (2-3 hours)
- Import useForm, zodResolver
- Replace useState with useForm hook
- Update onSubmit handler
- Remove manual validation logic (`isValidPrice`, `validate` functions)

**Phase 3: Input Field Updates** (2 hours)
- Update all inputs to use `register()`
- Add HTML5 validation attributes (type, min, max, step)
- Add ARIA attributes (aria-invalid, aria-describedby)
- Style error states (red border, focus ring)
- Update error message display (role="alert")

**Phase 4: Keyboard Accessibility** (1 hour)
- Add form-level onKeyDown handler
- Implement Enter key submission
- Add focus management on error
- Verify natural tab order

**Phase 5: Test Updates** (4-6 hours)
- Write validation.test.tsx (boundary + edge cases)
- Write keyboard.test.tsx (tab order, Enter key)
- Write accessibility.test.tsx (ARIA attributes)
- Update GotItModal.test.tsx (integration tests)
- Write E2E tests (Playwright)

**Phase 6: Manual QA** (2-3 hours)
- Test keyboard navigation
- Test with screen readers
- Test in dark mode
- Test on mobile

### Risk Assessment

**Low Risks:**
- HTML5 input limitations (Zod validation catches edge cases)
- Date validation bypass (Zod + backend validation as fallback)
- Uncontrolled input behavior (React Hook Form is battle-tested)

**Mitigated Risks:**
- Regression in existing flow (mitigated by comprehensive tests)
- Screen reader compatibility (mitigated by manual testing with NVDA/JAWS)

**No High Risks Identified**

### Reuse Analysis

**Existing Patterns:**
- React Hook Form pattern from LoginPage.tsx
- Validation messages library (createEnhancedSchemas.price())
- Accessibility utils (focusRingClasses from utils/a11y.ts)
- Keyboard event handling patterns (useKeyboardShortcuts.ts)

**Performance Considerations:**
- React Hook Form uses uncontrolled inputs (better performance)
- Validation only runs on blur and submit (not on every keystroke)
- Zod schema validation is fast for simple types (O(1) for price/date)
- Expected performance impact: Negligible

## Risk Predictions

Comprehensive risk predictions available at: `_pm/RISK-PREDICTIONS.yaml`

### Split Risk: **LOW** (0.1)
- Story is well-scoped (1 point, 3 ACs, refactoring existing form)
- No complex validation rules or multi-surface changes
- Clear acceptance criteria focused on validation and keyboard accessibility

### Review Cycles: **1 cycle (estimated)**
- Well-established pattern (React Hook Form + Zod used in LoginPage)
- Clear, testable acceptance criteria
- Risk factors: Screen reader compatibility, ARIA correctness (common review feedback)

### Token Estimate: **26,000 tokens**
- Planning: 8k tokens (story seed + worker outputs)
- Implementation: 15k tokens (schema, form refactoring, keyboard handler, tests)
- Review: 3k tokens (minor feedback on ARIA attributes or test coverage)

### Complexity Factors
- **Technical Complexity:** Low (established pattern, reuses validation library)
- **Integration Complexity:** Low (no API changes, isolated to GotItModal)
- **Testing Complexity:** Medium (accessibility testing requires manual screen reader testing)

### Blocking Risks
1. **SETS-MVP-0310 not merged** (likelihood: medium, impact: high, status: tracked)
2. **Screen reader compatibility issues** (likelihood: low, impact: medium, status: mitigated)
3. **HTML5 input validation bypassed** (likelihood: low, impact: low, status: mitigated)

### Success Factors
- Established pattern (React Hook Form used in LoginPage)
- Existing validation library (createEnhancedSchemas.price())
- All packages already installed (no dependency additions)
- Clear acceptance criteria (testable outcomes)
- Limited scope (refactoring existing component only)
- No API changes (no backend coordination needed)

## Risks / Edge Cases

### Edge Cases

1. **Decimal precision**: User enters more than 2 decimal places (e.g., 99.999)
   - **Mitigation:** Zod schema rejects invalid precision, show validation error
   - **Alternative:** Could round to 2 places on blur (not recommended for MVP)

2. **Large numbers**: User enters scientific notation (e.g., 1e6)
   - **Mitigation:** Zod schema validates parsed number, HTML5 input type="number" handles parsing
   - **Test:** Add boundary test for scientific notation

3. **Negative numbers**: User may enter negative sign via keyboard
   - **Mitigation:** HTML5 input type="number" with min="0" should prevent
   - **Fallback:** Zod validation catches negative numbers

4. **Future date edge case**: User's clock is wrong
   - **Mitigation:** Client-side validation uses client's clock (acceptable)
   - **Backend should also validate using server time** (not in scope)

5. **Tab order with optional fields**: Skip button vs Save button focus
   - **Mitigation:** Natural DOM order ensures logical tab order
   - **Test:** Tab order verification test

6. **Screen reader announcements**: Validation errors should be announced
   - **Mitigation:** Use `role="alert"` for error messages
   - **Test:** Manual screen reader testing with NVDA/JAWS/VoiceOver
   - **Ensure:** form fields have aria-invalid when errors present

### Low-Priority Risks
- Custom number formatting (e.g., currency symbols) - out of scope for MVP
- Autocomplete behavior for price fields - browser default is acceptable
- Browser autofill conflicts with validation - handle gracefully

## Definition of Done

- [ ] Price fields validate decimal format (0.00 - 999999.99)
- [ ] Price validation prevents negative numbers and values above max
- [ ] Purchase date validation prevents future dates
- [ ] Price schema correctly handles string-to-number conversion using valueAsNumber option (AC21)
- [ ] Proper tab order through all form fields (natural DOM order, no explicit tabIndex)
- [ ] Enter key submits form
- [ ] Validation error messages are clear and accessible
- [ ] Error messages use validation-messages.ts library (not hardcoded)
- [ ] ARIA attributes correct (aria-invalid, aria-describedby, role="alert")
- [ ] Focus management: first error field focused on submit failure
- [ ] All tests pass (unit, integration, E2E)
- [ ] Test coverage meets 45% minimum (target 90% for validation logic)
- [ ] Manual accessibility testing completed (NVDA/JAWS/VoiceOver)
- [ ] Passes axe-core accessibility audit (E2E test)
- [ ] Code review completed
- [ ] No regression in purchase flow
- [ ] SETS-MVP-0310 merged before implementation starts

---

## Implementation Notes

### Validation Approach
Use Zod schemas for validation (per CLAUDE.md requirement):
- Define schema in `__types__/index.ts`
- Use schema for both client-side validation and type inference
- Integrate with React Hook Form via zodResolver
- Reuse validation-messages.ts library for error messages

### Form Library: React Hook Form (Recommended)
- Built-in Zod integration via @hookform/resolvers
- Excellent performance (uncontrolled inputs)
- Good accessibility support
- Already used in LoginPage.tsx (established pattern)

**Do NOT use:**
- Manual state management (current approach - violates CLAUDE.md)
- Formik (more boilerplate, not used in codebase)
- Yup (CLAUDE.md requires Zod)

### Input Component Enhancement
Check `@repo/app-component-library` Input component:
- Should support `type="number"` with min/max
- Should support error states and messages
- Should have proper ARIA attributes (aria-invalid, aria-describedby)

**If Input lacks validation support:**
- Enhance it in `@repo/app-component-library` (preferred - benefits all apps)
- Or add props directly to input elements (quick fix)

### Accessibility Checklist
Per CLAUDE.md design system (accessibility-first):
- [ ] All inputs have labels (visible or aria-label)
- [ ] Error messages associated with inputs (aria-describedby)
- [ ] Error state visually indicated and announced (aria-invalid)
- [ ] Keyboard navigation works without mouse
- [ ] Focus indicators are visible (focusRingClasses from utils/a11y.ts)
- [ ] Tab order is logical (natural DOM order)
- [ ] Enter key submits form
- [ ] Esc key closes modal (already implemented)

### Date Input Consideration
HTML `<input type="date">` has built-in future date prevention via `max` attribute:
```html
<input type="date" max={new Date().toISOString().split('T')[0]} />
```
**Already implemented in SETS-MVP-0310.** Add Zod validation as fallback for robustness.

---

## Reality Baseline

### Existing Features (From Seed)

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| GotItModal Component | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | **Implemented** (SETS-MVP-0310) | Core component to enhance |
| Price validation (basic) | GotItModal | **Implemented** | Basic regex (`isValidPrice` function), needs replacement |
| Date input with max | GotItModal | **Implemented** | HTML5 `max={getTodayDateString()}` |
| Validation Messages Library | `packages/core/app-component-library/src/forms/validation-messages.ts` | **Available** | Reusable validation messages and Zod schemas |
| Enhanced Zod Schemas | validation-messages.ts | **Available** | `createEnhancedSchemas.price()` (0-999999.99) |
| React Hook Form | app-wishlist-gallery | **Installed** (v7.71.1) | Available for form state management |
| @hookform/resolvers | app-wishlist-gallery | **Installed** (v5.2.2) | Available for Zod integration |

### Dependencies

**Blocking:**
- **SETS-MVP-0310 (Status Update Flow)** - Status: UAT
  - This story enhances the GotItModal component from SETS-MVP-0310
  - Must wait for SETS-MVP-0310 to merge before starting implementation

**No Other Dependencies**

### Constraints (From CLAUDE.md)

1. **Zod-First Types (REQUIRED):** All validation must use Zod schemas, never TypeScript interfaces
2. **Component Directory Structure:** Follow `__types__/`, `__tests__/`, `utils/` pattern
3. **No Barrel Files:** Import directly from source files
4. **Accessibility-First:** WCAG compliance required, keyboard navigation mandatory
5. **Use @repo/app-component-library:** Import UI components, never from individual paths
6. **Use @repo/logger:** Never use `console.log`
7. **Minimum Coverage:** 45% global test coverage required
8. **React Hook Form Recommended:** LoginPage uses React Hook Form + Zod resolver pattern

### Active In-Progress Work (From Seed)

| Story | Status | Potential Overlap |
|-------|--------|-------------------|
| SETS-MVP-0310 | **UAT** | **BLOCKING** - This story extends GotItModal from SETS-MVP-0310 |
| WISH-2124 | **UAT** | No overlap - unrelated feature |

**No conflicts detected.**

---

## Story Metadata

**Generated:** 2026-02-09
**Experiment Variant:** control
**Story Seed:** `_pm/STORY-SEED.md`
**Worker Artifacts:**
- Test Plan: `_pm/TEST-PLAN.md`
- UI/UX Notes: `_pm/UIUX-NOTES.md`
- Dev Feasibility: `_pm/DEV-FEASIBILITY.md`
- Risk Predictions: `_pm/RISK-PREDICTIONS.yaml`

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-09_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| 1 | Price validation schema type mismatch: createEnhancedSchemas.price() expects z.number() but HTML form inputs produce strings via register() | Use React Hook Form valueAsNumber option to convert HTML input string to number before Zod validation | AC21 |

### Non-Blocking Items (Logged to KB)

25 non-blocking findings identified and logged to KB for future consideration:

| Category | Count | Examples |
|----------|-------|----------|
| Edge Cases | 4 | Scientific notation handling, negative sign prevention, browser autofill compatibility, decimal rounding |
| UX Polish | 8 | Layout shift prevention, success state indicator, error icons, number formatting, field masking, keyboard shortcuts |
| Future Work | 4 | Async validation, touch accessibility, currency localization, advanced validation rules |
| Observability | 3 | Form analytics, A/B testing validation timing, CI/CD accessibility automation |
| Reusability | 4 | Decimal precision in shared schema, extracted validated components, enhanced library patterns |
| Integration | 2 | Voice input accessibility, smart defaults from item history |

**Priority Recommendations:**
- **Short-term (next sprint):** Layout shift prevention, decimal precision in shared schema
- **Medium-term (next quarter):** CI/CD accessibility automation, shared validated components
- **Long-term (6+ months):** Currency localization, advanced validation rules

### Summary

- **ACs added:** 1 (AC21 for valueAsNumber approach)
- **KB entries created:** 25 (non-blocking enhancements)
- **Mode:** Autonomous
- **Verdict:** CONDITIONAL PASS
- **Story Status:** Ready for implementation pending SETS-MVP-0310 merge
- **Implementation Confidence:** HIGH (established pattern, all packages available, type mismatch resolved)
