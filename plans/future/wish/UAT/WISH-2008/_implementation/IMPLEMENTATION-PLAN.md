# Implementation Plan - WISH-2008

## Overview

WISH-2008 is a **verification and hardening story** that adds comprehensive authorization tests, rate limiting, audit logging, and security policy documentation for the wishlist feature. The core authorization logic already exists and works correctly; this story creates a safety net of tests and documentation.

## Implementation Order

### Phase 1: Auth Middleware Unit Tests (AC17, AC22)

**File:** `apps/api/lego-api/middleware/__tests__/auth.test.ts`

**Tests to implement (12 total):**
1. Valid JWT token - extracts sub claim as userId
2. Expired JWT token - returns 401
3. Invalid JWT signature - returns 401
4. Missing Authorization header - returns 401
5. Malformed JWT token - returns 401
6. JWT missing sub claim - returns 401
7. JWT with invalid sub format - returns 401
8. Middleware attaches userId to request context
9. Middleware calls next() on success
10. Middleware short-circuits on failure
11. (AC22) Authorization header missing "Bearer " prefix - returns 401
12. (AC22) Authorization header with extra whitespace - handles correctly

**Implementation Notes:**
- Mock `@repo/api-core` verifyToken function
- Use Hono's testClient for middleware testing
- Test both `auth` and `optionalAuth` middleware exports

### Phase 2: Rate Limiting Middleware (AC24)

**File:** `apps/api/lego-api/middleware/rate-limit.ts`

**Implementation:**
```typescript
// In-memory rate limiter (Redis version in WISH-2019)
// - Tracks 401/403 responses per IP
// - 10 failures per 5-minute sliding window
// - Returns 429 with Retry-After header
```

**Test File:** `apps/api/lego-api/middleware/__tests__/rate-limit.test.ts`

**Tests:**
1. Counter increments on 401 response
2. Counter increments on 403 response
3. Counter does NOT increment on 200/201/204 response
4. Returns 429 after 10 failures in 5 minutes
5. Response includes Retry-After header
6. Window slides correctly (old failures expire)
7. Different IPs tracked independently
8. Rate limit resets after window expires
9. Logs rate limit violations with structured format

**Integration:**
- Apply as global middleware in `server.ts`
- Must run AFTER route handlers to check response status

### Phase 3: Audit Logging (AC14)

**Implementation:**
- Add structured logging for 403/404 responses in wishlist routes
- Log fields: timestamp, userId, itemId, endpoint, HTTP method, statusCode

**File Modifications:**
- `apps/api/lego-api/domains/wishlist/routes.ts`

**Log Format:**
```json
{
  "level": "warn",
  "message": "Unauthorized wishlist access attempt",
  "userId": "user-a-id",
  "itemId": "456",
  "endpoint": "GET /wishlist/456",
  "statusCode": 404,
  "timestamp": "2026-01-29T12:00:00Z"
}
```

### Phase 4: Integration Tests (AC3-13, AC16, AC18, AC23)

**File:** `__http__/wishlist-authorization.http`

**Test Scenarios (20+ total):**

**Happy Path (8 tests):**
1. Authenticated user lists own items - 200
2. Authenticated user retrieves own item by ID - 200
3. Authenticated user creates item - 201
4. Authenticated user updates own item - 200
5. Authenticated user deletes own item - 204
6. Authenticated user reorders own items - 200
7. Authenticated user marks own item as purchased - 201
8. Authenticated user requests presigned URL - 200

**Cross-User Access Failures (6 tests):**
9. User A attempts GET User B's item - 404
10. User A attempts PUT User B's item - 404
11. User A attempts DELETE User B's item - 404
12. User A attempts reorder with User B's itemIds - 400
13. User A attempts purchase User B's item - 404
14. User A attempts presigned URL then uploads to User B's path - verify S3 path isolation

**Authentication Failures (4 tests):**
15. GET /wishlist without Authorization header - 401
16. POST /wishlist with expired token - 401
17. PUT /wishlist/:id with invalid signature - 401
18. DELETE /wishlist/:id with malformed token - 401

**Edge Cases (4 tests):**
19. User with no items returns empty array - 200
20. Concurrent PATCH requests to same item (last-write-wins)
21. (AC23) Presigned URL used after 15-minute expiration - 403
22. (AC22) Malformed Authorization header formats - 401

