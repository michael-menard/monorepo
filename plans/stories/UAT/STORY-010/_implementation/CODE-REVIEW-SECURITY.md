# STORY-010: Security Review

**Date:** 2026-01-19
**Reviewer:** Claude Code (code-review-security agent)
**Story:** MOC Parts Lists Management

---

## Executive Summary

**SECURITY PASS**

The implementation demonstrates good security practices overall. All endpoints enforce authentication, proper authorization checks are in place, and input validation is consistently applied via Zod schemas. No Critical or High severity issues were identified.

---

## Files Reviewed

### API Handlers
1. `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/index.ts` (POST/GET)
2. `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id].ts` (PUT/DELETE)
3. `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/status.ts` (PATCH)
4. `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/parse.ts` (POST CSV)
5. `apps/api/platforms/vercel/api/user/parts-lists/summary.ts` (GET)

### Core Functions
6. `packages/backend/moc-parts-lists-core/src/create-parts-list.ts`
7. `packages/backend/moc-parts-lists-core/src/get-parts-lists.ts`
8. `packages/backend/moc-parts-lists-core/src/update-parts-list.ts`
9. `packages/backend/moc-parts-lists-core/src/update-parts-list-status.ts`
10. `packages/backend/moc-parts-lists-core/src/delete-parts-list.ts`
11. `packages/backend/moc-parts-lists-core/src/parse-parts-csv.ts`
12. `packages/backend/moc-parts-lists-core/src/get-user-summary.ts`
13. `packages/backend/moc-parts-lists-core/src/__types__/index.ts`

### Seed Data
14. `apps/api/core/database/seeds/moc-parts-lists.ts`

---

## Security Findings

### 1. Secrets & Credentials

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded API keys | PASS | No API keys found in code |
| No hardcoded passwords | PASS | No passwords found |
| No hardcoded tokens | PASS | No tokens found |
| No hardcoded connection strings | PASS | DATABASE_URL read from environment |
| No .env values committed | PASS | Environment variables accessed via process.env |

**Verdict:** PASS - All secrets are properly managed via environment variables.

---

### 2. Injection Vulnerabilities

| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | PASS | All queries use Drizzle ORM parameterized queries |
| Command Injection | PASS | No exec/spawn calls found |
| NoSQL Injection | N/A | PostgreSQL used (relational DB) |

**Evidence - SQL Safety:**
- All database operations use Drizzle ORM's query builder (e.g., `db.select()`, `db.insert()`, `db.update()`, `db.delete()`)
- Parameters are passed as typed values, not string interpolation
- Seed data uses Drizzle's `sql` template tag with proper parameterization

**Verdict:** PASS - No injection vectors identified.

---

### 3. XSS (Cross-Site Scripting)

| Check | Status | Notes |
|-------|--------|-------|
| dangerouslySetInnerHTML | PASS | Not used (backend-only code) |
| Direct DOM manipulation | PASS | Not applicable (API handlers) |
| Unescaped output | PASS | JSON responses only |

**Verdict:** PASS - Backend-only code, XSS not applicable.

---

### 4. Authentication & Authorization

| Check | Status | Notes |
|-------|--------|-------|
| Auth check on all protected routes | PASS | All handlers check `getAuthUserId()` |
| 401 returned for missing auth | PASS | Consistent across all handlers |
| MOC ownership verification | PASS | All MOC operations verify `moc.userId === userId` |
| Parts list ownership verification | PASS | Verifies `partsListId` belongs to `mocId` |
| User-scoped data access | PASS | Summary endpoint joins on `userId` |

**Evidence - Authorization Pattern:**
```typescript
// MOC ownership check (consistent across all handlers)
if (moc.userId !== userId) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'MOC not found' })
  return
}

// Parts list ownership check
if (existing.mocId !== mocId) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Parts list not found' })
  return
}
```

**Security Note (Positive):** The code correctly returns 404 (not 403) when a user attempts to access another user's MOC, preventing enumeration attacks.

**Verdict:** PASS - Proper authentication and authorization throughout.

---

### 5. Data Exposure

| Check | Status | Notes |
|-------|--------|-------|
| No sensitive data in logs | PASS | Logs contain only IDs and counts |
| No PII in error messages | PASS | Generic error messages used |
| Verbose error messages | MEDIUM | See finding below |

**Finding SEC-001 (Medium):**
- **Location:** All API handlers
- **Issue:** Error messages in 500 responses include `error.message` which could expose internal details
- **Example:**
  ```typescript
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  })
  ```
- **Risk:** Internal error messages (e.g., database connection errors, constraint violations) could leak implementation details
- **Recommendation:** Log the full error server-side but return a generic message to clients
- **Severity:** MEDIUM (defense-in-depth improvement, not immediately exploitable)

**Verdict:** PASS with recommendation for improvement.

---

### 6. Insecure Dependencies

