# Epic 5: Production Deployment, Monitoring & Cutover

**Epic Goal**: Implement production-grade observability including CloudWatch dashboards, alarms, and X-Ray tracing. Configure CI/CD pipeline for automated deployments with rollback capability. Execute blue/green deployment strategy with progressive traffic shifting from ECS to Lambda. Validate performance and cost metrics. Decommission legacy ECS infrastructure.

## Story 5.1: Implement CloudWatch Dashboards

**As a** DevOps engineer,
**I want** comprehensive CloudWatch dashboards for the serverless API,
**so that** I can monitor health, performance, and costs in real-time.

**Acceptance Criteria**:

1. CloudWatch Dashboard created: "LEGO-API-Serverless-Production"
2. Widgets configured for key metrics:
   - Lambda invocations (total, errors, throttles) per function
   - Lambda duration (average, p50, p95, p99) per function
   - Lambda concurrent executions
   - API Gateway request count, 4xx, 5xx errors
   - API Gateway latency (p50, p95, p99)
   - RDS Proxy connections (active, idle, borrow latency)
   - Redis cache hit rate, memory usage
   - OpenSearch cluster health, indexing rate, search latency
   - S3 bucket request metrics (GET, PUT)
3. Custom metrics added for business KPIs: MOCs created, images uploaded, searches performed
4. Dashboard configured for 24-hour view with 1-minute granularity
5. Dashboard accessible via SST resource outputs or AWS Console
6. All dashboards defined as code in SST config for reproducibility

## Story 5.2: Configure CloudWatch Alarms and SNS Notifications

**As a** DevOps engineer,
**I want** automated alerts for critical issues,
**so that** the team is notified immediately when problems arise.

**Acceptance Criteria**:

1. SNS topic created: "lego-api-serverless-alerts-{stage}"
2. Email subscriptions configured for DevOps team
3. Alarms created for:
   - Lambda error rate >5% over 5 minutes (CRITICAL)
   - Lambda throttles >10 over 5 minutes (WARNING)
   - API Gateway 5xx error rate >3% over 5 minutes (CRITICAL)
   - API Gateway p99 latency >3 seconds (WARNING)
   - RDS CPU utilization >80% (WARNING)
   - RDS freeable memory <1GB (WARNING)
   - Redis evictions >100 per minute (WARNING)
   - OpenSearch cluster status RED (CRITICAL)
   - Lambda cold start duration >2 seconds (p99) (WARNING)
4. Each alarm includes actionable runbook link in description
5. Alarms in ALARM state trigger SNS notification
6. Test alarm notifications sent successfully during setup

## Story 5.3: Enable AWS X-Ray Distributed Tracing

**As a** backend developer,
**I want** distributed tracing across all Lambda functions,
**so that** I can diagnose performance bottlenecks and errors in production.

**Acceptance Criteria**:

1. X-Ray tracing enabled on all Lambda functions via SST config
2. X-Ray SDK integrated in Lambda handlers to create custom segments/subsegments
3. Database queries instrumented as subsegments showing query duration
4. S3 operations captured as subsegments
5. External API calls to Cognito traced
6. Service map visualizes complete request flow: API Gateway → Lambda → RDS/Redis/OpenSearch/S3
7. Annotations added for key dimensions: `userId`, `operation`, `status`
8. Metadata includes request/response payload sizes
9. Sampling rule configured: 100% of errors, 5% of successful requests (to control costs)
10. X-Ray console accessible, service map displays complete architecture

## Story 5.4: Configure CI/CD Pipeline for Automated Deployments

**As a** DevOps engineer,
**I want** automated deployment pipeline with testing gates,
**so that** changes are deployed safely and consistently.

**Acceptance Criteria**:

1. GitHub Actions workflow created: `.github/workflows/sst-deploy.yml`
2. Workflow triggers on push to `main` branch and manual dispatch
3. Pipeline stages:
   - **Checkout & Setup**: Clone repo, install dependencies
   - **Lint & Type Check**: Run ESLint and TypeScript compiler
   - **Unit Tests**: Execute Vitest unit tests (95% coverage required)
   - **Build**: Compile TypeScript, bundle Lambda functions
   - **Deploy to Staging**: `sst deploy --stage staging`
   - **Integration Tests**: Run integration tests against staging environment
   - **Deploy to Production**: `sst deploy --stage production` (manual approval required)
