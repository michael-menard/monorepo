# Test Plan: INST-1100 - View MOC Gallery

## Scope Summary

### Endpoints Touched
- `GET /mocs` - List user's MOCs (already exists in `apps/api/lego-api/domains/instructions/routes.ts`)
  - Query params: `page`, `limit`, `search`, `type`, `status`, `theme`
  - Response: Paginated list of MOC summaries

### UI Touched
**Yes** - Gallery page at `/mocs` in `apps/web/app-instructions-gallery`
- Components: GalleryPage, InstructionCard, GalleryGrid, GalleryEmptyState, GallerySkeleton
- Routes: `/mocs` route in main-app router

### Data/Storage Touched
**Yes** - Database queries
- Table: `moc_instructions` (queried via `instructionsService.listMocs`)
- Joined with `moc_files` for thumbnail URLs
- Filtered by `userId` from auth context

---

## Happy Path Tests

### Test 1: Display Gallery with Multiple MOCs

**Setup**:
- Authenticated user with userId = `dev-user-00000000-0000-0000-0000-000000000001`
- Database seeded with 5 MOCs owned by this user
- MOCs have thumbnails, titles, piece counts, and themes

**Action**:
1. Navigate to `/mocs` route
2. Wait for API call to complete

**Expected Outcome**:
- Gallery displays 5 MOC cards in responsive grid
- Each card shows:
  - Thumbnail image (or placeholder if missing)
  - MOC title
  - Piece count
  - Theme name
- Grid is responsive:
  - Mobile (≤640px): 1 column
  - Tablet (641-1024px): 2 columns
  - Desktop (>1024px): 3-4 columns

**Evidence**:
- **Frontend**: Playwright screenshot showing grid layout
- **API**: Network tab shows `GET /mocs?page=1&limit=50` with 200 status
- **Response**: JSON contains 5 items with required fields: `id`, `title`, `thumbnailUrl`, `partsCount`, `theme`

---

### Test 2: Empty State Display

**Setup**:
- Authenticated user with no MOCs in database
- User navigates to `/mocs`

**Action**:
1. Load gallery page
2. Wait for API call to complete

**Expected Outcome**:
- Empty state component displays
- Message: "No MOCs found" or similar
- "Create your first MOC" CTA button visible
- Button links to create page (future story INST-1102)

**Evidence**:
- **Frontend**: Playwright screenshot showing empty state
- **API**: `GET /mocs` returns `{ items: [], total: 0, page: 1, limit: 50 }`
- **DOM**: Button with text matching "Create" exists and is clickable

---

### Test 3: Loading Skeleton States

**Setup**:
- Slow network or delayed API response (simulated in test)

**Action**:
1. Navigate to `/mocs`
2. Capture UI immediately before data loads

**Expected Outcome**:
- GallerySkeleton component renders
- Shows placeholder cards with shimmer animation
- No error messages
- Skeleton replaced with actual cards when data arrives

**Evidence**:
- **Frontend**: Playwright screenshot during loading state
- **Code**: `isLoading` flag triggers skeleton render
- **Timing**: Skeleton visible for at least 100ms before data render

---

## Error Cases

### Error 1: Unauthorized Access (401)

**Setup**:
- User not authenticated (no JWT token)
- Or token expired

**Action**:
1. Attempt to navigate to `/mocs`

**Expected Outcome**:
- API returns 401 Unauthorized
- Frontend redirects to login page
- Or displays "Please log in" message

**Evidence**:
- **API**: Response status 401
- **Frontend**: Redirect to `/login` or error toast displayed
- **Logs**: Logger records auth failure

---

### Error 2: Network Failure (500)

**Setup**:
- API returns 500 Internal Server Error
- Or network timeout

**Action**:
1. Navigate to `/mocs`
2. API call fails

**Expected Outcome**:
- Error state displays
- User-friendly message: "Failed to load MOCs. Please try again."
- Retry button available

**Evidence**:
- **API**: Response status 500 or network error in console
- **Frontend**: Error message visible in DOM
- **Logs**: Error logged via @repo/logger

---

### Error 3: Malformed API Response

**Setup**:
- API returns data that doesn't match `WishlistListResponseSchema` (or equivalent MOC schema)

**Action**:
1. Navigate to `/mocs`
2. Zod validation fails on response

