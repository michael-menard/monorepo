# Scope - WISH-2008

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Auth middleware tests, rate limiting middleware, audit logging, security policy documentation |
| frontend | false | No UI changes - API layer enforcement only |
| infra | false | No infrastructure changes - uses existing Cognito, CloudWatch, PostgreSQL |

## Scope Summary

This story verifies and documents the authorization layer for all 8 wishlist endpoints. It adds comprehensive unit/integration tests, implements rate limiting middleware for brute-force protection, adds audit logging for 403/404 events, and creates security policy documentation. The authorization logic already exists and appears correct based on code review; the story creates a test safety net and operational documentation.

## Key Deliverables

1. **Auth Middleware Tests** (AC17, AC22)
   - 10+ unit tests for JWT parsing, validation, and error handling
   - 2 edge case tests for malformed Authorization headers

2. **Rate Limiting Middleware** (AC24)
   - New middleware at `apps/api/lego-api/middleware/rate-limit.ts`
   - 10 failures per 5-minute sliding window per IP
   - Returns 429 Too Many Requests with Retry-After header

3. **Audit Logging** (AC14)
   - Structured logging for 403/404 events
   - Includes userId, itemId, endpoint, HTTP method, timestamp

4. **Integration Tests** (AC3-13, AC16, AC18, AC23)
   - `__http__/wishlist-authorization.http` with 20+ scenarios
   - Cross-user access tests (expect 404)
   - Presigned URL expiration test

5. **Security Policy Documentation** (AC15, AC21)
   - `packages/backend/database-schema/docs/wishlist-authorization-policy.md`
   - Ownership model, authentication requirements, audit trail field documentation

## Files to Create/Modify

### New Files
- `apps/api/lego-api/middleware/__tests__/auth.test.ts`
- `apps/api/lego-api/middleware/__tests__/rate-limit.test.ts`
- `apps/api/lego-api/middleware/rate-limit.ts`
- `__http__/wishlist-authorization.http`
- `packages/backend/database-schema/docs/wishlist-authorization-policy.md`

### Modified Files
- `apps/api/lego-api/domains/wishlist/routes.ts` (add audit logging)
- `apps/api/lego-api/server.ts` (add rate limiting middleware)
