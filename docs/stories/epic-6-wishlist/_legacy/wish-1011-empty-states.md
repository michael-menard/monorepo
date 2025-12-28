# Story wish-1011: Empty States

## Status

Draft

## Story

**As a** user,
**I want** helpful empty states in the wishlist,
**so that** I understand why the list is empty and what actions I can take.

## Dependencies

- **wish-1000**: Gallery Page (where empty states render)
- **wish-1005**: Verify Shared Gallery Compatibility (GalleryEmptyState component)

## Acceptance Criteria

1. Empty wishlist (new user): shows illustration and "Add Item" CTA
2. Empty wishlist (all purchased): shows celebration message
3. No search/filter results: shows "No matches" with clear filters button
4. Empty states use GalleryEmptyState from @repo/gallery
5. All empty states have appropriate ARIA labels

## Tasks / Subtasks

- [ ] **Task 1: New User Empty State** (AC: 1, 4)
  - [ ] Illustration: dreaming about LEGO sets
  - [ ] Title: "Nothing on your wishlist yet"
  - [ ] Description: "Start adding sets you're dreaming about!"
  - [ ] Primary CTA: "Add Item" → navigates to /wishlist/add

- [ ] **Task 2: All Purchased Empty State** (AC: 2, 4)
  - [ ] Celebration illustration/icon
  - [ ] Title: "You got everything on your list!"
  - [ ] Description: "Time to dream bigger."
  - [ ] Primary CTA: "Add More" → navigates to /wishlist/add

- [ ] **Task 3: No Search Results** (AC: 3, 4)
  - [ ] Search illustration/icon
  - [ ] Title: "No wishlist items match your filters"
  - [ ] Description: Current filter summary
  - [ ] Primary CTA: "Clear filters" → resets all filters

- [ ] **Task 4: Accessibility** (AC: 5)
  - [ ] ARIA labels for all empty states
  - [ ] Focus management after clearing filters

## Dev Notes

### Detect Empty State Type

```typescript
// In wishlist gallery page
function WishlistGalleryPage() {
  const { state, updateUrl, clearFilters } = useGalleryUrl()
  const { data, isLoading } = useGetWishlistQuery(state)

  const hasFilters = state.search || state.tags?.length || state.theme

  const getEmptyState = () => {
    if (!data || data.items.length > 0) return null

    // No filters active, but total is 0 → new user
    if (!hasFilters && data.pagination.total === 0) {
      return 'new-user'
    }

    // No filters active, but user has purchased items → all purchased
    // (This requires tracking purchase history or a flag)
    if (!hasFilters && data.stats?.totalPurchased > 0) {
      return 'all-purchased'
    }

    // Filters active but no results
    if (hasFilters) {
      return 'no-results'
    }

    return 'new-user' // Default
  }

  const emptyStateType = getEmptyState()

  // ... render logic
}
```

### Empty State Components

```typescript
// components/wishlist/WishlistEmptyStates.tsx
import { GalleryEmptyState } from '@repo/gallery'
import { Heart, PartyPopper, Search } from 'lucide-react'

interface EmptyStateProps {
  onAddItem: () => void
  onClearFilters?: () => void
  filterSummary?: string
}

export function NewUserEmptyState({ onAddItem }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={Heart}
      title="Nothing on your wishlist yet"
      description="Start adding sets you're dreaming about!"
      action={{
        label: 'Add Item',
        onClick: onAddItem,
      }}
      aria-label="Your wishlist is empty. Click Add Item to start building your wishlist."
    />
  )
}

export function AllPurchasedEmptyState({ onAddItem }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={PartyPopper}
      title="You got everything on your list!"
      description="Time to dream bigger."
      action={{
        label: 'Add More',
        onClick: onAddItem,
      }}
      aria-label="Congratulations! You've purchased all items on your wishlist. Click Add More to add new items."
    />
  )
}

export function NoResultsEmptyState({ onClearFilters, filterSummary }: EmptyStateProps) {
  return (
    <GalleryEmptyState
      icon={Search}
      title="No wishlist items match your filters"
      description={filterSummary || "Try adjusting your search or filters."}
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters!,
        variant: 'outline',
      }}
      aria-label="No items match your current filters. Click Clear Filters to see all items."
    />
  )
}
```

### Usage in Gallery

```typescript
// In wishlist gallery page
{isLoading ? (
  <GallerySkeleton count={12} />
) : emptyStateType === 'new-user' ? (
  <NewUserEmptyState onAddItem={() => navigate({ to: '/wishlist/add' })} />
) : emptyStateType === 'all-purchased' ? (
  <AllPurchasedEmptyState onAddItem={() => navigate({ to: '/wishlist/add' })} />
) : emptyStateType === 'no-results' ? (
  <NoResultsEmptyState
    onClearFilters={clearFilters}
    filterSummary={getFilterSummary(state)}
  />
) : (
  <GalleryGrid>
    {data?.items.map(item => (
      <WishlistCard key={item.id} item={item} />
    ))}
  </GalleryGrid>
)}
```

### Filter Summary Helper

```typescript
function getFilterSummary(state: GalleryUrlState): string {
  const parts: string[] = []

  if (state.search) {
    parts.push(`search: "${state.search}"`)
  }
  if (state.tags?.length) {
    parts.push(`tags: ${state.tags.join(', ')}`)
  }
  if (state.theme) {
    parts.push(`theme: ${state.theme}`)
  }

  return parts.length > 0
    ? `Current filters: ${parts.join(', ')}`
    : ''
}
```

### Dependencies

- wish-1000: Gallery page (where empty states render)
- wish-1005: Verify GalleryEmptyState supports all needed props
- @repo/gallery: GalleryEmptyState component

## Testing

- [ ] New user empty state shows correctly
- [ ] "Add Item" button navigates to add page
- [ ] All purchased empty state shows (if detectable)
- [ ] No results empty state shows with filters active
- [ ] "Clear Filters" button resets all filters
- [ ] ARIA labels are announced by screen readers
- [ ] Focus moves to first item after clearing filters

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
