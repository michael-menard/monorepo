---
doc_type: story
title: "SETS-MVP-002: Collection View"
story_id: SETS-MVP-002
story_prefix: SETS-MVP
status: in-qa
phase: 2
created_at: "2026-01-30T12:00:00-07:00"
updated_at: "2026-01-31T22:30:00-07:00"
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
- [ ] AC2: Navigation component updated to include link to Collection (alongside Wishlist); update location: `apps/web/app-wishlist-gallery/src/components/Navigation.tsx` or equivalent
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
- [ ] AC16: Service layer method added in `apps/api/lego-api/domains/wishlist/application/services.ts` to support status filtering per api-layer.md architecture
- [ ] AC17: Route changes specified in `apps/api/lego-api/domains/wishlist/routes.ts` to expose status query parameter

### Empty State
- [ ] AC12: Empty collection shows "No sets in your collection yet"
- [ ] AC13: Empty state includes CTA: "Browse your wishlist" linking to `/wishlist`

### Component Wiring
- [ ] AC18: `CollectionPage` component wiring explicitly specified showing how status='owned' filter is passed to `WishlistGallery`

### Testing
- [ ] AC19: HTTP test file added at `apps/api/lego-api/__http__/collection-view.http` verifying GET /api/wishlist?status=owned returns only owned items
- [ ] AC20: Playwright E2E tests added verifying collection page rendering, owned items filtering, and empty state behavior

### Stories & Index
- [ ] AC21: SETS-MVP-002 entry added to `plans/future/wish/stories.index.md` with baseline scope documentation

## Technical Details

### Component Structure

```
apps/web/app-wishlist-gallery/
  src/
    pages/
      CollectionPage/
        index.tsx           # Main collection page - wires status='owned' to WishlistGallery
        __tests__/
          CollectionPage.test.tsx
    components/
      CollectionCard/       # Extends WishlistCard with build status badge
        index.tsx
        __tests__/
      Navigation.tsx        # Updated to include Collection link alongside Wishlist
```

### API Layer Changes (per api-layer.md)

**Service Layer** (`apps/api/lego-api/domains/wishlist/application/services.ts`):
```typescript
// Extend getWishlistItems service method to support status filtering
export async function getWishlistItems(
  userId: string,
  params: z.infer<typeof WishlistQueryParamsSchema>
): Promise<WishlistItem[]> {
  const { status, store, tags, search, page, limit, sort } = params

  return wishlistRepository.findByUserId(userId, {
    status, // NEW: pass status filter to repository
    store,
    tags,
    search,
    page,
    limit,
    sort: sort || (status === 'owned' ? 'purchaseDate DESC' : 'priority ASC'),
  })
}
```

**Adapter Layer** (`apps/api/lego-api/domains/wishlist/routes.ts`):
```typescript
// Update existing GET /api/wishlist route to expose status query parameter
export const WishlistQueryParamsSchema = z.object({
  // ... existing fields ...
  status: ItemStatusSchema.optional(), // NEW: filter by status ('owned' | 'wishlist')
})

// Route handler passes status param to service layer
app.get('/api/wishlist', authenticate, async (req, res) => {
  const params = WishlistQueryParamsSchema.parse(req.query)
  const items = await getWishlistItems(req.user.id, params)
  res.json(items)
})
```

### Component Wiring (AC18)

**CollectionPage** implementation:
```typescript
// apps/web/app-wishlist-gallery/src/pages/CollectionPage/index.tsx
export function CollectionPage() {
  return (
    <div>
      <h1>My Collection</h1>
      <WishlistGallery
        status="owned"              // Hard-coded filter for collection view
        defaultSort="purchaseDate"  // Most recent first
        showPriority={false}        // Disable priority indicators
        enableDragDrop={false}      // Disable reordering
      />
    </div>
  )
}
```

### Reuse Strategy

- Reuse `WishlistGallery` with prop `status="owned"` (see Component Wiring above)
- Reuse `GalleryCard` from `@repo/gallery` with collection-specific slot content (build status badge, purchase date)
- Reuse existing pagination, filtering, search infrastructure
- Disable priority and drag-drop features via props

### Testing Specifications (AC19, AC20)

**HTTP Tests** (`apps/api/lego-api/__http__/collection-view.http`):
```http
### Get owned items (collection view)
GET {{baseUrl}}/api/wishlist?status=owned
Authorization: Bearer {{token}}

### Expected: 200 OK with only items where status='owned'
### Verify: response excludes items with status='wishlist'

### Get owned items with filters
GET {{baseUrl}}/api/wishlist?status=owned&store=Lego&search=castle
Authorization: Bearer {{token}}

### Expected: 200 OK with filtered owned items
```

