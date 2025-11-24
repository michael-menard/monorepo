# Performance & Cost Validation Testing

This directory contains the complete performance and cost validation suite for the LEGO API SST migration.

## Overview

The validation suite ensures that the SST migration meets or exceeds performance and cost targets compared to the ECS baseline:

- ✅ **Response time p95** < 500ms
- ✅ **API throughput** > 100 req/sec
- ✅ **Error rate** < 1%
- ✅ **Cold starts p99** < 2 seconds
- ✅ **Monthly cost** ≤ ECS baseline ($950/month)
- ✅ **Cache hit rate** > 80%

## Directory Structure

```
tests/performance/
├── README.md                  # This file
├── load-test.yml              # Artillery load test configuration
├── test-processor.js          # Custom Artillery functions
├── fixtures/                  # Test fixtures (images, etc.)
│   ├── README.md
│   └── test-image.jpg         # Required for upload tests
└── results/                   # Generated test results
    ├── artillery-report.json  # Raw Artillery JSON report
    ├── artillery-report.html  # HTML visualization
    ├── metrics.json           # Extracted metrics
    ├── comparison-report.json # SST vs ECS comparison
    ├── cost-analysis.json     # AWS cost analysis
    ├── cold-start-analysis.json # Lambda cold start analysis
    └── validation-report.md   # Final validation report
```

## Prerequisites

### Required Tools

```bash
# Artillery for load testing
npm install -g artillery

# tsx for running TypeScript scripts
npm install -g tsx

# Or install locally in this project
pnpm install
```

### AWS Credentials

For cost and cold start analysis, configure AWS credentials:

```bash
# Option 1: AWS CLI profile
export AWS_PROFILE=your-profile

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1
```

### Test Fixtures

Before running tests, ensure you have a test image:

```bash
# Option 1: Download placeholder image
curl -o tests/performance/fixtures/test-image.jpg https://via.placeholder.com/800x600.jpg

# Option 2: Use your own image
cp /path/to/your/image.jpg tests/performance/fixtures/test-image.jpg
```

## Running Tests

### Quick Start (Full Validation Suite)

Run all performance and cost validations:

```bash
# Set environment variables
export API_BASE_URL="https://your-api.example.com"
export TEST_AUTH_TOKEN="your-jwt-token"

# Run full validation
pnpm test:performance
```

This runs:
1. Artillery load test (10 min sustained load)
2. Metrics extraction
3. Baseline comparison
4. Threshold validation
5. Cost analysis (requires AWS credentials)
6. Cold start analysis (requires AWS credentials)
7. Validation report generation

### Individual Commands

Run specific analysis steps:

```bash
# 1. Load test only
artillery run tests/performance/load-test.yml \
  --output tests/performance/results/artillery-report.json

# 2. Extract metrics
pnpm analyze:metrics tests/performance/results/artillery-report.json

# 3. Compare with baseline
tsx scripts/performance/compare-baselines.ts \
  tests/performance/results/metrics.json \
  baselines/ecs-baseline.json

# 4. Validate thresholds
tsx scripts/performance/validate-thresholds.ts \
  tests/performance/results/metrics.json

# 5. Analyze costs (7-day projection)
pnpm analyze:costs 7

# 6. Analyze cold starts (24-hour window)
pnpm analyze:cold-starts 24

# 7. Generate final report
tsx scripts/performance/generate-validation-report.ts \
  tests/performance/results
```

## Load Test Configuration

### Test Phases

The Artillery load test runs in 4 phases:

1. **Warm-up** (60s): 10 users/sec to wake up Lambda functions
2. **Ramp-up** (120s): Gradually increase to 100 users/sec
3. **Sustained load** (600s): 100 users/sec for 10 minutes (1000 concurrent users)
4. **Ramp-down** (60s): Decrease back to 10 users/sec

### Test Scenarios

Traffic is distributed across realistic scenarios:

- **40%** - List MOCs (GET `/api/mocs`)
- **30%** - Get MOC by ID (GET `/api/mocs/:id`)
- **20%** - Search Gallery (GET `/api/gallery?search=...`)
- **10%** - Get Wishlist (GET `/api/wishlist`)
- **5%** - Create MOC (POST `/api/mocs`)
- **2%** - Upload Image (POST `/api/gallery`)
- **3%** - Health Check (GET `/health`)

### Modifying Load Test

Edit `load-test.yml` to adjust:

```yaml
config:
  target: "https://your-api.example.com"
  phases:
    - duration: 600  # Sustained load duration (seconds)
      arrivalRate: 100  # Users per second
```

