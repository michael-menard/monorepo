# Cost Model

## Projected Monthly Costs (Production)

**Lambda**:

- **Invocations**: 10M requests/month @ $0.20 per 1M = $2.00
- **Duration**: Avg 500ms @ 1024MB = 5M GB-seconds @ $0.0000166667/GB-second = $83.33
- **Provisioned Concurrency**: 5 instances × 730 hours × $0.0000041667/GB-second × 512MB = $7.60
- **Total Lambda**: ~$93

**API Gateway HTTP API**:

- 10M requests @ $1.00 per 1M = $10.00

**RDS PostgreSQL**:

- db.r6g.large (2 vCPU, 16GB) = $238/month (On-Demand)
- Storage 100GB @ $0.115/GB = $11.50
- **RDS Proxy**: $0.015/hour/vCPU × 2 vCPU × 730 hours = $21.90
- **Total RDS**: ~$271

**ElastiCache Redis**:

- cache.r6g.large (2 vCPU, 13GB) = $157/month (On-Demand)

**OpenSearch**:

- r6g.large.search × 2 nodes = $200/month (On-Demand)
- EBS 100GB @ $0.10/GB = $10
- **Total OpenSearch**: ~$210

**S3**:

- Storage 50GB @ $0.023/GB = $1.15
- GET requests 1M @ $0.40/1M = $0.40
- PUT requests 100K @ $2.00/1M = $0.20
- **Total S3**: ~$2

**Data Transfer**:

- ~$15/month

**CloudWatch**:

- Logs 10GB @ $0.50/GB = $5.00
- Custom Metrics 50 @ $0.30/metric = $15.00
- **Total CloudWatch**: ~$20

**VPC**:

- NAT Gateway: $0.045/hour × 730 hours = $32.85
- Data processing 50GB @ $0.045/GB = $2.25
- **Total VPC**: ~$35

---

**Grand Total (Production)**: ~$813/month

**Current ECS Cost** (estimate): ~$1,200/month
**Savings**: ~$387/month (~32% reduction)

**Note**: Costs will decrease further with Reserved Instances for RDS/OpenSearch (~40% savings) and optimized Lambda memory tuning.

---
