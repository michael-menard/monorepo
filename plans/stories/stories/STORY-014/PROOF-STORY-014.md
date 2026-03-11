# PROOF-STORY-014

## Story

**STORY-014 - MOC Instructions - Import from URL**

Migrate the `POST /api/mocs/import-from-url` endpoint to Vercel serverless functions, enabling users to import MOC/Set metadata from Rebrickable and BrickLink Studio URLs.

---

## Summary

- Created new Vercel serverless handler `import-from-url.ts` that adapts existing AWS Lambda parsers
- Implemented in-memory rate limiting (10 requests/minute/user) with sliding window
- Implemented in-memory caching (1 hour TTL) for external URL responses
- Integrated three platform parsers: Rebrickable MOC, Rebrickable Set, BrickLink Studio
- Added URL validation with 2000 character limit
- Configured extended function timeout (15s) for external URL fetching
- Registered route in vercel.json with correct ordering (before parameterized routes)
- Added 14 HTTP contract requests covering all acceptance criteria
- Fixed import path bug identified during verification (2 levels to 3 levels)

---

## Acceptance Criteria to Evidence

### AC-1: POST `/api/mocs/import-from-url` with valid Rebrickable MOC URL returns 200 with parsed metadata

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` (lines 286-310) - switch case for `rebrickable-moc` platform calls `parseRebrickableMoc()`
  - Reused parser: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc.ts`
  - HTTP request: `__http__/mocs.http` - `importFromUrl` request

### AC-2: POST `/api/mocs/import-from-url` with valid Rebrickable Set URL returns 200 with parsed metadata

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` (lines 312-336) - switch case for `rebrickable-set` platform calls `parseRebrickableSet()`
  - Reused parser: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set.ts`
  - HTTP request: `__http__/mocs.http` - `importFromUrlSet` request

### AC-3: POST `/api/mocs/import-from-url` with valid BrickLink Studio URL returns 200 with parsed metadata

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` (lines 338-350) - switch case for `bricklink-studio` platform calls `parseBrickLinkStudio()`
  - Reused parser: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio.ts`
  - HTTP request: `__http__/mocs.http` - `importFromUrlBrickLink` request

### AC-4: POST `/api/mocs/import-from-url` with missing/invalid URL returns 400 with clear error message

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts`
    - JSON parse error handling (lines 200-210) - returns "Invalid request body"
    - Zod validation (lines 212-220) - uses `ImportFromUrlRequestSchema`, returns "Please enter a valid URL"
  - Reused schema: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 13)
  - HTTP requests: `__http__/mocs.http` - `importFromUrl400Missing`, `importFromUrl400Invalid`, `importFromUrl400Json`, `importFromUrl405`

### AC-5: POST `/api/mocs/import-from-url` with unsupported platform URL returns 400 with message "URL not supported"

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` (lines 247-256) - calls `detectPlatform()`, returns 400 when null
  - Reused function: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (line 71) - `detectPlatform()`
  - HTTP request: `__http__/mocs.http` - `importFromUrl400Unsupported`

### AC-6: POST `/api/mocs/import-from-url` with non-existent MOC URL returns 404 with message "Could not find a MOC at this URL"

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` (lines 101-133) - `fetchHtml()` function checks for 404 response from external site, returns 404 to client
  - HTTP request: `__http__/mocs.http` - `importFromUrl404`

### AC-7: Rate limiting enforced: 11th request returns 429 with "Too many imports" message

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts`
    - Rate limit constants (line 30): `MAX_REQUESTS_PER_MINUTE = 10`
    - `checkRateLimit()` function (lines 41-58) - sliding window implementation
    - Rate limit check invocation (lines 237-245) - returns 429 when exceeded
  - Note: Per story non-goals, rate limiting is in-memory per-instance (acceptable for MVP)

### AC-8: Cache hit: Same URL requested twice within 1 hour returns cached result without external fetch

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts`
    - Cache TTL constant (line 31): `CACHE_TTL_MS = 60 * 60 * 1000` (1 hour)
    - `getCached()` function (lines 64-70) - retrieves from cache if not expired
    - `setCache()` function (lines 73-77) - stores with timestamp
    - Cache check invocation (lines 262-269) - returns cached response immediately
    - Cache storage (lines 357-360) - stores successful response
  - Note: Per story non-goals, cache is in-memory per-instance (acceptable for MVP)

### AC-9: Unauthenticated request (AUTH_BYPASS=false) returns 401 Unauthorized

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts`
    - `getAuthUserId()` function (lines 87-92) - returns null when AUTH_BYPASS is not true
    - Auth check invocation (lines 179-188) - returns 401 when userId is null
  - Pattern reused from existing Vercel handlers

