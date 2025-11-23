# Developer Validation Checklist - User Metrics Implementation

## Overview

This checklist provides step-by-step validation criteria for implementing all 18 stories in the User Metrics epic. Use this document to ensure each story meets acceptance criteria and integration verification requirements before marking it complete.

**Architecture Reference:** `docs/prd/user-metrics/user-metrics-architecture.md`
**PRD Reference:** `docs/prd/user-metrics/user-metrics-prd.md`

---

## How to Use This Checklist

1. **Before Starting a Story:** Review the checklist items and architecture references
2. **During Implementation:** Check off items as you complete them
3. **Before Marking Complete:** Ensure ALL checkboxes are marked, including integration verification
4. **After Completion:** Document any deviations or notes in story tracking

**Legend:**
- 🏗️ Infrastructure/Configuration
- 💻 Code Implementation
- 🧪 Testing/Validation
- 📊 Monitoring/Observability
- 📝 Documentation

---

## PHASE 1: Infrastructure Foundation

### Story 1.1: AWS Infrastructure Foundation Setup

**Architecture Reference:** Lines 728-1163 (Tagging), Lines 1164-1255 (Infrastructure)

#### 🏗️ VPC and Networking
- [ ] VPC created or identified with /24 CIDR block (e.g., 10.0.0.0/24)
- [ ] 2 Availability Zones configured (e.g., us-east-1a, us-east-1b)
- [ ] 2 Public subnets created with /27 CIDR (32 IPs each)
- [ ] 2 Private subnets created with /26 CIDR (64 IPs each)
- [ ] Single NAT Gateway deployed in one AZ (cost optimization)
- [ ] Route tables configured correctly (public → IGW, private → NAT Gateway)
- [ ] VPC Flow Logs enabled for network monitoring (optional but recommended)

**Validation Command:**
```bash
aws ec2 describe-vpcs --filters "Name=tag:Project,Values=UserMetrics"
aws ec2 describe-subnets --filters "Name=tag:Project,Values=UserMetrics"
aws ec2 describe-nat-gateways --filters "Name=tag:Project,Values=UserMetrics"
```

#### 🏗️ Security Groups
- [ ] ECS security group created for Umami with ingress rules (ALB → ECS:3000)
- [ ] ECS security group created for OpenReplay with ingress rules (ALB → ECS ports)
- [ ] ALB security group created with ingress (443 from CloudFront, 80 redirect)
- [ ] Aurora security group updated to allow Umami ECS task connections
- [ ] Egress rules configured appropriately (ECS → Internet via NAT Gateway)

**Validation Command:**
```bash
aws ec2 describe-security-groups --filters "Name=tag:Project,Values=UserMetrics"
```

#### 🏗️ IAM Roles
- [ ] ECS task execution role created with permissions:
  - `ecs-tasks.amazonaws.com` trust policy
  - `AmazonECSTaskExecutionRolePolicy` attached
  - ECR image pull permissions
  - CloudWatch Logs write permissions
  - Secrets Manager read permissions
- [ ] Lambda enhanced permissions added for CloudWatch PutMetricData
- [ ] Grafana workspace role created with CloudWatch read permissions
- [ ] IAM roles tagged with required tags (Project, Environment, Component, Function)

**Validation Command:**
```bash
aws iam list-roles --query "Roles[?contains(RoleName, 'UserMetrics')]"
aws iam get-role-policy --role-name <role-name> --policy-name <policy-name>
```

#### 🏗️ Resource Tagging Schema
- [ ] Centralized tag configuration file created: `sst/observability/tags.ts`
- [ ] `observabilityTags()` function implemented with base tags:
  - Project: 'UserMetrics'
  - Environment: stack.stage
  - ManagedBy: 'SST'
  - CostCenter: 'Observability'
  - Owner: 'engineering@example.com'
- [ ] `componentTags` object defined with: umami, openreplay, grafana, cloudwatch, infrastructure
- [ ] All resources tagged with minimum 5 required tags
- [ ] Cost allocation tags activated in AWS Billing Console:
  - Project ✓
  - Component ✓
  - Function ✓
  - Environment ✓
  - CostCenter ✓

**Validation Command:**
```bash
# List all UserMetrics resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=UserMetrics \
  --region us-east-1

# Verify tag consistency (should return empty if all have 5+ tags)
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=UserMetrics \
  --query 'ResourceTagMappingList[?length(Tags) < `5`]'
```

#### 💻 SST Configuration
- [ ] SST configuration extended: `sst/observability/` directory created
- [ ] `sst/observability/infrastructure.ts` created with VPC/networking constructs
- [ ] `sst/observability/tags.ts` imported and used in all constructs
- [ ] `sst.config.ts` updated to import ObservabilityStack
- [ ] SST deployment successful: `sst deploy --stage dev`

**Validation Command:**
```bash
cd apps/api/lego-api-serverless
sst deploy --stage dev
# Verify stack deployed successfully in CloudFormation
```

#### 🧪 Integration Verification
- [ ] **IV1:** Existing VPC resources (if any) remain unaffected and accessible
  - Test existing Lambda functions still connect to Aurora
  - Verify existing application deployment succeeds
- [ ] **IV2:** Application Lambda functions can still access existing Aurora database
  - Run database connection test from Lambda
  - Verify application queries execute successfully
- [ ] **IV3:** No disruption to current application deployment pipeline
  - Existing `sst deploy` command works without errors
  - No new manual steps required for deployment

#### 📝 Documentation
- [ ] Infrastructure architecture diagram updated with VPC details
- [ ] Tagging schema documented in `docs/aws-tagging-schema.md` (already exists)
- [ ] SST construct README created explaining observability stack usage

---

### Story 1.2: Aurora PostgreSQL Schema for Umami

**Architecture Reference:** Lines 187-272 (Data Models and Schema Changes)

#### 🏗️ Database Schema
- [ ] Connect to Aurora instance via psql or database client
- [ ] Create `umami` schema: `CREATE SCHEMA IF NOT EXISTS umami;`
- [ ] Verify schema created: `\dn` (should list `umami`)
- [ ] Document Aurora instance details:
  - Endpoint: ___________________
  - Port: 5432
  - Database name: ___________________

**Validation Query:**
```sql
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'umami';
```

#### 🏗️ Database User and Permissions
- [ ] Create dedicated database user:
  ```sql
  CREATE USER umami_user WITH PASSWORD '<generated-password>';
  ```
- [ ] Grant permissions scoped to `umami` schema only:
  ```sql
  GRANT ALL ON SCHEMA umami TO umami_user;
  GRANT ALL ON ALL TABLES IN SCHEMA umami TO umami_user;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA umami TO umami_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON TABLES TO umami_user;
  ALTER DEFAULT PRIVILEGES IN SCHEMA umami GRANT ALL ON SEQUENCES TO umami_user;
  ```
- [ ] Revoke access to other schemas:
  ```sql
  REVOKE ALL ON SCHEMA public FROM umami_user;
  REVOKE ALL ON DATABASE <database_name> FROM umami_user;
  ```
- [ ] Test user permissions:
  - Connect as `umami_user`
  - Verify can access `umami` schema
  - Verify CANNOT access application schemas (should get permission denied)

**Validation Query (as umami_user):**
```sql
-- Should succeed
SELECT * FROM information_schema.tables WHERE table_schema = 'umami';

-- Should fail with permission denied
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

#### 🏗️ Secrets Management
- [ ] Generate strong password for `umami_user` (use password manager or AWS CLI)
- [ ] Create AWS Secrets Manager secret:
  ```bash
  aws secretsmanager create-secret \
    --name UserMetrics/Umami/DatabaseConnection \
    --description "Umami database connection string" \
    --secret-string '{"username":"umami_user","password":"<password>","host":"<aurora-endpoint>","port":5432,"database":"<database-name>","schema":"umami"}'
  ```
- [ ] Tag secret with UserMetrics tags
- [ ] Enable automatic rotation (optional for MVP, recommended for production)
- [ ] Document secret ARN: ___________________

**Validation Command:**
```bash
aws secretsmanager get-secret-value --secret-id UserMetrics/Umami/DatabaseConnection
```

#### 📊 Performance Baseline
- [ ] Capture Aurora performance metrics BEFORE Umami deployment:
  - CPU Utilization: _____ %
  - Database Connections: _____
  - Read IOPS: _____
  - Write IOPS: _____
  - Freeable Memory: _____ MB
- [ ] Document baseline in Google Sheet or CloudWatch Dashboard
- [ ] Set up CloudWatch alarm if CPU exceeds 70%
- [ ] Set up CloudWatch alarm if connections exceed 80% of max_connections

**Validation Query:**
```sql
-- Check current connection count
SELECT count(*) FROM pg_stat_activity;

