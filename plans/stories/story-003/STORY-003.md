# STORY-003: Sets - Write Operations (No Images)

## Goal

Migrate the Sets create endpoint from AWS Lambda + API Gateway to Vercel serverless functions. This story extends the authenticated sets functionality established in STORY-002 with write operations, creating new set records in PostgreSQL without handling image uploads.

## Non-Goals

- **Not** migrating image upload endpoints (presign, register, delete)
- **Not** implementing update or delete operations for sets
- **Not** handling wishlist integration (wishlistItemId linking)
- **Not** implementing S3 operations
- **Not** deploying to production Vercel environment (local development only)
- **Not** modifying the frontend application

## Scope

### Endpoints to Migrate

**1. Create Set Endpoint**
- **Source:** `apps/api/platforms/aws/endpoints/sets/create/handler.ts`
- **Method:** POST
- **Route:** `/api/sets`
- **Target:** `apps/api/api/sets/index.ts` (Vercel function)
- **Current behavior:**
  - Validates user authentication via `getUserIdFromEvent`
  - Validates request body against `CreateSetSchema`
  - Creates new set record with userId from JWT
  - Returns created set with 201 status
  - Logs request/response via logger
- **Request fields (all optional except none):**
  - title (string, required)
  - setNumber (string, optional)
  - store (string, optional)
  - sourceUrl (string, optional, URL format)
  - pieceCount (number, optional, positive integer)
  - releaseDate (string, optional, ISO date)
  - theme (string, optional)
  - tags (string[], optional)
  - notes (string, optional)
  - isBuilt (boolean, optional, default false)
  - quantity (number, optional, default 1, positive integer)
  - purchasePrice (number, optional, positive)
  - tax (number, optional, positive)
  - shipping (number, optional, positive)
  - purchaseDate (string, optional, ISO date)
- **Response fields:** id, userId, title, setNumber, store, sourceUrl, pieceCount, releaseDate, theme, tags, notes, isBuilt, quantity, purchasePrice, tax, shipping, purchaseDate, wishlistItemId, images[], createdAt, updatedAt

### Core Business Logic to Extract

**Sets Core Logic (EXTEND):**
- Set creation with validation
- Set insertion into PostgreSQL
- Response shaping (conforming to `SetSchema`)

### In-Scope Packages

**Existing (REUSE):**
- `@repo/vercel-adapter` - Request/response transformation, `createVercelHandler()`, JWT auth middleware
- `@repo/lambda-auth` - `getUserIdFromEvent()` and auth validation
- `@repo/lambda-responses` - `successResponse`, `errorResponse`, `ValidationError`
- `@repo/logger` - Structured logging
- `@repo/api-client/schemas/sets` - `SetSchema`, `CreateSetSchema`
- `apps/api/core/database/client` - Drizzle database client
- `apps/api/core/database/schema` - Sets table definition
- `packages/backend/sets-core` - Platform-agnostic sets business logic (created in STORY-002)

**Extend:**
- `packages/backend/sets-core` - Add `createSet()` function

## Decisions

### D1: Handler File Location

**Decision:** Create POST handler at `apps/api/api/sets/index.ts`

**Rationale:** Following Next.js/Vercel conventions:
- `GET /api/sets/list` -> `apps/api/api/sets/list.ts`
- `GET /api/sets/:id` -> `apps/api/api/sets/[id].ts`
- `POST /api/sets` -> `apps/api/api/sets/index.ts`

The `index.ts` file handles the base `/api/sets` route for POST operations.

**Constraint:** Must export only `POST` method handler (no GET - list is separate file)

---

### D2: Request Body Validation

**Decision:** Use `CreateSetSchema` from `@repo/api-client/schemas/sets` for request validation

**Rationale:** Schema already exists and is used by frontend. Reusing ensures contract alignment.

**Validation rules:**
- `title`: Required, non-empty string
- `setNumber`: Optional string
- `store`: Optional string
- `sourceUrl`: Optional, valid URL format if provided
- `pieceCount`: Optional, positive integer if provided
- `releaseDate`: Optional, ISO date string if provided
- `purchaseDate`: Optional, ISO date string if provided
- `purchasePrice`, `tax`, `shipping`: Optional, positive numbers if provided
- `quantity`: Optional, positive integer, defaults to 1
- `isBuilt`: Optional boolean, defaults to false
- `tags`: Optional string array

