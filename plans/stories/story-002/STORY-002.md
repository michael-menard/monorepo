# STORY-002: Sets - Read Operations

## Goal

Migrate the Sets read endpoints (`get` and `list`) from AWS Lambda + API Gateway to Vercel serverless functions. This is the first authenticated story, establishing the Cognito JWT authentication pattern for Vercel functions using the existing `@repo/vercel-adapter` infrastructure.

## Non-Goals

- **Not** migrating write operations (create, update, delete sets)
- **Not** migrating image upload endpoints
- **Not** modifying database schema (read-only operations)
- **Not** implementing caching layers
- **Not** implementing OpenSearch (list uses PostgreSQL directly)
- **Not** deploying to production Vercel environment (local development only)
- **Not** modifying the frontend application

## Scope

### Endpoints to Migrate

**1. Get Set Endpoint**
- **Source:** `apps/api/platforms/aws/endpoints/sets/get/handler.ts`
- **Target:** `apps/api/api/sets/[id].ts` (Vercel function with dynamic route)
- **Method:** GET
- **Route:** `/api/sets/{id}`
- **Current behavior:**
  - Validates user authentication via `getUserIdFromEvent`
  - Validates set ID format (UUID)
  - Retrieves set with associated images
  - Validates user owns the set (403 if not)
  - Returns set with images array ordered by position
  - Logs request/response via logger
- **Response fields:** id, userId, title, setNumber, store, sourceUrl, pieceCount, releaseDate, theme, tags, notes, isBuilt, quantity, purchasePrice, tax, shipping, purchaseDate, wishlistItemId, images[], createdAt, updatedAt

**2. List Sets Endpoint**
- **Source:** `apps/api/platforms/aws/endpoints/sets/list/handler.ts`
- **Target:** `apps/api/api/sets/list.ts` (Vercel function)
- **Method:** GET
- **Route:** `/api/sets/list`
- **Current behavior:**
  - Validates user authentication via `getUserIdFromEvent`
  - Accepts query parameters: search, theme, tags, isBuilt, sortField, sortDirection, page, limit
  - Filters sets by userId (user can only see their own)
  - Supports search across title and setNumber
  - Supports filtering by theme, tags, build status
  - Supports sorting by title, setNumber, pieceCount, purchaseDate, purchasePrice, createdAt
  - Returns paginated results with available filters (themes, tags)
  - Logs request/response via logger
- **Response fields:** items[], pagination{page, limit, total, totalPages}, filters{availableThemes, availableTags}

### Core Business Logic to Extract

**Sets Core Logic (NEW):**
- Set retrieval by ID with ownership validation
- Set list query building (filters, search, sort, pagination)
- Set aggregation (joining images, computing totals)
- Response shaping (conforming to `SetSchema` and `SetListResponseSchema`)

### In-Scope Packages

**Existing (REUSE):**
- `@repo/vercel-adapter` - Request/response transformation, `createVercelHandler()`
- `@repo/lambda-auth` - `getUserIdFromEvent()` and auth validation
- `@repo/lambda-responses` - `successResponse`, `errorResponse`, `NotFoundError`, `ForbiddenError`
- `@repo/logger` - Structured logging
- `@repo/api-client/schemas/sets` - `SetSchema`, `SetListResponseSchema`, `SetImageSchema`
- `apps/api/core/database/client` - Drizzle database client
- `apps/api/core/database/schema` - Sets and setImages tables

**New (CREATE):**
- `packages/backend/sets-core` - Platform-agnostic sets business logic (queries, validation, response shaping)

## Decisions

### D1: Authentication Strategy for Vercel

**Decision:** Extend `@repo/vercel-adapter` to support real JWT validation using `aws-jwt-verify`

**Rationale:** The current `request-transformer.ts` has placeholder JWT handling. For authenticated endpoints, we need actual JWT validation. The `aws-jwt-verify` library validates Cognito JWTs without requiring AWS SDK.

**Implementation:**
1. Add `aws-jwt-verify` dependency to `@repo/vercel-adapter`
2. Create `vercel-auth-middleware.ts` that validates JWT from Authorization header
3. Populate `requestContext.authorizer.jwt.claims` with validated claims
4. Existing `@repo/lambda-auth` functions work unchanged

