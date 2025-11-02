# Deployment & Verification Guide - Epic 1

This guide walks you through deploying the SST infrastructure and verifying all acceptance criteria for Story 1.8 (Health Check Lambda).

## Prerequisites Check

### ✅ Already Configured
- **AWS Credentials**: Configured for account `213351177820` (lego-moc-deployer)
- **AWS Region**: `us-east-1`
- **Project**: TypeScript compilation passing ✅
- **SST Config**: Infrastructure defined in `sst.config.ts`

### 📦 Required Installations
- **Node.js**: >= 20 (check with `node -v`)
- **pnpm**: Already installed in monorepo
- **SST CLI**: Installed as project dependency (will use via `pnpm`)

---

## Step 1: Install Dependencies

```bash
cd apps/api/lego-api-serverless
pnpm install
```

**Expected Output**: All dependencies installed including `sst@^3.4.1`

---

## Step 2: Bootstrap SST (First Time Only)

SST needs to create an S3 bucket and other resources for state management.

```bash
# Bootstrap SST for dev stage
pnpm sst bootstrap
```

**What This Does**:
- Creates `sst-state-<account>-<region>` S3 bucket
- Sets up IAM roles for deployments
- Creates SSM parameters for state tracking

**Expected Output**:
```
✓ Bootstrapped AWS account 213351177820 in us-east-1
```

**Note**: Only needs to be done once per AWS account + region combination.

---

## Step 3: Option A - Local Development with Live AWS Resources

This is the **recommended first step** for testing before full deployment.

```bash
pnpm dev
# Or: pnpm sst dev
```

**What This Does**:
1. Provisions infrastructure in AWS (VPC, RDS, Redis, OpenSearch, S3)
2. Starts local Lambda development server
3. Connects to real AWS resources
4. Enables hot-reloading for code changes
5. Provides local endpoint for testing

**Expected Output**:
```
SST v3.4.1  ready!

➜  App:     lego-api-serverless
➜  Stage:   <your-username>
➜  Console: https://console.sst.dev/lego-api-serverless/<your-username>

Functions:
  HealthCheckFunction
    Handler: src/functions/health.handler

API Gateway:
  LegoApi: https://local.sst.dev:xxxxx
```

**Initial Deployment Time**: 15-20 minutes (creates VPC, RDS, Redis, OpenSearch)

### Testing with `sst dev`

Once `sst dev` is running, in a **new terminal**:

```bash
# Get the local API URL from sst dev output
curl http://localhost:13557/health
# Or use the actual local.sst.dev URL shown

# Expected response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "postgres": "connected",
      "redis": "connected",
      "opensearch": "connected"
    },
    "timestamp": "2025-11-02T...",
    "version": "1.0.0"
  },
  "message": "System status: healthy"
}
```

**Troubleshooting `sst dev`**:
- If infrastructure takes >20 minutes, check AWS Console (CloudFormation)
- RDS may take 10-15 minutes to become available
- OpenSearch domain takes 15-20 minutes to provision
- Check logs: `tail -f .sst/log/<stage>.log`

---

## Step 3: Option B - Deploy to AWS (Persistent)

Deploy infrastructure that persists (not just for local development).

```bash
# Deploy to dev stage
pnpm deploy
# Or: pnpm sst deploy --stage dev

# Deploy to staging (if ready)
pnpm deploy:staging

# Deploy to production (protected, requires confirmation)
pnpm deploy:production
```

**What This Does**:
1. Builds Lambda functions
2. Creates all infrastructure via CloudFormation
3. Deploys Lambda code to AWS
4. Creates API Gateway endpoint
5. Returns output values (API URL, resource IDs)

**Deployment Time**:
- **First deployment**: 15-25 minutes
- **Subsequent deployments**: 2-5 minutes (only updates changed resources)

**Expected Output**:
```
✓ Complete

   vpc: vpc-xxxxx
   apiUrl: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
   postgresHost: lego-api-postgres-xxxxx.rds.amazonaws.com
   redisHost: lego-api-redis-xxxxx.cache.amazonaws.com
   openSearchEndpoint: https://xxxxx.us-east-1.es.amazonaws.com
   bucketName: lego-moc-files-dev
   healthCheckFunctionArn: arn:aws:lambda:us-east-1:213351177820:function:...
```

---

## Step 4: Verify Health Endpoint

