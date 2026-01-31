# Dev Feasibility: WISH-2014 Smart Sorting Algorithms (MVP-Critical)

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: Story extends existing `GET /api/wishlist` endpoint with new sort parameter values. Backend has all required fields (price, pieceCount, releaseDate, priority) in schema. Frontend has existing sort dropdown to extend. No new infrastructure required.

## Likely Change Surface (Core Only)

### Backend Changes (Core Journey)

**1. API Layer** (`apps/api/lego-api/domains/wishlist/`)

- **File**: `types.ts` (Zod schemas)
  - Extend `ListWishlistQuerySchema` sort enum to include: `'bestValue' | 'expiringSoon' | 'hiddenGems'`
  - No breaking changes - backward compatible

- **File**: `application/wishlist-service.ts` (Service layer)
  - Add sort algorithm logic in `listItems()` method
  - Implement 3 sorting strategies:
    1. `bestValue`: Calculate price/pieceCount ratio, sort ascending (nulls last)
    2. `expiringSoon`: Sort by releaseDate ascending (nulls last)
    3. `hiddenGems`: Calculate score (low priority × high pieceCount), sort descending
  - Estimated: ~50-80 lines of code

- **File**: `adapters/wishlist-repository.ts` (Repository layer)
  - Extend `listItems()` to handle new sort modes
  - Use Drizzle query builder for sorting
  - May require `sql` template for calculated fields (price/pieceCount ratio)
  - Estimated: ~30-50 lines of code

**2. Shared Schemas** (`packages/core/api-client/src/schemas/`)

- **File**: `wishlist.ts`
  - Extend `WishlistQueryParamsSchema` sort enum
  - Must be kept in sync with backend `ListWishlistQuerySchema`
  - Estimated: ~5 lines

### Frontend Changes (Core Journey)

**3. UI Components** (`apps/web/app-wishlist-gallery/`)

- **File**: `src/pages/main-page.tsx` (or equivalent gallery page)
  - Update sort dropdown options to include:
    - "Best Value" (value: bestValue)
    - "Expiring Soon" (value: expiringSoon)
    - "Hidden Gems" (value: hiddenGems)
  - Add icons from `lucide-react` (TrendingDown, Clock, Gem)
  - Add tooltips explaining each sort mode
  - Estimated: ~20-30 lines

- **File**: `src/components/WishlistCard/index.tsx` (optional)
  - No changes required for MVP
  - Future: Add visual indicators for sort mode (see FUTURE-RISKS.md)

**4. RTK Query** (`packages/core/api-client/src/rtk/`)

- **File**: `wishlist-gallery-api.ts`
  - No code changes required - schema update is sufficient
  - RTK Query `useGetWishlistQuery` already accepts dynamic sort parameter
  - Validation via updated `WishlistQueryParamsSchema`

### Endpoints (Core Journey)

**Extended Endpoint:**
- `GET /api/wishlist?sort={bestValue|expiringSoon|hiddenGems}&order={asc|desc}`

**No New Endpoints Required**

### Critical Deploy Touchpoints

1. **Database Schema**: No schema changes (uses existing fields)
2. **API Versioning**: No breaking changes (additive only)
3. **Cache Invalidation**: RTK Query cache tags unchanged (`Wishlist`, `WishlistItem`)
4. **Feature Flags**: Recommend feature flag for gradual rollout (see FUTURE-RISKS.md)

## MVP-Critical Risks

### Risk 1: Null Value Handling Strategy

**Risk**: Ambiguous behavior when price, pieceCount, or releaseDate are null

**Why it blocks MVP**: Core user journey requires predictable sorting. Users will see inconsistent results if nulls are handled differently across sort modes.

**Required Mitigation**:
- **PM Decision Required**: Document null handling strategy in story
  - Option A: Exclude items with null values from result
  - Option B: Place items with null values at end of list
  - **Recommendation**: Option B (place at end) - maintains item visibility
- **Implementation**: Drizzle query builder must handle nulls explicitly:
  ```typescript
  // Example for bestValue sort
  .orderBy(
    sql`CASE WHEN ${wishlistItems.price} IS NULL OR ${wishlistItems.pieceCount} IS NULL 
        THEN 999999 
        ELSE ${wishlistItems.price}::numeric / NULLIF(${wishlistItems.pieceCount}, 0) 
        END ASC`
  )
  ```