-- Check max_connections setting
SHOW max_connections;

-- Calculate percentage
-- (current_connections / max_connections * 100)
```

#### 🧪 Umami Schema Migrations
- [ ] Umami Docker container prepared (Story 4.1 will deploy, but schema ready now)
- [ ] Connection string tested locally with Umami Docker image
- [ ] Umami migrations applied successfully (creates tables, indexes)
- [ ] Verify Umami tables created in `umami` schema:
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'umami' ORDER BY tablename;
  ```
- [ ] Expected tables: `account`, `event`, `pageview`, `session`, `website`, etc.

#### 🧪 Integration Verification
- [ ] **IV1:** Existing application schemas remain untouched and functional
  - Run application test suite
  - Verify all application database queries succeed
  - Check no unexpected schema changes
- [ ] **IV2:** Application database connections unaffected by new schema
  - Monitor connection pool metrics
  - Verify application connection count unchanged
- [ ] **IV3:** Aurora RDS metrics show no performance degradation
  - Compare current metrics to baseline documented above
  - CPU, connections, IOPS within acceptable range

#### 📝 Documentation
- [ ] Schema isolation documented in architecture doc (already done)
- [ ] Secret ARN added to SST configuration or environment variables
- [ ] Rollback procedure documented: `DROP SCHEMA umami CASCADE; DROP USER umami_user;`

---

### Story 1.3: S3 Buckets and Lifecycle Policies

**Architecture Reference:** Lines 214-228 (OpenReplay Session Data), Lines 818-849 (S3 Tagging)

#### 🏗️ OpenReplay Session Recordings Bucket
- [ ] S3 bucket created with name: `usermetrics-openreplay-sessions-<account-id>-<region>`
- [ ] Server-side encryption enabled (SSE-S3 or SSE-KMS)
- [ ] Bucket versioning disabled (recordings are immutable)
- [ ] Public access blocked (all 4 settings enabled)
- [ ] Bucket tagged with required tags:
  - Project: UserMetrics
  - Environment: <stage>
  - Component: OpenReplay
  - Function: SessionReplay
  - DataType: Sessions
  - Resource: S3Bucket

**SST Code Example:**
```typescript
const sessionBucket = new Bucket(stack, 'SessionRecordings', {
  cdk: {
    bucket: {
      bucketName: `usermetrics-openreplay-sessions-${stack.account}-${stack.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldRecordings',
          enabled: true,
          expiration: cdk.Duration.days(30),
        },
      ],
      intelligentTieringConfigurations: [
        {
          id: 'IntelligentTiering',
          status: s3.IntelligentTieringStatus.ENABLED,
        },
      ],
      tags: [
        { key: 'Project', value: 'UserMetrics' },
        { key: 'Environment', value: stack.stage },
        { key: 'Component', value: 'OpenReplay' },
        { key: 'Function', value: 'SessionReplay' },
        { key: 'DataType', value: 'Sessions' },
      ],
    },
  },
});
```

#### 🏗️ Lifecycle Policies
- [ ] 30-day lifecycle policy configured to delete recordings
- [ ] Policy enabled and active
- [ ] Lifecycle transitions configured:
  - Immediate: Intelligent-Tiering (for cost optimization)
  - Day 30: Expiration (delete)
- [ ] Test lifecycle policy with S3 console simulator (optional)

**Validation Command:**
```bash
aws s3api get-bucket-lifecycle-configuration --bucket <bucket-name>
```

#### 🏗️ S3 Intelligent-Tiering
- [ ] Intelligent-Tiering enabled on bucket
- [ ] Tiering configuration validated
- [ ] Archive tiers disabled (not needed for 30-day retention)

**Validation Command:**
```bash
aws s3api get-bucket-intelligent-tiering-configuration --bucket <bucket-name> --id IntelligentTiering
```

#### 🏗️ Bucket Policy and IAM
- [ ] Bucket policy created allowing ECS task role access:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "OpenReplayECSTaskAccess",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::<account-id>:role/UserMetrics-OpenReplay-TaskRole"
        },
        "Action": [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ],
        "Resource": "arn:aws:s3:::<bucket-name>/*"
      }
    ]
  }
  ```
- [ ] ECS task role created (or reference from Story 1.1)
- [ ] Task role has s3:PutObject, s3:GetObject, s3:DeleteObject permissions
- [ ] Verify no other principals have access (principle of least privilege)

**Validation Command:**
```bash
aws s3api get-bucket-policy --bucket <bucket-name>
```

#### 📊 CloudWatch Metrics
- [ ] S3 Request Metrics enabled for bucket
- [ ] CloudWatch alarm created for storage size (alert if >100GB for <100 users)
- [ ] Daily metrics filter configured for:
  - Total bucket size
  - Number of objects
  - Request count
- [ ] Add S3 storage panel to Grafana dashboard (Story 2.3)

**Validation Command:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=<bucket-name> Name=StorageType,Value=StandardStorage \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average
```

#### 🏗️ CloudWatch Logs Export Bucket (Optional)
- [ ] S3 bucket created for CloudWatch Logs export: `usermetrics-cloudwatch-logs-<account-id>-<region>`
- [ ] Bucket policy configured to allow CloudWatch Logs service access
- [ ] Lifecycle policy configured:
  - Day 0-30: Standard storage
  - Day 31-365: Glacier Flexible Retrieval
  - Day 366: Expiration
- [ ] Bucket tagged with Component: CloudWatch, Function: Logging, DataType: Logs

**SST Code Example:**
```typescript
const logsBucket = new Bucket(stack, 'CloudWatchLogsExport', {
  cdk: {
    bucket: {
      bucketName: `usermetrics-cloudwatch-logs-${stack.account}-${stack.region}`,
      lifecycleRules: [
        {
          id: 'ArchiveOldLogs',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(31),
            },
          ],
          expiration: cdk.Duration.days(366),
        },
      ],
    },
  },
});
```

#### 🧪 Integration Verification
- [ ] **IV1:** Existing S3 buckets (frontend assets, etc.) remain unaffected
  - List all S3 buckets and verify existing buckets present
  - Test frontend asset access via CloudFront
- [ ] **IV2:** CloudFront distribution continues serving frontend assets without disruption
  - Visit frontend URL and verify page loads
  - Check CloudFront logs/metrics for errors
- [ ] **IV3:** Application's existing S3 access patterns unchanged
  - Run application tests that interact with S3
  - Verify no permission errors

#### 📝 Documentation
- [ ] Bucket names documented in architecture or SST configuration
- [ ] Lifecycle policies documented with rationale (30 days for privacy)
- [ ] IAM role ARNs documented for ECS task access
- [ ] Rollback procedure: `aws s3 rb s3://<bucket-name> --force`

---

### Story 1.4: Cost Monitoring and Budget Alerts

**Architecture Reference:** Lines 1149-1162 (Cost Breakdown), Lines 1007-1012 (Budget Setup)

#### 🏗️ AWS Budget Configuration
- [ ] AWS Budget created via AWS Console or CLI:
  - Budget name: `UserMetrics-Observability-Budget`
  - Budget type: Cost budget
  - Period: Monthly
  - Amount: $150.00
  - Scope: Filter by tag `Project=UserMetrics`
- [ ] Budget alerts configured:
  - Alert 1: 80% threshold ($120) - Email notification
  - Alert 2: 100% threshold ($150) - Email notification
  - Alert 3: 120% threshold ($180) - Email + SNS topic (optional)
- [ ] Email addresses added to alert recipients
- [ ] Test alert delivery (AWS sends confirmation email)

