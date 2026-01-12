# Story glry-1003: Gallery Full-Text Search

## Status

Draft

## Story

**As a** user browsing galleries in grid or list view,
**I want** to search across multiple fields at once,
**so that** I can find items even when I don't remember the exact field name.

## PRD Reference

Epic 3 - Shared Gallery Components
- Advanced search capabilities for grid and list views
- User-friendly search across multiple fields

## Dependencies

- **glry-1000**: Gallery Package Scaffolding (package structure exists)
- **glry-1001a**: Generic Filter State Management (simple text search implementation)

## Acceptance Criteria

### Full-Text Search Hook

1. useFullTextSearch hook accepts items array, search term, and array of searchable field keys
2. Returns filtered items matching search term across any specified field
3. Case-insensitive matching across all searchable fields
4. Type-safe field keys based on generic TItem type
5. Works with TypeScript strict mode enabled

### Debouncing and Performance

6. Search debounced by 300ms to avoid excessive re-renders
7. Search state memoized to prevent unnecessary recalculations
8. Performance optimized for datasets up to 1000 items
9. Gracefully handles null/undefined field values without errors
10. Empty search term returns all items unfiltered

### Integration with Gallery Views

11. Integrates with GalleryGrid view
12. Integrates with GalleryCardList view
13. Does NOT apply to GalleryDataTable (uses column-specific filtering)
14. Works with existing search input from glry-1001a
15. Search term shared across grid and list views when switching

### Developer Experience

16. Clear TypeScript types for searchable fields
17. Exported from @repo/gallery package
18. Compatible with existing useGalleryState hook
19. Documentation includes usage examples
20. Hook is reusable across different gallery implementations

## Tasks / Subtasks

### Task 1: Create useFullTextSearch Hook

- [ ] Create `packages/core/gallery/src/hooks/useFullTextSearch.ts`
- [ ] Accept generic TItem type parameter
- [ ] Accept items array, searchTerm string, searchFields array
- [ ] Validate searchFields are valid keys of TItem type
- [ ] Return filtered items based on search term
- [ ] Handle empty search term (return all items)

### Task 2: Implement Field Key Type Safety

- [ ] Define FilterableFields<TItem> utility type
- [ ] Ensure searchFields parameter uses keyof TItem
- [ ] Add TypeScript strict mode validation
- [ ] Prevent runtime errors from invalid field keys
- [ ] Export types from @repo/gallery

### Task 3: Add Debouncing with useDebouncedValue

- [ ] Import useDebouncedValue from @repo/ui/hooks
- [ ] Debounce search term by 300ms
- [ ] Use debounced value for filtering logic
- [ ] Ensure UI remains responsive during debounce
- [ ] Test debounce behavior in fast typing scenarios

### Task 4: Implement Search Logic

- [ ] Convert search term to lowercase for comparison
- [ ] Iterate through searchable fields for each item
- [ ] Check if any field value contains search term
- [ ] Handle null/undefined field values gracefully
- [ ] Convert non-string field values to strings for comparison
- [ ] Return items matching search term across any field

### Task 5: Add Performance Optimization

- [ ] Wrap filtering logic in useMemo hook
- [ ] Memoize based on items, debouncedSearch, and searchFields
- [ ] Prevent unnecessary re-filtering on unrelated state changes
- [ ] Test performance with 1000+ item datasets
- [ ] Profile rendering performance improvements

### Task 6: Integrate with Gallery Components

- [ ] Update GalleryGrid to optionally use full-text search
- [ ] Update GalleryCardList to optionally use full-text search
- [ ] Document how to pass searchable fields configuration
- [ ] Ensure backwards compatibility with existing implementations
- [ ] Add prop for searchableFields to Gallery wrapper

### Task 7: Write Comprehensive Tests

- [ ] Test returns all items when search term is empty
- [ ] Test filters items matching search term
- [ ] Test case-insensitive matching
- [ ] Test null/undefined field value handling
- [ ] Test debounce behavior (300ms delay)
- [ ] Test type safety with TypeScript compilation
- [ ] Test performance with large datasets (1000+ items)
- [ ] Test integration with GalleryGrid and GalleryCardList

## Dev Notes

