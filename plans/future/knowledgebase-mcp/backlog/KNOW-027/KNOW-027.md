---
status: backlog
follow_up_from: KNOW-002
---

# KNOW-027: Adaptive Batch Sizing Based on Rate Limit Headers

## Follow-up Context

- **Parent Story:** KNOW-002 (Embedding Client Implementation)
- **Source:** QA Discovery Notes - Enhancement Opportunity #4
- **Original Finding:** "OpenAI returns X-RateLimit-Remaining-Requests header. Dynamically adjust batch size to avoid 429 errors. Improves throughput under rate pressure."
- **Category:** Enhancement Opportunity
- **Impact:** Medium (improved throughput and reduced retry overhead)
- **Effort:** Low (header parsing and batch size adjustment logic)

## Context

The embedding client (KNOW-002) implements fixed batch size limits (2048 texts per request) and semaphore-based concurrency control (max 10 concurrent requests). When approaching OpenAI API rate limits, this can result in 429 errors requiring exponential backoff retries.

OpenAI's API returns rate limit headers in every response:
- `X-RateLimit-Limit-Requests` - Total requests allowed per time window
- `X-RateLimit-Remaining-Requests` - Remaining requests in current window
- `X-RateLimit-Reset-Requests` - Timestamp when window resets

By reading these headers, the embedding client can dynamically adjust batch sizes and concurrency to maximize throughput while avoiding rate limit errors. This reduces retry overhead, improves latency predictability, and optimizes API usage during high-load scenarios.

## Goal

Improve embedding generation throughput by 15-30% under rate limit pressure through adaptive batch sizing based on OpenAI rate limit headers.

## Non-goals

- **Token-based rate limiting** - Focus on request-level limits only (defer token limits to future story)
- **Predictive rate limit modeling** - Simple reactive adjustment (not ML-based prediction)
- **Multi-account rate limit pooling** - Single API key only
- **Rate limit dashboard** - Defer observability to KNOW-019 (Query Analytics)
- **Automatic API key rotation** - Defer to KNOW-011 (Secrets Management)

## Scope

### Packages Affected

- `apps/api/knowledge-base/embedding-client/batch-processor.ts` - Adaptive batch sizing logic
- `apps/api/knowledge-base/embedding-client/retry-handler.ts` - Rate limit header parsing
- `apps/api/knowledge-base/embedding-client/__types__/index.ts` - Zod schema for rate limit headers

### Endpoints

None - Internal API client optimization only

### Infrastructure

**No database changes** - Rate limit state managed in-memory only

**OpenAI API integration:**
- Parse response headers for rate limit information
- Track rate limit state across requests
- Adjust batch size and concurrency dynamically

## Acceptance Criteria

### AC1: Rate Limit Header Parsing
**Given** OpenAI API response
**When** processing response headers
**Then**:
- Extract `X-RateLimit-Limit-Requests` (e.g., "500")
- Extract `X-RateLimit-Remaining-Requests` (e.g., "120")
- Extract `X-RateLimit-Reset-Requests` (Unix timestamp)
- Parse headers safely (handle missing/malformed headers)
- Log rate limit state after each request

### AC2: Batch Size Reduction Under Rate Pressure
**Given** remaining requests < 20% of limit
**When** preparing next batch request
**Then**:
- Reduce batch size to 50% of current size
- Minimum batch size: 10 texts
- Log batch size adjustment with reason
- Continue processing with smaller batches

### AC3: Batch Size Increase After Window Reset
**Given** rate limit window has reset (current time > reset timestamp)
**When** preparing next batch request
**Then**:
- Restore batch size to default maximum (2048)
- Reset semaphore limit to default (10 concurrent requests)
- Log rate limit window reset event
- Resume normal throughput

### AC4: Concurrency Throttling Under Rate Pressure
**Given** remaining requests < 10% of limit
**When** managing concurrent requests
**Then**:
- Reduce max concurrent requests to 2
- Queue additional requests until capacity available
- Log concurrency adjustment with reason
- Avoid 429 errors through proactive throttling

