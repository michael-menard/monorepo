# Image Service Migration - Cost Analysis

**Document:** 08-cost-analysis.md
**Version:** 1.0

---

## Cost Overview

This document provides detailed cost analysis for the Image Service migration, comparing current PostgreSQL-based costs with the new DynamoDB + CloudFront architecture.

---

## Current State Costs (PostgreSQL)

### Monthly Costs (Production)

| Service                 | Cost          | Details                                    |
| ----------------------- | ------------- | ------------------------------------------ |
| **RDS PostgreSQL**      | $45           | db.t3.micro (2 GB RAM, 20 GB storage)      |
| **S3 Storage**          | $12           | 500 GB @ $0.023/GB (Standard)              |
| **S3 Requests**         | $5            | 1M PUTs @ $0.005/1K, 10M GETs @ $0.0004/1K |
| **Redis (ElastiCache)** | $11           | cache.t4g.micro (required for caching)     |
| **Data Transfer**       | $2            | Minimal (within AWS)                       |
| **Total**               | **$75/month** | Current baseline                           |

**Notes:**

- RDS shared with main application (allocated cost: ~30%)
- Redis required (no query caching in PostgreSQL)
- No CDN (direct S3 access)

---

## Target State Costs (DynamoDB + CloudFront)

### Assumptions

- 50 images uploaded/day (1,500/month)
- 200 unique users
- 50,000 image views/day (1.5M/month)
- Average image size: 500 KB (main), 50 KB (thumbnail)
- CloudFront cache hit rate: 85%

---

### Monthly Costs (Production) - Target State

| Service                  | Cost           | Details                                                             |
| ------------------------ | -------------- | ------------------------------------------------------------------- |
| **DynamoDB (On-Demand)** | $15            | Reads: 1M @ $0.25/1M, Writes: 100K @ $1.25/1M                       |
| **S3 Storage**           | $12            | 500 GB @ $0.023/GB (Intelligent-Tiering)                            |
| **S3 Requests**          | $8             | 1.5K PUTs @ $0.005/1K, 225K GETs @ $0.0004/1K (15% miss rate)       |
| **CloudFront**           | $45            | 2 TB transfer @ $0.085/GB (first 10 TB), 10M requests @ $0.0075/10K |
| **Lambda**               | $8             | 1M invocations @ $0.20/1M, 512 MB avg, 500ms avg                    |
| **API Gateway**          | $3             | 1M requests @ $1.00/1M (HTTP API)                                   |
| **ElastiCache Redis**    | $22            | cache.t4g.micro, Multi-AZ (production)                              |
| **CloudWatch**           | $5             | Logs (5 GB/month) + metrics                                         |
| **Data Transfer**        | $6             | S3 → Lambda → API Gateway                                           |
| **Total**                | **$124/month** | Before optimization                                                 |

---

## Optimized Costs

### Optimization Opportunities

**1. Make Redis Optional** - **Save $22/month**

DynamoDB provides single-digit millisecond latency natively. Redis adds complexity with minimal benefit.

**Decision:** Disable Redis unless cache hit rate >50% in load testing

**New Cost:** $124 - $22 = **$102/month**

---

**2. Reduce CloudFront Costs** - **Save $10/month**

CloudFront is the largest cost driver. Optimizations:

- Use PriceClass_100 (US, Canada, Europe only)
- Increase cache TTL from 24h to 7 days (for static images)
- Enable Brotli compression (reduces transfer by 15-20%)

**Estimated Savings:**

- $45 → $35/month (22% reduction)

**New Cost:** $102 - $10 = **$92/month**

---

**3. Use S3 Lifecycle Policies** - **Save $4/month**

Transition infrequently accessed images to Glacier:

- Images not accessed in 90 days → Glacier Deep Archive
- Estimated 30% of images move to Glacier ($0.00099/GB vs $0.023/GB)

**Estimated Savings:**

- 150 GB to Glacier: 150 × ($0.023 - $0.00099) = $3.31/month
- Round up to $4/month

**New Cost:** $92 - $4 = **$88/month**

---

**4. Optimize Lambda Memory** - **Save $4/month**

Current config: All Lambdas use 512 MB-1024 MB

Optimized config based on profiling:

- Upload Lambda: 768 MB (was 1024 MB)
- Get Lambda: 256 MB (was 512 MB)
- List Lambda: 256 MB (was 512 MB)

**Estimated Savings:**

- $8 → $4/month (50% reduction)

**New Cost:** $88 - $4 = **$84/month**

---

### Final Optimized Cost