**Constraint:** Return 400 with Zod validation errors if body fails validation

---

### D3: Generated Fields

**Decision:** Server generates the following fields:
- `id`: UUID v4 generated server-side
- `userId`: Extracted from JWT token
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp
- `images`: Empty array (no images at creation)
- `wishlistItemId`: null (linking deferred to future story)

**Rationale:** Security - clients cannot set userId or id. Consistency - timestamps are server-authoritative.

---

### D4: Response Status Code

**Decision:** Return 201 Created with full set object in response body

**Rationale:** REST convention for resource creation. Frontend expects full object for optimistic update reconciliation.

**Response headers:**
- `Location: /api/sets/{id}` (standard REST header for created resources)

---

### D5: Transaction Handling

**Decision:** Single INSERT operation, no transaction wrapper needed

**Rationale:** Creating a set is a single atomic INSERT. No related records are created in this story (images are separate). Transaction overhead not justified.

**Future consideration:** When image registration is added, transactions may be needed for multi-table operations.

---

### D6: Duplicate Detection

**Decision:** No duplicate detection for STORY-003

**Rationale:** Users may intentionally own multiple copies of the same set (different purchase dates, conditions, etc.). The combination of userId + setNumber does not need to be unique.

**Edge case:** If a user creates the same set twice with identical data, both records are created. This is acceptable behavior.

---

## Acceptance Criteria

### AC1: Create Set Vercel Function
- [ ] Vercel function created at `apps/api/api/sets/index.ts`
- [ ] Exports `POST` handler only (no GET export)
- [ ] Function validates JWT from Authorization header (reuses STORY-002 middleware)
- [ ] Returns 401 if no/invalid authentication token
- [ ] Returns 400 if request body fails `CreateSetSchema` validation
- [ ] Returns 400 with Zod error details for validation failures
- [ ] Creates set record in PostgreSQL with userId from JWT
- [ ] Generates UUID for set id server-side
- [ ] Returns 201 with created set data
- [ ] Response includes `Location` header with `/api/sets/{id}`
- [ ] Response validated against `SetSchema`
- [ ] Response includes empty `images[]` array
- [ ] Response includes `wishlistItemId: null`
- [ ] Logger outputs structured logs with userId, setId, request body (excluding sensitive fields)
- [ ] CORS headers included in response (including for OPTIONS preflight)
- [ ] Uses `successResponse` from `@repo/lambda-responses` for 201 response

### AC2: Core Business Logic Extension
- [ ] `packages/backend/sets-core` extended with `createSet()` function
- [ ] `createSet(db, userId, input)` function accepts validated input and returns created set
- [ ] Function generates UUID for id
- [ ] Function sets createdAt/updatedAt to current timestamp
- [ ] Function returns full set object matching `SetSchema`
- [ ] Core function has zero dependencies on AWS SDK, API Gateway, or Vercel types
- [ ] Unit tests for `createSet()` achieve 80% minimum coverage

### AC3: Request Validation
- [ ] Missing `title` field returns 400 with clear error message
- [ ] Invalid URL format for `sourceUrl` returns 400
- [ ] Negative `pieceCount` returns 400
- [ ] Negative `purchasePrice`, `tax`, `shipping` returns 400
- [ ] Invalid date format for `releaseDate`/`purchaseDate` returns 400
- [ ] Non-array `tags` field returns 400
- [ ] Extra unknown fields are stripped (not rejected)

### AC4: Local Development & Testing
- [ ] Function runs successfully via `vercel dev`
- [ ] Create set endpoint accessible at `http://localhost:3000/api/sets` (POST)
- [ ] `.http` test file created at `requests/story-003-sets-create.http`
- [ ] All test cases execute successfully
- [ ] `vercel.json` updated with POST route for `/api/sets`

