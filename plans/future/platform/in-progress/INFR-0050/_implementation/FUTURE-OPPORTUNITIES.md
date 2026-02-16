# Future Opportunities - INFR-0050

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No event validation at buffer addition time | Low | Low | Currently validation happens only in `insertWorkflowEvent()` during flush; could validate earlier to catch errors sooner (but adds overhead to hot path) |
| 2 | No metrics for buffer size/flush rate | Medium | Low | Prometheus metrics for buffer depth, flush count, dropped events would improve observability (deferred to TELE-0020) |
| 3 | No configurable retry logic for batch insert failures | Medium | Medium | If batch insert fails due to transient DB error, events are logged but lost; could add retry queue (but increases complexity) |
| 4 | No support for event prioritization | Low | Medium | High-priority events (errors) could bypass buffer for immediate insertion; adds complexity for minimal gain in MVP |
| 5 | Hard-coded PostgreSQL parameter limit (6500 events) | Low | Low | Could query `max_prepared_transactions` at runtime instead of hard-coding; not critical since limit is well-established |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Event sampling/throttling for high-volume scenarios | High | Medium | If orchestrator generates 1000s of events/sec, buffer could fill rapidly; sampling (e.g., 10% of events) would reduce load (mentioned in Non-goals for TELE-0020) |
| 2 | Persistent event queue for critical events | High | High | In-memory buffer loses events on crash; persistent queue (Redis, file-based) would prevent loss but adds significant complexity (mentioned in Non-goals) |
| 3 | Event archival/compression | Medium | Medium | Compressed events for long-term storage; JSONB payload could be gzipped before insert to save space (deferred to INFR-0060) |
| 4 | GIN indexes on JSONB payload for querying | Medium | Low | Enable fast queries on payload fields (e.g., `payload->>'error_message'`); deferred to TELE-0010 based on dashboard needs |
| 5 | Real-time event streaming (Kafka/Redis Streams) | High | High | For live dashboards; deferred to future story (mentioned in Non-goals) |
| 6 | Frontend telemetry SDK | Medium | High | Browser-side event tracking for UI interactions; separate concern from backend SDK (mentioned in Non-goals) |
| 7 | Event replay CLI | Medium | Medium | Tool to replay events for debugging/testing; deferred to INFR-0052 (mentioned in Follow-up Stories) |
| 8 | Circular buffer with bounded memory | Medium | Medium | Current buffer grows unbounded until flush; circular buffer with max memory limit would prevent OOM in pathological cases |

## Categories

### Edge Cases
- **Concurrent flush race conditions**: Tests cover SHUT-004 (deduplication), but pathological cases like rapid SIGTERM + manual flush + timer flush could have edge cases
- **Empty payload handling**: Story doesn't explicitly test `payload: null` vs `payload: {}` vs `payload: undefined`; Zod schema uses `.optional()` so should work, but worth explicit test
- **Very large individual events**: What if single event payload is 10MB JSONB? No size limit validation; PostgreSQL accepts up to 1GB but performance may degrade

### UX Polish
- **SDK usage examples in README**: AC-11 requires README documentation, but no examples shown in story; consider adding 3-5 common usage patterns (basic hook, OTel integration, custom metadata)
- **TypeScript autocomplete for event types**: Helper functions already typed, but could add JSDoc comments for better IDE experience
- **Debug mode for SDK**: Verbose logging of buffer state, flush triggers, OTel context extraction would aid troubleshooting (use `@repo/logger` debug level)

### Performance
- **Batch size tuning**: Default 100 events may be too small for high-throughput scenarios; could make configurable or auto-tune based on event rate
- **Connection pooling for batch inserts**: Drizzle already uses pooling via `@repo/db`, but large batches may exhaust pool; monitor and adjust `max_connections` if needed
- **Async buffer flush**: Current design uses synchronous flush on shutdown (5s timeout); could make async with Promise.all for parallel chunk inserts

### Observability
- **Event drop counter**: When buffer overflows and drops oldest events, emit metric/log with count of dropped events
- **Flush duration tracking**: Measure how long each flush takes; alert if >1s (indicates DB slowness)
- **Correlation ID coverage**: Track % of events with correlation_id vs null; low coverage indicates OTel spans not active where expected

### Integrations
- **LangGraph integration**: SDK designed for orchestrator nodes; could provide LangGraph-specific utilities (e.g., auto-populate `workflowName` from graph context)
- **OpenTelemetry Span Events**: Instead of DB events, could emit OTel span events for tighter integration with tracing; requires different storage strategy
- **Structured logging integration**: Events could be emitted as structured logs (JSON) in addition to DB; enables log aggregation tools (ELK, Datadog)

### Security
- **PII scrubbing in payloads**: Event payloads may contain user data; no automatic scrubbing; add opt-in PII redaction for sensitive fields
- **Event schema versioning**: AC-7 adds `eventVersion` field but no migration strategy for schema changes; consider backward-compat testing

### Future-Proofing
- **Event type extensibility**: Currently 5 event types hard-coded in enum; future event types would require schema migration; consider event registry pattern
- **Multi-tenant support**: If orchestrator runs for multiple customers, need `tenant_id` field; not required for MVP but worth planning
- **Event retention policies**: AC mentions INFR-0060 for retention, but SDK could enforce client-side TTL (e.g., don't buffer events >24h old)
