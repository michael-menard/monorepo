# Elaboration Report - WISH-2008

**Date**: 2026-01-28
**Verdict**: PASS

## Summary

Authorization layer testing and policy documentation story for wishlist endpoints passed elaboration review. All 20 acceptance criteria are well-defined for a verification-focused story. The authorization logic already exists in the codebase; the story's primary value is comprehensive testing, security policy documentation, audit logging implementation, and QA verification to ensure authorization checks prevent cross-user data access.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry exactly. Authorization testing and policy documentation for 8 wishlist endpoints as specified. No scope creep. |
| 2 | Internal Consistency | PASS | — | Goals/Non-goals/AC/Test Plan are consistent. AC covers all endpoints mentioned in scope. Test plan mirrors AC structure. |
| 3 | Reuse-First | PASS | — | Reuses existing @repo/logger for audit logging. Reuses existing Cognito JWT middleware from @repo/api-core. No new packages required. |
| 4 | Ports & Adapters | PASS | — | Story verifies existing architecture, no new code planned. Auth middleware is already an adapter. Repository userId filters are already in place. No business logic in routes (verified via code review). |
| 5 | Local Testability | PASS | — | AC 16 specifies `__http__/wishlist-authorization.http` with 20+ scenarios. AC 17-18 specify unit and integration tests. All tests are concrete and executable. |
| 6 | Decision Completeness | PASS | — | All 3 Open Questions have clear decisions. No TBDs or blocking design decisions. 404 vs 403 decision (Q1) is well-reasoned for security. |
| 7 | Risk Disclosure | PASS | — | All MVP-critical risks explicitly documented (5 risks: missing userId filters, S3 path isolation, inconsistent auth middleware, JWT extraction errors, audit logging blind spots). Mitigations specified. |
| 8 | Story Sizing | PASS | — | 20 ACs is high but acceptable for verification-focused story. Story is primarily code audit + tests + docs, not new features. Estimated 3 points. Backend-only (no frontend work). Single domain (wishlist). No split needed. |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | AC 14 requires CloudWatch log verification but no test automation specified | Low | Clarify that CloudWatch log verification is manual QA step (AC 20), not automated test requirement | RESOLVED |
| 2 | AC 2 mentions "Middleware extracts Cognito JWT sub claim as userId" but existing code uses verifyToken() from @repo/api-core which already does this | Low | Documentation-only: AC is verifying existing behavior, not implementing new behavior | RESOLVED |
| 3 | Story depends on WISH-2001 through WISH-2005 but repos.ts code review shows userId filters are already implemented for all endpoints | Low | Story is verification-focused (audit existing code) rather than implementation-focused. Dependencies are logical but not technical blockers. | RESOLVED |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | CloudWatch metrics not instrumented for authorization events | Out-of-scope | Separate infrastructure story, not blocking MVP |
| 2 | Load testing not included for authorization performance | Out-of-scope | Performance testing deferred to Phase 5 |
| 3 | createdBy/updatedBy audit trail fields lack documentation | Add as AC | New AC 21: Document that createdBy/updatedBy fields are for audit trail only, not authorization |
| 4 | Malformed Authorization header edge cases not covered in tests | Add as AC | New AC 22: Add 2 edge case tests for malformed headers (missing Bearer prefix, extra whitespace) |
| 5 | Presigned URL expiration testing not included | Add as AC | New AC 23: Add integration test verifying presigned URL returns 403 after 15-minute expiration |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Rate limiting not implemented for brute-force protection | Add as AC | New AC 24: Implement rate limiting middleware for 401/403 responses (10 failures per 5 minutes per IP) |
| 2 | Audit log viewer UI not included | Out-of-scope | Deferred to Phase 5 |
| 3 | CloudWatch alarms for authorization failures not configured | Out-of-scope | Infrastructure story, not blocking MVP |
| 4 | Log retention policy not defined | Out-of-scope | Deferred to Phase 5 governance |
| 5 | Penetration testing not included | Out-of-scope | Manual security testing sufficient for MVP |
| 6 | JWT token refresh handling not specified | Out-of-scope | Cognito handles JWT refresh automatically |
| 7 | Multi-factor authentication step-up not included | Out-of-scope | Deferred to Phase 4 security enhancements |
| 8 | OPA/Cedar policy engine not implemented | Out-of-scope | Over-engineered for MVP single-tenant ownership model |
| 9 | IP/geolocation logging for suspicious access patterns | Follow-up story | Create WISH-2XXX: Log IP address and country for 403/404 events to detect suspicious access patterns (Phase 5) |
| 10 | S3 versioning not implemented for audit trail | Skip | S3 lifecycle policies handle retention; versioning adds complexity without MVP value |

