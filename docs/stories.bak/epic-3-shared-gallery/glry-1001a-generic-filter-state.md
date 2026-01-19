# Story glry-1001a: Gallery Generic Filter State Management

## Status

Completed

## Story

**As a** developer building gallery pages,
**I want** generic filter state management that supports any custom filter fields,
**so that** I can add domain-specific filters without modifying core gallery hooks and migrate from prop-based to context-based state seamlessly.

## PRD Reference

Epic 3 - Shared Gallery Components (See `/docs/epics/epic-3-shared-gallery.md`)
- Reusable filtering and search components
- Support for multiple view modes (grid, list, datatable)

## Dependencies

- **glry-1000**: Gallery Package Scaffolding (provides basic package structure with GalleryFilterBar component and useGalleryState/useGalleryUrl hooks using prop-based filter state)

## Acceptance Criteria

### Generic Filter State Management

1. useGalleryState hook supports generic `filters: Record<string, unknown>` instead of hardcoded fields (search, tags, theme)
2. useGalleryUrl hook syncs generic filter fields to URL query params
3. Filter state updates trigger URL synchronization automatically
4. Reading filter values from URL initializes state on page load
5. Type-safe filter field access using TypeScript generics `TFilters extends Record<string, unknown>`

### Backwards Compatibility

6. Existing prop-based GalleryFilterBar usage continues to work without changes
7. Migration path documented for transitioning from prop-based to context-based state
8. FilterContext is opt-in enhancement, not breaking change
9. Existing consumers (e.g., hardcoded search/tags/theme filters) can migrate incrementally

### Filter Context Integration

10. FilterContext provides centralized filter state for complex filter UIs
11. useFilterContext hook exposes `{ filters, updateFilter, clearFilters, clearFilter }`
12. Context supports generic filter shapes via TypeScript generics
13. FilterProvider throws clear error message when useFilterContext used outside provider

### Accessibility

14. All filter controls have proper ARIA labels (aria-label, aria-labelledby)
15. Filter toggle buttons use aria-pressed to indicate active state
16. Screen reader announces filter application and result count changes via aria-live region
17. Keyboard navigation works: Tab order through filters, Enter/Space for activation, Escape to close dropdowns

### UI States

18. Active filters have visual feedback (badge count, highlight, or color change)
19. Filter controls define Tailwind color classes for active, disabled, error states
20. Loading state shows spinner during debounced filter processing (isFiltering boolean in context)
21. Error state displays clear message for invalid filter values (e.g., malformed number ranges)

### Mobile/Responsive

22. All filter controls meet minimum 44x44px touch target size
23. Custom filters stack vertically on mobile breakpoints (sm: <640px)
24. Search input moves to separate row on mobile for better usability
25. Filter layout uses responsive Tailwind classes (md:flex-row, flex-col)

## Tasks / Subtasks

### Task 1: Enhance useGalleryState Hook for Generic Filters

- [ ] Replace hardcoded filter fields (search, tags, theme) with generic `filters: TFilters`
- [ ] Add TypeScript generic parameter `TFilters extends Record<string, unknown>`
- [ ] Update internal state management to support dynamic filter keys
- [ ] Ensure updateFilter, clearFilters, clearFilter work with generic shape
- [ ] Add type-safe filter field access via keyof TFilters

### Task 2: Enhance useGalleryUrl Hook for Generic Filter Sync

- [ ] Update URL sync logic to handle generic filter fields dynamically
- [ ] Parse URL query params into generic filter object on initialization
- [ ] Serialize generic filter state to URL query params on updates
- [ ] Handle filter value types: string, number, boolean, array serialization
- [ ] Preserve existing non-filter query params during sync

### Task 3: Create FilterContext for Centralized State

- [ ] Create `FilterContext` with generic `TFilters` type parameter
- [ ] Implement FilterProvider component accepting initialFilters
- [ ] Export `useFilterContext<TFilters>()` hook from @repo/gallery
- [ ] Add isFiltering state for loading UI during debounced processing
- [ ] Throw clear error when useFilterContext used outside FilterProvider