### useFullTextSearch Hook Implementation

```typescript
// packages/core/gallery/src/hooks/useFullTextSearch.ts
import { useMemo } from 'react'
import { useDebouncedValue } from '@repo/ui/hooks'

/**
 * Performs full-text search across multiple fields of items.
 *
 * @param items - Array of items to search
 * @param searchTerm - Search term to filter by
 * @param searchFields - Array of field keys to search across
 * @returns Filtered items matching search term
 *
 * @example
 * ```typescript
 * const filteredItems = useFullTextSearch(
 *   wishlistItems,
 *   searchTerm,
 *   ['title', 'description', 'tags', 'setNumber']
 * )
 * ```
 */
export function useFullTextSearch<TItem extends Record<string, unknown>>(
  items: TItem[],
  searchTerm: string,
  searchFields: (keyof TItem)[]
): TItem[] {
  // Debounce search term to avoid excessive re-renders
  const debouncedSearch = useDebouncedValue(searchTerm, 300)

  return useMemo(() => {
    // Return all items if search term is empty
    if (!debouncedSearch.trim()) {
      return items
    }

    const lowerSearch = debouncedSearch.toLowerCase()

    // Filter items that match search term in any searchable field
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field]

        // Handle null/undefined values gracefully
        if (value == null) {
          return false
        }

        // Convert value to string and perform case-insensitive search
        return String(value).toLowerCase().includes(lowerSearch)
      })
    )
  }, [items, debouncedSearch, searchFields])
}
```

### Type-Safe Field Key Selection

```typescript
// packages/core/gallery/src/types/search.ts

/**
 * Utility type to extract filterable fields from an item type.
 * Only includes fields with string, number, or array values.
 */
export type FilterableFields<TItem> = {
  [K in keyof TItem]: TItem[K] extends string | number | string[] | number[] | null | undefined
    ? K
    : never
}[keyof TItem]

/**
 * Configuration for searchable fields
 */
export interface SearchableFieldConfig<TItem> {
  field: keyof TItem
  label: string
}
```

### Integration with Gallery Components

```typescript
// packages/core/gallery/src/components/Gallery.tsx
import { useFullTextSearch } from '../hooks/useFullTextSearch'
import { GalleryGrid } from './GalleryGrid'
import { GalleryCardList } from './GalleryCardList'
import { GalleryDataTable } from './GalleryDataTable'

interface GalleryProps<TItem extends Record<string, unknown>> {
  items: TItem[]
  viewMode: 'grid' | 'list' | 'datatable'
  searchTerm: string
  searchableFields?: (keyof TItem)[]
  // ... other props
}

export function Gallery<TItem extends Record<string, unknown>>({
  items,
  viewMode,
  searchTerm,
  searchableFields = [],
  // ... other props
}: GalleryProps<TItem>) {
  // Apply full-text search for grid and list views only
  const shouldUseFullTextSearch =
    (viewMode === 'grid' || viewMode === 'list') && searchableFields.length > 0

  const filteredItems = useFullTextSearch(
    items,
    shouldUseFullTextSearch ? searchTerm : '',
    searchableFields
  )

  const displayItems = shouldUseFullTextSearch ? filteredItems : items

  return (
    <>
      {viewMode === 'grid' && <GalleryGrid items={displayItems} />}
      {viewMode === 'list' && <GalleryCardList items={displayItems} />}
      {viewMode === 'datatable' && <GalleryDataTable items={items} searchTerm={searchTerm} />}
    </>
  )
}
```

### Example Usage in Wishlist Gallery

```typescript
// apps/web/app-wishlist-gallery/src/pages/gallery-page.tsx
import { Gallery } from '@repo/gallery'
import { useGetWishlistQuery } from '@repo/api-client/rtk/wishlist-api'
import { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { useState } from 'react'

const WISHLIST_SEARCHABLE_FIELDS: (keyof WishlistItem)[] = [
  'title',
  'description',
  'setNumber',
  'tags',
  'store',
]

export function WishlistGalleryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'datatable'>('grid')
  const { data, isLoading } = useGetWishlistQuery()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>

      <Gallery<WishlistItem>
        items={data?.items ?? []}
        viewMode={viewMode}
        searchTerm={searchTerm}
        searchableFields={WISHLIST_SEARCHABLE_FIELDS}
        onSearchChange={setSearchTerm}
        onViewModeChange={setViewMode}
      />
    </div>
  )
}
```

