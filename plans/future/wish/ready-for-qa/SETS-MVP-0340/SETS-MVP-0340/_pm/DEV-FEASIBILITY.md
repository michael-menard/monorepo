# Dev Feasibility Review: SETS-MVP-0340 - Form Validation

**Generated:** 2026-02-09
**Story:** SETS-MVP-0340 (Form Validation)
**Reviewer:** PM Dev Feasibility Agent

---

## Executive Summary

**Feasibility Rating:** ✅ **HIGH** (Low risk, well-established patterns)

This story refactors the existing GotItModal form to use React Hook Form + Zod validation. All required packages are already installed, patterns are established in the codebase (LoginPage), and the scope is limited to enhancing an existing component without API changes.

**Estimated Complexity:** **LOW** (1 story point)
**Estimated Duration:** 1-2 days
**Blocking Dependencies:** SETS-MVP-0310 (Status Update Flow) in UAT

---

## Technical Assessment

### Architecture Review

**Component Hierarchy:**
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
```

**Package Dependencies:**
- ✅ react-hook-form v7.71.1 (installed)
- ✅ @hookform/resolvers v5.2.2 (installed)
- ✅ zod v3.25.76 (installed)
- ✅ @repo/app-component-library (contains validation-messages.ts)

**No new dependencies required.**

---

## Implementation Plan

### Phase 1: Schema Definition

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/__types__/index.ts`

```typescript
import { z } from 'zod'
import { createEnhancedSchemas, validationMessages } from '@repo/app-component-library/forms/validation-messages'

// Purchase Details Form Schema
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

**Rationale:**
- Uses existing `createEnhancedSchemas.price()` from validation library (0-999999.99 range)
- Date validation uses Zod `refine()` for custom logic (HTML5 max is first defense)
- All price fields are optional (per AC)
- Build status uses enum for type safety

**Estimated Time:** 30 minutes

---

### Phase 2: React Hook Form Integration

**File:** `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`

**Current State (Manual Validation):**
```typescript
const [pricePaid, setPricePaid] = useState<string>('')
const [tax, setTax] = useState<string>('')
const [shipping, setShipping] = useState<string>('')
const [errors, setErrors] = useState<Record<string, string>>({})

function isValidPrice(value: string): boolean {
  if (!value) return true
  return /^\d+(\.\d{1,2})?$/.test(value)
}

const validate = useCallback((): boolean => {
  const newErrors: Record<string, string> = {}
  if (pricePaid && !isValidPrice(pricePaid)) {
    newErrors.pricePaid = 'Price must be a valid decimal (e.g., 99.99)'
  }
  // ... more validation
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}, [pricePaid, tax, shipping])
```

**New State (React Hook Form):**
```typescript
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

**Key Changes:**
1. Replace `useState` for form fields with `useForm` hook
2. Set `mode: 'onBlur'` for validation timing (per UX requirements)
3. Use `zodResolver` for Zod schema integration
4. Remove manual `isValidPrice` and `validate` functions
5. Update `onSubmit` to use React Hook Form's `handleSubmit`

**Estimated Time:** 2-3 hours

---

### Phase 3: Input Field Updates

**Current Input (Controlled):**
```typescript
<input
  type="text"
  value={pricePaid}
  onChange={(e) => setPricePaid(e.target.value)}
  className="..."
/>
{errors.pricePaid && (
  <p className="text-sm text-red-500">{errors.pricePaid}</p>
)}
```

**New Input (Uncontrolled with register):**
```typescript
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
    "...",
    errors.pricePaid && "border-red-500 focus:ring-red-500"
  )}
/>
{errors.pricePaid && (
  <p
    id="pricePaid-error"
    className="text-sm text-red-600 mt-1"
    role="alert"
  >
    {errors.pricePaid.message}
  </p>
)}
```

**Key Additions:**
- `{...register('fieldName')}` spreads ref, name, onChange, onBlur
- `type="number"` with `step="0.01"` for decimal input
- `min` and `max` HTML5 attributes (first line of defense)
- `aria-invalid` for screen readers
- `aria-describedby` associates error message with input
- `role="alert"` on error message for immediate announcement
- Red border styling when error present

**Apply to all fields:** pricePaid, tax, shipping, purchaseDate, buildStatus

**Estimated Time:** 2 hours

---

### Phase 4: Keyboard Accessibility

