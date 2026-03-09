# DEV-FEASIBILITY: STORY-014 - MOC Instructions Import

## Risk Assessment: LOW-MEDIUM

The import-from-url endpoint is a self-contained feature with well-defined external dependencies. The main risks are around rate limiting strategy and external service reliability.

---

## Code Surface Analysis

### Files to Create

| File | Purpose | Complexity |
|------|---------|------------|
| `apps/api/platforms/vercel/api/mocs/import-from-url.ts` | Main handler | Medium |

### Files to Reuse (No Changes)

| File | Purpose |
|------|---------|
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/types.ts` | Zod schemas, platform detection |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc.ts` | Rebrickable MOC parser |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set.ts` | Rebrickable Set parser |
| `apps/api/platforms/aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio.ts` | BrickLink Studio parser |

### Packages to Use

| Package | Purpose |
|---------|---------|
| `@repo/logger` | Logging |
| `cheerio` | HTML parsing (already a dependency of parsers) |

---

## Feasibility Concerns

### 1. Rate Limiting Strategy

**Concern:** The AWS handler uses in-memory rate limiting (`Map`), which resets on Lambda cold starts. This works for Lambda but is suboptimal.

**Decision for Vercel:** Use the same in-memory approach initially. This provides:
- Protection against rapid successive requests
- Acceptable behavior for single-instance dev/preview
- Same behavior as current AWS implementation

**Future Improvement (OUT OF SCOPE):** Redis-based rate limiting using `@repo/rate-limiter` package would provide cross-instance rate limiting but requires Redis infrastructure.

**Mitigation:** Document that rate limiting is per-instance. For production, consider using Vercel Edge Config or external Redis.

---

### 2. Cache Strategy

**Concern:** The AWS handler uses in-memory caching with 1-hour TTL. Same instance limitation as rate limiting.

**Decision for Vercel:** Keep in-memory cache. Benefits:
- Reduces external API calls
- Improves response time for repeated imports
- Acceptable for single-user dev scenarios

**Mitigation:** Same as rate limiting - document limitation, defer Redis caching to future story.

---

### 3. External Service Reliability

**Concern:** Rebrickable and BrickLink pages may change structure, breaking parsers.

**Mitigation:**
- Parsers already return `warnings` array for unparseable fields
- Graceful degradation - return partial data with warnings instead of hard failure
- Title defaults to "Untitled MOC/Set" if extraction fails

**No code changes needed** - existing parsers handle this well.

---

### 4. Import Path Resolution

**Concern:** The AWS handler uses `@/core/utils/responses` import alias. Vercel handlers typically use relative imports or package imports.

**Decision:** Vercel handler will:
- Import parsers using relative paths from AWS handler location
- Use `@repo/logger` for logging (consistent with other Vercel handlers)
- Implement response formatting inline (consistent with existing Vercel handlers pattern)

---

### 5. Authentication

**Concern:** AWS handler uses `@repo/lambda-auth` for auth extraction from API Gateway events. Vercel uses different auth pattern.

**Decision:** Follow established Vercel pattern:
```typescript
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null // No Cognito integration yet
}
```

This matches other Vercel handlers (e.g., `mocs/[id].ts`).

---

## Hidden Dependencies

### 1. cheerio Package

**Status:** Already used by parsers, should be in `apps/api` dependencies.

**Action:** Verify cheerio is available. If not, add to `apps/api/package.json`.

### 2. External Network Access

**Status:** Required for fetching Rebrickable/BrickLink pages.

**Action:** None - standard for serverless functions.

### 3. No Database Required

**Status:** This endpoint does NOT persist data - it only fetches and parses.

**Action:** None - no DB connection needed.

---

## Missing AC Candidates

### PM should consider adding:

1. **Timeout behavior:** Currently hardcoded to 10s. Should this be configurable via env var?
   - **Recommendation:** Keep hardcoded for MVP. Document in story.

2. **User-Agent string:** Currently hardcoded. Should this be configurable?
   - **Recommendation:** Keep hardcoded. Low risk.

3. **Maximum URL length:** No validation currently.
   - **Recommendation:** Add max length validation (2000 chars) to prevent abuse.

---

## Suggested Mitigations for AC

### AC: Rate Limiting

**Add to AC:** "Rate limiting is per-serverless-instance. Users may exceed 10/min if requests hit different instances. This is acceptable for MVP."

### AC: Caching

**Add to AC:** "Cache is in-memory per-instance with 1-hour TTL. Cache misses may occur if requests hit different instances."

### AC: Timeout

**Add to AC:** "External fetch timeout is 10 seconds. Requests exceeding this will fail with appropriate error."

---

## Change Surface Summary

| Area | Risk | Mitigation |
|------|------|------------|
| New Vercel handler | Low | Follow existing patterns |
| Parser reuse | None | Direct import, no changes |
| Rate limiting | Low | Document limitation |
| Caching | Low | Document limitation |
| Authentication | Low | Use established AUTH_BYPASS pattern |
| External services | Medium | Graceful degradation already implemented |

---

## Recommendation

**PROCEED** - Story is feasible as written with the following notes:

1. Document in-memory rate limiting/caching limitations
2. Add URL length validation (recommend max 2000 chars)
3. Keep timeout at 10s hardcoded
4. Reuse existing parsers without modification
