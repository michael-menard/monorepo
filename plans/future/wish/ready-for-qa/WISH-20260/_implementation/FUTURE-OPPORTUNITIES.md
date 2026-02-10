# Future Opportunities - WISH-20260

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No retry alerting/notifications | Low | Low | Add SNS notifications when schedule exceeds max retries. Improves admin observability for permanent failures. Currently requires manual CloudWatch monitoring. Defer to Phase 4+. |
| 2 | No retry metrics dashboard | Low | Medium | Create CloudWatch dashboard with retry success/failure rates, backlog size, average retry count. Helps identify systemic issues (e.g., database outages). Manual log analysis in MVP. Defer to Phase 4+. |
| 3 | Manual retry endpoint missing | Low | Low | Add `POST /api/admin/flags/:flagKey/schedules/:scheduleId/retry` to manually trigger retry for failed schedules. Workaround: admins can create new schedule with same updates. Defer to Phase 4+. |
| 4 | No retry history tracking | Low | Medium | Track detailed retry attempts in separate `schedule_retry_attempts` table (timestamp, error, retry_count). Currently only last_error stored. Useful for debugging persistent failures. Defer to Phase 5+. |
| 5 | No exponential backoff cap | Low | Low | Retry 10 at 2^11 = 2048 minutes (~34 hours) exceeds reasonable bounds. Add cap (e.g., max 60 minutes backoff). Edge case AC10 mentions "backoff capped at reasonable limit" but not specified in schema. Clarify in implementation. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Custom retry policies per schedule | Medium | Medium | Allow per-schedule override of max_retries and backoff strategy. Use case: critical schedules (e.g., holiday promotions) need higher retry limits. MVP uses global policy only. Defer to Phase 4+. |
| 2 | Retry preview/dry-run | Low | Low | Add endpoint to simulate retry timeline for failed schedules. Shows next_retry_at for each attempt. Helps admins understand when schedule will succeed or permanently fail. Defer to Phase 4+. |
| 3 | Adaptive backoff based on error type | Medium | High | Use different backoff strategies based on error type (network errors: shorter backoff, database schema errors: skip retry). Requires error classification logic. Complex but more robust. Defer to Phase 5+. |
| 4 | Retry priority queuing | Low | Medium | Process higher-priority schedules first when backlog exceeds 100 schedules. Requires priority column + sorting logic. Limited use case in MVP (few failed schedules expected). Defer to Phase 4+. |
| 5 | Circuit breaker for database failures | Medium | High | Pause all retries if database is down (avoid overwhelming database on recovery). Requires health check + distributed coordination (Redis). Advanced failure handling. Defer to Phase 5+. |
| 6 | Retry batch optimization | Low | Low | If multiple schedules for same flag failed, batch retry into single flag update. Marginal performance improvement (rare case). Defer to Phase 5+. |

## Categories

### Edge Cases
- **Exponential backoff overflow**: Test explicitly mentions capping at 60 minutes (AC10) but not reflected in calculateNextRetryAt spec or schema. Clarify in implementation to prevent multi-day backoff times.
- **Midnight boundary crossing**: next_retry_at calculation at 23:59:30 + 2 minutes crosses day boundary. UTC timestamps (inherited from WISH-2119) mitigate this. Test coverage in AC10.
- **Schedule cleanup during retry**: WISH-2119 integration note mentions "don't purge schedules mid-retry" but cleanup cron job doesn't exist yet. Document for future cleanup story.
- **Concurrent cron executions**: If cron job runs long (>1 minute), next execution may start. Row-level locking (FOR UPDATE SKIP LOCKED) from WISH-2119 prevents double-processing. Edge case covered in AC10.

### UX Polish
- **Retry status visibility**: Admins can't see "retrying" status in UI (no admin UI in MVP). Schedule stays status='failed' with next_retry_at populated. Consider status='retrying' or separate retry_status column. Defer to Phase 3+.
- **Retry timeline visualization**: Show retry schedule timeline in admin UI (e.g., "Retry 1 in 2 minutes, Retry 2 in 6 minutes"). Improves admin confidence. Defer to Phase 3+.
- **Retry cancellation**: Allow admins to cancel pending retries (set next_retry_at = null). Currently must wait for max retries or delete schedule. Defer to Phase 4+.

### Performance
- **Retry query optimization**: Query extension (WHERE ... OR (status = 'failed' AND next_retry_at <= NOW() AND retry_count < max_retries)) adds complexity. Composite index on (status, next_retry_at, retry_count) may improve performance for large schedule volumes. AC1 specifies single-column index only. Monitor query performance in production.
- **Jitter randomization strategy**: Simple random(0, 30) seconds may cause thundering herd if many schedules fail simultaneously. Consider spreading jitter across wider range (e.g., 0-120 seconds). Low priority optimization. Defer to Phase 5+.

### Observability
- **CloudWatch retry metrics**: AC4 logs retry attempts but no CloudWatch metrics specified. Add ScheduleRetriesCount, ScheduleRetrySuccessCount, ScheduleRetryFailureCount. Improves alerting and dashboards. Defer to Phase 4+.
- **Retry failure patterns**: Aggregate retry failures by error type to identify systemic issues (e.g., "all retries fail with 'Flag not found'"). Requires structured error classification. Defer to Phase 4+.
- **Retry backlog monitoring**: Alert if retry backlog exceeds threshold (e.g., >50 failed schedules pending retry). Story mentions "monitor CloudWatch metrics for backlog" (AC Risk #3) but no metrics dashboard. Defer to Phase 4+.

### Integrations
- **PagerDuty/Opsgenie alerts**: Trigger incident when schedule exceeds max retries. Critical for production incidents (e.g., holiday promotion fails to enable). Relies on CloudWatch logs in MVP. Defer to Phase 4+.
- **Slack notifications**: Post retry status to admin Slack channel. Improves team awareness without active monitoring. Defer to Phase 4+.
- **Datadog APM tracing**: Track retry execution spans for performance analysis. No APM in MVP. Defer to Phase 5+.

### Testing Gaps (Non-Critical)
- **Jitter distribution test**: AC10 mentions "verify jitter is evenly distributed between 0-30 seconds" (100 calculations). Statistically verify randomness. Nice-to-have, not MVP-critical. Include if time permits.
- **Backoff overflow test**: AC10 mentions testing retry_count = 10 with capped backoff. Ensure calculateNextRetryAt handles large retry counts gracefully. Cover in unit tests.
- **Database transaction rollback**: If retry_count update succeeds but next_retry_at update fails, schedule may be in inconsistent state. Database atomicity should prevent this but test explicitly. Cover in integration tests.

### Future-Proofing
- **Retry telemetry**: Track retry success rate over time to tune backoff parameters (e.g., if 90% succeed on retry 1, reduce max_retries to 2). Requires historical data. Defer to Phase 5+.
- **Retry A/B testing**: Test different backoff strategies (linear vs exponential) to optimize retry success rate. Academic optimization. Defer to Phase 5+.
- **Retry webhooks**: Allow external systems to be notified of retry events. Integration opportunity for monitoring tools. Defer to Phase 5+.