**Add Form-Level Keyboard Handler:**
```typescript
const onKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !isPurchasing) {
      e.preventDefault()
      handleSubmit(onSubmit)()
    }
  },
  [handleSubmit, onSubmit, isPurchasing]
)

return (
  <form onSubmit={handleSubmit(onSubmit)} onKeyDown={onKeyDown}>
    {/* ... form inputs ... */}
  </form>
)
```

**Focus Management on Error:**
```typescript
const onSubmit = async (data: PurchaseDetailsForm) => {
  try {
    await updateItemStatus(...)
  } catch (error) {
    // If submission fails, focus first error field
    const firstErrorField = Object.keys(errors)[0] as keyof PurchaseDetailsForm
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }
}
```

**Tab Order:**
Natural DOM order (no explicit tabIndex needed):
1. Purchase Date input
2. Price Paid input
3. Tax input
4. Shipping input
5. Build Status select
6. Skip button
7. Save button

**Estimated Time:** 1 hour

---

### Phase 5: Test Updates

**New Test Files:**

1. **`validation.test.tsx`** - Focused validation tests
   - Price boundary tests (0.00, 999999.99, -0.01, 1000000.00)
   - Decimal precision tests
   - Date validation tests
   - Empty value tests

2. **`keyboard.test.tsx`** - Keyboard accessibility tests
   - Tab order verification
   - Enter key submission
   - Esc key modal close
   - Focus management on error

3. **`accessibility.test.tsx`** - ARIA attribute tests
   - aria-invalid state
   - aria-describedby association
   - role="alert" on errors
   - Focus indicator visibility

**Update Existing Tests:**

4. **`GotItModal.test.tsx`** - Update for React Hook Form
   - Update mocks to work with uncontrolled inputs
   - Update assertions for new error display
   - Add integration tests for form submission flow

**E2E Tests (Playwright):**

5. **`purchase-form-validation.spec.ts`** - Validation scenarios
6. **`purchase-form-keyboard.spec.ts`** - Keyboard navigation
7. **`purchase-form-a11y.spec.ts`** - Accessibility audit

**Estimated Time:** 4-6 hours

---

## Risk Assessment

### Low Risks

**1. HTML5 Input Limitations**
- **Risk:** `type="number"` inputs don't always respect `step` or `max` on paste
- **Mitigation:** Zod validation catches edge cases HTML5 misses
- **Likelihood:** Low
- **Impact:** Low (Zod is fallback)

**2. Date Validation Bypass**
- **Risk:** HTML5 `max` attribute can be bypassed via DevTools or API calls
- **Mitigation:** Zod schema validates on submit, backend also validates
- **Likelihood:** Low (only malicious users)
- **Impact:** Low (backend catches it)

**3. Controlled vs Uncontrolled Input Behavior**
- **Risk:** React Hook Form uses uncontrolled inputs (different from current controlled inputs)
- **Mitigation:** Thorough testing, React Hook Form is battle-tested
- **Likelihood:** Low
- **Impact:** Low (well-documented pattern)

### Mitigated Risks

**4. Regression in Existing Flow**
- **Risk:** Refactoring form state management could break existing submission logic
- **Mitigation:** Comprehensive unit + integration tests, manual QA
- **Likelihood:** Medium (refactoring existing code)
- **Impact:** Medium (blocks purchase flow)
- **Status:** Mitigated by thorough testing

**5. Screen Reader Compatibility**
- **Risk:** ARIA attributes might not announce correctly on all screen readers
- **Mitigation:** Test with NVDA, JAWS, VoiceOver; use established patterns
- **Likelihood:** Low (using standard ARIA patterns)
- **Impact:** Medium (accessibility bug)
- **Status:** Mitigated by manual testing

### No High Risks Identified

---

## Reuse Analysis

### Existing Patterns to Follow

**1. React Hook Form Pattern (LoginPage.tsx)**
```typescript
// apps/web/main-app/src/routes/pages/LoginPage.tsx

const {
  control,
  handleSubmit,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(LoginFormSchema),
  defaultValues: { email: '', password: '' },
})
```

**Adaptation:**
- Use `register` instead of `control` + `Controller` (simpler for basic inputs)
- Set `mode: 'onBlur'` for validation timing
- Add keyboard handler for Enter key submission

**2. Validation Messages Library**
```typescript
// packages/core/app-component-library/src/forms/validation-messages.ts

export const createEnhancedSchemas = {
  price: (fieldName: string) =>
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, validationMessages.number.format(fieldName))
      .refine(
        (val) => parseFloat(val) >= 0 && parseFloat(val) <= 999999.99,
        { message: validationMessages.number.range(fieldName, 0, 999999.99) }
      ),
}
```

