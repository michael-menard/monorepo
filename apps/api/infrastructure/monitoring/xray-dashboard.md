# X-Ray Dashboard Configuration (Story 5.3)

This document describes how to create and use X-Ray dashboards for monitoring the LEGO API Serverless application.

## Overview

X-Ray provides built-in dashboards and service maps for distributed tracing. This guide covers:
- Service Map visualization
- Trace analytics
- Creating custom CloudWatch dashboards with X-Ray metrics

## Built-in X-Ray Console

### Service Map

The X-Ray service map automatically visualizes your application architecture:

**To access:**
1. Open [X-Ray Console](https://console.aws.amazon.com/xray)
2. Click "Service map" in the left sidebar
3. Select time range (last hour, day, week)

**Expected Service Map:**
```
                    ┌─────────────┐
                    │  API Gateway│
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐   ┌─────▼──────┐   ┌────▼───────┐
    │ MOC Lambda │   │Gallery Lam.│   │Wishlist Lam│
    └─────┬──────┘   └─────┬──────┘   └────┬───────┘
          │                │                │
    ┌─────┼────────────────┼────────────────┼─────┐
    │     │                │                │     │
┌───▼───┐ │ ┌───────┐  ┌──▼───┐  ┌────────▼─┐ ┌─▼──────┐
│  RDS  │ └─┤ Redis │  │  S3  │  │OpenSearch│ │Cognito │
└───────┘   └───────┘  └──────┘  └──────────┘ └────────┘
```

### Trace Analytics

X-Ray provides built-in trace analytics:

**To access:**
1. Go to X-Ray Console → "Traces"
2. Use filter expressions to find specific traces:

```
# Find traces with errors
fault = true

# Find traces for specific user
annotation.userId = "user123"

# Find slow traces (>1 second)
responsetime > 1

# Find traces for specific endpoint
annotation.path = "/api/mocs/{id}"

# Find traces with database calls taking >500ms
service(id(name: "lego-api-serverless")) { duration > 0.5 }
```

## Custom CloudWatch Dashboard

Create a CloudWatch dashboard that includes X-Ray metrics alongside other application metrics.

### Dashboard Configuration

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "X-Ray Trace Count",
        "metrics": [
          [ "AWS/XRay", "TraceCount", { "stat": "Sum", "period": 300 } ]
        ],
        "region": "us-east-1",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "X-Ray Error Traces",
        "metrics": [
          [ "AWS/XRay", "ErrorCount", { "stat": "Sum", "period": 300, "color": "#d62728" } ],
          [ ".", "FaultCount", { "stat": "Sum", "period": 300, "color": "#ff7f0e" } ]
        ],
        "region": "us-east-1",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Response Time Distribution",
        "metrics": [
          [ "AWS/XRay", "ResponseTime", { "stat": "Average" } ],
          [ "...", { "stat": "p99" } ],
          [ "...", { "stat": "p95" } ]
        ],
        "region": "us-east-1"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Service Dependency Health",
        "metrics": [
          [ "AWS/RDS", "DatabaseConnections", { "stat": "Sum" } ],
          [ "AWS/ElastiCache", "CurrConnections", { "stat": "Sum" } ],
          [ "AWS/ES", "ClusterStatus.green", { "stat": "Sum" } ]
        ]
      }
    }
  ]
}
```

### Creating Dashboard via CLI

```bash
aws cloudwatch put-dashboard \
  --dashboard-name lego-api-xray-analytics \
  --dashboard-body file://xray-dashboard.json
```

## Key Metrics to Monitor

### 1. Trace Volume
- **Metric**: `TraceCount`
- **Threshold**: Should correlate with request volume
- **Alert**: If TraceCount drops to 0 (tracing failure)

### 2. Error Rate
- **Metrics**: `ErrorCount`, `FaultCount`
- **Threshold**: <1% of total traces
- **Alert**: ErrorCount > 100/hour

### 3. Response Time
- **Metrics**: `ResponseTime` (p50, p95, p99)
- **Thresholds**:
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1000ms
- **Alert**: p99 > 2000ms

### 4. Throttling
- **Metric**: `ThrottleCount`
- **Threshold**: Should be 0
- **Alert**: ThrottleCount > 0

## Trace Search Queries

### Common Queries

```bash
# Find all failed MOC creation requests
annotation.method = "POST" AND annotation.path CONTAINS "/api/mocs" AND fault = true

