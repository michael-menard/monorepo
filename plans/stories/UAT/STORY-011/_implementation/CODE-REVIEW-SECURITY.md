# Security Review: STORY-011

## Result: PASS

## Files Reviewed

### Vercel API Handlers (Primary Security Focus)
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/index.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id].ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/stats/by-category.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts`

### Core Package
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/index.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__types__/index.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/get-moc.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/list-mocs.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts`

### Seed Data
- `/Users/michaelmenard/Development/Monorepo/apps/api/core/database/seeds/mocs.ts`

## Critical Issues (immediate fix required)

None

## High Issues (must fix before merge)

None

## Medium Issues (should fix)

1. **Search input not escaped for SQL wildcards** - `apps/api/platforms/vercel/api/mocs/index.ts:125`
   - **Description**: The search term is used directly in ILIKE pattern (`%${search}%`) without escaping SQL wildcards (`%`, `_`). A user searching for literal `%` or `_` characters will get unexpected results.
   - **Risk**: Low - This is a functional issue rather than a security vulnerability. ILIKE is parameterized so SQL injection is not possible, but search behavior may be unexpected.
   - **Remediation**: Consider escaping `%` and `_` characters in the search term:
     ```typescript
     const escapedSearch = search.replace(/[%_]/g, '\\$&')
     const searchPattern = `%${escapedSearch}%`
     ```
   - **Note**: This matches the existing pattern in `gallery/images/search.ts` (line 95), so this is a pre-existing pattern in the codebase. Addressing this would be a broader refactor across all search handlers.

2. **Error messages expose internal details** - Multiple handlers
   - **Description**: Error responses include the raw error message from exceptions (e.g., `error instanceof Error ? error.message : 'Unknown error'`). In production, database error messages could expose schema details or connection information.
   - **Locations**:
     - `apps/api/platforms/vercel/api/mocs/index.ts:198`
     - `apps/api/platforms/vercel/api/mocs/[id].ts:205`
     - `apps/api/platforms/vercel/api/mocs/stats/by-category.ts:157`
     - `apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts:113`
   - **Risk**: Low - This matches the existing pattern in gallery handlers (e.g., `gallery/images/search.ts:171`). The messages are logged separately via `@repo/logger`.
   - **Remediation**: Consider returning a generic error message in production while keeping detailed logging. This would be a broader change affecting all handlers.

## Checks Performed

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded secrets | PASS | DATABASE_URL, AUTH_BYPASS, DEV_USER_SUB all read from environment |
| No SQL injection | PASS | All queries use Drizzle ORM with parameterized queries; JSONB operations properly parameterized |
| No XSS vulnerabilities | PASS/N/A | Backend API only, no HTML rendering |
| Auth checks present | PASS | Protected endpoints return 401 when no valid token; ownership checks in place |
| Input validation | PASS | UUID validation with regex, pagination params validated, Zod schemas for data validation |
| No sensitive data logging | PASS | Only non-sensitive fields logged (userId, mocId, page, limit); no passwords/tokens logged |

## Security Analysis Details

### Authentication & Authorization

1. **Auth Bypass Pattern**: Uses `AUTH_BYPASS` environment variable for local development, consistent with existing handlers (`gallery/images/search.ts`). This is appropriate for dev-only use.

2. **Protected Routes**:
   - `GET /api/mocs` - Requires authentication (returns 401 without valid token) - **CORRECT**
   - `GET /api/mocs/stats/by-category` - Requires authentication - **CORRECT**
   - `GET /api/mocs/stats/uploads-over-time` - Requires authentication - **CORRECT**
   - `GET /api/mocs/:id` - Allows anonymous for published MOCs, owner-only for drafts - **CORRECT**

3. **Authorization (User Data Scoping)**:
   - List MOCs: Filters by `eq(mocInstructions.userId, userId)` - User can only see their own MOCs
   - Stats endpoints: Both filter by `eq(mocInstructions.userId, userId)` - User can only see stats for their own MOCs
   - Get MOC: Ownership check at lines 141-153 in `[id].ts` - Returns 404 for non-owner accessing non-published content (prevents existence leak)

### SQL Injection Prevention

All database queries use Drizzle ORM with parameterized queries:
- `eq(mocInstructions.userId, userId)` - Parameterized equality check
- `ilike(mocInstructions.title, searchPattern)` - Parameterized ILIKE
- `sql\`${mocInstructions.tags} @> ${JSON.stringify([tag])}::jsonb\`` - Parameterized JSONB containment (line 136 of index.ts)
- UUID regex validation before database query prevents invalid input from reaching the database

### Input Validation

1. **UUID Validation**: `[id].ts:110` validates UUID format with regex before querying, returns 404 for invalid format (same as not found, prevents enumeration)
2. **Pagination Validation**: `index.ts:101-112` validates page >= 1, limit >= 1 and <= 100, returns 422 for invalid params
3. **Zod Runtime Validation**: Core package uses Zod schemas for runtime validation of response data (`MocDetailSchema.parse()`, `ListMocsResponseSchema.parse()`, etc.)

### Data Exposure

1. **No PII Logging**: Logger only receives non-sensitive data (userId, mocId, page, limit, counts)
2. **Ownership Flag**: Response includes `isOwner: boolean` but doesn't expose other users' IDs
3. **Draft/Archived Access**: Returns 404 (not 403) to prevent existence leak - explicitly noted in code comments

### Seed Data

Seed file uses:
- Fixed UUIDs for deterministic seeding
- No real credentials or secrets
- Example URLs (example.com) for thumbnails
- Appropriate for development/testing only

## Summary

- Critical: 0
- High: 0
- Medium: 2 (both are pre-existing patterns in the codebase, not regressions)

---

**SECURITY PASS**

All blocking security checks pass. The implementation follows established security patterns from the existing gallery handlers. The two medium issues identified are consistent with existing codebase patterns and would require broader refactoring to address across all handlers.