### Risk 2: Division by Zero (Price-per-Piece Calculation)

**Risk**: `pieceCount = 0` causes division by zero error in bestValue sort

**Why it blocks MVP**: Runtime error will return 500 to user, breaking core journey

**Required Mitigation**:
- **SQL**: Use `NULLIF(pieceCount, 0)` to treat 0 as NULL
- **Service Layer**: Validate pieceCount > 0 before calculation
- **Test**: Add edge case test with pieceCount = 0 (see TEST-PLAN.md)

### Risk 3: Schema Synchronization (Frontend ↔ Backend)

**Risk**: Frontend and backend Zod schemas must define identical sort enum values

**Why it blocks MVP**: Type mismatch will cause validation errors, breaking API calls

**Required Mitigation**:
- **Shared Schema**: Extract sort enum to shared package:
  ```typescript
  // packages/core/api-client/src/schemas/wishlist.ts
  export const WishlistSortModeSchema = z.enum([
    'createdAt',
    'title',
    'price',
    'pieceCount',
    'sortOrder',
    'priority',
    'bestValue',
    'expiringSoon',
    'hiddenGems',
  ])
  ```
- **Backend**: Import from shared package instead of defining locally
- **Test**: Add alignment test (see WISH-2000 pattern)

### Risk 4: Query Performance with Calculated Fields

**Risk**: Sorting by calculated fields (price/pieceCount ratio) may be slow without proper indexing

**Why it blocks MVP**: Queries > 2s will fail user acceptance criteria

**Required Mitigation**:
- **Database Indexes**: Add composite index on (userId, price, pieceCount) for bestValue sort
- **Query Plan**: Analyze `EXPLAIN` output for slow queries
- **Test**: Performance test with 1000+ items (see TEST-PLAN.md)
- **Fallback**: If performance poor, consider adding calculated column in schema (future story)

### Risk 5: Hidden Gems Algorithm Definition

**Risk**: "Low priority × high piece count" algorithm definition is ambiguous

**Why it blocks MVP**: Implementation cannot begin without clear algorithm spec

**Required Mitigation**:
- **PM Decision Required**: Define exact algorithm in story
  - Question 1: What priority range is "low"? (0-2? 0-3?)
  - Question 2: What piece count is "high"? (> 1000? > 500?)
  - Question 3: How to calculate score? Priority weight vs piece count weight?
  - **Recommendation**: 
    ```typescript
    score = (5 - priority) * pieceCount
    // Priority 0 → weight 5, Priority 5 → weight 0
    // Higher piece count = higher score
    // Sort descending by score
    ```

## Missing Requirements for MVP

### MR1: Null Handling Strategy (Blocks Implementation)

**Missing Requirement**: PM must document null handling behavior for each sort mode

**Required Decision**:
```markdown
## Null Value Handling

### Best Value Sort
- Items with null `price` or `pieceCount`: Place at end of list
- Items with `pieceCount = 0`: Treat as null

### Expiring Soon Sort
- Items with null `releaseDate`: Place at end of list

### Hidden Gems Sort
- Items with null `pieceCount`: Exclude from results (or place at end)
- Items with `priority > 3`: Exclude from algorithm (not "low priority")
```

### MR2: Hidden Gems Algorithm Specification (Blocks Implementation)

**Missing Requirement**: PM must provide exact algorithm formula

**Required Decision**:
```markdown
## Hidden Gems Algorithm

**Formula**: `score = (5 - priority) * pieceCount`

**Logic**:
- Priority 0-2 are "low priority" (high weights: 5, 4, 3)
- Priority 3-5 are "high priority" (low weights: 2, 1, 0)
- Higher piece count increases score
- Sort descending by score (highest score first)

**Example**:
- Item A: priority=0, pieceCount=2000 → score=10000
- Item B: priority=1, pieceCount=3000 → score=12000 (ranks higher)
- Item C: priority=5, pieceCount=1500 → score=0 (ranks lowest)
```

### MR3: Sort Option User-Facing Labels (Blocks Frontend)

**Missing Requirement**: PM/UX must approve final labels for dropdown

**Required Decision**:
```markdown
## Sort Option Labels

| Backend Value | Frontend Label | Tooltip/Description |
|---------------|----------------|---------------------|
| bestValue | "Best Value" | "Sort by lowest price per piece" |
| expiringSoon | "Expiring Soon" | "Sort by oldest release dates" |
| hiddenGems | "Hidden Gems" | "Discover overlooked valuable sets" |
```