**Reuse:**
- Use `createEnhancedSchemas.price()` for all price fields
- Use `validationMessages.date.past()` for date validation
- No need to write custom validation messages

**3. Accessibility Utils (utils/a11y.ts)**
```typescript
// apps/web/app-wishlist-gallery/src/utils/a11y.ts

export const focusRingClasses = 'focus:ring-2 focus:ring-offset-2 focus:ring-sky-500'
```

**Reuse:**
- Apply `focusRingClasses` to all inputs
- Override ring color for error state: `focus:ring-red-500`

---

## Performance Considerations

### React Hook Form Benefits
- **Uncontrolled Inputs:** Fewer re-renders than controlled inputs
- **Lazy Validation:** Only validates on blur and submit (not on every keystroke)
- **Optimized Re-renders:** Only re-renders components with errors when validation runs

### Zod Validation Performance
- **Fast for Simple Schemas:** Price and date validation are O(1)
- **No Network Calls:** All validation is synchronous
- **Minimal Overhead:** Zod parsing is optimized for performance

### Expected Performance Impact
- **Negligible:** Form submission latency remains the same
- **Better UX:** Fewer unnecessary re-renders during typing
- **No Loading States Needed:** Validation is instant

---

## Testing Strategy

### Unit Test Coverage

**Target:** 90%+ for validation logic

1. **Schema Tests** (`__types__/index.test.ts`)
   - Test Zod schema with various inputs
   - Ensure error messages match expected format

2. **Component Tests** (`GotItModal.test.tsx`)
   - Test form rendering
   - Test form submission with valid data
   - Test form submission with invalid data
   - Test error display and clearing

3. **Validation Tests** (`validation.test.tsx`)
   - Boundary value tests
   - Edge case tests (scientific notation, negative numbers, etc.)

4. **Keyboard Tests** (`keyboard.test.tsx`)
   - Tab order verification
   - Enter key submission
   - Focus management

5. **Accessibility Tests** (`accessibility.test.tsx`)
   - ARIA attribute verification
   - Screen reader announcements

### Integration Test Coverage

**Target:** Key user flows

1. Complete form with valid data → submits successfully
2. Enter invalid data → shows errors → correct errors → submits
3. Keyboard-only form completion and submission

### E2E Test Coverage

**Target:** Critical paths + accessibility

1. Purchase flow with validation errors
2. Keyboard navigation through entire form
3. Screen reader compatibility (axe-core audit)

---

## Dependency Analysis

### Blocking Dependency

**SETS-MVP-0310 (Status Update Flow) - Status: UAT**

This story **depends on** SETS-MVP-0310 completing UAT and merging to main. The GotItModal component implemented in SETS-MVP-0310 is the refactoring target.

**Mitigation:**
- Wait for SETS-MVP-0310 to merge before starting implementation
- Coordinate with UAT team to understand merge timeline
- Review SETS-MVP-0310 implementation to ensure compatibility

**Timeline Impact:**
- If SETS-MVP-0310 merges this week: Can start immediately
- If SETS-MVP-0310 delayed: Story is blocked

### No Other Dependencies

- React Hook Form and Zod are already installed
- Validation messages library exists
- No API changes required
- No backend work required

---

## Implementation Checklist

### Phase 1: Schema Definition ✅
- [ ] Create `__types__/index.ts` with Zod schema
- [ ] Export `PurchaseDetailsFormSchema` and type
- [ ] Write unit tests for schema validation

### Phase 2: React Hook Form Integration ✅
- [ ] Import useForm, zodResolver
- [ ] Replace useState with useForm hook
- [ ] Update onSubmit handler
- [ ] Remove manual validation logic

### Phase 3: Input Field Updates ✅
- [ ] Update all inputs to use `register()`
- [ ] Add HTML5 validation attributes (type, min, max, step)
- [ ] Add ARIA attributes (aria-invalid, aria-describedby)
- [ ] Style error states (red border, focus ring)
- [ ] Update error message display (role="alert")

### Phase 4: Keyboard Accessibility ✅
- [ ] Add form-level onKeyDown handler
- [ ] Implement Enter key submission
- [ ] Add focus management on error
- [ ] Verify natural tab order

