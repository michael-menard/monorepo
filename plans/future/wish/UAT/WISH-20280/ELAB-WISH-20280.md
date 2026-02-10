# Elaboration Report - WISH-20280

**Date**: 2026-02-09
**Verdict**: CONDITIONAL PASS

## Summary

WISH-20280 (Audit Logging for Flag Schedule Operations) passed elaboration with conditional pass verdict. Story scope is complete and well-defined, extending proven audit logging patterns from the admin domain to flag scheduling operations. No MVP-critical gaps identified; three non-blocking architectural refinements documented for implementation phase.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly - adds audit logging to WISH-2119 schedule operations |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, Decisions, and ACs are internally consistent |
| 3 | Reuse-First | PASS | — | Adapts admin domain audit patterns, uses @repo/logger, reuses WISH-2119 infrastructure |
| 4 | Ports & Adapters | CONDITIONAL PASS | Medium | Service layer integration correct, but missing explicit audit port interface definition - see Issue #1 |
| 5 | Local Testability | PASS | — | HTTP file extension planned, unit tests specified (8+ tests), CloudWatch verification documented |
| 6 | Decision Completeness | PASS | — | All open questions resolved (Q1: CloudWatch only, Q2: JWT claims path, Q3: mutations only) |
| 7 | Risk Disclosure | PASS | — | All risks disclosed (JWT claims, audit failures, backward compatibility) with mitigations |
| 8 | Story Sizing | PASS | — | 2 points reasonable - 15 ACs but many are testing/docs, backend-only, extends proven patterns |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Missing audit port interface definition | Medium | Create `AuditLoggerPort` interface in `apps/api/lego-api/core/audit/ports.ts` before implementation. Service layer should depend on interface, not concrete CloudWatch logger implementation. Follow hexagonal architecture pattern from admin domain. | For Implementation |
| 2 | Admin context extraction pattern not specified | Low | Story should explicitly reference auth middleware pattern for extracting `userId` and `email` from JWT claims. Currently implicit in AC6 but implementation path unclear. Recommend referencing `apps/api/lego-api/middleware/auth.ts` patterns. | For Implementation |
| 3 | Schema alignment test not specified | Low | AC10 mentions "alignment test" but doesn't specify test tooling or assertion pattern. Recommend clarifying: use Vitest schema comparison test in `packages/core/api-client/__tests__/schema-alignment.test.ts` or similar. | For Implementation |

## Discovery Findings

### Gaps Identified (All Non-Blocking)

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | MVP-Critical Gaps | NONE | All 15 ACs cover complete audit logging journey (create schedule → log event, cancel schedule → log event, cron job → log automatic events) |
| 2 | Audit event schema validation | Logged to KB | Add Zod schema validation to audit event metadata before logging to CloudWatch for runtime enforcement. Low effort, low impact. Defer to post-MVP. |
| 3 | Automated CloudWatch logs verification | Logged to KB | Build automated assertion for CloudWatch audit events in integration tests. Current plan requires manual verification. Medium effort, medium impact. Defer to testing infrastructure story. |
| 4 | Admin email fallback if JWT missing | Logged to KB | Could enhance graceful degradation to extract email from Cognito API as fallback. Low effort, low impact. Defer until Q2 resolved. |
| 5 | Audit logger retry mechanism | Logged to KB | Fire-and-forget pattern means audit events lost during CloudWatch outages. Could add retry queue (requires SQS). Low effort, low impact. Acceptable for MVP given 99.9%+ CloudWatch uptime. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | Audit log database persistence | Logged to KB | MVP uses CloudWatch only. Future story could persist audit events to `schedule_audit_log` table for faster querying. Aligns with admin domain patterns. Defer to Phase 5+. |
| 2 | Admin dashboard audit viewer | Logged to KB | High-value UX improvement for non-technical admins to view schedule audit trail without AWS console access. Defer to Phase 6+. |
| 3 | Real-time audit alerts | Logged to KB | Implement CloudWatch Alarms for suspicious patterns (e.g., admin cancels >10 schedules in 1 hour). Defer to Phase 7 "Security Monitoring" epic. |
| 4 | Audit log export API | Logged to KB | Build API endpoint for bulk audit log export (CSV/JSON formats) for compliance audits. Defer to Phase 6+ or separate story. |
| 5 | Schedule modification audit | Logged to KB | MVP only audits create/cancel. If schedules become modifiable, add `flag_schedule.modified` event type. Defer until feature added. |
| 6 | Audit event correlation IDs | Logged to KB | Add `correlationId` to link related operations for better incident investigation. Defer to Phase 8. |
| 7 | Audit log retention policy | Logged to KB | Define CloudWatch retention policy (e.g., 90 days) and S3 archival for long-term compliance. Prevents cost accumulation. Defer to Phase 4+. |
| 8 | User-friendly admin context in logs | Logged to KB | Log human-readable admin names/emails in messages for readability. Defer to polish story. |

