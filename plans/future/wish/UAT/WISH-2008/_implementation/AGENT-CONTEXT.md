# Agent Context - WISH-2008 QA Verification

## Story Context

```yaml
schema: 1
story_id: WISH-2008
feature_dir: plans/future/wish
command: qa-verify-story
mode: qa-verification
phase: setup
base_path: plans/future/wish/UAT/WISH-2008/
artifacts_path: plans/future/wish/UAT/WISH-2008/_implementation/
created: 2026-01-30T19:22:00Z
previous_status: ready-for-qa
current_status: in-qa
```

## Acceptance Criteria Summary (24 total)

### Repository Audit (AC1)
- Verify all SELECT/UPDATE/DELETE queries include userId filters
- Already implemented in `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`

### Auth Middleware (AC2, AC6-8, AC17, AC22)
- All 8 routes use auth middleware (verified: `wishlist.use('*', auth)`)
- Unit tests for JWT parsing, expired tokens, invalid signatures
- Edge cases for malformed Authorization headers

### Cross-User Access Prevention (AC3-5, AC10-12)
- GET/PATCH/DELETE returns 404 for cross-user access
- Reorder validates all itemIds belong to user
- Purchase verifies item ownership

### POST Creates with User ID (AC9)
- Verify userId injected from JWT on creation

### S3 Presigned URLs (AC13, AC23)
- Path includes userId prefix
- Verify 403 after 15-minute expiration

### Audit Logging (AC14)
- Structured logging for 403/404 events

### Security Policy Document (AC15, AC21)
- Ownership model documentation
- Audit trail field documentation (createdBy/updatedBy)

### Test Suites (AC16, AC17, AC18)
- HTTP file with 20+ authorization scenarios
- 10+ auth middleware unit tests
- 20+ integration tests

### Code Review and QA (AC19, AC20)
- Security-focused code review
- Manual QA verification

### Rate Limiting (AC24)
- 10 failures per 5-minute window per IP
- Returns 429 with Retry-After header

## Key Files

### Auth Middleware
- `apps/api/lego-api/middleware/auth.ts`

### Wishlist Domain
- `apps/api/lego-api/domains/wishlist/routes.ts`
- `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`
- `apps/api/lego-api/domains/wishlist/application/services.ts`

### Tests
- `apps/api/lego-api/domains/wishlist/__tests__/services.test.ts` (existing)
- `apps/api/lego-api/middleware/__tests__/auth.test.ts` (to create)
- `apps/api/lego-api/middleware/__tests__/rate-limit.test.ts` (to create)
- `__http__/wishlist-authorization.http` (to create)

### Documentation
- `packages/backend/database-schema/docs/wishlist-authorization-policy.md` (to create)

## Dependencies

- @repo/api-core (verifyToken, isAuthBypassEnabled)
- @repo/logger (for audit logging)
- hono (web framework)
- drizzle-orm (database queries)
