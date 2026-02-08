# Implementation Plan - WISH-2014: Smart Sorting Algorithms

## Overview

This plan implements three smart sorting algorithms for the wishlist GET endpoint:
1. **Best Value**: Sort by price-per-piece ratio (lowest first)
2. **Expiring Soon**: Sort by release date (oldest first)
3. **Hidden Gems**: Sort by (5 - priority) * pieceCount (highest score first)

## Implementation Chunks

### Chunk 1: Backend Schema Extension

**Files to modify:**
- `apps/api/lego-api/domains/wishlist/types.ts`
- `packages/core/api-client/src/schemas/wishlist.ts`

**Changes:**

1. Update `ListWishlistQuerySchema` in `types.ts`:
```typescript
export const ListWishlistQuerySchema = z.object({
  // ... existing fields
  sort: z
    .enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder', 'priority', 'bestValue', 'expiringSoon', 'hiddenGems'])
    .default('sortOrder'),
  // ... rest
})
```

2. Update `WishlistQueryParamsSchema` in `packages/core/api-client/src/schemas/wishlist.ts`:
```typescript
sort: z.enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder', 'priority', 'bestValue', 'expiringSoon', 'hiddenGems']).optional(),
```

**Verification:** `pnpm check-types`

---

### Chunk 2: Backend Repository Sorting Implementation

**Files to modify:**
- `apps/api/lego-api/domains/wishlist/adapters/repositories.js`

**Changes:**

Update the `findByUserId` method to handle new sort modes:

```javascript
// Build sort order with smart sorting support
let orderByClause;
if (filters?.sort === 'bestValue') {
  // Best Value: price / pieceCount (lowest ratio first)
  // Items with null price, null pieceCount, or pieceCount=0 placed at end
  orderByClause = sql`
    CASE
      WHEN ${wishlistItems.price} IS NULL OR ${wishlistItems.pieceCount} IS NULL OR ${wishlistItems.pieceCount} = 0
      THEN 1
      ELSE 0
    END,
    CASE
      WHEN ${wishlistItems.price} IS NOT NULL AND ${wishlistItems.pieceCount} > 0
      THEN ${wishlistItems.price}::numeric / ${wishlistItems.pieceCount}
      ELSE NULL
    END ${filters?.order === 'desc' ? desc : asc}
  `;
} else if (filters?.sort === 'expiringSoon') {
  // Expiring Soon: oldest release date first
  // Items with null releaseDate placed at end
  orderByClause = sql`
    CASE WHEN ${wishlistItems.releaseDate} IS NULL THEN 1 ELSE 0 END,
    ${wishlistItems.releaseDate} ${filters?.order === 'desc' ? desc : asc}
  `;
} else if (filters?.sort === 'hiddenGems') {
  // Hidden Gems: (5 - priority) * pieceCount (highest score first)
  // Items with null pieceCount placed at end
  orderByClause = sql`
    CASE WHEN ${wishlistItems.pieceCount} IS NULL THEN 1 ELSE 0 END,
    (5 - COALESCE(${wishlistItems.priority}, 0)) * COALESCE(${wishlistItems.pieceCount}, 0) ${filters?.order === 'desc' ? desc : asc}
  `;
} else {
  // Standard column sort
  const sortColumn = {
    createdAt: wishlistItems.createdAt,
    title: wishlistItems.title,
    price: wishlistItems.price,
    pieceCount: wishlistItems.pieceCount,
    sortOrder: wishlistItems.sortOrder,
    priority: wishlistItems.priority,
  }[filters?.sort ?? 'sortOrder'];
  const orderFn = filters?.order === 'desc' ? desc : asc;
  orderByClause = orderFn(sortColumn);
}
```

**Verification:** `pnpm check-types` and manual .http testing

---

### Chunk 3: Backend Service Type Update

**Files to modify:**
- `apps/api/lego-api/domains/wishlist/application/services.ts`

**Changes:**

Update the `listItems` filter type to include new sort values:

```typescript
async listItems(
  userId: string,
  pagination: PaginationInput,
  filters?: {
    search?: string
    store?: string
    tags?: string[]
    priority?: number
    sort?: 'createdAt' | 'title' | 'price' | 'pieceCount' | 'sortOrder' | 'priority' | 'bestValue' | 'expiringSoon' | 'hiddenGems'
    order?: 'asc' | 'desc'
  },
): Promise<PaginatedResult<WishlistItem>> {
  return wishlistRepo.findByUserId(userId, pagination, filters)
}
```

**Verification:** `pnpm check-types`

---

### Chunk 4: Backend Unit Tests

**Files to create:**
- `apps/api/lego-api/domains/wishlist/__tests__/smart-sorting.test.ts`

**Tests to implement (15 total):**

**Best Value Tests (5):**
1. `bestValue sort orders items by price/pieceCount ratio ascending`
2. `bestValue sort handles null price by placing at end`
3. `bestValue sort handles null pieceCount by placing at end`
4. `bestValue sort handles pieceCount=0 by placing at end`
5. `bestValue sort handles tie-breaker (same ratio)`

