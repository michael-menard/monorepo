# Dev Feasibility Review - WISH-2008: Authorization Layer Testing and Policy Documentation

## Feasibility Summary

**Feasible for MVP:** Yes

**Confidence:** High

**Why:**
- Authorization patterns already exist in codebase (Cognito JWT middleware)
- Database schema includes userId, createdBy, updatedBy audit fields (WISH-2000)
- All wishlist endpoints already implemented (WISH-2001, WISH-2002, WISH-2003, WISH-2041, WISH-2042)
- Story focuses on verification, testing, and documentation rather than new features
- Clear acceptance criteria with testable security scenarios
- No architectural changes required - leverage existing ports/adapters pattern

## Likely Change Surface (Core Only)

### Packages for Core Journey

1. **Backend - Wishlist Domain** (`apps/api/lego-api/domains/wishlist/`)
   - `routes.ts` - Verify auth middleware applied to all endpoints
   - `repositories.ts` - Audit all queries for userId WHERE clauses
   - `services.ts` - Verify userId extracted from JWT and passed to repository
   - **Estimated Changes:** Minor audits, no major refactoring expected

2. **Backend - Auth Middleware** (`apps/api/lego-api/middleware/` or `core/auth/`)
   - `auth.ts` - Cognito JWT validation middleware
   - Verify middleware extracts `sub` claim as userId
   - **Estimated Changes:** Documentation only, middleware likely already correct

3. **Backend - Observability** (`apps/api/lego-api/core/observability/`)
   - `logger.ts` - Add structured logging for 403/404 authorization failures
   - **Estimated Changes:** Add 5-10 log statements for audit trail

4. **Documentation** (`packages/backend/database-schema/docs/`)
   - `wishlist-authorization-policy.md` - New policy document
   - **Estimated Changes:** New file creation (~200 lines)

5. **Integration Tests** (`__http__/`)
   - `wishlist-authorization.http` - New test file with 20+ scenarios
   - **Estimated Changes:** New file creation (~400 lines)

### Endpoints for Core Journey

All 8 wishlist endpoints require authorization audit:
- `GET /api/wishlist` - List (verify userId filter in query)
- `GET /api/wishlist/:id` - Get (verify userId filter)
- `POST /api/wishlist` - Create (verify userId injected from JWT)
- `PATCH /api/wishlist/:id` - Update (verify userId filter)
- `DELETE /api/wishlist/:id` - Delete (verify userId filter)
- `PUT /api/wishlist/reorder` - Reorder (verify userId filter for all itemIds)
- `POST /api/wishlist/:id/purchased` - Purchase (verify userId filter)
- `GET /api/wishlist/images/presign` - Presign (verify S3 path includes userId)

### Critical Deploy Touchpoints

**No deployment changes required** - Story focuses on verification and testing:
- Authorization middleware already deployed
- Database queries already include userId (per existing stories)
- No schema migrations needed
- No infrastructure changes

**Testing Environment:**
- Local PostgreSQL with multi-user seed data
- Local S3 (MinIO or localstack) for presigned URL testing
- Valid Cognito JWT tokens for User A and User B

---

## MVP-Critical Risks

### Risk 1: Missing userId Filters in Database Queries
**Why it blocks MVP:** Critical security vulnerability - users could access/modify other users' data

**Required Mitigation:**
- Comprehensive code audit of all repository methods
- Verify every SELECT/UPDATE/DELETE includes `WHERE userId = ?`
- Add database-level foreign key constraints if missing
- Add unit tests to verify queries include userId filter

**Verification:** Code review + integration tests with cross-user access attempts

---

### Risk 2: S3 Presigned URL Path Isolation Gaps
**Why it blocks MVP:** Users could upload/access images in other users' S3 prefixes

**Required Mitigation:**
- Audit S3 presigned URL generation code
- Verify path format: `wishlist/{userId}/images/{filename}`
- Test cross-user S3 upload attempts
- Document S3 bucket policy requirements

**Verification:** Integration test attempting to upload to another user's prefix

---

### Risk 3: Inconsistent Auth Middleware Application
**Why it blocks MVP:** Some endpoints may lack authentication, allowing anonymous access

**Required Mitigation:**
- Verify all wishlist routes use auth middleware
- Test each endpoint without Authorization header (expect 401)
- Review route registration code for middleware consistency
- Add integration tests for unauthenticated requests