### Phase 5: Test Updates ✅
- [ ] Write validation.test.tsx (boundary + edge cases)
- [ ] Write keyboard.test.tsx (tab order, Enter key)
- [ ] Write accessibility.test.tsx (ARIA attributes)
- [ ] Update GotItModal.test.tsx (integration tests)
- [ ] Write E2E tests (Playwright)

### Phase 6: Manual QA ✅
- [ ] Test keyboard navigation (Tab, Enter, Esc)
- [ ] Test with NVDA screen reader (Windows)
- [ ] Test with VoiceOver (macOS)
- [ ] Test in dark mode
- [ ] Test on mobile (responsive layout)

---

## Alternative Approaches Considered

### Alternative 1: Manual Validation (Current)
**Pros:**
- Already implemented
- Full control over validation logic

**Cons:**
- More boilerplate code
- Manual error state management
- Not consistent with CLAUDE.md (requires Zod-first)
- Harder to maintain

**Decision:** Reject (violates CLAUDE.md requirements)

### Alternative 2: Formik + Zod
**Pros:**
- Popular form library
- Zod integration available

**Cons:**
- More boilerplate than React Hook Form
- Larger bundle size
- Not used elsewhere in codebase

**Decision:** Reject (React Hook Form is established pattern in LoginPage)

### Alternative 3: React Hook Form + Yup
**Pros:**
- Yup is popular validation library

**Cons:**
- CLAUDE.md explicitly requires Zod
- Would need to migrate validation-messages.ts to Yup
- Inconsistent with rest of codebase

**Decision:** Reject (Zod is codebase standard)

### Selected: React Hook Form + Zod ✅
**Pros:**
- Matches LoginPage pattern
- Follows CLAUDE.md Zod-first requirement
- Reuses existing validation-messages.ts library
- Best performance (uncontrolled inputs)
- Smallest bundle size

**Cons:**
- None identified

---

## Open Questions

### Q1: Should we round decimal values on blur?
**Example:** User enters "99.999" → should we round to "99.99" or show error?

**Options:**
- A: Show validation error (stricter)
- B: Round to 2 decimal places on blur (friendlier)

**Recommendation:** Show validation error (AC18 says "accept valid decimals only")

### Q2: Should we prevent negative sign input at the input level?
**Example:** User types "-" in price field

**Options:**
- A: HTML5 `min="0"` prevents negative (browser-dependent)
- B: Add onKeyDown handler to prevent "-" key
- C: Rely on Zod validation only

**Recommendation:** Option A (HTML5 min) + Option C (Zod fallback) - simplest approach

### Q3: Should validation run on change after first error?
**Example:** User sees "Price must be at least 0" error. Should it clear immediately when they type "99.99"?

**Options:**
- A: Validate only on blur (current recommendation)
- B: Progressive validation (validate on change after first error)

**Recommendation:** Option B (progressive validation) - better UX for error recovery

**Implementation:**
```typescript
mode: 'onBlur',
reValidateMode: 'onChange', // Re-validate on change after first submit
```

---

## Success Criteria

### Functional
- [ ] Price fields reject negative numbers and values > 999999.99
- [ ] Price fields accept valid decimals (0.00 - 999999.99)
- [ ] Date field rejects future dates
- [ ] Form submits with valid data
- [ ] Form prevents submission with invalid data
- [ ] Error messages are clear and actionable

### Accessibility
- [ ] Tab order follows logical sequence
- [ ] Enter key submits form
- [ ] Esc key closes modal
- [ ] Error messages announced by screen reader
- [ ] Focus moves to first error field on validation failure
- [ ] All inputs have proper ARIA attributes

### Quality
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Test coverage meets 45% minimum
- [ ] No regression in existing features
- [ ] Passes axe-core accessibility audit

---

## Conclusion

**Feasibility: HIGH ✅**

This story is highly feasible with low implementation risk. All required packages are installed, patterns are established in the codebase, and the scope is limited to refactoring an existing component. The dependency on SETS-MVP-0310 is the only blocker, but once resolved, implementation should be straightforward.

**Estimated Effort:** 1 story point (1-2 days)
- Schema definition: 0.5 hours
- Form integration: 2-3 hours
- Input updates: 2 hours
- Keyboard accessibility: 1 hour
- Test updates: 4-6 hours
- Manual QA: 2-3 hours

**Total: 12-15 hours** (aligns with 1 story point for experienced developer)

**Recommendation:** ✅ **Approve for implementation** once SETS-MVP-0310 merges.