### Follow-up Stories Suggested

- [ ] WISH-2XXX: IP/Geolocation Logging (Phase 5) - Log IP address and country for 403/404 events to detect suspicious access patterns

### Items Marked Out-of-Scope

- **CloudWatch metrics for authorization events**: Separate infrastructure/observability story
- **Load testing for authorization layer**: Performance testing deferred to Phase 5
- **Audit log viewer UI**: Dashboard feature deferred to Phase 5
- **CloudWatch alarms for authorization failures**: Infrastructure monitoring story
- **Log retention policy governance**: Platform-wide policy decision for Phase 5
- **Penetration testing**: Manual security testing sufficient for MVP; formal pen testing deferred to pre-production
- **JWT token refresh handling**: Already managed by Cognito
- **Multi-factor authentication step-up**: Phase 4 security enhancement
- **OPA/Cedar policy engine**: Over-engineered for single-user MVP; deferred to multi-tenant phase
- **S3 versioning for audit trail**: Lifecycle policies sufficient; versioning skipped for MVP

## Additional Acceptance Criteria (User Decisions)

### AC 21: Audit Trail Field Documentation

**Add to story:** Document that `createdBy` and `updatedBy` fields are for audit trail only, not for authorization decisions.

**Requirement:** Create section in `wishlist-authorization-policy.md` (AC 15) explicitly stating:
- `createdBy` and `updatedBy` are read-only audit fields
- Authorization always uses `userId` foreign key, never `createdBy`
- Implications: Users cannot impersonate creators; only authenticated user can authorize own access

**Evidence:** Documentation section added and reviewed

---

### AC 22: Malformed Authorization Header Testing

**Add to story:** Extend AC 17 and AC 18 with 2 additional edge case tests for malformed headers.

**Test Cases:**
1. Authorization header missing "Bearer " prefix: `Authorization: {TOKEN}` → 401 Unauthorized
2. Authorization header with extra whitespace: `Authorization: Bearer  {TOKEN}` → 401 Unauthorized

**Expected:** Both cases return 401 Unauthorized with clear error messages

**Evidence:** Tests added to `apps/api/lego-api/middleware/__tests__/auth.test.ts`

---

### AC 23: Presigned URL Expiration Testing

**Add to story:** Extend AC 16 with integration test for presigned URL expiration.

**Test Case:**
```http
# Step 1: Request presigned URL
GET /api/wishlist/images/presign?filename=test.jpg&contentType=image/jpeg
Authorization: Bearer {USER_TOKEN}
Response: 200 OK with presigned URL (TTL: 15 minutes)

# Step 2: Immediately use presigned URL
PUT {PRESIGNED_URL}
Content-Type: image/jpeg
[binary image data]
Response: 200 OK - Upload succeeds

# Step 3: Wait 15+ minutes, then attempt to use expired presigned URL
PUT {PRESIGNED_URL}
Content-Type: image/jpeg
[binary image data]
Response: 403 Forbidden - URL expired
```

**Expected:** Presigned URL becomes unusable after 15-minute TTL expiration

**Evidence:** Integration test added to `__http__/wishlist-authorization.http`

---

### AC 24: Rate Limiting for Authorization Failures

**Add to story:** Implement rate limiting middleware for brute-force protection.

**Requirement:** Implement middleware that:
- Counts failed authentication/authorization attempts (401/403 responses) per IP address
- Enforces limit: 10 failures per 5-minute window per IP
- Returns 429 Too Many Requests after limit exceeded
- Logs rate limit violations with IP, attempted endpoint, and timestamp
- Applies to all API endpoints returning 401/403

**Configuration:**
- Window: 5 minutes sliding
- Max failures: 10 per IP per window
- Response: 429 with `Retry-After` header
- Log level: warn

**Implementation Location:** `apps/api/lego-api/middleware/rate-limit.ts`

**Test Coverage:**
- Unit tests: Rate limit counter increments on 401/403, resets on 200
- Unit tests: 429 returned after threshold exceeded
- Integration tests: Verify 10 failures → 429, verify window sliding
- Integration tests: Verify rate limit bypassed for 200/204 responses

**Evidence:** Middleware implemented, tests passing, applied to all routes

---

## Proceed to Implementation?

**YES** - Story may proceed to implementation.

All findings have been addressed:
- 4 new acceptance criteria added for identified gaps
- Enhancement opportunities appropriately scoped and tracked
- 1 follow-up story created for Phase 5 IP/geolocation logging
- Remaining items properly categorized as out-of-scope with clear justification

The story is now ready for development with 24 total acceptance criteria.
