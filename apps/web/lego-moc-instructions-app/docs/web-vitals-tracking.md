# Web Vitals Tracking

## Overview

This document describes the Web Vitals tracking implementation for the LEGO MOC Instructions App (Story 3.3).

Web Vitals tracking captures Core Web Vitals metrics from the frontend and sends them to CloudWatch via a Lambda ingestion endpoint for monitoring in Grafana dashboards.

## Features

- **Core Web Vitals Capture**: LCP, FID, CLS, TTFB, INP, FCP
- **CloudWatch Integration**: Metrics sent to CloudWatch using EMF for efficient querying
- **Batching**: Intelligent batching reduces API calls and costs
- **Environment-Specific**: Console logging in development, CloudWatch in production
- **Performance Optimized**: Non-blocking, uses keepalive for reliability
- **Privacy Aware**: Respects Do Not Track, configurable user agent anonymization

## Architecture

```
Frontend (React)
  ├── web-vitals library captures metrics
  ├── lib/tracking/web-vitals.ts queues and batches metrics
  └── reportWebVitals.ts initializes tracking

            ↓ HTTPS POST

API Gateway (/api/tracking/web-vitals)
  ↓
Lambda (web-vitals-ingestion)
  ├── Validates payload
  ├── Publishes CloudWatch EMF metrics
  └── Returns success/error

            ↓ EMF stdout

CloudWatch Logs → CloudWatch Metrics
  ↓
Grafana Dashboards
```

## Core Web Vitals

| Metric                              | Description           | Good    | Poor     |
| ----------------------------------- | --------------------- | ------- | -------- |
| **LCP** (Largest Contentful Paint)  | Loading performance   | ≤ 2.5s  | > 4.0s   |
| **FID** (First Input Delay)         | Interactivity         | ≤ 100ms | > 300ms  |
| **CLS** (Cumulative Layout Shift)   | Visual stability      | ≤ 0.1   | > 0.25   |
| **TTFB** (Time to First Byte)       | Server responsiveness | ≤ 800ms | > 1800ms |
| **INP** (Interaction to Next Paint) | Responsiveness        | ≤ 200ms | > 500ms  |
| **FCP** (First Contentful Paint)    | Perceived loading     | ≤ 1.8s  | > 3.0s   |

## Implementation

### Frontend (React)

#### Web Vitals Module

**Location**: `src/lib/tracking/web-vitals.ts`

```typescript
import { initWebVitals } from './lib/tracking/web-vitals'

// Initialize Web Vitals tracking
initWebVitals()
```

**Features**:

- Automatic metric capture using `web-vitals` library
- Intelligent batching (configurable batch size and flush interval)
- Critical metrics (LCP, CLS, INP) sent immediately
- Less critical metrics (FID, FCP, TTFB) batched
- Automatic flush on page visibility change and before unload
- Uses `keepalive` flag to ensure metrics sent even if page closes

#### Configuration

**Location**: `src/config/performance.ts`

```typescript
{
  production: {
    sendToAnalytics: true,
    analyticsEndpoint: '/api/analytics',
    batchSize: 10,          // Max metrics per batch
    flushInterval: 5000,    // 5 seconds
  },
  tracking: {
    coreWebVitals: true,
  },
  privacy: {
    anonymizeUserAgent: false,
    excludePII: true,
    respectDNT: true,        // Respect Do Not Track
  }
}
```

#### Environment Behavior

- **Development**: Metrics logged to console only
- **Production**: Metrics sent to CloudWatch via Lambda endpoint
- **Test**: Tracking disabled

### Backend (Lambda)

#### Web Vitals Ingestion Function

**Location**: `apps/api/lego-api-serverless/src/lambda/tracking/web-vitals-ingestion.ts`

**Endpoint**: `POST /api/tracking/web-vitals`

**Request Payload**:

```json
{
  "type": "web-vitals",
  "sessionId": "1706005530123-a1b2c3d4",
  "timestamp": 1706005530123,
  "url": "https://app.example.com/moc-gallery",
  "userAgent": "Mozilla/5.0...",
  "data": {
    "name": "LCP",
    "value": 1850,
    "rating": "good",
    "id": "v3-1706005530123-4321",
    "navigationType": "navigate",
    "delta": 50
  }
}
```

**Response** (Success):

```json
{
  "success": true,
  "message": "Web Vitals metric recorded successfully"
}
```

**Response** (Error):

```json
{
  "error": "Invalid payload format",
  "details": [...]
}
```

#### CloudWatch EMF Module

**Location**: `apps/api/lego-api-serverless/src/lib/tracking/cloudwatch-web-vitals.ts`

**Namespace**: `UserMetrics/Frontend/{stage}`

**Dimensions**:

- `MetricName`: Name of the metric (LCP, FID, CLS, etc.)
- `Rating`: Performance rating (good, needs-improvement, poor)
- `URL`: Page path
- `NavigationType`: Navigation type (navigate, reload, back_forward, etc.)

**Metrics Published**:

- `{MetricName}`: Raw metric value (e.g., `LCP: 1850`)
- `{MetricName}_Count`: Count of metrics (for aggregation)

**Example EMF Output**:

```json
{
  "_aws": {
    "Timestamp": 1706005530123,
    "CloudWatchMetrics": [
      {
        "Namespace": "UserMetrics/Frontend/production",
        "Dimensions": [["MetricName"], ["MetricName", "Rating"], ["MetricName", "URL"]],
        "Metrics": [
          {
            "Name": "LCP",
            "Unit": "Milliseconds",
            "StorageResolution": 60
          },
          {
            "Name": "LCP_Count",
            "Unit": "Count"
          }
        ]
      }
    ]
  },
  "MetricName": "LCP",
  "Rating": "good",
  "URL": "/moc-gallery",
  "NavigationType": "navigate",
  "LCP": 1850,
  "LCP_Count": 1,
  "SessionId": "1706005530123-a1b2c3d4"
}
```

## CloudWatch Queries

### Average LCP by Page

```sql
SELECT AVG(LCP) as AvgLCP, URL
FROM "UserMetrics/Frontend/production"
WHERE MetricName = 'LCP'
GROUP BY URL
ORDER BY AvgLCP DESC
```

### Poor Performance Count by Metric

```sql
SELECT MetricName, COUNT(*) as PoorCount
FROM "UserMetrics/Frontend/production"
WHERE Rating = 'poor'
GROUP BY MetricName
ORDER BY PoorCount DESC
```

### P95 Web Vitals

```sql
SELECT
  PERCENTILE(LCP, 95) as P95_LCP,
  PERCENTILE(FID, 95) as P95_FID,
  PERCENTILE(CLS, 95) as P95_CLS,
  PERCENTILE(INP, 95) as P95_INP
FROM "UserMetrics/Frontend/production"
```

### Performance by Navigation Type

```sql
SELECT NavigationType, AVG(LCP) as AvgLCP
FROM "UserMetrics/Frontend/production"
WHERE MetricName = 'LCP'
GROUP BY NavigationType
```

## Grafana Dashboard Queries

### Average LCP Over Time

```
CloudWatch Metrics Query:
Namespace: UserMetrics/Frontend/production
Metric: LCP
Statistic: Average
Dimensions: MetricName=LCP
Period: 5m
```

### Web Vitals Rating Distribution

```
CloudWatch Metrics Query:
Namespace: UserMetrics/Frontend/production
Metric: LCP_Count
Dimensions: MetricName=LCP, Rating
Statistic: Sum
Period: 1h
```

### Slowest Pages (LCP)

```
CloudWatch Logs Insights:
SELECT URL, AVG(LCP) as AvgLCP
FROM UserMetrics/Frontend/production
WHERE MetricName = 'LCP'
GROUP BY URL
ORDER BY AvgLCP DESC
LIMIT 10
```

## Cost Optimization

### Batching Strategy

