# Backend Implementation Log - WISH-2042

## Chunk 1 - MarkAsPurchasedInput Schema

**Objective (maps to AC 16)**: Define Zod schema for purchase request validation

**Files changed**:
- `apps/api/lego-api/domains/wishlist/types.ts`

**Summary of changes**:
- Added `MarkAsPurchasedInputSchema` with fields: pricePaid, tax, shipping, quantity, purchaseDate, keepOnWishlist
- Added validation: pricePaid >= 0, tax >= 0, shipping >= 0, quantity >= 1, purchaseDate <= today
- Added new error types: `SET_CREATION_FAILED`, `IMAGE_COPY_FAILED`

**Reuse compliance**:
- Reused: Zod library, existing pattern from other schemas in the file
- New: Schema definition
- Why new was necessary: Story requires new purchase input validation

**Ports & adapters note**:
- What stayed in core: Type definitions (domain types)
- What stayed in adapters: N/A

---

## Chunk 2 - WishlistImageStorage Port Extension

**Objective (maps to AC 21)**: Add image copying capability to storage port

**Files changed**:
- `apps/api/lego-api/domains/wishlist/ports/index.ts`

**Summary of changes**:
- Added `copyImage(sourceKey, destKey)` method to WishlistImageStorage interface
- Added `deleteImage(key)` method for cleanup
- Added `extractKeyFromUrl(url)` method for key extraction

**Reuse compliance**:
- Reused: Existing port pattern
- New: New methods on existing interface
- Why new was necessary: Cross-domain image transfer requires new S3 operations

**Ports & adapters note**:
- What stayed in core: Port interface definitions
- What stayed in adapters: Implementation details

---

## Chunk 3 - Image Copy Storage Adapter + api-core Enhancement

**Objective (maps to AC 21)**: Implement S3 copy operation

**Files changed**:
- `packages/api-core/src/s3.ts` - Added `copyS3Object` function
- `packages/api-core/src/index.ts` - Exported `copyS3Object`
- `apps/api/lego-api/domains/wishlist/adapters/storage.ts` - Implemented port methods

**Summary of changes**:
- Added `copyS3Object` utility to @repo/api-core (download + re-upload pattern)
- Implemented `copyImage`, `deleteImage`, `extractKeyFromUrl` in storage adapter
- Used existing `deleteFromS3` from api-core

**Reuse compliance**:
- Reused: `deleteFromS3`, `uploadToS3` from @repo/api-core
- New: `copyS3Object` in api-core
- Why new was necessary: No existing copy function; download+upload pattern needed

**Ports & adapters note**:
- What stayed in core: api-core S3 utilities (infrastructure-agnostic)
- What stayed in adapters: Storage adapter implementation

---

## Chunk 4 - WishlistService markAsPurchased Method

**Objective (maps to AC 2, 6, 20, 21, 22, 23)**: Implement core purchase business logic

**Files changed**:
- `apps/api/lego-api/domains/wishlist/application/services.ts`

**Summary of changes**:
- Added `setsService` to `WishlistServiceDeps` (optional dependency)
- Implemented `markAsPurchased` method with transaction semantics:
  1. Fetch and verify ownership (AC 22, 23)
  2. Build Set input from wishlist item + purchase data
  3. Create Set item (point of no return)
  4. Copy image (best effort, AC 21)
  5. Delete wishlist item if requested (best effort, AC 6)
- Data loss prevention: Never delete Wishlist before Set creation succeeds (AC 20)

**Reuse compliance**:
- Reused: Result type pattern, SetsService interface
- New: markAsPurchased method
- Why new was necessary: New cross-domain transaction logic

**Ports & adapters note**:
- What stayed in core: Business logic in service layer
- What stayed in adapters: Dependency injection at route level

---

## Chunk 5 - POST /:id/purchased Route

**Objective (maps to AC 2)**: Wire up HTTP endpoint

**Files changed**:
- `apps/api/lego-api/domains/wishlist/routes.ts`

**Summary of changes**:
- Imported Sets domain dependencies for cross-domain composition
- Created SetsService instance for injection into WishlistService
- Added `POST /:id/purchased` route with:
  - Zod validation using `MarkAsPurchasedInputSchema`
  - Proper HTTP status codes: 201 (success), 400 (validation), 403 (forbidden), 404 (not found), 500 (error)
  - Returns created Set item on success

**Reuse compliance**:
- Reused: Existing route patterns, Hono framework
- New: Route handler
- Why new was necessary: New endpoint required

**Ports & adapters note**:
- What stayed in core: Service business logic
- What stayed in adapters: Route handler (thin adapter, ~25 lines)

---

## Chunk 6 - Fix Existing Tests

**Objective**: Update existing tests for new port interface

**Files changed**:
- `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts`

**Summary of changes**:
- Added `createMockImageStorage` helper function
- Updated all mock image storage objects to include new methods
- Fixed type errors from interface changes

**Reuse compliance**:
- Reused: Existing test patterns
- New: Mock helper function
- Why new was necessary: Interface changed, tests needed updating

---

## Chunk 7 - Purchase Unit Tests

**Objective (maps to AC 2, 6, 16, 20, 21, 22, 23)**: Comprehensive test coverage

**Files changed**:
- `apps/api/lego-api/domains/wishlist/__tests__/purchase.test.ts` (new)

**Summary of changes**:
- Created 18 unit tests covering:
  - Happy path (8 tests): Create Set, delete wishlist, keep wishlist, copy image, etc.
  - Transaction logic (3 tests): Set failure prevents deletion, warning on failures
  - Authorization (2 tests): FORBIDDEN for wrong user, NOT_FOUND for missing item
  - Edge cases (5 tests): No image, quantity > 1, no setsService, custom date, null key

**Reuse compliance**:
- Reused: Vitest, mock patterns from services.test.ts
- New: Test file
- Why new was necessary: New feature needs test coverage

---

## Chunk 8 - HTTP Test File

**Objective**: Manual endpoint testing

**Files changed**:
- `__http__/wishlist-purchase.http` (new)

**Summary of changes**:
- Created HTTP file with test cases for:
  - Happy path (4 requests)
  - Validation errors (6 requests)
  - Error responses (2 requests)
  - Price format tests (5 requests)

**Reuse compliance**:
- Reused: HTTP file format from other __http__ files
- New: Test file
- Why new was necessary: New endpoint needs manual testing capability

---

## Commands Run

```bash
pnpm tsc --noEmit -p apps/api/lego-api/tsconfig.json  # Type check - passed
pnpm vitest run apps/api/lego-api/domains/wishlist    # 63 tests passed
```

---

## Notes / Risks

1. **Cross-domain dependency**: Wishlist routes now import Sets domain. This is intentional for the purchase flow but creates coupling.

2. **Image copy strategy**: Using download+re-upload pattern. Works reliably but has network overhead. Acceptable for single-image operations.

3. **Transaction semantics**: Using eventual consistency with best-effort cleanup. This is a deliberate design choice per SCOPE.md.

4. **Error handling**: Warnings logged for non-critical failures (image copy, wishlist deletion) but operation continues. Set creation is the critical path.

---

## Worker Token Summary

- Input: ~8,000 tokens (story files, existing services, types, routes, ports, adapters, tests)
- Output: ~6,500 tokens (modified files + new tests + http file)

---

## BACKEND COMPLETE