| Check | Status | Notes |
|-------|--------|-------|
| Known vulnerable packages | NOT CHECKED | Requires npm audit |
| Untrusted imports | PASS | Standard ecosystem packages (drizzle-orm, zod, pg) |

**Verdict:** PASS (manual dependency check recommended separately).

---

### 7. Input Validation

| Check | Status | Notes |
|-------|--------|-------|
| Zod validation at API boundaries | PASS | All request bodies validated with Zod |
| UUID format validation | PASS | UUID regex validation on path params |
| String length limits | PASS | Title (200), description (2000), notes (5000) |
| Number validation | PASS | Quantity validated as positive integer |
| CSV row limit | PASS | MAX_ROWS = 10,000 enforced |
| CSV column validation | PASS | Required columns checked before processing |

**Evidence - Input Validation Schemas:**
```typescript
// CreatePartsListInputSchema
title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters')
description: z.string().max(2000).optional().nullable()
parts: z.array(PartInputSchema).optional()

// PartInputSchema
quantity: z.number().int().positive('Quantity must be a positive integer')

// CSV validation
const MAX_ROWS = 10000
const BATCH_SIZE = 1000
Quantity: z.string().regex(/^\d+$/, 'Quantity must be a positive integer')
```

**Finding SEC-002 (Low):**
- **Location:** `parse.ts` CSV parsing
- **Issue:** CSV parsing uses simple `.split(',')` which doesn't handle quoted fields containing commas
- **Example:** A part name like `"Brick, 2 x 4"` would parse incorrectly
- **Risk:** Data corruption, not security vulnerability
- **Severity:** LOW (functional issue, not security issue)

**Verdict:** PASS - Comprehensive input validation.

---

### 8. Additional Security Observations

#### 8.1 Auth Bypass Mode (Development Only)

**Location:** All API handlers - `getAuthUserId()` function
```typescript
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}
```

**Assessment:**
- This is an intentional development-only bypass
- Only active when `AUTH_BYPASS=true` environment variable is set
- Should never be enabled in production
- Returns `null` (triggers 401) when bypass is not enabled

**Recommendation:** Ensure deployment configuration never sets `AUTH_BYPASS=true` in production environments.

#### 8.2 Transaction Atomicity (Positive)

The CSV parse operation in the core package correctly uses database transactions for atomicity:
```typescript
await db.transaction(async tx => {
  await tx.delete(mocParts).where(...)
  // Insert new parts in batches
  await tx.insert(mocParts).values(partRecords)
  await tx.update(mocPartsLists).set(...)
})
```

This prevents partial data corruption if an error occurs mid-operation.

#### 8.3 Seed Data (Development Only)

**Location:** `apps/api/core/database/seeds/moc-parts-lists.ts`

**Assessment:**
- Fixed UUIDs used for deterministic testing (appropriate for seeds)
- Test user IDs are clearly marked as development-only
- No real credentials or sensitive data in seeds
- Uses parameterized SQL via Drizzle's `sql` template tag

**Verdict:** PASS - Seed data is appropriate for development/testing.

---

## Summary

| Category | Status |
|----------|--------|
| Secrets & Credentials | PASS |
| Injection Vulnerabilities | PASS |
| XSS | N/A (backend) |
| Authentication & Authorization | PASS |
| Data Exposure | PASS (with recommendation) |
| Insecure Dependencies | NOT CHECKED |
| Input Validation | PASS |

---

## Findings Summary

| ID | Severity | Category | Description | Status |
|----|----------|----------|-------------|--------|
| SEC-001 | MEDIUM | Data Exposure | Error messages may expose internals | Recommendation |
| SEC-002 | LOW | Input Validation | CSV parser doesn't handle quoted fields | Recommendation |

**Critical Issues:** 0
**High Issues:** 0
**Medium Issues:** 1 (non-blocking)
**Low Issues:** 1 (non-blocking)

---

## Recommendations (Non-Blocking)

1. **SEC-001:** Consider sanitizing error messages before returning to clients:
   ```typescript
   // Instead of:
   message: error instanceof Error ? error.message : 'Unknown error'

   // Use:
   message: 'An internal error occurred'
   // (while logging full error server-side)
   ```

2. **SEC-002:** For CSV parsing robustness, consider using a proper CSV parsing library (like `csv-parser` or `papaparse`) that handles quoted fields, though this is a functional improvement rather than a security requirement.

3. **Production Checklist:**
   - Verify `AUTH_BYPASS` is NOT set to `true` in production
   - Run `npm audit` to check for vulnerable dependencies
   - Ensure `DATABASE_URL` uses SSL in production

---

## Conclusion

**SECURITY PASS**

The STORY-010 implementation follows security best practices. All blocking security requirements are satisfied:
- No hardcoded secrets
- No injection vulnerabilities
- Proper authentication on all endpoints
- Proper authorization (ownership verification)
- Comprehensive input validation
- No sensitive data exposure in logs

The medium severity finding (SEC-001) is a defense-in-depth improvement and does not block the story. No Critical or High severity issues were identified.
