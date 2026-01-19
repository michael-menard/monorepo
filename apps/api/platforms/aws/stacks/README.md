# LEGO API Serverless Stacks

This directory contains modular, independently deployable Serverless Framework stacks for the LEGO API.

## Stack Structure

```
stacks/
├── shared-config.yml              # Shared configuration (stages, tags, etc.)
├── infrastructure/
│   ├── network.yml               # VPC, Subnets, NAT Gateway, Route Tables
│   ├── security.yml              # Security Groups
│   ├── database.yml              # Aurora PostgreSQL + IAM + Secrets Manager
│   ├── search.yml                # OpenSearch Domain
│   ├── storage.yml               # S3 Bucket
│   ├── auth.yml                  # Cognito User Pool + Social Identity Providers
│   ├── realtime.yml              # DynamoDB for WebSocket connections
│   └── monitoring.yml            # CloudWatch Dashboard & Alarms
└── functions/
    ├── health.yml                # Health check endpoint (public)
    ├── gallery.yml               # Gallery images & albums (12 functions)
    ├── moc-instructions.yml      # MOC instructions (12 functions)
    ├── wishlist.yml              # Wishlist management (8 functions)
    ├── parts-lists.yml           # Parts lists (7 functions)
    └── websocket.yml             # WebSocket handlers (3 functions)
```

## Dependency Graph

```
network ──┬──> security ──┬──> database
          │               └──> search
          │
storage (standalone) ────────────────────────────┐
auth (standalone) ───> api-gateway ──────────────┼──> functions-*
realtime (standalone) ──> functions-websocket ───┘
                                                 │
                                      monitoring (last)
```

## Deployment

### Deploy Everything

```bash
# Full deployment with orchestration script
pnpm stacks:deploy

# Or with parallel deployment (faster)
pnpm stacks:deploy:parallel

# Different stages
pnpm stacks:deploy:staging
pnpm stacks:deploy:production
```

### Deploy Individual Stacks

```bash
# Infrastructure stacks
pnpm stack:network
pnpm stack:security
pnpm stack:database     # ⭐ RDS + related IAM
pnpm stack:search
pnpm stack:storage
pnpm stack:auth
pnpm stack:realtime
pnpm stack:monitoring

# Function stacks
pnpm stack:health
pnpm stack:gallery
pnpm stack:moc
pnpm stack:wishlist
pnpm stack:parts
pnpm stack:websocket
```

### Deploy Groups

```bash
# Only infrastructure
pnpm stacks:deploy:infra

# Only functions
pnpm stacks:deploy:functions

# Specific stack by name
pnpm stacks:deploy:database
pnpm stacks:deploy:gallery
```

### Manual Deployment

```bash
# Deploy any stack manually with custom stage
pnpm serverless deploy --config stacks/infrastructure/database.yml --stage staging
pnpm serverless deploy --config stacks/functions/gallery.yml --stage production
```

## Stack Details

### Infrastructure Stacks

#### `network.yml`
**Deploy first** - No dependencies
- VPC with /24 CIDR (256 IPs)
- 2 Public Subnets (/27 - 32 IPs each) - for NAT Gateway, ALB
- 2 Private Subnets (/26 - 64 IPs each) - for Lambda, RDS, OpenSearch
- Internet Gateway
- NAT Gateway (single, cost-optimized)
- Public and Private Route Tables

**Exports:** VpcId, Subnet IDs, Route Table IDs

#### `security.yml`
**Depends on:** network
- Lambda Security Group (outbound to all)
- Database Security Group (inbound PostgreSQL from Lambda)
- OpenSearch Security Group (inbound HTTPS from Lambda)

**Exports:** Security Group IDs

#### `database.yml` ⭐
**Depends on:** network, security
- Aurora PostgreSQL Serverless v2 Cluster
- Aurora Instance (db.serverless class)
- DB Subnet Group
- Secrets Manager Secret (auto-generated credentials)
- IAM Policy for database access

