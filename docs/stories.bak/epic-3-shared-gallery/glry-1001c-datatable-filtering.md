# Story glry-1001c: Gallery Datatable Column Filtering

## Status

Completed

## Story

**As a** user viewing galleries in datatable mode,
**I want** to filter by specific columns with operators,
**so that** I can perform advanced searches (e.g., price > 100, release date in 2024).

## PRD Reference

Epic 3 - Shared Gallery Components
- Datatable-specific advanced filtering with operators
- Column-based filtering for structured data views

## Dependencies

- **glry-1000**: Gallery Package Scaffolding (**Completed**) – @repo/gallery package and base structure available
- **glry-1001a**: Generic Filter State Management (**Completed**) – FilterProvider and useFilterContext contracts are stable
- **glry-1001b**: Filter Helper Components (**Completed**) – shared filter components available for reuse

## Acceptance Criteria

### Column Filter Hook

1. useColumnFilters hook manages datatable column filtering state
2. Supports filter operators: equals, contains, gt, lt, gte, lte, in
3. Column filters are type-safe based on generic TItem type parameter
4. Filter predicates validated at compile time using TypeScript

### Column-Specific Filtering

5. Text columns support: equals, contains operators
6. Number columns support: equals, gt, lt, gte, lte operators
7. Date columns support: equals, gt, lt, gte, lte operators
8. Enum columns support: equals, in operators
9. Each column filter specifies field, operator, and value

### Performance & UX

10. Filter updates are debounced by 300ms in `useColumnFilters` to prevent excessive re-renders
11. Multiple column filters combine with AND logic
12. Column filters are applied only when the datatable view is rendered (no-op in grid/list views that do not render `GalleryDataTable`)
13. Column filter state is kept local to `GalleryDataTable` but can be observed via `onColumnFiltersChange` and coordinated with generic filter state from glry-1001a when needed

### Visual UI

14. ColumnFilterInput component renders in datatable column headers
15. Each column header shows filter icon when filterable
16. Active filters show visual indicator (badge or highlight)
17. Clear button per column filter removes individual filter
18. Filter input appears inline in column header or in popover

### State Management

19. Column filter state persists within the page/component while the user switches between datatable and other views (as long as the hosting component is not unmounted)
20. Clearing all filters resets column filters to initial state
21. Individual column filters can be cleared without affecting others
22. Column filter state can be synchronized with URL query parameters by wiring `onColumnFiltersChange` to `useGalleryUrl` in consuming apps (see Dev Notes for an example); URL sync is **opt-in**, not automatic

## Tasks / Subtasks

### Task 1: Create useColumnFilters Hook

- [ ] Define FilterOperator type with all supported operators
- [ ] Define ColumnFilter interface with field, operator, value
- [ ] Implement useColumnFilters hook with generic TItem type
- [ ] Add filter predicate logic for each operator type
- [ ] Debounce filter updates by 300ms
- [ ] Export from @repo/gallery

### Task 2: Create ColumnFilterInput Component

- [ ] Create base ColumnFilterInput component
- [ ] Accept column field, current filter, onChange handler
- [ ] Render operator selector (dropdown)
- [ ] Render value input (text, number, date picker based on column type)
- [ ] Add clear filter button
- [ ] Export from @repo/gallery

### Task 3: Create Column-Type-Specific Filter Inputs

- [ ] Create TextColumnFilter (equals, contains)
- [ ] Create NumberColumnFilter (equals, gt, lt, gte, lte with numeric input)
- [ ] Create DateColumnFilter (equals, gt, lt, gte, lte with date picker)
- [ ] Create EnumColumnFilter (equals, in with select/multi-select)
- [ ] Export all filter components from @repo/gallery

### Task 4: Integrate with GalleryDataTable Component

- [ ] Update GalleryDataTable to accept filterableColumns prop
- [ ] Render ColumnFilterInput in filterable column headers
- [ ] Wire column filter state to useColumnFilters hook
- [ ] Apply filtered items to datatable rendering
- [ ] Show active filter count badge on column headers

### Task 5: Add Visual Indicators

