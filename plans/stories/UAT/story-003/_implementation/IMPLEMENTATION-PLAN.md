# STORY-003 Implementation Plan

## Scope Surface

- **Backend/API**: YES - Create set POST endpoint
- **Frontend/UI**: NO
- **Infra/Config**: YES - vercel.json route update

## Files to Touch

### New Files
1. `packages/backend/sets-core/src/create-set.ts` - Core business logic for creating sets
2. `packages/backend/sets-core/src/__tests__/create-set.test.ts` - Unit tests for createSet()
3. `apps/api/platforms/vercel/api/sets/index.ts` - Vercel POST handler
4. `requests/story-003-sets-create.http` - HTTP test file

### Modified Files
1. `packages/backend/sets-core/src/index.ts` - Export createSet function
2. `apps/api/platforms/vercel/vercel.json` - Add POST route for /api/sets

## Step-by-Step Plan

### Step 1: Create `createSet()` Core Function
- Create `packages/backend/sets-core/src/create-set.ts`
- Function signature: `createSet(db, schema, userId, input: CreateSetInput) => Promise<CreateSetResult>`
- Generate UUID for id
- Set createdAt/updatedAt to current timestamp
- Insert into PostgreSQL
- Return full Set object matching SetSchema
- Zero platform dependencies (no AWS SDK, no Vercel types)

### Step 2: Unit Tests for createSet()
- Create `packages/backend/sets-core/src/__tests__/create-set.test.ts`
- Test happy path: minimal input (title only)
- Test happy path: full input with all fields
- Test UUID generation
- Test timestamp generation
- Test empty images array
- Test null wishlistItemId
- Target 80%+ coverage

### Step 3: Export from sets-core
- Update `packages/backend/sets-core/src/index.ts` to export createSet

### Step 4: Create Vercel POST Handler
- Create `apps/api/platforms/vercel/api/sets/index.ts`
- Export only POST handler (no GET)
- Validate JWT from Authorization header (reuse validateCognitoJwt)
- Parse and validate request body with CreateSetSchema
- Call createSet() core function
- Return 201 with Location header
- Add CORS headers (including OPTIONS preflight)
- Use successResponse from @repo/lambda-responses

### Step 5: Update vercel.json
- Add POST route for /api/sets -> /api/sets/index.ts
- Place before dynamic /api/sets/:id route

### Step 6: Create .http Test File
- Create `requests/story-003-sets-create.http`
- Include all 8 test cases from story

### Step 7: Run Tests and Verify

## Reuse Targets (Existing Packages)

| Package | Usage |
|---------|-------|
| `@repo/vercel-adapter` | validateCognitoJwt, transformRequest |
| `@repo/lambda-responses` | successResponse, errorResponseFromError, BadRequestError, UnauthorizedError |
| `@repo/lambda-auth` | getUserIdFromEvent |
| `@repo/logger` | Structured logging |
| `@repo/api-client/schemas/sets` | CreateSetSchema, SetSchema |
| `apps/api/core/database/schema` | sets table |
| `packages/backend/sets-core` | EXTEND with createSet() |

## Ports & Adapters Boundaries

### Core (Transport-Agnostic)
- `packages/backend/sets-core/src/create-set.ts`
  - Accepts generic DB client interface
  - No imports from @repo/vercel-adapter
  - No imports from AWS SDK
  - Returns plain Result type

### Adapter (Platform-Specific)
- `apps/api/platforms/vercel/api/sets/index.ts`
  - Handles HTTP request/response
  - Uses Vercel types (VercelRequest, VercelResponse)
  - Calls core function with injected DB client

## Test Plan

### Unit Tests
```bash
pnpm test packages/backend/sets-core
pnpm test packages/backend/sets-core -- --coverage
```

### .http Tests (via vercel dev)
```bash
cd apps/api/platforms/vercel
vercel dev
# Then run .http tests
```

## Stop Conditions / Blockers

- If CreateSetSchema validation doesn't match story requirements
- If database schema doesn't support all required fields
- If JWT validation middleware is not working
- If vercel dev cannot connect to database
