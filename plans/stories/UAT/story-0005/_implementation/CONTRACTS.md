# API CONTRACTS: STORY-005

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wishlist` | Create new wishlist item |
| PUT | `/api/wishlist/:id` | Update existing wishlist item |
| DELETE | `/api/wishlist/:id` | Delete wishlist item |
| PATCH | `/api/wishlist/reorder` | Bulk update sortOrder for items |

## Vercel Routing

Routes added to `apps/api/platforms/vercel/vercel.json`:
```json
{ "source": "/api/wishlist/reorder", "destination": "/api/wishlist/reorder.ts" },
{ "source": "/api/wishlist", "destination": "/api/wishlist/index.ts" }
```

## HTTP File Reference

All requests in `/__http__/wishlist.http`

## Executed Requests

### 1. CREATE - Required Fields (201)
**File:** `/__http__/wishlist.http`
**Request:** `createWishlistItem`
```http
POST http://localhost:3000/api/wishlist
Content-Type: application/json

{"title": "Test Create", "store": "LEGO"}
```
**Response:**
```json
{
  "id": "153a15cd-94ec-4593-91d2-1d607d65c7af",
  "userId": "dev-user-00000000-0000-0000-0000-000000000001",
  "title": "Test Create",
  "store": "LEGO",
  "currency": "USD",
  "priority": 0,
  "sortOrder": 4,
  "createdAt": "2026-01-19T04:08:24.721Z",
  "updatedAt": "2026-01-19T04:08:24.721Z"
}
```
**Timestamp:** 2026-01-19T04:08:24Z

### 2. CREATE - Missing Title (400)
**File:** `/__http__/wishlist.http`
**Request:** `createWishlistItemMissingTitle`
```http
POST http://localhost:3000/api/wishlist
Content-Type: application/json

{"store": "LEGO"}
```
**Response:**
```json
{"error":"Bad Request","message":"Invalid input: expected string, received undefined"}
```
**Timestamp:** 2026-01-19T04:08:25Z

### 3. UPDATE - Single Field (200)
**File:** `/__http__/wishlist.http`
**Request:** `updateWishlistItem`
```http
PUT http://localhost:3000/api/wishlist/11111111-1111-1111-1111-111111111001
Content-Type: application/json

{"title": "Updated Millennium Falcon"}
```
**Response:**
```json
{
  "id": "11111111-1111-1111-1111-111111111001",
  "title": "Updated Millennium Falcon",
  "updatedAt": "2026-01-19T04:08:27.316Z"
}
```
**Timestamp:** 2026-01-19T04:08:27Z

### 4. UPDATE - Not Found (404)
**File:** `/__http__/wishlist.http`
**Request:** `updateWishlistItemNotFound`
```http
PUT http://localhost:3000/api/wishlist/00000000-0000-0000-0000-000000000000
Content-Type: application/json

{"title": "Test"}
```
**Response:**
```json
{"error":"Not Found","message":"Wishlist item not found"}
```
**Timestamp:** 2026-01-19T04:08:28Z

### 5. UPDATE - Forbidden (403)
**File:** `/__http__/wishlist.http`
**Request:** `updateWishlistItemForbidden`
```http
PUT http://localhost:3000/api/wishlist/11111111-1111-1111-1111-111111111004
Content-Type: application/json

{"title": "Test"}
```
**Response:**
```json
{"error":"Forbidden","message":"You do not have permission to update this wishlist item"}
```
**Timestamp:** 2026-01-19T04:08:28Z

### 6. DELETE - Success (200)
**File:** `/__http__/wishlist.http`
**Request:** `deleteWishlistItem`
```http
DELETE http://localhost:3000/api/wishlist/346322ac-c34c-4021-aa1d-d0c8d3fbbfeb
```
**Response:**
```json
{"success":true}
```
**Timestamp:** 2026-01-19T04:08:30Z

### 7. DELETE - Not Found (404)
**File:** `/__http__/wishlist.http`
**Request:** `deleteWishlistItemNotFound`
```http
DELETE http://localhost:3000/api/wishlist/00000000-0000-0000-0000-000000000000
```
**Response:**
```json
{"error":"Not Found","message":"Wishlist item not found"}
```
**Timestamp:** 2026-01-19T04:08:31Z

### 8. REORDER - Success (200)
**File:** `/__http__/wishlist.http`
**Request:** `reorderWishlistItems`
```http
PATCH http://localhost:3000/api/wishlist/reorder
Content-Type: application/json

{
  "items": [
    {"id": "11111111-1111-1111-1111-111111111001", "sortOrder": 2},
    {"id": "11111111-1111-1111-1111-111111111002", "sortOrder": 0},
    {"id": "11111111-1111-1111-1111-111111111003", "sortOrder": 1}
  ]
}
```
**Response:**
```json
{"success":true,"updated":3}
```
**Timestamp:** 2026-01-19T04:08:33Z

### 9. REORDER - Empty Array (400)
**File:** `/__http__/wishlist.http`
**Request:** `reorderWishlistItemsEmpty`
```http
PATCH http://localhost:3000/api/wishlist/reorder
Content-Type: application/json

{"items": []}
```
**Response:**
```json
{"error":"Bad Request","message":"Items array cannot be empty"}
```
**Timestamp:** 2026-01-19T04:08:34Z