4. Secrets configured in GitHub: AWS credentials via OIDC (no long-lived access keys)
5. Deployment artifacts stored: CloudFormation templates, Lambda zip files
6. Rollback capability: `sst deploy --stage production --rollback` on failure detection
7. Notifications sent to Slack channel on deployment success/failure
8. Pipeline run time optimized with caching (pnpm cache, Lambda layer cache)

## Story 5.5: Implement Blue/Green Deployment Strategy

**As a** DevOps engineer,
**I want** to execute a blue/green cutover from ECS to Lambda,
**so that** I can migrate traffic safely with instant rollback capability.

**Acceptance Criteria**:

1. Route53 weighted routing policy configured for API domain
2. Initial traffic split: 100% ECS (blue), 0% Lambda (green)
3. Lambda environment fully deployed and health checks passing
4. Monitoring baseline established for Lambda metrics
5. **Phase 1**: Shift 10% traffic to Lambda, monitor for 2 hours
   - Validate error rates remain <1%
   - Confirm latency within SLA (<500ms p95)
   - Check cost metrics align with projections
6. **Phase 2**: Shift 50% traffic to Lambda, monitor for 4 hours
   - Validate performance under increased load
   - Confirm no database connection pool saturation
   - Monitor cold start frequency and duration
7. **Phase 3**: Shift 100% traffic to Lambda
   - Monitor for 24 hours before ECS decommission
8. Rollback plan tested: shift 100% back to ECS within 5 minutes if needed
9. Runbook documented with screenshots and commands

## Story 5.6: Validate Performance and Cost Metrics

**As a** Product Manager,
**I want** to validate that serverless migration achieves cost and performance goals,
**so that** we can confirm project success.

**Acceptance Criteria**:

1. Performance comparison report generated:
   - **Latency**: Lambda p50, p95, p99 vs ECS baseline (target: within ±20%)
   - **Throughput**: Requests per second at peak load (target: match or exceed ECS)
   - **Error Rate**: 5xx errors (target: <0.5%)
   - **Cold Starts**: Frequency and duration (target: <2s p99)
2. Cost comparison report generated:
   - **Monthly cost projection**: Lambda + RDS Proxy + supporting services vs ECS + ALB + RDS
   - **Cost per 1M requests**: Lambda invocation + data transfer vs ECS task-hours
   - **Savings percentage**: Target >40% reduction
3. Load testing executed using Artillery or similar tool:
   - Sustained load: 100 RPS for 30 minutes
   - Spike load: 500 RPS for 5 minutes
   - Validate auto-scaling behavior
4. Reports shared with stakeholders with recommendations
5. Decision documented: proceed with ECS decommission or rollback to ECS

## Story 5.7: Configure Cost Monitoring and Budgets

**As a** DevOps engineer,
**I want** cost monitoring and budget alerts,
**so that** we don't exceed spending limits unexpectedly.

**Acceptance Criteria**:

1. AWS Cost Explorer tags configured for SST resources: `Project:LEGO-API`, `Environment:{stage}`
2. Cost allocation tags enabled for Lambda, RDS, S3, OpenSearch, ElastiCache
3. AWS Budget created: "LEGO-API-Serverless-Monthly" with threshold $200/month
4. Budget alerts configured at 80% ($160) and 100% ($200) of threshold
5. SNS notifications sent to finance and DevOps teams
6. CloudWatch dashboard widget added showing cost trends
7. Cost optimization recommendations documented: Reserved Capacity for RDS, S3 lifecycle policies, Lambda memory tuning
8. Monthly cost review meeting scheduled

## Story 5.8: Decommission Legacy ECS Infrastructure

**As a** DevOps engineer,
**I want** to safely decommission the ECS infrastructure,
**so that** we eliminate unnecessary costs and complexity.

**Acceptance Criteria**:

1. Lambda handling 100% of production traffic for 7 days without issues
2. ECS task definition scaled down to 0 tasks
3. ECS service deleted (keep for 48 hours before final removal)
4. Application Load Balancer deleted
5. ECS cluster deleted
6. Target groups removed
7. ECR container images archived (not deleted, moved to S3 for 90-day retention)
8. Route53 weighted routing policy updated to 100% Lambda only
9. CloudFormation stack for ECS infrastructure deleted
10. Post-decommission validation: confirm all API endpoints respond, no error rate increase
11. Documentation updated: remove ECS references, update architecture diagrams
12. Retrospective conducted: lessons learned, migration timeline review

---