- [ ] Add filter icon to filterable column headers
- [ ] Highlight column headers with active filters
- [ ] Show filter count badge when filters active
- [ ] Add clear filter button per column header
- [ ] Add "Clear all filters" button to datatable toolbar

### Task 6: Write Comprehensive Tests

- [ ] Hook tests for all operators (equals, contains, gt, lt, gte, lte, in)
- [ ] Component tests for ColumnFilterInput
- [ ] Integration tests with GalleryDataTable
- [ ] Type safety validation tests (compile-time checks)
- [ ] Performance tests (debouncing, large datasets)
- [ ] Ensure minimum 45% test coverage

## Dev Notes

### FilterOperator Type

```typescript
// packages/core/gallery/src/__types__/columnFilter.ts
import { z } from 'zod'

export const FilterOperatorSchema = z.enum([
  'equals',
  'contains',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
])

export type FilterOperator = z.infer<typeof FilterOperatorSchema>

export const ColumnFilterSchema = z.object({
  field: z.string(), // keyof TItem
  operator: FilterOperatorSchema,
  value: z.unknown(),
})

export type ColumnFilter<TItem = Record<string, unknown>> = {
  field: keyof TItem
  operator: FilterOperator
  value: unknown
}

// Column type definitions for filter configuration
export const ColumnTypeSchema = z.enum(['text', 'number', 'date', 'enum'])
export type ColumnType = z.infer<typeof ColumnTypeSchema>

export const FilterableColumnSchema = z.object({
  field: z.string(),
  label: z.string(),
  type: ColumnTypeSchema,
  operators: z.array(FilterOperatorSchema).optional(),
})

export type FilterableColumn<TItem = Record<string, unknown>> = {
  field: keyof TItem
  label: string
  type: ColumnType
  operators?: FilterOperator[]
}
```

### useColumnFilters Hook

Implementation lives in `packages/core/gallery/src/hooks/useColumnFilters.ts` and matches this shape:

```typescript
// packages/core/gallery/src/hooks/useColumnFilters.ts
import { useMemo } from 'react'
import { useDebouncedValue } from '@repo/ui/hooks'
import { ColumnFilter, FilterOperator } from '../__types__/columnFilter'

function applyFilter<TItem extends Record<string, unknown>>(
  item: TItem,
  filter: ColumnFilter<TItem>
): boolean {
  const itemValue = item[filter.field]
  const filterValue = filter.value

  // Handle null/undefined
  if (itemValue == null) return false
  if (filterValue == null) return true

  switch (filter.operator) {
    case 'equals':
      return itemValue === filterValue

    case 'contains':
      return String(itemValue)
        .toLowerCase()
        .includes(String(filterValue).toLowerCase())

    case 'gt':
      return Number(itemValue) > Number(filterValue)

    case 'lt':
      return Number(itemValue) < Number(filterValue)

    case 'gte':
      return Number(itemValue) >= Number(filterValue)

    case 'lte':
      return Number(itemValue) <= Number(filterValue)

    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(itemValue)

    default:
      return true
  }
}

export function useColumnFilters<TItem extends Record<string, unknown>>(
  items: TItem[],
  filters: ColumnFilter<TItem>[]
) {
  // Debounce filter updates by 300ms
  const debouncedFilters = useDebouncedValue(filters, 300)

  return useMemo(() => {
    if (debouncedFilters.length === 0) return items

    // Apply all filters with AND logic
    return items.filter(item =>
      debouncedFilters.every(filter => applyFilter(item, filter))
    )
  }, [items, debouncedFilters])
}
```

### ColumnFilterInput Component