### AC5: Delayed Request Scheduling Near Rate Limit
**Given** remaining requests = 0 OR < 5
**When** attempting to send request
**Then**:
- Calculate delay until rate limit reset (reset_timestamp - current_time)
- Sleep until reset + 1 second buffer
- Log delay reason and duration
- Resume requests after window resets

### AC6: Graceful Handling of Missing Headers
**Given** OpenAI API response with missing rate limit headers
**When** processing response
**Then**:
- Fall back to default batch size (2048)
- Use default concurrency (10)
- Log warning: "Rate limit headers unavailable, using defaults"
- Continue normal operation (no errors thrown)

### AC7: Rate Limit State Tracking
**Given** multiple concurrent requests
**When** tracking rate limit state
**Then**:
- Maintain thread-safe rate limit state (atomic updates)
- Update state after each response received
- Use most recent header values (latest response wins)
- No race conditions in state updates

### AC8: Logging for Observability
**Given** any batch size or concurrency adjustment
**When** adaptive logic triggers
**Then**:
- Log "Adaptive batch sizing triggered" with current/new values
- Include rate limit context (remaining, limit, reset time)
- Log estimated time saved by avoiding 429 retry
- Use @repo/logger structured logging

### AC9: Configuration Override
**Given** environment variable `ADAPTIVE_BATCHING_ENABLED`
**When** set to "false"
**Then**:
- Disable adaptive batch sizing
- Use fixed batch size and concurrency
- Log "Adaptive batching disabled by configuration"
- Allow opt-out for debugging or testing

### AC10: Throughput Optimization Validation
**Given** simulated rate limit scenario (e.g., 500 req/min limit)
**When** processing 10,000 embedding requests
**Then**:
- Adaptive batching reduces total time by 15-30% vs fixed batching
- Fewer 429 errors than baseline (target: 90% reduction)
- Total API calls comparable to baseline (no excessive overhead)
- Benchmark results documented in proof

### AC11: Retry Logic Integration
**Given** 429 error despite adaptive batching
**When** retrying request
**Then**:
- Exponential backoff still applies (from KNOW-002)
- Rate limit state updated from retry response headers
- Adaptive logic adjusts for subsequent requests
- Log "429 despite adaptive batching" for investigation

### AC12: Header Validation and Sanitization
**Given** rate limit headers with invalid values
**When** parsing headers
**Then**:
- Validate header values (non-negative integers, reasonable timestamps)
- Reject invalid values and fall back to defaults
- Log warning with invalid header details
- No exceptions thrown (graceful degradation)

## Reuse Plan

### Builds on KNOW-002
- Retry handler extended with header parsing logic
- Batch processor enhanced with adaptive sizing
- EmbeddingClient API unchanged (internal optimization)

### Testing Infrastructure
- Vitest test harness from KNOW-002
- Add MSW mocks for rate limit headers
- Simulate rate limit scenarios in tests

### Logging Infrastructure
- @repo/logger for structured logging
- Reuse existing log patterns from KNOW-002

## Architecture Notes

### Adaptive Batch Sizing Algorithm

**Rate pressure calculation:**
```typescript
const ratePressure = remainingRequests / limitRequests
if (ratePressure < 0.20) {
  // Under 20%: reduce batch size by 50%
  currentBatchSize = Math.max(10, currentBatchSize * 0.5)
} else if (ratePressure < 0.10) {
  // Under 10%: reduce concurrency to 2
  maxConcurrency = 2
} else if (ratePressure === 0 || remainingRequests < 5) {
  // Exhausted: wait until reset
  delayMs = (resetTimestamp - Date.now()) + 1000
  await sleep(delayMs)
}
```

**Batch size adjustment strategy:**
- Start with default: 2048 texts/batch
- Reduce by 50% when pressure > 80% (remaining < 20% of limit)
- Minimum batch size: 10 texts (avoid excessive requests)
- Restore to default after window reset

