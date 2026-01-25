# HTTP Response Evidence - STORY-004

**Captured:** 2026-01-18T20:40:00-07:00
**Server:** http://localhost:3000 (Vercel Dev)
**Auth:** AUTH_BYPASS=true

---

## GET /api/wishlist/list

**Status:** 200 OK

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111003",
      "userId": "dev-user-00000000-0000-0000-0000-000000000001",
      "title": "Tower Bridge",
      "store": "Amazon",
      "setNumber": "10214",
      "sourceUrl": "https://www.amazon.com/dp/B00F9Z29FI",
      "imageUrl": null,
      "price": "299.99",
      "currency": "USD",
      "pieceCount": 4287,
      "releaseDate": "2010-09-30T18:00:00.000Z",
      "tags": ["Creator Expert", "Architecture", "London"],
      "priority": 2,
      "notes": null,
      "sortOrder": 2,
      "createdAt": "2026-01-19T03:32:12.671Z",
      "updatedAt": "2026-01-19T03:32:12.671Z"
    },
    {
      "id": "11111111-1111-1111-1111-111111111002",
      "userId": "dev-user-00000000-0000-0000-0000-000000000001",
      "title": "Hogwarts Castle",
      "store": "LEGO",
      "setNumber": "71043",
      "sourceUrl": "https://www.lego.com/en-us/product/hogwarts-castle-71043",
      "imageUrl": null,
      "price": "469.99",
      "currency": "USD",
      "pieceCount": 6020,
      "releaseDate": "2018-08-31T18:00:00.000Z",
      "tags": ["Harry Potter", "Castle", "Display"],
      "priority": 4,
      "notes": "Wait for sale",
      "sortOrder": 1,
      "createdAt": "2026-01-19T03:32:12.664Z",
      "updatedAt": "2026-01-19T03:32:12.664Z"
    },
    {
      "id": "11111111-1111-1111-1111-111111111001",
      "userId": "dev-user-00000000-0000-0000-0000-000000000001",
      "title": "Millennium Falcon",
      "store": "LEGO",
      "setNumber": "75192",
      "sourceUrl": "https://www.lego.com/en-us/product/millennium-falcon-75192",
      "imageUrl": null,
      "price": "849.99",
      "currency": "USD",
      "pieceCount": 7541,
      "releaseDate": "2017-09-30T18:00:00.000Z",
      "tags": ["Star Wars", "UCS", "Display"],
      "priority": 5,
      "notes": "Ultimate dream set!",
      "sortOrder": 0,
      "createdAt": "2026-01-19T03:32:12.660Z",
      "updatedAt": "2026-01-19T03:32:12.660Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

## GET /api/wishlist/11111111-1111-1111-1111-111111111001

**Status:** 200 OK

```json
{
  "id": "11111111-1111-1111-1111-111111111001",
  "userId": "dev-user-00000000-0000-0000-0000-000000000001",
  "title": "Millennium Falcon",
  "store": "LEGO",
  "setNumber": "75192",
  "sourceUrl": "https://www.lego.com/en-us/product/millennium-falcon-75192",
  "imageUrl": null,
  "price": "849.99",
  "currency": "USD",
  "pieceCount": 7541,
  "releaseDate": "2017-09-30T18:00:00.000Z",
  "tags": ["Star Wars", "UCS", "Display"],
  "priority": 5,
  "notes": "Ultimate dream set!",
  "sortOrder": 0,
  "createdAt": "2026-01-19T03:32:12.660Z",
  "updatedAt": "2026-01-19T03:32:12.660Z"
}
```

---

## GET /api/wishlist/not-a-uuid (Invalid UUID)

**Status:** 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid item ID format"
}
```

---

## GET /api/wishlist/00000000-0000-0000-0000-000000000000 (Non-existent)

**Status:** 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Wishlist item not found"
}
```

---

## GET /api/wishlist/11111111-1111-1111-1111-111111111004 (Other User)

**Status:** 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this wishlist item"
}
```

---

## GET /api/wishlist/search?q=millennium

**Status:** 200 OK

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111001",
      "userId": "dev-user-00000000-0000-0000-0000-000000000001",
      "title": "Millennium Falcon",
      "store": "LEGO",
      "setNumber": "75192",
      "sourceUrl": "https://www.lego.com/en-us/product/millennium-falcon-75192",
      "imageUrl": null,
      "price": "849.99",
      "currency": "USD",
      "pieceCount": 7541,
      "releaseDate": "2017-09-30T18:00:00.000Z",
      "tags": ["Star Wars", "UCS", "Display"],
      "priority": 5,
      "notes": "Ultimate dream set!",
      "sortOrder": 0,
      "createdAt": "2026-01-19T03:32:12.660Z",
      "updatedAt": "2026-01-19T03:32:12.660Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## GET /api/wishlist/search?q=FALCON (Case Insensitive)

**Status:** 200 OK

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111001",
      "title": "Millennium Falcon",
      ...
    }
  ],
  "pagination": {"page": 1, "limit": 20, "total": 1, "totalPages": 1}
}
```

---

## GET /api/wishlist/search?q=castle (Partial Match)

**Status:** 200 OK

```json
{
  "items": [
    {
      "id": "11111111-1111-1111-1111-111111111002",
      "title": "Hogwarts Castle",
      ...
    }
  ],
  "pagination": {"page": 1, "limit": 20, "total": 1, "totalPages": 1}
}
```

---

## GET /api/wishlist/search?q=nonexistent (No Matches)

**Status:** 200 OK

```json
{
  "items": [],
  "pagination": {"page": 1, "limit": 20, "total": 0, "totalPages": 0}
}
```

---

## GET /api/wishlist/search?q= (Empty Query)

**Status:** 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Search query is required"
}
```

---

## GET /api/wishlist/search (Missing Query)

**Status:** 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Search query is required"
}
```
