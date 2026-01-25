# Security Review: STORY-012

## Result: PASS

## Files Reviewed

- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/gallery-images/index.ts` (NEW)
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/gallery-images/[galleryImageId].ts` (NEW)
- `/Users/michaelmenard/Development/Monorepo/apps/api/core/database/seeds/mocs.ts` (MODIFIED)
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/vercel.json` (MODIFIED)
- `/Users/michaelmenard/Development/Monorepo/__http__/mocs.http` (MODIFIED)

## Critical Issues (immediate fix required)

None

## High Issues (must fix before merge)

None

## Medium Issues (should fix)

1. **AUTH_BYPASS Production Safety** - `index.ts:96-101`, `[galleryImageId].ts:80-85`
   - **Description**: The `getAuthUserId()` function only checks `AUTH_BYPASS` environment variable. If `AUTH_BYPASS` is not set to `'true'`, it returns `null` (correctly returning 401). However, the code does not validate actual JWT tokens in production - it relies on external configuration to disable bypass.
   - **Risk**: Low. The code correctly rejects requests when `AUTH_BYPASS !== 'true'`, returning 401. Real JWT validation is handled by the Cognito infrastructure layer as documented in the story.
   - **Recommendation**: Consider adding a comment or assertion that validates the auth infrastructure is properly configured in production environments.

2. **Error Message Verbosity** - `index.ts:198-201`, `[galleryImageId].ts:177-181`
   - **Description**: Error handlers log the full error message and return a generic "INTERNAL_ERROR" response. This is correct behavior, but the logger output could expose internal details in logs.
   - **Risk**: Very Low. The user-facing response is generic. Logs are internal and should be access-controlled.
   - **Recommendation**: Ensure log aggregation has proper access controls in production.

## Checks Performed

| Check | Status |
|-------|--------|
| No hardcoded secrets | PASS |
| No SQL injection | PASS |
| No XSS vulnerabilities | PASS |
| Auth checks present | PASS |
| Input validation | PASS |
| No sensitive data logging | PASS |

## Detailed Security Analysis

### 1. Secrets & Credentials

**PASS** - No hardcoded secrets found.

- Database connection string read from `process.env.DATABASE_URL` (line 79 in both files)
- Auth bypass controlled by `process.env.AUTH_BYPASS` and `process.env.DEV_USER_SUB`
- No API keys, passwords, or tokens hardcoded

### 2. Injection Vulnerabilities

**PASS** - Drizzle ORM with parameterized queries used throughout.

- All database queries use Drizzle ORM's query builder (`eq()`, `and()`, etc.)
- UUID parameters validated with regex before use
- No string interpolation in SQL queries
- Example safe query pattern (index.ts:144-148):
  ```typescript
  await db
    .select({ id: mocInstructions.id, userId: mocInstructions.userId })
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
  ```
- Seed file (mocs.ts) uses parameterized `sql` template with Drizzle - values are properly escaped

### 3. XSS (Cross-Site Scripting)

**PASS/N/A** - Backend API only, no HTML rendering.

- All responses are JSON with proper `Content-Type`
- No `dangerouslySetInnerHTML` or DOM manipulation
- User input is not rendered in any template

### 4. Authentication & Authorization

**PASS** - Proper auth and ownership checks implemented.

**Authentication:**
- All endpoints check for authentication first (401 UNAUTHORIZED if not authenticated)
- `index.ts:121-125`, `[galleryImageId].ts:95-99`

**Authorization (Ownership Validation):**
- MOC ownership verified before any operation:
  - `index.ts:155-158` - GET gallery images requires MOC ownership
  - `index.ts:268-271` - POST link requires MOC ownership
  - `[galleryImageId].ts:142-145` - DELETE unlink requires MOC ownership
- Returns 403 FORBIDDEN when user doesn't own the MOC
- Cross-user gallery image linking is intentional per PM decision (documented in story)

### 5. Data Exposure

**PASS** - No sensitive data leaked.

- Error responses use generic codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`
- Internal errors logged with `logger.error()` but user sees only "Failed to [action]"
- No password, token, or PII logged
- Logger calls include only operational data: userId, mocId, galleryImageId, count

### 6. Insecure Dependencies

**PASS** - Standard, trusted packages used.

- `pg` - Official PostgreSQL driver
- `drizzle-orm/node-postgres` - Type-safe ORM
- `@repo/logger` - Internal logging package
- `@vercel/node` - Official Vercel types

### 7. Input Validation

**PASS** - Comprehensive input validation.

**UUID Format Validation:**
- MOC ID validated: `index.ts:135-138`, `[galleryImageId].ts:116-118`
- Gallery Image ID validated: `index.ts:248-251`, `[galleryImageId].ts:122-125`
- Uses strict UUID regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Invalid UUIDs return 400 VALIDATION_ERROR, not 404

**Request Body Validation:**
- JSON parsing with error handling: `index.ts:232-237`
- Required field check for `galleryImageId`: `index.ts:242-245`
- Type safety through TypeScript

**Entity Existence Validation:**
- MOC existence checked before operations
- Gallery image existence checked before linking
- Link existence checked before unlinking

## Cross-User Linking Security Note

The story explicitly permits cross-user gallery image linking (a user can link any gallery image to their MOC, not just images they own). This is an intentional design decision documented in:

- STORY-012.md Section 2: "PM Decision: Cross-User Gallery Linking"
- Non-Goals Section 4: "Gallery image ownership validation: Users can link any gallery image (not just their own)"

This is NOT a security vulnerability as:
1. Users can only modify their OWN MOCs (ownership validated)
2. Gallery images are read-only in this context (no modification to the linked image)
3. This enables "inspiration sharing" - referencing community images when documenting builds

## Summary

- Critical: 0
- High: 0
- Medium: 2 (informational, no action required)

---

**SECURITY PASS** - No Critical or High issues found. The implementation follows secure coding practices with proper authentication, authorization, input validation, and parameterized queries.