### Task 4: Add Accessibility Features

- [ ] Add ARIA labels to all filter controls (aria-label, aria-labelledby)
- [ ] Implement aria-pressed for filter toggle buttons
- [ ] Add aria-live region for announcing filter changes and result counts
- [ ] Document keyboard navigation patterns (Tab, Enter, Space, Escape, arrows)
- [ ] Ensure focus management when filters applied/cleared

### Task 5: Implement UI State Handling

- [ ] Add active filter visual feedback (badge, highlight, Tailwind colors)
- [ ] Define Tailwind classes for active, disabled, error states
- [ ] Implement loading spinner UI during isFiltering state
- [ ] Add error state handling with clear error messages for invalid values
- [ ] Create utility for displaying active filter count badge

### Task 6: Add Mobile/Responsive Support

- [ ] Ensure minimum 44x44px touch targets for all filter controls
- [ ] Implement vertical stacking on mobile breakpoints (sm: <640px)
- [ ] Move search to separate row on mobile layouts
- [ ] Add responsive Tailwind classes (flex-col, md:flex-row, gap adjustments)
- [ ] Test filter UI on mobile viewports (375px, 768px, 1024px)

### Task 7: Document Migration Path

- [ ] Write migration guide from prop-based to context-based state
- [ ] Document backwards compatibility guarantees
- [ ] Provide code examples for incremental migration
- [ ] Add type migration examples (hardcoded filters → generic filters)
- [ ] Create troubleshooting section for common migration issues

## Dev Notes

### Scope Clarification

This story focuses on **generic filter state management only**. The following are OUT OF SCOPE:
- Full-text search hooks (moved to glry-1003)
- Column filtering hooks (moved to glry-1001c)
- Filter UI components (TextFilter, NumberFilter, etc. - moved to glry-1001b)

**IN SCOPE**: Enhancing useGalleryState and useGalleryUrl to support generic filter fields via TypeScript generics, adding FilterContext for centralized state, and ensuring backwards compatibility.

### Backwards Compatibility Strategy

**Current State (glry-1000):**
- GalleryFilterBar uses prop-based state: `searchTerm`, `onSearchChange`, etc.
- No centralized filter context
- Hardcoded filter fields (if any) in consuming apps

**Migration Path:**
1. **Phase 1 (This Story):** Add FilterContext as opt-in enhancement alongside existing prop-based usage
2. **Phase 2 (Future):** Gradually migrate consuming apps to use FilterContext
3. **Phase 3 (Future):** Deprecate prop-based approach (with warning period)

**Guarantees:**
- Existing GalleryFilterBar prop usage continues to work
- FilterContext is additive, not breaking
- Type signatures remain compatible for existing consumers

### Enhanced useGalleryState Hook

**Before (Hardcoded):**
```typescript
// packages/core/gallery/src/hooks/useGalleryState.ts (OLD)
interface GalleryState {
  search: string
  tags: string[]
  theme?: string
  viewMode: 'grid' | 'list' | 'datatable'
}

export function useGalleryState() {
  const [search, setSearch] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [theme, setTheme] = useState<string>()
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'datatable'>('grid')

  // ... hardcoded logic
}
```

**After (Generic):**
```typescript
// packages/core/gallery/src/hooks/useGalleryState.ts (NEW)
import { useState, useCallback } from 'react'

interface GalleryState<TFilters extends Record<string, unknown> = Record<string, unknown>> {
  filters: TFilters
  viewMode: 'grid' | 'list' | 'datatable'
}

export function useGalleryState<TFilters extends Record<string, unknown>>(
  initialFilters: TFilters,
  initialViewMode: 'grid' | 'list' | 'datatable' = 'grid'
) {
  const [filters, setFilters] = useState<TFilters>(initialFilters)
  const [viewMode, setViewMode] = useState(initialViewMode)

  const updateFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const clearFilter = useCallback(<K extends keyof TFilters>(key: K) => {
    setFilters(prev => ({ ...prev, [key]: initialFilters[key] }))
  }, [initialFilters])

  return {
    filters,
    viewMode,
    updateFilter,
    clearFilters,
    clearFilter,
    setViewMode,
  }
}
```

