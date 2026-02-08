# Test Plan: WISH-2014 Smart Sorting Algorithms

## Scope Summary

- **Endpoints touched**: `GET /api/wishlist` (extended with new sort parameter values)
- **UI touched**: Yes - Sort dropdown in gallery page
- **Data/storage touched**: No new tables - uses existing wishlist_items fields (price, pieceCount, releaseDate, priority)

## Happy Path Tests

### Test 1: Best Value Sort (Price-per-Piece Ratio)

**Setup:**
- Create 5 wishlist items with varying price and piece count:
  1. Item A: price=100, pieceCount=1000 (ratio: 0.10)
  2. Item B: price=50, pieceCount=250 (ratio: 0.20)
  3. Item C: price=200, pieceCount=2000 (ratio: 0.10)
  4. Item D: price=30, pieceCount=100 (ratio: 0.30)
  5. Item E: price=80, pieceCount=500 (ratio: 0.16)

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc
```

**Expected:**
- Items ordered by price/pieceCount ratio (lowest first): A, C, E, B, D
- Response includes all standard fields (id, title, price, pieceCount)
- Status 200

**Evidence:**
- `.http` response showing correct ordering
- Verify calculated ratio order matches expectation
- Log response JSON to verify field presence

### Test 2: Expiring Soon Sort (Oldest Release Date)

**Setup:**
- Create 5 wishlist items with varying release dates:
  1. Item A: releaseDate=2020-01-01 (oldest)
  2. Item B: releaseDate=2023-06-15
  3. Item C: releaseDate=2019-05-10 (oldest)
  4. Item D: releaseDate=2024-12-20 (newest)
  5. Item E: releaseDate=null (no date)

**Action:**
```http
GET /api/wishlist?sort=expiringSoon&order=asc
```

**Expected:**
- Items ordered by releaseDate (oldest first): C, A, B, D
- Items with null releaseDate appear at the end: E
- Status 200

**Evidence:**
- `.http` response showing correct date ordering
- Verify null handling (items without dates at end)
- Check datetime string format (ISO 8601)

### Test 3: Hidden Gems Sort (Low Priority + High Piece Count)

**Setup:**
- Create 5 wishlist items with varying priority and piece count:
  1. Item A: priority=0, pieceCount=2000 (score: 2000)
  2. Item B: priority=5, pieceCount=1500 (score: 0 - high priority excluded)
  3. Item C: priority=1, pieceCount=3000 (score: 3000)
  4. Item D: priority=0, pieceCount=500 (score: 500)
  5. Item E: priority=2, pieceCount=1000 (score: 1000)

**Action:**
```http
GET /api/wishlist?sort=hiddenGems&order=desc
```

**Expected:**
- Items ordered by (low priority * high pieceCount) descending: C, A, E, D, B
- Algorithm favors priority 0-2 with high piece counts
- Status 200

**Evidence:**
- `.http` response showing correct ordering
- Verify algorithm logic: lower priority + higher pieces = higher score
- Log calculated scores for verification

### Test 4: Frontend Sort Dropdown Integration

**Setup:**
- Authenticated user with populated wishlist (10+ items)
- Gallery page loaded

**Action:**
1. Click sort dropdown
2. Select "Best Value"
3. Verify items re-order
4. Select "Expiring Soon"
5. Verify items re-order
6. Select "Hidden Gems"
7. Verify items re-order

**Expected:**
- Dropdown includes new options: "Best Value", "Expiring Soon", "Hidden Gems"
- RTK Query triggers API call with correct sort parameter
- Items re-render in correct order
- Loading state shown during fetch

**Evidence:**
- Playwright test capturing dropdown interaction
- Network request logs showing sort parameter
- Screenshot of re-ordered gallery
- Verify no console errors

### Test 5: Pagination with Smart Sorting

**Setup:**
- Create 25 wishlist items with varying attributes
- Default pagination: 20 items per page

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc&page=1&limit=20
GET /api/wishlist?sort=bestValue&order=asc&page=2&limit=20
```