## MVP Evidence Expectations

### Backend Evidence (Core Journey)

1. **Unit Tests** (Service Layer)
   - Test bestValue algorithm with varying price/pieceCount
   - Test expiringSoon algorithm with varying releaseDates
   - Test hiddenGems algorithm with varying priority/pieceCount
   - Test null handling for each sort mode
   - Test division by zero handling
   - **Minimum**: 15 unit tests (5 per algorithm)

2. **Integration Tests** (`.http` file)
   - `__http__/wishlist-smart-sorting.http` with all 3 sort modes
   - Verify response structure matches `WishlistListResponseSchema`
   - Verify items array ordering matches algorithm
   - **Minimum**: 5 requests (3 happy path, 2 error cases)

3. **Database Query Performance**
   - `EXPLAIN ANALYZE` output for each sort mode
   - Query time < 2s for 1000+ items
   - Document any index additions required

### Frontend Evidence (Core Journey)

1. **Component Tests** (Vitest + RTL)
   - Test dropdown renders new options
   - Test icon rendering for each option
   - Test tooltip content for each option
   - **Minimum**: 5 tests

2. **Playwright E2E Tests**
   - Full sort flow: select each mode, verify items re-order
   - Verify network request includes correct sort parameter
   - Verify no console errors
   - **Minimum**: 1 E2E test covering all 3 modes

3. **Accessibility Evidence**
   - Axe-core audit passes (0 violations)
   - Keyboard navigation test passes
   - Screen reader test passes (manual verification)

### Critical CI/Deploy Checkpoints

1. **Schema Alignment Test**: Verify frontend and backend sort enums match
2. **Type Check**: TypeScript compilation passes across all packages
3. **Lint**: ESLint passes with no errors
4. **Tests**: All new tests pass (backend unit + integration, frontend unit + E2E)
5. **Build**: Production build succeeds

## Architecture Compliance

### Hexagonal Architecture (Ports & Adapters)

**Current Compliance**: ✅ Story maintains architecture

- **Domain Layer**: Sort algorithms in `application/wishlist-service.ts` (business logic)
- **Adapter Layer**: Drizzle queries in `adapters/wishlist-repository.ts` (database)
- **Port Layer**: Zod schemas in `types.ts` (contracts)

**No Architecture Violations**: Story extends existing layers without coupling

### Reuse-First Strategy

**Reuse Targets**:
- ✅ Existing `GET /api/wishlist` endpoint (extend, don't duplicate)
- ✅ Existing RTK Query `useGetWishlistQuery` hook (no changes needed)
- ✅ Existing Select primitive from `@repo/app-component-library/_primitives/`
- ✅ Existing database schema fields (price, pieceCount, releaseDate, priority)

**No New Packages Required**

## Implementation Sequence

**Recommended Order** (minimize risk):

1. **Phase 1: Backend Foundation** (Day 1)
   - Extend Zod schema with new sort values
   - Add sort algorithms to service layer
   - Add unit tests for algorithms

2. **Phase 2: Backend Integration** (Day 2)
   - Extend repository layer with Drizzle queries
   - Add integration tests (`.http` file)
   - Verify query performance

3. **Phase 3: Frontend UI** (Day 3)
   - Update sort dropdown component
   - Add icons and tooltips
   - Add component tests

4. **Phase 4: E2E Verification** (Day 4)
   - Add Playwright tests
   - Verify full flow works
   - Accessibility audit

5. **Phase 5: Code Review & Refinement** (Day 5)
   - Address review feedback
   - Fix any edge cases
   - Update documentation

**Total Estimated Effort**: 3-5 days (1 developer)

## Dependencies

**Blocker Dependencies**: None - all required fields exist in schema

**Soft Dependencies**:
- WISH-2001 (Gallery MVP) - Must be complete (already done)
- Sort dropdown component must exist (verified in WISH-2001)

## Confidence Notes

**High Confidence Rationale**:
- No database migrations required
- No new infrastructure required
- Extends existing, tested endpoints
- All required data fields already exist
- Clear implementation path

**Medium Confidence Areas**:
- Query performance with calculated fields (mitigation: indexing)
- Null handling edge cases (mitigation: comprehensive tests)

**Low Confidence Areas**: None