# Find slow database queries
service(id(name: "RDS")) { duration > 1.0 }

# Find S3 upload errors
service(id(name: "S3")) { error = true }

# Find traces for specific user with errors
annotation.userId = "user123" AND fault = true

# Find traces with Redis cache misses (if annotated)
annotation.cacheHit = false
```

### Trace Timeline Analysis

When viewing a specific trace:
1. Check total duration
2. Identify bottleneck subsegments (longest duration)
3. Look for sequential vs parallel operations
4. Check for retry patterns
5. Verify database query performance

## Service Map Insights

### Health Indicators

**Green node**: Service is healthy (no errors in sampled period)
**Yellow node**: Some errors (<5%)
**Red node**: High error rate (>5%)
**Orange edge**: Connection has errors

### Analyzing Dependencies

1. **Click on a service** to see:
   - Request count
   - Error rate
   - Response time histogram
   - Top paths

2. **Click on an edge** to see:
   - Calls between services
   - Latency distribution
   - Error rate for this connection

## Alerts Based on X-Ray

### CloudWatch Alarms

```typescript
// Example alarm for high error rate
new aws.cloudwatch.MetricAlarm('XRayHighErrorRate', {
  alarmName: 'lego-api-xray-high-error-rate',
  comparisonOperator: 'GreaterThanThreshold',
  evaluationPeriods: 2,
  metricName: 'ErrorCount',
  namespace: 'AWS/XRay',
  period: 300,
  statistic: 'Sum',
  threshold: 100,
  alarmDescription: 'Alert when X-Ray error count exceeds 100 in 5 minutes',
  alarmActions: [snsTopicArn],
})
```

## Trace Annotations and Metadata

### Searchable Annotations

Annotations are indexed and searchable:
- `userId`: User who made the request
- `method`: HTTP method (GET, POST, etc.)
- `path`: Request path
- `functionName`: Lambda function name

### Non-indexed Metadata

Metadata provides additional context but isn't searchable:
- Request/response bodies (sanitized)
- Path parameters
- Query string parameters
- Error stack traces

## Integrating with Other Tools

### Export to CloudWatch Logs Insights

X-Ray traces can be correlated with CloudWatch Logs:

```
fields @timestamp, @message
| filter @message like /requestId: abc123/
| sort @timestamp desc
```

### Export to Third-Party APM

For advanced analytics, consider exporting to:
- Datadog APM
- New Relic
- Dynatrace
- Honeycomb

## Dashboard Maintenance

### Weekly Review
- Check p99 response times
- Identify new error patterns
- Review service map for unexpected dependencies

### Monthly Review
- Analyze trace costs vs. sampling rate
- Identify opportunities for performance optimization
- Update sampling rules if needed

## Troubleshooting

### No Traces Appearing

1. Verify Lambda has `tracing: 'active'` in SST config
2. Check Lambda execution role has X-Ray permissions:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "xray:PutTraceSegments",
       "xray:PutTelemetryRecords"
     ],
     "Resource": "*"
   }
   ```
3. Verify X-Ray SDK is installed: `pnpm list aws-xray-sdk-core`
4. Check Lambda logs for X-Ray errors

### Service Map Incomplete

1. Ensure all AWS SDK clients are instrumented
2. Verify subsegments are properly closed
3. Check if sampling rate is too low (increase temporarily)

### High Costs

1. Reduce sampling rate (10% → 5%)
2. Adjust reservoir size
3. Filter out health check endpoints from sampling

## Related Resources

- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/latest/devguide/)
- [X-Ray Service Map](https://docs.aws.amazon.com/xray/latest/devguide/xray-console.html#xray-console-servicemap)
- Story 5.3: Implement AWS X-Ray Distributed Tracing
- X-Ray Sampling Rules: See `xray-sampling-rule.md`