**Migration Example:**
```typescript
// OLD: Hardcoded approach
const [search, setSearch] = useState('')
const [tags, setTags] = useState<string[]>([])

// NEW: Generic approach
interface WishlistFilters {
  search: string
  tags: string[]
  store?: string
  priority?: number
}

const { filters, updateFilter } = useGalleryState<WishlistFilters>({
  search: '',
  tags: [],
  store: undefined,
  priority: undefined,
})

// Usage: updateFilter('search', 'LEGO Castle')
// Type-safe: updateFilter('invalidKey', 'value') ❌ TypeScript error
```

### Enhanced useGalleryUrl Hook

**Before (Hardcoded):**
```typescript
// packages/core/gallery/src/hooks/useGalleryUrl.ts (OLD)
export function useGalleryUrl() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const tags = searchParams.get('tags')?.split(',') ?? []
  const theme = searchParams.get('theme') ?? undefined

  const updateSearch = (value: string) => {
    setSearchParams(prev => {
      if (value) prev.set('search', value)
      else prev.delete('search')
      return prev
    })
  }

  // ... hardcoded for each field
}
```

**After (Generic):**
```typescript
// packages/core/gallery/src/hooks/useGalleryUrl.ts (NEW)
import { useSearchParams } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

export function useGalleryUrl<TFilters extends Record<string, unknown>>(
  initialFilters: TFilters
) {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse URL params into filter object
  const filters = useMemo(() => {
    const parsed = { ...initialFilters }

    Object.keys(initialFilters).forEach(key => {
      const value = searchParams.get(key)
      if (value !== null) {
        // Type-aware parsing
        const initialValue = initialFilters[key]
        if (typeof initialValue === 'number') {
          parsed[key] = Number(value) as TFilters[Extract<keyof TFilters, string>]
        } else if (typeof initialValue === 'boolean') {
          parsed[key] = (value === 'true') as TFilters[Extract<keyof TFilters, string>]
        } else if (Array.isArray(initialValue)) {
          parsed[key] = value.split(',') as TFilters[Extract<keyof TFilters, string>]
        } else {
          parsed[key] = value as TFilters[Extract<keyof TFilters, string>]
        }
      }
    })

    return parsed
  }, [searchParams, initialFilters])

  // Update filter in URL
  const updateFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setSearchParams(prev => {
      const keyStr = String(key)

      if (value === undefined || value === null || value === '') {
        prev.delete(keyStr)
      } else if (Array.isArray(value)) {
        prev.set(keyStr, value.join(','))
      } else {
        prev.set(keyStr, String(value))
      }

      return prev
    })
  }, [setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      Object.keys(initialFilters).forEach(key => prev.delete(key))
      return prev
    })
  }, [setSearchParams, initialFilters])

  return {
    filters,
    updateFilter,
    clearFilters,
  }
}
```

### FilterContext with Loading State

```typescript
// packages/core/gallery/src/contexts/FilterContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'

interface FilterContextValue<TFilters = Record<string, unknown>> {
  filters: TFilters
  updateFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void
  clearFilters: () => void
  clearFilter: <K extends keyof TFilters>(key: K) => void
  isFiltering: boolean
  activeFilterCount: number
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider<TFilters extends Record<string, unknown>>({
  children,
  initialFilters,
  debounceMs = 300,
}: {
  children: React.ReactNode
  initialFilters: TFilters
  debounceMs?: number
}) {
  const [filters, setFilters] = useState<TFilters>(initialFilters)
  const [isFiltering, setIsFiltering] = useState(false)

  // Track debounce timeout for loading state
  useEffect(() => {
    setIsFiltering(true)
    const timeout = setTimeout(() => setIsFiltering(false), debounceMs)
    return () => clearTimeout(timeout)
  }, [filters, debounceMs])

  // Count active filters (non-default values)
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).reduce((count, key) => {
      const value = filters[key as keyof TFilters]
      const initial = initialFilters[key as keyof TFilters]

      // Compare with initial value
      if (value !== initial && value !== '' && value !== undefined && value !== null) {
        return count + 1
      }
      return count
    }, 0)
  }, [filters, initialFilters])

  const updateFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const clearFilter = useCallback(<K extends keyof TFilters>(key: K) => {
    setFilters(prev => ({ ...prev, [key]: initialFilters[key] }))
  }, [initialFilters])

  return (
    <FilterContext.Provider
      value={{
        filters,
        updateFilter,
        clearFilters,
        clearFilter,
        isFiltering,
        activeFilterCount
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilterContext<TFilters = Record<string, unknown>>(): FilterContextValue<TFilters> {
  const context = useContext(FilterContext) as FilterContextValue<TFilters> | null
  if (!context) {
    throw new Error(
      'useFilterContext must be used within a FilterProvider. ' +
      'Wrap your component tree with <FilterProvider initialFilters={{...}}>.'
    )
  }
  return context
}
```

