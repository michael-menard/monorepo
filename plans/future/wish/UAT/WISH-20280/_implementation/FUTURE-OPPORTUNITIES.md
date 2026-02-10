# Future Opportunities - WISH-20280

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Audit event schema validation | Low | Low | Add Zod schema validation to audit event metadata before logging to CloudWatch. Ensures consistent event structure across all event types. Current implementation relies on convention (TypeScript types) but no runtime enforcement. |
| 2 | Automated CloudWatch logs verification | Medium | Medium | Build automated assertion for CloudWatch audit events in integration tests. Current plan requires manual verification via AWS console. Could use AWS SDK to query CloudWatch Logs Insights programmatically in test assertions. |
| 3 | Admin email fallback if JWT missing | Low | Low | Current graceful degradation sets `created_by = NULL` if JWT claims missing. Could enhance to extract email from Cognito API as fallback (adds external service dependency but improves audit completeness). Defer until Q2 resolved. |
| 4 | Audit logger retry mechanism | Low | Medium | Fire-and-forget pattern means audit events lost during CloudWatch API outages. Could add retry queue for failed audit events (requires event queue infrastructure like SQS). Acceptable for MVP - CloudWatch uptime is 99.9%+. |
| 5 | Batch audit logging for cron job | Low | Low | Cron job logs individual `flag_schedule.applied` events per schedule. For efficiency, could batch multiple events into single CloudWatch log entry with array of schedules. Defer until scale testing shows performance impact. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Audit log database persistence | Medium | High | MVP uses CloudWatch only (no database persistence). Future story could persist audit events to `schedule_audit_log` table for faster querying and retention control. Aligns with admin domain's `admin_audit_log` pattern. Defer to Phase 5+. |
| 2 | Admin dashboard audit viewer | High | High | Build read-only UI in admin dashboard to view schedule audit trail (who created/cancelled schedules, when, why). Current MVP requires AWS console access and CloudWatch Logs Insights knowledge. High value for non-technical admins. Defer to separate "Admin Dashboard - Audit Viewer" story (Phase 6+). |
| 3 | Real-time audit alerts | Medium | Medium | Implement CloudWatch Alarms for suspicious patterns (e.g., admin cancels >10 schedules in 1 hour, schedule created for past time, repeated failures). Requires EventBridge rule + SNS/Slack integration. Defer to Phase 7 "Security Monitoring" epic. |
| 4 | Audit log export API | Low | Medium | Build API endpoint for bulk audit log export (CSV/JSON formats) for compliance audits. Current MVP requires manual CloudWatch Logs Insights queries. Defer to Phase 6+ or separate "Compliance Reporting" story. |
| 5 | Schedule modification audit | Medium | Low | MVP only audits create/cancel operations. If schedules become modifiable (reschedule, update flag updates), add `flag_schedule.modified` event type with before/after state. Defer until schedule modification feature added (not in WISH-2119). |
| 6 | Audit event correlation IDs | Low | Low | Add `correlationId` to audit events to link related operations (e.g., create schedule → cron job applies schedule → failure retry). Improves incident investigation. Defer to Phase 8 or "Observability Enhancements" story. |
| 7 | Audit log retention policy | Medium | Medium | CloudWatch logs have no defined retention policy in MVP. Could accumulate significant storage costs over time. Recommend separate story for "Audit Log Retention Policy" defining TTL (e.g., 90 days) and S3 archival for long-term compliance. Defer to Phase 4+ per FUTURE-RISKS.md. |
| 8 | User-friendly admin context in logs | Low | Low | Audit events log `adminUserId` (Cognito sub - UUID) but not human-readable admin name/email in log message (only in metadata). Could enhance log messages: "Admin john@example.com created schedule" vs "Admin abc-123-def created schedule". Improves log readability. Defer to polish story. |

## Categories

