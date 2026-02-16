# Future Opportunities - INFR-0041

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No schema versioning mechanism | Low | Medium | Future story: Add event_schema_version field to track payload schema changes over time. Would enable backward compatibility for evolving event structures |
| 2 | No validation metrics | Low | Low | Future story: Track Zod validation performance (duration_ms per schema), failure rates, and error types in telemetry. Useful for monitoring data quality |
| 3 | No payload size limits | Low | Low | Consider adding max payload size validation (e.g., 100KB limit) to prevent extremely large JSONB objects. Currently unbounded |
| 4 | Helper functions don't support partial events | Low | Medium | Future enhancement: Support partial event creation (e.g., createEventBase() + addPayload() builder pattern) for complex orchestrator scenarios |
| 5 | No enum evolution documentation | Low | Low | Document process for adding new enum values (gap_type, severity, status, etc.) in future. Current enums are closed |
| 6 | Missing correlation_id generation helper | Medium | Low | Add utility function to generate correlation_id from OpenTelemetry context when available. Currently callers must manually extract trace ID |
| 7 | No validation error aggregation | Low | Medium | Zod validation returns first error only. Future enhancement: Collect all validation errors and return detailed error list |
| 8 | No payload transformation layer | Low | High | Future story: Add optional payload transformation/normalization layer (e.g., snake_case to camelCase conversion) between callers and storage |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Batch helper function for multiple events | Medium | Medium | Future story: Add `createEventBatch([...events])` helper that validates and constructs multiple events atomically. Useful for orchestrator nodes emitting multiple events at checkpoints |
| 2 | Event payload TypeScript types export | Medium | Low | Export inferred TypeScript types for each event payload schema (e.g., `export type ItemStateChangedPayload = z.infer<typeof ItemStateChangedPayloadSchema>`). Improves DX for orchestrator nodes |
| 3 | Zod schema composition utilities | Low | Medium | Create reusable schema fragments for common fields (e.g., ItemReferenceSchema = { item_id, item_type }). Reduces duplication across event schemas |
| 4 | Event payload examples in JSDoc | Medium | Low | Add JSDoc comments to each schema with example payloads. Improves IDE autocomplete and documentation generation |
| 5 | CLI tool to validate event files | Low | Medium | Create CLI command to validate YAML/JSON event files against schemas. Useful for testing and debugging orchestrator nodes offline |
| 6 | OpenAPI schema generation from Zod | Low | High | Generate OpenAPI/JSON Schema from Zod schemas for downstream consumers (e.g., TELE-0010 dashboard queries). Enables schema-driven API clients |
| 7 | Event payload refinements for business rules | Medium | Medium | Add Zod refinements for business logic constraints (e.g., duration_ms must be >= 0, from_state !== to_state for state transitions). Currently only type-level validation |
| 8 | Snapshot testing for schema stability | Low | Low | Add Vitest snapshot tests for all schema structures. Detects unintended schema changes during refactoring |
| 9 | Schema migration tooling | Low | High | Future story: Create migration tooling to transform old event payloads to new schema versions when schema evolves. Similar to database migrations but for JSONB payloads |
| 10 | Event payload compression | Low | High | For large payloads (e.g., full story YAML in payload), add optional compression (gzip/brotli) before JSONB storage. Reduces DB size for telemetry queries |

## Categories

### Edge Cases
- **Gap #3**: Payload size limits - prevents unbounded JSONB storage
- **Gap #5**: Enum evolution - documents process for adding new values
- **Gap #7**: Validation error aggregation - better error reporting

### UX Polish
- **Enhancement #2**: Export TypeScript types for better DX
- **Enhancement #4**: JSDoc examples improve discoverability
- **Enhancement #5**: CLI validation tool for offline testing

### Performance
- **Gap #2**: Validation metrics for monitoring
- **Enhancement #10**: Payload compression for large events

### Observability
- **Gap #6**: Correlation ID helper for distributed tracing
- **Gap #2**: Validation metrics (failure rates, duration)

### Integrations
- **Enhancement #6**: OpenAPI schema generation for external consumers
- **Enhancement #1**: Batch helpers for high-volume orchestrator scenarios

### Future-Proofing
- **Gap #1**: Schema versioning for payload evolution
- **Enhancement #9**: Schema migration tooling for JSONB payload transforms
- **Enhancement #7**: Business rule refinements beyond type validation
- **Enhancement #8**: Snapshot testing for schema stability

## Deferred Items from Story

The following items were explicitly deferred in Non-Goals and should be tracked:

### INFR-0050 (Event SDK)
- Async event queue/buffer
- Batch insert function (`insertWorkflowEventsBatch`)
- Event SDK with hooks/middleware
- Migration tooling to adopt SDK in orchestrator nodes

### TELE-0020 (Prometheus Integration)
- Event sampling/throttling for high-volume events
- Prometheus metrics export from workflow events
- Event-to-metric transformation rules

### TELE-0010 (Telemetry Dashboards)
- Additional composite indexes based on dashboard query patterns
- GIN indexes on JSONB payload for payload-specific queries (e.g., "find all events where payload.model = 'claude-sonnet-4.5'")

### INFR-0060 (Event Archival)
- Event archival/retention policy (move old events to S3)
- Event replay mechanisms for debugging
- Table partitioning strategy for 10M+ rows

### Future Telemetry Story
- Event deduplication cache (Redis-based) beyond database unique constraint
- Event_id prefixes for readability (e.g., `evt_state_01J4Z7X...` instead of plain UUID)
- Return inserted event from insertWorkflowEvent (currently returns void)

## Notes

**Story Verdict**: PASS - No MVP-blocking gaps

All opportunities listed above are enhancements that improve DX, performance, or observability but do NOT block the core user journey of "emit typed, validated workflow events."

The story correctly prioritizes:
1. Type-safe schemas for all 5 event types
2. Fail-fast validation to prevent malformed data
3. Helper functions for easy adoption
4. Metadata columns for distributed tracing

These foundational elements enable:
- INFR-0050 to build Event SDK on top of validated schemas
- TELE-0010 to query clean, validated telemetry data
- Orchestrator nodes to emit events with confidence

**Recommendation**: Proceed with implementation as-is. Future opportunities can be tracked in separate stories based on actual usage patterns and pain points discovered during orchestrator node adoption (INFR-0050 migration).