### Accessibility Features

**ARIA Labels and Announcements:**
```typescript
// Filter controls with proper ARIA
<Input
  aria-label="Search gallery items"
  aria-describedby="search-help-text"
  placeholder="Search..."
  value={filters.search}
  onChange={(e) => updateFilter('search', e.target.value)}
  className="pl-10 min-h-[44px]" // 44px touch target
/>

// View toggle with aria-pressed
<Button
  variant={viewMode === 'grid' ? 'default' : 'ghost'}
  size="sm"
  onClick={() => setViewMode('grid')}
  aria-pressed={viewMode === 'grid'}
  aria-label="Grid view"
  className="min-h-[44px] min-w-[44px]"
>
  Grid
</Button>

// Screen reader announcement region
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {activeFilterCount > 0
    ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied. Showing ${filteredCount} of ${totalCount} items.`
    : `Showing all ${totalCount} items.`
  }
</div>
```

**Keyboard Navigation:**
```typescript
// Escape to clear filters
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && activeFilterCount > 0) {
      clearFilters()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [clearFilters, activeFilterCount])
```

### UI State Handling

**Active Filter Badge:**
```typescript
// Active filter count indicator
{activeFilterCount > 0 && (
  <span
    className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 min-w-[20px]"
    aria-label={`${activeFilterCount} active filters`}
  >
    {activeFilterCount}
  </span>
)}
```

**Loading Spinner:**
```typescript
// Show loading during filtering
{isFiltering && (
  <div className="flex items-center gap-2 text-muted-foreground text-sm">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    <span>Filtering...</span>
  </div>
)}
```

**Error State:**
```typescript
// Error handling for invalid filter values
interface FilterError {
  field: string
  message: string
}

const [filterErrors, setFilterErrors] = useState<FilterError[]>([])

// Validation example
const validateNumberRange = (min?: number, max?: number) => {
  if (min !== undefined && max !== undefined && min > max) {
    setFilterErrors([{
      field: 'price',
      message: 'Minimum price cannot be greater than maximum price'
    }])
    return false
  }
  setFilterErrors([])
  return true
}

// Display error
{filterErrors.length > 0 && (
  <div className="text-destructive text-sm" role="alert">
    {filterErrors.map(err => (
      <p key={err.field}>{err.message}</p>
    ))}
  </div>
)}
```

### Mobile/Responsive Layout

**Responsive Filter Bar:**
```typescript
// packages/core/gallery/src/components/GalleryFilterBar.tsx
export function GalleryFilterBar({ children }: GalleryFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Search on its own row for mobile */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search gallery"
          placeholder="Search..."
          className="pl-10 min-h-[44px]" // 44px touch target
        />
      </div>

      {/* Custom filters stack vertically on mobile, horizontal on desktop */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:flex-wrap">
        {children}
      </div>

      {/* View mode toggle with adequate touch targets */}
      <div className="flex gap-2 sm:self-end">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px] flex-1 sm:flex-none"
          aria-label="Grid view"
        >
          Grid
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px] flex-1 sm:flex-none"
          aria-label="List view"
        >
          List
        </Button>
      </div>
    </div>
  )
}
```

**Breakpoint Specifications:**
- Mobile: `< 640px` - Vertical stacking, full-width inputs, 44px touch targets
- Tablet: `640px - 1024px` - Partial horizontal layout, 2-column filter grid
- Desktop: `>= 1024px` - Full horizontal layout, inline filters

### Example Usage with FilterContext

```typescript
// apps/web/app-wishlist-gallery/src/pages/gallery-page.tsx
import { FilterProvider, useFilterContext, GalleryFilterBar } from '@repo/gallery'
import { Input, Select } from '@repo/ui'

