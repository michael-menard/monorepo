---
doc_type: story
story_id: STORY-0005
title: "Wishlist - Write Operations (No Images)"
status: ready
created_at: "2026-01-18T20:49:00-07:00"
tags:
  - wishlist
  - vercel
  - api
  - mutations
---

# STORY-0005: Wishlist - Write Operations (No Images)

## 1. Context

STORY-004 delivered wishlist read operations (list, get, search). This story completes the wishlist CRUD functionality by implementing write operations: create, update, delete, and reorder.

These endpoints are part of the Vercel migration, providing wishlist mutation capabilities without image upload handling (image uploads are deferred to STORY-009).

The implementation follows the established ports/adapters pattern from `wishlist-core` and matches the create pattern from `sets-core`.

## 2. Goal

Enable authenticated users to create, update, delete, and reorder wishlist items through the Vercel API, maintaining the platform-agnostic architecture established in STORY-004.

## 3. Non-Goals

- Image upload for wishlist items (STORY-009)
- Frontend UI integration (future story)
- Linking wishlist items to sets (future story)
- Optimistic locking or conflict resolution
- Bulk create/delete operations
- Soft delete / trash functionality

## 4. Scope

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wishlist` | Create new wishlist item |
| PUT | `/api/wishlist/:id` | Update existing wishlist item |
| DELETE | `/api/wishlist/:id` | Delete wishlist item |
| PATCH | `/api/wishlist/reorder` | Bulk update sortOrder for items |

### Packages/Apps Affected

| Location | Changes |
|----------|---------|
| `packages/backend/wishlist-core/src/` | 4 new core functions |
| `packages/backend/wishlist-core/src/__types__/` | Add input schemas |
| `packages/backend/wishlist-core/src/__tests__/` | 4 new test files |
| `apps/api/platforms/vercel/api/wishlist/` | 4 new endpoint files |
| `__http__/wishlist.http` | Add write operation tests |

## 5. Acceptance Criteria

### AC-1: Create Wishlist Item
- [ ] `POST /api/wishlist` accepts JSON body with `title` (required) and `store` (required)
- [ ] Server generates UUID for `id` field
- [ ] Server sets `createdAt` and `updatedAt` to current timestamp
- [ ] Server calculates `sortOrder` as `MAX(sortOrder) + 1` for the user (or 0 if first item)
- [ ] Returns 201 Created with full item in response body
- [ ] Returns 400 Bad Request if required fields missing
- [ ] Returns 401 Unauthorized if not authenticated

### AC-2: Update Wishlist Item
- [ ] `PUT /api/wishlist/:id` accepts partial JSON body (patch semantics)
- [ ] Only provided fields are updated; unspecified fields unchanged
- [ ] `updatedAt` is set to current timestamp on any update
- [ ] `createdAt` is never modified
- [ ] Returns 200 OK with updated item in response body
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] Returns 404 Not Found if item doesn't exist
- [ ] Returns 403 Forbidden if item belongs to different user
- [ ] Returns 401 Unauthorized if not authenticated

### AC-3: Delete Wishlist Item
- [ ] `DELETE /api/wishlist/:id` removes the item from database
- [ ] Returns 200 OK with `{ success: true }` on successful deletion
- [ ] Returns 400 Bad Request for invalid UUID format
- [ ] Returns 404 Not Found if item doesn't exist
- [ ] Returns 403 Forbidden if item belongs to different user
- [ ] Returns 401 Unauthorized if not authenticated

### AC-4: Reorder Wishlist Items
- [ ] `PATCH /api/wishlist/reorder` accepts `{ items: [{ id, sortOrder }] }`
- [ ] Updates `sortOrder` for each item in the array
- [ ] Validates all item IDs exist and belong to authenticated user
- [ ] Returns 200 OK with `{ success: true, updated: number }` on success
- [ ] Returns 400 Bad Request if items array is empty or invalid
- [ ] Returns 400 Bad Request if any item ID is invalid UUID
- [ ] Returns 403 Forbidden if any item belongs to different user
- [ ] Returns 401 Unauthorized if not authenticated

### AC-5: Validation Rules
- [ ] `title`: Required, non-empty string
- [ ] `store`: Required, non-empty string (free text, not enum)
- [ ] `priority`: Optional integer 0-5 inclusive, defaults to 0
- [ ] `price`: Optional string, no format validation
- [ ] `currency`: Optional string, defaults to "USD"
- [ ] `pieceCount`: Optional positive integer
- [ ] `releaseDate`: Optional ISO 8601 date string
- [ ] `tags`: Optional array of strings
- [ ] `notes`: Optional string
- [ ] `setNumber`: Optional string
- [ ] `sourceUrl`: Optional string

### AC-6: Testing & Evidence
- [ ] Unit tests pass for all core functions
- [ ] All `.http` requests execute successfully
- [ ] Evidence captured in `proof.md`

## 6. Reuse Plan

### Packages to Reuse

| Package | Usage |
|---------|-------|
| `@repo/logger` | Logging in core functions and endpoints |
| `drizzle-orm` | Database operations (insert, update, delete) |
| `zod` | Input validation schemas |
| `pg` | PostgreSQL connection pool |

### Patterns to Reuse

| Pattern | Source | Usage |
|---------|--------|-------|
| DB client interface | `wishlist-core/list-wishlist-items.ts` | Dependency injection |
| Discriminated union result | `sets-core/create-set.ts` | Error handling |
| Vercel endpoint structure | `wishlist/list.ts` | HTTP adapter |
| Auth bypass pattern | `wishlist/list.ts` | Local dev auth |

### No New Packages Required

All capabilities exist in current dependencies.

## 7. Architecture Notes (Ports & Adapters)

### Core Layer (Port Definition)

```typescript
// packages/backend/wishlist-core/src/create-wishlist-item.ts

