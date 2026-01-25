# Security Review: STORY-007

## Result: PASS

## Files Reviewed
- `packages/backend/gallery-core/src/__types__/index.ts`
- `packages/backend/gallery-core/src/get-image.ts`
- `packages/backend/gallery-core/src/list-images.ts`
- `packages/backend/gallery-core/src/search-images.ts`
- `packages/backend/gallery-core/src/flag-image.ts`
- `packages/backend/gallery-core/src/index.ts`
- `apps/api/platforms/vercel/api/gallery/images/[id].ts`
- `apps/api/platforms/vercel/api/gallery/images/index.ts`
- `apps/api/platforms/vercel/api/gallery/images/search.ts`
- `apps/api/platforms/vercel/api/gallery/images/flag.ts`
- `apps/api/core/database/seeds/gallery.ts`

## Critical Issues (immediate fix required)
None

## High Issues (must fix before merge)
None

## Medium Issues (should fix)

1. **Error Message Information Disclosure** (Multiple files: `[id].ts:146`, `index.ts:165`, `search.ts:171`, `flag.ts:185`)
   - **Description**: Database error messages are returned directly to the client in 500 responses: `message: error instanceof Error ? error.message : 'Unknown error'`. This could potentially expose internal database structure, query details, or system paths.
   - **Remediation**: Return a generic error message to clients while logging the full error server-side. Example: `message: 'An internal error occurred. Please try again later.'`

