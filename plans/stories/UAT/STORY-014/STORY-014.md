---
status: uat
---

# STORY-014: MOC Instructions - Import from URL

## Context

The MOC Instructions module allows users to import MOC/Set metadata from external platforms (Rebrickable, BrickLink Studio) by providing a URL. The backend fetches the page HTML, parses it to extract metadata (title, description, author, parts count, images, etc.), and returns structured data to the frontend for use in MOC creation flows.

The AWS Lambda handler (`apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/handler.ts`) implements this functionality with:
- URL validation and platform detection
- HTML fetching with timeout (10s)
- HTML parsing using cheerio
- In-memory rate limiting (10 requests/minute/user)
- In-memory caching (1 hour TTL)

This story migrates the import functionality to Vercel serverless functions while reusing the existing parser implementations.

## Goal

Migrate the `POST /api/mocs/import-from-url` endpoint to Vercel serverless functions, enabling users to import MOC/Set metadata from Rebrickable and BrickLink Studio URLs.

## Non-Goals

- Redis-based rate limiting (use in-memory for MVP)
- Redis-based caching (use in-memory for MVP)
- Database persistence (this endpoint only returns parsed data, does not persist)
- Frontend integration (frontend already consumes this endpoint)
- Adding new external platform support
- Modifying existing parser logic