### Phase 5: Security Policy Documentation (AC15, AC21)

**File:** `packages/backend/database-schema/docs/wishlist-authorization-policy.md`

**Sections:**
1. **Ownership Model**
   - Single-user ownership via userId foreign key
   - Each wishlist item belongs to exactly one user

2. **Authentication Requirements**
   - Cognito JWT validation
   - Sub claim extraction as userId
   - Bearer token format

3. **Authorization Rules**
   - userId filters in all repository queries
   - 404 returned for cross-user access (prevents enumeration)
   - FORBIDDEN logged internally, NOT_FOUND returned externally

4. **Audit Trail Fields** (AC21)
   - createdBy and updatedBy are read-only audit fields
   - Authorization ALWAYS uses userId, NEVER createdBy
   - These fields track who created/modified records for debugging

5. **Audit Logging**
   - Structured logs for 403/404 events
   - CloudWatch integration

6. **S3 Path Isolation**
   - User-scoped prefixes: `wishlist/{userId}/images/`
   - Presigned URLs include userId from JWT

7. **Rate Limiting**
   - 10 failures per 5-minute window per IP
   - Returns 429 Too Many Requests

8. **Future Enhancements**
   - Role-based access control (admin users)
   - Audit log viewer UI
   - CloudWatch alarms

### Phase 6: Verification

**Run quality checks:**
```bash
# Type checking
pnpm check-types apps/api/lego-api

# Linting
pnpm lint apps/api/lego-api

# Unit tests
pnpm test apps/api/lego-api
```

## File Checklist

### New Files
- [ ] `apps/api/lego-api/middleware/__tests__/auth.test.ts` (12 tests)
- [ ] `apps/api/lego-api/middleware/__tests__/rate-limit.test.ts` (9 tests)
- [ ] `apps/api/lego-api/middleware/rate-limit.ts`
- [ ] `__http__/wishlist-authorization.http` (20+ scenarios)
- [ ] `packages/backend/database-schema/docs/wishlist-authorization-policy.md`

### Modified Files
- [ ] `apps/api/lego-api/domains/wishlist/routes.ts` (audit logging)
- [ ] `apps/api/lego-api/server.ts` (rate limiting middleware)

## Acceptance Criteria Mapping

| AC | Description | Implementation |
|----|-------------|----------------|
| AC1 | Repository userId filters | Code review (already implemented) |
| AC2 | Auth middleware on all routes | Verified: `wishlist.use('*', auth)` |
| AC3 | Cross-user GET returns 404 | Integration test #9 |
| AC4 | Cross-user PATCH returns 404 | Integration test #10 |
| AC5 | Cross-user DELETE returns 404 | Integration test #11 |
| AC6 | Unauthenticated returns 401 | Integration tests #15-18 |
| AC7 | Expired JWT returns 401 | Unit test #2, Integration test #16 |
| AC8 | Invalid signature returns 401 | Unit test #3, Integration test #17 |
| AC9 | POST creates with userId | Integration test #3, service test |
| AC10 | GET returns only user's items | Integration test #1 |
| AC11 | Reorder validates ownership | Integration test #12 |
| AC12 | Purchase verifies ownership | Integration test #13 |
| AC13 | Presigned URL has user path | Integration test #14 |
| AC14 | Audit logging for 403/404 | Routes modification |
| AC15 | Security policy document | Documentation file |
| AC16 | 20+ HTTP authorization tests | HTTP file |
| AC17 | 10+ middleware unit tests | auth.test.ts |
| AC18 | 20+ integration tests | HTTP file + service tests |
| AC19 | Security-focused code review | PR review |
| AC20 | QA verification | Manual testing |
| AC21 | Audit trail field docs | Documentation section |
| AC22 | Malformed header tests | Unit tests #11-12 |
| AC23 | Presigned URL expiration test | Integration test #21 |
| AC24 | Rate limiting middleware | rate-limit.ts + tests |

## Estimated Effort

- Phase 1 (Auth tests): 1-2 hours
- Phase 2 (Rate limiting): 2-3 hours
- Phase 3 (Audit logging): 30 minutes
- Phase 4 (Integration tests): 2-3 hours
- Phase 5 (Documentation): 1 hour
- Phase 6 (Verification): 30 minutes

**Total: 7-10 hours**