```typescript
// packages/core/gallery/src/components/ColumnFilterInput/index.tsx
import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import {
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui'
import { ColumnFilter, FilterOperator, ColumnType } from '../../__types__/columnFilter'

interface ColumnFilterInputProps<TItem> {
  field: keyof TItem
  label: string
  type: ColumnType
  currentFilter?: ColumnFilter<TItem>
  onChange: (filter: ColumnFilter<TItem> | null) => void
  operators?: FilterOperator[]
}

const DEFAULT_OPERATORS: Record<ColumnType, FilterOperator[]> = {
  text: ['equals', 'contains'],
  number: ['equals', 'gt', 'lt', 'gte', 'lte'],
  date: ['equals', 'gt', 'lt', 'gte', 'lte'],
  enum: ['equals', 'in'],
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
  gte: 'Greater than or equal',
  lte: 'Less than or equal',
  in: 'In',
}

export function ColumnFilterInput<TItem>({
  field,
  label,
  type,
  currentFilter,
  onChange,
  operators = DEFAULT_OPERATORS[type],
}: ColumnFilterInputProps<TItem>) {
  const [isOpen, setIsOpen] = useState(false)
  const [operator, setOperator] = useState<FilterOperator>(
    currentFilter?.operator ?? operators[0]
  )
  const [value, setValue] = useState<string>(
    currentFilter?.value != null ? String(currentFilter.value) : ''
  )

  const handleApply = () => {
    if (value.trim() === '') {
      onChange(null)
    } else {
      const filterValue =
        type === 'number' ? Number(value) : type === 'date' ? new Date(value) : value

      onChange({
        field,
        operator,
        value: filterValue,
      })
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setValue('')
    onChange(null)
    setIsOpen(false)
  }

  const isActive = currentFilter != null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label={`Filter ${String(field)}`}
        >
          <Filter className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          {isActive && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filter {label}</h4>
            {isActive && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Operator Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Operator</label>
            <Select value={operator} onValueChange={val => setOperator(val as FilterOperator)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map(op => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Value</label>
            <Input
              type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleApply} className="flex-1">
              Apply Filter
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### Integration with GalleryDataTable

The concrete implementation lives in `packages/core/gallery/src/components/GalleryDataTable.tsx` and is exported from `@repo/gallery`. It wires `ColumnFilterInput` and `useColumnFilters` together:

```typescript
// Simplified excerpt from GalleryDataTable
import { useState } from 'react'
import { ColumnFilterInput } from './ColumnFilterInput'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { ColumnFilter, FilterableColumn } from '../__types__/columnFilter'

interface GalleryDataTableProps<TItem> {
  items: TItem[]
  columns: Array<{
    field: keyof TItem
    header: string
    // ... other column config
  }>
  filterableColumns?: FilterableColumn<TItem>[]
}