interface WishlistFilters {
  search: string
  store?: string
  priority?: number
  minPrice?: number
  maxPrice?: number
}

function WishlistGalleryContent() {
  const { filters, updateFilter, clearFilters, isFiltering, activeFilterCount } =
    useFilterContext<WishlistFilters>()

  return (
    <div>
      <GalleryFilterBar>
        {/* Custom domain-specific filters */}
        <Select
          aria-label="Filter by store"
          value={filters.store}
          onValueChange={(val) => updateFilter('store', val)}
          className="min-h-[44px]"
        >
          <option value="">All Stores</option>
          <option value="LEGO">LEGO</option>
          <option value="BrickLink">BrickLink</option>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            onClick={clearFilters}
            aria-label={`Clear ${activeFilterCount} active filters`}
          >
            Clear Filters ({activeFilterCount})
          </Button>
        )}
      </GalleryFilterBar>

      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        {isFiltering
          ? 'Filtering...'
          : `Showing ${filteredItems.length} items`
        }
      </div>

      {/* Gallery content */}
    </div>
  )
}

// Wrap with FilterProvider
export function WishlistGalleryPage() {
  return (
    <FilterProvider<WishlistFilters>
      initialFilters={{
        search: '',
        store: undefined,
        priority: undefined,
        minPrice: undefined,
        maxPrice: undefined,
      }}
      debounceMs={300}
    >
      <WishlistGalleryContent />
    </FilterProvider>
  )
}
```

### File Structure

```
packages/core/gallery/src/
  hooks/
    useGalleryState.ts (ENHANCED with generic filters)
    useGalleryUrl.ts (ENHANCED with URL sync for generic filters)
    __tests__/
      useGalleryState.test.ts
      useGalleryUrl.test.ts
  contexts/
    FilterContext.tsx (NEW)
    __tests__/
      FilterContext.test.tsx
  index.ts (export new hooks and context)
