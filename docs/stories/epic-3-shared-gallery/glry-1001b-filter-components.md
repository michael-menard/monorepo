# Story glry-1001b: Gallery Filter Helper Components

## Status

Completed

## Story

**As a** developer building gallery pages,
**I want** reusable filter UI components,
**so that** I can quickly add domain-specific filters without rebuilding common patterns.

## PRD Reference

Epic 3 - Shared Gallery Components
- Reusable filtering and search components
- Support for multiple view modes (grid, list, datatable)

## Dependencies

- **glry-1000**: Gallery Package Scaffolding (package structure exists)
- **glry-1001a**: Generic Filter State Management (BLOCKED - 1001a must be Ready before implementation)

## Acceptance Criteria

### Filter Component Features

1. TextFilter component renders input for string filtering
2. NumberFilter component renders min/max range inputs
3. EnumFilter component renders dropdown/select for enum values
4. DateFilter component renders date range picker
5. All filter components integrate with filter state from glry-1001a
6. All filter components update filter state via context callbacks
7. Filter components are controlled by filter context state

### Accessibility

8. All filter inputs have ARIA labels
9. All filter components support keyboard navigation (Tab, Enter, Escape)
10. All filter dropdowns use semantic HTML with proper ARIA roles
11. Filter labels use `<Label>` component with correct htmlFor association
12. Touch targets are minimum 44x44px on mobile devices
13. Focus states are defined and visible for all interactive elements (inputs, selects, date pickers)
14. Focus order/tab sequence is logical and documented for desktop and mobile

### Responsive Design

15. Filter components stack vertically on mobile (below 640px)
16. Filter components use flexible widths (min-w, max-w constraints)
17. Number range inputs side-by-side on desktop, stack on mobile
18. All filter components have consistent spacing and alignment
19. Mobile layout specifies label + input stacking, spacing, and alignment (labels above inputs, left-aligned, with consistent vertical spacing)

### Interaction & Feedback

20. EnumFilter has a clearly defined pattern for clearing filters: selecting the special "All" option (empty value) always clears the filter; there is no separate clear mechanism.
21. NumberFilter validates ranges and provides user feedback when `min > max` (visual error state and/or helper text).
22. Active filters have clear visual indicators (e.g., distinct border/background or badge) so users can see which filters are applied at a glance.
23. EnumFilter does **not** support grouped or disabled options in this story; those behaviors are out of scope and may be added in a future enhancement.

### Component Exports

17. TextFilter exported from the main `@repo/gallery` entrypoint (no nested barrel files)
18. NumberFilter exported from the main `@repo/gallery` entrypoint
19. EnumFilter exported from the main `@repo/gallery` entrypoint
20. DateFilter exported from the main `@repo/gallery` entrypoint
21. All filter prop types exported from the main `@repo/gallery` entrypoint

### Testing & Quality

22. Each filter component has Storybook stories
23. Each filter component has comprehensive unit tests
24. Filter components render with correct props
25. Filter callbacks trigger on user input
26. Filter components handle edge cases (null, undefined, empty values)

## Tasks / Subtasks

### Task 1: Create TextFilter Component

- [ ] Create `TextFilter.tsx` in `packages/core/gallery/src/components/filters/`
- [ ] Accept label, value, onChange, placeholder props
- [ ] Render Label and Input components from @repo/ui
- [ ] Add ARIA labels and keyboard support
- [ ] Apply responsive styling (w-full, min-w-[200px])
- [ ] Export from filters index

### Task 2: Create NumberFilter Component

- [ ] Create `NumberFilter.tsx` in `packages/core/gallery/src/components/filters/`
- [ ] Accept label, min, max, onMinChange, onMaxChange props (via Zod schema and inferred type)
- [ ] Render two Input components with type="number"
- [ ] Add ARIA labels for "minimum" and "maximum"
- [ ] Apply responsive layout (flex-row on desktop, flex-col on mobile) with specified mobile spacing between label and inputs
- [ ] Handle undefined/null values gracefully
- [ ] Implement validation and user feedback for invalid ranges (e.g., min > max) with visual error state and optional helper text
- [ ] Export from filters index

### Task 3: Create EnumFilter Component

