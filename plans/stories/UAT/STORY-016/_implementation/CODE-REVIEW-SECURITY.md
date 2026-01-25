# Security Review: STORY-016

## Result: PASS

## Files Reviewed

### Core Package (TypeScript)
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/__types__/index.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/parts-list-parser.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/delete-moc-file.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/upload-parts-list.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/edit-presign.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/edit-finalize.ts`
- `/Users/michaelmenard/Development/Monorepo/packages/backend/moc-instructions-core/src/index.ts`

### Vercel Handlers
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/files/index.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts`
- `/Users/michaelmenard/Development/Monorepo/apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts`

### Supporting Utilities
- `/Users/michaelmenard/Development/Monorepo/apps/api/core/utils/filename-sanitizer.ts`

---

## Critical Issues (immediate fix required)

None

---

## High Issues (must fix before merge)

None

---

## Medium Issues (should fix)

### 1. Error Message Exposure in 500 Responses

**Files:**
- `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts` (line 386-389)
- `apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts` (line 214-217)
- `apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts` (line 337-340)
- `apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts` (line 282-285)
- `apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts` (line 431-434)

**Description:** Internal error messages are returned directly in 500 responses, which could expose internal implementation details to attackers.

**Example:**
```typescript
res.status(500).json({
  error: 'INTERNAL_ERROR',
  message: error instanceof Error ? error.message : 'Unknown error',
})
```

**Remediation:** Return a generic error message for 500 errors. Log the detailed error server-side only.

```typescript
res.status(500).json({
  error: 'INTERNAL_ERROR',
  message: 'An unexpected error occurred. Please try again later.',
})
```

**Severity:** Medium - Does not expose secrets, but could leak internal paths or database error details.

---

### 2. AUTH_BYPASS Pattern in Production Code

**Files:**
- `apps/api/platforms/vercel/api/mocs/[id]/files/index.ts` (lines 123-128)
- `apps/api/platforms/vercel/api/mocs/[id]/files/[fileId].ts` (lines 80-85)
- `apps/api/platforms/vercel/api/mocs/[id]/upload-parts-list.ts` (lines 140-145)
- `apps/api/platforms/vercel/api/mocs/[id]/edit/presign.ts` (lines 102-107)
- `apps/api/platforms/vercel/api/mocs/[id]/edit/finalize.ts` (lines 138-143)

**Description:** The `AUTH_BYPASS` environment variable allows skipping authentication. This is marked for local dev only, but if accidentally enabled in production, it would bypass all auth.

**Example:**
```typescript
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}
```

**Remediation:** Consider adding an environment check to prevent AUTH_BYPASS in production:

```typescript
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}
```

**Note:** This follows existing patterns in the codebase. The current implementation requires AUTH_BYPASS to be explicitly set, which provides defense-in-depth. This is a defense-in-depth improvement, not a blocking issue.

**Severity:** Medium - Requires explicit misconfiguration; existing pattern in codebase.

---

## Checks Performed

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded secrets | PASS | No API keys, passwords, or tokens in code. Credentials loaded from environment variables. |
| No SQL injection | PASS | Uses Drizzle ORM with parameterized queries. No raw SQL interpolation. |
| No XSS vulnerabilities | N/A | Backend-only story, no HTML rendering. |
| Auth checks present | PASS | All handlers check authentication before processing. Ownership checks validate `moc.userId === userId`. |
| Input validation | PASS | Zod schemas validate all inputs at API boundaries. UUID regex validation on path parameters. |
| No sensitive data logging | PASS | Logs contain only operational data (userId, mocId, fileCount). No passwords, tokens, or PII logged. |
| File upload validation | PASS | Size limits enforced (4MB/10MB). MIME type validation. Magic bytes validation. Filename sanitization. |
| Rate limiting | PASS | Rate limit checks present in presign and finalize endpoints. |
| S3 path validation | PASS | S3 keys constructed server-side using sanitized filenames and UUIDs. No client path traversal possible. |
| Authorization (ownership) | PASS | All operations verify `moc.userId === userId` before allowing access. |

---

## Security Controls Identified

### File Upload Hardening
1. **Size Limits:** 4MB per file for direct uploads, 10MB for parts lists
2. **MIME Type Validation:** Allowlist-based validation via `isMimeTypeAllowed()`
3. **Magic Bytes Validation:** Content validation using `@repo/file-validator`
4. **Filename Sanitization:** `sanitizeFilenameForS3()` strips control characters, normalizes unicode, removes path components, blocks Windows reserved names

### Authorization Controls
1. **Authentication:** All endpoints require authenticated user
2. **Ownership Verification:** All operations check `moc.userId === userId`
3. **File-MOC Association:** Delete operation verifies file belongs to the specified MOC

### Input Validation
1. **Zod Schemas:** All request bodies validated with Zod
2. **UUID Validation:** Path parameters validated against UUID regex
3. **Optimistic Locking:** `expectedUpdatedAt` prevents concurrent edit conflicts

### Rate Limiting
1. **Presign:** Rate limit check (no increment)
2. **Finalize:** Rate limit check and increment
3. **Daily Limits:** Per-user daily upload limits enforced

### S3 Security
1. **Server-Generated Keys:** S3 keys constructed server-side with UUIDs
2. **Edit Path Isolation:** Edit files stored in `/edit/` prefix until finalized
3. **Presigned URLs:** Time-limited presigned URLs for uploads
4. **Cleanup on Failure:** Best-effort cleanup of orphaned edit files

---

## Summary

- Critical: 0
- High: 0
- Medium: 2

---

## Conclusion

**SECURITY PASS**

The implementation demonstrates strong security practices:

1. **No injection vulnerabilities:** All database queries use Drizzle ORM with parameterized queries
2. **Strong input validation:** Comprehensive Zod schema validation at all API boundaries
3. **Proper authorization:** Consistent ownership checks across all endpoints
4. **File upload security:** Multi-layer validation (size, type, magic bytes, filename sanitization)
5. **Rate limiting:** Proper rate limit implementation to prevent abuse
6. **S3 path security:** Server-generated keys prevent path traversal attacks

The two medium issues identified are defense-in-depth improvements:
1. Error message sanitization in 500 responses
2. Additional production safeguard for AUTH_BYPASS

Neither issue represents an exploitable vulnerability in the current implementation.
