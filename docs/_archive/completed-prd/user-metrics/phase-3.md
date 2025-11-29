# User Tracking & Metrics Implementation - Phase 3

Part of the User Metrics PRD brownfield enhancement.

See [user-metrics-prd.md](./user-metrics-prd.md) for complete context.

---

### PHASE 3: Application Instrumentation

### Story 3.1: Lambda CloudWatch EMF Instrumentation

**As a** Backend Developer,
**I want** Lambda functions instrumented with CloudWatch Embedded Metric Format,
**so that** custom application metrics appear in Grafana dashboards.

**Acceptance Criteria:**

1. CloudWatch EMF library installed in Lambda project dependencies
2. Lambda wrapper utility enhanced to emit EMF metrics (cold start, business metrics)
3. Custom metrics defined: execution duration, cold start indicator, error count, invocation count per function
4. Metrics published asynchronously to avoid adding latency
5. Environment-specific metric namespaces configured (dev vs prod)
6. Test metric queries validated in CloudWatch Metrics console before Grafana

**Integration Verification:**

- IV1: Existing Lambda function logic unchanged and tests still pass
- IV2: Lambda execution time increase <50ms due to EMF overhead
- IV3: No errors introduced in Lambda error handling flow

---

### Story 3.2: Structured Logging Implementation

**As a** Backend Developer,
**I want** structured JSON logging implemented across all Lambda functions,
**so that** logs are easily queryable in OpenSearch via Grafana.

**Acceptance Criteria:**

1. Winston or Pino logging library installed and configured
2. Structured log format defined (timestamp, level, message, context, requestId, userId if available)
3. Existing `console.log` statements migrated to structured logger
4. Log levels configured appropriately (ERROR, WARN, INFO, DEBUG)
5. Request correlation IDs added to all log entries for tracing
6. Log output validated in CloudWatch Logs with proper JSON structure

**Integration Verification:**

- IV1: All existing log statements still output (format changed but content preserved)
- IV2: Error handling and alerting based on logs still functional
- IV3: Log volume doesn't increase significantly (within CloudWatch budget)

---

### Story 3.3: Frontend Web Vitals Tracking

**As a** Frontend Developer,
**I want** Web Vitals tracking implemented in the React frontend,
**so that** I can monitor user experience performance in Grafana.

**Acceptance Criteria:**

1. `web-vitals` npm package installed in frontend project
2. Web Vitals tracking module created in `src/lib/tracking/web-vitals.ts`
3. LCP, FID, CLS, TTFB, INP metrics captured on page load/navigation
4. Metrics sent to CloudWatch via API Gateway endpoint (new Lambda function)
5. Metrics visible in CloudWatch Metrics console under custom namespace
6. Dev environment logging to console, prod environment sends to CloudWatch

**Integration Verification:**

- IV1: Vite build process unaffected, no build errors
- IV2: Web Vitals measurement doesn't impact actual Web Vitals scores
- IV3: Application routing and navigation unchanged

---

### Story 3.4: Frontend Error Reporting to CloudWatch

**As a** Frontend Developer,
**I want** unhandled frontend errors reported to CloudWatch,
**so that** I can debug production issues via logs in Grafana.

**Acceptance Criteria:**

1. Error reporting module created in `src/lib/tracking/error-reporter.ts`
2. React error boundary implemented to catch component errors
3. Global error handler for unhandled promise rejections and window errors
4. Error context captured (user agent, URL, stack trace, user session ID)
5. Errors sent to CloudWatch via API Gateway endpoint (batched for efficiency)
6. PII excluded from error reports (no user email, names, etc.)

**Integration Verification:**

- IV1: Existing error handling preserved (errors still display to users appropriately)
- IV2: Application functionality unaffected by error boundary wrapping
- IV3: Error boundary doesn't mask errors in development environment

---

### Story 3.5: Performance Validation and Optimization

**As a** QA Engineer,
**I want** comprehensive performance validation of all tracking instrumentation,
**so that** we confirm <50ms overhead requirement is met.

**Acceptance Criteria:**

1. Lighthouse CI configured to measure performance impact
2. Before/after performance tests run for page load (LCP, FID, CLS)
3. Lambda cold start and execution duration compared before/after EMF instrumentation
4. Bundle size analysis shows <50KB increase from tracking libraries
5. Load testing performed to validate tracking at expected traffic levels
6. Performance regression tests added to CI pipeline

**Integration Verification:**

- IV1: Application performance meets or exceeds pre-instrumentation baselines
- IV2: No performance regressions detected in critical user flows
- IV3: All existing performance tests still pass

---