### Test the Deployed Endpoint

```bash
# Copy the apiUrl from deployment output
export API_URL="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com"

# Test health endpoint
curl $API_URL/health | jq

# Or with verbose output
curl -v $API_URL/health
```

**Expected Response (All Services Healthy)**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "postgres": "connected",
      "redis": "connected",
      "opensearch": "connected"
    },
    "timestamp": "2025-11-02T15:30:45.123Z",
    "version": "1.0.0"
  },
  "message": "System status: healthy",
  "timestamp": "2025-11-02T15:30:45.123Z"
}
```

**Expected HTTP Status**: `200 OK`

### Possible Response States

#### 1. Healthy (200)
All services connected.

#### 2. Degraded (200)
PostgreSQL connected, but Redis or OpenSearch down:
```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "services": {
      "postgres": "connected",
      "redis": "disconnected",
      "opensearch": "connected"
    },
    ...
  }
}
```

#### 3. Unhealthy (503)
PostgreSQL down (critical service):
```json
{
  "success": false,
  "error": {
    "type": "SERVICE_UNAVAILABLE",
    "message": "Database connection failed",
    "details": {
      "services": {
        "postgres": "disconnected",
        ...
      }
    }
  },
  "timestamp": "..."
}
```

**Expected HTTP Status**: `503 Service Unavailable`

---

## Step 5: Verify CloudWatch Logs

### View Logs via AWS Console

1. Navigate to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups
2. Find log group: `/aws/lambda/lego-api-serverless-<stage>-HealthCheckFunction`
3. Click on latest log stream
4. Look for log entries:

```
[INFO] Health check initiated { requestId: '...', stage: 'dev' }
[INFO] Health check completed { status: 'healthy', services: {...}, ... }
```

### View Logs via CLI

```bash
# Get log group name
export LOG_GROUP="/aws/lambda/lego-api-serverless-dev-HealthCheckFunction"

# Tail logs (follow mode)
aws logs tail $LOG_GROUP --follow

# Get recent logs
aws logs tail $LOG_GROUP --since 10m

# Filter for errors
aws logs tail $LOG_GROUP --filter-pattern "ERROR"
```

### View Logs via SST Console

```bash
pnpm sst dev
# Visit the Console URL shown in output
# Navigate to Functions > HealthCheckFunction > Logs
```

---

## Step 6: Test Individual Service Connections

### PostgreSQL Connection

```bash
# SSH into bastion or use AWS Systems Manager Session Manager
# Get RDS endpoint from deployment outputs
psql -h <POSTGRES_HOST> -U postgres -d lego_projects -c "SELECT 1 as health_check;"

# Expected output:
# health_check
#--------------
#            1
```

### Redis Connection

```bash
# Install redis-cli: brew install redis (macOS)
redis-cli -h <REDIS_HOST> PING

# Expected output:
# PONG
```

### OpenSearch Connection

```bash
# Get OpenSearch endpoint from outputs
curl https://<OPENSEARCH_ENDPOINT>/_cluster/health | jq

# Expected output:
# {
#   "status": "green",
#   "cluster_name": "lego-api-opensearch-...",
#   ...
# }
```

---

## Step 7: Run Database Migrations

After successful deployment, initialize the database schema:

```bash
# Generate migration files (if not already generated)
pnpm db:generate

# Push schema to database
pnpm db:push

# Or run migrations explicitly
pnpm db:migrate
```

**Expected Output**:
```
✓ Applying migrations...
✓ All migrations applied successfully
```

**Verify Tables**:
```bash
# Open Drizzle Studio
pnpm db:studio

# Or query directly
psql -h <POSTGRES_HOST> -U postgres -d lego_projects -c "\dt"
```

---

## Step 8: Monitor Infrastructure

### CloudFormation Stacks

```bash
# List all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Describe specific stack
aws cloudformation describe-stacks --stack-name lego-api-serverless-dev
```

### Resource Costs Monitoring

```bash
# Check estimated costs in AWS Cost Explorer
# Navigate to: https://console.aws.amazon.com/cost-management/home#/cost-explorer