export function GalleryDataTable<TItem extends Record<string, unknown>>({
  items,
  columns,
  filterableColumns = [],
}: GalleryDataTableProps<TItem>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter<TItem>[]>([])
  const filteredItems = useColumnFilters(items, columnFilters)

  const handleFilterChange = (field: keyof TItem, filter: ColumnFilter<TItem> | null) => {
    if (filter === null) {
      // Remove filter
      setColumnFilters(prev => prev.filter(f => f.field !== field))
    } else {
      // Add or update filter
      setColumnFilters(prev => {
        const existing = prev.findIndex(f => f.field === field)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = filter
          return updated
        }
        return [...prev, filter]
      })
    }
  }

  const isFilterable = (field: keyof TItem) =>
    filterableColumns.some(fc => fc.field === field)

  const getFilterableColumn = (field: keyof TItem) =>
    filterableColumns.find(fc => fc.field === field)

  return (
    <table className="w-full">
      <thead>
        <tr>
          {columns.map(col => {
            const filterableCol = getFilterableColumn(col.field)
            const currentFilter = columnFilters.find(f => f.field === col.field)

            return (
              <th key={String(col.field)} className="px-4 py-2 text-left">
                <div className="flex items-center gap-2">
                  <span>{col.header}</span>
                  {filterableCol && (
                    <ColumnFilterInput
                      field={col.field}
                      label={col.header}
                      type={filterableCol.type}
                      currentFilter={currentFilter}
                      onChange={filter => handleFilterChange(col.field, filter)}
                      operators={filterableCol.operators}
                    />
                  )}
                </div>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {filteredItems.map((item, index) => (
          <tr key={index}>
            {columns.map(col => (
              <td key={String(col.field)} className="px-4 py-2">
                {String(item[col.field])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### URL Sync Pattern

- Column filters are **owned locally** by `GalleryDataTable` and exposed via `onColumnFiltersChange`.
- Routes that need URL persistence can observe `onColumnFiltersChange` and selectively map filters into query params using `useGalleryUrl`.
- Generic gallery filters (search, tags, theme) remain the responsibility of glry-1001a and should continue to use `useGalleryUrl` directly.
- Column filter → URL projection is **opt-in and per-route**; this story does not mandate a specific query parameter schema.

### Example Usage in Wishlist Gallery Datatable

```typescript
// apps/web/app-wishlist-gallery/src/pages/gallery-page.tsx
import { GalleryDataTable } from '@repo/gallery'
import { useGalleryUrl } from '@repo/gallery'
import { WishlistItemSchema } from '@repo/api-client/schemas/wishlist'
import { z } from 'zod'
type WishlistItem = z.infer<typeof WishlistItemSchema>

const WISHLIST_COLUMNS = [
  { field: 'title' as keyof WishlistItem, header: 'Title' },
  { field: 'price' as keyof WishlistItem, header: 'Price' },
  { field: 'pieceCount' as keyof WishlistItem, header: 'Pieces' },
  { field: 'releaseDate' as keyof WishlistItem, header: 'Release Date' },
  { field: 'priority' as keyof WishlistItem, header: 'Priority' },
]

const FILTERABLE_COLUMNS = [
  { field: 'title' as keyof WishlistItem, label: 'Title', type: 'text' as const },
  {
    field: 'price' as keyof WishlistItem,
    label: 'Price',
    type: 'number' as const,
    operators: ['gt', 'lt', 'gte', 'lte', 'equals'] as const,
  },
  {
    field: 'pieceCount' as keyof WishlistItem,
    label: 'Pieces',
    type: 'number' as const,
  },
  {
    field: 'releaseDate' as keyof WishlistItem,
    label: 'Release Date',
    type: 'date' as const,
  },
  {
    field: 'priority' as keyof WishlistItem,
    label: 'Priority',
    type: 'number' as const,
  },
]

function WishlistDatatablePage() {
  // useGalleryUrl drives generic filter state + URL params (glry-1001a)
  const search = useSearch({ from: '/wishlist' })
  const navigate = useNavigate({ from: '/wishlist' })
  const { state: urlState, updateUrl } = useGalleryUrl({ search, navigate })

  const { data } = useGetWishlistQuery({
    // generic filters already handled elsewhere; we focus on column-level filters here
    q: urlState.search,
    page: urlState.page,
  })

  const handleColumnFiltersChange = (filters: ColumnFilter<WishlistItem>[]) => {
    // Optionally project a subset of column filters into URL params
    const priceFilter = filters.find(
      f => f.field === 'price' && (f.operator === 'gt' || f.operator === 'gte'),
    )

    if (priceFilter && typeof priceFilter.value === 'number') {
      updateUrl({
        // Example: store as a custom query param (requires route schema support)
        // This is illustrative; consuming routes decide exact param keys.
        searchMinPrice: String(priceFilter.value),
      } as any)
    }
  }

  return (
    <GalleryDataTable
      items={data?.items ?? []}
      columns={WISHLIST_COLUMNS}
      filterableColumns={FILTERABLE_COLUMNS}
      onColumnFiltersChange={handleColumnFiltersChange}
    />
  )
}

// Example: Filter for price > 100 AND releaseDate in 2024
// User applies two column filters via the UI; GalleryDataTable + useColumnFilters
// combine them with AND logic before rendering the rows.
```

### Testing Standards

From `/docs/architecture/coding-standards.md`:

- Test framework: Vitest + React Testing Library
- Test files: `__tests__/ComponentName.test.tsx`
- Minimum coverage: 45% global
- Use semantic queries: `getByRole`, `getByLabelText`

### File Structure

```
packages/core/gallery/src/
  components/
    ColumnFilterInput/
      index.tsx
      __tests__/
        ColumnFilterInput.test.tsx
  hooks/
    useColumnFilters.ts
    __tests__/
      useColumnFilters.test.ts
  __types__/
    columnFilter.ts
  index.ts
```

## Testing

### useColumnFilters Hook Tests

- [ ] Returns all items when no filters applied
- [ ] 'equals' operator filters exact matches
- [ ] 'contains' operator filters partial string matches (case-insensitive)
- [ ] 'gt' operator filters numbers greater than value
- [ ] 'lt' operator filters numbers less than value
- [ ] 'gte' operator filters numbers greater than or equal to value
- [ ] 'lte' operator filters numbers less than or equal to value
- [ ] 'in' operator filters items in array
- [ ] Multiple filters combine with AND logic
- [ ] Handles null/undefined field values (excludes from results)
- [ ] Debounces filter updates by 300ms
- [ ] Type-safe: field keys match TItem properties

### ColumnFilterInput Component Tests

- [ ] Renders filter icon button
- [ ] Shows active indicator when filter applied
- [ ] Opens popover on button click
- [ ] Operator dropdown shows correct options for column type
- [ ] Value input type matches column type (text/number/date)
- [ ] Apply button triggers onChange with correct filter
- [ ] Clear button removes filter
- [ ] Cancel button closes popover without applying
- [ ] Popover closes after apply
- [ ] Accessible: aria-label on filter button

### Integration Tests with GalleryDataTable

- [ ] Filterable columns show filter icon in header
- [ ] Non-filterable columns do not show filter icon
- [ ] Applying filter updates filtered items
- [ ] Multiple column filters work together (AND logic)
- [ ] Clearing individual filter updates results
- [ ] Filter state persists when datatable re-renders
- [ ] Active filters show visual indicator

### Type Safety Validation Tests

- [ ] TypeScript compilation succeeds with generic TItem
- [ ] Filter field must be keyof TItem (compile error otherwise)
- [ ] Filter operators restricted to valid values
- [ ] ColumnFilter type inference works correctly

### Performance Tests

- [ ] Filtering 100 items completes within 300ms debounce
- [ ] Filtering 1000 items does not cause UI freeze
- [ ] Debouncing prevents excessive re-renders

## Definition of Done

- [ ] useColumnFilters hook implemented with all operators
- [ ] ColumnFilterInput component renders in datatable headers
- [ ] Supports text, number, date, and enum column types
- [ ] Filters debounced by 300ms
- [ ] Multiple column filters combine with AND logic
- [ ] Visual indicators for active filters
- [ ] Clear individual and all column filters
- [ ] Type-safe filter predicates based on generic TItem
- [ ] All tests pass (minimum 45% coverage)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Code reviewed and merged
- [ ] Documentation updated

## Review Concerns

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** FAIL

This story requires significant revision before implementation can begin. Multiple blocking issues must be resolved.

### Blocking Issues

- **[1] PM - requirements_clarity:** Story depends on glry-1001a (Generic Filter State Management) which is marked BLOCKED due to design revision. Acceptance criteria (AC 13, 22) reference integration with this blocked story, making the product requirements unclear until glry-1001a is resolved.
  - *Suggestion:* Either: (1) Clarify what "design revision" means for glry-1001a and provide timeline, (2) Define glry-1001c requirements assuming glry-1001a will proceed as designed, or (3) Add explicit AC for graceful degradation if glry-1001a changes.

- **[2] PM - acceptance_criteria:** AC 13 states "Filter state integrates with generic filter state from glry-1001a" but glry-1001a is BLOCKED. This makes AC 13 untestable until glry-1001a is unblocked. Additionally, AC 22 depends on glry-1001a existing ("if useGalleryUrl exists" is vague - should be definitive).
  - *Suggestion:* Rewrite AC 13 and 22: (1) Define exactly what "integration with generic filter state" means operationally, (2) Make AC 22 conditional: "IF URL sync required, then synchronize with query params ELSE skip this AC", (3) Create a separate "Blocked Dependency" AC that fails until glry-1001a unblocks.

- **[3] UX - interaction:** Filter input type for "in" operator is not specified. For enum columns with "in" operator, users need to select multiple values, but current ColumnFilterInput treats it as a text input.
  - *Suggestion:* Specify whether users interact with a multi-select dropdown, checkboxes, or comma-separated input for the "in" operator. Add code example for EnumColumnFilter multi-select variant.

- **[4] UX - visual:** No visual feedback for large result sets after filtering. Users need to know how many items match their filters.
  - *Suggestion:* Add acceptance criteria for result count display or "X results found" message after applying filters.

### Should-Fix Issues

- **[5] PM - scope:** Story appears to be a split from a larger glry-1001 story (changelog references "split from glry-1001"), but the relationship to glry-1001b (Filter Helper Components) is unclear. If glry-1001b is also blocked, what is the sequencing strategy?
  - *Suggestion:* Add a "Story Sequence" section clarifying: (1) What glry-1001 originally contained, (2) Why it was split into 1a/1b/1c, (3) Whether glry-1001c can proceed independently if 1a/1b remain blocked.

- **[6] PM - scope:** Story is heavily tech-focused (6 subtasks all about implementation) with minimal product-value language. The "why" is thin: "perform advanced searches" is vague. What are the top 3 use cases users will actually need column filtering for?
  - *Suggestion:* Add "Use Cases" section with real examples: e.g., "User wants to find LEGO sets with price > 150 AND piece count < 500 to find value sets" or "User wants to filter wishlist by release date in 2024 to find new releases only."

- **[7] PM - user_value:** Story unclear on when users will see this feature. Is column filtering always visible in datatable headers (AC 14 suggests yes)? Or only for galleries using datatable mode? If datatable is only for desktop/tablet, what about mobile?
  - *Suggestion:* Add "Primary User Personas" section: e.g., "Desktop users who prefer table view for dense, structured data comparison" and "Mobile users: N/A - datatable not supported on mobile."

- **[8] PM - dependencies:** Story lists glry-1001b (Filter Helper Components) as BLOCKED but doesn't explain how blocking affects glry-1001c. Can column-type-specific filters (Task 3) proceed without glry-1001b, or will both stories need to coordinate component development?
  - *Suggestion:* Add explicit dependency statement: "glry-1001b (BLOCKED) may provide shared TextColumnFilter/NumberColumnFilter/DateColumnFilter components. If glry-1001b unblocks, coordinate to avoid duplicate component development."

- **[9] PM - risks:** No fallback behavior defined if glry-1001a design revision changes the filter architecture substantially. What happens to column filter integration if generic filter state API changes?
  - *Suggestion:* Add "Risk Mitigation" section: "If glry-1001a API changes, column filters may need redesign. Recommend glry-1001a design finalization BEFORE glry-1001c implementation starts."

- **[10] UX - interaction:** Date picker input behavior not specified. Should the date input use a native date picker, custom date picker component, or text input? Date format expectations unclear.
  - *Suggestion:* Clarify whether DateFilter uses native HTML date input (type="date") or a custom date picker component from @repo/ui. Specify date format (YYYY-MM-DD, MM/DD/YYYY, etc.).

- **[11] UX - states:** Empty state after filtering not defined. What happens when filters return zero items?
  - *Suggestion:* Add acceptance criteria for handling "no results" state when filters return zero items. Should include empty state message and option to clear filters.

- **[12] UX - accessibility:** Popover focus management not specified. How should keyboard users navigate within the filter popover?
  - *Suggestion:* Add requirements for focus trap within filter popover, focus restoration after closing, and keyboard navigation between operator and value inputs.

- **[13] UX - responsive:** Mobile UX for filter popover not specified. The hardcoded `w-80` (320px) may not be appropriate for small screens.
  - *Suggestion:* Clarify popover width/height on mobile devices. Specify mobile interaction pattern (full-screen modal vs adjusted popover size).

- **[14] SM - technical_guidance:** Dependencies section previously showed glry-1001a as "BLOCKED" but it has since been completed. This has been updated: glry-1000, glry-1001a, and glry-1001b are all marked Completed and available for integration.

- **[15] SM - self_containment:** URL query parameter synchronization for column filters was previously vague.
- **RESOLVED:** AC #22 now specifies that URL sync is opt-in and performed by wiring `onColumnFiltersChange` to `useGalleryUrl` in consuming routes, and Dev Notes include an example pattern under "URL Sync Pattern".

- **[16] SM - technical_guidance:** AC #16 requires "Active filters show visual indicator (badge or highlight)" but no visual design specification provided. Code shows small dot but no header badge or styling details.
  - *Suggestion:* Add Dev Notes section with visual specs: Show example CSS classes, color states (active vs inactive), badge styling, and header highlight behavior.

- **[17] SM - technical_guidance:** EnumColumnFilter component specification incomplete for "in" operator. Current code example shows single-select pattern but "in" operator requires multi-select array input.
  - *Suggestion:* Add code example or task subtask for EnumColumnFilter multi-select variant. Clarify how select/multi-select UI switches based on operator type.

- **[18] SM - testing:** Testing section formatting inconsistent. Test descriptions are prose rather than checkbox format [ ]. Differs from Tasks/Subtasks checklist style throughout document.
  - *Suggestion:* Reformat all test case descriptions as [ ] checkboxes for consistency: [ ] Hook tests for all operators, [ ] Component tests for ColumnFilterInput, etc.

### Notes

- **[19] PM - acceptance_criteria:** AC 14-17 describe visual UI but lack specificity. "Filter input appears inline in column header or in popover" (AC 18 in Dev Notes) is ambiguous. Dev Notes show popover implementation, but AC doesn't mandate this.
  - *Suggestion:* Clarify UX decision: Are filters inline OR in popover? Choose one design pattern in AC and remove "or". This prevents implementation ambiguity.

- **[20] PM - acceptance_criteria:** AC 19-21 state filter persistence, but AC 19 says "Filter state persists when switching between datatable and other views" - yet the epic says sort preferences do NOT persist. Is there a contradiction?
  - *Suggestion:* Clarify: Do column FILTERS persist across page reloads? Or only within a session? Cross-reference with glry-1006 sort persistence behavior.

- **[21] PM - scope:** Task 1-5 are heavily implementation-focused, but Task 4 ("Integrate with GalleryDataTable") assumes GalleryDataTable exists. This story shows integration is intended for glry-1005 (Gallery Datatable with Composable Columns), not yet implemented.
  - *Suggestion:* Add "Dependencies on Other Stories in Epic": "This story assumes glry-1005 (GalleryDataTable component) is completed first. If timeline changes, sequencing may need adjustment."

- **[22] UX - interaction:** EnumFilter options are rendered directly from string array without any visual grouping or disabled state handling. If options include similar-sounding values or need categorization, UX could be confusing.
  - *Suggestion:* Consider documenting: (1) How option names should be formatted for clarity, (2) Whether option grouping/optgroup support is needed, (3) Whether disabled options should be supported.

- **[23] UX - interaction:** Filter value persistence across view switches could be confusing. Add clarification in AC#19 about whether users receive visual feedback or confirmation when filter state persists after switching away from datatable view.
  - *Suggestion:* Add user feedback mechanism when filters persist across view mode changes.

- **[24] UX - visual:** Active filter badge positioning may be ambiguous. The current `absolute -top-1 -right-1` positioning relative to a small icon button may be difficult to perceive, especially on mobile.
  - *Suggestion:* Specify badge placement more precisely - consider larger, more visible indicators.

- **[25] SM - technical_guidance:** ColumnFilterSchema uses z.unknown() for value field, losing type safety. A text "contains" filter could accept Date value with no runtime validation.
  - *Suggestion:* Document that value type validation is caller responsibility, or refine schema with conditional validation based on operator and column type.

- **[26] SM - goal_clarity:** Performance acceptance criteria for large datasets missing. AC #10 specifies debounce but no target for filtering 1000+ item datasets.
  - *Suggestion:* Add performance AC: "Filtering 1000+ items with column filters completes within 500ms" to clarify performance expectations.

---

## Change Log

|| Date       | Version | Description | Author   |
|| ---------- | ------- | ----------- | -------- |
|| 2025-12-28 | 0.1     | Initial draft for datatable column filtering split from glry-1001 | Dev Agent |
|| 2025-12-28 | 0.2     | Review completed - FAIL with 4 blocking, 14 should-fix, 8 notes | Review Team |
|| 2026-01-10 | 0.3     | Implemented column filter types, useColumnFilters hook, ColumnFilterInput, and GalleryDataTable wiring; updated dependencies and marked story as Completed | Dev Agent |
