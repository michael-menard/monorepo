---
story_id: KNOW-021
title: KB Monitoring and Metrics Export
status: backlog
created: 2026-02-22
updated: 2026-02-22
epic: KNOW
feature: Knowledge Base
type: feature
priority: medium
---

# KNOW-021: KB Monitoring and Metrics Export

## Context

The KB MCP server is core infrastructure that agents depend on constantly, yet there is no observability into its runtime behavior. Specific gaps:

- A TODO in `audit-logger.ts` says "Emit monitoring metric (audit_write_failure counter)" — never implemented
- No metrics for embedding cache hit rate (are we actually saving API calls?)
- No search latency percentiles (are queries getting slower as data grows?)
- No tool error rate tracking (which tools fail most often?)
- No DB connection pool saturation signal

This means operational issues (slow queries, cache ineffectiveness, embedding API degradation) are invisible until agents start failing or token costs spike.

## Goal

Implement structured metrics emission from the KB MCP server covering the key operational signals: search latency, cache hit rate, tool error rates, and audit write failures. Emit as structured log lines that can be consumed by a dashboard or log aggregator.

## Non-goals

- A metrics UI or dashboard (log emission only in v1)
- Distributed tracing (correlation IDs already exist; don't need full spans yet)
- Alerting infrastructure
- External metrics backends (Prometheus, Datadog) — structured logs are the output format

## Scope

### Packages Affected

- `apps/api/knowledge-base/src/mcp-server/logger.ts` — add `emitMetric()` helper
- `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts` — emit metrics at tool start/end
- `apps/api/knowledge-base/src/mcp-server/access-control.ts` — emit cache hit/miss metrics once caching is implemented (see KNOW-016)
- `apps/api/knowledge-base/src/search/kb-search.ts` — emit search latency breakdown metrics
- `apps/api/knowledge-base/src/crud-operations/kb-add.ts` — emit audit write failure metric

### Metrics to Emit

| Metric | Type | Tags |
|--------|------|------|
| `kb.tool.duration_ms` | histogram | tool_name, success |
| `kb.tool.error` | counter | tool_name, error_type |
| `kb.search.latency_ms` | histogram | mode (semantic/keyword/hybrid) |
| `kb.cache.hit` | counter | — |
| `kb.cache.miss` | counter | — |
| `kb.audit.write_failure` | counter | — |
| `kb.embedding.api_call` | counter | cached (true/false) |

### Emit Format

```json
{ "metric": "kb.tool.duration_ms", "value": 142, "tags": { "tool_name": "kb_search", "success": true }, "timestamp": "2026-02-22T..." }
```

Emitted via `logger.info` with a `type: 'metric'` field so they can be filtered from regular logs.

## Acceptance Criteria

### AC1: Tool Duration is Logged for Every Tool Call
**Given** any KB MCP tool is called
**When** it completes (success or error)
**Then** a `kb.tool.duration_ms` metric log line is emitted with tool name and success flag

### AC2: Search Latency Breakdown is Logged
**Given** `kb_search` executes
**When** it completes
**Then** separate latency metrics are emitted for: embedding generation, semantic search, keyword search, RRF merge

### AC3: Audit Write Failure Counter is Emitted
**Given** an audit log write fails
**When** the error is caught
**Then** a `kb.audit.write_failure` counter metric is emitted (fulfilling the existing TODO)

### AC4: Cache Hit/Miss is Logged (Depends on KNOW-016)
**Given** KNOW-016 is complete
**When** a search cache hit or miss occurs
**Then** `kb.cache.hit` or `kb.cache.miss` is emitted

### AC5: Metrics are Filterable from Regular Logs
**Given** both metrics and regular log lines exist
**When** filtering logs by `type: 'metric'`
**Then** only metric lines are returned

## Reuse Plan

- Existing `logger.ts` in MCP server — add `emitMetric()` as a thin wrapper
- Existing correlation ID tracking — include in metric tags
- Existing slow query detection (`LOG_SLOW_QUERIES_MS`) — preserve this, metrics complement it

## Test Plan

- Unit test: `emitMetric` produces correctly structured log line
- Unit test: tool handler emits duration metric on success and error
- Unit test: audit write failure emits counter metric
- Integration test: search emits latency breakdown metrics

## Risks

- **Log volume**: Every tool call emits at least one metric log. At high agent concurrency this could increase log volume significantly. Mitigation: metrics use `logger.debug` level by default, `logger.info` only for errors/anomalies.

## Depends On

- KNOW-016 (result cache) for cache hit/miss metrics — AC4 is blocked until KNOW-016 ships, but ACs 1-3 and 5 are independent
