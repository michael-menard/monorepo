# Security Review: STORY-014

## Result: PASS

## Files Reviewed
- `apps/api/platforms/vercel/api/mocs/import-from-url.ts` (CREATE - ~380 LOC)
- `apps/api/platforms/vercel/vercel.json` (MODIFY - route config)
- `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` (imported validation logic)
- `__http__/mocs.http` (MODIFY - test file, no security impact)

## Critical Issues (immediate fix required)
None

## High Issues (must fix before merge)
None

## Medium Issues (should fix)

1. **SSRF Risk Partially Mitigated** (`import-from-url.ts:101-133`)
   - **Description:** The `fetchHtml()` function fetches arbitrary URLs provided by users. While platform detection (`detectPlatform`) validates the URL matches known patterns (rebrickable.com, bricklink.com), the actual fetch uses the original user-supplied URL, not a reconstructed URL.
   - **Current Mitigation:** Platform detection via regex limits to known domains (rebrickable.com, bricklink.com). Only URLs matching these patterns proceed to fetch.
   - **Risk:** Low - an attacker would need to find open redirects on rebrickable.com or bricklink.com to exploit SSRF.
   - **Recommendation (defense-in-depth):** Consider reconstructing the URL from the parsed `externalId` and known base URLs instead of using the user-provided URL directly. Example: `https://rebrickable.com/mocs/${externalId}/` instead of raw user input.

2. **AUTH_BYPASS Pattern for Development** (`import-from-url.ts:87-92`)
   - **Description:** The `AUTH_BYPASS=true` environment variable completely bypasses authentication, returning a hardcoded dev user ID.
   - **Current Mitigation:** This is a documented pattern for local development only. The env variable should never be set in production.
   - **Risk:** Low - relies on deployment configuration being correct.
   - **Recommendation:** Add explicit check that this pattern is disabled in production (e.g., check `NODE_ENV !== 'production'`).

3. **In-Memory Rate Limiting Per-Instance** (`import-from-url.ts:41-58`)
   - **Description:** Rate limiting uses an in-memory Map, which resets on each serverless function cold start and is not shared across instances.
   - **Current Mitigation:** Documented as a non-goal in the story; appropriate for current scale.
   - **Risk:** Low - attackers could exceed rate limits by hitting different instances.
   - **Recommendation:** Future story should consider distributed rate limiting (Redis/DynamoDB) for production scale.

## Checks Performed

| Check | Status |
|-------|--------|
| No hardcoded secrets | PASS |
| No SQL injection | PASS (N/A - no database queries) |
| No XSS vulnerabilities | PASS (N/A - API only, no HTML rendering) |
| Auth checks present | PASS |
| Input validation | PASS |
| No sensitive data logging | PASS |

## Detailed Findings

### Positive Security Implementations

1. **Input Validation (PASS)**
   - URL validated via Zod schema (`ImportFromUrlRequestSchema`) with `.url()` validator
   - URL length capped at 2000 characters (line 222-230)
   - Platform detection via regex ensures only known domains are fetched
   - Invalid JSON body is caught and returns generic error (lines 195-203)

2. **Authentication (PASS)**
   - Auth check happens before any processing (lines 155-164)
   - Returns 401 with generic message when not authenticated
   - No auth bypass in production (depends on env var not being set)

3. **Rate Limiting (PASS)**
   - Implemented per-user rate limiting (10 requests/minute) (lines 172-181)
   - Rate limit check happens after auth but before expensive operations
   - Returns 429 with user-friendly message

4. **Error Messages - No Information Disclosure (PASS)**
   - Error messages are generic and user-friendly (lines 118-120, 196-200, 206-213)
   - Parse errors don't expose internal details (lines 351-363)
   - Fetch failures don't expose internal error details (lines 125-130)

5. **Logging - No Sensitive Data (PASS)**
   - Logs only contain userId (line 166), URL (lines 238, 258, 352), and parsed metadata
   - No tokens, passwords, or PII logged
   - Error logging captures only error message, not stack traces with sensitive info

6. **Timeout Protection (PASS)**
   - External fetch has 10-second timeout via AbortController (lines 104-105)
   - Prevents slow-loris or hung connection attacks

7. **Method Restriction (PASS)**
   - Only POST method allowed (lines 141-149)
   - Returns 405 for other methods

### Non-Issues Reviewed

1. **Platform Detection Regex** - The regex patterns in `detectPlatform()` are safe:
   - They match specific domain patterns only
   - No ReDoS vulnerability (patterns are simple and bounded)

2. **Response Type Casting** - The `as unknown as Record<string, unknown>` cast (line 292) is for TypeScript only, doesn't affect runtime security

3. **vercel.json CORS Configuration** - CORS allows all origins (`"*"`), which is appropriate for a public API but worth noting

## Summary
- Critical: 0
- High: 0
- Medium: 3

---

**SECURITY PASS**

The implementation follows security best practices with proper input validation, authentication, rate limiting, and safe error handling. The medium issues identified are defense-in-depth improvements that do not represent immediate exploitable vulnerabilities. The SSRF risk is mitigated by the platform detection regex which restricts fetching to known, trusted domains only.
