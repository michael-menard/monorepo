---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: SETS-MVP-0340

## Reality Context

### Baseline Status
- Loaded: **NO**
- Date: N/A
- Gaps: **No baseline reality file exists at plans/baselines/** - this is a warning but does not block story seed generation. Proceeding with codebase scanning for context.

### Relevant Existing Features

Based on codebase analysis, the following features are relevant to form validation:

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| GotItModal Component | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | **Implemented** (SETS-MVP-0310) | Core component to enhance with validation |
| Price validation (basic) | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | **Implemented** | Basic regex validation exists (`isValidPrice` function) |
| Date input with max constraint | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | **Implemented** | HTML5 date input with `max={getTodayDateString()}` |
| Validation Messages Library | `packages/core/app-component-library/src/forms/validation-messages.ts` | **Implemented** | Reusable validation messages and Zod schema builders |
| Enhanced Zod Schemas | `packages/core/app-component-library/src/forms/validation-messages.ts` | **Implemented** | Pre-built schemas including `createEnhancedSchemas.price()` |
| React Hook Form | `apps/web/app-wishlist-gallery/package.json` | **Installed** (v7.71.1) | Available for form state management |
| @hookform/resolvers | `apps/web/app-wishlist-gallery/package.json` | **Installed** (v5.2.2) | Available for Zod integration |
| Keyboard Shortcuts Hook | `apps/web/app-wishlist-gallery/src/hooks/useKeyboardShortcuts.ts` | **Implemented** (WISH-2006) | Pattern for scoped keyboard event handling |
| Accessibility Utilities | `apps/web/app-wishlist-gallery/src/utils/a11y.ts` | **Implemented** (WISH-2006) | ARIA label generators, focus management patterns |

### Active In-Progress Work

Based on git status, the following active work may affect this story:

| Story | Status | Files Modified | Potential Overlap |
|-------|--------|----------------|-------------------|
| SETS-MVP-0310 | **UAT** | `apps/web/app-wishlist-gallery/src/components/GotItModal/*` | **BLOCKING** - This story extends GotItModal from SETS-MVP-0310 |
| WISH-2124 | **UAT** | Various test files, token logs | **No overlap** - unrelated feature |
| Multiple completed stories | Ready for QA | Various files | **No overlap** - different domains |

**Critical Dependency**: SETS-MVP-0310 (Status Update Flow) is currently in UAT status. This story **depends on** SETS-MVP-0310 and should not proceed to implementation until SETS-MVP-0310 is completed and merged.

### Constraints to Respect

Based on CLAUDE.md and codebase patterns:

1. **Zod-First Types (REQUIRED)**: All validation must use Zod schemas, never TypeScript interfaces
2. **Component Directory Structure**: Follow established pattern with `__types__/`, `__tests__/`, `utils/` subdirectories
3. **No Barrel Files**: Import directly from source files
4. **Accessibility-First**: WCAG compliance required, keyboard navigation mandatory
5. **Use @repo/app-component-library**: Import UI components from `@repo/app-component-library`, never from individual paths
6. **Use @repo/logger**: Never use `console.log`, use `@repo/logger` instead
7. **Minimum Coverage**: 45% global test coverage required
8. **React Hook Form Recommended**: LoginPage and other forms use React Hook Form + Zod resolver pattern

---

## Retrieved Context

### Related Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/wishlist/:id/purchase` | PATCH | **Implemented** (SETS-MVP-0310) | Backend validation should exist but client-side validation needed |

### Related Components

| Component | Path | Status | Usage |
|-----------|------|--------|-------|
| `GotItModal` | `apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx` | **Implemented** | Main component to enhance |
| `Input` | `@repo/app-component-library` | **Available** | Form input primitive |
| `AppSelect` | `@repo/app-component-library` | **Available** | Form select primitive |
| `Button` | `@repo/app-component-library` | **Available** | Form button primitive |
| `LoginPage` | `apps/web/main-app/src/routes/pages/LoginPage.tsx` | **Reference** | Shows React Hook Form + Zod pattern |

### Existing Validation Patterns

**Current GotItModal Validation** (Basic):
```typescript
// apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx

function isValidPrice(value: string): boolean {
  if (!value) return true
  return /^\d+(\.\d{1,2})?$/.test(value)
}

const validate = useCallback((): boolean => {
  const newErrors: Record<string, string> = {}

  if (pricePaid && !isValidPrice(pricePaid)) {
    newErrors.pricePaid = 'Price must be a valid decimal (e.g., 99.99)'
  }
  if (tax && !isValidPrice(tax)) {
    newErrors.tax = 'Tax must be a valid decimal'
  }
  if (shipping && !isValidPrice(shipping)) {
    newErrors.shipping = 'Shipping must be a valid decimal'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}, [pricePaid, tax, shipping])
```

**Issues with Current Approach**:
- Manual validation logic (not Zod-based)
- No range validation (0.00 - 999999.99)
- No keyboard accessibility (no Enter key handling)
- Error state management is manual
- No integration with form library

**Available Enhanced Schemas** (from validation-messages.ts):
```typescript
createEnhancedSchemas.price('Price') // Returns Zod schema with range 0-999999.99
validationMessages.number.max('Price', 999999.99) // Pre-built error message
validationMessages.date.past('Purchase Date') // Pre-built error message
```

### Reuse Candidates

**1. Validation Messages Library** (`packages/core/app-component-library/src/forms/validation-messages.ts`)
- `createEnhancedSchemas.price()` - Pre-configured price schema (0-999999.99)
- `validationMessages.number.*` - Number validation messages
- `validationMessages.date.*` - Date validation messages

**2. React Hook Form Pattern** (from LoginPage.tsx):
```typescript
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const {
  control,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(FormSchema),
  defaultValues: { ... }
})
```

**3. Keyboard Accessibility Pattern** (from useKeyboardShortcuts.ts):
- `shouldIgnoreKeyEvent()` utility - Prevents shortcuts when in input fields
- Pattern for scoped keyboard event handling

**4. Accessibility Utilities** (from utils/a11y.ts):
- `focusRingClasses` - Consistent focus styling
- ARIA announcement patterns for form errors

---

## Knowledge Context

### Lessons Learned

**No KB query performed** (lessons_loaded: false) - Manual analysis of codebase patterns instead.

### Blockers to Avoid (from codebase analysis)

1. **Don't skip Zod validation** - CLAUDE.md explicitly requires Zod schemas over TypeScript interfaces
2. **Don't use manual state for form validation** - React Hook Form is already installed and used in LoginPage
3. **Don't hardcode validation messages** - Reuse `validation-messages.ts` library
4. **Don't ignore keyboard accessibility** - Story AC20 explicitly requires it
5. **Don't modify Input components individually** - Check if `@repo/app-component-library` Input supports validation props

### Architecture Decisions (ADRs)

**No ADR-LOG.md found** (adrs_loaded: false) - Proceeding with CLAUDE.md constraints.

### Patterns to Follow

1. **Zod-First Validation**: Define schemas in `__types__/index.ts`, use `z.infer<>` for types
2. **React Hook Form Integration**: Use `useForm` + `zodResolver` for form state and validation
3. **Component Structure**: Follow `GotItModal/__types__/index.ts` pattern for schemas
4. **Accessibility**: Use `aria-invalid`, `aria-describedby` for error association
5. **Keyboard Navigation**: Form should handle Enter key submission (onKeyDown handler)
6. **Tab Order**: Natural tab order through form fields (no explicit tabIndex needed if DOM order is correct)

### Patterns to Avoid

1. **Manual validation functions** - Don't create custom `isValidPrice()`, use Zod
2. **Manual error state** - Don't use `useState<Record<string, string>>` for errors, use React Hook Form
3. **Inline validation messages** - Don't hardcode messages, use `validation-messages.ts`
4. **Custom tab order management** - Only use explicit tabIndex if DOM order can't be fixed

---

## Conflict Analysis

**No conflicts detected.**

✅ No overlapping stories modifying GotItModal (SETS-MVP-0310 is in UAT, will be merged first)
✅ No deprecated patterns in current implementation
✅ No protected features being modified
✅ No ADR violations (no ADRs found)

---

## Story Seed

### Title
**SETS-MVP-0340: Form Validation**

### Description

**Context**: The GotItModal purchase details form (implemented in SETS-MVP-0310) currently has basic regex-based validation for price fields and HTML5 date constraints. While functional, it lacks comprehensive validation (range constraints), uses manual error state management, and does not meet full keyboard accessibility requirements.

**Problem**:
- Price fields accept any decimal but don't enforce the 0.00-999999.99 range specified in AC18
- Validation logic is manual (not Zod-based), inconsistent with CLAUDE.md requirements
- No keyboard-only form submission (Enter key doesn't submit)
- Error messages are hardcoded instead of using the shared validation library
- Form state management is manual (useState), React Hook Form is already available but unused

**Solution**: Refactor the GotItModal form to use React Hook Form + Zod for validation, enforce price range constraints (0.00-999999.99), add keyboard accessibility (Enter to submit, proper tab order), and ensure WCAG compliance with proper ARIA attributes for errors.

This is a **polish and compliance story** that brings the purchase form up to quality standards without changing functionality.

### Initial Acceptance Criteria

- [ ] **AC18**: Price fields accept valid decimals only (0.00 - 999999.99)
  - Use Zod schema validation with min/max constraints
  - Display clear error message when value is out of range
  - Validation happens on blur and on submit

- [ ] **AC19**: Purchase date cannot be in the future
  - HTML5 date input already has `max={getTodayDateString()}` (implemented in SETS-MVP-0310)
  - Add Zod schema validation as fallback (client-side protection if HTML5 bypassed)
  - Display error message if future date somehow entered

- [ ] **AC20**: Form is keyboard accessible (tab order, enter to submit)
  - Natural tab order through all form fields (date → price → tax → shipping → build status → Skip → Save)
  - Enter key submits form (same as clicking Save button)
  - Esc key closes modal (already implemented)
  - Focus management: errors should be announced and first error field focused
  - All inputs have proper labels (already implemented)
  - Error messages associated with inputs via `aria-describedby`
  - Error state indicated via `aria-invalid`

### Non-Goals

- Server-side validation changes (backend should validate independently, but not in scope)
- Custom error message templates (use `validation-messages.ts` library)
- Complex validation rules (e.g., price comparison with retail price, tax percentage validation)
- Touch/gesture accessibility (keyboard only for this story)
- Form field masking or formatting (e.g., auto-inserting decimal points)
- Decimal precision handling beyond validation (e.g., rounding on blur)
- Negative number input prevention (Zod validation + HTML5 input type="number" with min="0" is sufficient)
- Currency symbol handling (already has static "$" prefix, no changes needed)

### Reuse Plan

**Components to Enhance**:
- `GotItModal` (`apps/web/app-wishlist-gallery/src/components/GotItModal/index.tsx`)
  - Refactor to use React Hook Form
  - Add Zod schema in `__types__/index.ts`
  - Add keyboard event handling

**Shared Packages to Use**:
- `react-hook-form` (already installed: v7.71.1)
- `@hookform/resolvers/zod` (already installed: v5.2.2)
- `@repo/app-component-library` - validation-messages.ts library
- `zod` (already installed: v3.25.76)

**Patterns to Follow**:
- LoginPage.tsx React Hook Form + Zod pattern
- validation-messages.ts enhanced schemas
- Existing keyboard shortcut patterns (useKeyboardShortcuts.ts)
- Existing accessibility utilities (utils/a11y.ts)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Areas**:
1. **Price Validation**:
   - Test boundary values: 0.00, 999999.99, -0.01, 1000000.00
   - Test decimal precision: 99.999 (should reject), 99.99 (should accept)
   - Test empty values (optional fields should allow empty)
   - Test non-numeric input (e.g., "abc")

2. **Date Validation**:
   - Test today's date (should accept)
   - Test past dates (should accept)
   - Test future dates (should reject)
   - Test invalid date formats (should be prevented by HTML5 input)

3. **Keyboard Accessibility**:
   - Test tab order through all fields
   - Test Enter key submission from each field
   - Test Esc key modal close
   - Test screen reader announcements for errors
   - Test focus management after validation errors

4. **Form Integration**:
   - Test that validation errors prevent submission
   - Test that correcting errors clears error state
   - Test that form submits with valid data
   - Test that optional fields work when empty

5. **Accessibility (WCAG)**:
   - Test with screen reader (NVDA/JAWS)
   - Test keyboard-only navigation
   - Test focus indicators are visible
   - Test error association with inputs

**Existing Test Patterns**:
- Refer to `apps/web/app-wishlist-gallery/src/components/GotItModal/__tests__/GotItModal.test.tsx`
- Refer to `apps/web/main-app/src/routes/pages/__tests__/LoginPage.test.tsx` (React Hook Form tests)
- Refer to `packages/core/app-component-library/src/__tests__/validation-messages.test.ts` (Zod schema tests)

**E2E Coverage**:
- Create Playwright test for keyboard-only form completion and submission
- Test validation error display and recovery
- Test Enter key submission flow

### For UI/UX Advisor

**Design Considerations**:
1. **Error Display**:
   - Errors currently show as `<p className="text-sm text-red-500">` below each field
   - Ensure error text has sufficient contrast (WCAG AA)
   - Consider adding error icon for visual indicator

2. **Focus States**:
   - Ensure focus rings are visible and consistent (`focusRingClasses` from utils/a11y.ts)
   - Inputs should have `aria-invalid="true"` when errors present

3. **Loading States**:
   - Form already has loading state with disabled inputs during submission
   - Ensure validation doesn't run while form is submitting

4. **User Feedback**:
   - Validation should happen on blur (not on every keystroke)
   - Submit button should show errors on click if validation fails
   - Consider showing success state briefly when validation passes

5. **Responsive Considerations**:
   - Modal already has responsive layout (grid-cols-2 for tax/shipping)
   - Ensure error messages don't break layout on mobile

**Consistency**:
- Match existing GotItModal styling and layout
- Maintain LEGO-inspired theme (Sky/Teal color palette)
- Follow existing button variants (outline for Cancel, default for Save)

### For Dev Feasibility

**Implementation Approach**:

1. **Create Zod Schema** (`GotItModal/__types__/index.ts`):
```typescript
import { z } from 'zod'
import { createEnhancedSchemas, validationMessages } from '@repo/app-component-library/forms/validation-messages'

export const PurchaseDetailsFormSchema = z.object({
  purchaseDate: z.string().refine(
    (date) => new Date(date) <= new Date(),
    { message: validationMessages.date.past('Purchase date') }
  ),
  pricePaid: createEnhancedSchemas.price('Price paid').optional(),
  tax: createEnhancedSchemas.price('Tax').optional(),
  shipping: createEnhancedSchemas.price('Shipping').optional(),
  buildStatus: z.enum(['not_started', 'in_progress', 'completed']),
})

export type PurchaseDetailsForm = z.infer<typeof PurchaseDetailsFormSchema>
```

2. **Refactor GotItModal to use React Hook Form**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PurchaseDetailsFormSchema, type PurchaseDetailsForm } from './__types__'

const {
  register,
  handleSubmit,
  formState: { errors },
  reset,
} = useForm<PurchaseDetailsForm>({
  resolver: zodResolver(PurchaseDetailsFormSchema),
  defaultValues: {
    purchaseDate: getTodayDateString(),
    pricePaid: item.price || '',
    tax: '',
    shipping: '',
    buildStatus: 'not_started',
  },
})
```

3. **Add Keyboard Event Handler**:
```typescript
const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key === 'Enter' && !isPurchasing) {
    e.preventDefault()
    handleSubmit(onSubmit)()
  }
}, [handleSubmit, onSubmit, isPurchasing])

<form onSubmit={handleSubmit(onSubmit)} onKeyDown={onKeyDown}>
```

4. **Update Input Components with Validation Props**:
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
/>
{errors.pricePaid && (
  <p id="pricePaid-error" className="text-sm text-red-500" role="alert">
    {errors.pricePaid.message}
  </p>
)}
```

**Migration Steps**:
1. Add Zod schema to `__types__/index.ts`
2. Replace `useState` form fields with `useForm` hook
3. Replace manual validation with Zod resolver
4. Update inputs to use `register()` and error props
5. Add keyboard event handler
6. Update tests to match new validation behavior
7. Test keyboard navigation and screen reader compatibility

**Potential Challenges**:
- Input component may need `type="number"` instead of `type="text"` with `inputMode="decimal"`
- HTML5 number inputs don't always respect step/min/max on paste
- Need to ensure Zod validation catches edge cases HTML5 misses
- Date validation fallback needed (HTML5 max attribute can be bypassed)

**Performance Considerations**:
- React Hook Form uses uncontrolled inputs (better performance than controlled)
- Validation only runs on blur and submit (not on every keystroke)
- Zod schema validation is fast for simple types

**Accessibility Review Needed**:
- Test with screen reader (NVDA/JAWS/VoiceOver)
- Verify error announcements are clear
- Ensure focus management works when validation fails

---

## Summary

**Story Scope**: Enhance the GotItModal purchase details form with comprehensive Zod-based validation, enforce price range constraints (0.00-999999.99), add keyboard accessibility (Enter to submit), and ensure WCAG compliance.

**Dependencies**:
- **BLOCKING**: SETS-MVP-0310 (Status Update Flow) must complete UAT and merge first
- React Hook Form and @hookform/resolvers already installed
- Validation messages library already available in @repo/app-component-library

**Complexity**: **LOW** - Refactoring existing form to use React Hook Form + Zod, no new UI or API changes

**Estimated Points**: 1 (as per story frontmatter)

**Risks**:
- Low risk: Well-established patterns (React Hook Form + Zod used in LoginPage)
- Potential for regression if validation is too strict or breaks existing flow
- Need to ensure backward compatibility with existing form behavior

**Testing Strategy**:
- Unit tests: Zod schema validation, form submission, error handling
- Integration tests: Full form flow with validation
- E2E tests: Keyboard navigation, screen reader compatibility
- Accessibility tests: WCAG compliance, keyboard-only usage

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warnings**:
1. No baseline reality file found - proceeded with codebase scanning only. This seed may miss context from recent baseline updates.
