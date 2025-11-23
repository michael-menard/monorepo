# Acceptance Test Scenarios - User Metrics Implementation

## Overview

This document defines comprehensive acceptance test scenarios for all critical integration points in the User Metrics epic. These tests validate that new observability infrastructure integrates correctly with existing application functionality without breaking changes.

**Purpose:**
- Validate Integration Verification (IV) criteria from PRD
- Ensure backward compatibility with existing application
- Verify performance requirements (<50ms overhead, <$150/month budget)
- Confirm data flows correctly through entire observability stack

**Test Execution:**
- Execute during story implementation (before marking complete)
- Re-execute during Story 4.5 (End-to-End Testing)
- Include in CI/CD pipeline where applicable

---

## Test Scenario Index

### Phase 1: Infrastructure Foundation
- [TS-1.1: VPC Network Isolation](#ts-11-vpc-network-isolation)
- [TS-1.2: Aurora Schema Isolation](#ts-12-aurora-schema-isolation)
- [TS-1.3: S3 Bucket Access Control](#ts-13-s3-bucket-access-control)
- [TS-1.4: Cost Tracking Validation](#ts-14-cost-tracking-validation)

### Phase 2: Grafana & CloudWatch
- [TS-2.1: Grafana Authentication](#ts-21-grafana-authentication)
- [TS-2.2: CloudWatch Metrics Query](#ts-22-cloudwatch-metrics-query)
- [TS-2.3: Dashboard Data Accuracy](#ts-23-dashboard-data-accuracy)
- [TS-2.4: OpenSearch Log Ingestion](#ts-24-opensearch-log-ingestion)

### Phase 3: Application Instrumentation
- [TS-3.1: Lambda EMF Performance Impact](#ts-31-lambda-emf-performance-impact)
- [TS-3.2: Structured Logging Migration](#ts-32-structured-logging-migration)
- [TS-3.3: Web Vitals Measurement Accuracy](#ts-33-web-vitals-measurement-accuracy)
- [TS-3.4: Error Reporting End-to-End](#ts-34-error-reporting-end-to-end)
- [TS-3.5: Overall Performance Regression](#ts-35-overall-performance-regression)

### Phase 4: Self-Hosted Analytics
- [TS-4.1: Umami Analytics Data Flow](#ts-41-umami-analytics-data-flow)
- [TS-4.2: OpenReplay Session Recording](#ts-42-openreplay-session-recording)
- [TS-4.3: Frontend Tracking Integration](#ts-43-frontend-tracking-integration)
- [TS-4.4: PII Masking Validation](#ts-44-pii-masking-validation)
- [TS-4.5: Complete System Integration](#ts-45-complete-system-integration)

---

## Phase 1: Infrastructure Foundation

### TS-1.1: VPC Network Isolation

**Story:** 1.1 - AWS Infrastructure Foundation Setup
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 15 minutes

#### Test Objective
Verify that new VPC networking (subnets, NAT Gateway, security groups) does not disrupt existing application connectivity to Aurora database or external services.

#### Pre-Conditions
- [ ] Story 1.1 completed
- [ ] VPC, subnets, NAT Gateway deployed
- [ ] Existing application Lambda functions deployed

#### Test Steps

**Step 1: Verify Existing Lambda → Aurora Connectivity**
1. Invoke existing Lambda function that queries Aurora database
2. Execute simple database query (e.g., `SELECT 1`)
3. Verify response time < baseline + 10ms

**Expected Result:**
- ✅ Lambda connects to Aurora successfully
- ✅ Query executes without errors
- ✅ Response time within acceptable range

**Actual Result:** __________

**AWS CLI Test:**
```bash
# Invoke Lambda and check CloudWatch Logs
aws lambda invoke \
  --function-name <existing-function-name> \
  --payload '{"test": true}' \
  response.json

# Check for database errors in logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/<function-name> \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '5 minutes ago' +%s)000
```

**Step 2: Verify Security Group Rules**
1. List security groups tagged with `Project=UserMetrics`
2. Verify ingress/egress rules match architecture specifications
3. Verify no overly permissive rules (0.0.0.0/0 on ingress)

**Expected Result:**
- ✅ Security groups exist with correct tags
- ✅ Rules allow only necessary traffic (ECS → Aurora, ECS → Internet via NAT)
- ✅ No security group allows unrestricted ingress

**AWS CLI Test:**
```bash
# List UserMetrics security groups
aws ec2 describe-security-groups \
  --filters "Name=tag:Project,Values=UserMetrics" \
  --query 'SecurityGroups[*].[GroupId,GroupName,IpPermissions]' \
  --output table

# Verify no wide-open ingress
aws ec2 describe-security-groups \
  --filters "Name=tag:Project,Values=UserMetrics" \
  --query 'SecurityGroups[?IpPermissions[?IpRanges[?CidrIp==`0.0.0.0/0`]]]'
```

**Step 3: Verify Application Deployment Pipeline**
1. Trigger existing application deployment (e.g., `sst deploy --stage dev`)
2. Verify deployment completes without errors
3. Check CloudFormation stack status

**Expected Result:**
- ✅ Deployment succeeds without errors
- ✅ No new manual steps required
- ✅ CloudFormation stacks show `UPDATE_COMPLETE` or `CREATE_COMPLETE`

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

### TS-1.2: Aurora Schema Isolation

**Story:** 1.2 - Aurora PostgreSQL Schema for Umami
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 20 minutes

#### Test Objective
Verify that new `umami` PostgreSQL schema is completely isolated from existing application schemas and does not impact database performance or connectivity.

#### Pre-Conditions
- [ ] Story 1.2 completed
- [ ] `umami` schema created
- [ ] `umami_user` database user created
- [ ] Existing application functional

#### Test Steps

**Step 1: Schema Isolation - Verify umami_user Permissions**
1. Connect to Aurora as `umami_user`
2. Attempt to query application schema tables
3. Verify permission denied error

**Expected Result:**
- ✅ `umami_user` can query `umami` schema tables
- ✅ `umami_user` CANNOT query application schema tables (permission denied)
- ✅ Error message: "permission denied for schema <application_schema>"

**SQL Test:**
```sql
-- Connect as umami_user
psql -h <aurora-endpoint> -U umami_user -d <database-name>

-- Should succeed
SELECT * FROM umami.website LIMIT 1;

-- Should fail with permission denied
SELECT * FROM public.users LIMIT 1;
-- Expected: ERROR: permission denied for schema public

-- Should fail with permission denied
SELECT * FROM application.orders LIMIT 1;
-- Expected: ERROR: permission denied for schema application
```

**Actual Result:** __________

**Step 2: Schema Isolation - Verify Application User Permissions**
1. Connect to Aurora as application database user
2. Attempt to query `umami` schema tables
3. Verify permission denied error

**Expected Result:**
- ✅ Application user can query application schema tables
- ✅ Application user CANNOT query `umami` schema tables (permission denied)

**SQL Test:**
```sql
-- Connect as application user
psql -h <aurora-endpoint> -U <app-user> -d <database-name>

-- Should succeed
SELECT * FROM public.users LIMIT 1;

-- Should fail with permission denied
SELECT * FROM umami.website LIMIT 1;
-- Expected: ERROR: permission denied for schema umami
```

**Actual Result:** __________

**Step 3: Application Functionality - Run Full Test Suite**
1. Execute existing application test suite
2. Verify all tests pass
3. Check for any database-related test failures

**Expected Result:**
- ✅ All tests pass (same as before Story 1.2)
- ✅ No database connection errors
- ✅ No schema or table not found errors

**Test Command:**
```bash
cd apps/api/lego-api-serverless
pnpm test
```

**Actual Result:** __________
**Test Summary:** _____ / _____ tests passed

**Step 4: Aurora Performance Metrics - Compare Before/After**
1. Navigate to CloudWatch → RDS → Aurora cluster
2. Compare metrics before and after Umami schema creation:
   - CPU Utilization
   - Database Connections
   - Read IOPS
   - Write IOPS
   - Freeable Memory

**Expected Result:**
- ✅ CPU Utilization: Within ±5% of baseline
- ✅ Database Connections: No increase (Umami not yet connected)
- ✅ IOPS: Within ±10% of baseline
- ✅ Freeable Memory: Within ±5% of baseline

**Baseline Metrics (from Story 1.2):**
- CPU Utilization: _____ %
- Database Connections: _____
- Read IOPS: _____
- Write IOPS: _____
- Freeable Memory: _____ MB

**Current Metrics:**
- CPU Utilization: _____ %
- Database Connections: _____
- Read IOPS: _____
- Write IOPS: _____
- Freeable Memory: _____ MB

**Variance:** Within acceptable range? ☐ YES ☐ NO

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

### TS-1.3: S3 Bucket Access Control

**Story:** 1.3 - S3 Buckets and Lifecycle Policies
**Integration Verification:** IV1, IV2, IV3
**Priority:** HIGH
**Execution Time:** 15 minutes

#### Test Objective
Verify that new S3 buckets for OpenReplay session recordings are properly isolated from existing application S3 buckets with correct access controls and lifecycle policies.

#### Pre-Conditions
- [ ] Story 1.3 completed
- [ ] S3 buckets created with lifecycle policies
- [ ] Existing application S3 buckets operational

#### Test Steps

**Step 1: Verify Bucket Isolation**
1. List all S3 buckets in AWS account
2. Verify new buckets exist: `usermetrics-openreplay-sessions-*`, `usermetrics-cloudwatch-logs-*`
3. Verify existing application buckets unchanged

**Expected Result:**
- ✅ New UserMetrics buckets exist
- ✅ Existing application buckets present and unchanged
- ✅ All buckets have correct tags

**AWS CLI Test:**
```bash
# List all buckets
aws s3 ls

# Verify UserMetrics buckets
aws s3api list-buckets \
  --query 'Buckets[?starts_with(Name, `usermetrics-`)]'

# Verify bucket tags
aws s3api get-bucket-tagging \
  --bucket usermetrics-openreplay-sessions-<account-id>-<region>
```

**Actual Result:** __________

**Step 2: Verify Bucket Policy Restrictions**
1. Get bucket policy for OpenReplay sessions bucket
2. Verify only ECS task role has access
3. Attempt access with application Lambda role (should fail)

**Expected Result:**
- ✅ Bucket policy allows ECS task role (PutObject, GetObject, DeleteObject)
- ✅ Bucket policy denies all other principals
- ✅ Application Lambda role cannot access bucket

**AWS CLI Test:**
```bash
# Get bucket policy
aws s3api get-bucket-policy \
  --bucket usermetrics-openreplay-sessions-<account-id>-<region>

# Attempt to list objects with application Lambda role (should fail)
aws s3 ls s3://usermetrics-openreplay-sessions-<account-id>-<region>/ \
  --profile <app-lambda-role-profile>
# Expected: Access Denied error
```

**Actual Result:** __________

**Step 3: Verify Lifecycle Policy Configuration**
1. Get lifecycle configuration for sessions bucket
2. Verify 30-day expiration rule exists and is enabled
3. Verify Intelligent-Tiering is enabled

**Expected Result:**
- ✅ Lifecycle rule exists with ID "DeleteOldRecordings"
- ✅ Expiration set to 30 days
- ✅ Rule is enabled
- ✅ Intelligent-Tiering configured

**AWS CLI Test:**
```bash
# Get lifecycle configuration
aws s3api get-bucket-lifecycle-configuration \
  --bucket usermetrics-openreplay-sessions-<account-id>-<region>

# Expected output includes:
# "Expiration": { "Days": 30 }
# "Status": "Enabled"
```

**Actual Result:** __________

**Step 4: Verify Existing Application S3 Access**
1. Visit frontend application URL
2. Verify static assets load from existing S3 bucket via CloudFront
3. Check CloudFront access logs for any 403/404 errors

**Expected Result:**
- ✅ Frontend loads successfully
- ✅ All static assets (JS, CSS, images) load without errors
- ✅ No 403 Forbidden or 404 Not Found errors in browser console

**Manual Test:**
- Open frontend URL: __________
- Check browser console (F12): ☐ No errors ☐ Errors found
- CloudFront distribution serving assets: ☐ YES ☐ NO

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

### TS-1.4: Cost Tracking Validation

**Story:** 1.4 - Cost Monitoring and Budget Alerts
**Integration Verification:** IV1, IV2, IV3
**Priority:** MEDIUM
**Execution Time:** 10 minutes

#### Test Objective
Verify that cost monitoring infrastructure (budgets, tags, alarms) is functioning correctly without interfering with existing billing or cost tracking.

#### Pre-Conditions
- [ ] Story 1.4 completed
- [ ] AWS Budget created for UserMetrics project
- [ ] Cost allocation tags activated

#### Test Steps

**Step 1: Verify AWS Budget Configuration**
1. Navigate to AWS Billing Console → Budgets
2. Verify budget exists: "UserMetrics-Observability-Budget"
3. Verify budget amount ($150/month) and alerts (80%, 100%)

**Expected Result:**
- ✅ Budget named "UserMetrics-Observability-Budget" exists
- ✅ Monthly budget amount: $150.00
- ✅ Alert thresholds: 80% ($120), 100% ($150)
- ✅ Tag filter: `Project=UserMetrics`

**Manual Test:**
- Navigate to: AWS Console → AWS Budgets
- Budget exists: ☐ YES ☐ NO
- Amount correct: ☐ YES ☐ NO
- Alerts configured: ☐ YES ☐ NO

**Step 2: Verify Cost Allocation Tags**
1. Navigate to AWS Billing → Cost Allocation Tags
2. Verify tags are activated: Project, Component, Function, Environment
3. Wait 24 hours and verify tags appear in Cost Explorer

**Expected Result:**
- ✅ Tags show status "Active" in billing console
- ✅ Tags appear in Cost Explorer filter dropdown (after 24h)

**Manual Test:**
- Tags activated: ☐ YES ☐ NO (check status column)
- Tag names:
  - ☐ Project
  - ☐ Component
  - ☐ Function
  - ☐ Environment
  - ☐ CostCenter

**Step 3: Test Budget Alert Delivery**
1. Verify SNS topic subscription confirmed (check email)
2. Optional: Trigger test alert by temporarily lowering budget threshold
3. Verify email notification received

**Expected Result:**
- ✅ SNS subscription confirmed
- ✅ Test email received (if triggered)

**Manual Test:**
- SNS confirmation email received: ☐ YES ☐ NO
- Test alert email received: ☐ YES ☐ NO ☐ NOT TESTED

**Step 4: Verify Existing Budgets Unchanged**
1. List all budgets in AWS account
2. Verify existing budgets (if any) still present and active
3. Verify no conflicts with existing cost tracking

**Expected Result:**
- ✅ Existing budgets unchanged
- ✅ No errors or conflicts reported

**AWS CLI Test:**
```bash
# List all budgets
aws budgets describe-budgets --account-id <account-id>

# Verify existing budgets still present
```

**Actual Result:** __________

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

## Phase 2: Grafana & CloudWatch

### TS-2.2: CloudWatch Metrics Query

**Story:** 2.2 - CloudWatch Data Source Configuration
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 15 minutes

#### Test Objective
Verify that Grafana CloudWatch data source can query existing application metrics without impacting metric collection or triggering unexpected AWS API costs.

#### Pre-Conditions
- [ ] Story 2.2 completed
- [ ] CloudWatch data source configured in Grafana
- [ ] Existing Lambda functions generating metrics

#### Test Steps

**Step 1: Verify CloudWatch Metrics Collection Unchanged**
1. Navigate to CloudWatch Console → Metrics
2. View existing Lambda function metrics (Invocations, Duration, Errors)
3. Compare metric data points before/after Grafana integration
4. Verify no gaps in metric timeline

**Expected Result:**
- ✅ All Lambda metrics visible in CloudWatch console
- ✅ No gaps in metric data (continuous timeline)
- ✅ Metric values match expected application behavior

**Manual Test:**
- CloudWatch Console → All metrics → AWS/Lambda
- Select metric: Invocations for function: __________
- Time range: Last 24 hours
- Data continuity: ☐ Continuous ☐ Gaps found

**Step 2: Execute Test Query in Grafana**
1. Log in to Grafana workspace
2. Navigate to Explore tab
3. Select data source: CloudWatch-Primary
4. Execute query:
   - Namespace: AWS/Lambda
   - Metric: Invocations
   - Statistic: Sum
   - Period: 1 minute
   - Time range: Last 1 hour

**Expected Result:**
- ✅ Query executes without errors
- ✅ Data displayed in graph
- ✅ Data matches CloudWatch console values

**Manual Test:**
- Query executed: ☐ YES ☐ NO
- Data displayed: ☐ YES ☐ NO
- Errors encountered: ☐ NO ☐ YES (describe: __________)

**Step 3: Verify Existing CloudWatch Alarms**
1. List all CloudWatch alarms
2. Trigger test alarm (set low threshold temporarily)
3. Verify alarm triggers and sends notification
4. Restore original alarm threshold

**Expected Result:**
- ✅ All alarms present and in correct state
- ✅ Test alarm triggers successfully
- ✅ Notification received

**AWS CLI Test:**
```bash
# List all alarms
aws cloudwatch describe-alarms

# Verify alarm count unchanged
```

**Actual Result:** __________
**Alarm count before:** _____
**Alarm count after:** _____
**Match:** ☐ YES ☐ NO

**Step 4: Monitor CloudWatch API Usage**
1. Navigate to CloudWatch Console → Usage
2. Check API request count for GetMetricStatistics, GetMetricData
3. Estimate daily API calls from Grafana
4. Verify within free tier (1 million requests/month)

**Expected Result:**
- ✅ API usage within free tier limits
- ✅ No unexpected charges in first 24 hours
- ✅ Estimated monthly API calls < 1 million

**Manual Test:**
- CloudWatch API requests (last 24h): _____ requests
- Estimated monthly (x30): _____ requests
- Within free tier (1M): ☐ YES ☐ NO

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

## Phase 3: Application Instrumentation

### TS-3.1: Lambda EMF Performance Impact

**Story:** 3.1 - Lambda CloudWatch EMF Instrumentation
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 30 minutes

#### Test Objective
Verify that CloudWatch EMF instrumentation adds <50ms overhead to Lambda execution and does not break existing Lambda functionality or error handling.

#### Pre-Conditions
- [ ] Story 3.1 completed
- [ ] Lambda functions instrumented with EMF
- [ ] Baseline performance metrics captured before instrumentation

#### Test Steps

**Step 1: Measure Lambda Execution Duration (Before vs After)**
1. Collect Lambda Duration metric for past 7 days (before instrumentation)
2. Calculate baseline: Average, p50, p95, p99
3. After deployment, collect Duration metric for 24 hours
4. Calculate new metrics and compare to baseline

**Expected Result:**
- ✅ Average duration increase: <50ms
- ✅ p95 duration increase: <50ms
- ✅ p99 duration increase: <100ms (allow some variance)

**CloudWatch Metrics Test:**

**Baseline Metrics (Before EMF):**
| Metric | Value | Date Captured |
|--------|-------|---------------|
| Avg Duration | _____ ms | __________ |
| p50 Duration | _____ ms | __________ |
| p95 Duration | _____ ms | __________ |
| p99 Duration | _____ ms | __________ |

**Current Metrics (After EMF):**
| Metric | Value | Date Captured | Δ (Increase) |
|--------|-------|---------------|--------------|
| Avg Duration | _____ ms | __________ | _____ ms |
| p50 Duration | _____ ms | __________ | _____ ms |
| p95 Duration | _____ ms | __________ | _____ ms |
| p99 Duration | _____ ms | __________ | _____ ms |

**Pass Criteria:**
- Avg Δ < 50ms: ☐ PASS ☐ FAIL
- p95 Δ < 50ms: ☐ PASS ☐ FAIL
- p99 Δ < 100ms: ☐ PASS ☐ FAIL

**AWS CLI Test:**
```bash
# Get average duration for last 24 hours
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average,Minimum,Maximum \
  --unit Milliseconds
```

**Step 2: Verify Existing Lambda Test Suite Passes**
1. Run full Lambda test suite
2. Verify all tests pass without modification
3. Check for any test failures related to metrics or logging

**Expected Result:**
- ✅ All tests pass (same count as before)
- ✅ No test code modifications required
- ✅ No new test failures introduced

**Test Command:**
```bash
cd apps/api/lego-api-serverless
pnpm test

# Expected: All tests pass
```

**Test Summary:**
- Total tests: _____
- Passed: _____
- Failed: _____
- Status: ☐ PASS (all tests) ☐ FAIL (some failures)

**Step 3: Verify Error Handling Unchanged**
1. Trigger Lambda error scenario (pass invalid input or simulate database error)
2. Verify error is thrown correctly
3. Check that error metric is published to CloudWatch
4. Verify application error handling behavior unchanged

**Expected Result:**
- ✅ Lambda throws error as expected
- ✅ Error metric appears in CloudWatch: `UserMetrics/Lambda/Errors`
- ✅ Existing error handling (API Gateway error response, retries, etc.) unchanged

**Manual Test:**
```bash
# Invoke Lambda with invalid payload to trigger error
aws lambda invoke \
  --function-name <function-name> \
  --payload '{"invalid": "data"}' \
  response.json

# Check response for error
cat response.json

# Verify error metric in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace UserMetrics/Lambda/<stage> \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Actual Result:**
- Error thrown: ☐ YES ☐ NO
- Error metric published: ☐ YES ☐ NO
- Error handling behavior: ☐ Unchanged ☐ Changed

**Step 4: Verify Custom Metrics Published**
1. Invoke Lambda function successfully
2. Wait 1-2 minutes for metric ingestion
3. Query CloudWatch for custom metrics:
   - `UserMetrics/Lambda/Invocations`
   - `UserMetrics/Lambda/ExecutionDuration`
   - `UserMetrics/Lambda/ColdStart` (if cold start occurred)

**Expected Result:**
- ✅ All custom metrics appear in CloudWatch
- ✅ Metric values are accurate (match Lambda executions)
- ✅ Dimensions include `FunctionName` and `Environment`

**AWS CLI Test:**
```bash
# List custom metrics in UserMetrics namespace
aws cloudwatch list-metrics \
  --namespace UserMetrics/Lambda/<stage>

# Get Invocations metric
aws cloudwatch get-metric-statistics \
  --namespace UserMetrics/Lambda/<stage> \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=<function-name> \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 600 \
  --statistics Sum
```

**Actual Result:**
- Invocations metric exists: ☐ YES ☐ NO
- ExecutionDuration metric exists: ☐ YES ☐ NO
- ColdStart metric exists: ☐ YES ☐ NO
- Metric values accurate: ☐ YES ☐ NO

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

### TS-3.5: Overall Performance Regression

**Story:** 3.5 - Performance Validation and Optimization
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 45 minutes

#### Test Objective
Comprehensive validation that all instrumentation (EMF, structured logging, Web Vitals, error reporting) combined meets performance requirements: <50ms Lambda overhead, <50ms frontend overhead, no degradation of existing functionality.

#### Pre-Conditions
- [ ] Stories 3.1, 3.2, 3.3, 3.4 completed
- [ ] All instrumentation deployed to production or staging
- [ ] Baseline performance metrics available

#### Test Steps

**Step 1: Lambda Performance Regression**
1. Run load test on instrumented Lambda functions
2. Measure Duration, cold starts, error rate
3. Compare to baseline (pre-instrumentation)

**Expected Result:**
- ✅ Average duration increase: <50ms
- ✅ Cold start duration increase: <100ms
- ✅ Error rate unchanged
- ✅ Throughput (requests/sec) unchanged

**Load Test Configuration:**
- Tool: `artillery` or `k6`
- Duration: 5 minutes
- RPS: 10 requests/second
- Target: API Gateway endpoint → Lambda

**Baseline Performance:**
| Metric | Baseline | Current | Δ | Pass? |
|--------|----------|---------|---|-------|
| Avg Duration | _____ ms | _____ ms | _____ ms | ☐ |
| p95 Duration | _____ ms | _____ ms | _____ ms | ☐ |
| Cold Start | _____ ms | _____ ms | _____ ms | ☐ |
| Error Rate | _____ % | _____ % | _____ % | ☐ |

**Step 2: Frontend Bundle Size Analysis**
1. Build frontend application
2. Analyze bundle size with webpack-bundle-analyzer or Vite's rollup-plugin-visualizer
3. Compare total bundle size before/after tracking scripts

**Expected Result:**
- ✅ Bundle size increase: <50KB (gzipped)
- ✅ Tracking scripts loaded asynchronously (not in main bundle)
- ✅ No impact on critical rendering path

**Bundle Analysis:**
```bash
cd apps/web
pnpm build
# Analyze build output

# Check bundle sizes
ls -lh dist/assets/*.js
```

**Bundle Size:**
| Asset | Size (Before) | Size (After) | Δ |
|-------|---------------|--------------|---|
| Main bundle | _____ KB | _____ KB | _____ KB |
| Vendor bundle | _____ KB | _____ KB | _____ KB |
| Total (gzipped) | _____ KB | _____ KB | _____ KB |

**Pass Criteria:** Total Δ < 50KB: ☐ PASS ☐ FAIL

**Step 3: Frontend Web Vitals Validation**
1. Run Lighthouse audit on production frontend
2. Capture Core Web Vitals: LCP, FID, CLS, TTFB
3. Compare to baseline (before tracking scripts)

**Expected Result:**
- ✅ LCP increase: <50ms
- ✅ FID unchanged (tracking scripts async)
- ✅ CLS unchanged (no layout shift)
- ✅ Overall Performance Score: >90 (or within 5 points of baseline)

**Lighthouse Test:**
```bash
# Run Lighthouse CI
npx lighthouse https://your-frontend-url.com \
  --output html \
  --output-path ./lighthouse-report.html \
  --chrome-flags="--headless"
```

**Web Vitals Scores:**
| Metric | Baseline | Current | Δ | Pass? |
|--------|----------|---------|---|-------|
| LCP | _____ ms | _____ ms | _____ ms | ☐ |
| FID | _____ ms | _____ ms | _____ ms | ☐ |
| CLS | _____ | _____ | _____ | ☐ |
| TTFB | _____ ms | _____ ms | _____ ms | ☐ |
| Performance Score | _____ | _____ | _____ | ☐ |

**Step 4: Run Full Application Regression Test Suite**
1. Execute all existing application tests (unit, integration, E2E)
2. Verify 100% pass rate
3. Check for any performance-related test failures

**Expected Result:**
- ✅ All tests pass
- ✅ No new test failures
- ✅ Test execution time unchanged

**Test Command:**
```bash
# Backend tests
cd apps/api/lego-api-serverless
pnpm test

# Frontend tests (if applicable)
cd apps/web
pnpm test

# E2E tests (if applicable)
pnpm test:e2e
```

**Test Summary:**
- Backend tests: _____ / _____ passed
- Frontend tests: _____ / _____ passed
- E2E tests: _____ / _____ passed
- Overall: ☐ PASS ☐ FAIL

**Step 5: Validate Application Functionality (Manual)**
1. Log in to application as user
2. Execute critical user flows:
   - User registration/login
   - Primary feature usage (e.g., create item, view dashboard)
   - Data submission forms
   - Navigation between pages
3. Verify no visible errors or performance degradation

**Expected Result:**
- ✅ All user flows complete successfully
- ✅ No visible errors in browser console
- ✅ No noticeable performance degradation
- ✅ Application feels responsive (subjective)

**Manual Test Checklist:**
- [ ] User login successful
- [ ] Dashboard loads within 2 seconds
- [ ] Primary feature functional
- [ ] Form submission works
- [ ] Page navigation smooth
- [ ] No JavaScript errors in console
- [ ] No 404 or 500 errors

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

## Phase 4: Self-Hosted Analytics

### TS-4.4: PII Masking Validation

**Story:** 4.4 - PII Masking Configuration and Validation
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL (Privacy/Security)
**Execution Time:** 30 minutes

#### Test Objective
Comprehensive validation that all PII (email, names, passwords, SSN, payment info) is properly masked in OpenReplay session recordings and never captured or stored.

#### Pre-Conditions
- [ ] Story 4.4 completed
- [ ] OpenReplay PII masking rules configured
- [ ] Test forms created with PII fields

#### Test Steps

**Step 1: Create Test Session with PII Data**
1. Open application in browser with OpenReplay tracking active
2. Fill out test form with fake PII data:
   - Name: "John Doe"
   - Email: "john.doe@example.com"
   - Password: "SecurePassword123!"
   - SSN: "123-45-6789"
   - Credit Card: "4532-1234-5678-9010"
3. Submit form
4. Navigate to OpenReplay admin UI
5. Find and play back test session

**Expected Result:**
- ✅ Session recording exists
- ✅ All PII fields show masked values (e.g., "***@***.com", "***-**-****")
- ✅ Non-PII fields visible normally

**PII Masking Validation:**
| Field Type | Test Value | Expected Display | Actual Display | Pass? |
|------------|------------|------------------|----------------|-------|
| Name | "John Doe" | "*** ***" | __________ | ☐ |
| Email | "john.doe@example.com" | "***@***.com" | __________ | ☐ |
| Password | "SecurePassword123!" | "***" or hidden | __________ | ☐ |
| SSN | "123-45-6789" | "***-**-****" | __________ | ☐ |
| Credit Card | "4532-1234-5678-9010" | "****-****-****-9010" | __________ | ☐ |
| Phone | "555-123-4567" | "***-***-****" | __________ | ☐ |

**Step 2: Test CSS Selector Masking**
1. Verify PII masking rules include CSS selectors:
   - `input[type="password"]`
   - `input[type="email"]`
   - `.email-field`
   - `.ssn-field`
   - `.credit-card-field`
2. Create test page with various input field naming patterns
3. Record session and verify all patterns are masked

**Expected Result:**
- ✅ All input fields matching CSS selectors are masked
- ✅ Custom class names (.email-field, etc.) are masked
- ✅ Generic password inputs are masked

**CSS Selector Test:**
| Selector Pattern | HTML Example | Masked? |
|-----------------|--------------|---------|
| `input[type="password"]` | `<input type="password" />` | ☐ |
| `input[type="email"]` | `<input type="email" />` | ☐ |
| `.email-field` | `<input class="email-field" />` | ☐ |
| `input[name="ssn"]` | `<input name="ssn" />` | ☐ |
| `input[name*="credit"]` | `<input name="creditCard" />` | ☐ |

**Step 3: Test Regex Pattern Masking**
1. Verify PII masking rules include regex patterns for:
   - Email: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/`
   - SSN: `/\b\d{3}-\d{2}-\d{4}\b/`
   - Credit Card: `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/`
2. Add text with PII patterns to test page (e.g., in `<p>` tags or `<div>`)
3. Record session and verify text PII is masked

**Expected Result:**
- ✅ Email addresses in text are masked
- ✅ SSN patterns in text are masked
- ✅ Credit card numbers in text are masked

**Regex Pattern Test:**
| Pattern Type | Test Text | Expected | Actual | Pass? |
|--------------|-----------|----------|--------|-------|
| Email in text | "Contact: john@example.com" | "Contact: ***@***.com" | __________ | ☐ |
| SSN in text | "SSN: 123-45-6789" | "SSN: ***-**-****" | __________ | ☐ |
| Credit Card | "Card: 4532 1234 5678 9010" | "Card: **** **** **** 9010" | __________ | ☐ |

**Step 4: Verify Non-PII Data Visible**
1. Fill out form with non-sensitive data:
   - Username: "testuser123"
   - Product selection: "Widget A"
   - Quantity: "5"
   - Comments: "This is a test comment"
2. Record session
3. Verify all non-PII data is visible and not masked

**Expected Result:**
- ✅ Username visible in recording
- ✅ Product selections visible
- ✅ Quantity visible
- ✅ Comments visible
- ✅ Navigation actions visible
- ✅ Button clicks visible

**Non-PII Visibility Test:**
| Field Type | Test Value | Visible? | Notes |
|------------|------------|----------|-------|
| Username | "testuser123" | ☐ | Should be visible |
| Product | "Widget A" | ☐ | Should be visible |
| Quantity | "5" | ☐ | Should be visible |
| Comments | "Test comment" | ☐ | Should be visible |

**Step 5: Manual Audit of 10+ Sessions**
1. Record 10 different user session scenarios
2. Review each session in OpenReplay admin UI
3. Document any PII leaks or masking failures

**Expected Result:**
- ✅ 0 PII leaks found in 10 sessions
- ✅ All sensitive fields consistently masked
- ✅ Sessions remain useful for debugging (non-PII context preserved)

**Session Audit Log:**
| Session # | Scenario | PII Leaks Found? | Notes |
|-----------|----------|------------------|-------|
| 1 | User registration | ☐ YES ☐ NO | __________ |
| 2 | Login | ☐ YES ☐ NO | __________ |
| 3 | Profile edit | ☐ YES ☐ NO | __________ |
| 4 | Payment form | ☐ YES ☐ NO | __________ |
| 5 | Contact form | ☐ YES ☐ NO | __________ |
| 6 | Search functionality | ☐ YES ☐ NO | __________ |
| 7 | Item creation | ☐ YES ☐ NO | __________ |
| 8 | Dashboard view | ☐ YES ☐ NO | __________ |
| 9 | Settings page | ☐ YES ☐ NO | __________ |
| 10 | Logout | ☐ YES ☐ NO | __________ |

**PII Leaks Found:** _____ / 10 sessions

**Test Result:** ☐ PASS (0 leaks) ☐ FAIL (>0 leaks)
**Tester:** __________
**Date:** __________
**Notes:** __________

---

### TS-4.5: Complete System Integration

**Story:** 4.5 - End-to-End Testing and Documentation
**Integration Verification:** IV1, IV2, IV3
**Priority:** CRITICAL
**Execution Time:** 60 minutes

#### Test Objective
Comprehensive end-to-end validation that data flows correctly through the entire observability stack: Frontend → OpenReplay/Umami → CloudWatch/Logs → Grafana dashboards, with all performance and budget requirements met.

#### Pre-Conditions
- [ ] All 17 previous stories completed
- [ ] All observability infrastructure deployed
- [ ] Baseline metrics established

#### Test Steps

**Step 1: End-to-End Data Flow Validation**

**Test Flow: User Action → All Observability Systems**

1. **Execute User Action:** Log in to application, navigate to dashboard, perform key action
2. **Verify OpenReplay:** Session recorded and playable
3. **Verify Umami:** Page view tracked in analytics
4. **Verify CloudWatch EMF:** Lambda metrics published
5. **Verify CloudWatch Logs:** Structured logs appear
6. **Verify OpenSearch:** Logs searchable
7. **Verify Grafana:** All dashboards display data

**Expected Result:**
- ✅ OpenReplay: Session appears within 30 seconds
- ✅ Umami: Page view appears within 1 minute
- ✅ CloudWatch EMF: Metrics appear within 2 minutes
- ✅ CloudWatch Logs: Logs appear within 1 minute
- ✅ OpenSearch: Logs searchable within 5 minutes
- ✅ Grafana: All data sources show metrics/logs

**Data Flow Checklist:**
- [ ] OpenReplay session ID: __________
- [ ] Umami page view timestamp: __________
- [ ] CloudWatch EMF metric timestamp: __________
- [ ] CloudWatch Logs log stream: __________
- [ ] OpenSearch document indexed: ☐ YES ☐ NO
- [ ] Grafana Lambda dashboard shows invocation: ☐ YES ☐ NO
- [ ] Grafana logs dashboard shows log entry: ☐ YES ☐ NO

**Step 2: Re-Validate All Integration Verification Criteria**

Execute summary validation of all IV criteria from stories:

**Phase 1:**
- [ ] IV-1.1: Existing VPC resources unaffected ✓
- [ ] IV-1.2: Aurora schema isolated correctly ✓
- [ ] IV-1.3: S3 buckets properly secured ✓
- [ ] IV-1.4: Cost tracking functional ✓

**Phase 2:**
- [ ] IV-2.1: Grafana authentication working ✓
- [ ] IV-2.2: CloudWatch metrics collection unaffected ✓
- [ ] IV-2.3: Dashboards display accurate data ✓
- [ ] IV-2.4: OpenSearch log ingestion working ✓

**Phase 3:**
- [ ] IV-3.1: Lambda EMF overhead <50ms ✓
- [ ] IV-3.2: Structured logging migration complete ✓
- [ ] IV-3.3: Web Vitals measurement accurate ✓
- [ ] IV-3.4: Error reporting end-to-end ✓
- [ ] IV-3.5: Performance benchmarks met ✓

**Phase 4:**
- [ ] IV-4.1: Umami ECS service healthy ✓
- [ ] IV-4.2: OpenReplay ECS service healthy ✓
- [ ] IV-4.3: Frontend tracking scripts loaded ✓
- [ ] IV-4.4: PII masking validated ✓

**Summary:** _____ / 18 IV criteria passed

**Step 3: Performance Requirements Validation**

**Requirement NFR2:** <50ms overhead for tracking scripts

- Frontend page load overhead: _____ ms (Target: <50ms)
- Lambda execution overhead: _____ ms (Target: <50ms)
- Overall performance: ☐ PASS ☐ FAIL

**Requirement NFR3:** 100% session capture

- Test session captured in OpenReplay: ☐ YES ☐ NO
- Test page view captured in Umami: ☐ YES ☐ NO
- Capture rate: ☐ PASS ☐ FAIL

**Requirement NFR7:** 99%+ uptime for observability tools

- Umami ECS service status: ☐ Healthy ☐ Unhealthy
- OpenReplay ECS service status: ☐ Healthy ☐ Unhealthy
- Grafana workspace status: ☐ Active ☐ Inactive

**Step 4: Budget Requirements Validation**

**Requirement NFR1:** $100-150/month budget

1. Navigate to AWS Cost Explorer
2. Filter by tag: `Project=UserMetrics`
3. View current month-to-date costs
4. Project monthly cost based on usage

**Current Month Costs:**
| Service | Month-to-Date | Projected Monthly | Budget |
|---------|---------------|-------------------|--------|
| ECS/Fargate | $_____ | $_____ | $40-60 |
| Aurora (Umami) | $_____ | $_____ | $15-25 |
| S3 (Sessions) | $_____ | $_____ | $5-15 |
| CloudWatch | $_____ | $_____ | $10-20 |
| Grafana | $_____ | $_____ | $9 |
| NAT Gateway | $_____ | $_____ | $35-45 |
| Other | $_____ | $_____ | $5 |
| **Total** | **$_____** | **$_____** | **$100-150** |

**Budget Status:** ☐ PASS (within budget) ☐ FAIL (over budget)

**If over budget, identify optimization opportunities:** __________

**Step 5: Application Regression - Complete Test Suite**

1. Run full application test suite (all tests from all phases)
2. Execute critical user flow manual tests
3. Verify application works identically to pre-instrumentation state

**Automated Test Results:**
- Backend unit tests: _____ / _____ passed
- Frontend unit tests: _____ / _____ passed
- Integration tests: _____ / _____ passed
- E2E tests: _____ / _____ passed
- **Total:** _____ / _____ tests passed

**Manual User Flow Tests:**
- [ ] User registration/login
- [ ] Dashboard navigation
- [ ] Primary feature usage
- [ ] Form submissions
- [ ] Search functionality
- [ ] Settings/profile management
- [ ] Logout

**Application Functionality:** ☐ Identical to baseline ☐ Regressions found

**Test Result:** ☐ PASS ☐ FAIL
**Tester:** __________
**Date:** __________
**Notes:** __________

---

## Test Execution Summary

### Overall Test Results

| Phase | Stories | Tests Executed | Tests Passed | Pass Rate |
|-------|---------|----------------|--------------|-----------|
| Phase 1 | 4 | _____ | _____ | _____ % |
| Phase 2 | 4 | _____ | _____ | _____ % |
| Phase 3 | 5 | _____ | _____ | _____ % |
| Phase 4 | 5 | _____ | _____ | _____ % |
| **Total** | **18** | **_____** | **_____** | **_____ %** |

### Critical Requirements Validation

| Requirement | Target | Actual | Status |
|-------------|--------|--------|--------|
| NFR1: Budget | $100-150/month | $_____ | ☐ PASS ☐ FAIL |
| NFR2: Overhead | <50ms | _____ ms | ☐ PASS ☐ FAIL |
| NFR3: Capture Rate | 100% | _____ % | ☐ PASS ☐ FAIL |
| NFR7: Uptime | 99%+ | _____ % | ☐ PASS ☐ FAIL |
| NFR9: Compatibility | No breaking changes | _____ issues | ☐ PASS ☐ FAIL |

### Test Failures and Issues

| Test ID | Description | Severity | Status | Resolution |
|---------|-------------|----------|--------|------------|
| | | | | |
| | | | | |

### Sign-Off

**Product Owner Approval:**
- Name: __________
- Signature: __________
- Date: __________

**Technical Lead Approval:**
- Name: __________
- Signature: __________
- Date: __________

**Production Readiness:** ☐ APPROVED ☐ CONDITIONAL ☐ NOT READY

**Conditions (if any):** __________

---

**Version:** 1.0
**Created:** 2025-11-23
**Maintained By:** Sarah (Product Owner)