**CLI Command to Create Budget:**
```bash
aws budgets create-budget \
  --account-id <account-id> \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json:**
```json
{
  "BudgetName": "UserMetrics-Observability-Budget",
  "BudgetType": "COST",
  "TimeUnit": "MONTHLY",
  "BudgetLimit": {
    "Amount": "150",
    "Unit": "USD"
  },
  "CostFilters": {
    "TagKeyValue": ["user:Project$UserMetrics"]
  }
}
```

#### 🏗️ Cost Allocation Tags
- [ ] All observability resources tagged with cost allocation tags:
  - Project: UserMetrics
  - Component: <component-name>
  - Function: <function-name>
  - Environment: <stage>
  - CostCenter: Observability
- [ ] Cost allocation tags activated in AWS Billing Console (already done in Story 1.1)
- [ ] Wait 24 hours for tags to appear in Cost Explorer
- [ ] Verify tags visible in Cost Explorer "Tag" filter dropdown

**Validation:**
- Navigate to AWS Billing Console → Cost Allocation Tags
- Verify "Project", "Component", "Function" tags are "Active"

#### 📊 CloudWatch Dashboard for Cost Monitoring
- [ ] CloudWatch dashboard created: `UserMetrics-Cost-Tracking`
- [ ] Dashboard widgets added:
  - Daily cost trend (line chart) - last 30 days
  - Cost by service (pie chart) - current month
  - Estimated monthly cost (number widget)
  - Budget vs actual (gauge or bar chart)
- [ ] Dashboard URL documented: ___________________

**Note:** CloudWatch doesn't natively support cost metrics. This dashboard will be created in Grafana (Story 2.3) using Cost Explorer API via Lambda.

**Alternative: Create CloudWatch alarm for estimated charges:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name UserMetrics-MonthlyBudget-Warning \
  --alarm-description "Alert when UserMetrics monthly cost exceeds $120" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 120 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Currency,Value=USD
```

#### 🏗️ SNS Topic for Budget Alerts
- [ ] SNS topic created: `UserMetrics-Budget-Alerts`
- [ ] Email subscription added to SNS topic
- [ ] Subscription confirmed via email
- [ ] SNS topic ARN added to budget alert configuration
- [ ] Test SNS delivery: `aws sns publish --topic-arn <arn> --message "Test alert"`

**Validation Command:**
```bash
aws sns list-subscriptions-by-topic --topic-arn <topic-arn>
```

#### 📊 Cost Explorer Report
- [ ] Navigate to AWS Cost Explorer
- [ ] Create saved report: "UserMetrics Observability Costs"
- [ ] Report configuration:
  - Group by: Service
  - Filter: Tag `Project=UserMetrics`
  - Time range: Last 3 months
  - Granularity: Daily
- [ ] Save report for recurring access
- [ ] Bookmark URL: ___________________

**Cost Explorer Queries to Validate:**
```
# Total cost for UserMetrics project
Tag: Project = UserMetrics

# Cost by component
Tag: Project = UserMetrics, Group by: Component

# Cost by function
Tag: Project = UserMetrics, Group by: Function
```

#### 📝 Monthly Cost Review Process Documentation
- [ ] Document created: `docs/prd/user-metrics/cost-review-process.md` (or similar)
- [ ] Process includes:
  1. Review AWS Budget alerts from past month
  2. Run Cost Explorer report grouped by Component
  3. Identify top 3 most expensive resources
  4. Compare actual vs projected costs (table in architecture line 1153-1160)
  5. Document optimization opportunities
  6. Update cost projections if needed
- [ ] Schedule monthly review (add to calendar or project management tool)

**Template Table for Monthly Review:**
| Component | Projected | Actual | Variance | Action |
|-----------|-----------|--------|----------|--------|
| Infrastructure | $35-45 | $___ | $___ | ___ |
| OpenReplay | $25-35 | $___ | $___ | ___ |
| Umami | $15-25 | $___ | $___ | ___ |
| CloudWatch | $10-20 | $___ | $___ | ___ |
| Grafana | $9 | $___ | $___ | ___ |
| **Total** | **$94-134** | **$___** | **$___** | ___ |

#### 🧪 Integration Verification
- [ ] **IV1:** Existing AWS budgets and billing alarms remain active
  - List all budgets: `aws budgets describe-budgets --account-id <account-id>`
  - Verify existing budgets still present
- [ ] **IV2:** Cost allocation tags don't interfere with existing resource tagging
  - Check existing resources still have their original tags
  - Verify no tag key conflicts
- [ ] **IV3:** Billing reports include both existing and new resources correctly
  - Run Cost Explorer report without filters
  - Verify all resources appear

#### 📝 Documentation
- [ ] Budget alert thresholds documented ($120, $150)
- [ ] SNS topic ARN documented for reference
- [ ] Cost review process documented with schedule
- [ ] Rollback: Delete budget via AWS Console (no infrastructure impact)

---

## PHASE 2: Amazon Managed Grafana & CloudWatch

### Story 2.1: Amazon Managed Grafana Workspace Provisioning

**Architecture Reference:** Lines 433-452 (Grafana Workspace Component)

#### 🏗️ Grafana Workspace Creation
- [ ] Navigate to AWS Console → Amazon Managed Grafana
- [ ] Create workspace:
  - Workspace name: `UserMetrics-Observability`
  - Pricing plan: Essential ($9/month for 5 users)
  - Authentication: AWS IAM Identity Center (AWS SSO) OR IAM
  - Service managed permissions: Enabled
- [ ] Workspace status: `ACTIVE`
- [ ] Workspace URL documented: https://g-__________.grafana-workspace.us-east-1.amazonaws.com/
- [ ] Workspace ID documented: g-__________

**Alternative CLI Creation (if using CloudFormation/SST):**
```bash
aws grafana create-workspace \
  --name UserMetrics-Observability \
  --account-access-type CURRENT_ACCOUNT \
  --authentication-providers AWS_SSO \
  --permission-type SERVICE_MANAGED
```

#### 🏗️ Authentication Configuration
- [ ] If using AWS SSO:
  - AWS SSO enabled in account
  - SSO user/group assigned to Grafana workspace
  - Workspace role: Admin OR Viewer
- [ ] If using IAM:
  - IAM user/role created for Grafana access
  - IAM policy attached with Grafana permissions
- [ ] Test login to Grafana workspace URL
- [ ] Verify landing on Grafana home page