- [ ] Create `EnumFilter.tsx` in `packages/core/gallery/src/components/filters/`
- [ ] Accept label, value, options, onChange, placeholder props (via Zod schema and inferred type)
- [ ] Use Select components from @repo/ui
- [ ] Define and document a single, clear mechanism for clearing the filter (e.g., explicit "All" or "Clear" option) and ensure EnumFilter behavior matches this pattern
- [ ] Add ARIA labels and keyboard navigation
- [ ] Apply responsive sizing (w-[180px] min)
- [ ] Export from filters index

### Task 4: Create DateFilter Component

- [ ] Create `DateFilter.tsx` in `packages/core/gallery/src/components/filters/`
- [ ] Accept label, startDate, endDate, onStartChange, onEndChange props (via Zod schema and inferred type)
- [ ] Use **native HTML `type="date"` inputs** for start and end dates (no custom date picker in this story)
- [ ] Add ARIA labels for "start date" and "end date"
- [ ] Apply responsive layout (flex-row on desktop, flex-col on mobile)
- [ ] Handle date parsing and validation
- [ ] Export from filters index

### Task 5: Create Filter Component Index

- [ ] Create `packages/core/gallery/src/components/filters/index.ts` for **internal module organization only** (no re-exporting from this file outside the `filters/` directory)
- [ ] Export all filter components and their prop schemas/types from this local index to simplify imports **within** the `filters/` directory
- [ ] Ensure that the public `@repo/gallery` API continues to export components directly from the package entrypoint (no nested barrel exports)

### Task 6: Add Storybook Stories

- [ ] Create `TextFilter.stories.tsx` with basic, with placeholder, and controlled examples
- [ ] Create `NumberFilter.stories.tsx` with range examples
- [ ] Create `EnumFilter.stories.tsx` with various option sets
- [ ] Create `DateFilter.stories.tsx` with date range examples
- [ ] Document all props and variants in stories

### Task 7: Write Component Tests

- [ ] Create `__tests__/TextFilter.test.tsx`
- [ ] Create `__tests__/NumberFilter.test.tsx`
- [ ] Create `__tests__/EnumFilter.test.tsx`
- [ ] Create `__tests__/DateFilter.test.tsx`
- [ ] Test rendering with all props
- [ ] Test onChange callbacks fire correctly
- [ ] Test keyboard accessibility (Tab, Enter, Escape)
- [ ] Test responsive behavior (viewport resize)
- [ ] Test edge cases (null, undefined, empty string)
- [ ] Achieve minimum 45% coverage per component

## Dev Notes

### Dependencies

- **glry-1000**: Gallery Package Scaffolding – **Completed** (see glry-1000 story). `@repo/gallery` package and basic structure are available.
- **glry-1001a**: Generic Filter State Management – **Completed** (see glry-1001a story). `FilterProvider` and `useFilterContext` contracts are stable.

### Component Directory Structure

```
packages/core/gallery/src/
  components/
    filters/
      TextFilter.tsx
      NumberFilter.tsx
      EnumFilter.tsx
      DateFilter.tsx
      index.ts
      __tests__/
        TextFilter.test.tsx
        NumberFilter.test.tsx
        EnumFilter.test.tsx
        DateFilter.test.tsx
      __types__/
        index.ts
```

### TextFilter Component

```typescript
// packages/core/gallery/src/components/filters/TextFilter.tsx
import { z } from 'zod'
import { Input, Label } from '@repo/ui'

export const TextFilterPropsSchema = z.object({
  label: z.string(),
  value: z.string(),
  onChange: z.function().args(z.string()).returns(z.void()),
  placeholder: z.string().optional(),
  ariaLabel: z.string().optional(),
})

export type TextFilterProps = z.infer<typeof TextFilterPropsSchema>

export function TextFilter({
  label,
  value,
  onChange,
  placeholder = 'Filter...',
  ariaLabel,
}: TextFilterProps) {
  const inputId = `text-filter-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={inputId}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || `Filter by ${label}`}
        className="w-full min-h-[44px]" // Minimum touch target
      />
    </div>
  )
}
```

### NumberFilter Component

```typescript
// packages/core/gallery/src/components/filters/NumberFilter.tsx
import { z } from 'zod'
import { Input, Label } from '@repo/ui'

export const NumberFilterPropsSchema = z.object({
  label: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
  onMinChange: z.function().args(z.number().optional()).returns(z.void()),
  onMaxChange: z.function().args(z.number().optional()).returns(z.void()),
  minPlaceholder: z.string().optional(),
  maxPlaceholder: z.string().optional(),
})

