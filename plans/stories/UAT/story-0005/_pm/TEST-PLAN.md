# TEST PLAN — STORY-0005: Wishlist Write Operations

## Overview

This test plan covers the four wishlist mutation endpoints:
1. `POST /api/wishlist` — Create Item
2. `PUT /api/wishlist/:id` — Update Item
3. `DELETE /api/wishlist/:id` — Delete Item
4. `PATCH /api/wishlist/reorder` — Reorder Items

---

## 1. Create Item (`POST /api/wishlist`)

### Happy Path

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Create with required fields only | `{ "title": "Test Set", "store": "LEGO" }` | 201 Created, returns item with generated `id`, `sortOrder`, `createdAt`, `updatedAt` | `.http` response |
| Create with all optional fields | Full payload with `setNumber`, `sourceUrl`, `price`, `currency`, `pieceCount`, `releaseDate`, `tags`, `priority`, `notes` | 201 Created, all fields persisted | `.http` response |
| Create assigns correct userId | Create item, then GET it | `userId` matches authenticated user | `.http` response |
| Create generates unique UUID | Create two items | Both have different `id` values | `.http` response |
| Create sets correct sortOrder | Create item when user has 3 existing items | `sortOrder` = 3 (next in sequence) | `.http` response |

### Error Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Missing required `title` | `{ "store": "LEGO" }` | 400 Bad Request, validation error | `.http` response |
| Missing required `store` | `{ "title": "Test" }` | 400 Bad Request, validation error | `.http` response |
| Invalid `store` value | `{ "title": "Test", "store": "InvalidStore" }` | 400 Bad Request (if enum enforced) OR 201 (if free text) | `.http` response |
| Invalid `priority` range | `{ "title": "Test", "store": "LEGO", "priority": 10 }` | 400 Bad Request (priority must be 0-5) | `.http` response |
| Invalid `releaseDate` format | `{ "title": "Test", "store": "LEGO", "releaseDate": "not-a-date" }` | 400 Bad Request | `.http` response |
| Unauthenticated request | No auth token | 401 Unauthorized | `.http` response |
| Invalid JSON body | `{invalid json}` | 400 Bad Request | `.http` response |

### Edge Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Empty `tags` array | `{ "title": "Test", "store": "LEGO", "tags": [] }` | 201 Created, `tags` = [] | `.http` response |
| `price` as string with decimals | `{ "title": "Test", "store": "LEGO", "price": "199.99" }` | 201 Created, price preserved | `.http` response |
| Unicode in title | `{ "title": "日本語セット", "store": "LEGO" }` | 201 Created, Unicode preserved | `.http` response |
| Very long notes | `{ "title": "Test", "store": "LEGO", "notes": "..." }` (10000 chars) | 201 Created OR 400 if length limit | `.http` response |

---

## 2. Update Item (`PUT /api/wishlist/:id`)

### Happy Path

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Update single field | `{ "title": "Updated Title" }` | 200 OK, only `title` and `updatedAt` changed | `.http` response |
| Update multiple fields | `{ "title": "New", "priority": 5, "notes": "Updated" }` | 200 OK, all specified fields updated | `.http` response |
| Update does not change `createdAt` | Update any field | `createdAt` unchanged, `updatedAt` updated | `.http` response |
| Update preserves unspecified fields | Update `title` only | Other fields like `store`, `price` unchanged | `.http` response |

### Error Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Update non-existent item | PUT to `/api/wishlist/00000000-0000-0000-0000-000000000000` | 404 Not Found | `.http` response |
| Update other user's item | PUT to item owned by different user | 403 Forbidden | `.http` response |
| Invalid UUID format | PUT to `/api/wishlist/not-a-uuid` | 400 Bad Request | `.http` response |
| Invalid field values | `{ "priority": 100 }` | 400 Bad Request | `.http` response |
| Empty request body | `{}` | 400 Bad Request OR 200 (no-op) | `.http` response |
| Unauthenticated request | No auth token | 401 Unauthorized | `.http` response |

### Edge Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Set nullable field to null | `{ "notes": null }` | 200 OK, `notes` = null | `.http` response |
| Update `sortOrder` directly | `{ "sortOrder": 99 }` | 200 OK (or 400 if not allowed) | `.http` response |
| Concurrent updates | Two simultaneous updates | Both succeed, last-write-wins | Manual test |

---

## 3. Delete Item (`DELETE /api/wishlist/:id`)