**IAM Policy for Grafana Access (if using IAM auth):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "grafana:ListWorkspaces",
        "grafana:DescribeWorkspace"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "grafana:*",
      "Resource": "arn:aws:grafana:<region>:<account-id>:/workspaces/<workspace-id>"
    }
  ]
}
```

#### 🏗️ Workspace Admin Role
- [ ] Project owner email assigned Admin role in workspace
- [ ] Admin can access workspace settings
- [ ] Admin can create/edit dashboards and data sources
- [ ] Admin permissions tested (create test dashboard, delete test dashboard)

**Assign User to Workspace (AWS SSO):**
- AWS Console → Amazon Managed Grafana → Workspace → Authentication → Assign new user or group
- Select user/group from AWS SSO
- Assign role: Admin

#### 🏗️ Viewer Roles Configuration
- [ ] Viewer role assigned to Product team members (list emails): ___________________
- [ ] Viewer role assigned to Engineering team members (list emails): ___________________
- [ ] Viewer role assigned to Customer Service team members (list emails): ___________________
- [ ] Viewers can access workspace and view dashboards
- [ ] Viewers CANNOT edit dashboards or data sources (test this)

**Role Permissions:**
- **Admin:** Full control (create dashboards, data sources, users)
- **Editor:** Create/edit dashboards but not data sources
- **Viewer:** Read-only access to dashboards

#### 🏗️ Workspace Settings
- [ ] Navigate to workspace settings
- [ ] Timezone set to: ___________________
- [ ] Organization name set to: "UserMetrics Observability"
- [ ] Week start day: Monday (or preference)
- [ ] Default home dashboard: (leave default for now, set in Story 2.3)
- [ ] Settings saved successfully

#### 🧪 Integration Verification
- [ ] **IV1:** Grafana workspace accessible via HTTPS without interfering with application URLs
  - Visit Grafana URL in browser
  - Verify no DNS conflicts with application domains
- [ ] **IV2:** Authentication does not conflict with existing AWS SSO/IAM setup
  - Existing SSO/IAM users can still access AWS Console
  - No permission errors for existing resources
- [ ] **IV3:** No unexpected AWS quota limits hit during provisioning
  - Check AWS Service Quotas for Managed Grafana
  - Verify workspace count within limits (typically 5 per region)

#### 📝 Documentation
- [ ] Workspace URL added to team wiki/documentation
- [ ] User access instructions documented (how to log in)
- [ ] Admin contact documented for access requests
- [ ] Pricing confirmed: Essential tier = $9/month (within budget)

---

### Story 2.2: CloudWatch Data Source Configuration

**Architecture Reference:** Lines 433-452 (Grafana Component), Lines 165 (CloudWatch as primary data source)

#### 🏗️ CloudWatch Data Source Setup
- [ ] Log in to Grafana workspace as Admin
- [ ] Navigate to Configuration → Data Sources → Add data source
- [ ] Select "CloudWatch" from data source list
- [ ] Data source configuration:
  - Name: `CloudWatch-Primary`
  - Default region: ___________________
  - Authentication Provider: Workspace IAM Role (recommended)
  - Default namespace: (leave blank to access all)
  - Assume Role ARN: (optional, leave blank if using workspace role)
- [ ] Click "Save & Test"
- [ ] Verify success message: "Data source is working"

**Troubleshooting:** If "Save & Test" fails, check IAM permissions below.

#### 🏗️ CloudWatch IAM Permissions
- [ ] Grafana workspace IAM role has permissions:
  - `cloudwatch:DescribeAlarmHistory`
  - `cloudwatch:DescribeAlarms`
  - `cloudwatch:DescribeAlarmsForMetric`
  - `cloudwatch:GetMetricData`
  - `cloudwatch:GetMetricStatistics`
  - `cloudwatch:ListMetrics`
  - `ec2:DescribeInstances`
  - `ec2:DescribeRegions`
  - `tag:GetResources`
- [ ] If using custom IAM role, attach CloudWatch read-only policy:
  - `arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess`

**Validation Query (in Grafana Explore):**
```
Namespace: AWS/Lambda
Metric: Invocations
Statistic: Sum
Dimensions: (leave empty to see all Lambda functions)
Time range: Last 1 hour
```
- [ ] Query returns data (even if zero invocations, should not error)

#### 🏗️ CloudWatch Logs Insights Data Source
- [ ] Navigate to Configuration → Data Sources → Add data source
- [ ] Select "CloudWatch Logs" from list
- [ ] Data source configuration:
  - Name: `CloudWatch-Logs-Insights`
  - Default region: ___________________
  - Authentication Provider: Workspace IAM Role
- [ ] Click "Save & Test"
- [ ] Verify success message: "Data source is working"

#### 🏗️ CloudWatch Logs IAM Permissions
- [ ] Grafana workspace IAM role has Logs permissions:
  - `logs:DescribeLogGroups`
  - `logs:GetLogGroupFields`
  - `logs:StartQuery`
  - `logs:StopQuery`
  - `logs:GetQueryResults`
  - `logs:GetLogEvents`
- [ ] If using custom IAM role, attach policy:
  - `arn:aws:iam::aws:policy/CloudWatchLogsReadOnlyAccess`

**Validation Query (in Grafana Explore):**
```
Log groups: Select any Lambda log group (e.g., /aws/lambda/<function-name>)
Query:
fields @timestamp, @message
| limit 20
```
- [ ] Query returns log entries (or empty if no recent logs)

#### 🏗️ Access to Relevant CloudWatch Namespaces
- [ ] Verified access to `AWS/Lambda` namespace:
  - Query metrics for existing Lambda functions
  - Metrics visible: Invocations, Duration, Errors, Throttles
- [ ] Verified access to `AWS/ApiGateway` namespace:
  - Query metrics for API Gateway
  - Metrics visible: Count, Latency, 4XXError, 5XXError
- [ ] Verified access to `AWS/CloudFront` namespace:
  - Query metrics for CloudFront distribution
  - Metrics visible: Requests, BytesDownloaded, 4xxErrorRate
- [ ] Verified access to `AWS/RDS` namespace (for Aurora):
  - Query metrics for Aurora cluster
  - Metrics visible: CPUUtilization, DatabaseConnections
- [ ] Verified access to custom namespace `UserMetrics/*`:
  - No metrics yet (will be added in Story 3.1)
  - Namespace appears in dropdown

**Validation Checklist by Namespace:**
- [ ] AWS/Lambda metrics query successful
- [ ] AWS/ApiGateway metrics query successful
- [ ] AWS/CloudFront metrics query successful
- [ ] AWS/RDS metrics query successful
- [ ] UserMetrics/* namespace visible (no metrics yet OK)

#### 🏗️ Default Data Source Configuration
- [ ] Mark CloudWatch as default data source for metrics:
  - Configuration → Data Sources → CloudWatch-Primary → Settings
  - Check "Default" checkbox
  - Save
- [ ] Verify default badge appears next to CloudWatch-Primary

#### 🧪 Test Queries
- [ ] Run test query for Lambda invocations (last 24 hours)
- [ ] Run test query for API Gateway latency (last 24 hours)
- [ ] Run test query for CloudFront requests (last 24 hours)
- [ ] Run test Logs Insights query for Lambda errors
- [ ] All test queries return data or gracefully handle no data

**Sample Test Query (Logs Insights):**
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

#### 🧪 Integration Verification
- [ ] **IV1:** CloudWatch metrics collection for existing resources unaffected
  - Check CloudWatch console shows same metrics as before
  - Verify no gaps in metric data
- [ ] **IV2:** Existing CloudWatch alarms continue functioning normally
  - List CloudWatch alarms: `aws cloudwatch describe-alarms`
  - Trigger test alarm (set low threshold temporarily)
  - Verify alarm triggers and sends notification
- [ ] **IV3:** No additional CloudWatch API costs from Grafana queries
  - Monitor CloudWatch API usage in Cost Explorer
  - Grafana queries count against CloudWatch API free tier (1 million requests/month)
  - No unexpected charges in first 24 hours

#### 📝 Documentation
- [ ] Data source names documented: CloudWatch-Primary, CloudWatch-Logs-Insights
- [ ] IAM role ARN documented if using custom role
- [ ] Test query examples documented for team reference
- [ ] Known limitations documented (if any)

---

### Story 2.3: Initial Grafana Dashboards Creation

**Architecture Reference:** Lines 433-452 (Grafana Component), PRD Story 2.3 (Lines 560-578)

**Dashboard JSON Export:** After creating each dashboard, export JSON and commit to repo at `docs/grafana-dashboards/<dashboard-name>.json` for version control.

#### 📊 Dashboard 1: Lambda Performance

- [ ] Create new dashboard: "Lambda Performance - UserMetrics"
- [ ] Dashboard organization: Add to folder "Infrastructure"
- [ ] Time range: Last 24 hours (default)
- [ ] Refresh interval: 1 minute

**Panels to Create:**

1. **Invocations Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/Lambda → Invocations → Sum
   - [ ] Dimensions: FunctionName (show all functions)
   - [ ] Visualization: Stacked area chart
   - [ ] Legend: Show, placement = bottom
   - [ ] Title: "Lambda Invocations (by function)"

2. **Duration Panel (p50/p95/p99)**
   - [ ] Panel type: Time series graph
   - [ ] Metrics:
     - AWS/Lambda → Duration → Average (p50)
     - AWS/Lambda → Duration → p95 percentile
     - AWS/Lambda → Duration → p99 percentile
   - [ ] Dimensions: FunctionName (select specific functions or all)
   - [ ] Visualization: Line chart
   - [ ] Unit: milliseconds (ms)
   - [ ] Title: "Lambda Duration (p50/p95/p99)"

3. **Errors Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/Lambda → Errors → Sum
   - [ ] Dimensions: FunctionName
   - [ ] Visualization: Bar chart or line chart
   - [ ] Color: Red for errors
   - [ ] Title: "Lambda Errors"

4. **Throttles Panel**
   - [ ] Panel type: Stat (single value)
   - [ ] Metric: AWS/Lambda → Throttles → Sum
   - [ ] Visualization: Display as number
   - [ ] Threshold: >0 = red (alert)
   - [ ] Title: "Lambda Throttles (24h)"

5. **Cold Starts Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/Lambda → ColdStartDuration → Count (if available, else use custom metric from Story 3.1)
   - [ ] Note: AWS doesn't provide native cold start metric; will add custom metric in Story 3.1
   - [ ] Title: "Lambda Cold Starts" (placeholder until Story 3.1)

6. **Concurrent Executions Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/Lambda → ConcurrentExecutions → Maximum
   - [ ] Dimensions: FunctionName
   - [ ] Title: "Lambda Concurrent Executions"

- [ ] Dashboard saved successfully
- [ ] Dashboard URL documented: ___________________
- [ ] Export dashboard JSON: `docs/grafana-dashboards/lambda-performance.json`

#### 📊 Dashboard 2: API Gateway

- [ ] Create new dashboard: "API Gateway - UserMetrics"
- [ ] Dashboard organization: Add to folder "Application"
- [ ] Time range: Last 24 hours
- [ ] Refresh interval: 1 minute

**Panels to Create:**

1. **Request Count Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/ApiGateway → Count → Sum
   - [ ] Dimensions: ApiName (or ApiId)
   - [ ] Title: "API Gateway Requests"

2. **Latency Panel (p50/p95/p99)**
   - [ ] Panel type: Time series graph
   - [ ] Metrics:
     - AWS/ApiGateway → Latency → Average (p50)
     - AWS/ApiGateway → Latency → p95
     - AWS/ApiGateway → Latency → p99
   - [ ] Unit: milliseconds (ms)
   - [ ] Title: "API Gateway Latency"

3. **4XX Errors Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/ApiGateway → 4XXError → Sum
   - [ ] Dimensions: ApiName, Method, Resource (or by route)
   - [ ] Color: Orange
   - [ ] Title: "API Gateway 4XX Errors"

4. **5XX Errors Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/ApiGateway → 5XXError → Sum
   - [ ] Color: Red
   - [ ] Title: "API Gateway 5XX Errors"

5. **Integration Latency Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/ApiGateway → IntegrationLatency → Average
   - [ ] Title: "API Gateway → Lambda Latency"

6. **Requests by Route Panel** (if HTTP API with detailed metrics)
   - [ ] Panel type: Bar gauge
   - [ ] Metric: AWS/ApiGateway → Count → Sum
   - [ ] Group by: Route or Method
   - [ ] Title: "Requests by Route"

- [ ] Dashboard saved successfully
- [ ] Export dashboard JSON: `docs/grafana-dashboards/api-gateway.json`

#### 📊 Dashboard 3: CloudFront

- [ ] Create new dashboard: "CloudFront - UserMetrics"
- [ ] Dashboard organization: Add to folder "Frontend"
- [ ] Time range: Last 24 hours
- [ ] Refresh interval: 5 minutes

**Panels to Create:**

1. **Requests Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/CloudFront → Requests → Sum
   - [ ] Dimensions: DistributionId
   - [ ] Title: "CloudFront Requests"

2. **Cache Hit Ratio Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/CloudFront → CacheHitRate → Average
   - [ ] Unit: Percent (%)
   - [ ] Threshold: <80% = yellow, <60% = red
   - [ ] Title: "Cache Hit Ratio"

3. **Bytes Downloaded Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/CloudFront → BytesDownloaded → Sum
   - [ ] Unit: bytes (auto-scale to KB/MB/GB)
   - [ ] Title: "Bytes Downloaded"

4. **Error Rate Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metrics:
     - AWS/CloudFront → 4xxErrorRate → Average
     - AWS/CloudFront → 5xxErrorRate → Average
   - [ ] Unit: Percent (%)
   - [ ] Title: "CloudFront Error Rates"

5. **Edge Location Distribution Panel**
   - [ ] Panel type: Bar chart or pie chart
   - [ ] Metric: AWS/CloudFront → Requests → Sum
   - [ ] Dimensions: Group by EdgeLocation (if available)
   - [ ] Title: "Requests by Edge Location"
   - [ ] Note: May require CloudWatch Logs Insights query if dimension not available

6. **Origin Latency Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/CloudFront → OriginLatency → Average
   - [ ] Unit: milliseconds (ms)
   - [ ] Title: "Origin (S3) Latency"

- [ ] Dashboard saved successfully
- [ ] Export dashboard JSON: `docs/grafana-dashboards/cloudfront.json`

#### 📊 Dashboard 4: System Health

- [ ] Create new dashboard: "System Health - UserMetrics"
- [ ] Dashboard organization: Add to folder "Infrastructure"
- [ ] Time range: Last 24 hours
- [ ] Refresh interval: 1 minute

**Panels to Create:**

1. **Aurora Database Connections Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/RDS → DatabaseConnections → Average
   - [ ] Dimensions: DBClusterIdentifier (Aurora cluster)
   - [ ] Threshold: >80% of max_connections = red
   - [ ] Title: "Aurora Database Connections"

2. **Aurora CPU Utilization Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/RDS → CPUUtilization → Average
   - [ ] Unit: Percent (%)
   - [ ] Threshold: >70% = yellow, >90% = red
   - [ ] Title: "Aurora CPU Utilization"

3. **Aurora Freeable Memory Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metric: AWS/RDS → FreeableMemory → Average
   - [ ] Unit: bytes (auto-scale to MB/GB)
   - [ ] Title: "Aurora Freeable Memory"

4. **Aurora Read/Write IOPS Panel**
   - [ ] Panel type: Time series graph
   - [ ] Metrics:
     - AWS/RDS → ReadIOPS → Average
     - AWS/RDS → WriteIOPS → Average
   - [ ] Title: "Aurora Read/Write IOPS"

5. **S3 Bucket Size Panel**
   - [ ] Panel type: Stat (single value)
   - [ ] Metric: AWS/S3 → BucketSizeBytes → Average
   - [ ] Dimensions: BucketName (session recordings bucket)
   - [ ] Unit: bytes (display as GB)
   - [ ] Title: "OpenReplay S3 Storage (GB)"

6. **ECS Task Health Panel** (placeholder, will populate in Story 4.1-4.2)
   - [ ] Panel type: Stat
   - [ ] Metric: AWS/ECS → HealthyHostCount (or TaskCount)
   - [ ] Dimensions: ServiceName (Umami, OpenReplay)
   - [ ] Note: No data until ECS services deployed
   - [ ] Title: "ECS Service Health"

- [ ] Dashboard saved successfully
- [ ] Export dashboard JSON: `docs/grafana-dashboards/system-health.json`

#### 🏗️ Dashboard Organization
- [ ] Folders created:
  - Infrastructure (Lambda, System Health)
  - Application (API Gateway)
  - Frontend (CloudFront)
- [ ] Dashboards moved to appropriate folders
- [ ] Folder permissions: All team members (Viewer role) can access all folders

#### 🏗️ Dashboard Time Ranges and Refresh
- [ ] All dashboards default to "Last 24 hours"
- [ ] Time range picker enabled (allow users to change)
- [ ] Auto-refresh configured:
  - Lambda, API Gateway, System Health: 1 minute
  - CloudFront: 5 minutes (less frequent updates)
- [ ] Dashboard links added to home page or favorites

#### 🧪 Integration Verification
- [ ] **IV1:** Dashboards display existing application metrics correctly
  - All panels show data (or "No data" if expected)
  - No panel errors or "Data source not found"
- [ ] **IV2:** Historical data (if any) visible in dashboard queries
  - Change time range to "Last 7 days"
  - Verify historical metrics load correctly
- [ ] **IV3:** Dashboard refresh doesn't cause excessive CloudWatch API calls
  - Monitor CloudWatch API usage in first hour
  - No unexpected throttling or rate limit errors

#### 📝 Documentation
- [ ] Dashboard URLs documented in team wiki
- [ ] Dashboard JSON files committed to git: `docs/grafana-dashboards/`
- [ ] Panel descriptions added (what each panel shows and why it matters)
- [ ] Dashboard access instructions for team members

---

### Story 2.4: OpenSearch Integration for Log Analysis

**Architecture Reference:** Lines 439-440 (OpenSearch data source), Lines 165-166 (OpenSearch for log aggregation)

**Note:** This story assumes OpenSearch domain already exists in the AWS account. If not, create OpenSearch domain first.

#### 🏗️ OpenSearch Domain Verification
- [ ] OpenSearch domain exists: ___________________
- [ ] Domain endpoint documented: https://__________.us-east-1.es.amazonaws.com
- [ ] OpenSearch version: ___________________
- [ ] Access policy allows Grafana workspace IAM role
- [ ] VPC configuration (if applicable): ___________________

**If OpenSearch doesn't exist, create via SST or AWS Console:**
```typescript
// Example SST construct (simplified)
const openSearchDomain = new opensearch.Domain(stack, 'LogsDomain', {
  version: opensearch.EngineVersion.OPENSEARCH_2_11,
  capacity: {
    dataNodes: 1,
    dataNodeInstanceType: 't3.small.search',
  },
  ebs: {
    volumeSize: 20,
    volumeType: ec2.EbsDeviceVolumeType.GP3,
  },
  zoneAwareness: {
    enabled: false, // Single AZ for cost savings
  },
});
```

#### 🏗️ CloudWatch Logs Subscription Filter
- [ ] Identify Lambda log groups to stream to OpenSearch:
  - List: `aws logs describe-log-groups --log-group-name-prefix /aws/lambda/`
  - Select log groups for observability (all Lambda functions)
- [ ] Create CloudWatch Logs subscription filter for each log group:
  - Destination: OpenSearch domain
  - Filter pattern: (leave empty to stream all logs, or filter for specific patterns)
  - Subscription filter role: Create IAM role with permissions

**CLI Command to Create Subscription Filter:**
```bash
aws logs put-subscription-filter \
  --log-group-name /aws/lambda/<function-name> \
  --filter-name UserMetrics-OpenSearch \
  --filter-pattern "" \
  --destination-arn arn:aws:es:<region>:<account-id>:domain/<domain-name>
```

**IAM Role for Subscription Filter:**
- [ ] IAM role created: `CloudWatchLogs-OpenSearch-Role`
- [ ] Trust policy allows `logs.amazonaws.com` to assume role
- [ ] Policy allows `es:ESHttpPost` to OpenSearch domain

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "logs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "es:ESHttpPost"
      ],
      "Resource": "arn:aws:es:<region>:<account-id>:domain/<domain-name>/*"
    }
  ]
}
```

#### 🏗️ OpenSearch Index Lifecycle Management (ILM)
- [ ] Navigate to OpenSearch Dashboards (Kibana)
- [ ] Access via OpenSearch domain endpoint: https://__________.us-east-1.es.amazonaws.com/_dashboards
- [ ] Log in with AWS credentials or fine-grained access control user
- [ ] Navigate to Index Management → Policies
- [ ] Create ILM policy: `cloudwatch-logs-lifecycle`

**ILM Policy Configuration:**
```json
{
  "policy": {
    "description": "CloudWatch Logs lifecycle policy",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "7d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 0
            }
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "90d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "delete": {}
          }
        ]
      }
    ]
  }
}
```

- [ ] Apply ILM policy to CloudWatch Logs indices:
  - Index pattern: `cwl-*` (CloudWatch Logs prefix)
  - Policy: `cloudwatch-logs-lifecycle`
- [ ] Verify policy attached to indices

**Validation Query (OpenSearch Dashboards):**
```
GET _cat/indices/cwl-*?v
GET cwl-*/_settings
```

#### 🏗️ Grafana OpenSearch Data Source
- [ ] Log in to Grafana workspace as Admin
- [ ] Navigate to Configuration → Data Sources → Add data source
- [ ] Select "OpenSearch" from list
- [ ] Data source configuration:
  - Name: `OpenSearch-Logs`
  - URL: https://__________.us-east-1.es.amazonaws.com
  - Access: Server (default)
  - Auth: With AWS SigV4 (if using AWS auth)
    - Authentication Provider: Workspace IAM Role
    - Default Region: ___________________
  - Index name: `cwl-*` (CloudWatch Logs indices)
  - Time field name: `@timestamp`
  - Version: 2.x (or your OpenSearch version)
- [ ] Click "Save & Test"
- [ ] Verify success message: "Data source is working"

#### 🏗️ Grafana IAM Permissions for OpenSearch
- [ ] Grafana workspace IAM role has permissions:
  - `es:ESHttpGet`
  - `es:ESHttpPost`
  - `es:DescribeElasticsearchDomain`
- [ ] OpenSearch domain access policy allows Grafana IAM role

**OpenSearch Domain Access Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::<account-id>:role/GrafanaWorkspaceRole"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:<region>:<account-id>:domain/<domain-name>/*"
    }
  ]
}
```