### AC5: Logging & Observability
- [ ] All logs use `@repo/logger` with structured format
- [ ] Logs include: level, timestamp, requestId, stage, message, context
- [ ] Successful creates log userId, setId, title (not full body)
- [ ] Failed validations log error code, validation errors
- [ ] Authentication failures log reason

---

## Required Vercel Infrastructure

### Serverless Functions

**Function 1: Create Set**
- **File:** `apps/api/api/sets/index.ts`
- **Route:** `/api/sets`
- **Method:** POST
- **Auth:** Cognito JWT (via Authorization header)
- **Timeout:** 10 seconds
- **Memory:** 256 MB

### Environment Variables

**Required (existing from STORY-001 and STORY-002):**
```
# Database
DATABASE_URL=postgres://user:password@host:5432/dbname
STAGE=development

# Cognito Authentication
COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

No new environment variables required for STORY-003.

### Routing Configuration

**vercel.json updates:**
```json
{
  "routes": [
    { "src": "/api/health", "dest": "/api/health.ts" },
    { "src": "/api/config/upload", "dest": "/api/config/upload.ts" },
    { "src": "/api/sets/list", "dest": "/api/sets/list.ts" },
    { "src": "/api/sets", "methods": ["POST", "OPTIONS"], "dest": "/api/sets/index.ts" },
    { "src": "/api/sets/([^/]+)", "dest": "/api/sets/[id].ts" }
  ]
}
```

**Note:** The POST `/api/sets` route must be placed BEFORE the dynamic `/api/sets/([^/]+)` route to ensure correct matching. OPTIONS method included for CORS preflight.

---

## Reuse Plan

### Packages to Reuse

| Package | Usage | Verification |
|---------|-------|--------------|
| `@repo/vercel-adapter` | Request/response transformation, JWT auth middleware | Extended in STORY-002 with auth |
| `@repo/lambda-auth` | `getUserIdFromEvent()`, JWT claims extraction | Used in STORY-002 |
| `@repo/lambda-responses` | `successResponse`, `ValidationError` | Exports verified in STORY-001 |
| `@repo/logger` | Structured logging | Standard across all stories |
| `@repo/api-client/schemas/sets` | `CreateSetSchema`, `SetSchema` | Export verified in STORY-002 |
| `apps/api/core/database/client` | Drizzle database client | Used in STORY-002 |
| `apps/api/core/database/schema` | Sets table definition | Used in STORY-002 |
| `packages/backend/sets-core` | Platform-agnostic sets query logic | Created in STORY-002 |

### Packages to Extend

| Package | Extension |
|---------|-----------|
| `packages/backend/sets-core` | Add `createSet()` function |

### New Packages to Create

None. All required infrastructure exists from STORY-001 and STORY-002.

### Dependencies to Add

None. No new dependencies required.

---

## Local Testing Plan

### Setup

1. **Ensure environment configured from STORY-002:**
   ```bash
   cd apps/api
   # Verify .env.local has DATABASE_URL, COGNITO_* vars
   ```

2. **Obtain test JWT token:**
   ```bash
   # Login via frontend or use Cognito CLI to get access token
   ```

### Backend Testing (.http Execution - MANDATORY)

**Test file:** `requests/story-003-sets-create.http`

**Required test execution:**
```bash
# Using httpyac CLI
httpyac send requests/story-003-sets-create.http --all

# Or using VS Code REST Client extension
```

**Test coverage requirements:**

1. **Happy Path - Minimal Create**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer {{token}}
   Content-Type: application/json

   {
     "title": "Test Set"
   }

   # Expected: 201 Created with set data
   ```

2. **Happy Path - Full Create**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer {{token}}
   Content-Type: application/json

   {
     "title": "LEGO Star Wars Millennium Falcon",
     "setNumber": "75192",
     "store": "LEGO.com",
     "sourceUrl": "https://www.lego.com/product/75192",
     "pieceCount": 7541,
     "releaseDate": "2017-10-01",
     "theme": "Star Wars",
     "tags": ["UCS", "display", "retired"],
     "notes": "Ultimate Collector Series",
     "isBuilt": true,
     "quantity": 1,
     "purchasePrice": 799.99,
     "tax": 64.00,
     "shipping": 0,
     "purchaseDate": "2020-05-04"
   }

   # Expected: 201 Created with all fields populated
   ```

3. **Validation Error - Missing Title**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer {{token}}
   Content-Type: application/json

   {
     "setNumber": "12345"
   }

   # Expected: 400 with validation error for missing title
   ```