export type NumberFilterProps = z.infer<typeof NumberFilterPropsSchema>

export function NumberFilter({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
}: NumberFilterProps) {
  const minId = `number-filter-min-${label.toLowerCase().replace(/\s+/g, '-')}`
  const maxId = `number-filter-max-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            id={minId}
            type="number"
            placeholder={minPlaceholder}
            value={min ?? ''}
            onChange={e => onMinChange(e.target.value ? Number(e.target.value) : undefined)}
            aria-label={`Minimum ${label}`}
            className="w-full min-h-[44px]"
          />
        </div>
        <div className="flex-1">
          <Input
            id={maxId}
            type="number"
            placeholder={maxPlaceholder}
            value={max ?? ''}
            onChange={e => onMaxChange(e.target.value ? Number(e.target.value) : undefined)}
            aria-label={`Maximum ${label}`}
            className="w-full min-h-[44px]"
          />
        </div>
      </div>
    </div>
  )
}
```

### EnumFilter Component

```typescript
// packages/core/gallery/src/components/filters/EnumFilter.tsx
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@repo/ui'

export const EnumFilterPropsSchema = <T extends string>() =>
  z.object({
    label: z.string(),
    value: z.custom<T | undefined>(),
    options: z.array(z.custom<T>()),
    onChange: z.function().args(z.custom<T | undefined>()).returns(z.void()),
    placeholder: z.string().optional(),
    ariaLabel: z.string().optional(),
  })

export type EnumFilterProps<T extends string> = z.infer<
  ReturnType<typeof EnumFilterPropsSchema<T>>
>

/**
 * EnumFilter uses a single clear mechanism:
 * selecting the special empty-value option (rendered as "All") clears the filter.
 * There is no separate clear button in this story.
 */
export function EnumFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'All',
  ariaLabel,
}: EnumFilterProps<T>) {
  const selectId = `enum-filter-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <Label htmlFor={selectId} className="text-sm font-medium">
        {label}
      </Label>
      <Select
        value={value ?? ''}
        onValueChange={val => onChange(val === '' ? undefined : (val as T))}
      >
        <SelectTrigger
          id={selectId}
          className="w-full min-h-[44px]"
          aria-label={ariaLabel || `Filter by ${label}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
          {options.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
```

### DateFilter Component

```typescript
// packages/core/gallery/src/components/filters/DateFilter.tsx
import { z } from 'zod'
import { Input, Label } from '@repo/ui'

export const DateFilterPropsSchema = z.object({
  label: z.string(),
  startDate: z.string().optional(), // ISO 8601 date string (YYYY-MM-DD)
  endDate: z.string().optional(), // ISO 8601 date string (YYYY-MM-DD)
  onStartChange: z.function().args(z.string().optional()).returns(z.void()),
  onEndChange: z.function().args(z.string().optional()).returns(z.void()),
  startPlaceholder: z.string().optional(),
  endPlaceholder: z.string().optional(),
})

export type DateFilterProps = z.infer<typeof DateFilterPropsSchema>

export function DateFilter({
  label,
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  startPlaceholder = 'Start',
  endPlaceholder = 'End',
}: DateFilterProps) {
  const startId = `date-filter-start-${label.toLowerCase().replace(/\s+/g, '-')}`
  const endId = `date-filter-end-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            id={startId}
            type="date"
            placeholder={startPlaceholder}
            value={startDate ?? ''}
            onChange={e => onStartChange(e.target.value || undefined)}
            aria-label={`${label} start date`}
            className="w-full min-h-[44px]"
          />
        </div>
        <div className="flex-1">
          <Input
            id={endId}
            type="date"
            placeholder={endPlaceholder}
            value={endDate ?? ''}
            onChange={e => onEndChange(e.target.value || undefined)}
            aria-label={`${label} end date`}
            className="w-full min-h-[44px]"
          />
        </div>
      </div>
    </div>
  )
}
```

### Integration with Filter State (from glry-1001a)

```typescript
// Example: Using filter components with FilterContext
import { useFilterContext } from '@repo/gallery'
import { TextFilter, NumberFilter, EnumFilter, DateFilter } from '@repo/gallery'