**Expected Outcome**:
- Error caught during `transformResponse`
- Error state displays
- Logged error includes validation details

**Evidence**:
- **Console**: Zod validation error logged
- **Frontend**: Error state rendered
- **RTK Query**: Query status is `error`

---

## Edge Cases (Reasonable)

### Edge 1: Very Long MOC Title

**Setup**:
- MOC with title exceeding 100 characters

**Action**:
- Display card in gallery

**Expected Outcome**:
- Title truncates with ellipsis (`text-overflow: ellipsis`)
- Full title available on hover (via tooltip) or on detail page
- Card layout not broken

**Evidence**:
- **Frontend**: Screenshot showing truncated title
- **CSS**: `overflow: hidden`, `text-overflow: ellipsis` applied

---

### Edge 2: Missing Thumbnail URL

**Setup**:
- MOC with `thumbnailUrl: null` or empty string

**Action**:
- Display card in gallery

**Expected Outcome**:
- Placeholder image displays (brick icon or default thumbnail)
- No broken image icon
- Card still displays title, piece count, theme

**Evidence**:
- **Frontend**: Screenshot showing placeholder
- **Code**: Conditional render checks `thumbnailUrl` existence

---

### Edge 3: Large Dataset (50+ MOCs)

**Setup**:
- User has 100 MOCs
- API returns first 50 with pagination

**Action**:
1. Load gallery page
2. Scroll to bottom

**Expected Outcome**:
- First 50 MOCs display
- Pagination controls visible (if implemented)
- Or "Load More" button (deferred to future story)
- Performance: page renders in <2 seconds

**Evidence**:
- **API**: `GET /mocs?page=1&limit=50` returns 50 items, `total: 100`
- **Frontend**: 50 cards rendered
- **Performance**: Lighthouse performance score >70

---

### Edge 4: Concurrent User with Same Account

**Setup**:
- User A loads `/mocs`
- User A creates new MOC in another tab (after INST-1102)
- User A returns to gallery

**Action**:
1. Trigger refetch or reload gallery

**Expected Outcome**:
- New MOC appears in gallery
- No duplicate entries
- Cache invalidated correctly

**Evidence**:
- **RTK Query**: Cache tags invalidated on mutation
- **Frontend**: New item visible after refetch

---

## Required Tooling Evidence

### Backend Testing

**`.http` Requests**:
```http
### Get MOC List (Happy Path)
GET {{host}}/mocs?page=1&limit=50
Authorization: Bearer {{jwt_token}}

### Expected Response
# Status: 200
# Body validates against schema:
{
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "thumbnailUrl": "string | null",
      "partsCount": number,
      "theme": "string | null"
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}

### Get MOC List (Empty)
GET {{host}}/mocs?page=1&limit=50
Authorization: Bearer {{jwt_token}}
# User with no MOCs
# Expected: { "items": [], "total": 0, ... }

### Get MOC List (Unauthorized)
GET {{host}}/mocs
# No Authorization header
# Expected: 401 Unauthorized
```

**Assertions**:
- Status code: 200, 401, 500 as appropriate
- Response body matches Zod schema
- `items` array contains expected fields
- Pagination metadata correct

---

### Frontend Testing