### Performance Considerations

1. **Memoization**: The useFullTextSearch hook uses useMemo to prevent unnecessary re-filtering when unrelated state changes.

2. **Debouncing**: 300ms debounce prevents excessive filtering during fast typing, improving UI responsiveness.

3. **Field Count**: Limit searchable fields to relevant fields only (typically 3-6 fields). More fields = slower search.

4. **Dataset Size**: Optimized for datasets up to 1000 items. For larger datasets, consider:
   - Server-side search via API
   - Virtual scrolling to reduce rendered items
   - More aggressive debouncing (500ms+)

5. **String Conversion**: Converting non-string values to strings has minimal performance impact for typical datasets.

### Testing Standards

From `/docs/architecture/coding-standards.md`:

- Test framework: Vitest + React Testing Library
- Test files: `__tests__/useFullTextSearch.test.ts`
- Minimum coverage: 45% global
- Use semantic queries: `getByRole`, `getByLabelText`

### File Structure

```
packages/core/gallery/src/
  hooks/
    useFullTextSearch.ts
    __tests__/
      useFullTextSearch.test.ts
  types/
    search.ts
  index.ts
```

## Testing

### Hook Tests - Basic Functionality

- [ ] Returns all items when search term is empty string
- [ ] Returns all items when search term is only whitespace
- [ ] Filters items matching search term in first field
- [ ] Filters items matching search term in last field
- [ ] Filters items matching search term in any field
- [ ] Returns empty array when no items match
- [ ] Case-insensitive matching works (lowercase search, uppercase data)
- [ ] Case-insensitive matching works (uppercase search, lowercase data)

### Hook Tests - Null/Undefined Handling

- [ ] Handles null field values without errors
- [ ] Handles undefined field values without errors
- [ ] Skips null fields when searching
- [ ] Skips undefined fields when searching
- [ ] Works when all fields are null
- [ ] Works when some fields are null, some are valid

### Hook Tests - Data Types

- [ ] Searches string fields correctly
- [ ] Searches number fields (converts to string)
- [ ] Searches array fields (converts to string)
- [ ] Searches boolean fields (converts to string)
- [ ] Mixed data types in searchable fields work

### Hook Tests - Debounce Behavior

- [ ] Debounces search term by 300ms
- [ ] Does not filter until debounce completes
- [ ] Multiple rapid changes only trigger one filter
- [ ] Debounce resets on each keystroke
- [ ] Final debounced value is used for filtering

### Hook Tests - Performance

- [ ] Handles 100 items without lag
- [ ] Handles 500 items without lag
- [ ] Handles 1000 items without lag
- [ ] Memoization prevents unnecessary re-filtering
- [ ] Changing unrelated state does not trigger re-filter

### Hook Tests - Type Safety

- [ ] TypeScript compilation succeeds with valid field keys
- [ ] TypeScript compilation fails with invalid field keys
- [ ] Autocomplete suggests valid field keys
- [ ] Generic TItem type flows correctly

### Integration Tests

- [ ] GalleryGrid uses full-text search correctly
- [ ] GalleryCardList uses full-text search correctly
- [ ] GalleryDataTable does NOT use full-text search
- [ ] Search term persists when switching between grid and list
- [ ] Search clears when switching to datatable view

## Definition of Done

- [ ] useFullTextSearch hook implemented and exported from @repo/gallery
- [ ] Type-safe field key selection with TypeScript generics
- [ ] Debouncing implemented with useDebouncedValue
- [ ] Null/undefined field values handled gracefully
- [ ] Integration with GalleryGrid and GalleryCardList
- [ ] Performance optimized with memoization
- [ ] All tests pass (minimum 45% coverage)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Documentation includes usage examples
- [ ] Code reviewed and merged

---

## Change Log

| Date       | Version | Description | Author   |
| ---------- | ------- | ----------- | -------- |
| 2025-12-28 | 0.1     | Initial draft for full-text search story | Claude   |
