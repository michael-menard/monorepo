# ADR: Resilience & Observability Infrastructure

**Status:** Accepted
**Date:** 2026-02-05
**Decision Makers:** Engineering Team

## Context

The monorepo lacked standardized patterns for:
1. Protecting external service calls (OpenAI, Cognito, S3, PostgreSQL, Redis)
2. Preventing cascade failures when dependencies are unhealthy
3. Collecting metrics and traces for observability
4. Monitoring API performance and health

## Decision

### Resilience (`@repo/resilience`)

**Circuit Breaker: Opossum**
- Chose `opossum` over custom implementation for consistency
- Provides battle-tested circuit breaker with configurable thresholds
- Integrates with logging for state change visibility

**Rate Limiter: Bottleneck**
- Chose `bottleneck` for its flexible reservoir-based rate limiting
- Supports both concurrency limits and RPM (requests per minute) limits
- Handles queue management and backpressure

**Timeout: AbortController**
- Native browser/Node.js API for cancellable operations
- Enables graceful cancellation propagation to fetch/SDK calls
- Custom `TimeoutError` class for typed error handling

### Observability (`@repo/observability`)

**Tracing: OpenTelemetry**
- Industry-standard distributed tracing
- Auto-instrumentation for HTTP, PostgreSQL, Redis
- Exports to OTLP collector for vendor-agnostic backend

**Metrics: Prometheus + prom-client**
- Pull-based metrics collection (better for containerized workloads)
- Standard HTTP metrics: request rate, latency histograms, error rates
- Custom collectors for circuit breakers and database pools

**Dashboards: Grafana**
- Pre-built dashboards for API, Resilience, and Database monitoring
- Auto-provisioned via Docker volume mounts

## Consequences

### Positive
- Consistent resilience patterns across all services
- Automatic protection against cascade failures
- Full visibility into API performance and health
- Pre-configured dashboards reduce time-to-insight

### Negative
- Additional Docker services increase local resource usage
- OpenTelemetry SDK adds ~50ms startup time
- Metrics collection adds minimal overhead (~1-2% CPU)

## Implementation

### Packages Created
- `packages/backend/resilience/` - Circuit breaker, rate limiter, timeout utilities
- `packages/backend/observability/` - OTel tracing, Prometheus metrics

### Docker Services Added
- `prometheus` - Metrics collection (port 9090)
- `grafana` - Dashboards (port 3003, admin/admin)
- `otel-collector` - Trace collection (ports 4317/4318)

### Service Policies
Pre-configured policies for common services:
- `openAIPolicy` - 60 RPM, 30s timeout, 50% error threshold
- `cognitoPolicy` - 50 concurrent, 10s timeout
- `s3Policy` - 100 concurrent, 30s timeout
- `postgresPolicy` - 50 concurrent (matches pool), 30s timeout
- `redisPolicy` - 200 concurrent, 1s timeout (fail-fast)

## Usage

```typescript
// Using pre-built policy
import { getOpenAIPolicy } from '@repo/resilience'

const result = await getOpenAIPolicy().execute(
  (signal) => openai.embeddings.create({ ... }, { signal }),
)

// Using observability middleware
import { createTracingMiddleware, createHttpMetricsMiddleware } from '@repo/observability'

app.use('*', createTracingMiddleware({ serviceName: 'my-api' }))
app.use('*', createHttpMetricsMiddleware())
```

## Environment Variables

```bash
ENABLE_METRICS=true          # Enable observability (default: false)
METRICS_PORT=9464            # OTel Prometheus exporter port
OTEL_SERVICE_NAME=lego-api   # Service name for traces
```

## Related

- `docker-compose.yml` - Observability stack configuration
- `infra/prometheus/prometheus.yml` - Scrape configuration
- `infra/grafana/dashboards/` - Pre-built dashboards
