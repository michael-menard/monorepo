# SST v3 → Serverless Framework Migration Plan

## Executive Summary

**Current State**: SST v3 deployment failing with:

- Pulumi platform extraction issues (workaround applied)
- Invalid function definition errors for all API routes
- No successful deployments after multiple attempts

**Target State**: Serverless Framework deployment with CloudFormation
**Timeline**: 3-5 days
**Complexity**: Medium (infrastructure rewrite, handlers unchanged)

## Infrastructure Inventory

### Current SST v3 Resources (from sst.config.ts)

**Compute**:

- 42+ Lambda functions (Node.js 20.x)
  - 12 MOC Instructions functions
  - 7 MOC Parts Lists functions
  - 12 Gallery functions
  - 8 Wishlist functions
  - 3 WebSocket functions

**Networking**:

- VPC (10.0.0.0/24 CIDR)
  - 2 Availability Zones
  - 2 Public subnets (/27 each - 32 IPs)
  - 2 Private subnets (/26 each - 64 IPs)
  - 1 NAT Gateway (cost-optimized)
  - Internet Gateway
- Security Groups (Lambda, RDS, OpenSearch, Umami, OpenReplay)

**Database**:

- RDS PostgreSQL 15.8
  - Instance: t4g.micro (dev), r6g.large (prod)
  - ACU scaling: 0.5-2 (dev), 1-16 (prod)
  - Private subnet deployment
  - 7-day backup retention

**Search**:

- OpenSearch cluster
  - Instance type varies by stage
  - Private subnet deployment

**Storage**:

- S3 Buckets:
  - MOC instruction files
  - Configuration bucket
  - OpenReplay sessions
- DynamoDB Tables:
  - WebSocket connections

**API**:

- HTTP API Gateway (18+ routes with JWT auth)
- WebSocket API (3 routes: $connect, $disconnect, $default)
- Cognito User Pool + Identity Pool
- Custom JWT authorizers

**Monitoring**:

- CloudWatch Dashboards
- CloudWatch Alarms (error rate monitoring)
- SNS Topics (error alerts, budget alerts)
- AWS Budgets ($150/month threshold)
- Cost anomaly detection

## Migration Strategy

### Phase 1: Setup (Day 1 - Morning)

- [ ] Install Serverless Framework
- [ ] Install required plugins:
  - serverless-offline
  - serverless-plugin-typescript
  - serverless-iam-roles-per-function
  - serverless-apigatewayv2-authorizer
  - serverless-prune-plugin
- [ ] Create base `serverless.yml`
- [ ] Configure stage-specific variables

### Phase 2: Core Infrastructure (Day 1 - Afternoon)

- [ ] VPC (CloudFormation custom resources)
- [ ] Security Groups
- [ ] RDS PostgreSQL
- [ ] S3 Buckets
- [ ] DynamoDB Tables

### Phase 3: Lambda Functions (Day 2)

- [ ] Convert function definitions to Serverless syntax
- [ ] Configure VPC attachment
- [ ] Set environment variables
- [ ] Configure IAM roles per function
- [ ] NO HANDLER CHANGES NEEDED ✅

### Phase 4: API Gateway (Day 3 - Morning)

- [ ] HTTP API with routes
- [ ] JWT authorizers (Cognito)
- [ ] WebSocket API
- [ ] CORS configuration

### Phase 5: Auth & Search (Day 3 - Afternoon)

- [ ] Cognito User Pool
- [ ] Cognito Identity Pool
- [ ] OpenSearch cluster

### Phase 6: Monitoring (Day 4 - Morning)

- [ ] CloudWatch Dashboards
- [ ] CloudWatch Alarms
- [ ] SNS Topics
- [ ] AWS Budgets

### Phase 7: Testing & Validation (Day 4 - Afternoon + Day 5)

- [ ] Deploy to dev stage
- [ ] Validate all endpoints
- [ ] Load testing
- [ ] Cost estimation
- [ ] Documentation

## Key Differences: SST v3 vs Serverless Framework

| Aspect              | SST v3                   | Serverless Framework   |
| ------------------- | ------------------------ | ---------------------- |
| Config Language     | TypeScript               | YAML + plugins         |
| Deployment Engine   | Pulumi                   | CloudFormation         |
| State Management    | Pulumi state (S3)        | CloudFormation stacks  |
| Stack Visibility    | Hidden (Pulumi)          | CloudFormation console |
| Function Definition | `new sst.aws.Function()` | `functions:` section   |
| Resource Linking    | `.link[]` array          | Env vars + IAM         |
| Type Safety         | Native TypeScript        | Plugins/schemas        |
| Learning Curve      | High                     | Low-Medium             |

## Migration Approach

### What Changes

- ✅ `sst.config.ts` → `serverless.yml` + CloudFormation resources
- ✅ Infrastructure modules → CloudFormation templates or plugins
- ✅ Deployment commands (`sst deploy` → `serverless deploy`)
- ✅ State management (Pulumi → CloudFormation)

### What Stays the Same

- ✅ **All Lambda handler code** (zero changes!)
- ✅ Handler paths (e.g., `endpoints/moc-instructions/list/handler.handler`)
- ✅ Runtime (Node.js 20.x)
- ✅ Environment variables (same names)
- ✅ AWS services (RDS, S3, API Gateway, etc.)

## Risk Mitigation

1. **Incremental Migration**: Deploy infrastructure in phases
2. **Parallel Running**: Keep SST config until Serverless is validated
3. **Fresh Stage**: Deploy to `dev-sf` stage first (no conflicts)
4. **Rollback Plan**: Document SST state for potential rollback
5. **Cost Monitoring**: Track costs during migration

## Success Criteria

- [ ] Successful deployment to dev stage
- [ ] All 42+ Lambda functions deployed and working
- [ ] All API endpoints responding correctly
- [ ] WebSocket connections working
- [ ] Database connectivity verified
- [ ] OpenSearch queries working
- [ ] CloudWatch monitoring active
- [ ] Cost within expected range ($150/month budget)
- [ ] Documentation complete

## Next Steps

1. Complete this migration plan review
2. Install Serverless Framework and plugins
3. Create base `serverless.yml` with VPC + one Lambda function
4. Test minimal deployment
5. Incrementally add remaining resources
6. Full integration testing
7. Production deployment (if approved)

---

**Status**: Ready to begin Phase 1
**Last Updated**: 2025-11-24
