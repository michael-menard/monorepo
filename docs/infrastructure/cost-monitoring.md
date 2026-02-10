# ElastiCache Cost Monitoring (WISH-2124 AC 12)

Monitoring and alerting strategy for ElastiCache Redis infrastructure costs.

## Cost Overview

### Base Costs

| Component | Type | Monthly Cost | Annual Cost |
|-----------|------|--------------|-------------|
| **Staging** | cache.t3.micro | $12.41 | $148.92 |
| **Production** | cache.t3.small | $24.82 | $297.84 |
| **Data Transfer** | ~1GB/month | $0.09 | $1.08 |
| **Snapshots** | 5 daily (5GB total) | $0.50 | $6.00 |
| **TOTAL (both envs)** | | **$37.82/mo** | **$453.84/yr** |

*Prices for us-east-1 as of 2026. Actual costs may vary.*

### Cost Optimization Opportunities

1. **Reserved Instances**:
   - 1-year: ~36% savings ($23.91/mo → $15.20/mo)
   - 3-year: ~59% savings ($23.91/mo → $9.70/mo)

2. **Snapshot Retention**:
   - Reduce from 5 days to 3 days: Save $0.20/mo per environment

3. **Node Type**:
   - If cache hit rate > 95%, current sizing is appropriate
   - If < 80%, consider cache.t3.nano ($6.20/mo) for staging

## Billing Alarms (AC 12)

### Setup

The `infra/monitoring/billing-alarms.tf` Terraform module creates:

1. **ElastiCache Cost Alarm**: Triggers at $50/month threshold
2. **Data Transfer Alarm**: Triggers at $10/month threshold

### Deploy Billing Alarms

```bash
# Initialize Terraform
cd infra/monitoring
terraform init

# Create SNS topic for notifications (optional)
aws sns create-topic --name ops-cost-alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:ops-cost-alerts \
  --protocol email \
  --notification-endpoint ops@example.com

# Deploy alarms
terraform apply \
  -var="environment=production" \
  -var="monthly_cost_threshold=50" \
  -var="sns_topic_arn=arn:aws:sns:us-east-1:123456789012:ops-cost-alerts"
```

### Alarm Thresholds

| Environment | ElastiCache Threshold | Data Transfer Threshold | Reasoning |
|-------------|----------------------|-------------------------|-----------|
| Staging | $50/month | $10/month | 4x normal cost (detect runaway cache) |
| Production | $50/month | $10/month | 2x normal cost (detect anomalies) |

### Notification Actions

When alarm triggers:
1. Email sent to ops team (via SNS)
2. Slack notification (via SNS → Lambda → Slack webhook)
3. PagerDuty incident (critical only)

## Cost Allocation Tags

All ElastiCache resources are tagged for cost tracking:

```yaml
Service: ElastiCache
Feature: FeatureFlags
Environment: staging | production
Story: WISH-2124
```

### View Costs by Tag

**AWS Cost Explorer**:
1. Navigate to AWS Billing → Cost Explorer
2. Filter by Tag: `Feature=FeatureFlags`
3. Group by: `Environment`
4. Time range: Last 6 months
5. Granularity: Monthly

**AWS CLI**:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics BlendedCost UnblendedCost \
  --group-by Type=TAG,Key=Feature \
  --filter file://cost-filter.json
```

**cost-filter.json**:
```json
{
  "And": [
    {
      "Dimensions": {
        "Key": "SERVICE",
        "Values": ["Amazon ElastiCache"]
      }
    },
    {
      "Tags": {
        "Key": "Feature",
        "Values": ["FeatureFlags"]
      }
    }
  ]
}
```

## Monthly Cost Review Process

### Schedule

- **When**: 1st day of each month
- **Who**: Engineering Lead + DevOps
- **Duration**: 15 minutes

### Checklist

1. **Review Previous Month's Costs**:
   - [ ] ElastiCache instance costs
   - [ ] Data transfer costs
   - [ ] Snapshot storage costs
   - [ ] Compare to budget ($50/month threshold)

2. **Analyze Cost Trends**:
   - [ ] Compare to previous 3 months
   - [ ] Identify any unexpected spikes
   - [ ] Correlate with traffic/usage metrics

3. **Validate Cost Allocation Tags**:
   - [ ] All resources properly tagged
   - [ ] Cost Explorer filter working correctly

4. **Review Alarms**:
   - [ ] Were any alarms triggered?
   - [ ] False positives? (adjust thresholds)
   - [ ] Missed any cost overruns? (lower thresholds)

5. **Optimization Opportunities**:
   - [ ] Review Reserved Instance pricing (if 1 year committed)
   - [ ] Check cache hit rate (optimize node size)
   - [ ] Review snapshot retention policy

6. **Document Action Items**:
   - Record findings in `docs/infrastructure/cost-review-YYYY-MM.md`
   - Create tickets for optimizations

### Example Review Document

```markdown
# Cost Review - February 2026

