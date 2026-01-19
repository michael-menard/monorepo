# IMPLEMENTATION-PLAN: STORY-005

## Scope Surface

| Area | Impacted |
|------|----------|
| Backend/API | Yes |
| Frontend/UI | No |
| Infra/Config | No |

## Acceptance Criteria Checklist

- [ ] AC-1: Create Wishlist Item
- [ ] AC-2: Update Wishlist Item
- [ ] AC-3: Delete Wishlist Item
- [ ] AC-4: Reorder Wishlist Items
- [ ] AC-5: Validation Rules
- [ ] AC-6: Testing & Evidence

## Files to Touch

### Core Package (`packages/backend/wishlist-core/src/`)

| File | Action |
|------|--------|
| `__types__/index.ts` | Add input schemas for create/update/reorder |
| `create-wishlist-item.ts` | New core function |
| `update-wishlist-item.ts` | New core function |
| `delete-wishlist-item.ts` | New core function |
| `reorder-wishlist-items.ts` | New core function |
| `index.ts` | Export new functions |
| `__tests__/create-wishlist-item.test.ts` | New test file |
| `__tests__/update-wishlist-item.test.ts` | New test file |
| `__tests__/delete-wishlist-item.test.ts` | New test file |
| `__tests__/reorder-wishlist-items.test.ts` | New test file |

### Vercel Endpoints (`apps/api/platforms/vercel/api/wishlist/`)

| File | Action |
|------|--------|
| `index.ts` | New - POST handler for create |
| `[id].ts` | Extend - Add PUT and DELETE via method dispatch |
| `reorder.ts` | New - PATCH handler for reorder |

### HTTP Contract (`__http__/`)

| File | Action |
|------|--------|
| `wishlist.http` | Add write operation tests |

## Reuse Targets

| Package/Pattern | From | Usage |
|-----------------|------|-------|
| `@repo/logger` | Existing | Logging |
| Discriminated union result | `sets-core/create-set.ts` | Error handling |
| DB client interface | `wishlist-core/list-wishlist-items.ts` | DI pattern |
| Vercel endpoint structure | `wishlist/[id].ts` | HTTP adapter |
| Auth bypass pattern | `wishlist/list.ts` | Local dev auth |

## Ports & Adapters Boundaries

```
┌────────────────────────────────────────────────────────────────┐
│                     Vercel Endpoints (Adapter)                  │
│  - index.ts (POST /api/wishlist)                               │
│  - [id].ts (GET/PUT/DELETE /api/wishlist/:id)                  │
│  - reorder.ts (PATCH /api/wishlist/reorder)                    │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                     Core Functions (Port)                       │
│  - createWishlistItem(db, schema, userId, input)               │
│  - updateWishlistItem(db, schema, userId, itemId, input)       │
│  - deleteWishlistItem(db, schema, userId, itemId)              │
│  - reorderWishlistItems(db, schema, userId, items)             │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                     Database (Infrastructure)                   │
│  - Drizzle ORM                                                 │
│  - PostgreSQL (wishlist_items table)                           │
└────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Plan

### Phase 1: Core Types (prerequisite)
1. Add `CreateWishlistInputSchema` to `__types__/index.ts`
2. Add `UpdateWishlistInputSchema` to `__types__/index.ts`
3. Add `ReorderWishlistInputSchema` to `__types__/index.ts`

### Phase 2: Core Functions
1. Implement `create-wishlist-item.ts`
2. Implement `update-wishlist-item.ts`
3. Implement `delete-wishlist-item.ts`
4. Implement `reorder-wishlist-items.ts`
5. Update `index.ts` exports

### Phase 3: Tests
1. Write tests for create function
2. Write tests for update function
3. Write tests for delete function
4. Write tests for reorder function

### Phase 4: Vercel Endpoints
1. Create `index.ts` for POST /api/wishlist
2. Extend `[id].ts` to handle PUT and DELETE
3. Create `reorder.ts` for PATCH /api/wishlist/reorder

### Phase 5: HTTP Contracts
1. Add create operation tests to `wishlist.http`
2. Add update operation tests to `wishlist.http`
3. Add delete operation tests to `wishlist.http`
4. Add reorder operation tests to `wishlist.http`

## Test Plan

### Commands to Run

```bash
# Type check
pnpm check-types

# Lint touched files
pnpm lint packages/backend/wishlist-core/src/ apps/api/platforms/vercel/api/wishlist/

# Unit tests
pnpm test packages/backend/wishlist-core

# Integration via .http
# Execute all .http requests in __http__/wishlist.http
```

## Stop Conditions

- Cannot connect to database
- Schema mismatch between code and actual DB
- Test failures that cannot be resolved
- Port/service conflicts