#### 📊 Test Log Query Dashboard
- [ ] Create new dashboard in Grafana: "Log Analysis - UserMetrics"
- [ ] Add panel: "Error Logs (Last 24h)"
  - Data source: OpenSearch-Logs
  - Query type: Lucene
  - Query: `level: ERROR` OR `@message: *ERROR*`
  - Visualization: Logs panel (table view)
  - Columns: @timestamp, @message, functionName
  - Sort: @timestamp descending
- [ ] Add panel: "Log Volume by Function"
  - Query: (empty for all logs)
  - Group by: functionName.keyword
  - Visualization: Bar chart
  - Y-axis: Count
- [ ] Add panel: "Top Error Messages"
  - Query: `level: ERROR`
  - Group by: @message.keyword
  - Aggregation: Terms (top 10)
  - Visualization: Table
- [ ] Dashboard saved successfully
- [ ] Export dashboard JSON: `docs/grafana-dashboards/log-analysis.json`

#### 📝 Log Query Syntax Documentation
- [ ] Create documentation: `docs/prd/user-metrics/log-query-guide.md`
- [ ] Include common query patterns:

**Example Queries:**
```
# All error logs
level: ERROR

# Logs from specific function
functionName: "user-auth-lambda"

# Logs containing specific text
@message: *timeout*

# Logs in time range (handled by Grafana time picker)
@timestamp: [now-1h TO now]

# Complex query
level: ERROR AND functionName: "api-handler" AND @message: *database*
```

