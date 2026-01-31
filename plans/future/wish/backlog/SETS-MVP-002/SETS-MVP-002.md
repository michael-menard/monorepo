---
doc_type: story
title: "SETS-MVP-002: Collection View"
story_id: SETS-MVP-002
story_prefix: SETS-MVP
status: draft
phase: 2
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-01-30T12:00:00-07:00"
depends_on: [SETS-MVP-001, WISH-2001]
estimated_points: 3
---

# SETS-MVP-002: Collection View

## Goal

Create a collection view that shows owned items using the same gallery infrastructure as the wishlist, filtered by `status = 'owned'`.

## Context

This story reuses the existing Wishlist Gallery components with a simple status filter, avoiding the need to build a separate Sets feature from scratch.

## Feature

Collection page at `/collection` showing owned items in the same gallery layout as wishlist, with collection-specific display (build status badge, purchase date, no priority/drag-drop).

## Acceptance Criteria

### Route & Navigation
- [ ] AC1: New route `/collection` renders CollectionPage
- [ ] AC2: Navigation includes link to Collection (alongside Wishlist)
- [ ] AC3: Page title is "My Collection"

### Gallery Display
- [ ] AC4: Reuses `WishlistGallery` component with `status='owned'` filter
- [ ] AC5: Cards show build status badge ("Built" / "In Pieces")
- [ ] AC6: Cards show purchase date if available
- [ ] AC7: Cards do NOT show priority indicator (wishlist-only)
- [ ] AC8: Drag-and-drop is disabled (no reordering in collection view)

### API Integration
- [ ] AC9: `GET /api/wishlist?status=owned` returns only owned items
- [ ] AC10: Default sort is `purchaseDate DESC` (most recent first)
- [ ] AC11: Supports existing filters: store, tags, search

### Empty State
- [ ] AC12: Empty collection shows "No sets in your collection yet"
- [ ] AC13: Empty state includes CTA: "Browse your wishlist" linking to `/wishlist`

### Stats Summary (Optional for MVP)
- [ ] AC14: Header shows basic stats: total sets, total pieces, total spent
- [ ] AC15: Stats query: `GET /api/wishlist/stats?status=owned`

## Technical Details

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    pages/
      CollectionPage/
        index.tsx           # Main collection page
        __tests__/
          CollectionPage.test.tsx
    components/
      CollectionCard/       # Extends WishlistCard with build status
        index.tsx
        __tests__/
```

### API Changes

```typescript
// Extend existing query params
export const WishlistQueryParamsSchema = z.object({
  // ... existing fields ...
  status: ItemStatusSchema.optional(), // NEW: filter by status
})

// Stats endpoint response
export const CollectionStatsSchema = z.object({
  totalSets: z.number().int(),
  totalPieces: z.number().int(),
  totalSpent: z.string(), // Decimal as string
})
```

### Reuse Strategy

- Reuse `WishlistGallery` with prop `status="owned"`
- Reuse `GalleryCard` from `@repo/gallery` with collection-specific slot content
- Reuse existing pagination, filtering, search infrastructure

## Risk Notes

- Low risk: primarily configuration of existing components
- Build status badge is new UI element

## Dependencies

- SETS-MVP-001: Unified Schema Extension (status field must exist)
- WISH-2001: Gallery MVP (gallery infrastructure must be complete)

## Out of Scope

- Build status toggle (SETS-MVP-004)
- Advanced collection features (MOC linking, quantity management)
- Collection-specific sorting beyond purchase date

## Definition of Done

- [ ] Collection page renders at `/collection`
- [ ] Owned items display correctly with build status
- [ ] Empty state works correctly
- [ ] All tests pass
- [ ] Code review completed