4. **Validation Error - Invalid URL**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer {{token}}
   Content-Type: application/json

   {
     "title": "Test Set",
     "sourceUrl": "not-a-valid-url"
   }

   # Expected: 400 with validation error for URL format
   ```

5. **Validation Error - Negative Numbers**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer {{token}}
   Content-Type: application/json

   {
     "title": "Test Set",
     "pieceCount": -100
   }

   # Expected: 400 with validation error
   ```

6. **Authentication Error - No Token**
   ```http
   POST http://localhost:3000/api/sets
   Content-Type: application/json

   {
     "title": "Test Set"
   }

   # Expected: 401 Unauthorized
   ```

7. **Authentication Error - Invalid Token**
   ```http
   POST http://localhost:3000/api/sets
   Authorization: Bearer invalid-token
   Content-Type: application/json

   {
     "title": "Test Set"
   }

   # Expected: 401 Unauthorized
   ```

8. **CORS Preflight**
   ```http
   OPTIONS http://localhost:3000/api/sets
   Origin: http://localhost:5173
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

   # Expected: 200/204 with CORS headers
   ```

### Unit Tests (Core Logic)

```bash
# Test sets-core package (including new createSet)
pnpm test packages/backend/sets-core

# Coverage requirement: 80% minimum
pnpm test packages/backend/sets-core -- --coverage
```

---

## Risks / Edge Cases

### Risk 1: UUID Collision
- **Issue:** Theoretically possible UUID v4 collision
- **Mitigation:** UUID v4 has 2^122 possible values; collision probability negligible
- **Edge case:** Database unique constraint would reject duplicate; retry with new UUID

### Risk 2: Date Parsing
- **Issue:** ISO date strings may have timezone issues
- **Mitigation:** Zod validates format; PostgreSQL stores as DATE type (no time component for releaseDate/purchaseDate)
- **Edge case:** Dates with time components are truncated to date only

### Risk 3: Large Tags Array
- **Issue:** User could submit very large tags array
- **Mitigation:** Add max length validation (e.g., max 20 tags, max 50 chars each)
- **Edge case:** Empty tags array is valid and stored as `[]`

### Risk 4: Request Body Size
- **Issue:** Malicious large request bodies
- **Mitigation:** Vercel has default 4.5MB limit; notes field could be limited to 10,000 chars
- **Edge case:** Notes with special characters/unicode should be handled correctly

### Risk 5: Concurrent Creates
- **Issue:** User rapidly creates multiple sets
- **Mitigation:** Each INSERT is atomic; no race conditions possible
- **Edge case:** Rate limiting may be needed in future (not in scope for STORY-003)

### Risk 6: Database Write Failures
- **Issue:** INSERT fails due to connection issues, constraint violations
- **Mitigation:** Proper error handling returns 500 with error context
- **Edge case:** Partial failures not possible (single atomic INSERT)

---

## Deliverables Checklist

- [ ] `packages/backend/sets-core/src/create-set.ts` function created
- [ ] `packages/backend/sets-core/src/__tests__/create-set.test.ts` tests created
- [ ] `apps/api/api/sets/index.ts` Vercel function created (POST handler)
- [ ] `apps/api/vercel.json` updated with POST route
- [ ] `requests/story-003-sets-create.http` test file created
- [ ] Unit tests for `createSet()` (80% coverage)
- [ ] All `.http` tests passing
- [ ] CORS headers verified (including OPTIONS preflight)
- [ ] Response helpers imported from `@repo/lambda-responses`
- [ ] Schemas imported from `@repo/api-client/schemas/sets`

---

## Open Questions

**NONE** - All blocking questions resolved in Decisions section.

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Notes |
|---|---|---|---|
| 2026-01-18T16:00:00-07:00 | PM Agent | Created STORY-003.md | Initial story definition for Sets create operation |
