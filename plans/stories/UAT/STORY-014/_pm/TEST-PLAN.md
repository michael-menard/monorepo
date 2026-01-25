# TEST-PLAN: STORY-014 - MOC Instructions Import

## Overview

This test plan covers the migration of the `import-from-url` endpoint from AWS Lambda to Vercel serverless functions. The endpoint fetches MOC/Set data from external sources (Rebrickable, BrickLink) and parses HTML to extract metadata.

---

## Happy Path Tests

### HP-1: Import Rebrickable MOC URL

**Preconditions:**
- Vercel dev server running (`pnpm vercel:dev`)
- AUTH_BYPASS=true in .env.local
- Network access to rebrickable.com

**Steps:**
1. POST to `/api/mocs/import-from-url` with body:
   ```json
   { "url": "https://rebrickable.com/mocs/MOC-12345/..." }
   ```

**Expected:**
- 200 OK
- Response includes:
  - `success: true`
  - `data.title` (string)
  - `data.type: "moc"`
  - `source.platform: "rebrickable"`
  - `source.externalId: "MOC-12345"`
  - `images` array (may be empty)
  - `warnings` array (may be empty)

**Evidence:**
- HTTP response status + body captured

---

### HP-2: Import Rebrickable Set URL

**Preconditions:**
- Same as HP-1

**Steps:**
1. POST to `/api/mocs/import-from-url` with body:
   ```json
   { "url": "https://rebrickable.com/sets/75192-1/millennium-falcon/" }
   ```

**Expected:**
- 200 OK
- Response includes:
  - `success: true`
  - `data.type: "set"`
  - `data.setNumber` (string)
  - `source.platform: "rebrickable"`
  - `images` array
  - `warnings` array

**Evidence:**
- HTTP response status + body captured

---

### HP-3: Import BrickLink Studio URL

**Preconditions:**
- Same as HP-1
- Network access to bricklink.com

**Steps:**
1. POST to `/api/mocs/import-from-url` with body:
   ```json
   { "url": "https://www.bricklink.com/v3/studio/design.page?idModel=123456" }
   ```

**Expected:**
- 200 OK
- Response includes:
  - `success: true`
  - `data.title` (string)
  - `source.platform: "bricklink"`
  - `source.externalId` (string)
  - `images` array
  - `designer` object (if available)

**Evidence:**
- HTTP response status + body captured

---

### HP-4: Cache Hit (Second Request Same URL)

**Preconditions:**
- HP-1 or HP-2 or HP-3 completed recently

**Steps:**
1. POST same URL again within cache window (1 hour)

**Expected:**
- 200 OK
- Response identical to first request
- Response time noticeably faster (no external fetch)

**Evidence:**
- Two HTTP response captures with timestamps

---

## Error Cases

### E-1: Missing URL in Body

**Steps:**
1. POST to `/api/mocs/import-from-url` with empty body: `{}`

**Expected:**
- 400 Bad Request
- Error message about missing/invalid URL

**Evidence:**
- HTTP response status + error body

---

### E-2: Invalid URL Format

**Steps:**
1. POST with body: `{ "url": "not-a-url" }`

**Expected:**
- 400 Bad Request
- Error message about invalid URL format

**Evidence:**
- HTTP response status + error body

---

### E-3: Unsupported Platform URL

**Steps:**
1. POST with body: `{ "url": "https://example.com/some-page" }`

**Expected:**
- 400 Bad Request
- Error message: "URL not supported. We support Rebrickable and BrickLink URLs"

**Evidence:**
- HTTP response status + error body

---

### E-4: External URL Returns 404

**Steps:**
1. POST with body: `{ "url": "https://rebrickable.com/mocs/MOC-99999999999/nonexistent/" }`

**Expected:**
- 404 Not Found
- Error message: "Could not find a MOC at this URL"

**Evidence:**
- HTTP response status + error body

---

### E-5: Rate Limit Exceeded