**Playwright E2E Tests** (`apps/web/playwright/features/collection/collection-view.feature`):
```gherkin
Feature: Collection View

  Scenario: View collection page
    Given I am logged in
    And I have 3 owned items
    When I navigate to "/collection"
    Then I see "My Collection" heading
    And I see 3 collection cards
    And each card shows build status badge
    And cards do NOT show priority indicators

  Scenario: Empty collection state
    Given I am logged in
    And I have 0 owned items
    When I navigate to "/collection"
    Then I see "No sets in your collection yet"
    And I see "Browse your wishlist" link
    When I click "Browse your wishlist"
    Then I am on "/wishlist" page

  Scenario: Collection filtering
    Given I am logged in
    And I have 5 owned items from "Lego" store
    When I navigate to "/collection"
    And I filter by store "Lego"
    Then I see 5 collection cards
```

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

---

## QA Discovery Notes (for PM Review)

_Added by QA Elaboration on 2026-01-31_

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Story is NOT in stories.index.md; no baseline scope documented | Add as AC (AC21) | Critical: scope alignment is non-negotiable before implementation |
| 2 | No service layer specification; story plans API changes but does NOT follow api-layer.md requirements | Add as AC (AC16) | Critical: architectural requirement to specify service layer changes in wishlist service |
| 3 | No adapter/route specification for status query parameter support | Add as AC (AC17) | High: routes.ts changes must be explicitly specified per api-layer.md |
| 4 | Missing .http test file for local backend verification | Add as AC (AC19) | Critical: story lacks local testability plan; HTTP tests required per QA policy |
| 5 | Missing Playwright E2E tests for collection page | Add as AC (AC20) | Critical: no end-to-end test specifications; story untestable without E2E coverage |
| 6 | Component structure unclear; CollectionCard vs. WishlistGallery reuse strategy not detailed | Add as AC (AC18) | Medium: wiring specification needed to clarify how status filter is implemented |
| 7 | Navigation implementation missing; AC2 requires link but location not specified | Add as AC (AC2 revised) | Medium: clarified AC2 to specify Navigation component location and update path |
| 8 | No dependency wiring spec; how CollectionPage wires status='owned' to WishlistGallery not detailed | Add as AC (AC18) | Medium: architectural clarity needed on component integration pattern |
| 9 | Stats endpoint in AC15 marked "Optional for MVP" creating ambiguity | Follow-up story | Medium: SETS-MVP-003 (Collection Stats) created as separate story to clarify MVP scope |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| — | No additional enhancements identified beyond adding missing specs | — | Story scope is appropriately sized once gaps are addressed |

### Follow-up Stories Suggested

- [x] **SETS-MVP-003**: Collection Stats Endpoint - Optional stats query (GET /api/wishlist/stats?status=owned) moved to separate story per user decision to clarify MVP scope

### Items Marked Out-of-Scope

- Build status toggle (SETS-MVP-004) - deferred to separate story
- Advanced collection features (MOC linking, quantity management) - explicitly out of scope
- Collection-specific sorting beyond purchase date - explicitly out of scope

---

## Revision History

### v2 - 2026-01-31

**QA Feedback Addressed**: All 9 issues from ELAB-SETS-MVP-002 resolved

| Issue | Resolution |
|-------|------------|
| Missing stories.index.md entry | Added AC21: story must be added to stories.index.md |
| No service layer specification | Added AC16: specified service layer changes in Technical Details |
| No adapter/route specification | Added AC17: specified route changes in Technical Details |
| Missing .http test file | Added AC19: specified HTTP test file in Testing Specifications |
| Missing Playwright tests | Added AC20: specified E2E test scenarios in Testing Specifications |
| Component structure unclear | Added AC18: clarified CollectionPage wiring in Component Wiring section |
| Navigation implementation missing | Revised AC2: specified Navigation.tsx component location |
| No dependency wiring spec | Resolved via AC18: added explicit component wiring example |
| Stats endpoint ambiguity | Deferred to SETS-MVP-003 follow-up story |

**Files Updated**:
- SETS-MVP-002.md (v2): Added AC16-AC21, expanded Technical Details with service/adapter specs, added Testing Specifications, clarified component wiring
- Status changed from `BLOCKED` to `elaboration` (ready for re-audit)

**Ready for Re-Audit**: Yes - all critical, high, and medium severity issues addressed
