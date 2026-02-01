# Implementation Plan - WISH-2010

## Overview

This story pivots from "create schemas from scratch" to "schema alignment and documentation" based on QA discovery that schemas already exist in the codebase.

## Key Discovery

All required schemas already exist in `packages/core/api-client/src/schemas/wishlist.ts` with:
- 54+ passing tests
- Alignment with WISH-2000 database schema (title, priority 0-5, store enum)
- Proper Zod validation patterns

## Implementation Steps

### Step 1: Add JSDoc Documentation to Schemas (AC13)

**File**: `packages/core/api-client/src/schemas/wishlist.ts`

Add JSDoc comments to all public schemas:

```typescript
/**
 * Store/retailer enum schema for wishlist items.
 * Matches the `wishlist_store` PostgreSQL enum from WISH-2000.
 */
export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])

/**
 * Currency enum schema for wishlist pricing.
 * Matches the `wishlist_currency` PostgreSQL enum from WISH-2000.
 */
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])

/**
 * Complete wishlist item schema matching the database structure.
 * Use for API responses and database result validation.
 */
export const WishlistItemSchema = ...

/**
 * Schema for creating new wishlist items.
 * Omits server-generated fields (id, userId, sortOrder, timestamps, audit fields).
 */
export const CreateWishlistItemSchema = ...

/**
 * Schema for updating existing wishlist items.
 * All fields are optional for partial updates.
 */
export const UpdateWishlistItemSchema = ...

/**
 * Query parameters schema for listing wishlist items.
 * Supports search, filtering, sorting, and pagination.
 */
export const WishlistQueryParamsSchema = ...

/**
 * Schema for batch reordering wishlist items via drag-and-drop.
 * Used by PUT /api/wishlist/reorder endpoint.
 */
export const BatchReorderSchema = ...

/**
 * Schema for marking a wishlist item as purchased.
 * Creates a Set item and optionally removes from wishlist.
 */
export const MarkAsPurchasedInputSchema = ...
```

### Step 2: Export Additional Schemas from index.ts (AC7)

**File**: `packages/core/api-client/src/schemas/index.ts`

Add missing exports:

```typescript
// Additional wishlist schemas for complete coverage
export {
  // ... existing exports ...

  // Response schemas
  ReorderResponseSchema,

  // Presign schemas
  PresignRequestSchema,
  PresignResponseSchema,

  // Purchase schemas
  MarkAsPurchasedInputSchema,
  GotItFormSchema,
  SetItemSchema,

  // Types
  type ReorderResponse,
  type PresignRequest,
  type PresignResponse,
  type MarkAsPurchasedInput,
  type GotItFormValues,
  type SetItem,
} from './wishlist'
```

### Step 3: Update Backend to Import from @repo/api-client (AC8)

**File**: `apps/api/lego-api/domains/wishlist/types.ts`

Replace duplicate schema definitions with imports:

```typescript
/**
 * Wishlist Domain Types
 *
 * Re-exports shared schemas from @repo/api-client for type consistency.
 * Backend-specific schemas (error types, internal types) remain here.
 */

// ─────────────────────────────────────────────────────────────────────────
// Shared Schemas (from @repo/api-client)
// ─────────────────────────────────────────────────────────────────────────

export {
  // Item schemas
  WishlistItemSchema,
  CreateWishlistItemSchema as CreateWishlistItemInputSchema,
  UpdateWishlistItemSchema as UpdateWishlistItemInputSchema,

  // Types
  type WishlistItem,
  type CreateWishlistItem as CreateWishlistItemInput,
  type UpdateWishlistItem as UpdateWishlistItemInput,

  // Query schemas
  WishlistQueryParamsSchema as ListWishlistQuerySchema,
  type WishlistQueryParams as ListWishlistQuery,

  // Reorder schemas
  BatchReorderSchema as ReorderWishlistInputSchema,
  type BatchReorder as ReorderWishlistInput,

  // Presign schemas
  PresignRequestSchema,
  PresignResponseSchema,
  type PresignRequest,
  type PresignResponse,

  // Purchase schemas
  MarkAsPurchasedInputSchema,
  type MarkAsPurchasedInput,
} from '@repo/api-client/schemas/wishlist'

// ─────────────────────────────────────────────────────────────────────────
// Backend-Specific Types (not in @repo/api-client)
// ─────────────────────────────────────────────────────────────────────────

// ... keep error types and any backend-specific schemas ...
```

### Step 4: Verify Type Compatibility

Run type checks to ensure no breaking changes:

```bash
pnpm --filter @repo/api-client check-types
pnpm --filter lego-api check-types
```

### Step 5: Run Existing Tests

Verify all 54+ tests still pass:

```bash
pnpm --filter @repo/api-client test
```

## Acceptance Criteria Verification

| AC | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| AC1 | WishlistItemSchema | DONE | Exists in wishlist.ts lines 23-59 |
| AC2 | CreateWishlistItemSchema | DONE | Exists in wishlist.ts lines 67-84 |
| AC3 | UpdateWishlistItemSchema | DONE | Exists in wishlist.ts lines 92-94 |
| AC4 | WishlistFilterSchema | DONE | WishlistQueryParamsSchema covers all fields |
| AC5 | ReorderItemsSchema | DONE | BatchReorderSchema in wishlist.ts lines 167-176 |
| AC6 | PurchaseItemSchema | DONE | MarkAsPurchasedInputSchema lines 215-267 |
| AC7 | Export from index.ts | IN-PROGRESS | Need to add more exports |
| AC8 | Backend imports | TODO | types.ts still has duplicates |
| AC9 | Frontend imports | DONE | Already using @repo/api-client |
| AC10-12 | Schema tests | DONE | 54+ tests in wishlist.test.ts |
| AC13 | JSDoc comments | TODO | Need to add |
| AC14 | README docs | DEFER | Low priority for MVP |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking backend compilation | Medium | Re-export with aliases to match existing names |
| Type mismatch | Low | Schemas are already aligned with database |
| Missing exports | Low | Comprehensive export list in plan |

## Estimated Effort

- Step 1 (JSDoc): 15 minutes
- Step 2 (Exports): 5 minutes
- Step 3 (Backend refactor): 20 minutes
- Step 4-5 (Verification): 10 minutes
- **Total**: ~50 minutes