### Happy Path

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Delete existing item | DELETE to valid owned item | 200 OK (or 204 No Content) | `.http` response |
| Deleted item no longer retrievable | GET after DELETE | 404 Not Found | `.http` response |
| Delete does not affect other items | List items after delete | Other items unchanged | `.http` response |

### Error Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Delete non-existent item | DELETE to `/api/wishlist/00000000-0000-0000-0000-000000000000` | 404 Not Found | `.http` response |
| Delete other user's item | DELETE to item owned by different user | 403 Forbidden | `.http` response |
| Invalid UUID format | DELETE to `/api/wishlist/not-a-uuid` | 400 Bad Request | `.http` response |
| Unauthenticated request | No auth token | 401 Unauthorized | `.http` response |

### Edge Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Delete already deleted item | DELETE same item twice | 404 Not Found on second attempt | `.http` response |
| Delete item then create with same title | Delete, then create new | New item has different ID | `.http` response |

---

## 4. Reorder Items (`PATCH /api/wishlist/reorder`)

### Happy Path

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Reorder two items | `{ "items": [{ "id": "...", "sortOrder": 1 }, { "id": "...", "sortOrder": 0 }] }` | 200 OK, sortOrders swapped | `.http` response + list verification |
| Reorder all items | Full list with new order | 200 OK, all sortOrders updated | `.http` response |
| Verify list reflects new order | GET list after reorder | Items returned in new sortOrder | `.http` response |

### Error Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Reorder with non-existent item | Include ID that doesn't exist | 400 Bad Request or partial success | `.http` response |
| Reorder other user's item | Include item owned by different user | 403 Forbidden (or filtered out) | `.http` response |
| Empty items array | `{ "items": [] }` | 400 Bad Request or 200 (no-op) | `.http` response |
| Duplicate sortOrder values | Two items with same sortOrder | 400 Bad Request or server normalizes | `.http` response |
| Invalid UUID in items | `{ "items": [{ "id": "bad", "sortOrder": 0 }] }` | 400 Bad Request | `.http` response |
| Unauthenticated request | No auth token | 401 Unauthorized | `.http` response |

### Edge Cases

| Test Case | Input | Expected Output | Evidence |
|-----------|-------|-----------------|----------|
| Reorder single item | `{ "items": [{ "id": "...", "sortOrder": 0 }] }` | 200 OK | `.http` response |
| Large sortOrder values | `{ "items": [{ "id": "...", "sortOrder": 999999 }] }` | 200 OK, value preserved | `.http` response |
| Negative sortOrder | `{ "items": [{ "id": "...", "sortOrder": -1 }] }` | 400 Bad Request | `.http` response |

---

## Evidence Requirements

### Required `.http` Requests (to be added to `/__http__/wishlist.http`)

1. **Create Operations**
   - `createWishlistItem` — Create with required fields
   - `createWishlistItemFull` — Create with all fields
   - `createWishlistItemMissingTitle` — 400 validation error
   - `createWishlistItemMissingStore` — 400 validation error

2. **Update Operations**
   - `updateWishlistItem` — Update single field
   - `updateWishlistItemMultiple` — Update multiple fields
   - `updateWishlistItemNotFound` — 404 error
   - `updateWishlistItemForbidden` — 403 error
   - `updateWishlistItemInvalidId` — 400 error

3. **Delete Operations**
   - `deleteWishlistItem` — Delete existing item
   - `deleteWishlistItemNotFound` — 404 error
   - `deleteWishlistItemForbidden` — 403 error
   - `deleteWishlistItemInvalidId` — 400 error

4. **Reorder Operations**
   - `reorderWishlistItems` — Basic reorder
   - `reorderWishlistItemsEmpty` — Empty array
   - `reorderWishlistItemsInvalid` — Invalid item

### Unit Test Coverage

Each core function in `packages/backend/wishlist-core/` must have:
- Happy path test
- Error case tests (NOT_FOUND, FORBIDDEN, DB_ERROR)
- Edge case tests for nullable fields

### Manual Demo Script

1. Start local dev: `pnpm dev` (or `vercel dev`)
2. Ensure `AUTH_BYPASS=true` and `pnpm seed` completed
3. Execute `.http` requests in sequence:
   - List items (verify seed data)
   - Create new item (verify 201)
   - Get created item (verify persistence)
   - Update item (verify changes)
   - Reorder items (verify sort)
   - List items (verify order)
   - Delete item (verify 200/204)
   - Get deleted item (verify 404)