**Expected:**
- Page 1: Top 20 best value items
- Page 2: Remaining 5 items
- Consistent ordering across pages
- Pagination metadata correct

**Evidence:**
- `.http` responses for both pages
- Verify no duplicate items across pages
- Check pagination.total, pagination.totalPages

## Error Cases

### Error 1: Invalid Sort Parameter

**Setup:**
- Authenticated user

**Action:**
```http
GET /api/wishlist?sort=invalidSort
```

**Expected:**
- Status 400
- Error message: "Invalid sort parameter. Allowed: createdAt, title, price, pieceCount, sortOrder, priority, bestValue, expiringSoon, hiddenGems"

**Evidence:**
- `.http` response showing 400 status
- Error response body with validation details

### Error 2: Missing Price for Best Value Sort

**Setup:**
- Create 3 wishlist items:
  1. Item A: price=100, pieceCount=1000
  2. Item B: price=null, pieceCount=500 (missing price)
  3. Item C: price=50, pieceCount=250

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc
```

**Expected:**
- Items with missing price or pieceCount excluded from bestValue sort (or placed at end)
- Items with complete data sorted correctly: C, A
- Item B appears at end or excluded from result
- Status 200 (graceful handling)

**Evidence:**
- `.http` response showing handling of null values
- Log backend logic for null handling decision
- Verify no 500 errors

### Error 3: Missing Release Date for Expiring Soon Sort

**Setup:**
- Create 3 wishlist items:
  1. Item A: releaseDate=2020-01-01
  2. Item B: releaseDate=null
  3. Item C: releaseDate=2019-05-10

**Action:**
```http
GET /api/wishlist?sort=expiringSoon&order=asc
```

**Expected:**
- Items with missing releaseDate appear at end
- Items with dates sorted correctly: C, A, B
- Status 200

**Evidence:**
- `.http` response showing null handling
- Verify items without dates at end of list

### Error 4: Unauthenticated Request

**Setup:**
- No Authorization header

**Action:**
```http
GET /api/wishlist?sort=bestValue
```

**Expected:**
- Status 401
- Error: "Unauthorized"

**Evidence:**
- `.http` response showing 401
- Existing auth middleware handles this (no changes needed)

## Edge Cases (Reasonable)

### Edge 1: All Items Have Same Best Value Ratio

**Setup:**
- Create 5 items all with price=100, pieceCount=1000 (ratio: 0.10)

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc
```

**Expected:**
- Items returned in secondary sort order (e.g., createdAt or sortOrder)
- No errors
- Status 200

**Evidence:**
- `.http` response showing consistent secondary ordering
- Document secondary sort behavior

### Edge 2: Zero Piece Count (Division by Zero)