# Expected costs for dev stage:
# - RDS t4g.micro: ~$15-20/month
# - ElastiCache t4g.micro: ~$15-20/month
# - OpenSearch t3.small: ~$30-40/month
# - NAT Gateway: ~$30-40/month
# - Lambda: Minimal (free tier)
# Total: ~$90-120/month for dev
```

---

## Step 9: Clean Up (Optional)

To avoid ongoing costs after testing:

```bash
# Remove all infrastructure for dev stage
pnpm sst remove --stage dev

# Or remove specific stage
pnpm sst remove --stage <your-username>
```

**Warning**: This will DELETE all infrastructure including:
- RDS database (data will be lost unless backed up)
- Redis cache (data will be lost)
- OpenSearch domain (indices will be lost)
- S3 bucket (files may be retained based on deletion policy)
- VPC and networking resources

**Production Protection**: Production stage has `protect: true` - requires manual override.

---

## Acceptance Criteria Verification Checklist

After deployment, verify each AC:

- [ ] **AC 1**: Lambda function exists at `src/functions/health.ts` ✅ (verified in code)
- [ ] **AC 2**: PostgreSQL connectivity check works ✅ (verified in code)
- [ ] **AC 3**: Redis connectivity check works ✅ (verified in code)
- [ ] **AC 4**: OpenSearch connectivity check works ✅ (verified in code)
- [ ] **AC 5**: API Gateway endpoint `GET /health` exists ✅ (verified in config)
- [ ] **AC 6**: Response includes status and services ✅ (verified in code)
- [ ] **AC 7**: CloudWatch Logs capture execution ✅ (verified in code)
- [ ] **AC 8**: Function executes via `sst dev` → Test with Step 3A
- [ ] **AC 9**: Deploys via `sst deploy --stage dev` → Test with Step 3B
- [ ] **AC 10**: Endpoint returns healthy status → Test with Step 4

---

## Common Issues & Solutions

### Issue: `sst command not found`

**Solution**: Use pnpm to run sst commands:
```bash
pnpm sst dev
# Not: sst dev
```

### Issue: RDS takes too long to provision

**Solution**: RDS typically takes 10-15 minutes. Check CloudFormation:
```bash
aws cloudformation describe-stack-events --stack-name lego-api-serverless-dev
```

### Issue: Lambda timeout connecting to RDS

**Possible Causes**:
1. Security group misconfiguration
2. RDS not in same VPC as Lambda
3. RDS Proxy not ready

**Solution**: Check security group rules in sst.config.ts (lines 69-86)

### Issue: OpenSearch domain creation fails

**Possible Cause**: t3.small instance type not available in region

**Solution**: Try different instance type in sst.config.ts:
```typescript
instance: "t3.medium.search"
```

### Issue: Health endpoint returns 503

**Debug Steps**:
1. Check CloudWatch Logs for Lambda errors
2. Test individual service connections (Step 6)
3. Verify security group rules allow Lambda → RDS/Redis/OpenSearch
4. Check VPC subnet routing tables

---

## Next Steps After Verification

Once all ACs pass:

1. ✅ Tag completion: `git tag v1.0.0-epic1-deployed`
2. 📝 Document actual API URL in README
3. 🚀 Begin Epic 2: API Endpoints Migration
4. 🔒 Consider adding authentication to future endpoints
5. 📊 Set up CloudWatch alarms for health check failures

---

## Useful Commands Reference

```bash
# Development
pnpm dev                          # Start local development
pnpm check-types                  # Verify TypeScript
pnpm build                        # Build Lambda functions

# Deployment
pnpm deploy                       # Deploy to dev stage
pnpm deploy:staging               # Deploy to staging
pnpm deploy:production            # Deploy to production

# Database
pnpm db:generate                  # Generate migrations
pnpm db:push                      # Push schema to DB
pnpm db:migrate                   # Run migrations
pnpm db:studio                    # Open Drizzle Studio

# Cleanup
pnpm sst remove --stage dev       # Remove all infrastructure

# AWS CLI
aws cloudformation list-stacks                    # List CloudFormation stacks
aws logs tail /aws/lambda/<function> --follow     # Tail Lambda logs
aws rds describe-db-instances                     # List RDS instances
```

---

## Support Resources

- **SST Documentation**: https://sst.dev/docs/
- **SST Discord**: https://sst.dev/discord
- **AWS CloudFormation Console**: https://console.aws.amazon.com/cloudformation
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch
- **Epic 1 README**: See `README.md` in this directory

---

**Last Updated**: 2025-11-02 (Epic 1 Completion)