**Preconditions:**
- No rate limit state (fresh start or wait for window reset)

**Steps:**
1. Send 11 rapid requests with different URLs

**Expected:**
- First 10 requests: 200 OK (or appropriate error if URL invalid)
- 11th request: 429 Too Many Requests
- Error message about rate limiting

**Evidence:**
- Sequence of HTTP responses showing 429 on 11th request

---

### E-6: Authentication Required (No AUTH_BYPASS)

**Preconditions:**
- AUTH_BYPASS=false or unset

**Steps:**
1. POST to `/api/mocs/import-from-url` without authentication

**Expected:**
- 401 Unauthorized
- Error message about authentication required

**Evidence:**
- HTTP response status + error body

---

### E-7: Invalid JSON Body

**Steps:**
1. POST with malformed JSON: `{ url: "test" }` (missing quotes on key)

**Expected:**
- 400 Bad Request
- Error message about invalid JSON

**Evidence:**
- HTTP response status + error body

---

## Edge Cases

### EC-1: URL with Query Parameters

**Steps:**
1. POST with body: `{ "url": "https://rebrickable.com/mocs/MOC-12345/?ref=search" }`

**Expected:**
- 200 OK (query params should not affect platform detection)
- Correct platform/externalId extracted

**Evidence:**
- HTTP response with correct source.externalId

---

### EC-2: URL with Trailing Slash Variations

**Steps:**
1. POST with URL ending in `/`
2. POST with same URL without trailing `/`

**Expected:**
- Both return 200 OK
- Both extract same externalId

**Evidence:**
- Two HTTP responses with matching externalIds

---

### EC-3: External Service Timeout

**Note:** This is difficult to reliably test in local dev. Document expected behavior.

**Expected Behavior:**
- If external fetch times out (>10s), return 500 or 504
- Error message indicates timeout

**Evidence:**
- Manual observation or mocked test if available

---

### EC-4: Parse Failure (Malformed HTML)

**Note:** Requires external page to return unexpected HTML structure.

**Expected Behavior:**
- Return 200 with partial data
- `warnings` array contains parse failure notes
- Title defaults to "Untitled MOC" or similar

**Evidence:**
- Response showing warnings for unparseable fields

---

### EC-5: Case-Insensitive URL Detection

**Steps:**
1. POST with uppercase domain: `{ "url": "https://REBRICKABLE.COM/mocs/MOC-12345/" }`

**Expected:**
- 200 OK
- Platform correctly detected as rebrickable

**Evidence:**
- HTTP response with source.platform: "rebrickable"

---

## Required `.http` Requests

Location: `/__http__/mocs.http`

Required requests to add:
1. `importFromUrl` - Happy path Rebrickable MOC
2. `importFromUrlSet` - Happy path Rebrickable Set
3. `importFromUrlBrickLink` - Happy path BrickLink Studio
4. `importFromUrl400Missing` - Missing URL body
5. `importFromUrl400Invalid` - Invalid URL format
6. `importFromUrl400Unsupported` - Unsupported platform URL
7. `importFromUrl404` - Non-existent MOC URL
8. `importFromUrl401` - Unauthenticated (if testable)

---

## Evidence Requirements

For QA verification, capture:

1. **All HP tests:** Full HTTP request + response (status, headers, body)
2. **All E tests:** Full HTTP request + response showing error codes
3. **Rate limit test:** Sequence of 11 requests with timestamps
4. **Cache test:** Two requests with timestamps showing faster second response

---

## Test Environment Setup

1. Start Vercel dev server: `pnpm vercel:dev`
2. Ensure `.env.local` contains:
   - `AUTH_BYPASS=true`
   - `DEV_USER_SUB=dev-user-00000000-0000-0000-0000-000000000001`
3. Network access to external sites (rebrickable.com, bricklink.com)
4. Use HTTP client (VS Code REST Client, Insomnia, or curl) to execute requests