**Verification:** HTTP tests without Authorization header for all 8 endpoints

---

### Risk 4: JWT Sub Claim Extraction Errors
**Why it blocks MVP:** userId mismatch could allow cross-user access or break ownership verification

**Required Mitigation:**
- Verify JWT middleware extracts `sub` claim correctly
- Verify `sub` claim maps to database userId column
- Add unit tests for JWT parsing edge cases (missing sub, malformed token)
- Document JWT-to-userId mapping in policy doc

**Verification:** Unit tests + integration tests with valid/invalid JWT tokens

---

### Risk 5: Audit Logging Blind Spots
**Why it blocks MVP:** Security incidents cannot be investigated without audit trails

**Required Mitigation:**
- Add structured logging for all 403/404 authorization failures
- Include: timestamp, userId (if authenticated), itemId, endpoint, action
- Verify logs written to CloudWatch or equivalent
- Test log output for unauthorized access attempts

**Verification:** Integration test + verify log entries in CloudWatch

---

## Missing Requirements for MVP

### Missing Requirement 1: Error Response Format Decision
**Decision Needed:** Should cross-user access return 403 Forbidden or 404 Not Found?

**Options:**
- **403 Forbidden:** More explicit - "You don't have permission"
- **404 Not Found:** More secure - doesn't reveal item exists (prevents enumeration)

**Recommendation:** Use 404 Not Found to prevent information leakage

**PM Must Document:**
```
Cross-user access attempts (GET/PATCH/DELETE on another user's item) return 404 Not Found
instead of 403 Forbidden to prevent item ID enumeration attacks. The backend logs a 403
internally for audit purposes but returns 404 to the client.
```

---

### Missing Requirement 2: Reorder Endpoint Authorization Behavior
**Decision Needed:** If user attempts to reorder items including other users' IDs, should endpoint:
- A) Return 403 Forbidden and reject entire request
- B) Silently filter out unauthorized IDs and reorder only user's items
- C) Return 400 Bad Request with "Invalid item IDs" message

**Recommendation:** Option C - Return 400 with clear error message

**PM Must Document:**
```
PUT /api/wishlist/reorder validates that all itemIds in payload belong to the authenticated
user. If any itemId is missing or belongs to another user, the endpoint returns 400 Bad
Request with error message: "One or more item IDs are invalid or do not belong to you."
```

---

### Missing Requirement 3: Concurrent Request Race Condition Handling
**Decision Needed:** How should concurrent updates to same item be handled?

**Options:**
- A) Last-write-wins (no optimistic locking)
- B) Optimistic locking with version field (return 409 Conflict)
- C) Database-level row locking (pessimistic)

**Recommendation:** Option A (last-write-wins) for MVP simplicity

**PM Must Document:**
```
Concurrent PATCH requests to the same wishlist item use last-write-wins semantics.
The updatedAt timestamp reflects the last successful update. Optimistic locking
with version fields is deferred to Phase 2 (WISH-XXXX).
```

---

## MVP Evidence Expectations

### Code Review Evidence
- [ ] All repository methods audited for userId WHERE clauses
- [ ] All routes verified to use auth middleware
- [ ] JWT middleware reviewed for sub claim extraction
- [ ] S3 presigned URL code reviewed for path isolation
- [ ] Audit logging added for 403/404 authorization failures

### Test Evidence
- [ ] `.http` file with 20+ authorization scenarios created
- [ ] Unit tests: 10+ authorization middleware tests pass
- [ ] Integration tests: 20+ endpoint ownership tests pass
- [ ] Security tests: 6+ cross-user access attempts (expect 404/403)
- [ ] Concurrent request tests: 2+ scenarios verified

### Documentation Evidence
- [ ] Security policy document created (`wishlist-authorization-policy.md`)
- [ ] Policy includes: ownership model, auth rules, audit logging, S3 isolation
- [ ] Decision log updated with error response format, reorder behavior, concurrency

### Critical CI/Deploy Checkpoints
- [ ] TypeScript compilation passes
- [ ] ESLint passes (no new violations)
- [ ] All unit tests pass (10+ new authorization tests)
- [ ] All integration tests pass (20+ new endpoint tests)
- [ ] Code review approved (security-focused review required)
- [ ] QA verification complete (manual security testing)

---

## Non-MVP Considerations (Future Work)

Deferred to separate file: `_pm/FUTURE-RISKS.md`
