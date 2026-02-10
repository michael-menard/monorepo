# Canary Deployment Strategy - Redis Migration (WISH-2124 AC 13)

Strategy for safely migrating from in-memory cache to Redis in production.

## Overview

- **Deployment Type**: Canary (weighted traffic split)
- **Canary Percentage**: 5% of traffic
- **Soak Duration**: 1 hour
- **Rollback Strategy**: Automated or manual based on metrics

## Pre-Deployment Checklist

### Infrastructure

- [ ] ElastiCache Redis cluster deployed (see `infra/elasticache/`)
- [ ] Security groups configured (Lambda → Redis on port 6379)
- [ ] VPC connectivity validated (test from Lambda in VPC)
- [ ] Redis endpoint stored in AWS Secrets Manager
- [ ] CloudWatch billing alarms configured ($50/month threshold)

### Application

- [ ] Redis client code tested in staging environment
- [ ] Integration tests passing (Docker Redis locally)
- [ ] Load tests passing (50 concurrent requests, 0 errors)
- [ ] Fallback mechanism verified (database fallback on cache miss)

### Monitoring

- [ ] CloudWatch dashboard created (cache hit rate, latency, errors)
- [ ] Alarms configured:
  - High error rate (> 0.1%)
  - Low cache hit rate (< 80%)
  - High P95 latency (> 100ms)
- [ ] PagerDuty/Slack alerts wired to CloudWatch

## Deployment Steps

### Step 1: Deploy Lambda with Redis Support (Blue Environment)

```bash
# Deploy new Lambda version with REDIS_URL environment variable
aws lambda update-function-configuration \
  --function-name production-lego-api \
  --environment "Variables={
    REDIS_URL=redis://production-cache.cache.amazonaws.com:6379,
    DATABASE_URL=...,
    JWT_SECRET=...
  }"

# Publish new version
VERSION=$(aws lambda publish-version \
  --function-name production-lego-api \
  --query 'Version' \
  --output text)

echo "New Lambda version: $VERSION"
```

### Step 2: Create Alias with Canary Weights

```bash
# Get current production alias version
CURRENT_VERSION=$(aws lambda get-alias \
  --function-name production-lego-api \
  --name production \
  --query 'FunctionVersion' \
  --output text)

# Update alias with canary routing (95% current, 5% new)
aws lambda update-alias \
  --function-name production-lego-api \
  --name production \
  --routing-config "AdditionalVersionWeights={\"$VERSION\":0.05}"

echo "Canary deployed: 5% → v$VERSION, 95% → v$CURRENT_VERSION"
```

### Step 3: Monitor Canary (1 Hour Soak)

Watch these metrics in CloudWatch:

**Error Rate**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=production-lego-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**P95 Latency**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=production-lego-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics 'p95'
```

**Cache Hit Rate** (via application logs):
```bash
# Query CloudWatch Insights
aws logs start-query \
  --log-group-name /aws/lambda/production-lego-api \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string '
    fields @timestamp, message
    | filter message like /Redis cache hit/
    | stats count() as hits by bin(5m)
  '
```

### Step 4: Promote or Rollback

#### Promote (if metrics pass):

```bash
# Update alias to 100% new version
aws lambda update-alias \
  --function-name production-lego-api \
  --name production \
  --function-version $VERSION

echo "Canary promoted to 100%"
```

#### Rollback (if metrics fail):

```bash
# Revert alias to 100% previous version
aws lambda update-alias \
  --function-name production-lego-api \
  --name production \
  --function-version $CURRENT_VERSION \
  --routing-config '{}'

echo "Canary rolled back to v$CURRENT_VERSION"
```

## Success Criteria

### Metric Thresholds

| Metric | Target | Rollback Threshold | Notes |
|--------|--------|-------------------|-------|
| **Error Rate** | < 0.1% | > 0.1% | 1 error per 1000 requests |
| **Cache Hit Rate** | > 80% | < 80% | Low hit rate = cache not working |
| **P95 Latency** | < 100ms | > 100ms | Significant slowdown from baseline |
| **P99 Latency** | < 200ms | > 300ms | Tail latency acceptable up to 300ms |
| **Cache Miss Latency** | < 200ms | > 300ms | Database fallback should be fast |

### Automated Rollback

CloudWatch Alarms trigger automatic rollback via Lambda:

**Alarm Configuration**:
```yaml
ErrorRateAlarm:
  MetricName: Errors
  Threshold: 0.001  # 0.1%
  EvaluationPeriods: 2  # 10 minutes (2 x 5-minute periods)
  AlarmAction: arn:aws:lambda:us-east-1:123456789012:function:canary-rollback

HighLatencyAlarm:
  MetricName: Duration
  Statistic: p95
  Threshold: 100  # ms
  EvaluationPeriods: 2
  AlarmAction: arn:aws:lambda:us-east-1:123456789012:function:canary-rollback
```

**Rollback Lambda** (`canary-rollback` function):
```typescript
export async function handler(event: CloudWatchAlarm) {
  const lambda = new LambdaClient()
  
  // Revert to previous version
  await lambda.send(new UpdateAliasCommand({
    FunctionName: 'production-lego-api',
    Name: 'production',
    FunctionVersion: process.env.PREVIOUS_VERSION,
    RoutingConfig: {}
  }))
  
  // Notify team
  await sns.publish({
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:ops-alerts',
    Subject: 'ROLLBACK: Redis canary deployment failed',
    Message: `Alarm triggered: ${event.alarmName}\nRolled back to version ${process.env.PREVIOUS_VERSION}`
  })
}
```

## Monitoring Dashboard

### CloudWatch Dashboard

Create dashboard with these widgets:

**1. Error Rate (5-minute buckets)**
```json
{
  "metrics": [
    ["AWS/Lambda", "Errors", { "stat": "Sum", "period": 300 }],
    [".", "Invocations", { "stat": "Sum", "period": 300 }]
  ],
  "yAxis": {
    "left": { "label": "Count" }
  },
  "title": "Error Rate"
}
```

**2. Cache Performance**
```sql
fields @timestamp, message
| filter message like /Redis cache/
| stats 
    count(message) as total,
    count(message like /cache hit/) as hits,
    count(message like /cache miss/) as misses