- **Critical metrics** (LCP, CLS, INP): Sent immediately
- **Other metrics** (FID, FCP, TTFB): Batched
- **Batch size**: 10 metrics (configurable)
- **Flush interval**: 5 seconds (configurable)

### Estimated Costs

**Assumptions**:

- 1000 users/month
- 10 page views per user
- 6 metrics per page view
- 50% batching efficiency

**Calculations**:

- Total metrics: 1000 × 10 × 6 = 60,000 metrics/month
- With batching: ~30,000 API calls/month
- Lambda invocations: 30,000/month
- Lambda duration: 100ms average
- CloudWatch EMF: 60,000 log entries

**Monthly Cost Estimate**:

- Lambda: $0.06 (30,000 invocations × $0.20 per 1M requests + 100ms compute)
- API Gateway: $0.03 (30,000 requests × $1.00 per 1M requests)
- CloudWatch Logs: $0.30 (60,000 logs × $0.50 per GB)
- CloudWatch Metrics: $0.90 (60 custom metrics × $0.30 per metric)
- **Total**: ~$1.30/month

## Privacy & Compliance

### Do Not Track (DNT)

Web Vitals tracking respects the browser's Do Not Track setting:

```typescript
if (navigator.doNotTrack === '1') {
  // Tracking disabled
}
```

### User Agent Anonymization

Configure in `src/config/performance.ts`:

```typescript
privacy: {
  anonymizeUserAgent: true,  // Don't send user agent to CloudWatch
  excludePII: true,          // Exclude personally identifiable information
}
```

### GDPR Compliance

- No personally identifiable information (PII) is collected by default
- Session IDs are ephemeral and not tied to user accounts
- URLs are path-only (no query parameters with PII)
- User agent can be anonymized

## Troubleshooting

### Metrics Not Appearing in CloudWatch

1. **Check Lambda Logs**:

   ```bash
   aws logs tail /aws/lambda/web-vitals-ingestion --follow
   ```

2. **Verify EMF Format**:
   - EMF must be printed to stdout as JSON
   - Check CloudWatch Logs for Lambda function

3. **Check IAM Permissions**:
   - Lambda needs `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

### High API Gateway Costs

1. **Increase Batch Size**:

   ```typescript
   production: {
     batchSize: 20,  // Increase from 10
   }
   ```

2. **Increase Flush Interval**:
   ```typescript
   production: {
     flushInterval: 10000,  // 10 seconds instead of 5
   }
   ```

### Metrics Delayed

- Check `flushInterval` setting
- Verify `keepalive` flag is working
- Check network connectivity

## Testing

### Development Testing

```bash
# Start dev server
pnpm dev

# Open browser console
# Navigate to different pages
# Check console for Web Vitals logs:
# [Web Vitals] { name: 'LCP', value: 1850, rating: 'good', ... }
```

### Production Testing

```bash
# Build and serve production build
pnpm build
pnpm serve

# Open browser network tab
# Navigate to different pages
# Verify POST requests to /api/tracking/web-vitals
```

### CloudWatch Testing

```bash
# Query CloudWatch Logs
aws logs tail /aws/lambda/web-vitals-ingestion --follow

# Query CloudWatch Metrics
aws cloudwatch get-metric-statistics \
  --namespace UserMetrics/Frontend/production \
  --metric-name LCP \
  --dimensions Name=MetricName,Value=LCP \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300
```

## Best Practices

1. **Monitor P75 and P95**: Don't just look at averages
2. **Track by Page**: Identify problematic pages/routes
3. **Set Up Alerts**: Alert on poor performance thresholds
4. **Regular Review**: Weekly review of Web Vitals dashboards
5. **A/B Testing**: Compare Web Vitals before/after changes
6. **Mobile vs Desktop**: Track separately for different device types

## References

- [Web Vitals Documentation](https://web.dev/vitals/)
- [web-vitals npm package](https://github.com/GoogleChrome/web-vitals)
- [CloudWatch EMF Specification](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html)
- Story 3.3: Frontend Web Vitals Tracking
- Story 2.1-2.4: Grafana Integration
