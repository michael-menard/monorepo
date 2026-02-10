# Future Opportunities - WISH-2119

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Schedule preview endpoint missing | Low | Low | Add `POST /api/admin/flags/:flagKey/schedule/preview` to simulate flag state after schedule applies. Helps admins verify correctness before creating. Defer to Phase 4+. |
| 2 | No automatic retry for failed schedules | Low | Medium | Implement exponential backoff retry (max 3 attempts) for failed schedules. Currently requires manual intervention via CloudWatch logs. Defer to Phase 4+. |
| 3 | Schedule retention policy not automated | Low | Low | Add optional cleanup cron job to enforce retention policy (applied=90d, cancelled=30d). MVP retains indefinitely with manual cleanup. Defer to Phase 4+. |
| 4 | No schedule conflict detection | Low | Low | Prevent overlapping schedules for same flag with uniqueness constraint `(flag_id, scheduled_at)`. MVP allows conflicts, last wins. Document in API. Defer to Phase 4+. |
| 5 | No audit trail for schedule creators | Low | Medium | Track `created_by` and `cancelled_by` admin user IDs. Currently relies on CloudWatch logs. Integrate with WISH-2019 (audit logging). Defer to Phase 4+. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Recurring schedules (cron-like syntax) | Medium | High | Support recurrence rules like "0 9 * * 1" (every Monday at 9am). Requires `recurrence_rule` column and complex cron logic. Use cases: weekly maintenance windows, monthly promotions. Defer to Phase 4+. |
| 2 | Bulk schedule creation | Low | Low | Create multiple schedules in single API call. Useful for coordinated feature rollouts across multiple flags. Simple REST array endpoint. Defer to Phase 4+. |
| 3 | Real-time schedule notifications | Low | Medium | Push notifications (WebSocket/SSE) when schedules execute. MVP logs to CloudWatch only. Improves admin observability. Defer to Phase 5+. |
| 4 | Schedule timezone support | Medium | Medium | Allow schedules in admin's local timezone instead of UTC-only. Requires timezone parameter and conversion logic. Reduces admin errors. Defer to Phase 4+. |
| 5 | Schedule dry-run mode | Low | Low | Test schedule execution without committing changes. Validates cron job logic. Useful for debugging. Defer to Phase 4+. |
| 6 | Schedule dependencies | Low | High | Support schedule chaining ("apply schedule B only if schedule A succeeded"). Complex orchestration logic. Limited use cases in MVP. Defer to Phase 5+. |

## Categories

### Edge Cases
- **Timezone confusion**: MVP uses UTC-only, admins may miscalculate local time conversions (mitigation: document UTC requirement, consider timezone support in Phase 4+)
- **Schedule at exact minute boundary**: If scheduled_at = cron execution time, schedule may process immediately or wait 60s (test AC addresses this, document acceptable ±60s window)
- **Large batch timeout**: 100+ schedules may require multiple cron executions (mitigation: 100 schedule limit per execution in AC7)

### UX Polish
- **Schedule preview**: Simulate flag state before creating schedule (builds admin confidence, defer to Phase 4+)
- **Admin dashboard UI**: Visual timeline of upcoming/past schedules (no user-facing UI in MVP, defer to Phase 3+)
- **Schedule edit**: Update scheduled_at or updates without cancelling/recreating (edge case, defer to Phase 4+)

### Performance
- **Cron job optimization**: Batch flag updates in single transaction instead of per-schedule (marginal improvement, defer to Phase 5+)
- **Schedule index tuning**: Composite index on `(status, scheduled_at)` for faster query (acceptable performance in MVP, revisit if schedule volume >10k)

### Observability
- **CloudWatch metrics**: SchedulesProcessedCount, SchedulesFailedCount, ScheduleBacklogExceeded (AC9 requires structured logs, metrics defer to Phase 4+)
- **Schedule execution history**: Detailed timeline of when each schedule executed (covered by applied_at timestamp, enhanced UI defer to Phase 4+)
- **Alert on backlog growth**: Notify admins if pending schedules exceed threshold (manual monitoring via CloudWatch in MVP, automated alerts defer to Phase 4+)

### Integrations
- **Slack/PagerDuty notifications**: Alert admins when schedules fail (relies on CloudWatch logs in MVP, integration defer to Phase 5+)
- **Datadog/New Relic APM**: Distributed tracing for schedule processing (no APM in MVP, defer to Phase 5+)
- **Admin API key authentication**: Alternative to JWT for automated scheduling tools (JWT-only in MVP, defer to Phase 4+)