**Exports:** Cluster Endpoint, Port, Secret ARN, IAM Policy ARN

#### `search.yml`
**Depends on:** network, security
- OpenSearch Domain (VPC-deployed)
- OpenSearch Service-Linked Role
- IAM Policy for OpenSearch access

**Exports:** OpenSearch Endpoint, Domain ARN, IAM Policy ARN

#### `storage.yml`
**Standalone** - No dependencies
- S3 Bucket for file uploads
- Server-side encryption (AES256)
- CORS configuration
- Lifecycle rules (cleanup incomplete uploads)
- IAM Policy for S3 access

**Exports:** Bucket Name, ARN, IAM Policy ARN

#### `auth.yml`
**Standalone** - No dependencies
- Cognito User Pool (email-based sign-in)
- Cognito User Pool Client (OAuth 2.0)
- Cognito User Pool Domain
- Conditional Social Identity Providers (Google, Apple, Facebook)

**Exports:** User Pool ID, Client ID, Domain URL, Issuer URL

#### `realtime.yml`
**Standalone** - No dependencies
- DynamoDB Table for WebSocket connections
- Global Secondary Index on userId
- TTL for automatic cleanup
- IAM Policy for DynamoDB access

**Exports:** Table Name, ARN, IAM Policy ARN

#### `monitoring.yml`
**Deploy last** - After all other stacks
- CloudWatch Dashboard with metrics for:
  - Lambda invocations, errors, duration
  - Aurora CPU, connections, ACU
  - OpenSearch cluster health, CPU, JVM
  - DynamoDB read/write capacity
- CloudWatch Alarms for:
  - Aurora high CPU (>80%)
  - Aurora high connections (>50)
  - OpenSearch cluster red status
  - OpenSearch JVM pressure (>80%)
  - DynamoDB throttling

**Exports:** Dashboard URL

### Function Stacks

Each function stack:
- References infrastructure outputs via `${cf:stack-name.OutputName}`
- Has its own API Gateway (HTTP API v2)
- Uses Cognito JWT authorizer (except health)
- Runs in VPC private subnets (except websocket)
- Has appropriate IAM permissions

| Stack | Functions | Auth | VPC |
|-------|-----------|------|-----|
| health | 1 | No | Yes |
| gallery | 12 | Yes | Yes |
| moc-instructions | 12 | Yes | Yes |
| wishlist | 8 | Yes | Yes |
| parts-lists | 7 | Yes | Yes |
| websocket | 3 | No | No |

## Cross-Stack References

Stacks share values via CloudFormation exports:

```yaml
# Reading from another stack
${cf:lego-network-dev.VpcId}
${cf:lego-database-dev.ClusterEndpoint}
${cf:lego-auth-dev.UserPoolId}
```

Export naming convention: `lego-{component}-{stage}-{OutputName}`

## Stage Configuration

All stacks share configuration from `shared-config.yml`:

```yaml
stages:
  dev:
    logLevel: debug
    memorySize: 256
  staging:
    logLevel: info
    memorySize: 512
  production:
    logLevel: warn
    memorySize: 1024
```

## Benefits of Split Stacks

1. **Independent Deployment** - Update database without touching functions
2. **Faster Deployments** - Deploy only what changed
3. **Parallel Deployment** - Independent stacks can deploy simultaneously
4. **Smaller Blast Radius** - Issues isolated to single stack
5. **Clear Ownership** - Teams can own specific stacks
6. **Better CloudFormation Limits** - Stay under 500 resource limit per stack

## Migration from Monolithic Stack

The original `serverless.yml` (~2,200 lines) remains functional. These modular stacks are an alternative deployment approach that can be used alongside or instead of the monolithic stack.

To migrate:
1. Deploy infrastructure stacks first (in order)
2. Deploy function stacks
3. Update DNS/API Gateway references
4. Remove old monolithic stack
