---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WISH-20280

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline reality file found. Proceeding with codebase analysis and existing story documentation.

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Feature Flag Schedules (WISH-2119) | ready-for-qa | `apps/api/lego-api/domains/config/` | Schedule infrastructure complete, pending E2E tests |
| Admin Audit Log | completed | `apps/api/lego-api/domains/admin/` | Existing audit infrastructure for admin operations |
| Feature Flag Schema | completed | `packages/backend/database-schema/src/schema/feature-flags.ts` | Database schema includes `feature_flag_schedules` table |
| Admin Services | completed | `apps/api/lego-api/domains/admin/application/services.ts` | Audit logging patterns established |

### Active In-Progress Work

| Story | Phase | Status | Potential Overlap |
|-------|-------|--------|-------------------|
| WISH-2119 | Phase 3 | blocked (pending E2E tests) | Direct dependency - this story extends WISH-2119 |
| WISH-2124 | Phase 3 | uat | Redis infrastructure (unrelated) |

### Constraints to Respect

1. **WISH-2119 Dependency**: This story cannot proceed until WISH-2119 is complete (currently blocked pending E2E Playwright tests)
2. **Database Schema Changes**: Migration must be carefully coordinated with WISH-2119's existing schedule table
3. **Audit Pattern Consistency**: Must follow established patterns from admin domain audit infrastructure
4. **Hexagonal Architecture**: Must maintain ports & adapters pattern in config domain

---

## Retrieved Context

### Related Endpoints

**Existing Endpoints (WISH-2119):**
- `POST /api/admin/flags/:flagKey/schedule` - Creates schedule (needs audit logging)
- `GET /api/admin/flags/:flagKey/schedule` - Lists schedules (returns admin tracking fields)
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancels schedule (needs audit logging)

**Audit Infrastructure (Admin Domain):**
- Admin audit log repository pattern in `apps/api/lego-api/domains/admin/adapters/repositories.ts`
- Audit service integration in `apps/api/lego-api/domains/admin/application/services.ts`

### Related Components

**Schedule Infrastructure:**
- `apps/api/lego-api/domains/config/application/schedule-service.ts` - Schedule business logic
- `apps/api/lego-api/domains/config/adapters/schedule-repository.ts` - Database adapter
- `apps/api/lego-api/domains/config/routes.ts` - Admin schedule endpoints
- `apps/api/lego-api/domains/config/types.ts` - Schedule Zod schemas
- `apps/api/lego-api/jobs/process-flag-schedules.ts` - Cron job processor

**Audit Infrastructure:**
- `apps/api/lego-api/domains/admin/types.ts` - Audit log Zod schemas
- `apps/api/lego-api/domains/admin/application/services.ts` - Audit service patterns
- `apps/api/lego-api/domains/admin/adapters/repositories.ts` - AuditLogRepository implementation
- `packages/backend/database-schema/src/schema/admin-audit-log.ts` - Database schema

**Database Schema:**
- `packages/backend/database-schema/src/schema/feature-flags.ts` - Schedule table schema (needs columns: `created_by`, `cancelled_by`, `cancelled_at`)
- Existing audit table: `admin_audit_log` (structure: adminUserId, actionType, targetUserId, details, result, errorMessage, ipAddress, userAgent)

### Reuse Candidates

