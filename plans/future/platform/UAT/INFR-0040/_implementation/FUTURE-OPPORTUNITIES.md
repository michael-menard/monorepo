# Future Opportunities - INFR-0040

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No GIN index on JSONB payload for payload-specific queries | Medium | Low | Add `CREATE INDEX idx_workflow_events_payload_gin ON telemetry.workflow_events USING GIN (payload);` if queries like "find all events where payload contains X" become common. Defer until query patterns emerge from TELE-0010 dashboards |
| 2 | No event schema versioning beyond basic event_version field | Low | Medium | Future story: Event schema migration strategy with payload validation per event_type and version. INFR-0050 can add Zod schemas per event_type |
| 3 | No partition strategy for large event tables | Low | High | Once table exceeds 10M rows (~6 months at 10K events/day), consider time-based partitioning by ts field. Defer to INFR-0060 (retention/archival) |
| 4 | Missing index on (item_id, event_type, ts) for story-specific telemetry | Low | Low | Add composite index for queries like "show all gap_found events for INFR-0040". Defer until story-level analytics UI is built |
| 5 | No composite index on (workflow_name, agent_role, ts) for agent performance queries | Low | Low | Add for queries like "show all events for dev-implementation-leader in dev-implement-story workflow". Defer until agent performance dashboard exists (TELE-0030) |
| 6 | No automated migration rollback SQL generation | Medium | Medium | Drizzle Kit does not auto-generate rollback migrations. Future tooling: script to generate rollback SQL from migration diffs |
| 7 | insertWorkflowEvent does not return inserted event | Low | Low | Current function returns `Promise<void>`. Future enhancement: return inserted event for confirmation/logging. Not needed for MVP fire-and-forget pattern |
| 8 | No batch insert function for high-volume ingestion | Medium | Medium | insertWorkflowEvent inserts one event at a time. Future: `insertWorkflowEventsBatch(events[])` using Drizzle batch insert for INFR-0050 async queue |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Add event_id prefix for event_type visibility | Low | Low | Instead of raw ULID/UUID, use prefixed IDs like `evt_state_01J4Z7X...` for easier debugging. Implement in INFR-0050 when event SDK is built |
| 2 | Add event correlation_id for distributed tracing | Medium | Medium | Link workflow events to OpenTelemetry traces via correlation_id field. Defer to observability integration story after TELE-0010 |
| 3 | Add event source/emitter metadata | Low | Low | Track which agent/node emitted each event (agent_id, node_name, hostname). Partially covered by agent_role, but could add source column for debugging |
| 4 | Add event deduplication window beyond unique constraint | Low | Medium | Current idempotency relies on unique index. Future: add application-level deduplication cache (Redis) for "recently seen event_id" to prevent duplicate DB hits |
| 5 | Add event payload JSON schema validation | Medium | High | Validate payload structure per event_type using Zod schemas. Best deferred to INFR-0050 (Event SDK) where schemas are centralized |
| 6 | Add SQL views for common event queries | Medium | Low | Create materialized views like `mv_story_state_transitions` for frequently accessed queries. Defer until query patterns stabilize (post-TELE-0010) |
| 7 | Add event sampling/throttling for high-volume events | Low | Medium | If certain event types (e.g., step_completed) become too noisy, add sampling config (e.g., 10% sample rate). Defer until volume patterns emerge |
| 8 | Expose event metrics via Prometheus /metrics endpoint | High | Medium | Export event counts, ingestion rates, payload sizes as Prometheus metrics. Covered by TELE-0020 (Prometheus Metrics Mapping) |
| 9 | Add event export/archival to S3 for long-term storage | Medium | High | Covered by INFR-0060 (retention/archival policy) - export old events to MinIO/S3, keep hot data in Postgres |
| 10 | Add event replay capability for debugging | Medium | High | Re-emit historical events to test telemetry dashboards or fix data gaps. Useful for TELE development but not MVP-critical |

## Categories

### Edge Cases
- Concurrent event writes from multiple orchestrator instances (mitigated by connection pooling in @repo/db)
- Duplicate event_id handling (covered by unique index + ON CONFLICT DO NOTHING)
- NULL payload handling (tested in AC-11)
- Event ordering guarantees (relies on `ts` field, ~1ms precision may cause ambiguity for rapid events)

### UX Polish
- Event_id prefixes for readability (evt_state_*, evt_gap_*, etc.)
- Human-readable event summaries derived from payload (for dashboard display)
- Event filtering UI in Grafana (deferred to TELE-0030)

### Performance
- Batch insert for high-volume async queue (INFR-0050)
- Table partitioning for 10M+ rows (INFR-0060)
- GIN index on JSONB payload (if needed)
- Composite indexes for complex queries (add as query patterns emerge)

### Observability
- Event ingestion rate metrics (TELE-0020)
- Event payload size tracking (TELE-0020)
- Event lag monitoring (time between event creation and DB insert)
- Correlation with OpenTelemetry traces (future observability story)

### Integrations
- Export events to S3 for analytics (INFR-0060)
- Stream events to Kafka/EventBridge for external consumers (future)
- Sync events to data warehouse for BI (future)
- Event-driven notifications (e.g., Slack alert on gap_found events) - covered by TELE alerting stories
