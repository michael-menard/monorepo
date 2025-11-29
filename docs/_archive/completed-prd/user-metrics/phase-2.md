# User Tracking & Metrics Implementation - Phase 2

Part of the User Metrics PRD brownfield enhancement.

See [user-metrics-prd.md](./user-metrics-prd.md) for complete context.

---

### PHASE 2: Amazon Managed Grafana & CloudWatch

### Story 2.1: Amazon Managed Grafana Workspace Provisioning

**As a** Platform Engineer,
**I want** to provision an Amazon Managed Grafana workspace with appropriate authentication,
**so that** teams can access centralized dashboards for metrics visualization.

**Acceptance Criteria:**

1. Amazon Managed Grafana workspace created in Essential tier (budget-conscious)
2. AWS SSO or IAM authentication configured for user access
3. Workspace admin role assigned to project owner
4. Viewer roles configured for Product, Engineering, CS teams
5. Workspace URL documented and shared with teams
6. Basic workspace settings configured (timezone, organization name)

**Integration Verification:**

- IV1: Grafana workspace accessible via HTTPS without interfering with application URLs
- IV2: Authentication does not conflict with existing AWS SSO/IAM setup
- IV3: No unexpected AWS quota limits hit during provisioning

---

### Story 2.2: CloudWatch Data Source Configuration

**As a** Engineering Team Member,
**I want** CloudWatch configured as primary data source in Grafana,
**so that** I can visualize Lambda, API Gateway, and CloudFront metrics.

**Acceptance Criteria:**

1. CloudWatch data source added to Grafana workspace with IAM role authentication
2. Permissions validated to query all relevant CloudWatch namespaces (Lambda, APIGateway, CloudFront)
3. CloudWatch Logs Insights configured as data source for log queries
4. Default region set correctly for data source
5. Test query executed successfully to verify connectivity
6. Data source marked as default for CloudWatch metrics

**Integration Verification:**

- IV1: CloudWatch metrics collection for existing resources unaffected
- IV2: Existing CloudWatch alarms continue functioning normally
- IV3: No additional CloudWatch API costs from Grafana queries (within free tier limits)

---

### Story 2.3: Initial Grafana Dashboards Creation

**As a** Engineering Team Member,
**I want** initial Grafana dashboards for Lambda, API Gateway, and CloudFront performance,
**so that** I can monitor application health from launch.

**Acceptance Criteria:**

1. **Lambda Performance Dashboard** created with panels for: invocations, duration (p50/p95/p99), errors, throttles, cold starts, concurrent executions
2. **API Gateway Dashboard** created with panels for: request count, latency (p50/p95/p99), 4xx errors, 5xx errors, by route/method
3. **CloudFront Dashboard** created with panels for: requests, cache hit ratio, bytes downloaded, error rates, edge location distribution
4. **System Health Dashboard** created with panels for: Aurora connections, CPU, S3 storage metrics, ECS task health (when added)
5. All dashboards use appropriate time ranges and refresh intervals
6. Dashboards organized into folders (Infrastructure, Application, Frontend)

**Integration Verification:**

- IV1: Dashboards display existing application metrics correctly
- IV2: Historical data (if any) visible in dashboard queries
- IV3: Dashboard refresh doesn't cause excessive CloudWatch API calls

---

### Story 2.4: OpenSearch Integration for Log Analysis

**As a** Engineering Team Member,
**I want** OpenSearch configured as Grafana data source for log analysis,
**so that** I can query and visualize application logs alongside metrics.

**Acceptance Criteria:**

1. OpenSearch data source added to Grafana workspace
2. CloudWatch Logs subscription filter configured to stream logs to OpenSearch
3. OpenSearch index lifecycle management (ILM) policy created (7 days hot, 30 days warm, 90 days delete)
4. Test log query dashboard created showing error patterns and search capabilities
5. Access permissions validated for OpenSearch queries from Grafana
6. Documentation created for log query syntax and common patterns

**Integration Verification:**

- IV1: Existing CloudWatch Logs streams continue functioning
- IV2: Application logging not impacted by subscription filter
- IV3: OpenSearch query performance acceptable (<2 second response for typical queries)

---