**Setup:**
- Create items:
  1. Item A: price=100, pieceCount=0
  2. Item B: price=50, pieceCount=250

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc
```

**Expected:**
- Item A excluded or handled gracefully (no division by zero error)
- Item B sorted correctly
- Status 200

**Evidence:**
- `.http` response showing safe handling
- Backend logs confirming no exceptions
- Verify zero piece count logic

### Edge 3: Very Old Release Dates (Year 1900)

**Setup:**
- Create items with extreme release dates:
  1. Item A: releaseDate=1900-01-01
  2. Item B: releaseDate=2024-01-01

**Action:**
```http
GET /api/wishlist?sort=expiringSoon&order=asc
```

**Expected:**
- Items sorted correctly by date
- No date parsing errors
- Status 200

**Evidence:**
- `.http` response showing correct ordering
- Verify datetime parsing handles old dates

### Edge 4: Large Datasets (100+ Items)

**Setup:**
- Create 150 wishlist items with varying attributes

**Action:**
```http
GET /api/wishlist?sort=hiddenGems&order=desc&limit=100
```

**Expected:**
- Query completes within acceptable time (<2s)
- Correct ordering maintained
- Pagination works correctly

**Evidence:**
- Response time logged
- Verify database query performance (check query plan if needed)
- Monitor for N+1 queries

### Edge 5: All Items Missing Required Fields for Sort

**Setup:**
- Create 5 items all with price=null, pieceCount=null for bestValue sort

**Action:**
```http
GET /api/wishlist?sort=bestValue&order=asc
```

**Expected:**
- Empty result or all items returned in default order
- Status 200
- No errors

**Evidence:**
- `.http` response showing graceful handling
- Document behavior for all-null scenario

## Required Tooling Evidence

### Backend Testing

**Required `.http` requests:**
1. `__http__/wishlist-smart-sorting.http` with all happy path, error, and edge case requests
2. Each request must include:
   - Authorization header with valid JWT
   - sort parameter with new values (bestValue, expiringSoon, hiddenGems)
   - Expected response structure validation

**Assertions required:**
- Status codes (200, 400, 401)
- Response body structure matches `WishlistListResponseSchema`
- Items array ordering matches expected algorithm
- Pagination metadata correct
- Error messages match expected format

**Database setup:**
- Seed script to create test data with varying:
  - price (null, 0, positive values)
  - pieceCount (null, 0, positive values)
  - releaseDate (null, old dates, recent dates)
  - priority (0-5 scale)

### Frontend Testing (UI Touched)

**Playwright tests required:**
1. `apps/web/app-wishlist-gallery/playwright/smart-sorting.spec.ts`

**Test scenarios:**
1. Dropdown interaction - select each new sort option
2. Items re-order on sort change
3. Loading states during fetch
4. Pagination works with smart sorting
5. Sort persists on page refresh (URL params)

**Assertions:**
- Dropdown contains new options
- Network request includes correct sort parameter
- Items DOM order matches expected algorithm
- No console errors
- Accessibility: dropdown keyboard navigable

**Artifacts:**
- Screenshots of each sort mode
- Network request logs showing API calls
- Video recording of full sort interaction flow

### Integration Testing

**End-to-end flow:**
1. Seed database with test data
2. Load gallery page in Playwright
3. Select each smart sort option
4. Verify items re-order correctly
5. Verify pagination works
6. Verify URL params update

**Evidence:**
- Playwright trace showing full flow
- Network HAR file with all API requests
- Console logs showing no errors

## Risks to Call Out

### Risk 1: Algorithm Complexity

- **Risk**: Complex multi-field calculations may impact query performance
- **Mitigation**: Add database indexes on (price, pieceCount, releaseDate, priority)
- **Test**: Measure query time with 1000+ items

### Risk 2: Null Value Handling

- **Risk**: Ambiguous behavior when required fields are null (price, pieceCount, releaseDate)
- **Blocker**: PM must decide: exclude nulls or place at end?
- **Test**: Cannot finalize tests until null handling strategy documented

### Risk 3: Secondary Sort Order

- **Risk**: When primary sort values are equal (tie), secondary sort order undefined
- **Mitigation**: Document secondary sort (recommend sortOrder or createdAt)
- **Test**: Edge case 1 tests this scenario

### Risk 4: Frontend Sort Dropdown Naming

- **Risk**: Sort option names must be user-friendly (not technical field names)
- **Blocker**: UX review needed for dropdown labels (e.g., "Best Value" vs "Price Per Piece")
- **Test**: Playwright tests will assert on final naming

### Risk 5: Schema Validation

- **Risk**: WishlistQueryParamsSchema must be updated to include new sort values
- **Blocker**: Schema must be updated before implementation can begin
- **Test**: Schema validation tests required

## Test Execution Order

1. **Backend Unit Tests**: Test algorithm logic in isolation (service layer)
2. **Backend Integration Tests**: Test endpoints with real database via `.http` files
3. **Frontend Unit Tests**: Test dropdown component rendering and interaction
4. **E2E Tests**: Full Playwright flow with seeded data

## Definition of Done

- All happy path tests pass
- All error cases handled gracefully
- All edge cases tested and documented
- Playwright tests pass with screenshots/traces
- `.http` file committed with all test requests
- No console errors or warnings
- Performance: queries complete <2s for 1000+ items
