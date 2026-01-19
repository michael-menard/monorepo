# STORY-003 API Contracts

## Endpoint: POST /api/sets

### Request

**Headers:**
- `Authorization: Bearer <JWT>` (required)
- `Content-Type: application/json` (required)

**Body (CreateSetSchema):**
```json
{
  "title": "string (required, min 1, max 200)",
  "setNumber": "string (optional, max 20)",
  "store": "string (optional, max 100)",
  "sourceUrl": "string (optional, valid URL)",
  "pieceCount": "number (optional, positive integer)",
  "releaseDate": "string (optional, ISO datetime)",
  "theme": "string (optional, max 50)",
  "tags": "string[] (optional, max 10 items, max 30 chars each)",
  "notes": "string (optional, max 2000)",
  "isBuilt": "boolean (optional, default false)",
  "quantity": "number (optional, positive integer, default 1)",
  "purchasePrice": "number (optional, positive)",
  "tax": "number (optional, non-negative)",
  "shipping": "number (optional, non-negative)",
  "purchaseDate": "string (optional, ISO datetime)"
}
```

### Response

**Success (201 Created):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "string",
  "setNumber": "string | null",
  "store": "string | null",
  "sourceUrl": "string | null",
  "pieceCount": "number | null",
  "releaseDate": "string | null",
  "theme": "string | null",
  "tags": "string[]",
  "notes": "string | null",
  "isBuilt": "boolean",
  "quantity": "number",
  "purchasePrice": "number | null",
  "tax": "number | null",
  "shipping": "number | null",
  "purchaseDate": "string | null",
  "wishlistItemId": "null",
  "images": "[]",
  "createdAt": "string (ISO datetime)",
  "updatedAt": "string (ISO datetime)"
}
```

**Response Headers:**
- `Location: /api/sets/{id}`
- `Access-Control-Allow-Origin: <origin>`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

**Error (400 Bad Request):**
```json
{
  "error": "Bad Request",
  "message": "Validation error details",
  "statusCode": 400
}
```

**Error (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token",
  "statusCode": 401
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to create set",
  "statusCode": 500
}
```

---

## Swagger Updates

**Note:** This codebase does not currently have a centralized OpenAPI/Swagger specification file. The API contracts are documented here and in the .http test files. Future stories may add formal OpenAPI documentation.

---

## .http Files

**File**: `requests/story-003-sets-create.http`

**Test Cases:**
1. Happy path - minimal create (title only)
2. Happy path - full create (all fields)
3. Validation error - missing title
4. Validation error - invalid URL
5. Validation error - negative numbers
5b. Validation error - negative price
6. Authentication error - no token
7. Authentication error - invalid token
8. CORS preflight
9. Empty body
10. Extra unknown fields
11. Title at max length
12. Title too long
13. Empty tags array
14. Maximum tags (10)
15. Too many tags (11)
16. Invalid date format
17. Non-array tags
18. Zero quantity
19. Method not allowed - GET
20. Method not allowed - PUT

---

## Test Execution

**Note:** .http tests require:
1. Running `vercel dev` in `apps/api/platforms/vercel`
2. Valid JWT token in `JWT_TOKEN` environment variable
3. Active database connection

Execution is performed via local development environment or REST client extension (VS Code REST Client, httpyac, etc.)