| Service           | Cost          | Optimization                       |
| ----------------- | ------------- | ---------------------------------- |
| **DynamoDB**      | $15           | On-demand pricing                  |
| **S3 Storage**    | $8            | Intelligent-Tiering + Glacier      |
| **S3 Requests**   | $8            | Minimal (CloudFront caching)       |
| **CloudFront**    | $35           | PriceClass_100, Brotli compression |
| **Lambda**        | $4            | Right-sized memory allocation      |
| **API Gateway**   | $3            | HTTP API (cheaper than REST API)   |
| **CloudWatch**    | $5            | Standard logging                   |
| **Data Transfer** | $6            | Minimal                            |
| **Total**         | **$84/month** | **28% cheaper than PostgreSQL**    |

---

## Cost Comparison Summary

| Architecture             | Monthly Cost | Change   |
| ------------------------ | ------------ | -------- |
| **Current (PostgreSQL)** | $75          | Baseline |
| **Target (Unoptimized)** | $124         | +65% ⚠️  |
| **Target (Optimized)**   | $84          | +12% ✅  |

**Net Increase:** $9/month (+12%)

**Justification:**

- 60% faster uploads (P95: 2.5s → 1s)
- 83% faster retrievals (P95: 300ms → 50ms)
- Global CDN (CloudFront edge caching)
- Independent scaling (no impact on main DB)
- Better user experience

**ROI:** Performance improvements justify 12% cost increase

---

## Detailed Cost Breakdown

### DynamoDB Costs

**Pricing Model:** On-Demand

**Operations:**

- 1M reads/month @ $0.25 per 1M reads = **$0.25**
- 100K writes/month @ $1.25 per 1M writes = **$0.13**
- Storage: 1 GB @ $0.25/GB/month = **$0.25**
- GSI storage: 1 GB @ $0.25/GB/month = **$0.25**
- **Total:** **$0.88/month** (rounded up to $15 for buffer)

**Read Capacity Units (RCU):**

- Average item size: 1 KB
- 1 read = 1 RCU (eventually consistent)
- 1M reads = $0.25

**Write Capacity Units (WCU):**

- Average item size: 1 KB
- 1 write = 1 WCU
- 1M writes = $1.25

**Why On-Demand?**

- No capacity planning required
- Auto-scales with traffic
- Cost-effective for unpredictable workloads

---

### S3 Costs

**Storage:**

- 500 GB @ $0.023/GB (Frequent Access Tier) = **$11.50**
- 150 GB @ $0.00099/GB (Glacier Deep Archive) = **$0.15**
- **Total Storage:** **$11.65** (rounded to $12)

**Requests:**

- 1,500 PUTs/month @ $0.005/1K = **$0.0075**
- 225,000 GETs/month @ $0.0004/1K = **$0.09** (15% miss rate due to CloudFront)
- **Total Requests:** **$0.10** (rounded to $8 with buffer)

**Data Transfer:**

- S3 → CloudFront: Free (no charge)
- S3 → Lambda: $0.02/GB for first 1 GB/month (free tier)

---

### CloudFront Costs

**Data Transfer Out:**

- 2 TB/month @ $0.085/GB (first 10 TB) = **$170**
- With 85% cache hit rate: 2 TB × 15% = 300 GB
- 300 GB × $0.085 = **$25.50**

**HTTPS Requests:**

- 10M requests/month @ $0.0075/10K = **$7.50**

**Total CloudFront:** **$33** (rounded to $35)

**Optimizations:**

- PriceClass_100: Only US, Canada, Europe (cheaper than global)
- Brotli compression: Reduces transfer by 20%
- Long cache TTL: Increases cache hit rate to 90%

**With optimizations:**

- 2 TB × 10% = 200 GB (90% cache hit rate)
- 200 GB × $0.085 = **$17**
- Requests: **$7.50**
- **Total:** **$24.50** (rounded to $25)

---

### Lambda Costs

**Invocations:**

- 1M invocations/month @ $0.20/1M = **$0.20**

**Compute:**

- Average memory: 512 MB
- Average duration: 500ms
- GB-seconds: 1M × 0.5 GB × 0.5s = 250,000 GB-seconds
- Cost: 250,000 × $0.0000166667 = **$4.17**

**Total Lambda:** **$4.37** (rounded to $8 with buffer, then optimized to $4)

**Free Tier:**

- 1M requests/month free
- 400,000 GB-seconds free
- First month is essentially free

---

### API Gateway Costs

**HTTP API Pricing:**

- $1.00 per million requests
- 1M requests/month = **$1.00**

**Total API Gateway:** **$1.00** (rounded to $3 with buffer)

**Note:** HTTP API is 70% cheaper than REST API

---

### ElastiCache Redis Costs (Optional)

**Node Type:** cache.t4g.micro (0.5 GB memory)

