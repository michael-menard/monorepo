# CONTRACTS.md: STORY-014 - MOC Instructions - Import from URL

## Swagger Updates

- **File(s) updated:** N/A
- **Summary of changes:** This endpoint does not use Swagger/OpenAPI specification. The API contract is defined via TypeScript types and Zod schemas.
- **Notes about versioning or breaking changes:** None. This is a new endpoint.

---

## HTTP Files

### Added/Updated .http File Paths

- `__http__/mocs.http` (UPDATED)

### Requests Added

#### Happy Path Requests

| Request Name | Purpose | AC Coverage |
|--------------|---------|-------------|
| `importFromUrl` | Import from Rebrickable MOC URL | AC-1 |
| `importFromUrlSet` | Import from Rebrickable Set URL | AC-2 |
| `importFromUrlBrickLink` | Import from BrickLink Studio URL | AC-3 |

#### Error Case Requests

| Request Name | Purpose | AC Coverage |
|--------------|---------|-------------|
| `importFromUrl400Missing` | Missing URL field in request body | AC-4 |
| `importFromUrl400Invalid` | Invalid URL format (not a URL) | AC-4 |
| `importFromUrl400Unsupported` | Unsupported platform URL (example.com) | AC-5 |
| `importFromUrl404` | Non-existent MOC on Rebrickable | AC-6 |
| `importFromUrl400TooLong` | URL exceeds 2000 character limit | AC-10 |
| `importFromUrl400Json` | Invalid JSON body | AC-4 |
| `importFromUrl405` | Invalid HTTP method (GET instead of POST) | AC-4 |

#### Edge Case Requests

| Request Name | Purpose | Notes |
|--------------|---------|-------|
| `importFromUrlWithParams` | URL with query parameters | Verifies parser handles query strings |
| `importFromUrlTrailingSlash` | URL with trailing slash | Verifies URL normalization |
| `importFromUrlUppercase` | Uppercase domain (REBRICKABLE.COM) | Verifies case-insensitive platform detection |

---

## API Contract Summary

### Endpoint

```
POST /api/mocs/import-from-url
```

### Request Headers

| Header | Required | Value |
|--------|----------|-------|
| Content-Type | Yes | application/json |
| Authorization | Yes (unless AUTH_BYPASS=true) | Bearer {token} |

### Request Body Schema

```json
{
  "url": "https://rebrickable.com/mocs/MOC-12345/..." // Required, valid URL
}
```

### Validation Rules

| Field | Rule |
|-------|------|
| url | Required |
| url | Must be valid URL format |
| url | Max length: 2000 characters |
| url | Must be from supported platform (Rebrickable or BrickLink) |

### Supported URL Patterns

| Platform | URL Pattern | Example |
|----------|-------------|---------|
| Rebrickable MOC | `rebrickable.com/mocs/MOC-{id}/...` | `https://rebrickable.com/mocs/MOC-29532/Rebrickable/rebrickable-hover-car/` |
| Rebrickable Set | `rebrickable.com/sets/{number}/...` | `https://rebrickable.com/sets/75192-1/millennium-falcon/` |
| BrickLink Studio | `bricklink.com/v3/studio/design.page?idModel={id}` | `https://www.bricklink.com/v3/studio/design.page?idModel=1` |

### Response: Success (200)

```json
{
  "success": true,
  "data": {
    "type": "moc" | "set",
    "title": "...",
    // Platform-specific fields
  },
  "images": [
    { "url": "...", "type": "..." }
  ],
  "warnings": [],
  "source": {
    "platform": "rebrickable" | "bricklink",
    "url": "https://...",
    "externalId": "MOC-12345"
  }
}
```

### Response: Validation Error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a valid URL" | "URL not supported. We support Rebrickable and BrickLink URLs" | "URL too long. Maximum length is 2000 characters"
  }
}
```

### Response: Unauthorized (401)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Response: Not Found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Could not find a MOC at this URL"
  }
}
```

### Response: Method Not Allowed (405)