## Scope

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/mocs/import-from-url` | Import metadata from external URL |

### Supported Platforms

| Platform | URL Pattern | Parser |
|----------|-------------|--------|
| Rebrickable MOC | `rebrickable.com/mocs/MOC-{id}/...` | `rebrickable-moc.ts` |
| Rebrickable Set | `rebrickable.com/sets/{number}/...` | `rebrickable-set.ts` |
| BrickLink Studio | `bricklink.com/v3/studio/design.page?idModel={id}` | `bricklink-studio.ts` |

### Apps/Packages Affected

| Path | Change Type |
|------|-------------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE |
| `__http__/mocs.http` | UPDATE (add import tests) |

### Files Reused (No Changes)

| Path | Purpose |
|------|---------|
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` | Zod schemas, platform detection |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/*.ts` | HTML parsers |

## Acceptance Criteria

- [ ] **AC-1:** POST `/api/mocs/import-from-url` with valid Rebrickable MOC URL returns 200 with parsed metadata including title, source platform, and images array
- [ ] **AC-2:** POST `/api/mocs/import-from-url` with valid Rebrickable Set URL returns 200 with parsed metadata including title, setNumber, and source platform
- [ ] **AC-3:** POST `/api/mocs/import-from-url` with valid BrickLink Studio URL returns 200 with parsed metadata including title, designer info, and source platform
- [ ] **AC-4:** POST `/api/mocs/import-from-url` with missing/invalid URL returns 400 with clear error message
- [ ] **AC-5:** POST `/api/mocs/import-from-url` with unsupported platform URL returns 400 with message "URL not supported. We support Rebrickable and BrickLink URLs"
- [ ] **AC-6:** POST `/api/mocs/import-from-url` with non-existent MOC URL (404 from external) returns 404 with message "Could not find a MOC at this URL"
- [ ] **AC-7:** Rate limiting enforced: 10 requests per minute per user. 11th request returns 429 with "Too many imports" message
- [ ] **AC-8:** Cache hit: Same URL requested twice within 1 hour returns cached result without external fetch
- [ ] **AC-9:** Unauthenticated request (AUTH_BYPASS=false) returns 401 Unauthorized
- [ ] **AC-10:** URL length validated: URLs longer than 2000 characters return 400

**Rate Limiting Note:** Rate limiting is per-serverless-instance (in-memory). Users may exceed 10/min if requests hit different instances. This is acceptable for MVP.

**Cache Note:** Cache is in-memory per-instance with 1-hour TTL. Cache misses may occur if requests hit different instances. This is acceptable for MVP.

## Reuse Plan

### Packages Used

| Package | Purpose |
|---------|---------|
| `@repo/logger` | Structured logging |
| `cheerio` | HTML parsing (transitive via parsers) |

### Code Reused

| Source | Purpose |
|--------|---------|
| `aws/endpoints/moc-instructions/import-from-url/types.ts` | `ImportFromUrlRequestSchema`, `detectPlatform()`, `getPlatformDisplayName()` |
| `aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc.ts` | `parseRebrickableMoc()` |
| `aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set.ts` | `parseRebrickableSet()` |
| `aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio.ts` | `parseBrickLinkStudio()` |

### New Shared Packages

None required. All reusable code already exists.

## Architecture Notes (Ports & Adapters)

### Core Logic (Reused)

- **Platform Detection:** `detectPlatform(url)` - determines which parser to use
- **HTML Parsers:** Platform-specific cheerio-based parsers extract metadata

### Adapter (Vercel)

- **Handler:** `apps/api/platforms/vercel/api/mocs/import-from-url.ts`
  - Receives VercelRequest
  - Validates auth (AUTH_BYPASS pattern)
  - Validates request body (Zod schema)
  - Checks rate limit (in-memory)
  - Checks cache (in-memory)
  - Fetches external URL
  - Calls appropriate parser
  - Caches result
  - Returns VercelResponse

### Diagram

```
VercelRequest
    │
    ▼
┌─────────────────────────┐
│   import-from-url.ts    │ ◄── Vercel Adapter
│   (auth, rate limit,    │
│    cache, fetch)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   detectPlatform()      │ ◄── Core (types.ts)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   parsers/*.ts          │ ◄── Core (cheerio parsers)
│   - rebrickable-moc     │
│   - rebrickable-set     │
│   - bricklink-studio    │
└───────────┬─────────────┘
            │
            ▼
VercelResponse
```

## Required Vercel / Infra Notes

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_BYPASS` | For dev | Skip auth in local development |
| `DEV_USER_SUB` | For dev | Default user ID when AUTH_BYPASS=true |

### vercel.json

No changes required. Standard API route discovery.

### Dependencies

Ensure `cheerio` is available in `apps/api/package.json`. If not present, add it.

## HTTP Contract Plan

### Endpoint

```
POST /api/mocs/import-from-url
Content-Type: application/json

Request Body:
{
  "url": "https://rebrickable.com/mocs/MOC-12345/..."
}

Response (200):
{
  "success": true,
  "data": {
    "title": "...",
    "type": "moc" | "set",
    ...platform-specific fields
  },
  "images": [...],
  "warnings": [...],
  "source": {
    "platform": "rebrickable" | "bricklink",
    "url": "...",
    "externalId": "..."
  }
}
```

### Required `.http` Requests

Location: `/__http__/mocs.http`

| Request Name | Purpose |
|--------------|---------|
| `importFromUrl` | Happy path - Rebrickable MOC |
| `importFromUrlSet` | Happy path - Rebrickable Set |
| `importFromUrlBrickLink` | Happy path - BrickLink Studio |
| `importFromUrl400Missing` | Error - missing URL |
| `importFromUrl400Invalid` | Error - invalid URL format |
| `importFromUrl400Unsupported` | Error - unsupported platform |
| `importFromUrl404` | Error - non-existent MOC |
| `importFromUrl400TooLong` | Error - URL too long |

## Seed Requirements

**Not applicable.** This endpoint does not require database state. It fetches and parses external URLs without persistence.

## Test Plan (Happy Path / Error Cases / Edge Cases)

### Happy Path Tests

| ID | Test | Expected Result | Evidence |
|----|------|-----------------|----------|
| HP-1 | POST with valid Rebrickable MOC URL | 200, data.type="moc", source.platform="rebrickable" | HTTP response capture |
| HP-2 | POST with valid Rebrickable Set URL | 200, data.type="set", data.setNumber present | HTTP response capture |
| HP-3 | POST with valid BrickLink Studio URL | 200, source.platform="bricklink", designer info present | HTTP response capture |
| HP-4 | POST same URL twice (cache hit) | 200, faster response, identical data | Two HTTP responses with timestamps |

### Error Cases

| ID | Test | Expected Result | Evidence |
|----|------|-----------------|----------|
| E-1 | POST with empty body `{}` | 400, "Please enter a valid URL" | HTTP response capture |
| E-2 | POST with `{ "url": "not-a-url" }` | 400, URL validation error | HTTP response capture |
| E-3 | POST with unsupported platform | 400, "URL not supported" | HTTP response capture |
| E-4 | POST with non-existent MOC URL | 404, "Could not find a MOC at this URL" | HTTP response capture |
| E-5 | 11th request within 1 minute | 429, "Too many imports" | Sequence of 11 HTTP responses |
| E-6 | POST without auth (AUTH_BYPASS=false) | 401 Unauthorized | HTTP response capture |
| E-7 | POST with malformed JSON | 400, "Invalid JSON body" | HTTP response capture |
| E-8 | POST with URL > 2000 chars | 400, URL too long error | HTTP response capture |

### Edge Cases

| ID | Test | Expected Result | Evidence |
|----|------|-----------------|----------|
| EC-1 | URL with query parameters | 200, correct externalId extracted | HTTP response capture |
| EC-2 | URL with/without trailing slash | 200, same externalId | Two HTTP responses |
| EC-3 | Uppercase domain (REBRICKABLE.COM) | 200, platform detected | HTTP response capture |

### Evidence Requirements

For QA verification:
1. All `.http` requests executed against `http://localhost:3001`
2. Full HTTP response captured (status, body)
3. Rate limit test: sequence of 11 requests with timestamps
4. Cache test: two requests showing timing difference

---

## Demo Script

### Setup

1. Start Vercel dev server: `pnpm vercel:dev`
2. Ensure `.env.local` has `AUTH_BYPASS=true`

### Steps

1. **Import Rebrickable MOC:**
   ```bash
   curl -X POST http://localhost:3001/api/mocs/import-from-url \
     -H "Content-Type: application/json" \
     -d '{"url": "https://rebrickable.com/mocs/MOC-29532/"}'
   ```
   Expected: 200 with MOC data

2. **Import Rebrickable Set:**
   ```bash
   curl -X POST http://localhost:3001/api/mocs/import-from-url \
     -H "Content-Type: application/json" \
     -d '{"url": "https://rebrickable.com/sets/75192-1/"}'
   ```
   Expected: 200 with Set data

3. **Test cache (repeat step 1):**
   Expected: 200, noticeably faster

4. **Test unsupported URL:**
   ```bash
   curl -X POST http://localhost:3001/api/mocs/import-from-url \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/page"}'
   ```
   Expected: 400, "URL not supported"

5. **Test missing URL:**
   ```bash
   curl -X POST http://localhost:3001/api/mocs/import-from-url \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   Expected: 400, validation error

---

## File Touch List

| File | Action |
|------|--------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | CREATE |
| `__http__/mocs.http` | UPDATE |