export interface CreateWishlistDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<WishlistRow[]>
    }
  }
  select: (fields: unknown) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ max: number | null }>>
    }
  }
}

export type CreateWishlistResult =
  | { success: true; data: WishlistItem }
  | { success: false; error: 'VALIDATION_ERROR' | 'DB_ERROR'; message: string }
```

### Adapter Layer (Vercel)

```typescript
// apps/api/platforms/vercel/api/wishlist/create.ts

// Wires:
// - VercelRequest/Response to HTTP layer
// - Drizzle db client to core function
// - getAuthUserId() for authentication
// - Response transformation to JSON
```

### Data Flow

```
Client Request
      │
      ▼
┌──────────────────┐
│ Vercel Endpoint  │  ← Adapter (HTTP + Auth)
│ create.ts        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Core Function    │  ← Port (business logic)
│ createWishlist() │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Drizzle DB       │  ← Infrastructure
│ PostgreSQL       │
└──────────────────┘
```

## 8. Required Vercel / Infra Notes

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_BYPASS` | Dev only | Set to "true" for local dev |
| `DEV_USER_SUB` | Dev only | Override user ID when AUTH_BYPASS=true |

### Vercel Configuration

No changes required. New endpoints follow existing file-based routing pattern.

### Database

No migrations required. `wishlist_items` table exists with all needed columns.

## 9. HTTP Contract Plan

### Required `.http` Requests

All requests must be added to `/__http__/wishlist.http`:

#### Create Operations
- `createWishlistItem` — POST with required fields
- `createWishlistItemFull` — POST with all optional fields
- `createWishlistItemMissingTitle` — 400 error case
- `createWishlistItemMissingStore` — 400 error case

#### Update Operations
- `updateWishlistItem` — PUT with partial update
- `updateWishlistItemNotFound` — 404 error case
- `updateWishlistItemForbidden` — 403 error case (use ID `11111111-1111-1111-1111-111111111004`)
- `updateWishlistItemInvalidId` — 400 error case