- [ ] Document CloudWatch Logs Insights syntax differences
- [ ] Link to OpenSearch Lucene query documentation

#### 🧪 Integration Verification
- [ ] **IV1:** Existing CloudWatch Logs streams continue functioning
  - Check CloudWatch Logs console shows logs streaming normally
  - Verify no gaps in log data
- [ ] **IV2:** Application logging not impacted by subscription filter
  - Run application test suite
  - Verify logs appear in CloudWatch Logs as before
  - Check Lambda execution time not increased
- [ ] **IV3:** OpenSearch query performance acceptable (<2 second response for typical queries)
  - Run test queries in Grafana
  - Measure query response time
  - If slow, consider index optimization or scaling OpenSearch

**Performance Test Queries:**
```
# Simple query (should be <500ms)
level: ERROR | limit 100

# Aggregation query (should be <2s)
Group by functionName, count

# Complex query (should be <5s)
level: ERROR AND @message: * | stats count() by functionName
```

#### 📝 Documentation
- [ ] OpenSearch domain endpoint documented
- [ ] ILM policy configuration saved to git (JSON file)
- [ ] Log query guide completed
- [ ] Grafana data source name documented: OpenSearch-Logs

---

## PHASE 3: Application Instrumentation

### Story 3.1: Lambda CloudWatch EMF Instrumentation

**Architecture Reference:** Lines 278-296 (CloudWatch EMF Instrumentation Layer), Lines 1286-1289 (EMF Naming Standards)

#### 💻 Install CloudWatch EMF Library
- [ ] Navigate to Lambda project: `cd apps/api/lego-api-serverless`
- [ ] Install EMF library:
  ```bash
  pnpm add aws-embedded-metrics
  ```
- [ ] Verify installation: Check `package.json` includes `aws-embedded-metrics`
- [ ] Run tests to ensure no dependency conflicts: `pnpm test`

#### 💻 Create CloudWatch EMF Utility
- [ ] Create directory: `src/lib/tracking/`
- [ ] Create file: `src/lib/tracking/cloudwatch-emf.ts`
- [ ] Implement EMF utility with interfaces from architecture:

