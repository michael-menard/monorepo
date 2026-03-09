# IMPLEMENTATION-PLAN: STORY-014 - MOC Instructions - Import from URL

## Scope Surface

- **backend/API:** yes
- **frontend/UI:** no
- **infra/config:** yes (vercel.json route)

**Notes:** This is a backend-only story migrating an existing AWS Lambda endpoint to Vercel. No database interaction required - this endpoint fetches and parses external URLs without persistence. Reuses existing parsers from AWS Lambda implementation.

---

## Acceptance Criteria Checklist

- [ ] AC-1: POST `/api/mocs/import-from-url` with valid Rebrickable MOC URL returns 200 with parsed metadata
- [ ] AC-2: POST `/api/mocs/import-from-url` with valid Rebrickable Set URL returns 200 with parsed metadata
- [ ] AC-3: POST `/api/mocs/import-from-url` with valid BrickLink Studio URL returns 200 with parsed metadata
- [ ] AC-4: POST with missing/invalid URL returns 400 with clear error message
- [ ] AC-5: POST with unsupported platform URL returns 400 with "URL not supported" message
- [ ] AC-6: POST with non-existent MOC URL (external 404) returns 404 with "Could not find a MOC at this URL"
- [ ] AC-7: Rate limiting enforced: 11th request returns 429 with "Too many imports" message
- [ ] AC-8: Cache hit: Same URL requested twice within 1 hour returns cached result without external fetch
- [ ] AC-9: Unauthenticated request (AUTH_BYPASS=false) returns 401 Unauthorized
- [ ] AC-10: URL length validated: URLs > 2000 characters return 400

---

## Files To Touch (Expected)

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE | New Vercel handler |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | Add route rewrite |
| `__http__/mocs.http` | MODIFY | Add HTTP contract requests |

**Total: 3 files (1 create, 2 modify)**

---

## Reuse Targets

### Existing AWS Lambda Code (Import directly - no changes)

| Source | Purpose |
|--------|---------|
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` | `ImportFromUrlRequestSchema`, `detectPlatform()`, `getPlatformDisplayName()`, type definitions |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc.ts` | `parseRebrickableMoc()` |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set.ts` | `parseRebrickableSet()` |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio.ts` | `parseBrickLinkStudio()` |

### Existing Vercel Handler Patterns (Copy structure)