### Edge Cases
- **Finding #1 (Gaps):** Audit event schema validation - ensures runtime enforcement of event structure
- **Finding #3 (Gaps):** Admin email fallback - handles JWT claims missing scenario more gracefully
- **Finding #5 (Gaps):** Batch audit logging - optimization for high-volume cron job scenarios

### UX Polish
- **Enhancement #2:** Admin dashboard audit viewer - high-value UX improvement for non-technical admins
- **Enhancement #8:** User-friendly admin context - log message readability improvement

### Performance
- **Finding #5 (Gaps):** Batch audit logging - reduces CloudWatch API calls for cron job
- **Enhancement #1:** Audit log database persistence - faster querying than CloudWatch Logs Insights

### Observability
- **Finding #2 (Gaps):** Automated CloudWatch logs verification - testing infrastructure improvement
- **Enhancement #3:** Real-time audit alerts - proactive security monitoring
- **Enhancement #6:** Audit event correlation IDs - incident investigation improvement

### Integrations
- **Enhancement #4:** Audit log export API - compliance reporting integration
- **Enhancement #7:** Audit log retention policy - S3 archival integration for long-term storage

### Infrastructure
- **Finding #4 (Gaps):** Audit logger retry mechanism - resilience improvement (requires SQS)
- **Enhancement #1:** Audit log database persistence - infrastructure for faster audit queries
- **Enhancement #7:** Audit log retention policy - storage cost management

## Priority Recommendations

### Phase 4 (Post-MVP Hardening)
- **Enhancement #7** (Medium impact, Medium effort): Audit log retention policy - prevents cost accumulation

### Phase 5 (Admin Experience)
- **Enhancement #1** (Medium impact, High effort): Audit log database persistence - enables admin dashboard features

### Phase 6 (Admin Dashboard)
- **Enhancement #2** (High impact, High effort): Admin dashboard audit viewer - major UX improvement for admins
- **Enhancement #4** (Low impact, Medium effort): Audit log export API - compliance reporting

### Phase 7 (Security Monitoring)
- **Enhancement #3** (Medium impact, Medium effort): Real-time audit alerts - proactive security

### Phase 8 (Observability Enhancements)
- **Enhancement #5** (Medium impact, Low effort): Schedule modification audit - when feature added
- **Enhancement #6** (Low impact, Low effort): Audit event correlation IDs - incident investigation

### Polish/Future
- **Finding #1** (Low impact, Low effort): Audit event schema validation - code quality
- **Finding #2** (Medium impact, Medium effort): Automated CloudWatch logs verification - test infrastructure
- **Finding #3** (Low impact, Low effort): Admin email fallback - graceful degradation improvement
- **Finding #5** (Low impact, Low effort): Batch audit logging - performance optimization
- **Enhancement #8** (Low impact, Low effort): User-friendly admin context - log readability

## Notes

**Admin Domain Audit Patterns:** Story correctly identifies admin domain as the source of audit infrastructure patterns. Admin audit logging uses database persistence (`admin_audit_log` table) whereas this story uses CloudWatch only for MVP. Future convergence opportunity: create unified `@repo/audit` package that provides both CloudWatch and database persistence adapters, reusable across domains.

**WISH-2019 Clarification:** PM artifacts correctly identified that original follow-up reference to "WISH-2019 (audit logging)" was incorrect - WISH-2019 is Redis caching, not audit logging. Audit patterns come from admin domain. No follow-up action needed - story seed already corrected this.

**Testing Infrastructure Gap:** Finding #2 (automated CloudWatch verification) is non-blocking for MVP but creates technical debt. Manual verification during QA phase is acceptable, but automated assertion would improve CI/CD confidence. Consider adding to "Testing Infrastructure Improvements" backlog story.

**Scale Considerations:** Findings #4 and #5 (retry mechanism, batch logging) are performance/resilience optimizations. Not needed for MVP assuming moderate schedule creation volume (<100 schedules/day). Defer until production metrics show need.