**Constraint:** Must validate: signature, issuer (Cognito User Pool), audience (Client ID), expiration

---

### D2: Core Logic Package Structure

**Decision:** Create `packages/backend/sets-core` with isolated query functions

**Package structure:**
```
packages/backend/sets-core/
  src/
    __types__/
      index.ts           # Zod schemas for internal types
    __tests__/
      get-set.test.ts
      list-sets.test.ts
    get-set.ts           # getSetById(db, userId, setId) -> Set | null
    list-sets.ts         # listSets(db, userId, filters) -> SetListResponse
    index.ts             # Exports
  package.json
  tsconfig.json
  vitest.config.ts
```

**Rationale:** Separates database query logic from platform concerns. Core functions accept db client via dependency injection, making them testable and platform-agnostic.

---

### D3: Database Client in Vercel

**Decision:** Reuse existing Drizzle client from `apps/api/core/database/client` with Neon driver

**Rationale:** STORY-001 established Neon serverless driver pattern. The existing Drizzle client can be configured to use Neon's serverless driver for Vercel functions.

**Constraint:** Drizzle client must be initialized lazily (not at module load) to avoid cold start issues

---

### D4: Dynamic Route Handling

**Decision:** Use Next.js dynamic route pattern `[id].ts` for sets/:id endpoint

**Implementation:** `apps/api/api/sets/[id].ts`
- Extract `id` from `params.id` in Vercel handler
- Pass to Lambda-style event via `pathParameters.id`

---

### D5: Response Validation

**Decision:** Validate all responses against `@repo/api-client/schemas/sets` schemas before returning

**Rationale:** Ensures contract compliance between API and frontend. Catches shape drift at the source.

**Constraint:** Use `SetSchema.parse()` and `SetListResponseSchema.parse()` on all successful responses

---

### D6: Response Helpers (QA Fix)

**Decision:** Use `@repo/lambda-responses` package for all response building

**Rationale:** The `@repo/lambda-responses` package (`packages/backend/lambda-responses`) already exports:
- `successResponse(statusCode, body)` - Build 200/201 responses with proper headers
- `errorResponseFromError(error)` - Convert typed errors to HTTP responses
- `NotFoundError`, `ForbiddenError`, `ValidationError` - Typed error classes

This replaces the previous reference to `apps/api/core/utils/responses`, which violated the Import Policy requiring workspace package imports.