### AC-10: URL length validated: URLs longer than 2000 characters return 400

- **Evidence:**
  - Handler implementation: `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts`
    - Constant (line 28): `MAX_URL_LENGTH = 2000`
    - Length check (lines 222-230) - returns 400 with "URL too long" message
  - HTTP request: `__http__/mocs.http` - `importFromUrl400TooLong`

---

## Reuse and Architecture Compliance

### Reuse-First Summary

**Reused:**
- `ImportFromUrlRequestSchema` - Zod schema for request validation (from AWS Lambda types)
- `detectPlatform()` - Platform detection function (from AWS Lambda types)
- `getPlatformDisplayName()` - Platform name helper (from AWS Lambda types)
- `ImportFromUrlResponse` - Response type definition (from AWS Lambda types)
- `parseRebrickableMoc()` - Rebrickable MOC HTML parser (from AWS Lambda parsers)
- `parseRebrickableSet()` - Rebrickable Set HTML parser (from AWS Lambda parsers)
- `parseBrickLinkStudio()` - BrickLink Studio HTML parser (from AWS Lambda parsers)
- AUTH_BYPASS pattern - Authentication bypass for local development (from existing Vercel handlers)
- `@repo/logger` - Structured logging (monorepo package)
- `cheerio` - HTML parsing library (already in package.json)

**Created:**
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/import-from-url.ts` - Vercel adapter handler
- Route configuration in `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/vercel.json`
- HTTP test requests in `/Users/michaelmenard/Development/Monorepo/__http__/mocs.http`

**Justification for New Code:**
- Vercel adapter required to expose endpoint via Vercel serverless functions
- No new shared logic created - all business logic (platform detection, HTML parsing) is reused from AWS Lambda
- Route configuration is mandatory for Vercel routing

### Ports and Adapters Compliance

**Core (Unchanged):**
- Platform detection: `detectPlatform()` in `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts`
- HTML parsers: All parsers in `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/`
- Zod schemas: `ImportFromUrlRequestSchema` in types.ts

**Adapter (New):**
- Vercel handler: Request/response handling, auth bypass, rate limiting, caching, external URL fetching
- All adapter-specific concerns isolated in the handler file
- Core business logic imported and invoked without modification

---

## Verification

### Commands Executed

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts` | PASS | No lint errors |
| `pnpm tsc --noEmit -p apps/api/platforms/vercel/tsconfig.json` | PASS (after fix) | Import path bug fixed |
| `pnpm build` | FAIL | Pre-existing `@repo/app-dashboard` issue (unrelated to STORY-014) |

### File Verification

| File | Status |
|------|--------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | EXISTS - Handler created |
| `apps/api/platforms/vercel/vercel.json` | MODIFIED - Route and function config added |
| `__http__/mocs.http` | MODIFIED - 14 HTTP requests added |
| All reused parsers and types | EXISTS - Import paths verified |

### Route Ordering Verification

Route correctly placed BEFORE parameterized routes in vercel.json:
```json
{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" },
{ "source": "/api/mocs/:id/gallery-images/:galleryImageId", "destination": "/api/mocs/[id]/gallery-images/[galleryImageId].ts" },
...
{ "source": "/api/mocs/:id", "destination": "/api/mocs/[id].ts" }
```

### Function Configuration Verification

Extended timeout configured:
```json
"api/mocs/import-from-url.ts": {
  "maxDuration": 15
}
```

### Playwright

Not applicable - backend-only story with no UI changes.

---

## Deviations / Notes

### Import Path Bug Fix

During verification, the import paths in the handler were found to be incorrect:
- **Original:** `../../aws/endpoints/...` (2 levels up)
- **Corrected:** `../../../aws/endpoints/...` (3 levels up)

This was identified in PLAN-VALIDATION.md as a minor note and corrected during implementation.

### Build Failure Note

The monorepo-wide `pnpm build` fails due to a pre-existing issue in `@repo/app-dashboard` (Tailwind export path issue). This is unrelated to STORY-014 and does not affect the functionality of the implemented endpoint.

### Rate Limiting and Caching Caveats

Per story non-goals, documented explicitly:
- Rate limiting is per-serverless-instance (in-memory). Users may exceed 10/min if requests hit different instances. Acceptable for MVP.
- Cache is in-memory per-instance with 1-hour TTL. Cache misses may occur if requests hit different instances. Acceptable for MVP.

---

## Blockers

None. No blockers were encountered during implementation.

---

## Files Changed Summary

| File | Action | LOC |
|------|--------|-----|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE | ~380 |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | +3 lines |
| `__http__/mocs.http` | MODIFY | +120 lines |

**Total: 3 files (1 create, 2 modify)**