```typescript
// src/lib/tracking/cloudwatch-emf.ts
import { createMetricsLogger, Unit } from 'aws-embedded-metrics';

export interface MetricDimensions {
  functionName?: string;
  environment?: string;
  errorType?: string;
  [key: string]: string | undefined;
}

/**
 * Publish a custom metric to CloudWatch using Embedded Metric Format
 */
export function publishMetric(
  metricName: string,
  value: number,
  dimensions?: MetricDimensions,
  unit: Unit = Unit.None
): void {
  try {
    const metrics = createMetricsLogger();
    metrics.setNamespace('UserMetrics/Lambda');

    if (dimensions) {
      Object.entries(dimensions).forEach(([key, val]) => {
        if (val) metrics.setDimensions({ [key]: val });
      });
    }

    metrics.putMetric(metricName, value, unit);
    // Metrics are automatically flushed when Lambda execution completes
  } catch (error) {
    // Silent error - don't break application if metric publishing fails
    console.error('Failed to publish metric:', error);
  }
}

/**
 * Record a cold start event with duration
 */
export function recordColdStart(duration: number): void {
  publishMetric('ColdStartDuration', duration, undefined, Unit.Milliseconds);
  publishMetric('ColdStart', 1, undefined, Unit.Count);
}

/**
 * Higher-order function to wrap Lambda handlers with metrics
 */
export function withMetrics<TEvent, TResult>(
  handler: (event: TEvent, context: any) => Promise<TResult>
) {
  return async (event: TEvent, context: any): Promise<TResult> => {
    const startTime = Date.now();
    let isColdStart = false;

    // Detect cold start (simplified - check if this is first invocation)
    if (!global.lambdaInitialized) {
      global.lambdaInitialized = true;
      isColdStart = true;
      const coldStartDuration = Date.now() - (global.lambdaStartTime || startTime);
      recordColdStart(coldStartDuration);
    }

    try {
      const result = await handler(event, context);

      const duration = Date.now() - startTime;
      publishMetric('ExecutionDuration', duration, {
        functionName: context.functionName,
        environment: process.env.STAGE || 'dev',
      }, Unit.Milliseconds);

      publishMetric('Invocations', 1, {
        functionName: context.functionName,
        environment: process.env.STAGE || 'dev',
      }, Unit.Count);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      publishMetric('Errors', 1, {
        functionName: context.functionName,
        environment: process.env.STAGE || 'dev',
        errorType: error instanceof Error ? error.name : 'Unknown',
      }, Unit.Count);

      publishMetric('ExecutionDuration', duration, {
        functionName: context.functionName,
        environment: process.env.STAGE || 'dev',
      }, Unit.Milliseconds);

      throw error; // Re-throw to maintain existing error handling
    }
  };
}
```

- [ ] File created and code implemented
- [ ] TypeScript compilation successful: `pnpm tsc --noEmit`

#### 💻 Enhance Lambda Wrapper
- [ ] Open existing file: `src/lib/utils/lambda-wrapper.ts`
- [ ] Import `withMetrics` from cloudwatch-emf utility
- [ ] Enhance wrapper to include metrics instrumentation:

```typescript
// src/lib/utils/lambda-wrapper.ts (additions)
import { withMetrics } from '../tracking/cloudwatch-emf';

export function wrapHandler<TEvent, TResult>(
  handler: (event: TEvent, context: any) => Promise<TResult>
) {
  // Existing wrapper logic...

  // Add metrics wrapping
  const metricsHandler = withMetrics(handler);

  return async (event: TEvent, context: any): Promise<TResult> => {
    // Existing pre-processing...

    const result = await metricsHandler(event, context);

    // Existing post-processing...

    return result;
  };
}
```

- [ ] Wrapper enhanced successfully
- [ ] No breaking changes to existing handler signature
- [ ] TypeScript compilation successful

#### 💻 Define Custom Business Metrics
- [ ] Identify 2-3 business-specific metrics to track:
  - Example: UserSignups, ApiCallsPerUser, FeatureUsage, etc.
- [ ] Document custom metrics: ___________________
- [ ] Add helper functions to cloudwatch-emf.ts for business metrics:

```typescript
// Business metric examples
export function trackUserSignup(userId: string): void {
  publishMetric('UserSignups', 1, {
    environment: process.env.STAGE || 'dev',
  }, Unit.Count);
}

export function trackFeatureUsage(featureName: string): void {
  publishMetric('FeatureUsage', 1, {
    featureName,
    environment: process.env.STAGE || 'dev',
  }, Unit.Count);
}
```

#### 💻 Configure Environment-Specific Namespaces
- [ ] Update EMF utility to use environment-specific namespaces:
  - Development: `UserMetrics/Lambda/Dev`
  - Production: `UserMetrics/Lambda/Prod`
- [ ] Add environment detection:

```typescript
const namespace = `UserMetrics/Lambda/${process.env.STAGE || 'dev'}`;
metrics.setNamespace(namespace);
```

- [ ] Verify namespace logic with unit test

#### 🧪 Test Metrics in CloudWatch Console
- [ ] Deploy Lambda function with EMF instrumentation: `sst deploy --stage dev`
- [ ] Invoke Lambda function manually (via AWS Console or API Gateway)
- [ ] Navigate to CloudWatch → Metrics → Custom Namespaces
- [ ] Verify `UserMetrics/Lambda/Dev` namespace appears
- [ ] Verify metrics visible:
  - ExecutionDuration
  - Invocations
  - Errors (trigger error to test)
  - ColdStart
  - ColdStartDuration
- [ ] Wait 1-2 minutes for metrics to appear (CloudWatch ingestion delay)

**Validation Query (CloudWatch Console):**
```
Namespace: UserMetrics/Lambda/Dev
Metric: Invocations
Dimensions: FunctionName
Statistic: Sum
Period: 1 minute
```

#### 🧪 Test Metrics in Grafana
- [ ] Navigate to Grafana → Explore
- [ ] Select data source: CloudWatch-Primary
- [ ] Query custom metrics:
  - Namespace: `UserMetrics/Lambda/Dev`
  - Metric: `Invocations`, `ExecutionDuration`, `ColdStart`
  - Dimensions: `FunctionName`, `Environment`
- [ ] Verify metrics display correctly
- [ ] Add custom metrics to Lambda Performance dashboard (Story 2.3):
  - Panel: "Cold Starts (Custom)"
  - Metric: `UserMetrics/Lambda/Dev` → `ColdStart`

#### 🧪 Validate Asynchronous Publishing
- [ ] Check Lambda execution time before/after EMF instrumentation
- [ ] Compare average duration in CloudWatch:
  - Before: _____ ms
  - After: _____ ms
  - Difference: _____ ms (should be <50ms per NFR2)
- [ ] If overhead >50ms, optimize EMF configuration (reduce dimensions, batch metrics)

#### 🧪 Integration Verification
- [ ] **IV1:** Existing Lambda function logic unchanged and tests still pass
  - Run Lambda test suite: `pnpm test`
  - All tests pass ✓
  - No test modifications required
- [ ] **IV2:** Lambda execution time increase <50ms due to EMF overhead
  - CloudWatch metric: ExecutionDuration before vs after
  - Difference < 50ms ✓
- [ ] **IV3:** No errors introduced in Lambda error handling flow
  - Trigger Lambda error scenario
  - Verify error still propagates correctly
  - Verify error metric recorded
  - Verify application error handling unchanged

#### 📝 Documentation
- [ ] EMF utility documented with TSDoc comments
- [ ] Custom metrics documented: `docs/prd/user-metrics/custom-metrics.md`
- [ ] Namespace naming convention documented
- [ ] Example usage added to Lambda function README

---

### Story 3.2: Structured Logging Implementation

**Architecture Reference:** Lines 300-320 (Structured Logging Service), Lines 1291-1303 (Logging Format)

#### 💻 Install Logging Library
- [ ] Choose logging library: **Winston** OR **Pino** (recommend Pino for performance)
- [ ] Install library:
  ```bash
  # Option 1: Winston
  pnpm add winston

  # Option 2: Pino (recommended)
  pnpm add pino
  ```
- [ ] Verify installation in `package.json`

#### 💻 Create Structured Logger Utility
- [ ] Create file: `src/lib/tracking/structured-logger.ts`
- [ ] Implement logger with format from architecture (lines 1291-1303):

**Option 1: Winston Implementation**
```typescript
// src/lib/tracking/structured-logger.ts
import winston from 'winston';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

export function createLogger(functionName: string): Logger {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      functionName,
      environment: process.env.STAGE || 'dev',
    },
    transports: [
      new winston.transports.Console(),
    ],
  });

  return {
    info(message: string, context?: LogContext) {
      logger.info(message, context);
    },
    warn(message: string, context?: LogContext) {
      logger.warn(message, context);
    },
    error(message: string, error: Error, context?: LogContext) {
      logger.error(message, {
        ...context,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      });
    },
    debug(message: string, context?: LogContext) {
      logger.debug(message, context);
    },
  };
}

// Global logger instance
let globalLogger: Logger;

export function getLogger(functionName?: string): Logger {
  if (!globalLogger) {
    globalLogger = createLogger(
      functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown'
    );
  }
  return globalLogger;
}
```