```

## Testing

### useGalleryState Hook Tests

- [ ] Accepts generic filter type parameter and initializes state correctly
- [ ] updateFilter updates single filter field type-safely
- [ ] clearFilters resets all filters to initial state
- [ ] clearFilter resets single filter field to initial value
- [ ] Type inference works: filters object has correct TypeScript shape
- [ ] View mode state updates independently from filters

### useGalleryUrl Hook Tests

- [ ] Parses URL query params into filter object on initialization
- [ ] String filters sync to URL correctly
- [ ] Number filters serialize/deserialize correctly
- [ ] Boolean filters serialize/deserialize correctly
- [ ] Array filters serialize as comma-separated values
- [ ] Clearing filter removes query param from URL
- [ ] Non-filter query params are preserved during sync
- [ ] Empty/undefined/null filter values remove query param

### FilterContext Tests

- [ ] Provides initial filter state from initialFilters prop
- [ ] updateFilter updates single filter field
- [ ] clearFilters resets all filters to initial state
- [ ] clearFilter resets single filter field
- [ ] isFiltering state is true during debounce period
- [ ] activeFilterCount counts non-default filter values
- [ ] Throws clear error when useFilterContext used outside FilterProvider
- [ ] Generic type parameter flows correctly to consumer components

### Accessibility Tests

- [ ] Filter controls have proper ARIA labels
- [ ] View toggle buttons use aria-pressed correctly
- [ ] Screen reader announcement region announces filter changes
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)
- [ ] Focus management works when filters applied/cleared

### Responsive/Mobile Tests

- [ ] All filter controls meet 44x44px minimum touch target size
- [ ] Layout stacks vertically on mobile breakpoints (< 640px)
- [ ] Search input is full-width on mobile
- [ ] Filter layout is horizontal on desktop (>= 1024px)
- [ ] Tailwind responsive classes apply correctly

## Definition of Done

- [ ] useGalleryState enhanced to support generic filter types
- [ ] useGalleryUrl syncs generic filters to URL query params
- [ ] FilterContext provides centralized filter state with loading indicators
- [ ] All ARIA labels, keyboard navigation, and screen reader support implemented
- [ ] UI states (active, loading, error) defined with Tailwind classes
- [ ] Mobile responsive layout with 44px touch targets implemented
- [ ] Backwards compatibility maintained for existing consumers
- [ ] Migration documentation written with code examples
- [ ] All tests pass (minimum 45% coverage)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Code reviewed and merged

---

## Review Concerns

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** FAIL - Critical issues must be addressed before implementation

### Blocking Issues - RESOLVED in v0.3 Scope Revision

**[1] PM - technical:** Existing GalleryFilterBar conflicts with proposed design
- **RESOLVED:** Added backwards compatibility section documenting migration path from prop-based to context-based state (see Dev Notes). FilterContext is opt-in, not breaking.

**[2] PM - technical:** Unclear relationship with existing gallery state management
- **RESOLVED:** Story now focuses on enhancing existing useGalleryState and useGalleryUrl hooks rather than creating new patterns. FilterContext complements, not replaces.

**[3] UX - accessibility:** No ARIA labels specified for filter controls
- **RESOLVED:** Added comprehensive ARIA label examples (AC 14, Dev Notes section) with aria-label, aria-labelledby, aria-describedby.

**[4] UX - accessibility:** Missing keyboard navigation strategy
- **RESOLVED:** Documented keyboard navigation (AC 17, Dev Notes) including Tab, Enter, Space, Escape keys with code examples.

**[5] UX - accessibility:** No screen reader guidance for active filters
- **RESOLVED:** Added aria-live region example (AC 16, Dev Notes) announcing filter changes and result counts.

**[6] UX - states:** No visual feedback specification for active filters
- **RESOLVED:** Added active filter badge component (AC 18, Dev Notes) with count indicator and visual highlighting.

**[7] UX - states:** No color/visual treatment for filter states
- **RESOLVED:** Defined Tailwind color classes for active, disabled, error states (AC 19, Dev Notes examples).

**[8] UX - states:** Loading state undefined when filtering is slow
- **RESOLVED:** Added isFiltering boolean to FilterContext (AC 20, FilterContext code example) with loading spinner UI.

**[9] UX - states:** No error state for invalid filter values
- **RESOLVED:** Added error state handling (AC 21, Dev Notes) with validation examples and error message display.

**[10] UX - responsive:** Touch target sizing not specified for mobile
- **RESOLVED:** Specified minimum 44x44px touch targets (AC 22, Dev Notes) with Tailwind min-h-[44px] classes.

**[11] UX - responsive:** Mobile filter behavior not documented
- **RESOLVED:** Documented mobile layout (AC 23-25, Dev Notes) with vertical stacking, breakpoints, and responsive examples.

### Should-Fix Issues - Addressed or Deferred

**[12] PM - scope:** Story scope too large for single implementation
- **RESOLVED:** Split into focused stories: glry-1001a (generic state), glry-1001b (filter components), glry-1001c (column filtering), glry-1003 (full-text search).

**[13] PM - requirements:** Filter state management approach unclear
- **RESOLVED:** Story now clearly enhances existing useGalleryState/useGalleryUrl hooks, adds opt-in FilterContext (see Dev Notes).

**[14] PM - requirements:** View mode switching and filter persistence strategy vague
- **DEFERRED:** View-specific filtering moved to glry-1001c (column filtering). This story focuses on generic state only.

**[15] PM - acceptance_criteria:** AC #30 "propagates to all view modes" is ambiguous
- **RESOLVED:** Removed view-specific filtering from scope. Generic filter state works with all views uniformly.

**[16] PM - acceptance_criteria:** AC #38 "filter mode automatically switches" not defined
- **DEFERRED:** Moved to glry-1001c (column filtering story). Out of scope for generic state management.

**[17] PM - acceptance_criteria:** Missing AC for error handling
- **RESOLVED:** Added AC 13 for clear error when useFilterContext used outside provider, AC 21 for invalid filter value errors.

**[18] PM - testing:** TypeScript type safety needs explicit test validation
- **RESOLVED:** Added test case "Type inference works: filters object has correct TypeScript shape" in Testing section.

**[19] PM - technical:** Task 6 auto-detect view mode logic not defined
- **DEFERRED:** View mode detection moved to glry-1001c. This story manages filter state independent of view mode.

**[20] UX - user_flow:** Developer flow lacks decision tree for filtering strategies
- **DEFERRED:** Will be added to glry-1001b (filter components story) which covers UI component selection.

**[21] UX - interaction:** No clear filter behavior/reset pattern documented
- **RESOLVED:** Added clearFilters and clearFilter methods to FilterContext, documented clear button UX in examples.

**[22] UX - visual:** Visual hierarchy not defined between search and custom filters
- **RESOLVED:** Added responsive layout example in Dev Notes showing search on separate row, custom filters below.

**[23] UX - visual:** Sizing constraints missing for filter components
- **DEFERRED:** Moved to glry-1001b (filter components story) which covers TextFilter, NumberFilter, etc.

**[24] UX - states:** Filter state persistence across navigation not defined
- **RESOLVED:** AC 2-4 specify URL query param persistence via useGalleryUrl hook.

**[25] UX - accessibility:** Focus management undefined when view mode switches
- **DEFERRED:** View mode switching behavior moved to glry-1001c. Generic state doesn't control focus.

**[26] UX - accessibility:** No semantic HTML structure guidance
- **DEFERRED:** HTML structure guidance moved to glry-1001b (filter components). This story focuses on state management.

**[27] UX - responsive:** Tablet breakpoint guidance missing
- **RESOLVED:** Added breakpoint specifications in Dev Notes: Mobile <640px, Tablet 640-1024px, Desktop >=1024px.

**[28] UX - component_reuse:** DateFilter component mentioned but not specified
- **DEFERRED:** DateFilter component moved to glry-1001b (filter components story).

**[29] UX - component_reuse:** No composition pattern for combining filters with AND/OR logic
- **DEFERRED:** Filter combination logic moved to glry-1001c (column filtering). Generic state is data-agnostic.

**[30] SM - references:** Verify useDebouncedValue hook exists in @repo/ui/hooks
- **N/A:** Debouncing moved to FilterContext implementation (useEffect with setTimeout). No external dependency needed.

**[31] SM - references:** PRD reference vague, should link specific Epic 3 document
- **RESOLVED:** Added file path reference to Epic 3 document in PRD Reference section.

**[32] SM - references:** Previous story context (glry-1000) not summarized
- **RESOLVED:** Added glry-1000 summary in Dependencies section.

### Notes

**[33] PM - user_value:** Story framed from developer vs end-user perspective
- **Acknowledged:** Infrastructure story appropriately developer-focused. End-user benefits realized in consuming stories (glry-1001b, glry-1001c).

**[34] PM - acceptance_criteria:** Performance ACs are implementation details
- **Acknowledged:** Debouncing implementation detail moved to FilterContext code. No performance ACs in this story.

---

## Re-Review (v0.4)

> **Review Date:** 2025-12-28
> **Reviewed By:** PM (John), UX (Sally), SM (Bob)
> **Decision:** CONCERNS

All three specialists assessed the story as READY with high confidence after the v0.3 scope revision. However, 1 should-fix issue and 5 advisory notes were identified.

### Should-Fix Issues

- **[1] SM - testing:** Test cases in Testing section are not formatted as checkboxes ([ ]) like tasks are - inconsistent with rest of document structure
  - *Suggestion:* Convert all test case descriptions to checkbox format for consistency: `[ ] Test case description`

### Notes

- **[2] PM - requirements_clarity:** Story is developer-focused infrastructure work rather than end-user facing feature. Business value articulated as "migration path" and "generic support" which is technical rather than customer-centric.
  - *Suggestion:* Add explicit statement in story summary explaining how this infrastructure enables downstream user value (e.g., "Enables faster development of domain-specific filters for new gallery views").

- **[3] PM - scope:** Acceptance criteria span accessibility, responsive design, and loading states - areas historically managed separately in this codebase. Bundling all concerns in one story increases complexity and testing surface area.
  - *Suggestion:* Consider whether accessibility (ACs 14-17) and responsive design (ACs 22-25) should be acceptance criteria vs. implementation details. Alternatively, clarify testing strategy for these cross-cutting concerns.

- **[4] PM - dependencies:** Story explicitly depends on glry-1000 (Gallery Package Scaffolding), but Dev Notes show no concrete details about what glry-1000 delivers or whether it is truly complete and available.
  - *Suggestion:* Add verification step: confirm glry-1000 has been completed and the GalleryFilterBar and existing hooks are in place before starting this story.

- **[5] PM - acceptance_criteria:** AC #20 (isFiltering loading state) introduces debouncing behavior that could be viewed as a performance optimization detail rather than a core acceptance criterion. Debouncing duration is configurable in the code (300ms default).
  - *Suggestion:* Clarify whether isFiltering is essential for this story or could be deferred to a separate "Loading States for Gallery" story. If kept, consider documenting the debounce timing rationale in acceptance criteria or dev notes.

- **[6] SM - references:** Epic 3 reference does not specify exact file path format like other references
  - *Suggestion:* Specify exact file path in PRD Reference section for consistency with other story references.

### Review Summary

**Strengths:**
- Excellent scope management after previous review cycle
- Strong backwards compatibility strategy with clear migration path
- Comprehensive Dev Notes with production-ready code examples
- All 11 blocking issues from previous review resolved
- Thorough accessibility, responsive, and UI state specifications

**Specialist Assessments:**
- **PM (John):** READY - Well-researched and thoroughly documented. Generic filter state management is clearly scoped. Architecture is sound with explicit backwards compatibility strategy. Confidence: high.
- **UX (Sally):** READY - Infrastructure story with well-documented accessibility, responsive design, and UI state handling. All prior UX concerns addressed. Confidence: high, UI complexity: medium.
- **SM (Bob):** READY - Comprehensive technical guidance with complete code examples. Clear scope boundaries. Developer can implement immediately with minimal ambiguity. Clarity score: 9/10, could_implement: true.

**Recommendation:** Story is ready for implementation after addressing the 1 should-fix formatting issue. The 5 advisory notes are minor and can be addressed during implementation or documentation updates.

---

## Change Log

| Date       | Version | Description | Author   |
| ---------- | ------- | ----------- | -------- |
| 2025-12-28 | 0.1     | Initial draft from wish-2005 note | SM Agent |
| 2025-12-28 | 0.2     | Review: FAIL - 11 blocking, 21 should-fix concerns identified | PM/UX/SM Review |
| 2025-12-28 | 0.3     | **Scope Revision:** Renamed to glry-1001a. Removed full-text search (→glry-1003), column filtering (→glry-1001c), filter components (→glry-1001b). Focused on generic filter state management via enhanced useGalleryState/useGalleryUrl hooks and new FilterContext. Added all missing accessibility, UI states, and mobile/responsive specs. Addressed all 11 blocking issues. Status: Draft (ready for re-review). | Claude Agent |
|| 2025-12-28 | 0.4     | Re-review: CONCERNS - 1 should-fix (test formatting), 5 advisory notes. All three specialists assessed story as READY with high confidence. Comprehensive technical guidance confirmed. | PM/UX/SM Review Team |
|| 2026-01-10 | 0.5     | Status updated to Completed after glry-1000 completion verified and test checklist formatting confirmed | Dev Agent |