### Rate Limit State Management

**In-memory state object:**
```typescript
interface RateLimitState {
  limit: number           // X-RateLimit-Limit-Requests
  remaining: number       // X-RateLimit-Remaining-Requests
  reset: number           // X-RateLimit-Reset-Requests (Unix timestamp)
  lastUpdated: number     // Timestamp of last update
}
```

**Thread safety:**
- Use mutex or atomic operations for state updates
- Latest header values override previous (no merging)
- State shared across concurrent batch processors

### Header Parsing and Validation

**Safe header extraction:**
```typescript
function parseRateLimitHeaders(response: Response): RateLimitState | null {
  const limit = parseInt(response.headers.get('X-RateLimit-Limit-Requests') ?? '')
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining-Requests') ?? '')
  const reset = parseInt(response.headers.get('X-RateLimit-Reset-Requests') ?? '')

  if (isNaN(limit) || isNaN(remaining) || isNaN(reset)) {
    logger.warn('Invalid rate limit headers, falling back to defaults')
    return null
  }

  return { limit, remaining, reset, lastUpdated: Date.now() }
}
```

### Integration with Existing Retry Logic

**Enhanced retry with rate limit awareness:**
1. Request fails with 429 → parse rate limit headers
2. Update rate limit state
3. Calculate backoff delay (use reset timestamp if available)
4. Retry with adjusted batch size
5. Log adaptive adjustment for observability

## Test Plan

### Unit Tests
- Header parsing correctness (valid, missing, malformed)
- Batch size calculation under different rate pressures
- Concurrency throttling logic
- Rate limit state updates (thread safety)

### Integration Tests
- End-to-end adaptive batching flow
- Rate limit state propagation across requests
- Retry logic integration with adaptive batching
- Configuration toggle (enable/disable adaptive batching)

### Simulation Tests
- Mock rate limit scenarios (500 req/min, 1000 req/min)
- Simulate rate limit window resets
- Measure throughput improvement vs fixed batching
- Validate 429 error reduction

### Performance Tests
- Benchmark throughput under rate pressure
- Measure overhead of adaptive logic (<5ms per request)
- Validate latency predictability
- Compare adaptive vs fixed batching on 10k request workload

## Risks / Edge Cases

### Risk 1: Header Format Changes by OpenAI
**Scenario:** OpenAI changes header names or format
**Mitigation:** Graceful fallback to defaults (AC6), log warnings, monitor OpenAI API changelog

### Risk 2: Clock Skew on Reset Timestamp
**Scenario:** Server clock drift causes incorrect delay calculations
**Mitigation:** Add buffer (1 second) to reset delay, validate timestamp sanity, log unexpected delays

### Risk 3: Overhead from Adaptive Logic
**Scenario:** Header parsing and state management adds latency
**Mitigation:** Benchmark overhead (target <5ms), optimize hot paths, allow disable via config

### Risk 4: False Rate Pressure Detection
**Scenario:** Headers report low remaining requests but actual rate limit is higher
**Mitigation:** Monitor false positive rate, add configuration for pressure threshold tuning, log anomalies

### Risk 5: Thundering Herd After Window Reset
**Scenario:** Multiple concurrent requests surge after reset, hitting new limit immediately
**Mitigation:** Stagger requests with jitter after reset, gradual concurrency ramp-up, monitor burst behavior

## Open Questions

- What are typical OpenAI rate limits for text-embedding-3-small? (Document expected values)
- Should adaptive batching be enabled by default or opt-in?
- What is acceptable overhead for adaptive logic (target <5ms confirmed?)

---

**Next Steps After Story Creation:**
1. Run `/elab-story plans/future/knowledgebase-mcp KNOW-027` to elaborate this story
2. Review OpenAI API documentation for rate limit header specifications
3. Design simulation test scenarios for rate limit validation