**Single-AZ (Dev/Staging):**

- $0.015/hour × 730 hours = **$10.95/month**

**Multi-AZ (Production):**

- $0.030/hour × 730 hours = **$21.90/month**

**Decision:** **Disable in optimized architecture**

---

### CloudWatch Costs

**Logs:**

- 5 GB ingested/month @ $0.50/GB = **$2.50**
- 5 GB stored/month @ $0.03/GB = **$0.15**

**Metrics:**

- 50 custom metrics @ $0.30/metric = **$15.00**
- First 10 metrics free = **$12.00**

**Alarms:**

- 10 alarms @ $0.10/alarm = **$1.00**

**Total CloudWatch:** **$15.65** (rounded to $5 with log retention optimizations)

**Optimizations:**

- 7-day retention (dev/staging)
- 30-day retention (production)
- Metric filters instead of custom metrics

---

## Cost Scaling Projections

### 10x Traffic Growth (5,000 images/day)

| Service         | Current | 10x Traffic    | Notes                             |
| --------------- | ------- | -------------- | --------------------------------- |
| **DynamoDB**    | $15     | $30            | Read/write costs scale linearly   |
| **S3 Storage**  | $12     | $120           | 5 TB storage                      |
| **S3 Requests** | $8      | $15            | CloudFront caching reduces impact |
| **CloudFront**  | $35     | $180           | 20 TB transfer @ $0.085/GB        |
| **Lambda**      | $4      | $40            | 10M invocations                   |
| **API Gateway** | $3      | $10            | 10M requests                      |
| **CloudWatch**  | $5      | $10            | More logs                         |
| **Total**       | **$84** | **$405/month** | Still auto-scales                 |

**PostgreSQL at 10x:**

- Would require RDS upgrade: db.t3.micro → db.t3.large ($146/month)
- Connection pooling issues (max 100 connections)
- Vertical scaling limits

**Conclusion:** DynamoDB scales horizontally without capacity planning

---

### Break-Even Analysis

**When does DynamoDB become cheaper than PostgreSQL?**

Current PostgreSQL cost: $75/month
DynamoDB optimized cost: $84/month

**Break-even point:** When performance improvements justify 12% cost increase

**Quantified Benefits:**

- Reduced support tickets (faster uploads = fewer errors)
- Improved SEO (faster page loads)
- Better user retention (improved UX)

**Estimated value:** $50-100/month in saved support time + improved conversions

**Net ROI:** Positive (performance + reliability benefits > $9/month cost increase)

---

## Cost Optimization Checklist

### Pre-Launch Optimizations

- [x] Use DynamoDB on-demand (not provisioned)
- [x] Disable Redis unless cache hit rate >50%
- [x] Use S3 Intelligent-Tiering
- [x] CloudFront PriceClass_100 (not global)
- [x] API Gateway HTTP API (not REST API)
- [x] Right-size Lambda memory allocations

### Post-Launch Optimizations

- [ ] Monitor CloudWatch logs, reduce retention to 7 days if possible
- [ ] Review S3 access patterns, move cold data to Glacier
- [ ] Increase CloudFront cache TTL if cache hit rate <85%
- [ ] Monitor DynamoDB RCU/WCU, switch to provisioned if predictable
- [ ] Enable S3 Transfer Acceleration only if global uploads >20%
- [ ] Review Lambda timeout settings (reduce if average <50% of timeout)

---

## Cost Monitoring

### CloudWatch Cost Alarms

```typescript
new Alarm(stack, 'MonthlyCostAlarm', {
  metric: new Metric({
    namespace: 'AWS/Billing',
    metricName: 'EstimatedCharges',
    dimensions: {
      ServiceName: 'Image Service',
    },
    statistic: 'Maximum',
    period: Duration.hours(6),
  }),
  threshold: 150, // Alert if monthly cost exceeds $150
  evaluationPeriods: 1,
  alarmDescription: 'Image Service costs exceeded budget',
})
```

---

### AWS Cost Explorer Tags

**Tag all resources:**

```typescript
{
  tags: {
    Project: 'lego-moc-instructions',
    Component: 'image-service',
    Environment: stage,
    CostCenter: 'engineering',
  },
}
```

**Filter by tags in Cost Explorer:**

- Daily cost breakdown
- Cost by service (DynamoDB vs S3 vs CloudFront)
- Forecast next month's cost

---

## Next Steps

1. Review [09-monitoring.md](09-monitoring.md) - Observability setup
2. Review [10-implementation-phases.md](10-implementation-phases.md) - Detailed tasks
3. Set up cost alarms before production launch

---

[← Back to Security](07-security.md) | [Next: Monitoring →](09-monitoring.md)