**Unit Tests** (`apps/web/app-instructions-gallery/src/pages/__tests__/GalleryPage.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react'
import { GalleryPage } from '../GalleryPage'

describe('GalleryPage', () => {
  it('renders grid layout', () => {
    render(<GalleryPage />)
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('shows empty state when no MOCs', () => {
    // Mock useGetMocsQuery to return empty array
    render(<GalleryPage />)
    expect(screen.getByText(/no mocs found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('displays MOC cards with correct data', () => {
    // Mock useGetMocsQuery with sample data
    render(<GalleryPage />)
    expect(screen.getByText('King\'s Castle')).toBeInTheDocument()
    expect(screen.getByText('2500 pieces')).toBeInTheDocument()
  })

  it('shows loading skeletons during fetch', () => {
    // Mock isLoading: true
    render(<GalleryPage />)
    expect(screen.getByTestId('gallery-skeleton')).toBeInTheDocument()
  })
})
```

**Integration Tests** (`apps/web/app-instructions-gallery/src/pages/__tests__/GalleryPage.integration.test.tsx`):
```typescript
import { renderWithProviders } from '@/test/utils'
import { GalleryPage } from '../GalleryPage'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

describe('GalleryPage Integration', () => {
  it('fetches and displays MOC list from API', async () => {
    server.use(
      http.get('/mocs', () => {
        return HttpResponse.json({
          items: [
            { id: '1', title: 'Castle', thumbnailUrl: 'url', partsCount: 100, theme: 'Castle' }
          ],
          total: 1,
          page: 1,
          limit: 50
        })
      })
    )

    renderWithProviders(<GalleryPage />)
    expect(await screen.findByText('Castle')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/mocs', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )

    renderWithProviders(<GalleryPage />)
    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument()
  })
})
```

**E2E Tests (Playwright)** (`apps/web/playwright/features/instructions/inst-1100-gallery.feature`):
```gherkin
Feature: View MOC Gallery

  Scenario: Display user's MOC collection
    Given user is authenticated
    And user has 5 MOCs in database
    When user navigates to /mocs
    Then gallery displays 5 MOC cards
    And each card shows thumbnail, title, piece count, and theme
    And grid is responsive based on viewport

  Scenario: Empty gallery state
    Given user is authenticated
    And user has no MOCs
    When user navigates to /mocs
    Then empty state displays
    And "Create your first MOC" button is visible

  Scenario: Gallery loading state
    Given user is authenticated
    And API response is delayed by 1 second
    When user navigates to /mocs
    Then loading skeletons display
    And MOC cards appear after delay
```

**Playwright Steps** (`apps/web/playwright/steps/inst-1100-gallery.steps.ts`):
```typescript
Given('user has {int} MOCs in database', async function(count: number) {
  // Seed database via API or direct DB call
  await this.apiClient.seedMocs(this.userId, count)
})

When('user navigates to /mocs', async function() {
  await this.page.goto('/mocs')
})

Then('gallery displays {int} MOC cards', async function(count: number) {
  const cards = await this.page.locator('[data-testid="moc-card"]').count()
  expect(cards).toBe(count)
})

Then('empty state displays', async function() {
  await expect(this.page.getByText(/no mocs found/i)).toBeVisible()
})
```

**Assertions**:
- Card count matches expected
- Empty state visible when appropriate
- Loading skeletons appear and disappear
- Responsive breakpoints work (test at 375px, 768px, 1024px widths)

**Artifacts**:
- Screenshots on failure
- Video recording of full test run
- Trace file for debugging

---

## Risks to Call Out

### Risk 1: RTK Query Hook Not Available
**Issue**: INST-1008 (Wire RTK Query Mutations) is not completed. `useGetMocsQuery` hook may not exist in `@repo/api-client`.

**Mitigation**: Verify INST-1008 completion before starting implementation. Or create the RTK query endpoint as part of this story's scope expansion.

### Risk 2: Schema Mismatch
**Issue**: Backend `MocInstructionsSchema` may not match frontend expectations for gallery display.

**Mitigation**: Review backend schema and ensure required fields (`id`, `title`, `thumbnailUrl`, `partsCount`, `theme`) are included in `GET /mocs` response.

### Risk 3: Existing main-page.tsx Conflicts
**Issue**: `apps/web/app-instructions-gallery/src/pages/main-page.tsx` already exists and uses `useGetInstructionsQuery`. This may conflict with the new `useGetMocsQuery` pattern.

**Mitigation**: Refactor main-page.tsx to use the correct hook, or verify that `useGetInstructionsQuery` is the same as `useGetMocsQuery`.

### Risk 4: Missing Database Indexes
**Issue**: Querying `moc_instructions` by `userId` may be slow without proper indexes.

**Mitigation**: Verify database schema has index on `userId` column. Check query performance with `EXPLAIN ANALYZE`.

---

## Test Execution Checklist

- [ ] Unit tests pass for all gallery components
- [ ] Integration tests pass with MSW mocking
- [ ] E2E tests pass in Playwright (all scenarios green)
- [ ] Backend `.http` requests return expected responses
- [ ] Performance: Gallery loads in <2 seconds with 50 MOCs
- [ ] Accessibility: Gallery navigable via keyboard
- [ ] Responsive: Tested at 375px, 768px, 1024px, 1440px widths
- [ ] Error states: All error scenarios tested and logged correctly