2. **Search Input Not Sanitized for ILIKE Special Characters** (`apps/api/platforms/vercel/api/gallery/images/search.ts:95`)
   - **Description**: The search pattern `%${search}%` is constructed directly with user input. While Drizzle ORM protects against SQL injection via parameterized queries, PostgreSQL ILIKE special characters (`%`, `_`, `\`) in user input are not escaped. This could lead to unexpected search behavior or performance issues with crafted patterns.
   - **Remediation**: Escape ILIKE special characters before building the pattern: `const escapedSearch = search.replace(/[%_\\]/g, '\\$&'); const searchPattern = \`%${escapedSearch}%\`;`

3. **AUTH_BYPASS Environment Flag** (All Vercel handler files)
   - **Description**: The `AUTH_BYPASS=true` mechanism bypasses authentication entirely. While documented as "for local dev," there's no additional safeguard to ensure this flag is never accidentally set in production.
   - **Remediation**: Consider adding an environment check that refuses to enable AUTH_BYPASS when `NODE_ENV=production` or when running on specific production domains/URLs.

## Checks Performed

| Check | Status |
|-------|--------|
| No hardcoded secrets | PASS |
| No SQL injection | PASS |
| No XSS vulnerabilities | PASS |
| Auth checks present | PASS |
| Input validation | PASS |
| No sensitive data logging | PASS |

### Detailed Security Analysis

#### 1. Secrets & Credentials
- **PASS**: No API keys, passwords, or tokens are hardcoded in the code
- `DATABASE_URL` is correctly read from environment variables (e.g., `[id].ts:42-43`)
- No `.env` values or secrets are committed to the code
- Seed file uses placeholder URLs (`https://example.com/...`) - no real credentials

#### 2. SQL Injection Protection
- **PASS**: All database queries use Drizzle ORM's parameterized queries
- `[id].ts:109`: Uses `eq(galleryImages.id, imageId)` - properly parameterized
- `index.ts:99-101`: Uses `and(eq(...), eq(...))` and `isNull()` - properly parameterized
- `search.ts:99-105`: Uses Drizzle's `ilike()` function and `sql` template literals with parameterized placeholders
- `flag.ts:134,145`: Uses `eq()` for all conditions - properly parameterized
- `gallery.ts` (seed): Uses Drizzle's `sql` template literals with `${variable}` interpolation which maps to parameterized queries

#### 3. XSS (Cross-Site Scripting)
- **PASS**: API returns JSON data only - no HTML rendering
- No use of `dangerouslySetInnerHTML` (backend API, not applicable)
- No direct DOM manipulation
- Response content type is implicitly JSON via `res.json()`

#### 4. Authentication & Authorization
- **PASS**: All endpoints check for authenticated user before processing requests
- `get-image.ts:99-105`: Core logic enforces ownership check with `if (image.userId !== userId)` returning FORBIDDEN error
- `[id].ts:70-75,116-122`: Handler validates auth then enforces ownership before returning image data
- `list-images.ts` & `index.ts:99-101`: All queries filter by `eq(galleryImages.userId, userId)` - users can only see their own images
- `search-images.ts` & `search.ts:100`: All search queries include `eq(galleryImages.userId, userId)` filter
- `flag-image.ts` & `flag.ts:110-115`: Validates auth, checks image exists, creates flag with authenticated userId

#### 5. Data Exposure
- **PASS**: Logs use structured logging with appropriate fields
- `[id].ts:124`: Logs `{ userId, imageId }` - no sensitive data
- `index.ts:148`: Logs `{ userId, page, limit, albumId, total }` - operational data only
- `search.ts:153`: Logs `{ userId, search, page, limit, total }` - search term logged (acceptable for debugging)
- `flag.ts:162`: Logs `{ userId, imageId, flagId }` - proper audit trail
- Error logging includes error messages but no stack traces or internal details in responses
- No passwords, tokens, or PII in logs

#### 6. Input Validation
- **PASS**: All endpoints validate input using Zod schemas or regex patterns
- UUID validation via regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `[id].ts:85-88`: Validates imageId format before query
- `index.ts:88-91`: Validates albumId format when provided
- `search.ts:81-85`: Validates search term is not empty after trim
- `flag.ts:40-43,118-123`: Uses Zod `FlagImageInputSchema` with UUID regex and max length (1000 chars for reason)
- Pagination params are sanitized with `Math.max(1, ...)` and `Math.min(100, ...)` to enforce bounds
- `__types__/index.ts`: Comprehensive Zod schemas for all data structures with proper constraints:
  - `ListImagesFiltersSchema`: page >= 1, limit 1-100
  - `SearchImagesFiltersSchema`: search min 1 char, page/limit bounds
  - `FlagImageInputSchema`: UUID regex, reason max 1000 chars

#### 7. Insecure Dependencies
- **N/A**: Cannot evaluate package versions from code review alone
- Imports use standard, well-maintained packages: `drizzle-orm`, `pg`, `zod`, `@vercel/node`, `@repo/logger`
- No known vulnerable patterns in dependency usage

#### 8. Additional Security Observations

**Positive Findings:**
- Proper HTTP method enforcement on all endpoints (405 for wrong methods)
- Conflict detection for flag duplicates using both application-level check AND database unique constraint (`gallery_flags_image_user_unique`)
- Rate limiting on pagination (max 100 items per page via `Math.min(100, ...)`)
- Proper use of Zod for runtime validation in both core logic and handlers
- Database connection pooling with limited connections (`max: 1`) prevents connection exhaustion
- Proper error discrimination with typed error codes (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `DB_ERROR`)

**Authorization Flow Verified:**
- GET `/api/gallery/images/:id`: Returns 403 if image belongs to different user
- GET `/api/gallery/images`: Only returns images where `userId = authenticated user`
- GET `/api/gallery/images/search`: Only searches within user's own images
- POST `/api/gallery/images/flag`: Creates flag record tied to authenticated user (any user can flag any image - correct for moderation use case)

**Seed Data Security:**
- Uses deterministic UUIDs for testing (not security sensitive)
- Uses placeholder URLs (`https://example.com/...`) - no real endpoints
- Properly creates test data for different user IDs to support authorization testing

## Summary
- Critical: 0
- High: 0
- Medium: 3

---

**SECURITY PASS**

All critical security controls are in place. The medium issues are defense-in-depth improvements that do not represent immediately exploitable vulnerabilities. The code properly implements:
- Authentication checks on all endpoints
- Authorization checks (ownership verification) for sensitive operations
- Parameterized queries via Drizzle ORM preventing SQL injection
- Input validation using Zod schemas and regex patterns
- Structured logging without sensitive data exposure
- Proper error handling with typed error codes