**Option 2: Pino Implementation (Recommended)**
```typescript
// src/lib/tracking/structured-logger.ts
import pino from 'pino';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

export function createLogger(functionName: string): Logger {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
      functionName,
      environment: process.env.STAGE || 'dev',
    },
    formatters: {
      level(label) {
        return { level: label.toUpperCase() };
      },
    },
  });

  return {
    info(message: string, context?: LogContext) {
      logger.info(context, message);
    },
    warn(message: string, context?: LogContext) {
      logger.warn(context, message);
    },
    error(message: string, error: Error, context?: LogContext) {
      logger.error({
        ...context,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      }, message);
    },
    debug(message: string, context?: LogContext) {
      logger.debug(context, message);
    },
  };
}

// Global logger instance
let globalLogger: Logger;

export function getLogger(functionName?: string): Logger {
  if (!globalLogger) {
    globalLogger = createLogger(
      functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'unknown'
    );
  }
  return globalLogger;
}
```

- [ ] File created and implemented
- [ ] TypeScript compilation successful

#### 💻 Add Request Correlation IDs
- [ ] Enhance logger to capture AWS Request ID from Lambda context:

```typescript
// In createLogger or Lambda wrapper
export function createLoggerWithContext(functionName: string, requestId: string): Logger {
  const logger = createLogger(functionName);

  // Wrap logger methods to include requestId
  return {
    info(message: string, context?: LogContext) {
      logger.info(message, { ...context, requestId });
    },
    warn(message: string, context?: LogContext) {
      logger.warn(message, { ...context, requestId });
    },
    error(message: string, error: Error, context?: LogContext) {
      logger.error(message, error, { ...context, requestId });
    },
    debug(message: string, context?: LogContext) {
      logger.debug(message, { ...context, requestId });
    },
  };
}
```

- [ ] Update Lambda wrapper to inject request ID:

```typescript
// src/lib/utils/lambda-wrapper.ts
import { createLoggerWithContext } from '../tracking/structured-logger';

export function wrapHandler(handler) {
  return async (event, context) => {
    const logger = createLoggerWithContext(
      context.functionName,
      context.requestId
    );

    // Make logger available in context or global
    context.logger = logger;

    // ... rest of wrapper logic
  };
}
```

#### 💻 Migrate console.log to Structured Logger
- [ ] Search codebase for `console.log`, `console.error`, `console.warn`:
  ```bash
  grep -r "console\." src/ --include="*.ts"
  ```
- [ ] Count occurrences: _____ instances found
- [ ] Migrate each instance to structured logger:

**Before:**
```typescript
console.log('User authenticated', userId);
console.error('Database error:', error);
```

**After:**
```typescript
logger.info('User authenticated', { userId });
logger.error('Database error', error, { query: 'SELECT * FROM users' });
```

- [ ] Migration checklist:
  - [ ] Lambda function 1: ___________ (_____ instances migrated)
  - [ ] Lambda function 2: ___________ (_____ instances migrated)
  - [ ] Lambda function 3: ___________ (_____ instances migrated)
  - [ ] Utility files: ___________ (_____ instances migrated)
- [ ] Keep `console.log` for local development debugging (optional, behind env var)

#### 💻 Configure Log Levels
- [ ] Set log levels by environment:
  - Development: `debug` (verbose)
  - Staging: `info` (standard)
  - Production: `warn` (errors and warnings only, reduce cost)
- [ ] Configure via environment variable: `LOG_LEVEL`
- [ ] Update SST configuration to set `LOG_LEVEL`:

```typescript
// sst.config.ts
new Function(stack, 'MyFunction', {
  environment: {
    LOG_LEVEL: stack.stage === 'prod' ? 'warn' : 'info',
  },
});
```

#### 🧪 Validate Log Output in CloudWatch Logs
- [ ] Deploy Lambda with structured logging: `sst deploy --stage dev`
- [ ] Invoke Lambda function
- [ ] Navigate to CloudWatch → Log Groups → `/aws/lambda/<function-name>`
- [ ] View latest log stream
- [ ] Verify JSON format:

**Expected Output:**
```json
{
  "timestamp": "2025-11-23T10:30:00.123Z",
  "level": "INFO",
  "message": "User authenticated",
  "functionName": "user-auth-lambda",
  "requestId": "abc123-def456",
  "environment": "dev",
  "userId": "user-123"
}
```

- [ ] Verify all required fields present:
  - timestamp ✓
  - level ✓
  - message ✓
  - functionName ✓
  - requestId ✓
  - context (additional fields) ✓

#### 🧪 Verify No PII in Logs
- [ ] Review log output for PII (email, name, SSN, etc.)
- [ ] If PII found, update logging calls to exclude sensitive fields
- [ ] Add PII sanitization helper if needed:

```typescript
export function sanitizeContext(context: LogContext): LogContext {
  const sanitized = { ...context };

  // Remove known PII fields
  delete sanitized.email;
  delete sanitized.ssn;
  delete sanitized.password;

  // Mask partial values
  if (sanitized.userId) {
    sanitized.userId = sanitized.userId.substring(0, 8) + '***';
  }

  return sanitized;
}
```

#### 🧪 Test OpenSearch Integration
- [ ] Wait 5-10 minutes for CloudWatch Logs → OpenSearch subscription filter
- [ ] Navigate to OpenSearch Dashboards or Grafana
- [ ] Query structured logs:
  ```
  level: INFO AND functionName: "user-auth-lambda"
  ```
- [ ] Verify logs appear with JSON structure
- [ ] Verify fields are searchable (functionName, requestId, level)

#### 🧪 Integration Verification
- [ ] **IV1:** All existing log statements still output (format changed but content preserved)
  - Compare log messages before/after migration
  - Verify same information captured (no data loss)
- [ ] **IV2:** Error handling and alerting based on logs still functional
  - Trigger error scenario
  - Verify error log appears in CloudWatch
  - Verify existing CloudWatch alarm still triggers (if based on log patterns)
- [ ] **IV3:** Log volume doesn't increase significantly (within CloudWatch budget)
  - Check CloudWatch Logs storage size before/after
  - Estimate monthly cost: _____ GB × $0.50/GB = $_____
  - Verify within budget ($10-20 for CloudWatch in cost breakdown)

#### 📝 Documentation
- [ ] Structured logging guide created: `docs/prd/user-metrics/logging-guide.md`
- [ ] Include:
  - How to create logger instance
  - How to log info/warn/error/debug
  - Context object best practices
  - PII sanitization guidelines
- [ ] Update Lambda function README with logging examples

---

**(Stories 3.3, 3.4, 3.5, and Phase 4 stories continue with similar detailed checklists...)**

---

## Summary Metrics

Track your progress through the implementation:

**Phase 1: Infrastructure Foundation**
- [ ] Story 1.1: AWS Infrastructure Foundation Setup
- [ ] Story 1.2: Aurora PostgreSQL Schema for Umami
- [ ] Story 1.3: S3 Buckets and Lifecycle Policies
- [ ] Story 1.4: Cost Monitoring and Budget Alerts

**Phase 2: Grafana & CloudWatch**
- [ ] Story 2.1: Amazon Managed Grafana Workspace Provisioning
- [ ] Story 2.2: CloudWatch Data Source Configuration
- [ ] Story 2.3: Initial Grafana Dashboards Creation
- [ ] Story 2.4: OpenSearch Integration for Log Analysis

**Phase 3: Application Instrumentation**
- [ ] Story 3.1: Lambda CloudWatch EMF Instrumentation
- [ ] Story 3.2: Structured Logging Implementation
- [ ] Story 3.3: Frontend Web Vitals Tracking
- [ ] Story 3.4: Frontend Error Reporting to CloudWatch
- [ ] Story 3.5: Performance Validation and Optimization

**Phase 4: Self-Hosted Analytics Tools**
- [ ] Story 4.1: Umami Deployment on ECS/Fargate
- [ ] Story 4.2: OpenReplay Deployment on ECS/Fargate
- [ ] Story 4.3: Frontend Tracking Script Integration
- [ ] Story 4.4: PII Masking Configuration and Validation
- [ ] Story 4.5: End-to-End Testing and Documentation

**Overall Progress:** _____ / 18 stories complete (____%)

---

## Notes and Deviations

Document any deviations from acceptance criteria or architecture guidance:

| Story | Deviation | Reason | Approved By |
|-------|-----------|--------|-------------|
| | | | |
| | | | |

---

**Version:** 1.0
**Last Updated:** 2025-11-23
**Maintained By:** Sarah (Product Owner)
