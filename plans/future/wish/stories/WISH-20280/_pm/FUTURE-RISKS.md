# Future Risks: WISH-20280 - Audit Logging for Flag Schedule Operations

## Non-MVP Risks

### Risk 1: Audit Log Retention and Storage Costs
**Description:**
CloudWatch logs do not have a defined retention policy. As schedule operations scale, audit logs could accumulate significant storage costs without automatic cleanup.

**Impact (if not addressed post-MVP):**
- Increasing AWS CloudWatch Logs costs over time
- Difficulty querying audit trail for old events (performance degradation)
- Compliance issues if audit logs required beyond retention window

**Recommended Timeline:**
- Phase 4 (post-MVP): Define retention policy (e.g., 90 days for audit events)
- Implement CloudWatch log retention settings
- Consider archiving to S3 for long-term storage (lower cost)

---

### Risk 2: No Audit UI/Dashboard
**Description:**
Audit events are only accessible via CloudWatch Logs Insights queries (requires AWS console access and technical knowledge). Admins and compliance teams cannot easily query "who created this schedule" without developer assistance.

**Impact (if not addressed post-MVP):**
- Reduced admin self-service capability
- Manual effort required for audit trail investigations
- Compliance audit friction (requires developer to run queries)

**Recommended Timeline:**
- Phase 5 or separate epic: Build admin dashboard with audit log viewer
- Display schedule creator/canceller in UI (read-only field)
- Provide basic filtering (by admin, by date range, by flag)

---

### Risk 3: No Audit Log Export API
**Description:**
Audit logs are stored in CloudWatch only (no API for bulk export or download). Compliance auditors may require CSV/JSON exports for external analysis or archival.

**Impact (if not addressed post-MVP):**
- Manual export process (CloudWatch console or AWS CLI)
- Compliance audit friction (cannot provide automated export)
- Risk of incomplete exports (human error in manual process)

**Recommended Timeline:**
- Phase 6 or separate story: Build audit log export API
- Support CSV and JSON formats
- Add date range filtering and pagination

---

### Risk 4: No Real-Time Audit Alerts
**Description:**
Audit events are logged to CloudWatch but do not trigger real-time alerts (e.g., suspicious schedule cancellations, bulk operations, unauthorized admin actions).

**Impact (if not addressed post-MVP):**
- Delayed detection of security incidents or policy violations
- Reactive investigation only (no proactive monitoring)
- Potential compliance gaps (no alerting for critical audit events)

**Recommended Timeline:**
- Phase 7 or separate infrastructure story: Implement CloudWatch Alarms or EventBridge rules
- Alert on suspicious patterns (e.g., admin cancels >10 schedules in 1 hour)
- Integrate with incident management system (PagerDuty, Slack, etc.)

---

### Risk 5: Schedule Modification Audit Not Included
**Description:**
MVP only audits create and cancel operations. If schedules become modifiable (e.g., reschedule to different time, update flag updates), modifications will NOT be audited.

**Impact (if not addressed post-MVP):**
- Audit trail incomplete (missing "what changed" for schedule updates)
- Compliance gap for modification history
- Difficulty investigating incorrect schedule configurations

**Recommended Timeline:**
- Phase 8 or when schedule modification feature added: Extend audit logging to `flag_schedule.modified` events
- Include before/after state in metadata (e.g., `{ oldScheduledAt, newScheduledAt, changedFields }`)

---

### Risk 6: Bulk Operation Audit Not Included
**Description:**
If bulk schedule operations are added in future (e.g., cancel all schedules for a flag, create multiple schedules at once), single-event audit logging may not capture full context of bulk actions.

**Impact (if not addressed post-MVP):**
- Audit logs show individual events but miss bulk operation context
- Difficult to correlate related events (e.g., "Admin A cancelled 50 schedules" vs 50 separate cancel events)
- Compliance investigation friction (cannot identify bulk operations easily)

**Recommended Timeline:**
- When bulk operations feature added: Implement bulk event types (`flag_schedule.bulk_cancelled`, etc.)
- Include `bulkOperationId` in metadata for correlation
- Log summary event with count and affected schedule IDs

---

## Scope Tightening Suggestions

### Clarification 1: Audit Logging Scope Limited to Schedules
**Current Scope:** Audit logging only for flag schedule operations (create, cancel, apply, fail)

**Future Consideration:** Should audit logging extend to:
- Feature flag state changes (enable/disable, rollout percentage updates)?
- Admin user authentication events (login, logout, session expiration)?
- Flag configuration changes (name, description, tags)?

**Recommendation:** Keep MVP focused on schedule operations only. Defer general feature flag audit logging to separate story (WISH-202XX: "Feature Flag Audit Trail").

---

### Clarification 2: Read Operations (GET) Not Audited
**Current Scope:** Only mutations (POST, DELETE) are audited, not read operations (GET)

**Future Consideration:** Should GET schedule operations be audited for compliance (e.g., "who viewed schedules for sensitive flags")?

**Recommendation:** Defer read operation auditing to Phase 9 or separate story (high log volume, low value for MVP).

---

## Future Requirements

### Nice-to-Have 1: Admin Context in Cron Job Events (System Actor)
**Description:**
Cron job events (`flag_schedule.applied`, `flag_schedule.failed`) currently have no admin context (automatic process). Future enhancement could attribute these to a "system actor" for consistency.

**Value:**
- Unified audit trail format (all events have an actor field)
- Easier filtering in CloudWatch Logs Insights (filter by `actor = "system"`)

**Effort:** Low (add `actor: "system"` to cron job event metadata)

**Timeline:** Phase 10 or polish story

---

### Nice-to-Have 2: Audit Event Replay/Reprocessing
**Description:**
If audit logging fails (e.g., CloudWatch API outage), events are lost (fire-and-forget pattern). Future enhancement could queue failed events for retry.

**Value:**
- Complete audit trail even during CloudWatch outages
- Compliance assurance (no lost events)

**Effort:** Medium (requires event queue infrastructure, retry mechanism)

**Timeline:** Phase 11 or separate infrastructure story (low priority for MVP)

---

### Nice-to-Have 3: Audit Log Integrity Verification
**Description:**
Audit logs are not cryptographically signed or immutable. Future enhancement could add hash chaining or blockchain-style integrity verification.

**Value:**
- Tamper-proof audit trail (detect log modifications)
- Enhanced compliance for high-security environments

**Effort:** High (requires cryptographic infrastructure, immutable storage)

**Timeline:** Separate epic (low priority unless compliance requires)

---

### Polish: Structured Metadata Schema Validation
**Description:**
Audit event metadata is currently flexible JSONB without strict schema enforcement. Future enhancement could validate metadata against Zod schemas before logging.

**Value:**
- Consistent event structure (easier querying in CloudWatch)
- Reduced risk of missing fields or typos in event metadata

**Effort:** Low (add Zod schema validation to audit logger)

**Timeline:** Phase 12 or polish story (low priority, existing pattern works)

---

**FUTURE RISKS COMPLETE**