### Follow-up Stories Suggested

- None - all enhancements deferred to existing backlogs or future epics

### Items Marked Out-of-Scope

None - all non-MVP items logged to KB for future consideration

### KB Entries Created (Autonomous Mode Only)

- **Gap #1**: Audit event schema validation - Add Zod schema validation to audit event metadata
- **Gap #2**: Automated CloudWatch logs verification - Build automated assertion for integration tests
- **Gap #3**: Admin email fallback - Extract email from Cognito API as fallback for missing JWT
- **Gap #4**: Audit logger retry mechanism - Add SQS retry queue for failed audit events
- **Gap #5**: Batch audit logging for cron job - Batch multiple events for efficiency at scale
- **Enhancement #1**: Audit log database persistence - Persist events to `schedule_audit_log` table
- **Enhancement #2**: Admin dashboard audit viewer - Read-only UI in admin dashboard for audit trail
- **Enhancement #3**: Real-time audit alerts - CloudWatch Alarms for suspicious patterns
- **Enhancement #4**: Audit log export API - Bulk export endpoint for compliance audits
- **Enhancement #5**: Schedule modification audit - Track `flag_schedule.modified` events
- **Enhancement #6**: Audit event correlation IDs - Link related operations for incident investigation
- **Enhancement #7**: Audit log retention policy - Define TTL and S3 archival strategy
- **Enhancement #8**: User-friendly admin context in logs - Human-readable admin names in messages

## Proceed to Implementation?

**YES** - Story may proceed to implementation with three implementation refinements noted:

1. **Issue #1 (Medium)**: Define `AuditLoggerPort` interface before implementing audit logger
2. **Issue #2 (Low)**: Verify JWT claims structure early in implementation and reference auth middleware patterns
3. **Issue #3 (Low)**: Clarify schema alignment test tooling and assertion pattern in AC10

These are architectural polish and clarifications, not MVP-blocking gaps. The story has 15 complete ACs covering the entire audit logging journey.

## Risk Assessment

**MVP-Critical Risks:**
- Risk 1 (JWT Claims Missing Admin Context): Mitigated by graceful degradation (fallback to NULL), verify JWT structure early
- Risk 2 (Audit Logging Errors Block Operations): Mitigated by fire-and-forget pattern proven in admin domain
- Risk 3 (Database Migration Backward Compatibility): Mitigated by nullable columns, tested with NULL values

**Split Risk:** 0.2 (Low) - Backend-only, extends proven patterns, small surface area

**Review Cycles:** 1-2 cycles expected - Service layer integration straightforward, fire-and-forget pattern proven

**Token Estimate:** ~35k tokens for full implementation cycle

## Conditions for Proceed

✅ All 15 ACs well-defined and testable
✅ Architecture aligns with existing hexagonal patterns from WISH-2119 and admin domain
✅ Database schema changes fully specified and backward-compatible
✅ Testing strategy comprehensive (unit, integration, manual CloudWatch verification)
✅ No MVP-critical gaps or blockers identified
✅ Three non-blocking implementation refinements documented

**Verdict**: CONDITIONAL PASS - Proceed with implementation after addressing Issue #1 (audit port interface definition) as implementation refinement.

---

**Elaboration completed by**: elab-completion-leader
**Mode**: autonomous
**Generated**: 2026-02-09T22:45:00-07:00
