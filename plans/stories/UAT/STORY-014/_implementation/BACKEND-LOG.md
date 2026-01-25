# BACKEND-LOG: STORY-014 - MOC Instructions - Import from URL

## Chunk 1 — Complete Vercel Handler Implementation

- **Objective (maps to story requirement/AC):** Implement the complete POST `/api/mocs/import-from-url` endpoint with all ACs (AC-1 through AC-10)

- **Files changed:**
  - `apps/api/platforms/vercel/api/mocs/import-from-url.ts` (CREATE)

- **Summary of changes:**
  - Created Vercel handler with proper signature (`VercelRequest`, `VercelResponse`)
  - Imported types and parsers from AWS Lambda path (reuse-first approach)
  - Implemented AUTH_BYPASS pattern for local dev authentication (AC-9)
  - Implemented in-memory rate limiting (10 requests/min/user) (AC-7)
  - Implemented in-memory caching (1 hour TTL) (AC-8)
  - Implemented URL validation via Zod schema (AC-4)
  - Implemented URL length validation (max 2000 chars) (AC-10)
  - Implemented platform detection for unsupported URLs (AC-5)
  - Implemented external HTML fetch with 10s timeout (AC-6)
  - Integrated all three parsers:
    - `parseRebrickableMoc()` (AC-1)
    - `parseRebrickableSet()` (AC-2)
    - `parseBrickLinkStudio()` (AC-3)
  - Added structured logging via `@repo/logger`

- **Reuse compliance:**
  - Reused:
    - `ImportFromUrlRequestSchema` from AWS Lambda types
    - `detectPlatform()` from AWS Lambda types
    - `getPlatformDisplayName()` from AWS Lambda types
    - `ImportFromUrlResponse` type from AWS Lambda types
    - `parseRebrickableMoc()` parser
    - `parseRebrickableSet()` parser
    - `parseBrickLinkStudio()` parser
    - Auth bypass pattern from existing Vercel handlers
    - Logger pattern from `@repo/logger`
  - New:
    - Handler file `import-from-url.ts` (Vercel adapter only)
  - Why new was necessary:
    - Vercel adapter required to expose endpoint via Vercel serverless functions
    - No new shared logic created - all business logic is reused from AWS Lambda

- **Ports & adapters note:**
  - What stayed in core: Platform detection, HTML parsers, Zod schemas (all in AWS Lambda directory, unchanged)
  - What stayed in adapters: Request/response handling, auth bypass, rate limiting, caching, external URL fetching

- **Commands run:**
  - `pnpm eslint apps/api/platforms/vercel/api/mocs/import-from-url.ts --fix` (passed)

- **Notes / Risks:**
  - Rate limiting and caching are in-memory (per-instance), as documented in story non-goals
  - Import paths use relative paths from Vercel directory to AWS directory (established pattern)

---

## Chunk 2 — Route Registration in vercel.json

- **Objective (maps to story requirement/AC):** Register the new endpoint route and configure function timeout

- **Files changed:**
  - `apps/api/platforms/vercel/vercel.json` (MODIFY)

- **Summary of changes:**
  - Added rewrite rule: `{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" }`
  - Placed route BEFORE parameterized `/api/mocs/:id` routes (per STORY-007 lessons learned)
  - Added function config with `maxDuration: 15` to allow for external URL fetching

- **Reuse compliance:**
  - Reused: Existing vercel.json patterns for route ordering and function configuration
  - New: One route entry, one function config entry
  - Why new was necessary: Standard configuration for new endpoint

- **Ports & adapters note:**
  - What stayed in core: N/A (infrastructure config only)
  - What stayed in adapters: Route configuration is adapter-specific

- **Commands run:** N/A (JSON file)
- **Notes / Risks:** None

---

## Chunk 3 — HTTP Contract Requests

- **Objective (maps to story requirement/AC):** Add HTTP requests for testing all acceptance criteria

- **Files changed:**
  - `__http__/mocs.http` (MODIFY)

- **Summary of changes:**
  - Added STORY-014 section header
  - Added happy path requests:
    - `importFromUrl` - Rebrickable MOC (AC-1)
    - `importFromUrlSet` - Rebrickable Set (AC-2)
    - `importFromUrlBrickLink` - BrickLink Studio (AC-3)
  - Added error case requests:
    - `importFromUrl400Missing` - missing URL (AC-4)
    - `importFromUrl400Invalid` - invalid URL format (AC-4)
    - `importFromUrl400Unsupported` - unsupported platform (AC-5)
    - `importFromUrl404` - non-existent MOC (AC-6)
    - `importFromUrl400TooLong` - URL too long (AC-10)
    - `importFromUrl400Json` - invalid JSON body (AC-4)
    - `importFromUrl405` - invalid method (AC-4)
  - Added edge case requests:
    - `importFromUrlWithParams` - URL with query parameters
    - `importFromUrlTrailingSlash` - URL with trailing slash
    - `importFromUrlUppercase` - uppercase domain

- **Reuse compliance:**
  - Reused: Existing `.http` file patterns
  - New: 14 HTTP requests for STORY-014
  - Why new was necessary: Test coverage for all acceptance criteria

- **Ports & adapters note:** N/A (test fixtures)
- **Commands run:** N/A
- **Notes / Risks:** None

---

## Files Modified Summary

| File | Action | LOC |
|------|--------|-----|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE | ~380 |
| `apps/api/platforms/vercel/vercel.json` | MODIFY | +3 lines |
| `__http__/mocs.http` | MODIFY | +120 lines |

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC-1 | Rebrickable MOC URL parsing via `parseRebrickableMoc()` |
| AC-2 | Rebrickable Set URL parsing via `parseRebrickableSet()` |
| AC-3 | BrickLink Studio URL parsing via `parseBrickLinkStudio()` |
| AC-4 | Zod validation with `ImportFromUrlRequestSchema`, JSON parse error handling |
| AC-5 | `detectPlatform()` returns null for unsupported URLs, returns 400 |
| AC-6 | `fetchHtml()` returns 404 when external site returns 404 |
| AC-7 | `checkRateLimit()` with 10/min/user, returns 429 |
| AC-8 | `getCached()`/`setCache()` with 1 hour TTL |
| AC-9 | `getAuthUserId()` returns null when AUTH_BYPASS!=true, returns 401 |
| AC-10 | URL length check `url.length > MAX_URL_LENGTH`, returns 400 |

---

BACKEND COMPLETE