**Audit Logging Patterns:**
- `AuditLogRepository` interface from admin domain - create pattern for logging events
- Audit schema patterns: actionType, result, details (JSONB), adminUserId tracking
- Fire-and-forget audit logging (errors don't fail operations)
- CloudWatch structured logging via `@repo/logger`

**Service Layer Patterns:**
- Admin context extraction from JWT (established in admin routes)
- Constructor injection for audit repository
- Result type pattern (`Result<T, E>`) for error handling

**Database Patterns:**
- Drizzle ORM schema definitions
- Migration pattern with timestamp-based filenames
- Nullable columns for backward compatibility

---

## Knowledge Context

### Lessons Learned

**No lessons loaded** - baseline reality file not available. However, the existing story documentation (WISH-20280.md) provides comprehensive planning based on:
- WISH-2119 implementation patterns
- Admin domain audit infrastructure
- Previous follow-up story analysis from WISH-2119 QA

### Blockers to Avoid

From WISH-2119 Future Opportunities (Gap #5):
- **"No audit trail for schedule creators"** - This is the exact problem this story solves
- **Note**: Original story mentioned integrating with "WISH-2019 (audit logging)" but WISH-2019 was actually Redis caching, NOT audit logging

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: /api/v2/{domain}, Backend: /{domain} - applies to admin endpoints |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks - applies to audit logging tests |

**ADR-001 Compliance:**
- Admin schedule endpoints use `/api/admin/flags/:flagKey/schedule` pattern (already compliant)
- Audit logging is backend-only infrastructure (no frontend path changes)

**ADR-005 Compliance:**
- Integration tests must verify actual CloudWatch logs and database writes
- No mocking of audit service in integration tests

### Patterns to Follow

**From Existing Audit Infrastructure:**
1. **Fire-and-forget audit logging**: Audit failures should not block schedule operations
2. **Structured logging**: Use JSONB details field for flexible metadata
3. **Request context**: Track ipAddress and userAgent when available
4. **Result type pattern**: Use `Result<T, E>` for audit operations

**From Schedule Service (WISH-2119):**
1. **Service layer orchestration**: Schedule service calls audit repository before database commit
2. **Repository separation**: Keep audit logic separate from schedule repository
3. **Zod schemas first**: Define schemas before types
4. **Hexagonal architecture**: Audit logging is a port injected into service

### Patterns to Avoid

1. **Tight coupling**: Don't embed audit logic directly in route handlers - keep in service layer
2. **Blocking audit calls**: Never let audit failures block schedule operations
3. **Missing context**: Always pass admin user context from JWT to service layer

---

## Conflict Analysis

### Conflict: Misleading Dependency Reference
- **Severity**: Warning
- **Description**: Original story references "WISH-2019 (audit logging infrastructure)" but WISH-2019 is actually about Redis caching. The actual audit infrastructure exists in the admin domain (`apps/api/lego-api/domains/admin/` and `admin_audit_log` table). This is a documentation error, not a technical blocker.
- **Resolution**: Story seed corrects this misunderstanding. The audit patterns should be adapted from the admin domain, NOT from a non-existent WISH-2019 audit story. The story should either:
  1. Create a new lightweight audit service in `apps/api/lego-api/core/audit/` (as originally planned)
  2. OR reuse/extend the admin domain's audit repository for schedule events
- **Recommendation**: Option 1 (new audit service) is cleaner for separation of concerns. Schedule auditing is conceptually different from admin user management auditing.

---

## Story Seed

### Title
Audit Logging for Flag Schedule Operations

### Description

**Context:**
WISH-2119 implements scheduled flag updates with admin endpoints for creating, listing, and cancelling schedules. However, it lacks audit trail for admin actions - there's no record of which admin created or cancelled a schedule, creating accountability gaps for security audits and incident investigations.

The admin domain already provides audit logging infrastructure (`admin_audit_log` table, AuditLogRepository pattern) that tracks admin user management operations. This story extends similar patterns to flag schedule operations, providing security observability and compliance.

**Problem:**
- No database tracking of which admin created/cancelled schedules
- No structured CloudWatch logs for schedule operations
- No audit trail for cron job automatic schedule applications
- Security and compliance gap for incident investigations

**Proposed Solution:**
1. **Database Schema Updates**: Add `created_by`, `cancelled_by`, `cancelled_at` columns to `feature_flag_schedules` table
2. **Audit Logging Service**: Create lightweight audit logger in `apps/api/lego-api/core/audit/` for schedule events (separate from admin domain)
3. **Service Layer Integration**: Update schedule service to log events before database commits
4. **Cron Job Logging**: Log automatic schedule application/failure events
5. **Admin Context Flow**: Extract admin user from JWT claims → routes → service → database

### Initial Acceptance Criteria

**Database Schema:**
- [ ] AC1: Add admin tracking columns to `feature_flag_schedules` table (created_by, cancelled_by, cancelled_at)
- [ ] AC2: Migration script with nullable columns for backward compatibility
- [ ] AC3: Migration applied before code deployment

**Audit Logging Infrastructure:**
- [ ] AC4: Create audit logger service in `apps/api/lego-api/core/audit/`
- [ ] AC5: Define schedule event types: flag_schedule.created, flag_schedule.cancelled, flag_schedule.applied, flag_schedule.failed
- [ ] AC6: CloudWatch structured logging integration with event metadata

**Service Layer Integration:**
- [ ] AC7: Schedule service calls audit logger on create/cancel operations
- [ ] AC8: Fire-and-forget error handling (audit failures don't block operations)
- [ ] AC9: Admin context passed from routes to service layer (userId, email from JWT)
- [ ] AC10: Database persistence of created_by/cancelled_by fields

**Cron Job Integration:**
- [ ] AC11: Cron job logs flag_schedule.applied events (no admin context)
- [ ] AC12: Cron job logs flag_schedule.failed events with error details

**API Response Updates:**
- [ ] AC13: GET /schedule endpoint returns created_by, cancelled_by, cancelled_at fields
- [ ] AC14: Schema alignment: frontend and backend schedules include admin tracking fields

**Testing:**
- [ ] AC15: Unit tests for audit logger integration (8+ tests)
- [ ] AC16: Integration tests via HTTP file (create/cancel schedules, verify fields)
- [ ] AC17: Backward compatibility tests (NULL admin fields handled gracefully)
- [ ] AC18: CloudWatch logs verification (manual check for audit events)

**Documentation:**
- [ ] AC19: Update API documentation with admin tracking fields
- [ ] AC20: Document audit event types and metadata schemas
- [ ] AC21: Add CloudWatch Logs Insights query examples

### Non-Goals

1. **Audit UI/Dashboard** - defer to future admin dashboard story (read-only query interface)
2. **Audit log retention policy** - defer to separate infrastructure story
3. **Audit log export API** - defer to future story
4. **Real-time audit alerts** - CloudWatch logs only in MVP
5. **Schedule modification audit** - MVP only tracks create/cancel, not updates
6. **Bulk operation audit** - single-schedule operations only
7. **Reusing admin domain audit table** - create separate audit service for schedule domain

### Reuse Plan

**Components:**
- **Audit Repository Pattern**: Adapt from `apps/api/lego-api/domains/admin/adapters/repositories.ts` (AuditLogRepository interface)
- **JWT Claims Extraction**: Reuse admin middleware patterns for extracting user context
- **CloudWatch Logging**: Use existing `@repo/logger` structured logging patterns
- **Drizzle ORM**: Use established migration and schema patterns

**Patterns:**
- Fire-and-forget audit logging (errors don't fail operations)
- Result type pattern for error handling
- Hexagonal architecture (audit logger as port)
- Zod-first schema definitions

**Packages:**
- `@repo/logger` for CloudWatch structured logging
- `@repo/api-core` for Result types
- `drizzle-orm` for database migrations and schema

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Key Testing Challenges:**
1. **CloudWatch Logs Verification**: Manual verification required - structured logs must appear with correct metadata
2. **Backward Compatibility**: Test that schedules with NULL admin fields (old data) work correctly
3. **Fire-and-forget Pattern**: Verify audit failures don't block schedule operations (error simulation)
4. **Cron Job Events**: Test automatic event logging when cron job applies/fails schedules

**Testing Tooling:**
- HTTP file extension: `__http__/feature-flag-scheduling.http` (add 3+ requests)
- Unit tests: Mock audit logger to verify event metadata
- Integration tests: Real database writes for admin tracking fields

**Suggested Test Scenarios:**
1. Create schedule as Admin A → verify created_by persisted and audit event logged
2. Admin B cancels Admin A's schedule → verify cancelled_by = Admin B
3. Cron job applies schedule → verify applied event logged (no admin)
4. Simulate audit service failure → verify schedule creation still succeeds

### For UI/UX Advisor

**No UI/UX work required** - this is backend-only infrastructure. However, consider future admin dashboard implications:
- Admin tracking fields will enable "who created this schedule?" queries
- CloudWatch logs provide audit trail for compliance reports
- Future dashboard could display schedule creator info

### For Dev Feasibility

**Architecture Considerations:**
1. **Audit Service Location**: Create new `apps/api/lego-api/core/audit/` directory (separate from admin domain)
2. **Schema Migration**: Add nullable columns to existing `feature_flag_schedules` table (backward compatible)
3. **Service Layer Wiring**: Inject audit logger into schedule service via constructor
4. **JWT Claims**: Verify admin JWTs include userId and email fields (coordinate with auth service)

**Implementation Complexity:**
- **Low Complexity**: Story extends well-established patterns from admin domain and WISH-2119
- **No Architecture Changes**: Fits within existing hexagonal architecture
- **Clean Separation**: Audit logging doesn't touch core schedule logic

**Risk Areas:**
1. JWT claims may not include admin email (verify auth middleware implementation)
2. Audit logging errors must be fire-and-forget (requires error handling in service layer)
3. CloudWatch logs verification is manual (no automated test assertion)

**Estimated Effort:** 2 points (small story, extends existing patterns)

---

## Additional Context

### Story Origin
This story originated from WISH-2119 QA Discovery Notes (Finding #7: Follow-up Stories Suggested):
> "Integration with WISH-2019 (audit logging: track which admin created/cancelled schedules)"

However, WISH-2019 was about Redis caching, not audit logging. The actual audit infrastructure exists in the admin domain and should be adapted for schedule operations.

### Dependency Clarification

**Original Dependency Listed:** WISH-2119 (flag scheduling), WISH-2019 (audit logging)

**Corrected Dependency:** WISH-2119 only

**Audit Infrastructure Source:** Admin domain (`apps/api/lego-api/domains/admin/`, `admin_audit_log` table)

### Implementation Strategy

1. **Phase 1**: Database migration for admin tracking columns
2. **Phase 2**: Create audit logger service in `core/audit/`
3. **Phase 3**: Integrate audit logging into schedule service
4. **Phase 4**: Update cron job for automatic event logging
5. **Phase 5**: Update API responses and schemas
6. **Phase 6**: Testing and documentation

### Open Questions for Elaboration

1. **Q1**: Should audit events use the existing `admin_audit_log` table or a new `schedule_audit_log` table?
   - **Recommendation**: Create new audit logger in `core/audit/` that logs to CloudWatch only (no database persistence in MVP). Defer database audit table to future story.

2. **Q2**: Do admin JWTs include userId and email claims?
   - **Resolution Path**: Review auth middleware, add claims if missing

3. **Q3**: Should we audit schedule listing (GET) operations, or only mutations (POST/DELETE)?
   - **Recommendation**: Only mutations in MVP (reduce log volume)

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning Details:**
1. Misleading dependency reference to WISH-2019 (documentation error, not technical blocker) - corrected in seed