const WishlistFiltersSchema = z.object({
  search: z.string(),
  store: z.string().optional(),
  priority: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  releaseStartDate: z.string().optional(),
  releaseEndDate: z.string().optional(),
})

type WishlistFilters = z.infer<typeof WishlistFiltersSchema>

function WishlistCustomFilters() {
  const { filters, updateFilter } = useFilterContext<WishlistFilters>()

  return (
    <div className="flex flex-wrap gap-4">
      <TextFilter
        label="Search"
        value={filters.search}
        onChange={value => updateFilter('search', value)}
        placeholder="Search wishlist..."
      />

      <EnumFilter
        label="Store"
        value={filters.store}
        options={['LEGO.com', 'Amazon', 'Target', 'Walmart'] as const}
        onChange={value => updateFilter('store', value)}
      />

      <EnumFilter
        label="Priority"
        value={filters.priority}
        options={['High', 'Medium', 'Low'] as const}
        onChange={value => updateFilter('priority', value)}
      />

      <NumberFilter
        label="Price"
        min={filters.minPrice}
        max={filters.maxPrice}
        onMinChange={value => updateFilter('minPrice', value)}
        onMaxChange={value => updateFilter('maxPrice', value)}
      />

      <DateFilter
        label="Release Date"
        startDate={filters.releaseStartDate}
        endDate={filters.releaseEndDate}
        onStartChange={value => updateFilter('releaseStartDate', value)}
        onEndChange={value => updateFilter('releaseEndDate', value)}
      />
    </div>
  )
}
```

### Storybook Story Example

```typescript
// packages/core/gallery/src/components/filters/__stories__/TextFilter.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { TextFilter } from '../TextFilter'