#### Delete Operations
- `deleteWishlistItem` — DELETE existing item
- `deleteWishlistItemNotFound` — 404 error case
- `deleteWishlistItemForbidden` — 403 error case
- `deleteWishlistItemInvalidId` — 400 error case

#### Reorder Operations
- `reorderWishlistItems` — PATCH with valid items
- `reorderWishlistItemsEmpty` — 400 error case

### Evidence Requirements

- Each `.http` request must be executed
- Response status code and body captured
- Proof saved in `plans/stories/story-0005/_dev/proof.md`

## 10. Seed Requirements

### Existing Seed Data (Sufficient)

The existing seed at `apps/api/core/database/seeds/wishlist.ts` provides:

| ID | User | Title | Purpose |
|----|------|-------|---------|
| `11111111-1111-1111-1111-111111111001` | dev-user | Millennium Falcon | Happy path tests |
| `11111111-1111-1111-1111-111111111002` | dev-user | Hogwarts Castle | Reorder tests |
| `11111111-1111-1111-1111-111111111003` | dev-user | Tower Bridge | Reorder tests |
| `11111111-1111-1111-1111-111111111004` | other-user | Other User Item | Forbidden tests |

### Seed Execution

```bash
pnpm seed
```

Seed is idempotent (uses `ON CONFLICT DO UPDATE`).

### No New Seed Data Required

Existing seed data is sufficient for all test cases.

## 11. Test Plan (Happy Path / Error Cases / Edge Cases)

### Create Item

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Required fields only | `{ "title": "Test", "store": "LEGO" }` | 201, item with generated id/sortOrder |
| All fields | Full payload | 201, all fields persisted |
| sortOrder calculation | Create when user has 3 items | sortOrder = 3 |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Missing title | `{ "store": "LEGO" }` | 400 |
| Missing store | `{ "title": "Test" }` | 400 |
| Invalid priority | `{ "title": "Test", "store": "LEGO", "priority": 10 }` | 400 |
| No auth | No token | 401 |

#### Edge Cases
| Test | Input | Expected |
|------|-------|----------|
| Empty tags | `{ "title": "Test", "store": "LEGO", "tags": [] }` | 201 |
| Unicode title | `{ "title": "日本語", "store": "LEGO" }` | 201 |

### Update Item

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Single field | `{ "title": "Updated" }` | 200, only title changed |
| Multiple fields | `{ "title": "New", "priority": 5 }` | 200 |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Not found | PUT to nonexistent ID | 404 |
| Other user's item | PUT to `...111004` | 403 |
| Invalid UUID | PUT to `not-a-uuid` | 400 |

### Delete Item

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Delete existing | DELETE owned item | 200 |
| Verify deleted | GET after delete | 404 |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Not found | DELETE nonexistent | 404 |
| Other user's item | DELETE `...111004` | 403 |
| Invalid UUID | DELETE `not-a-uuid` | 400 |

### Reorder Items

#### Happy Path
| Test | Input | Expected |
|------|-------|----------|
| Swap two items | `{ items: [{id: A, sortOrder: 1}, {id: B, sortOrder: 0}] }` | 200 |
| Verify order | GET list after reorder | Items in new order |

#### Error Cases
| Test | Input | Expected |
|------|-------|----------|
| Empty array | `{ items: [] }` | 400 |
| Invalid ID | `{ items: [{id: "bad", sortOrder: 0}] }` | 400 |
| Other user's item | Include `...111004` | 403 |

### Evidence Requirements

- All `.http` requests executed with responses captured
- Unit test output included
- Proof document at `plans/stories/story-0005/_dev/proof.md`

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-18T20:49:00-07:00 | PM | Generated story from index with sub-agent artifacts | `story-0005.20260118-2049.md`, `_pm/TEST-PLAN.md`, `_pm/UIUX-NOTES.md`, `_pm/DEV-FEASIBILITY.md`, `_pm/BLOCKERS.md` |