**Expiring Soon Tests (5):**
1. `expiringSoon sort orders items by releaseDate ascending (oldest first)`
2. `expiringSoon sort handles null releaseDate by placing at end`
3. `expiringSoon sort handles extreme dates (1900, 2099)`
4. `expiringSoon sort handles all items with same date`
5. `expiringSoon sort respects order parameter (asc/desc)`

**Hidden Gems Tests (5):**
1. `hiddenGems sort orders items by (5-priority)*pieceCount descending`
2. `hiddenGems sort handles null pieceCount by placing at end`
3. `hiddenGems sort handles priority=5 (weight=0)`
4. `hiddenGems sort handles priority=0 (weight=5)`
5. `hiddenGems sort handles score ties`

**Verification:** `pnpm test apps/api/lego-api`

---

### Chunk 5: Backend Integration Tests (.http file)

**Files to create:**
- `apps/api/lego-api/__http__/wishlist-smart-sorting.http`

**Requests to include:**
1. `GET /api/wishlist?sort=bestValue` - Happy path
2. `GET /api/wishlist?sort=expiringSoon` - Happy path
3. `GET /api/wishlist?sort=hiddenGems` - Happy path
4. `GET /api/wishlist?sort=invalidSort` - Error case (400)
5. `GET /api/wishlist?sort=bestValue&page=1&limit=10` - Pagination

**Verification:** Manual execution with `curl` or HTTP client

---

### Chunk 6: Frontend Sort Dropdown Update

**Files to modify:**
- `apps/web/app-wishlist-gallery/src/pages/main-page.tsx`

**Changes:**

1. Add imports for new icons:
```typescript
import { TrendingDown, Clock, Gem } from 'lucide-react'
```

2. Update `wishlistSortOptions` array:
```typescript
const wishlistSortOptions = [
  { value: 'sortOrder-asc', label: 'Manual Order' },
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'priority-desc', label: 'Priority: High to Low' },
  { value: 'priority-asc', label: 'Priority: Low to High' },
  // Smart sorting options (WISH-2014)
  { value: 'bestValue-asc', label: 'Best Value', icon: TrendingDown, tooltip: 'Sort by lowest price per piece' },
  { value: 'expiringSoon-asc', label: 'Expiring Soon', icon: Clock, tooltip: 'Sort by oldest release dates' },
  { value: 'hiddenGems-desc', label: 'Hidden Gems', icon: Gem, tooltip: 'Discover overlooked valuable sets' },
]
```

3. Update RTK Query hook type:
```typescript
sort: sortField as 'createdAt' | 'title' | 'price' | 'sortOrder' | 'priority' | 'pieceCount' | 'bestValue' | 'expiringSoon' | 'hiddenGems',
```

**Verification:** `pnpm check-types` and visual inspection

---

### Chunk 7: Frontend Component Tests

**Files to create:**
- `apps/web/app-wishlist-gallery/src/pages/__tests__/smart-sorting.test.tsx`

**Tests to implement (5 total):**
1. `renders Best Value sort option in dropdown`
2. `renders Expiring Soon sort option in dropdown`
3. `renders Hidden Gems sort option in dropdown`
4. `triggers API call with correct sort parameter when Best Value selected`
5. `sort options are keyboard navigable`

**Verification:** `pnpm test apps/web/app-wishlist-gallery`

---

### Chunk 8: Playwright E2E Test

**Files to create:**
- `apps/web/playwright/wishlist/smart-sorting.spec.ts`

**Test scenarios:**
1. Select "Best Value" sort and verify items re-order
2. Select "Expiring Soon" sort and verify items re-order
3. Select "Hidden Gems" sort and verify items re-order
4. Verify network request includes correct sort parameter
5. Verify no console errors during sort changes

**Verification:** `pnpm playwright test apps/web/playwright/wishlist/smart-sorting.spec.ts`

---

## Execution Order

1. Chunk 1: Backend Schema Extension (types.ts + api-client schema)
2. Chunk 2: Backend Repository Implementation (repositories.js)
3. Chunk 3: Backend Service Type Update (services.ts)
4. Chunk 4: Backend Unit Tests
5. Chunk 5: Backend Integration Tests (.http file)
6. Chunk 6: Frontend Sort Dropdown Update
7. Chunk 7: Frontend Component Tests
8. Chunk 8: Playwright E2E Test

## Verification Checkpoints

After each chunk:
- Run `pnpm check-types` to verify TypeScript compilation
- Run `pnpm lint` to verify no lint errors

After all chunks:
- Run `pnpm test` to verify all tests pass
- Run `pnpm build` to verify production build succeeds

## Estimated Duration

| Chunk | Time Estimate |
|-------|---------------|
| 1. Schema Extension | 15 min |
| 2. Repository Implementation | 30 min |
| 3. Service Type Update | 10 min |
| 4. Backend Unit Tests | 45 min |
| 5. Integration Tests | 20 min |
| 6. Frontend Dropdown | 30 min |
| 7. Frontend Tests | 30 min |
| 8. Playwright E2E | 30 min |
| **Total** | **3.5 hours** |