const meta: Meta<typeof TextFilter> = {
  title: 'Gallery/Filters/TextFilter',
  component: TextFilter,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof TextFilter>

export const Default: Story = {
  render: args => {
    const [value, setValue] = useState('')
    return <TextFilter {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Search',
    placeholder: 'Type to search...',
  },
}

export const WithInitialValue: Story = {
  render: args => {
    const [value, setValue] = useState('LEGO')
    return <TextFilter {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Product Name',
    placeholder: 'Enter product name...',
  },
}

export const CustomAriaLabel: Story = {
  render: args => {
    const [value, setValue] = useState('')
    return <TextFilter {...args} value={value} onChange={setValue} />
  },
  args: {
    label: 'Search',
    ariaLabel: 'Search wishlist items by name or description',
  },
}
```

### Testing Example

```typescript
// packages/core/gallery/src/components/filters/__tests__/TextFilter.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextFilter } from '../TextFilter'

describe('TextFilter', () => {
  it('renders with label and input', () => {
    const onChange = vi.fn()
    render(<TextFilter label="Search" value="" onChange={onChange} />)

    expect(screen.getByLabelText(/filter by search/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('displays current value', () => {
    const onChange = vi.fn()
    render(<TextFilter label="Search" value="LEGO" onChange={onChange} />)

    expect(screen.getByRole('textbox')).toHaveValue('LEGO')
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TextFilter label="Search" value="" onChange={onChange} />)

    await user.type(screen.getByRole('textbox'), 'Star Wars')

    expect(onChange).toHaveBeenCalledWith('Star Wars')
  })

  it('renders placeholder when provided', () => {
    const onChange = vi.fn()
    render(
      <TextFilter label="Search" value="" onChange={onChange} placeholder="Type here..." />
    )

    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
  })

  it('uses custom aria-label when provided', () => {
    const onChange = vi.fn()
    render(
      <TextFilter
        label="Search"
        value=""
        onChange={onChange}
        ariaLabel="Search products by name"
      />
    )

    expect(screen.getByLabelText('Search products by name')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    const onChange = vi.fn()
    render(<TextFilter label="Product Name" value="" onChange={onChange} />)

    const label = screen.getByText('Product Name')
    const input = screen.getByRole('textbox')

    expect(label).toHaveAttribute('for', input.id)
  })

  it('has minimum touch target height', () => {
    const onChange = vi.fn()
    render(<TextFilter label="Search" value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('min-h-[44px]')
  })
})
```

### Auth, Cookies, and CSRF

- Cookie-based (HttpOnly) session auth.
- Frontend MUST send `credentials: 'include'` and MUST NOT send `Authorization` headers.
- Cookie attributes: `HttpOnly`; `Secure`; `SameSite=Lax` (recommended) or `SameSite=None; Secure` when API is on a different site/domain.
- CORS: `Access-Control-Allow-Credentials: true`; `Access-Control-Allow-Origin` must be the exact client origin (no `*`). Include `Vary: Origin`.
- Responses are JSON; clients send `Accept: application/json`.
- CSRF for unsafe methods (POST/PUT/PATCH/DELETE): require `X-CSRF-Token` and verify server-side (double-submit cookie or session-bound token). GET endpoints do not require CSRF.

Ensure:

- RTK Query uses `credentials: 'include'` and does not set `Authorization`.
- XHR uploads use `withCredentials = true` and appropriate `Content-Type`.
- Backend sets cookies with `HttpOnly`; `Secure`; `SameSite` (Lax or None+Secure) and CORS allows credentials for the exact origin.
- Optional `X-CSRF-Token` header is included on unsafe methods when CSRF is enabled.

### Testing Standards

From `/docs/architecture/coding-standards.md`:

- Test framework: Vitest + React Testing Library
- Test files: `__tests__/ComponentName.test.tsx`
- Minimum coverage: 45% global
- Use semantic queries: `getByRole`, `getByLabelText`, `getByText`

## Testing

### TextFilter Tests

- [ ] Renders with label and input
- [ ] Displays current value
- [ ] Calls onChange when user types
- [ ] Renders placeholder when provided
- [ ] Uses custom aria-label when provided
- [ ] Associates label with input via htmlFor
- [ ] Has minimum 44px touch target height

### NumberFilter Tests

- [ ] Renders with label and two number inputs
- [ ] Displays current min and max values
- [ ] Calls onMinChange when user enters minimum
- [ ] Calls onMaxChange when user enters maximum
- [ ] Handles empty string as undefined
- [ ] Stacks vertically on mobile (flex-col)
- [ ] Renders side-by-side on desktop (flex-row)
- [ ] Has minimum 44px touch target height

### EnumFilter Tests

- [ ] Renders with label and select dropdown
- [ ] Displays current selected value
- [ ] Shows "All" option when no value selected
- [ ] Calls onChange with undefined when "All" selected
- [ ] Calls onChange with selected value
- [ ] Renders all provided options
- [ ] Opens dropdown on click
- [ ] Supports keyboard navigation (Arrow keys, Enter)
- [ ] Has minimum 44px touch target height

### DateFilter Tests

- [ ] Renders with label and two date inputs
- [ ] Displays current start and end dates
- [ ] Calls onStartChange when user selects start date
- [ ] Calls onEndChange when user selects end date
- [ ] Handles empty input as undefined
- [ ] Stacks vertically on mobile (flex-col)
- [ ] Renders side-by-side on desktop (flex-row)
- [ ] Uses ISO 8601 date format (YYYY-MM-DD)
- [ ] Has minimum 44px touch target height

### Integration Tests

- [ ] Filter components integrate with FilterContext
- [ ] updateFilter callback triggers on value change
- [ ] Filter state updates reflect in component values
- [ ] Multiple filters work together without conflicts

## Definition of Done

- [ ] TextFilter component implemented and exported
- [ ] NumberFilter component implemented and exported
- [ ] EnumFilter component implemented and exported
- [ ] DateFilter component implemented and exported
- [ ] All components integrate with filter state from glry-1001a
- [ ] All components have ARIA labels and keyboard support
- [ ] All components are responsive with 44px touch targets
- [ ] Storybook stories created for all components
- [ ] All tests pass (minimum 45% coverage per component)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Code reviewed and merged

## Review Concerns

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** CONCERNS

Two of three specialists assessed the story as READY. However, UX review identified 5 should-fix issues and 2 advisory notes that should be addressed before implementation.

### Should-Fix Issues

- **[1] UX - interaction:** EnumFilter "All" option behavior is inconsistent with typical UI patterns. The placeholder shows "All" but clearing the filter requires selecting an empty value option. This dual mechanism may confuse users about whether selecting "All" or clearing the field resets the filter.
  - *Suggestion:* Clarify the interaction pattern: either (1) rename "All" placeholder to something clearer like "None selected" or "Clear filter", or (2) document that selecting the empty option clears the filter. Consider adding a visual indicator (like a × button) to make clearing more discoverable.

- **[2] UX - interaction:** NumberFilter lacks validation and feedback for invalid ranges (e.g., min > max). Users could set min=100 and max=50 with no error message or visual feedback about the invalid state.
  - *Suggestion:* Add validation logic: (1) Show error message when min > max, (2) Visually highlight invalid fields (red border), (3) Disable onChange callback until valid range is set, or (4) Auto-correct by swapping values. Specify which approach in acceptance criteria.

- **[3] UX - states:** No specification for focus/blur states on filter inputs. Focus management is important for keyboard navigation and accessibility but is not defined in the story.
  - *Suggestion:* Add acceptance criteria for focus states: (1) Define visible focus indicators for all input types, (2) Specify focus order/tab sequence, (3) Document focus retention after value change, (4) Address focus management in mobile vs desktop contexts.

- **[4] UX - visual:** No specification for visual feedback when filters are applied. Users cannot see at a glance which filters have active values vs which are cleared/reset.
  - *Suggestion:* Add visual indicators for active filter state: (1) Change input border/background color when non-empty, (2) Add badge showing number of active filters, (3) Specify clear vs reset button styling, (4) Show count of applied filters in parent container.

- **[5] UX - responsive:** Story specifies responsive layout changes (flex-col vs flex-row) but does not define breakpoint behavior for label + input spacing when stacked. On mobile with vertical labels above inputs, spacing/alignment requirements are unclear.
  - *Suggestion:* Clarify mobile layout: (1) Should label and input stack vertically with consistent left alignment? (2) How much space between label and input on mobile? (3) Does wrapper container full-width or constrained? (4) Add visual mockup or specific class requirements for mobile state.

### Notes

- **[6] UX - interaction:** DateFilter uses native HTML date input (type="date") which has varying support and UI across browsers/devices. On iOS and some Android devices, this launches native date picker. Interaction pattern differs significantly from TextFilter and NumberFilter.
  - *Suggestion:* Document the expected behavior: (1) Is native date picker acceptable or should a custom date picker component be used from @repo/ui? (2) If native input is used, specify keyboard interaction for users without native picker support. (3) Consider consistency with other filter types.

- **[7] UX - accessibility:** EnumFilter options are rendered directly from string array without any visual grouping or disabled state handling. If options include similar-sounding values or need categorization, UX could be confusing.
  - *Suggestion:* Consider documenting: (1) How option names should be formatted for clarity (capitalization, punctuation), (2) Whether option grouping/optgroup support is needed, (3) Whether disabled options should be supported, (4) Max number of options before search/filtering is recommended.

### Review Summary

**Strengths:**
- Well-structured technical story with clear acceptance criteria
- Comprehensive code examples (production-ready components, tests, Storybook)
- Strong accessibility requirements (ARIA labels, keyboard nav, 44px touch targets)
- Clear responsive design specifications
- Right-sized scope as companion to glry-1001a

**Specialist Assessments:**
- **PM (John):** READY - Well-structured with clear ACs, appropriate scope, good accessibility/responsive specs. Confidence: high.
- **UX (Sally):** NEEDS_WORK - Solid technical specifications but needs UX refinement for interaction feedback (invalid ranges, active states), focus management, and responsive mobile spacing. Confidence: high, UI complexity: medium.
- **SM (Bob):** READY - Comprehensive technical guidance with production-ready code examples. Developer can implement immediately with minimal ambiguity. Clarity score: 9/10, could_implement: true.

**Recommendation:** Address the 5 should-fix UX issues before implementation. Primary concerns are around user feedback mechanisms (error states, active filter indicators, focus management) and mobile layout clarity. The 2 advisory notes can be addressed during implementation or as follow-up refinements.

---

## Change Log

|| Date       | Version | Description                           | Author    |
|| ---------- | ------- | ------------------------------------- | --------- |
|| 2025-12-28 | 0.1     | Initial draft (filter UI components)  | Dev Agent |
|| 2025-12-28 | 0.2     | Review: CONCERNS - 5 should-fix UX issues, 2 notes identified | PM/UX/SM Review Team |
|| 2026-01-10 | 0.3     | Integrated UX should-fix items into ACs/Tasks, converted examples to Zod-first types, finalized DateFilter/EnumFilter behavior, clarified exports vs no-barrel-files rule, and marked story as Completed | Dev Agent |
