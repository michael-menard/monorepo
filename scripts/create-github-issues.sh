#!/bin/bash

# Script to create GitHub issues for all stories in docs/stories (not in complete/)
# Usage: ./scripts/create-github-issues.sh

set -e

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run:"
    echo "   gh auth login"
    exit 1
fi

echo "🚀 Creating GitHub issues for incomplete stories..."

# Story 4.4: Upload Avatar
gh issue create \
  --title "Story 4.4: Implement POST /api/users/:id/avatar - Upload Avatar" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** user,
**I want** to upload a profile avatar,
**so that** I can personalize my account.

## Acceptance Criteria

1. Lambda handler for avatar upload with multipart parsing
2. Image validation: JPEG/PNG/GIF, max 2MB size
3. Sharp processing: crop to square (1:1 aspect ratio), resize to 256x256, optimize, convert to WebP
4. Upload to S3: \`avatars/{userId}/avatar.webp\` (overwrites previous)
5. Cognito user attribute \`picture\` updated with S3 URL via \`AdminUpdateUserAttributesCommand\`
6. Previous avatar deleted from S3 if exists
7. Lambda memory 1024 MB for Sharp processing
8. Redis cache invalidated for user profile
9. Response: \`{ success: true, data: { avatarUrl } }\`
10. 403 if userId mismatch, 400 for invalid image

## Implementation Notes

- See full details in: \`docs/stories/4.4-upload-avatar.md\`
- Memory: 1024 MB
- Timeout: 60 seconds

## Dependencies

- Story 4.1: Profile Lambda handler infrastructure
- @monorepo/file-validator
- Sharp library for image processing" \
  --label "epic:4-user-profile" \
  --label "type:feature" \
  --label "priority:medium"

# Story 4.5: Remove Avatar
gh issue create \
  --title "Story 4.5: Implement DELETE /api/users/:id/avatar - Remove Avatar" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** user,
**I want** to remove my profile avatar,
**so that** I can revert to a default image.

## Acceptance Criteria

1. Lambda handler deletes avatar from S3: \`avatars/{userId}/avatar.webp\`
2. Cognito user attribute \`picture\` set to null via \`AdminUpdateUserAttributesCommand\`
3. Authorization: userId match enforced
4. Redis cache invalidated
5. Response: \`{ success: true, message: \"Avatar removed\" }\`
6. 403 if userId mismatch
7. Success returned even if no avatar exists (idempotent)

## Implementation Notes

- See full details in: \`docs/stories/4.5-remove-avatar.md\`
- Idempotent operation (REST best practice)

## Dependencies

- Story 4.1: Profile Lambda handler infrastructure" \
  --label "epic:4-user-profile" \
  --label "type:feature" \
  --label "priority:low"

# Story 4.5.5: WebSocket Server
gh issue create \
  --title "Story 4.5.5: Implement WebSocket Server for Real-Time Updates" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** user,
**I want** to receive real-time progress updates for file uploads and notifications,
**so that** I can see the status of long-running operations without polling.

## Acceptance Criteria

1. AWS API Gateway WebSocket API configured in SST
2. Lambda handlers created for \`\$connect\`, \`\$disconnect\`, \`\$default\` routes
3. DynamoDB table \`websocket_connections\` stores \`connectionId\`, \`userId\`, \`connectedAt\`
4. JWT authentication enforced on \`\$connect\` (extract userId from token)
5. Connection cleanup on \`\$disconnect\` (remove from DynamoDB)
6. Broadcast helper function \`broadcastToUser(userId, message)\` for publishing messages
7. Broadcast helper function \`broadcastToConnection(connectionId, message)\` for direct messaging
8. Support for message types: \`upload_progress\`, \`notification\`, \`error\`
9. WebSocket URL exposed in SST outputs for frontend consumption
10. Lambda timeout: 30 seconds for WebSocket handlers
11. Lambda memory: 256 MB for WebSocket handlers
12. Error handling for invalid JWT, connection failures, DynamoDB errors

## Implementation Notes

- See full details in: \`docs/stories/4.5.5-websocket-server-setup.md\`
- JWT passed in query parameters (WebSocket limitation)
- DynamoDB for connection tracking (serverless-native)
- 2-hour connection TTL

## Dependencies

- JWT verification library
- DynamoDB for connection storage" \
  --label "epic:4-user-profile" \
  --label "type:feature" \
  --label "priority:high"

# Story 4.6: CSV Parts List Parser
gh issue create \
  --title "Story 4.6: Implement CSV Parts List Parser Lambda" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** user,
**I want** to upload a CSV parts list for a MOC,
**so that** the system can parse and store part details automatically.

## Acceptance Criteria

1. Lambda function created at \`src/functions/parse-parts-list.ts\` for \`POST /api/mocs/{id}/upload-parts-list\`
2. CSV file uploaded to S3 first, Lambda triggered via S3 event or invoked directly with S3 key
3. CSV parsing using \`csv-parser\` library (existing dependency)
4. Expected CSV format: columns for \`Part ID\`, \`Part Name\`, \`Quantity\`, \`Color\`
5. Validation: file must be valid CSV, max 10,000 rows
6. Parsed data stored in \`mocPartsLists\` table with fields populated from CSV
7. Parts count aggregated and MOC's \`totalPieceCount\` updated
8. Lambda timeout: 5 minutes (for large CSV files)
9. Lambda memory: 512 MB
10. Response: \`{ success: true, data: { totalParts, partsListId } }\`
11. Error handling for malformed CSV, invalid data, database errors

## Implementation Notes

- See full details in: \`docs/stories/4.6-csv-parts-list-parser.md\`
- S3 first, then parse (durable storage)
- Batch insert in chunks of 1000 rows
- Transaction for atomicity

## Dependencies

- Story 2.1: MOC Instructions Lambda
- csv-parser NPM package" \
  --label "epic:4-user-profile" \
  --label "type:feature" \
  --label "priority:medium"

# Story 4.7: Multi-File Upload
gh issue create \
  --title "Story 4.7: Implement Multi-File Upload for MOCs" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** user,
**I want** to upload multiple instruction files at once,
**so that** I can efficiently add complete documentation sets.

## Acceptance Criteria

1. Lambda handler enhanced to support multiple files in \`POST /api/mocs/{id}/files\`
2. Multipart parsing accepts up to 10 files per request
3. Each file validated independently (type, size per \`@monorepo/file-validator\`)
4. Files uploaded to S3 in parallel using \`Promise.all()\`
5. Database records inserted in batch transaction to \`mocFiles\` table
6. Partial success handling: if some uploads fail, successful ones are recorded, errors returned for failed ones
7. Lambda timeout: 120 seconds, memory: 2048 MB
8. Response: \`{ success: true, data: { uploaded: [...], failed: [...] } }\`
9. Error details include file name and reason for failure
10. Total payload size limited to 50 MB

## Implementation Notes

- See full details in: \`docs/stories/4.7-multi-file-upload-mocs.md\`
- Parallel upload (10x speedup)
- Partial success model (better UX)

## Dependencies

- Story 2.1: MOC Instructions Lambda
- Story 2.7: MOC File Upload (extends this handler)
- @monorepo/file-validator" \
  --label "epic:4-user-profile" \
  --label "type:feature" \
  --label "priority:medium"

# Story 4.8: Advanced Error Handling
gh issue create \
  --title "Story 4.8: Implement Advanced Error Handling and Retry Logic" \
  --body "**Epic**: 4 - User Profile & Advanced Features Migration

**As a** backend developer,
**I want** robust error handling with automatic retries for transient failures,
**so that** users experience reliable service even during AWS service hiccups.

## Acceptance Criteria

1. All Lambda functions implement structured error handling with custom error classes
2. Transient errors (network timeouts, throttling) trigger exponential backoff retry (max 3 attempts)
3. Non-retryable errors (validation, authorization) fail immediately with clear messages
4. Database connection errors trigger retry with jitter
5. S3 upload failures logged with presigned URL fallback notification to user
6. OpenSearch indexing failures logged but do not block main operation (eventual consistency acceptable)
7. All errors logged to CloudWatch with structured JSON format including: \`errorType\`, \`errorMessage\`, \`requestId\`, \`userId\`
8. Error responses never expose internal implementation details (sanitized messages)
9. AWS X-Ray tracing enabled to track error propagation across services
10. CloudWatch metric alarms configured for error rate thresholds (>5% error rate triggers alert)

## Implementation Notes

- See full details in: \`docs/stories/4.8-advanced-error-handling-retry-logic.md\`
- Exponential backoff with jitter
- Max 3 retry attempts
- Custom error classes

## Dependencies

- All Lambda functions from Stories 1.1, 2.1, 3.1-3.5, 4.1" \
  --label "epic:4-user-profile" \
  --label "type:infrastructure" \
  --label "priority:high"

# Story 5.1: CloudWatch Dashboards
gh issue create \
  --title "Story 5.1: Create CloudWatch Dashboards for SST Services" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** CloudWatch dashboards for all SST Lambda functions,
**so that** I can monitor performance and health in real-time.

## Acceptance Criteria

1. Dashboard created with widgets for each Lambda function (MOC, Gallery, Wishlist, Profile)
2. Metrics displayed: invocation count, duration (p50, p95, p99), error rate, throttles
3. API Gateway metrics: request count, 4xx/5xx errors, latency (p50, p95, p99)
4. Database metrics: RDS connections, CPU, memory, IOPS
5. Redis metrics: cache hit rate, evictions, connections
6. OpenSearch metrics: cluster health, indexing rate, search latency
7. Dashboard deployed via CDK in \`infra/monitoring/dashboards.ts\`
8. Auto-refresh enabled (1 minute interval)
9. Time range selector: Last 1h, 3h, 6h, 12h, 24h, 7d
10. All metrics use CloudWatch Metrics Insights queries for efficiency

## Implementation Notes

- See full details in: \`docs/stories/5.1-cloudwatch-dashboards.md\`
- Organized by service layer (Lambda, API Gateway, Database, Cache, Search)
- Math expressions for derived metrics (error rate, cache hit rate)

## Dependencies

- AWS CloudWatch
- AWS CDK
- All Lambda functions from Epics 1-4" \
  --label "epic:5-deployment" \
  --label "type:monitoring" \
  --label "priority:high"

# Story 5.2: CloudWatch Alarms
gh issue create \
  --title "Story 5.2: Configure CloudWatch Alarms and SNS Notifications" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** CloudWatch alarms with SNS notifications for critical issues,
**so that** the team is alerted immediately when problems occur.

## Acceptance Criteria

1. SNS topic created for production alerts with email subscription
2. Alarms configured for Lambda errors (threshold: >10 errors in 5 minutes)
3. Alarms configured for Lambda throttles (threshold: >5 throttles in 5 minutes)
4. Alarms configured for API Gateway 5xx errors (threshold: >5% error rate)
5. Alarms configured for RDS CPU (threshold: >80% for 10 minutes)
6. Alarms configured for RDS connections (threshold: >80% of max)
7. Alarms configured for Redis evictions (threshold: >100 in 5 minutes)
8. Alarms configured for OpenSearch cluster health (red status)
9. All alarms deployed via CDK in \`infra/monitoring/alarms.ts\`
10. Alarm actions trigger SNS notifications
11. Alarms include both email and Slack notifications (SNS → Lambda → Slack webhook)

## Implementation Notes

- See full details in: \`docs/stories/5.2-cloudwatch-alarms-sns.md\`
- Conservative thresholds balance sensitivity with false positives
- SNS + Lambda → Slack for custom formatting

## Dependencies

- AWS CloudWatch
- AWS SNS
- Story 5.1: CloudWatch Dashboards" \
  --label "epic:5-deployment" \
  --label "type:monitoring" \
  --label "priority:high"

# Story 5.3: AWS X-Ray Tracing
gh issue create \
  --title "Story 5.3: Implement AWS X-Ray Distributed Tracing" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** AWS X-Ray tracing enabled for all Lambda functions,
**so that** I can debug performance issues and trace requests across services.

## Acceptance Criteria

1. X-Ray SDK integrated into all Lambda functions (MOC, Gallery, Wishlist, Profile)
2. Tracing enabled in Lambda configuration (\`tracingConfig: Active\`)
3. Custom segments created for database queries, S3 operations, Redis calls, OpenSearch queries
4. Subsegments capture detailed timing for each operation
5. Metadata and annotations added for filtering (userId, mocId, imageId, etc.)
6. X-Ray service map displays all dependencies (Lambda → RDS, Redis, S3, OpenSearch)
7. Trace retention: 30 days
8. X-Ray sampling rule configured (10% of requests in production)
9. Integration with CloudWatch Logs for error correlation
10. X-Ray dashboard created showing trace analytics

## Implementation Notes

- See full details in: \`docs/stories/5.3-aws-xray-tracing.md\`
- 10% sampling rate (balances cost with visibility)
- Annotations for searchable fields, metadata for details

## Dependencies

- AWS X-Ray SDK
- All Lambda functions from Epics 1-4" \
  --label "epic:5-deployment" \
  --label "type:monitoring" \
  --label "priority:medium"

# Story 5.4: CI/CD Pipeline
gh issue create \
  --title "Story 5.4: Implement CI/CD Pipeline with GitHub Actions" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** a GitHub Actions CI/CD pipeline for automated deployments,
**so that** code changes are automatically tested and deployed to production.

## Acceptance Criteria

1. GitHub Actions workflow created at \`.github/workflows/deploy-production.yml\`
2. Pipeline stages: Lint → Test → Build → Deploy
3. Lint stage: ESLint, TypeScript type checking
4. Test stage: Vitest unit tests, integration tests
5. Build stage: SST build, Lambda packaging
6. Deploy stage: \`sst deploy --stage production\` with approval gate
7. Environment secrets stored in GitHub Secrets (AWS credentials, database URLs)
8. Deployment approval required for production (GitHub Environments)
9. Rollback capability via GitHub Actions manual trigger
10. Deployment notifications sent to Slack on success/failure
11. Pipeline runs on: push to \`main\` branch, manual trigger

## Implementation Notes

- See full details in: \`docs/stories/5.4-cicd-pipeline-github-actions.md\`
- Separate build and deploy jobs (faster rollback)
- Database migrations run after Lambda deployment

## Dependencies

- GitHub Actions
- GitHub Environments
- SST v3" \
  --label "epic:5-deployment" \
  --label "type:ci-cd" \
  --label "priority:high"

# Story 5.5: Blue/Green Deployment
gh issue create \
  --title "Story 5.5: Implement Blue/Green Deployment Strategy" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** Blue/Green deployment with traffic shifting,
**so that** deployments are zero-downtime and can be quickly rolled back.

## Acceptance Criteria

1. Route53 weighted routing policy configured for API domain
2. Blue environment: Current production Lambda aliases (\`production-blue\`)
3. Green environment: New deployment Lambda aliases (\`production-green\`)
4. Traffic shift: 0% → 10% → 50% → 100% over 30 minutes
5. Health checks configured to monitor green environment
6. Automatic rollback if health checks fail or error rate >5%
7. CloudWatch alarms trigger rollback on critical errors
8. Manual approval required before traffic shift to 100%
9. Database migrations run before traffic shift (idempotent)
10. Old environment (blue) retained for 24 hours for emergency rollback

## Implementation Notes

- See full details in: \`docs/stories/5.5-blue-green-deployment-strategy.md\`
- Route53 weighted routing (simpler than CodeDeploy)
- 24-hour blue environment retention (low cost, safety net)

## Dependencies

- AWS Route53
- AWS Lambda Aliases
- Story 5.2: CloudWatch Alarms
- Story 5.4: CI/CD Pipeline" \
  --label "epic:5-deployment" \
  --label "type:deployment" \
  --label "priority:high"

# Story 5.6: Performance Validation
gh issue create \
  --title "Story 5.6: Performance and Cost Validation Post-Migration" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** to validate performance and cost of SST deployment,
**so that** I can confirm the migration meets targets before decommissioning ECS.

## Acceptance Criteria

1. Performance benchmarks run comparing ECS vs SST (response time, throughput)
2. Load testing with 1000 concurrent users for 10 minutes
3. API response time p95 <500ms (same as ECS baseline)
4. API throughput >100 requests/second (same as ECS baseline)
5. Cost analysis: SST monthly cost ≤ ECS monthly cost
6. Cold start analysis: p99 cold start <2 seconds
7. Database connection pool validation (no connection exhaustion)
8. Redis cache hit rate >80% (same as ECS baseline)
9. S3 operation latency <200ms (same as ECS baseline)
10. OpenSearch query latency p95 <300ms (same as ECS baseline)
11. Validation report generated with pass/fail for each metric

## Implementation Notes

- See full details in: \`docs/stories/5.6-performance-cost-validation.md\`
- Artillery for load testing
- 7-day cost projection to monthly
- 2-second cold start threshold (acceptable for p99)

## Dependencies

- Artillery (load testing tool)
- AWS Cost Explorer
- Story 5.1: CloudWatch Dashboards" \
  --label "epic:5-deployment" \
  --label "type:validation" \
  --label "priority:critical"

# Story 5.7: Cost Monitoring
gh issue create \
  --title "Story 5.7: Configure AWS Cost Monitoring and Budgets" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** AWS Cost Monitoring and Budget alerts configured,
**so that** I can prevent unexpected cost overruns and optimize spending.

## Acceptance Criteria

1. AWS Budget created for monthly threshold: \$800
2. Budget alerts at 50%, 75%, 90%, and 100% of threshold
3. SNS topic for budget alerts with email subscription
4. Cost allocation tags applied to all SST resources (\`Project: lego-api\`, \`Environment: production\`)
5. Cost Explorer enabled with custom reports for Lambda, API Gateway, RDS, ElastiCache, OpenSearch, S3
6. Daily cost anomaly detection enabled
7. Slack notifications for budget alerts and cost anomalies
8. Cost optimization recommendations reviewed monthly
9. Reserved Instance analysis for RDS and ElastiCache
10. S3 lifecycle policies to reduce storage costs

## Implementation Notes

- See full details in: \`docs/stories/5.7-aws-cost-monitoring-budgets.md\`
- \$800 monthly budget (14% buffer over \$700 projection)
- Multi-threshold alerts (50%, 75%, 90%, 100%, forecasted)
- S3 lifecycle: Glacier after 90 days for gallery images

## Dependencies

- AWS Budgets
- AWS Cost Explorer
- AWS Cost Anomaly Detection" \
  --label "epic:5-deployment" \
  --label "type:cost-optimization" \
  --label "priority:high"

# Story 5.8: ECS Decommission
gh issue create \
  --title "Story 5.8: ECS Service Decommission Plan" \
  --body "**Epic**: 5 - Production Deployment, Monitoring & Cutover

**As a** DevOps engineer,
**I want** a safe decommission plan for the ECS service,
**so that** the legacy infrastructure can be removed without impacting production.

## Acceptance Criteria

1. Decommission checklist created with pre-requisite validation
2. Traffic verification: 100% traffic on SST (Route53 weighted routing at 0% ECS)
3. Performance validation: SST performance matches or exceeds ECS baseline for 7 days
4. Error rate validation: SST error rate ≤ ECS baseline for 7 days
5. Cost validation: SST cost ≤ ECS cost for 7 days
6. Database migration validation: All data migrated, no missing records
7. ECS service scaled to 0 tasks (not deleted) for 7-day observation period
8. CloudWatch alarms updated to remove ECS references
9. Route53 DNS records for ECS removed after observation period
10. ECS cluster, task definitions, and related resources deleted after 30 days
11. Rollback plan documented and tested
12. Final decommission report generated

## Implementation Notes

- See full details in: \`docs/stories/5.8-ecs-service-decommission-plan.md\`
- 30-day observation period (ample time, low cost)
- Scale to 0 (not delete) initially (fast rollback)
- Phased deletion over 30 days (minimizes risk)

## Dependencies

- Story 5.5: Blue/Green Deployment
- Story 5.6: Performance Validation
- Story 5.7: Cost Monitoring
- All Epic 1-4 Stories (SST fully operational)" \
  --label "epic:5-deployment" \
  --label "type:decommission" \
  --label "priority:critical"

echo ""
echo "✅ Successfully created GitHub issues for 14 incomplete stories!"
echo ""
echo "View all issues at: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/issues"
