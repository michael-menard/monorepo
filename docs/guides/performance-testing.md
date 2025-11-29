# Performance Testing & Validation

**Story 3.5: Performance Validation & Optimization**

This document describes the comprehensive performance testing strategy used to validate that tracking instrumentation meets the <50ms overhead requirement and maintains application performance.

## Overview

The performance testing suite validates:

1. **Core Web Vitals** (LCP, FID, CLS, TTFB, FCP, INP)
2. **Bundle Size** (<50KB overhead from tracking libraries)
3. **Lambda Performance** (<50ms overhead from EMF instrumentation)
4. **Load Testing** (System performance under expected traffic)
5. **Regression Detection** (Automated performance checks in CI)

## Performance Requirements

### Core Web Vitals Targets

| Metric | Good   | Needs Improvement | Poor    |
| ------ | ------ | ----------------- | ------- |
| LCP    | ≤2.5s  | 2.5s - 4.0s       | >4.0s   |
| FID    | ≤100ms | 100ms - 300ms     | >300ms  |
| CLS    | ≤0.1   | 0.1 - 0.25        | >0.25   |
| TTFB   | ≤800ms | 800ms - 1800ms    | >1800ms |
| FCP    | ≤1.8s  | 1.8s - 3.0s       | >3.0s   |
| INP    | ≤200ms | 200ms - 500ms     | >500ms  |

### Bundle Size Budgets

- **Tracking Overhead**: <50KB (gzip)
- **Total JavaScript**: <500KB (gzip)
- **Total CSS**: <100KB (gzip)
- **Total Assets**: <2MB

### Lambda Performance Targets

- **Cold Start Overhead**: <50ms
- **Warm Start Overhead**: <50ms
- **P95 Latency**: <300ms
- **P99 Latency**: <500ms

### Load Testing Targets

- **Concurrent Users**: 1000
- **Web Vitals Events**: 10,000/hour
- **Error Reports**: 100/hour
- **Error Rate**: <1%

## Testing Tools

### 1. Lighthouse CI

Automated performance testing using Google Lighthouse.

**Configuration**: `apps/web/lego-moc-instructions-app/lighthouserc.js`

**Features:**

- Performance budgets for all Core Web Vitals
- Multiple test runs for statistical significance
- Tests across critical user flows
- Regression detection

**Usage:**

```bash
# Run Lighthouse CI
cd apps/web/lego-moc-instructions-app
pnpm lhci

# Individual steps
pnpm lhci:collect  # Collect metrics
pnpm lhci:assert   # Assert against budgets
```

### 2. Bundle Size Analysis

Analyzes production bundle size and validates tracking overhead.

**Script**: `scripts/performance/analyze-bundle-size.ts`

**Validates:**

- Total bundle size
- JavaScript size (raw and gzip)
- CSS size (raw and gzip)
- Tracking overhead (<50KB requirement)

**Usage:**

```bash
cd apps/web/lego-moc-instructions-app
pnpm build
pnpm perf:bundle
```

**Output:**

- Console report with size breakdown
- JSON report: `performance-reports/bundle-analysis.json`
- Fails if tracking overhead exceeds 50KB

### 3. Lambda Performance Analysis

Analyzes Lambda cold start times and execution duration.

**Script**: `scripts/performance/analyze-lambda-performance.ts`

**Metrics:**

- Cold start count and average duration
- Warm start count and average duration
- P50, P95, P99 latency
- Memory usage
- Invocation count

**Usage:**

```bash
cd apps/api/lego-api-serverless
export STAGE=dev  # or staging/production
pnpm perf:lambda
```

**Requirements:**

- AWS credentials configured
- CloudWatch Logs access
- Lambda functions deployed

**Output:**

- Console report with performance metrics
- JSON report: `performance-reports/lambda-performance.json`

### 4. Load Testing

Simulates production traffic using Artillery.

**Configuration**: `scripts/performance/load-test-tracking.yml`

**Test Scenarios:**

- Web Vitals reporting (90% of traffic)
- Error reporting (10% of traffic)
- Batch reporting (5% of traffic)

**Load Profile:**

- Warm-up: 60s @ 10 req/s
- Ramp-up: 120s ramping to 50 req/s
- Sustained: 300s @ 50 req/s
- Spike: 60s @ 100 req/s
- Cool-down: 60s @ 10 req/s

**Usage:**

```bash
cd apps/api/lego-api-serverless
export API_BASE_URL=https://your-api-url
./scripts/performance/run-load-test.sh
```

**Output:**

- Console report with latency metrics
- JSON results: `performance-reports/load-test-results.json`
- HTML report: `performance-reports/load-test-report.html`

### 5. Comprehensive Performance Suite

Runs all performance tests in sequence.

**Script**: `scripts/performance/run-performance-tests.sh`

**Includes:**

1. Application build
2. Bundle size analysis
3. Lighthouse CI
4. Performance summary generation

**Usage:**

```bash
cd apps/web/lego-moc-instructions-app
pnpm perf
```

**Output:**

- All individual test reports
- Summary markdown: `performance-reports/summary.md`
- Exit code 0 if all tests pass, 1 if any fail

## Performance Testing Workflow

### Baseline Measurement

Before adding tracking instrumentation:

```bash
# Frontend baseline
cd apps/web/lego-moc-instructions-app
pnpm build
pnpm perf:bundle > baseline-bundle.txt
pnpm lhci > baseline-lighthouse.txt

# Backend baseline
cd apps/api/lego-api-serverless
pnpm perf:lambda > baseline-lambda.txt
```

Save these baseline reports for comparison.

### After Instrumentation

After adding tracking features:

```bash
# Frontend validation
cd apps/web/lego-moc-instructions-app
pnpm perf  # Runs full test suite

# Backend validation
cd apps/api/lego-api-serverless
pnpm perf:lambda
pnpm perf:load-test
```

### Comparison

Compare metrics:

- **Bundle Size**: Tracking overhead should be <50KB
- **Lighthouse**: No regressions in Core Web Vitals
- **Lambda**: Overhead <50ms for cold and warm starts
- **Load Test**: Error rate <1%, P95 <300ms

## Continuous Integration

### GitHub Actions Workflow

Performance tests run automatically on:

- Pull requests to main
- Scheduled nightly builds
- Manual workflow dispatch

**Workflow file**: `.github/workflows/performance.yml`

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM
  workflow_dispatch:

jobs:
  frontend-performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter @repo/lego-moc-instructions-app perf

      - name: Upload performance reports
        uses: actions/upload-artifact@v4
        with:
          name: performance-reports
          path: apps/web/lego-moc-instructions-app/performance-reports/

  backend-performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm --filter lego-api-serverless perf:lambda
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          STAGE: dev

      - name: Upload Lambda reports
        uses: actions/upload-artifact@v4
        with:
          name: lambda-reports
          path: apps/api/lego-api-serverless/performance-reports/
```

### Performance Budgets Enforcement

Tests fail automatically if:

- Lighthouse CI assertions fail
- Bundle size exceeds budget
- Lambda overhead >50ms
- Load test error rate >1%

## Critical User Flows

Performance is validated across key user journeys:

### 1. Homepage Load

- **Route**: `/`
- **Metrics**: LCP, FID, CLS, TTFB
- **Budget**: LCP <2.5s, FID <100ms, CLS <0.1

### 2. Gallery Browsing

- **Route**: `/gallery`
- **Metrics**: LCP (images), CLS (layout), INP (interactions)
- **Budget**: LCP <2.5s, CLS <0.1, INP <200ms

### 3. Wishlist Operations

- **Route**: `/wishlist`
- **Metrics**: FID, INP, TBT
- **Budget**: FID <100ms, INP <200ms

### 4. Profile Viewing

- **Route**: `/profile`
- **Metrics**: LCP, FCP, TTI
- **Budget**: LCP <2.5s, TTI <3.8s

## Optimization Strategies

### Bundle Size Optimization

1. **Code Splitting**: Lazy load tracking modules
2. **Tree Shaking**: Ensure unused code is eliminated
3. **Minification**: Use production builds
4. **Compression**: Enable gzip/brotli

### Lambda Optimization

1. **Cold Start Reduction**:
   - Minimize dependencies
   - Use Lambda layers for common code
   - Enable provisioned concurrency for critical functions

2. **Execution Optimization**:
   - Reduce EMF overhead
   - Batch CloudWatch API calls
   - Optimize memory allocation

3. **Monitoring**:
   - Track cold start ratio
   - Monitor P99 latency
   - Set up CloudWatch alarms

### Frontend Optimization

1. **Lazy Loading**:

   ```typescript
   // Lazy load error reporting
   const initErrorReporting = () => import('./lib/tracking/error-reporting')
   ```

2. **Batching**:
   - Configure appropriate batch sizes
   - Tune flush intervals
   - Prioritize critical errors

3. **Sampling**:
   ```typescript
   // Sample 10% of Web Vitals events
   if (Math.random() < 0.1) {
     reportWebVitals(metric)
   }
   ```

## Troubleshooting

### Lighthouse CI Failures

**Issue**: Performance score drops

**Solutions**:

1. Check bundle size increases
2. Review JavaScript execution time
3. Analyze network requests
4. Check for render-blocking resources

### Bundle Size Exceeded

**Issue**: Tracking overhead >50KB

**Solutions**:

1. Review dependencies
2. Check for duplicate code
3. Optimize imports (use tree-shakeable exports)
4. Consider lazy loading

### Lambda High Latency

**Issue**: Cold starts or execution >50ms overhead

**Solutions**:

1. Reduce package dependencies
2. Optimize EMF payload size
3. Use Lambda layers
4. Increase memory allocation
5. Enable provisioned concurrency

### Load Test Failures

**Issue**: High error rate or latency

**Solutions**:

1. Check API rate limits
2. Review CloudWatch API quotas
3. Optimize Lambda concurrency
4. Check network configuration
5. Review error logs

## Performance Monitoring

### CloudWatch Dashboards

Create dashboards to monitor:

- Lambda execution duration
- Cold start frequency
- Error rates
- API Gateway latency
- CloudWatch API usage

### Grafana Integration

Use Grafana to visualize:

- Core Web Vitals trends
- Error report volume
- Performance regressions
- Cost metrics

### Alerting

Set up alerts for:

- P95 latency >300ms
- Error rate >1%
- Cold start ratio >20%
- Bundle size increase >10%

## Best Practices

1. **Run Tests Regularly**: Automated CI runs + manual validation before releases
2. **Compare with Baseline**: Always measure against pre-instrumentation baseline
3. **Test in Production**: Use staging/production for realistic validation
4. **Monitor Continuously**: Don't just test once - monitor ongoing performance
5. **Optimize Incrementally**: Address regressions immediately
6. **Document Changes**: Record all optimizations and their impact

## Related Documentation

- [Web Vitals Tracking](../apps/web/lego-moc-instructions-app/docs/web-vitals-tracking.md)
- [Error Reporting](../apps/web/lego-moc-instructions-app/docs/error-reporting.md)
- [Story 3.5](./stories/complete/3.5.performance-validation-optimization.md)

## References

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals](https://web.dev/vitals/)
- [Artillery Load Testing](https://www.artillery.io/docs)
- [AWS Lambda Performance](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