by bin(5m)
| fields bin, hits / total * 100 as hit_rate
```

**3. Latency Percentiles**
```json
{
  "metrics": [
    ["AWS/Lambda", "Duration", { "stat": "p50" }],
    ["...", { "stat": "p95" }],
    ["...", { "stat": "p99" }]
  ],
  "yAxis": {
    "left": { "label": "Duration (ms)" }
  },
  "title": "Latency Percentiles"
}
```

### Slack Alerts

Configure CloudWatch Alarm → SNS → Lambda → Slack:

**Lambda Function** (`cloudwatch-to-slack`):
```typescript
export async function handler(event: SNSEvent) {
  const alarm = JSON.parse(event.Records[0].Sns.Message)
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `🚨 Canary Deployment Alert`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Alarm', value: alarm.AlarmName, short: true },
          { title: 'Status', value: alarm.NewStateValue, short: true },
          { title: 'Reason', value: alarm.NewStateReason }
        ]
      }]
    })
  })
}
```

## Rollback Plan

### Manual Rollback Trigger

If metrics are inconclusive but you suspect issues:

```bash
# Emergency rollback script
./scripts/rollback-canary.sh production-lego-api $PREVIOUS_VERSION
```

**rollback-canary.sh**:
```bash
#!/bin/bash
set -e

FUNCTION_NAME=$1
PREVIOUS_VERSION=$2

echo "Rolling back $FUNCTION_NAME to version $PREVIOUS_VERSION..."

aws lambda update-alias \
  --function-name $FUNCTION_NAME \
  --name production \
  --function-version $PREVIOUS_VERSION \
  --routing-config '{}'

echo "Rollback complete. Verifying..."
aws lambda get-alias --function-name $FUNCTION_NAME --name production

# Send notification
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:123456789012:ops-alerts \
  --subject "Manual Rollback: $FUNCTION_NAME" \
  --message "Rolled back $FUNCTION_NAME to version $PREVIOUS_VERSION by $(whoami)"
```

### Fallback to In-Memory Cache

If Redis is completely unavailable, application falls back to in-memory cache:

**How it works**:
1. `getRedisClient()` returns `null` if `REDIS_URL` not set
2. DI container uses `createInMemoryCache()` as fallback
3. Application continues with in-memory cache (Lambda-local only)

**Emergency fallback** (disable Redis entirely):
```bash
# Remove REDIS_URL from Lambda environment
aws lambda update-function-configuration \
  --function-name production-lego-api \
  --environment "Variables={
    DATABASE_URL=...,
    JWT_SECRET=...
  }"

# Note: REDIS_URL is removed, Lambda falls back to in-memory
```

### Rollback Communication

**Internal Communication** (via Slack):
```
🔴 ROLLBACK INITIATED
- Service: LEGO API (production)
- Reason: [Error rate exceeded 0.1% | Cache hit rate below 80% | Manual decision]
- Action: Reverted to version $PREVIOUS_VERSION (in-memory cache)
- Status: Monitoring for stability
- Next Steps: [Root cause analysis | Redis debugging]
```

**External Communication** (Status Page):
```
Investigating: LEGO API Deployment Rollback
We rolled back a recent deployment due to [metric issue]. 
Service is stable on previous version. No user impact expected.
Status: Monitoring
Updated: [timestamp]
```

## Post-Deployment Review

After successful canary deployment:

### 1. Verify Full Traffic Migration

```bash
# Check alias routing
aws lambda get-alias \
  --function-name production-lego-api \
  --name production

# Should show:
# - FunctionVersion: $NEW_VERSION
# - RoutingConfig: {} (no additional weights)
```

### 2. Monitor for 24 Hours

Continue monitoring these metrics:
- Cache hit rate (should stabilize > 90%)
- Error rate (should remain < 0.1%)
- Cost (should match projections ~$25/month)

### 3. Document Learnings

Create post-mortem document:
```markdown
# Redis Migration - Production Deployment

**Date**: 2026-02-08
**Duration**: 1 hour canary + 24 hour monitoring
**Outcome**: Success

## Metrics
- Error Rate: 0.02% (within target < 0.1%)
- Cache Hit Rate: 94% (above target > 80%)
- P95 Latency: 42ms (well below target < 100ms)

## Issues Encountered
- None

## Action Items
- [ ] Update runbook with actual metrics
- [ ] Create automated canary deployment script
- [ ] Document Redis debugging procedures
```

### 4. Update Runbooks

Add new operational procedures:
- [Redis Connection Troubleshooting](../../runbooks/redis-connection-issues.md)
- [Cache Invalidation Procedures](../../runbooks/cache-invalidation.md)
- [ElastiCache Failover Response](../../runbooks/elasticache-failover.md)

## Related Documentation

- [ElastiCache Infrastructure](../../infra/elasticache/README.md)
- [Cost Monitoring](../infrastructure/cost-monitoring.md)
- [API README](../../apps/api/lego-api/README.md)
- [AWS Lambda Aliases & Versions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html)