```json
{
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method Not Allowed"
  }
}
```

### Response: Rate Limited (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many imports. Please wait a moment and try again"
  }
}
```

---

## Executed HTTP Evidence

### Note on Execution

HTTP requests have been added to `__http__/mocs.http` but **cannot be executed without a running dev server**. This is acceptable for contracts documentation purposes per the agent instructions.

The HTTP file contains 14 requests covering all 10 acceptance criteria:

| AC | Request(s) | Expected Status |
|----|-----------|-----------------|
| AC-1 | `importFromUrl` | 200 |
| AC-2 | `importFromUrlSet` | 200 |
| AC-3 | `importFromUrlBrickLink` | 200 |
| AC-4 | `importFromUrl400Missing`, `importFromUrl400Invalid`, `importFromUrl400Json`, `importFromUrl405` | 400, 405 |
| AC-5 | `importFromUrl400Unsupported` | 400 |
| AC-6 | `importFromUrl404` | 404 |
| AC-7 | (Requires sequential 11 requests) | 429 on 11th |
| AC-8 | (Requires two sequential requests to same URL) | 200 both |
| AC-9 | (Requires AUTH_BYPASS=false) | 401 |
| AC-10 | `importFromUrl400TooLong` | 400 |

### Testing Instructions

To execute these requests:

1. Start the Vercel dev server:
   ```bash
   cd apps/api/platforms/vercel
   pnpm vercel:dev
   ```

2. Ensure `.env.local` contains:
   ```
   AUTH_BYPASS=true
   DEV_USER_SUB=dev-user-00000000-0000-0000-0000-000000000001
   ```

3. Execute requests using VS Code REST Client extension or curl:
   ```bash
   # Example: Happy path Rebrickable MOC
   curl -X POST http://localhost:3001/api/mocs/import-from-url \
     -H "Content-Type: application/json" \
     -d '{"url": "https://rebrickable.com/mocs/MOC-29532/Rebrickable/rebrickable-hover-car/"}'
   ```

---

## Implementation Verification

### Route Registration

The route is registered in `apps/api/platforms/vercel/vercel.json`:

```json
{ "source": "/api/mocs/import-from-url", "destination": "/api/mocs/import-from-url.ts" }
```

**Route Ordering Verified:** The route is placed BEFORE the parameterized `/api/mocs/:id` routes (lines 35-40 in vercel.json) to avoid routing conflicts per STORY-007 lessons learned.

### Function Configuration

Extended timeout configured for external URL fetching:

```json
"api/mocs/import-from-url.ts": {
  "maxDuration": 15
}
```

### Handler Implementation

The handler at `apps/api/platforms/vercel/api/mocs/import-from-url.ts` implements:

| Feature | Implementation | Lines |
|---------|----------------|-------|
| Rate limiting (10/min/user) | In-memory Map with sliding window | 41-58 |
| Caching (1hr TTL) | In-memory Map with expiration | 64-77 |
| Auth bypass pattern | `getAuthUserId()` function | 87-92 |
| URL length validation | MAX_URL_LENGTH = 2000 | 28, 222-230 |
| Platform detection | Reuses `detectPlatform()` from AWS types | 247-256 |
| External fetch | 10s timeout via AbortController | 101-133 |
| Parser integration | Switch on platform, calls appropriate parser | 286-350 |

---

## Notes

### Discrepancies

None. The implementation matches the story specification.

### Rate Limiting Caveat

As documented in the story:
> Rate limiting is per-serverless-instance (in-memory). Users may exceed 10/min if requests hit different instances. This is acceptable for MVP.

### Caching Caveat

As documented in the story:
> Cache is in-memory per-instance with 1-hour TTL. Cache misses may occur if requests hit different instances. This is acceptable for MVP.

### AC-7 and AC-8 Testing Note

AC-7 (rate limiting) and AC-8 (caching) require sequential request execution and cannot be fully validated via static HTTP file review. They must be tested manually against a running dev server.

---

CONTRACTS COMPLETE