## Understanding Results

### Performance Metrics (`metrics.json`)

```json
{
  "totalRequests": 90000,
  "successfulRequests": 89800,
  "requestRate": 150,
  "responseTime": {
    "p95": 380,
    "p99": 650
  },
  "errorRate": 0.2,
  "cacheHitRate": 88
}
```

- **p95**: 95% of requests completed in this time or less
- **p99**: 99% of requests completed in this time or less (includes cold starts)
- **errorRate**: Percentage of 5xx errors
- **cacheHitRate**: Percentage of Redis cache hits

### Cost Analysis (`cost-analysis.json`)

```json
{
  "monthlyProjection": 700,
  "costs": {
    "Lambda": 180,
    "RDS": 200,
    "ElastiCache": 100,
    ...
  },
  "comparison": {
    "savings": 250,
    "savingsPercent": 26.3,
    "meetsTarget": true
  }
}
```

### Cold Start Analysis (`cold-start-analysis.json`)

```json
{
  "functions": [
    {
      "functionName": "lego-api-moc-instructions",
      "coldStartP99": 1800,
      "meetsTarget": true
    }
  ],
  "summary": {
    "maxColdStartP99": 1800,
    "averageColdStartP99": 1500
  }
}
```

## Validation Thresholds

Tests are validated against these thresholds:

| Metric | Target | Critical |
|--------|--------|----------|
| Response Time (p95) | < 500ms | ✅ Yes |
| Response Time (p99) | < 2000ms | ✅ Yes |
| Throughput | > 100 req/sec | ✅ Yes |
| Error Rate | < 1% | ✅ Yes |
| Success Rate | > 99% | ✅ Yes |
| Cache Hit Rate | > 80% | ⚠️  No |
| Monthly Cost | ≤ $950 | ✅ Yes |
| Cold Start (p99) | < 2000ms | ✅ Yes |

**Critical** thresholds must pass for validation to succeed.

## Troubleshooting

### Common Issues

#### 1. Artillery Not Found

```bash
npm install -g artillery
# or
pnpm add -D artillery
```

#### 2. Authentication Failures

Ensure `TEST_AUTH_TOKEN` is valid:

```bash
# Get a fresh token from your authentication service
export TEST_AUTH_TOKEN="Bearer your-jwt-token"
```

#### 3. AWS Credentials Error

```bash
# Verify AWS credentials are configured
aws sts get-caller-identity

# Or set credentials manually
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1
```

#### 4. Test Image Missing

```bash
# Download test image
curl -o tests/performance/fixtures/test-image.jpg \
  https://via.placeholder.com/800x600.jpg
```

#### 5. Performance Thresholds Failing

**p95 > 500ms:**
- Check Lambda memory allocation
- Review database indexes
- Optimize slow queries

**Throughput < 100 req/sec:**
- Check Lambda concurrency limits
- Review API Gateway throttling
- Verify RDS connection pool

**Error rate > 1%:**
- Review application logs
- Check for timeout issues
- Verify database connections

### Debug Mode

Run Artillery with verbose logging:

```bash
DEBUG=http artillery run tests/performance/load-test.yml
```

## ECS Baseline

The ECS baseline metrics are stored in `baselines/ecs-baseline.json`:

- **Response Time p95**: 450ms
- **Throughput**: 166 req/sec
- **Monthly Cost**: $950
- **Cache Hit Rate**: 85%

SST performance is compared against these baselines.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Validation

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run performance validation
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_AUTH_TOKEN: ${{ secrets.TEST_AUTH_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: pnpm test:performance

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: tests/performance/results/
```

## Best Practices

1. **Run tests during low-traffic periods** to avoid impacting production users
2. **Warm up Lambda functions** before critical measurements
3. **Monitor AWS costs** during and after load testing
4. **Archive results** for historical comparison
5. **Review HTML reports** for detailed visualizations
6. **Set CloudWatch alarms** to detect performance regressions

## References

- [Artillery Documentation](https://www.artillery.io/docs)
- [AWS Cost Explorer API](https://docs.aws.amazon.com/cost-management/latest/APIReference/API_Operations_AWS_Cost_Explorer_Service.html)
- [CloudWatch Metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/working_with_metrics.html)
- [Story 5.6: Performance & Cost Validation](../../docs/stories/5.6-performance-cost-validation.md)

## Support

For issues or questions:
1. Review this README
2. Check the troubleshooting section
3. Review test logs in `results/artillery-console.log`
4. Consult the story documentation