## Summary
- **Total Cost**: $38.50 (within budget)
- **Variance**: +2% vs January ($37.75)
- **Alarms Triggered**: None

## Breakdown
- Staging (t3.micro): $12.41
- Production (t3.small): $24.95 (+$0.13 from prorated usage increase)
- Data Transfer: $0.95
- Snapshots: $0.19

## Trends
- Traffic increased 5% month-over-month
- Cache hit rate: 92% (optimal)
- No cost anomalies detected

## Action Items
- None - costs within expected range
- Continue monitoring for Q1 2026
```

## Cost Anomaly Detection

AWS Cost Anomaly Detection is enabled for ElastiCache:

### Setup

```bash
# Create cost anomaly monitor
aws ce create-anomaly-monitor \
  --anomaly-monitor file://anomaly-monitor.json

# Create anomaly subscription (alerts)
aws ce create-anomaly-subscription \
  --anomaly-subscription file://anomaly-subscription.json
```

**anomaly-monitor.json**:
```json
{
  "MonitorName": "ElastiCacheCostMonitor",
  "MonitorType": "DIMENSIONAL",
  "MonitorDimension": "SERVICE",
  "MonitorSpecification": {
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon ElastiCache"]
    }
  }
}
```

**anomaly-subscription.json**:
```json
{
  "SubscriptionName": "ElastiCacheCostAlerts",
  "Threshold": 10.0,
  "Frequency": "DAILY",
  "MonitorArnList": ["arn:aws:ce::123456789012:anomalymonitor/xxx"],
  "Subscribers": [
    {
      "Type": "EMAIL",
      "Address": "ops@example.com"
    }
  ]
}
```

## Metrics to Track

### Cost Efficiency Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cache Hit Rate | > 90% | CloudWatch `CacheHits` / (`CacheHits` + `CacheMisses`) |
| Cost per Request | < $0.0001 | Monthly ElastiCache cost / Total API requests |
| Eviction Rate | < 5% | CloudWatch `Evictions` / `GetTypeCmds` |

### CloudWatch Queries

**Cache Hit Rate**:
```sql
SELECT AVG(CacheHits / (CacheHits + CacheMisses)) * 100 AS HitRate
FROM SCHEMA("AWS/ElastiCache", CacheClusterId)
WHERE CacheClusterId = 'production-lego-api-redis'
```

**Cost per Request**:
```bash
# Calculate manually
MONTHLY_COST=24.82
TOTAL_REQUESTS=$(aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=production-lego-api \
  --start-time 2026-02-01T00:00:00Z \
  --end-time 2026-03-01T00:00:00Z \
  --period 2592000 \
  --statistics Sum \
  --query 'Datapoints[0].Sum' \
  --output text)

echo "Cost per request: \$$(echo "scale=8; $MONTHLY_COST / $TOTAL_REQUESTS" | bc)"
```

## Cost Overrun Response Plan

### Scenario 1: Alarm Triggered ($50/month threshold breached)

**Immediate Actions** (within 1 hour):
1. Check AWS Cost Explorer for unexpected services
2. Review CloudWatch metrics (CPU, memory, evictions)
3. Check for runaway cache keys: `redis-cli --scan --pattern '*' | wc -l`
4. Notify engineering lead

**Root Cause Analysis** (within 24 hours):
1. Identify cost driver:
   - Node type scaled up accidentally?
   - Data transfer spike (VPC/NAT gateway misconfigured)?
   - Snapshot storage ballooning?
2. Document findings in incident report

**Mitigation** (within 48 hours):
1. Implement cost reduction:
   - Scale down node type if oversized
   - Reduce snapshot retention if unnecessary
   - Optimize cache key pattern (reduce cardinality)
2. Update alarm thresholds if false positive

### Scenario 2: Gradual Cost Increase (3-month trend)

**Investigation**:
1. Correlate with traffic growth (expected?)
2. Check cache efficiency (hit rate declining?)
3. Review node sizing (is t3.micro → t3.small justified?)

**Optimization Options**:
1. Increase cache TTL (reduce database load, smaller cache size)
2. Reduce cache scope (fewer environments cached?)
3. Reserved Instances for predictable workloads

## Related Documentation

- [ElastiCache Infrastructure](../../infra/elasticache/README.md)
- [Canary Deployment](../deployment/canary-redis-migration.md)
- [AWS Cost Explorer User Guide](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
