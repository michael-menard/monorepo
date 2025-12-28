# Story wish-1005: Verify Shared Gallery Compatibility

## Status

Draft

## Story

**As a** developer,
**I want** to verify @repo/gallery works for the wishlist use case,
**so that** I can reuse shared components without breaking existing galleries.

## Acceptance Criteria

1. Verify GalleryGrid renders wishlist items correctly
2. Verify GalleryCard supports wishlist metadata (price, store, piece count)
3. Verify GalleryFilterBar supports wishlist-specific filters (store, priority)
4. Verify GallerySkeleton and GalleryEmptyState work
5. Document any required updates to shared gallery
6. If updates needed, implement without breaking Instructions/Inspiration galleries
7. All existing gallery tests still pass

## Tasks / Subtasks

- [ ] **Task 1: Audit Shared Gallery Package** (AC: 1-4)
  - [ ] Review `packages/core/gallery/src/` components
  - [ ] List required props for GalleryCard
  - [ ] List filter options for GalleryFilterBar
  - [ ] Document what wishlist needs vs what exists

- [ ] **Task 2: Create Compatibility Report** (AC: 5)
  - [ ] Document gaps (if any)
  - [ ] Propose solutions: extend vs. new component
  - [ ] Get approval on approach

- [ ] **Task 3: Implement Updates (if needed)** (AC: 6)
  - [ ] Add wishlist-specific props to GalleryCard (if extensible)
  - [ ] Add store filter option to GalleryFilterBar (if needed)
  - [ ] Ensure backwards compatibility

- [ ] **Task 4: Verify No Regressions** (AC: 7)
  - [ ] Run all gallery package tests
  - [ ] Verify Instructions gallery still works
  - [ ] Verify Inspiration gallery still works

## Dev Notes

### Wishlist-Specific Requirements

The wishlist gallery needs to display:
- **Price** with currency formatting
- **Store** badge (LEGO, Barweer, etc.)
- **Priority** indicator (visual position or badge)
- **"Got it" button** on hover (distinct action)

Compare to existing galleries:
- Instructions: title, thumbnail, piece count, theme, tags
- Inspiration: title, thumbnail, source, tags

### Potential GalleryCard Extension

```typescript
// Current GalleryCard props (verify)
interface GalleryCardProps {
  image: { src: string; alt: string; aspectRatio?: string }
  title: string
  metadata?: ReactNode
  onClick?: () => void
  actions?: ReactNode
}

// Wishlist needs:
// - metadata slot for price/store/pieces (already supported via ReactNode)
// - actions slot for "Got it" button (may need to add)
```

### Filter Options to Verify

```typescript
// GalleryFilterBar - verify it supports:
{
  search: string
  tags: string[]
  theme?: string        // May need: store filter instead/additionally
  sortField: string
  sortDirection: 'asc' | 'desc'
}

// Wishlist sort options:
const wishlistSortOptions = [
  { value: 'sortOrder', label: 'Priority' },
  { value: 'price', label: 'Price' },
  { value: 'createdAt', label: 'Date Added' },
  { value: 'pieceCount', label: 'Piece Count' },
]
```

### File to Review

```
packages/core/gallery/src/
  components/
    GalleryCard.tsx
    GalleryGrid.tsx
    GalleryFilterBar.tsx
    GalleryEmptyState.tsx
    GallerySkeleton.tsx
  hooks/
    useGalleryUrl.ts
  index.ts
```

### Decision Points

1. **If GalleryCard is flexible enough**: Just use it with wishlist-specific metadata ReactNode
2. **If GalleryCard needs extension**: Add optional `actions` prop for hover actions
3. **If incompatible**: Create `WishlistCard` that wraps/extends GalleryCard

## Testing

- [ ] Existing gallery tests pass
- [ ] GalleryCard renders wishlist item data
- [ ] GalleryFilterBar works with wishlist filters
- [ ] No visual regressions in other galleries

## Change Log

| Date       | Version | Description   | Author   |
| ---------- | ------- | ------------- | -------- |
| 2025-12-27 | 0.1     | Initial draft | SM Agent |
