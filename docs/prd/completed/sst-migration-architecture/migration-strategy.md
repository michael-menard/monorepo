# Migration Strategy

## Blue/Green Deployment Plan

**Phase 1: Infrastructure Deployment** (Week 1)
- Deploy SST infrastructure to dev environment
- Provision VPC, RDS Proxy, Redis, OpenSearch
- Deploy Lambda functions
- Run integration tests against dev environment
- Validate all endpoints return expected responses

**Phase 2: Staging Deployment** (Week 2)
- Deploy to staging environment
- Run full E2E test suite (Playwright)
- Load testing with Artillery (100 RPS sustained, 500 RPS spike)
- Measure cold start times and response latency
- Validate cost projections against actual usage

**Phase 3: Production Deployment - 10% Traffic** (Week 3)
- Deploy Lambda stack to production
- Configure Route53 weighted routing: 10% Lambda, 90% ECS
- Monitor for 48 hours:
  - Error rates (<1% threshold)
  - Latency (p95 < 500ms threshold)
  - Cold start frequency
  - Database connection pool usage
- Rollback trigger: Error rate >2% or latency >1000ms p95

**Phase 4: Production Deployment - 50% Traffic** (Week 4)
- Increase Route53 weighting: 50% Lambda, 50% ECS
- Monitor for 72 hours with same metrics
- Validate auto-scaling behavior under increased load
- Check cost accumulation vs projections

**Phase 5: Production Deployment - 100% Traffic** (Week 5)
- Route53 weighting: 100% Lambda, 0% ECS
- Monitor for 7 days before decommissioning ECS
- Final validation of all metrics
- User acceptance testing

**Phase 6: ECS Decommission** (Week 6)
- Scale ECS tasks to 0
- Keep ECS infrastructure for 48 hours (emergency rollback)
- Delete ECS service, ALB, target groups
- Archive ECR images to S3 (90-day retention)
- Update DNS to point solely to API Gateway
- Celebrate cost savings! 🎉

## Rollback Procedure

If any phase exceeds error/latency thresholds:

1. **Immediate**: Shift Route53 to 100% ECS (takes <2 minutes)
2. Investigate Lambda CloudWatch logs and X-Ray traces
3. Identify root cause (cold starts, connection pool saturation, code bug)
4. Fix and redeploy to dev/staging for validation
5. Resume blue/green deployment from last stable phase

## Data Migration

**No Data Migration Required**: Existing PostgreSQL database remains in place. Lambda functions connect to the same RDS instance via RDS Proxy.

**OpenSearch Re-indexing**:
- One-time bulk indexing of existing data
- Script: `scripts/reindex-opensearch.ts`
- Executes during staging deployment as SST `DevCommand` or post-deploy hook

---