**Verification (QA Issue #1 - Critical):**
- `@repo/lambda-responses` package.json exports `./src/responses.js`
- Exports include: `successResponse`, `errorResponse`, `errorResponseFromError`
- Package is already a workspace dependency, no new installation required

---

### D7: Schema Import Path (QA Fix)

**Decision:** Import sets schemas from `@repo/api-client/schemas/sets`

**Verification (QA Issue #2 - High):**
- `@repo/api-client` package.json line 35-38 explicitly exports `./schemas/sets`
- Export maps to `./src/schemas/sets.ts`
- File exports: `SetSchema`, `SetListResponseSchema`, `SetImageSchema`, `SetListQuerySchema`

**Import statement:**
```typescript
import { SetSchema, SetListResponseSchema } from '@repo/api-client/schemas/sets'
```

---

## Acceptance Criteria

### AC1: Get Set Vercel Function
- [ ] Vercel function created at `apps/api/api/sets/[id].ts`
- [ ] Function validates JWT from Authorization header using `aws-jwt-verify`
- [ ] Returns 401 if no/invalid authentication token
- [ ] Returns 400 if set ID is not a valid UUID
- [ ] Returns 404 if set not found
- [ ] Returns 403 if set belongs to different user
- [ ] Returns 200 with set data if authorized
- [ ] Response includes all set fields plus images[] array
- [ ] Images sorted by position ascending
- [ ] Response validated against `SetSchema` from `@repo/api-client/schemas/sets`
- [ ] Logger outputs structured logs with userId, setId
- [ ] CORS headers included in response
- [ ] Uses `successResponse` from `@repo/lambda-responses` for 200 responses
- [ ] Uses typed errors (`NotFoundError`, `ForbiddenError`) from `@repo/lambda-responses`

### AC2: List Sets Vercel Function
- [ ] Vercel function created at `apps/api/api/sets/list.ts`
- [ ] Function validates JWT from Authorization header
- [ ] Returns 401 if no/invalid authentication token
- [ ] Supports query parameters: search, theme, tags, isBuilt, sortField, sortDirection, page, limit
- [ ] Returns only sets owned by authenticated user (userId filter)
- [ ] Search filters by title OR setNumber (case-insensitive ILIKE)
- [ ] Theme filter matches exact theme
- [ ] Tags filter matches ANY tag in comma-separated list
- [ ] isBuilt filter accepts "true" or "false" strings
- [ ] Sort supports: title, setNumber, pieceCount, purchaseDate, purchasePrice, createdAt
- [ ] Sort direction supports: asc, desc (default: createdAt desc)
- [ ] Pagination defaults: page=1, limit=20, max limit=100
- [ ] Returns validation error (400) for invalid pagination/sort params
- [ ] Response includes filters.availableThemes and filters.availableTags
- [ ] Response validated against `SetListResponseSchema` from `@repo/api-client/schemas/sets`
- [ ] Logger outputs structured logs with query params and result count
- [ ] CORS headers included in response
- [ ] Uses `successResponse` from `@repo/lambda-responses` for 200 responses

### AC3: Authentication Middleware
- [ ] JWT validation added to `@repo/vercel-adapter` using `aws-jwt-verify`
- [ ] Validates token signature against Cognito JWKS
- [ ] Validates issuer matches `COGNITO_USER_POOL_ID`
- [ ] Validates audience matches `COGNITO_CLIENT_ID`
- [ ] Validates token not expired
- [ ] Populates `requestContext.authorizer.jwt.claims` with decoded claims
- [ ] `getUserIdFromEvent()` returns user ID (sub claim) from validated token
- [ ] Invalid/missing token results in empty claims (handler returns 401)

### AC4: Core Business Logic
- [ ] `packages/backend/sets-core` created with platform-agnostic logic
- [ ] `getSetById(db, userId, setId)` function returns Set or null
- [ ] `listSets(db, userId, filters)` function returns SetListResponse
- [ ] Core functions have zero dependencies on AWS SDK, API Gateway, or Vercel types
- [ ] Core functions accept Drizzle db client via dependency injection
- [ ] Unit tests achieve 80% minimum coverage for core package

### AC5: Local Development & Testing
- [ ] Both functions run successfully via `vercel dev`
- [ ] Get set endpoint accessible at `http://localhost:3000/api/sets/{id}`
- [ ] List sets endpoint accessible at `http://localhost:3000/api/sets/list`
- [ ] `.http` test file created at `requests/story-002-sets-read.http`
- [ ] All test cases from existing `story-000-harness.http` pass
- [ ] Additional test cases for get-by-id endpoint included
- [ ] `vercel.json` updated with new routes (list route BEFORE dynamic id route)

### AC6: Logging & Observability
- [ ] All logs use `@repo/logger` with structured format
- [ ] Logs include: level, timestamp, requestId, stage, message, context
- [ ] Successful requests log userId, endpoint, query params, result count
- [ ] Failed requests log error code, message, stack trace (for 500s)
- [ ] Authentication failures log reason (missing token, invalid signature, expired, etc.)

---

## Required Vercel Infrastructure

### Serverless Functions

**Function 1: Get Set**
- **File:** `apps/api/api/sets/[id].ts`
- **Route:** `/api/sets/:id`
- **Method:** GET
- **Auth:** Cognito JWT (via Authorization header)
- **Timeout:** 10 seconds
- **Memory:** 256 MB

**Function 2: List Sets**
- **File:** `apps/api/api/sets/list.ts`
- **Route:** `/api/sets/list`
- **Method:** GET
- **Auth:** Cognito JWT (via Authorization header)
- **Timeout:** 15 seconds
- **Memory:** 512 MB (aggregation queries)

### Environment Variables

**Required (add to `.env.local`):**
```
# Database (existing from STORY-001)
DATABASE_URL=postgres://user:password@host:5432/dbname
STAGE=development

# Cognito Authentication (NEW)
COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

### Routing Configuration

**vercel.json updates:**
```json
{
  "routes": [
    { "src": "/api/health", "dest": "/api/health.ts" },
    { "src": "/api/config/upload", "dest": "/api/config/upload.ts" },
    { "src": "/api/sets/list", "dest": "/api/sets/list.ts" },
    { "src": "/api/sets/([^/]+)", "dest": "/api/sets/[id].ts" }
  ]
}
```

**Note:** The `/api/sets/list` route MUST appear BEFORE the dynamic `/api/sets/([^/]+)` route to ensure `/list` is matched explicitly and not captured by the regex.

---

## Reuse Plan

### Packages to Reuse

| Package | Usage | Verification |
|---------|-------|--------------|
| `@repo/vercel-adapter` | Request/response transformation, handler wrapper | Exists at `packages/backend/vercel-adapter` |
| `@repo/lambda-auth` | `getUserIdFromEvent()`, JWT claims extraction | Exports verified in `src/index.ts` |
| `@repo/lambda-responses` | `successResponse`, `errorResponse`, typed errors | Exports `successResponse` via `./responses.js` (QA Issue #1 FIX) |
| `@repo/logger` | Structured logging | Exists at `packages/core/logger` |
| `@repo/api-client/schemas/sets` | Response validation schemas | Export verified in `package.json` lines 35-38 (QA Issue #2 FIX) |
| `apps/api/core/database/client` | Drizzle database client | Exists |
| `apps/api/core/database/schema` | Sets, setImages table definitions | Exists with sets.ts |

### Packages to Extend

| Package | Extension |
|---------|-----------|
| `@repo/vercel-adapter` | Add `vercel-auth-middleware.ts` for JWT validation |

### New Packages to Create

| Package | Justification |
|---------|---------------|
| `packages/backend/sets-core` | Platform-agnostic sets query logic for reuse across runtimes |

### Dependencies to Add

| Package | Location | Purpose |
|---------|----------|---------|
| `aws-jwt-verify` | `@repo/vercel-adapter` | Validate Cognito JWTs without AWS SDK |

---

## Local Testing Plan

### Setup

1. **Ensure Vercel CLI installed:**
   ```bash
   pnpm add -g vercel
   ```

2. **Configure environment:**
   ```bash
   cd apps/api
   # Add Cognito env vars to .env.local
   echo "COGNITO_USER_POOL_ID=your-pool-id" >> .env.local
   echo "COGNITO_CLIENT_ID=your-client-id" >> .env.local
   echo "COGNITO_REGION=us-east-1" >> .env.local
   ```

3. **Obtain test JWT token:**
   ```bash
   # Login via frontend or use Cognito CLI to get access token
   # Store in environment for .http file usage
   ```

### Backend Testing (.http Execution - MANDATORY)

**Test file:** `requests/story-002-sets-read.http`

**Required test execution:**
```bash
# Using httpyac CLI (recommended)
pnpm add -g httpyac
httpyac send requests/story-002-sets-read.http --all

# Or using VS Code REST Client extension
# Open file and click "Send Request" on each test
```

**Test coverage requirements:**
- All happy path scenarios
- All authentication error cases (401)
- All validation error cases (400)
- Authorization error cases (403, 404)
- Edge cases (empty results, max pagination)

### Unit Tests (Core Logic)

```bash
# Test sets-core package
pnpm test packages/backend/sets-core

# Coverage requirement: 80% minimum
pnpm test packages/backend/sets-core -- --coverage
```

### Manual Verification

**Test 1: Get Set - Happy Path**
```bash
curl http://localhost:3000/api/sets/{valid-uuid} \
  -H "Authorization: Bearer {jwt-token}"

# Expected: 200 OK with set data and images[]
```

**Test 2: Get Set - Not Found**
```bash
curl http://localhost:3000/api/sets/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer {jwt-token}"

# Expected: 404 Not Found
```

**Test 3: Get Set - Unauthorized**
```bash
curl http://localhost:3000/api/sets/{valid-uuid}

# Expected: 401 Unauthorized
```

**Test 4: List Sets - With Filters**
```bash
curl "http://localhost:3000/api/sets/list?search=Star&theme=Star%20Wars&page=1&limit=10" \
  -H "Authorization: Bearer {jwt-token}"

# Expected: 200 OK with filtered, paginated results
```

---

## Risks / Edge Cases

### Risk 1: JWT Validation Performance
- **Issue:** JWKS fetching on every request adds latency
- **Mitigation:** `aws-jwt-verify` caches JWKS automatically (configurable TTL)
- **Edge case:** First request after cache expiry may be slower

### Risk 2: Database Connection in Serverless
- **Issue:** Drizzle client initialization on cold starts
- **Mitigation:** Lazy initialization, Neon serverless driver handles pooling
- **Edge case:** Concurrent requests during cold start may create multiple connections

### Risk 3: Large Result Sets
- **Issue:** List endpoint could return large payloads
- **Mitigation:** Enforce max limit=100, paginate results
- **Edge case:** Users with many sets may need multiple pages

### Risk 4: UUID Validation
- **Issue:** Invalid UUID in path parameter
- **Mitigation:** Zod validation with UUID format check returns 400
- **Edge case:** Non-UUID strings should fail validation, not DB query

### Risk 5: Tag Array Filtering
- **Issue:** PostgreSQL array overlap query syntax
- **Mitigation:** Existing query uses `&&` operator with typed array
- **Edge case:** Empty tags array should not filter

### Risk 6: Sort Field Injection
- **Issue:** Dynamic sort field could allow SQL injection
- **Mitigation:** Enum validation limits sort fields to allowed values
- **Edge case:** Invalid sortField returns 400, not query error

### Risk 7: Image Ordering
- **Issue:** Sets with many images need consistent ordering
- **Mitigation:** ORDER BY setImages.position ASC
- **Edge case:** Null positions should sort last

### Risk 8: Cognito Token Expiration
- **Issue:** Frontend may send expired tokens
- **Mitigation:** Clear 401 response with appropriate error code
- **Edge case:** Refresh token flow handled by frontend

---

## Deliverables Checklist

- [ ] `packages/backend/sets-core/` package created with tests
- [ ] `@repo/vercel-adapter` extended with JWT validation
- [ ] `apps/api/api/sets/[id].ts` Vercel function created
- [ ] `apps/api/api/sets/list.ts` Vercel function created
- [ ] `apps/api/vercel.json` updated with new routes (list before dynamic)
- [ ] `apps/api/.env.local.example` updated with Cognito vars
- [ ] `requests/story-002-sets-read.http` test file created
- [ ] Unit tests for sets-core (80% coverage)
- [ ] All `.http` tests passing
- [ ] CORS headers verified on both endpoints
- [ ] Response helpers imported from `@repo/lambda-responses` (not app internals)

---

## Open Questions

**NONE** - All blocking questions resolved in Decisions section.

---

## QA Fixes Applied

| QA Issue | Severity | Resolution |
|----------|----------|------------|
| #1 | Critical | Replaced `apps/api/core/utils/responses` with `@repo/lambda-responses` in Reuse Plan (D6) |
| #2 | High | Verified `@repo/api-client/schemas/sets` export path is valid in package.json (D7) |

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Notes |
|---|---|---|---|
| 2026-01-18T14:00:00-07:00 | PM Agent | Created STORY-002.md | Initial story definition for Sets read operations |
| 2026-01-18T15:00:00-07:00 | PM Agent | Updated STORY-002.md | Fixed QA Critical #1 and High #2 issues; added D6, D7 decisions; updated Reuse Plan and ACs |
| 2026-01-18T15:35:00-07:00 | Dev Agent | Implemented STORY-002 | Created sets-core package, Vercel handlers, JWT auth middleware, .http test file |
| 2026-01-18T15:47:00-07:00 | Dev Agent | Generated PROOF-STORY-002.md | Implementation complete with 92.4% test coverage |