| Source | Pattern |
|--------|---------|
| `apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | Auth bypass pattern, method validation, error response format |
| `apps/api/platforms/vercel/api/mocs/index.ts` | Vercel handler structure, request body parsing |

### Existing Dependencies (Already available)

| Package | Purpose | Verified |
|---------|---------|----------|
| `cheerio` | HTML parsing (transitive via parsers) | Yes (line 116 in package.json) |
| `@repo/logger` | Structured logging | Yes |
| `zod` | Request validation | Yes |

---

## Architecture Notes (Ports & Adapters)

### Core Logic (Reused - No Changes)

The core business logic exists in the AWS Lambda handler directory and is directly importable:

1. **Platform Detection** (`types.ts`): `detectPlatform(url)` determines which parser to use
2. **HTML Parsers** (`parsers/*.ts`): cheerio-based extractors for each platform
3. **Zod Schemas** (`types.ts`): `ImportFromUrlRequestSchema` for request validation

### Adapter (Vercel - New)

The Vercel handler (`import-from-url.ts`) adapts the core logic:

1. Receives `VercelRequest`
2. Validates auth (AUTH_BYPASS pattern from existing handlers)
3. Validates request body using existing Zod schema
4. Checks in-memory rate limit (10/min/user)
5. Checks in-memory cache (1hr TTL)
6. Fetches external URL (same `fetchHtml` logic as Lambda)
7. Calls appropriate parser based on `detectPlatform()`
8. Caches result
9. Returns `VercelResponse`

### Boundaries to Protect

- **No database dependency**: This endpoint does not persist data - keep it stateless
- **In-memory rate limit/cache is acceptable**: Per story non-goals, Redis is not required for MVP
- **Parsers stay in AWS path**: Do not move parsers to a shared package; import directly from AWS endpoint directory

---

## Step-by-Step Plan (Small Steps)

### Step 1: Create Vercel Handler Scaffold

**Objective:** Create the handler file with imports and basic structure

**Files:**
- CREATE: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Create file with Vercel handler signature
2. Import types and parsers from AWS Lambda path
3. Import `@repo/logger`
4. Add method validation (POST only)
5. Add auth bypass pattern from `edit.ts`

**Verification:**
```bash
pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts
```

---

### Step 2: Add Request Validation

**Objective:** Implement URL validation and length check

**Files:**
- MODIFY: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Parse JSON body with try/catch
2. Validate with `ImportFromUrlRequestSchema`
3. Add URL length check (> 2000 chars = 400)
4. Return appropriate 400 errors for validation failures

**Verification:**
```bash
pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json
```

---

### Step 3: Implement In-Memory Rate Limiting

**Objective:** Add rate limiting (10/min/user)

**Files:**
- MODIFY: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Add `rateLimitMap` with same structure as Lambda handler
2. Add `checkRateLimit(userId)` function
3. Return 429 with "Too many imports" on rate limit exceeded

**Verification:**
- TypeScript compiles without errors

---

### Step 4: Implement In-Memory Caching

**Objective:** Add caching (1hr TTL)

**Files:**
- MODIFY: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Add `cacheMap` with same structure as Lambda handler
2. Add `getCached(url)` and `setCache(url, data)` functions
3. Check cache before external fetch
4. Store result in cache after successful parse

**Verification:**
- TypeScript compiles without errors

---

### Step 5: Implement External URL Fetching

**Objective:** Add fetch logic with timeout and error handling

**Files:**
- MODIFY: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Add `fetchHtml(url)` function with 10s timeout (same as Lambda)
2. Handle 404 from external site -> return 404 "Could not find a MOC at this URL"
3. Handle other fetch errors -> return 500

**Verification:**
- TypeScript compiles without errors

---

### Step 6: Integrate Platform Detection and Parsers

**Objective:** Connect parsers and build response

**Files:**
- MODIFY: `apps/api/platforms/vercel/api/mocs/import-from-url.ts`

**Actions:**
1. Call `detectPlatform(url)` and return 400 if unsupported
2. Add switch statement for platform-specific parsing
3. Build response matching `ImportFromUrlResponse` structure
4. Store in cache and return 200

**Verification:**
```bash
pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts
pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json
```

---

### Step 7: Add vercel.json Route

**Objective:** Register the new endpoint route

**Files:**
- MODIFY: `apps/api/platforms/vercel/vercel.json`

**Actions:**
1. Add rewrite rule: `{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" }`
2. Place BEFORE `/api/mocs/:id` route (route ordering matters per STORY-007 lessons)
3. Optionally add function config for extended timeout (fetch can take time)

**Verification:**
```bash
cat apps/api/platforms/vercel/vercel.json | jq '.rewrites | map(select(.source | contains("import")))'
```

---

### Step 8: Add HTTP Contract Requests

**Objective:** Add .http requests for all test scenarios

**Files:**
- MODIFY: `__http__/mocs.http`

**Actions:**
1. Add section header: `# STORY-014: Import from URL`
2. Add happy path requests:
   - `importFromUrl` - Rebrickable MOC
   - `importFromUrlSet` - Rebrickable Set
   - `importFromUrlBrickLink` - BrickLink Studio
3. Add error case requests:
   - `importFromUrl400Missing` - missing URL
   - `importFromUrl400Invalid` - invalid URL format
   - `importFromUrl400Unsupported` - unsupported platform
   - `importFromUrl404` - non-existent MOC
   - `importFromUrl400TooLong` - URL too long

**Verification:**
```bash
wc -l __http__/mocs.http
```

---

### Step 9: Final Lint and Type Check

**Objective:** Ensure all code passes quality gates

**Files:**
- All files touched in this story

**Actions:**
1. Run scoped lint on new/modified files
2. Run scoped type check

**Verification:**
```bash
pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts
pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json
```

---

### Step 10: Manual Integration Testing

**Objective:** Verify all ACs via HTTP requests

**Files:**
- `__http__/mocs.http`

**Actions:**
1. Start Vercel dev server: `pnpm vercel:dev`
2. Execute each HTTP request from mocs.http
3. Verify response status codes and body structure
4. Test rate limiting: execute 11 requests within 1 minute
5. Test caching: execute same URL twice, note response time

**Verification:**
- All HTTP requests return expected status codes
- Rate limit triggers on 11th request
- Cache hit is faster than cache miss

---

## Test Plan

### Unit Tests

**Not applicable** - This endpoint reuses existing parsers which are tested in their original location. The handler follows established patterns that are proven by other handlers.

### Integration Tests (HTTP Contract)

Execute via REST Client extension or curl against `http://localhost:3001`:

| Request | Expected Status | Validates AC |
|---------|----------------|--------------|
| POST with Rebrickable MOC URL | 200 | AC-1 |
| POST with Rebrickable Set URL | 200 | AC-2 |
| POST with BrickLink Studio URL | 200 | AC-3 |
| POST with `{}` body | 400 | AC-4 |
| POST with `{ "url": "not-a-url" }` | 400 | AC-4 |
| POST with `{ "url": "https://example.com/page" }` | 400 | AC-5 |
| POST with non-existent MOC URL | 404 | AC-6 |
| 11 requests in 1 minute | 429 on 11th | AC-7 |
| Same URL twice | 200 (cached) | AC-8 |
| POST without auth (AUTH_BYPASS=false) | 401 | AC-9 |
| POST with URL > 2000 chars | 400 | AC-10 |

### Lint/Type Check Commands

```bash
# Scoped lint (avoids pre-existing monorepo failures)
pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts

# Scoped type check
pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json
```

### Playwright

**Not applicable** - Backend-only story with no UI changes.

---

## Stop Conditions / Blockers

### No Blockers Identified

The story is well-defined with:
1. Clear reference implementation (AWS Lambda handler)
2. Reusable parsers and types
3. Established Vercel handler patterns from prior stories (STORY-011, 012, 013)
4. No database dependencies
5. No new packages required (cheerio already available)

### Potential Risks (Low)

| Risk | Mitigation |
|------|------------|
| External URLs may be blocked/rate-limited during testing | Use actual Rebrickable/BrickLink URLs that are known to work |
| Parser imports from AWS path may have path alias issues | Verify import paths work in Vercel environment early (Step 1) |
| Pre-existing monorepo build failures | Use scoped verification commands as documented in LESSONS-LEARNED |

---

## Implementation Notes

### Import Paths

The parsers and types are located in the AWS Lambda directory. Import using relative paths from the Vercel handler:

```typescript
import {
  ImportFromUrlRequestSchema,
  detectPlatform,
  getPlatformDisplayName,
  type ImportFromUrlResponse,
} from '../../aws/endpoints/moc-instructions/import-from-url/types'
import { parseBrickLinkStudio } from '../../aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio'
import { parseRebrickableMoc } from '../../aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc'
import { parseRebrickableSet } from '../../aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set'
```

### Rate Limit / Cache Note

Per story non-goals, in-memory rate limiting and caching are acceptable for MVP:
- Rate limit: Users may exceed 10/min if requests hit different serverless instances
- Cache: Cache misses may occur if requests hit different instances

This is explicitly documented in the story and should not be treated as a bug.

### Route Ordering

Per STORY-007 and STORY-013 lessons learned, the new route must be placed BEFORE the parameterized `/api/mocs/:id` route in vercel.json to avoid routing conflicts:

```json
{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" },
{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" }
```
