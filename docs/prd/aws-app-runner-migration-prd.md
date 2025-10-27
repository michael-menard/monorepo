# Product Requirements Document: AWS App Runner Migration

**Document Version:** 1.0
**Status:** Draft
**Created:** 2025-01-26
**Owner:** Michael Menard
**Target Completion:** Q1 2025

---

## Executive Summary

### Overview
Migrate the LEGO MOC Instructions Platform from local Docker-based development infrastructure to a production-ready AWS cloud architecture using AWS App Runner as the primary compute platform. This migration enables the platform to serve as a professional portfolio project while maintaining cost efficiency (~$25-35/month) suitable for a single-user proof-of-concept.

### Business Goals
1. **Portfolio Readiness**: Deploy production-grade infrastructure to demonstrate AWS cloud architecture skills
2. **Cost Efficiency**: Maintain total infrastructure costs under $40/month for low-traffic POC usage
3. **Professional Standards**: Implement industry best practices (IaC, CI/CD, observability, security)
4. **Scalability Foundation**: Build architecture that can scale to production workloads if needed
5. **Career Development**: Showcase containerization, cloud-native architecture, and DevOps capabilities

### Success Criteria
- [ ] All services deployed and accessible via HTTPS with custom domains
- [ ] Total monthly cost ≤ $40 for expected POC usage patterns
- [ ] Complete Infrastructure-as-Code implementation (AWS CDK or Terraform)
- [ ] Automated CI/CD pipeline with GitHub Actions
- [ ] CloudWatch monitoring and dashboards configured
- [ ] Architecture documentation with diagrams suitable for portfolio presentation
- [ ] Zero downtime deployment capability
- [ ] Comprehensive rollback strategy documented and tested

---

## Current State Analysis

### Existing Architecture

#### **Application Services**
1. **Auth Service**
   - Technology: Express.js, Node.js 20
   - Port: 9300
   - Database: MongoDB 7.0
   - Features: JWT authentication, email verification, password reset, CSRF protection
   - Current State: Running locally via pnpm, Docker-compose for dependencies

2. **LEGO Projects API**
   - Technology: Express.js, Node.js 20, Drizzle ORM
   - Port: 9000
   - Dependencies:
     - PostgreSQL 15 (primary database)
     - Redis 7 (caching layer)
     - Elasticsearch 8.13.4 (full-text search)
     - S3 (file storage - already AWS compatible)
   - Features: MOC management, file uploads, image processing (Sharp), search
   - Current State: Running locally via pnpm, Docker-compose for dependencies

3. **Frontend Application**
   - Technology: React 19, Vite 6, TypeScript 5.8
   - Port: 3002 (dev), 5173 (Vite)
   - Build Output: Static assets
   - Current State: Running locally via Vite dev server

#### **Infrastructure Dependencies**
```yaml
Current Docker Compose Stack:
  - MongoDB 7.0 (Auth database)
  - PostgreSQL 15 (LEGO database)
  - Redis 7-alpine (Caching)
  - Elasticsearch 8.13.4 (Search)
  - Mongo Express (Admin UI - dev only)
  - pgAdmin (Admin UI - dev only)
```

#### **Development Workflow**
- Monorepo: Turborepo + pnpm workspaces
- 25+ shared packages (`@repo/ui`, `@repo/auth`, etc.)
- Centralized environment configuration via `shared/config/env-loader.js`
- Existing Dockerfiles (need App Runner optimization)
- No CI/CD currently

### Pain Points & Limitations
1. **Not Production Ready**: Local Docker-compose not suitable for public deployment
2. **No Observability**: Limited logging and monitoring in current setup
3. **Manual Deployment**: No automated deployment pipeline
4. **Resource Management**: All services run regardless of usage (cost inefficient at scale)
5. **No Disaster Recovery**: Backups manual, no documented recovery process
6. **Portfolio Presentation**: Cannot share live URL with potential employers

---

## Target Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (us-east-1)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Internet Users                                                     │
│       ↓                                                            │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Route 53 (DNS)                                     │           │
│  │  - lego-moc.yourname.dev                          │           │
│  │  - api.yourname.dev                               │           │
│  │  - auth.yourname.dev                              │           │
│  └────────────┬───────────────────────────────────────┘           │
│               │                                                    │
│       ┌───────┴────────┐                                          │
│       ↓                ↓                                           │
│  ┌─────────┐    ┌──────────────────────────────────┐            │
│  │CloudFront│    │ App Runner Services              │            │
│  │  (CDN)   │    │                                  │            │
│  │          │    │ ┌──────────────────────────────┐│            │
│  │Frontend  │    │ │ LEGO Projects API Service    ││            │
│  │Assets    │    │ │ - Auto-scaling (1-3 instances)││           │
│  └────┬─────┘    │ │ - 0.25 vCPU, 0.5GB RAM       ││           │
│       │          │ │ - Port: 9000                  ││           │
│       │          │ │ - Health checks enabled       ││           │
│       ↓          │ └──────────────┬────────────────┘│           │
│  ┌─────────┐    │                │                  │           │
│  │   S3    │    │ ┌──────────────┴───────────────┐ │           │
│  │(Origin) │    │ │ Auth Service                  │ │           │
│  └─────────┘    │ │ - Auto-scaling (1-2 instances)│ │           │
│                 │ │ - 0.25 vCPU, 0.5GB RAM        │ │           │
│                 │ │ - Port: 9300                   │ │           │
│                 │ └──────────────┬────────────────┘ │           │
│                 └────────────────┼───────────────────┘           │
│                                  │                                │
│                 ┌────────────────┴────────────────┐              │
│                 │                                  │              │
│       ┌─────────┴─────────┐          ┌───────────┴──────────┐   │
│       ↓                   ↓          ↓                      ↓    │
│  ┌──────────┐      ┌──────────┐  ┌──────────┐      ┌──────────┐│
│  │ Aurora   │      │DocumentDB│  │ElastiCache│     │OpenSearch││
│  │PostgreSQL│      │(MongoDB) │  │  (Redis)  │     │(Elastic) ││
│  │Serverless│      │Serverless│  │  Optional │     │ Optional ││
│  │  v2      │      │          │  │  (Phase 2)│     │(Phase 2) ││
│  └──────────┘      └──────────┘  └──────────┘      └──────────┘│
│   (0.5 ACU)          (t4g.medium) (t4g.micro)       (t3.small)  │
│                                                                   │
│  Observability & Security:                                       │
│  ┌──────────────────────────────────────────────────┐           │
│  │ CloudWatch (Logs, Metrics, Dashboards, Alarms)  │           │
│  │ AWS WAF (Optional - Phase 3)                     │           │
│  │ Secrets Manager (Credentials)                    │           │
│  │ X-Ray (Distributed Tracing - Optional)           │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Service Mapping

| Current Service | AWS Service | Configuration | Monthly Cost Est. |
|----------------|-------------|---------------|-------------------|
| Auth Service (Express) | App Runner | 0.25 vCPU, 0.5GB, 1-2 instances | $12-15 |
| LEGO API (Express) | App Runner | 0.25 vCPU, 0.5GB, 1-3 instances | $12-18 |
| Frontend (React) | S3 + CloudFront | Standard storage + CDN | $2-3 |
| MongoDB | DocumentDB (Serverless) | t4g.medium, min capacity | $12-15 |
| PostgreSQL | Aurora Serverless v2 | 0.5-1 ACU | $5-10 |
| Redis | ElastiCache (Optional) | t4g.micro OR in-memory fallback | $11 OR $0 |
| Elasticsearch | OpenSearch (Optional) | t3.small.search OR disabled | $20 OR $0 |
| Static Files | S3 | Standard storage | $1-2 |
| DNS | Route 53 | Hosted zone + queries | $0.50-1 |
| **Total (Phase 1)** | | **Without Redis/ES** | **$44-60** |
| **Total (Phase 1 Optimized)** | | **In-app caching/search** | **$33-48** |

---

## Detailed Requirements

### Phase 1: Core Migration (Week 1-2)

#### 1.1 Database Migration

**PostgreSQL → Aurora Serverless v2**
- **Requirements**:
  - Migrate schema and data from local PostgreSQL 15 to Aurora Serverless v2
  - Configure auto-scaling: 0.5 ACU minimum, 1 ACU maximum (POC phase)
  - Enable automated backups (7-day retention)
  - Configure in VPC with private subnets
  - Security groups: Allow App Runner services only

- **Migration Steps**:
  1. Create Aurora Serverless v2 cluster in VPC
  2. Run Drizzle migrations against Aurora endpoint
  3. (Optional) Use `pg_dump` to migrate existing dev data
  4. Update `DATABASE_URL` in App Runner environment variables
  5. Verify connection from App Runner service

- **Acceptance Criteria**:
  - [ ] Aurora cluster created and accessible from App Runner
  - [ ] All Drizzle migrations applied successfully
  - [ ] Connection pooling configured appropriately for serverless
  - [ ] Automated backups enabled and tested
  - [ ] Estimated cost: $5-10/month for POC usage

**MongoDB → DocumentDB (Serverless)**
- **Requirements**:
  - Migrate Auth Service database to DocumentDB serverless instances
  - Configure cluster in VPC with private subnets
  - Maintain MongoDB 4.0+ compatibility for Mongoose
  - Enable TLS connections (required by DocumentDB)

- **Migration Steps**:
  1. Create DocumentDB cluster (1 instance, t4g.medium)
  2. Update connection string to include TLS parameters
  3. Verify Mongoose compatibility (DocumentDB has some limitations)
  4. Migrate existing user data using `mongodump`/`mongorestore`
  5. Update `MONGODB_URI` in App Runner environment variables

- **Acceptance Criteria**:
  - [ ] DocumentDB cluster created and accessible
  - [ ] Auth Service successfully connects and authenticates users
  - [ ] TLS connections working properly
  - [ ] Existing user data migrated (if applicable)
  - [ ] Estimated cost: $12-15/month

**Decision Point: Redis & Elasticsearch**
- **Option A (Recommended for Phase 1)**: Disable or use in-app alternatives
  - Redis → Use in-memory caching in App Runner containers (ephemeral but sufficient for POC)
  - Elasticsearch → Use PostgreSQL full-text search or disable search temporarily
  - **Cost Savings**: ~$30/month
  - **Tradeoff**: Reduced performance, no persistent caching

- **Option B**: Deploy managed services
  - Redis → ElastiCache for Redis (t4g.micro) @ $11/month
  - Elasticsearch → Amazon OpenSearch Service (t3.small.search) @ $20/month
  - **Cost Impact**: +$31/month
  - **Benefit**: Production-grade performance and features

**Recommendation**: Option A for Phase 1, upgrade to Option B in Phase 2 if needed for portfolio demonstration.

#### 1.2 Container Preparation

**Docker Optimization for App Runner**
- **Requirements**:
  - Optimize Dockerfiles for faster builds and smaller images
  - Ensure `shared/config/env-loader.js` is copied correctly
  - Configure correct ports and health checks
  - Multi-stage builds to minimize production image size

- **Deliverables**:
  1. `apps/api/lego-projects-api/Dockerfile.apprunner`
  2. `apps/api/auth-service/Dockerfile.apprunner`
  3. `.dockerignore` files to exclude unnecessary files
  4. Build scripts for local testing

- **Acceptance Criteria**:
  - [ ] Docker images build successfully in CI environment
  - [ ] Production images < 500MB each
  - [ ] Health check endpoints return 200 OK
  - [ ] All shared packages and config files included
  - [ ] Images pass security scanning (no critical vulnerabilities)

#### 1.3 App Runner Service Deployment

**LEGO Projects API Service**
- **Configuration**:
  ```yaml
  Service Name: lego-api-service
  Source: GitHub (michael-menard/Monorepo)
  Branch: main
  Dockerfile: apps/api/lego-projects-api/Dockerfile.apprunner
  Port: 9000
  Resources:
    CPU: 0.25 vCPU
    Memory: 0.5 GB
  Auto-scaling:
    Min instances: 1
    Max instances: 3
    Concurrency: 100 requests/instance
  Networking:
    VPC: Same as databases (private subnet access)
    Public ingress: Enabled
  Health Check:
    Path: /
    Interval: 30s
    Timeout: 10s
    Unhealthy threshold: 3
  ```

- **Environment Variables**:
  ```bash
  NODE_ENV=production
  PORT=9000
  DATABASE_URL=<Aurora endpoint>
  JWT_SECRET=<from Secrets Manager>
  AUTH_API=https://auth.<domain>
  APP_ORIGIN=https://lego-moc.<domain>
  FRONTEND_URL=https://lego-moc.<domain>
  S3_BUCKET=lego-moc-uploads-<account-id>
  S3_REGION=us-east-1
  USE_S3_STORAGE=true
  ENABLE_REDIS_CACHE=false  # Phase 1
  ENABLE_ELASTICSEARCH=false  # Phase 1
  LOG_LEVEL=info
  ```

- **Acceptance Criteria**:
  - [ ] Service deploys successfully from GitHub
  - [ ] Health checks pass consistently
  - [ ] API endpoints accessible via HTTPS
  - [ ] Database connections successful
  - [ ] File uploads to S3 working
  - [ ] CORS configured correctly for frontend
  - [ ] Average response time < 500ms for simple queries

**Auth Service**
- **Configuration**:
  ```yaml
  Service Name: auth-service
  Source: GitHub (michael-menard/Monorepo)
  Branch: main
  Dockerfile: apps/api/auth-service/Dockerfile.apprunner
  Port: 9300
  Resources:
    CPU: 0.25 vCPU
    Memory: 0.5 GB
  Auto-scaling:
    Min instances: 1
    Max instances: 2
    Concurrency: 100 requests/instance
  Networking:
    VPC: Same as DocumentDB
    Public ingress: Enabled
  Health Check:
    Path: /
    Interval: 30s
    Timeout: 10s
    Unhealthy threshold: 3
  ```

- **Environment Variables**:
  ```bash
  NODE_ENV=production
  PORT=9300
  MONGODB_URI=<DocumentDB endpoint with TLS params>
  JWT_SECRET=<same as LEGO API>
  FRONTEND_URL=https://lego-moc.<domain>
  LEGO_API_URL=https://api.<domain>
  LOG_LEVEL=info
  EMAIL_SERVICE=<SES or external service>
  ```

- **Acceptance Criteria**:
  - [ ] Service deploys successfully
  - [ ] User registration and login working
  - [ ] JWT token generation and validation working
  - [ ] Email verification flows functional
  - [ ] CSRF protection enabled and tested
  - [ ] Sessions persist correctly

#### 1.4 Frontend Deployment

**S3 + CloudFront**
- **Requirements**:
  - Deploy static React build to S3
  - Configure CloudFront for global CDN
  - Enable HTTPS with ACM certificate
  - Configure for SPA routing (all routes → index.html)

- **Configuration**:
  ```yaml
  S3 Bucket: lego-moc-frontend-<account-id>
  CloudFront Distribution:
    Origin: S3 bucket
    Default Root Object: index.html
    Error Pages:
      - 403 → /index.html (SPA routing)
      - 404 → /index.html (SPA routing)
    Cache Behavior:
      - index.html: no-cache (always get latest)
      - *.js, *.css: cache 1 year (with content hash)
      - *.png, *.jpg: cache 1 week
    SSL Certificate: ACM (auto-provisioned)
    Price Class: Use Only North America and Europe (lower cost)
  ```

- **Build Configuration**:
  ```bash
  # Update Vite environment variables for production
  VITE_API_URL=https://api.yourname.dev
  VITE_AUTH_URL=https://auth.yourname.dev
  ```

- **Acceptance Criteria**:
  - [ ] Frontend builds successfully with production env vars
  - [ ] CloudFront distribution serves content globally
  - [ ] HTTPS working with custom domain
  - [ ] SPA routing works (all routes accessible)
  - [ ] API calls successfully reach backend services
  - [ ] Average page load < 2s worldwide

#### 1.5 Networking & Security

**VPC Configuration**
- **Requirements**:
  ```yaml
  VPC CIDR: 10.0.0.0/16
  Subnets:
    Public (2 AZs):
      - 10.0.1.0/24 (us-east-1a)
      - 10.0.2.0/24 (us-east-1b)
    Private (2 AZs):
      - 10.0.10.0/24 (us-east-1a)
      - 10.0.11.0/24 (us-east-1b)
  NAT Gateway: 1 (Public subnet)
  Route Tables:
    Public: 0.0.0.0/0 → Internet Gateway
    Private: 0.0.0.0/0 → NAT Gateway
  ```

**Security Groups**
```yaml
App Runner Security Group:
  Egress:
    - All traffic to 0.0.0.0/0 (outbound internet)
    - PostgreSQL (5432) to Aurora SG
    - MongoDB (27017) to DocumentDB SG
    - HTTPS (443) to 0.0.0.0/0 (API calls)

Aurora Security Group:
  Ingress:
    - PostgreSQL (5432) from App Runner SG

DocumentDB Security Group:
  Ingress:
    - MongoDB (27017) from App Runner SG
```

**IAM Roles**
```yaml
App Runner Service Role:
  Permissions:
    - S3 read/write for uploads bucket
    - CloudWatch Logs write
    - Secrets Manager read (for sensitive env vars)
    - ECR pull (if using ECR for images)

App Runner Access Role:
  Permissions:
    - ECR pull images from GitHub
```

**Secrets Management**
- Store in AWS Secrets Manager:
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `MONGODB_URI`
  - `EMAIL_API_KEY` (if using external service)
- Reference in App Runner via ARN
- Rotate secrets every 90 days (automated via Lambda)

**Acceptance Criteria**:
- [ ] VPC configured with public/private subnets
- [ ] App Runner services can reach databases
- [ ] Databases not publicly accessible
- [ ] Security groups follow principle of least privilege
- [ ] Secrets stored in Secrets Manager, not plain text env vars
- [ ] IAM roles follow principle of least privilege

---

### Phase 2: Automation & Observability (Week 3)

#### 2.1 Infrastructure-as-Code

**AWS CDK Implementation**
- **Requirements**:
  - Define entire infrastructure in TypeScript using AWS CDK
  - Organize stacks: Network, Database, Compute, Frontend, Observability
  - Enable environment-based configuration (staging/production)
  - Include cost tagging for all resources

- **Stack Structure**:
  ```
  infrastructure/
  ├── bin/
  │   └── app.ts                    # CDK app entry point
  ├── lib/
  │   ├── network-stack.ts          # VPC, subnets, security groups
  │   ├── database-stack.ts         # Aurora, DocumentDB
  │   ├── compute-stack.ts          # App Runner services
  │   ├── frontend-stack.ts         # S3, CloudFront
  │   ├── observability-stack.ts    # CloudWatch, alarms
  │   └── pipeline-stack.ts         # CI/CD pipeline
  ├── config/
  │   ├── staging.ts                # Staging environment config
  │   └── production.ts             # Production environment config
  ├── cdk.json
  ├── package.json
  └── tsconfig.json
  ```

- **Deployment Commands**:
  ```bash
  # Deploy all stacks to staging
  cdk deploy --all --context env=staging

  # Deploy to production
  cdk deploy --all --context env=production

  # Diff before deploying
  cdk diff --all --context env=staging
  ```

- **Acceptance Criteria**:
  - [ ] CDK synthesizes CloudFormation templates successfully
  - [ ] All resources deploy via `cdk deploy`
  - [ ] Infrastructure can be torn down and recreated
  - [ ] Drift detection enabled
  - [ ] Cost tags applied to all resources
  - [ ] CDK code includes comments and documentation
  - [ ] Repository includes CDK README with deployment instructions

**Alternative: Terraform**
If CDK is too complex, use Terraform:
```hcl
modules/
├── networking/
├── database/
├── compute/
├── frontend/
└── observability/

environments/
├── staging.tfvars
└── production.tfvars
```

#### 2.2 CI/CD Pipeline

**GitHub Actions Workflows**

**Workflow 1: Backend Deployment**
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend Services

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'packages/**'
      - 'shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js 20
      - Install pnpm
      - Install dependencies
      - Run tests (unit + integration)
      - Run linting
      - Run type checking

  build-and-deploy-lego-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Configure AWS credentials
      - Build Docker image
      - Push to ECR (or trigger App Runner from GitHub)
      - Wait for deployment to complete
      - Run smoke tests against deployed service

  build-and-deploy-auth:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Configure AWS credentials
      - Build Docker image
      - Push to ECR (or trigger App Runner from GitHub)
      - Wait for deployment to complete
      - Run smoke tests against deployed service
```

**Workflow 2: Frontend Deployment**
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/lego-moc-instructions-app/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js 20
      - Install pnpm
      - Install dependencies
      - Build frontend (Vite production build)
      - Configure AWS credentials
      - Sync to S3 bucket
      - Invalidate CloudFront cache
      - Run Lighthouse CI (performance check)
```

**Workflow 3: Infrastructure Updates**
```yaml
# .github/workflows/deploy-infrastructure.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install CDK
      - CDK synth
      - CDK diff (show changes)
      - Post diff as PR comment

  deploy:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - Checkout code
      - Setup Node.js
      - Install CDK
      - Configure AWS credentials
      - CDK deploy --all --require-approval never
```

- **Acceptance Criteria**:
  - [ ] Backend deployment triggers on relevant code changes
  - [ ] Frontend deployment triggers on frontend changes
  - [ ] Infrastructure deployment triggers on IaC changes
  - [ ] All tests must pass before deployment
  - [ ] Failed deployments automatically roll back
  - [ ] Deployment notifications sent to Slack/Discord (optional)
  - [ ] Average deployment time < 10 minutes

#### 2.3 Monitoring & Observability

**CloudWatch Dashboards**
- **Dashboard 1: Application Overview**
  - Request count (App Runner services)
  - Average response time (p50, p95, p99)
  - Error rate (4xx, 5xx)
  - Active connections
  - CPU/Memory utilization

- **Dashboard 2: Database Performance**
  - Aurora: Connection count, CPU, read/write IOPS
  - DocumentDB: Connection count, CPU, network throughput
  - Query performance metrics

- **Dashboard 3: Cost Tracking**
  - Daily spend by service
  - Month-to-date total
  - Budget alerts

**CloudWatch Alarms**
```yaml
Alarms:
  - High Error Rate:
      Threshold: > 5% errors in 5 minutes
      Action: SNS notification to email

  - High Response Time:
      Threshold: p95 > 2 seconds
      Action: SNS notification

  - Database Connection Errors:
      Threshold: > 10 errors in 5 minutes
      Action: SNS notification

  - Budget Alert:
      Threshold: 80% of monthly budget
      Action: Email notification

  - Service Unavailable:
      Threshold: Health check failures > 3
      Action: SNS notification + auto-restart
```

**Logging Strategy**
```yaml
Log Aggregation:
  - App Runner → CloudWatch Logs
  - Log Groups:
    - /aws/apprunner/lego-api-service
    - /aws/apprunner/auth-service

  - Retention: 30 days (configurable)

  - Log Format: JSON structured logging
    Example:
      {
        "timestamp": "2025-01-26T12:34:56Z",
        "level": "info",
        "service": "lego-api",
        "message": "MOC created",
        "userId": "user-123",
        "mocId": "moc-456",
        "duration": 45
      }

  - Log Insights Queries:
    - Top errors by endpoint
    - Slowest API endpoints
    - User activity patterns
    - Failed authentication attempts
```

**Optional: Distributed Tracing**
- AWS X-Ray integration for request tracing across services
- Trace Auth → LEGO API → Database calls
- Identify bottlenecks and performance issues

- **Acceptance Criteria**:
  - [ ] CloudWatch dashboards created and accessible
  - [ ] All critical alarms configured
  - [ ] Alarm notifications working (test by triggering)
  - [ ] Logs aggregated and searchable
  - [ ] Log retention configured
  - [ ] Screenshots of dashboards for portfolio documentation

---

### Phase 3: Optimization & Polish (Week 4)

#### 3.1 Custom Domain Configuration

**Route 53 Setup**
- **Requirements**:
  - Purchase domain (e.g., `yourname.dev`) - $12/year
  - Create hosted zone in Route 53
  - Configure DNS records for all services
  - Enable DNSSEC for security

- **DNS Records**:
  ```yaml
  A/AAAA Records (via Alias):
    - lego-moc.yourname.dev → CloudFront distribution
    - api.yourname.dev → App Runner (LEGO API)
    - auth.yourname.dev → App Runner (Auth Service)

  CNAME Records:
    - www.lego-moc.yourname.dev → lego-moc.yourname.dev
  ```

- **SSL Certificates**:
  - CloudFront: ACM certificate in us-east-1 (auto-provisioned)
  - App Runner: Automatic SSL via App Runner custom domain feature

- **Acceptance Criteria**:
  - [ ] Domain purchased and hosted in Route 53
  - [ ] All services accessible via HTTPS custom domains
  - [ ] SSL certificates valid and auto-renewing
  - [ ] DNS propagation complete (< 24 hours)
  - [ ] www redirect working for frontend

#### 3.2 Performance Optimization

**Frontend Optimization**
- [ ] Enable Gzip/Brotli compression in CloudFront
- [ ] Configure aggressive caching for static assets
- [ ] Implement lazy loading for routes (already done via TanStack Router)
- [ ] Optimize images (WebP format, responsive sizes)
- [ ] Add service worker for offline support (PWA already implemented)
- [ ] Target Lighthouse score: > 90 across all categories

**Backend Optimization**
- [ ] Implement response caching headers
- [ ] Enable compression middleware (already enabled)
- [ ] Optimize database queries (add indexes where needed)
- [ ] Implement connection pooling (Drizzle already handles this)
- [ ] Add rate limiting per endpoint
- [ ] Target average response time: < 200ms for cached, < 500ms for uncached

**Database Optimization**
- [ ] Add indexes for frequently queried fields
- [ ] Enable query performance insights (Aurora)
- [ ] Configure read replicas if needed (Phase 3+)
- [ ] Implement query result caching

#### 3.3 Security Hardening

**AWS WAF (Optional - adds cost)**
- [ ] Create Web ACL
- [ ] Add rate limiting rules
- [ ] Block common attack patterns (SQL injection, XSS)
- [ ] Geo-blocking if desired

**Additional Security Measures**
- [ ] Enable AWS GuardDuty (threat detection)
- [ ] Configure AWS Config (compliance monitoring)
- [ ] Enable VPC Flow Logs
- [ ] Implement least-privilege IAM policies audit
- [ ] Set up AWS Security Hub for centralized security view
- [ ] Schedule regular security scanning with AWS Inspector

**Application-Level Security**
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Add request size limits
- [ ] Validate all input with Zod schemas
- [ ] Sanitize user-generated content
- [ ] Implement CSRF protection (already done)
- [ ] Add security headers (Helmet middleware - already done)
- [ ] Implement JWT token rotation
- [ ] Add suspicious activity monitoring

#### 3.4 Documentation & Portfolio Presentation

**Architecture Documentation**
- [ ] Create detailed architecture diagram (use draw.io, Lucidchart, or CloudCraft)
- [ ] Document all AWS services and their purpose
- [ ] Write deployment runbook
- [ ] Create troubleshooting guide
- [ ] Document cost breakdown and optimization strategies

**GitHub Repository Enhancements**
- [ ] Update main README with:
  - Architecture overview
  - Live demo links
  - Screenshots/GIFs of application
  - Technology stack badges
  - Deployment instructions
- [ ] Add ARCHITECTURE.md with detailed design decisions
- [ ] Add DEPLOYMENT.md with step-by-step deployment guide
- [ ] Include cost analysis document
- [ ] Add CONTRIBUTING.md if open-sourcing

**Portfolio Case Study**
- [ ] Write blog post or case study about the migration
- [ ] Include before/after architecture diagrams
- [ ] Discuss challenges and solutions
- [ ] Highlight cost optimization decisions
- [ ] Share performance metrics and improvements
- [ ] Post on LinkedIn with screenshots

**Demo Video**
- [ ] Record 3-5 minute walkthrough of application
- [ ] Show architecture diagram and explain design
- [ ] Demonstrate key features
- [ ] Show monitoring dashboards
- [ ] Discuss scalability and security measures

---

## Migration Strategy

### Pre-Migration Checklist
- [ ] Backup all local databases (MongoDB, PostgreSQL)
- [ ] Export environment variables to secure location
- [ ] Document all local configuration
- [ ] Test current application functionality (baseline)
- [ ] Review AWS account limits and quotas
- [ ] Set up AWS budget alerts
- [ ] Create staging environment first

### Migration Phases

#### Phase 1: Infrastructure Setup (Days 1-3)
1. **Day 1: Database Setup**
   - Morning: Create VPC, subnets, security groups
   - Afternoon: Deploy Aurora Serverless v2, migrate schema
   - Evening: Deploy DocumentDB, migrate auth data

2. **Day 2: Compute Services**
   - Morning: Optimize Dockerfiles for App Runner
   - Afternoon: Deploy LEGO API to App Runner
   - Evening: Deploy Auth Service to App Runner

3. **Day 3: Frontend & Integration**
   - Morning: Build and deploy frontend to S3/CloudFront
   - Afternoon: Configure cross-service communication
   - Evening: End-to-end testing

#### Phase 2: Automation (Days 4-5)
4. **Day 4: Infrastructure-as-Code**
   - Morning: Set up CDK project structure
   - Afternoon: Define network and database stacks
   - Evening: Define compute and frontend stacks

5. **Day 5: CI/CD Pipeline**
   - Morning: Create GitHub Actions workflows
   - Afternoon: Test automated deployments
   - Evening: Configure monitoring and alarms

#### Phase 3: Optimization (Days 6-7)
6. **Day 6: Performance & Security**
   - Morning: Custom domain setup
   - Afternoon: Performance optimization
   - Evening: Security hardening

7. **Day 7: Documentation & Polish**
   - Morning: Architecture documentation
   - Afternoon: Repository updates
   - Evening: Portfolio presentation materials

### Rollback Strategy

**Immediate Rollback (< 1 hour)**
If critical issues discovered during migration:
1. Update DNS to point to old infrastructure
2. Restore local Docker-compose environment
3. Restore database backups to local instances
4. Notify users of temporary maintenance (if applicable)

**Partial Rollback**
If specific service fails:
1. Identify failing service (Auth, LEGO API, or Frontend)
2. Roll back to previous App Runner deployment
3. Or revert to local service while others remain on AWS
4. Update environment variables to point to correct service

**Database Rollback**
If database migration issues:
1. Create new Aurora/DocumentDB instance from backup
2. Update connection strings in App Runner
3. Re-run migrations if schema issues
4. Monitor for data consistency

**Testing Rollback Plan**
- [ ] Document rollback steps in detail
- [ ] Test rollback in staging environment
- [ ] Time each rollback step
- [ ] Verify data integrity after rollback
- [ ] Create rollback decision matrix (what triggers rollback)

---

## Cost Analysis

### Detailed Cost Breakdown

#### Phase 1: Minimum Viable Production (MVP)
```yaml
Monthly Costs (Optimized for POC):

Compute:
  App Runner (LEGO API):
    Base: $12.00 (0.25 vCPU, 0.5GB, 1 instance 24/7)
    Scaling: $6.00 (occasional 2nd/3rd instance)
  App Runner (Auth):
    Base: $12.00 (0.25 vCPU, 0.5GB, 1 instance)
    Scaling: $3.00 (occasional 2nd instance)
  Subtotal: $33.00

Database:
  Aurora Serverless v2:
    Compute: $5.00 (0.5 ACU average)
    Storage: $0.50 (5GB @ $0.10/GB)
    I/O: $1.00 (low traffic)
  DocumentDB:
    Instance: $12.00 (t4g.medium, 1 instance)
    Storage: $0.50 (5GB @ $0.10/GB)
  Subtotal: $19.00

Storage & CDN:
  S3 (Frontend): $0.50 (10GB storage)
  S3 (File Uploads): $1.00 (20GB storage)
  CloudFront: $1.50 (50GB transfer)
  Subtotal: $3.00

Networking:
  Route 53: $0.50 (hosted zone)
  Domain: $1.00 (amortized $12/year)
  NAT Gateway: $3.50 (minimal traffic)
  Subtotal: $5.00

Monitoring:
  CloudWatch Logs: $0.50 (5GB ingested)
  CloudWatch Metrics: $0.50 (custom metrics)
  CloudWatch Alarms: $0.30 (3 alarms)
  Subtotal: $1.30

Secrets Management:
  Secrets Manager: $1.20 (3 secrets @ $0.40/month)

Total Phase 1: $62.50/month
```

#### Phase 1 Alternative: Ultra-Low-Cost MVP
```yaml
Cost Optimization Strategies:

1. Disable Elasticsearch:
   - Use PostgreSQL full-text search
   - Savings: $20.00/month

2. Disable Redis:
   - Use in-memory caching in App Runner
   - Savings: $11.00/month

3. Reduce App Runner Hours:
   - Pause services during nights (if POC only)
   - Savings: ~$10.00/month

4. Use Smaller DocumentDB:
   - Switch to t3.medium (from t4g.medium)
   - Savings: $3.00/month

Optimized Total: $38-45/month
```

#### Phase 2+: Production-Ready (If Scaling Up)
```yaml
Monthly Costs (Light Production Traffic):

Compute: $60 (increased instances)
Database: $40 (read replicas, increased ACU)
Storage & CDN: $15 (more traffic)
Networking: $20 (increased data transfer)
Redis: $11 (ElastiCache)
Elasticsearch: $20 (OpenSearch)
Monitoring: $5 (more logs and metrics)
Security: $10 (WAF, GuardDuty)

Total Phase 2: $181/month
```

### Cost Monitoring & Alerts

**Budget Setup**
```yaml
Monthly Budget: $50.00
Alerts:
  - 50% ($25): Email notification
  - 80% ($40): Email + review required
  - 100% ($50): Email + investigate immediately
  - 120% ($60): Block non-critical resource creation
```

**Cost Optimization Reviews**
- [ ] Weekly: Review AWS Cost Explorer
- [ ] Monthly: Analyze spending trends
- [ ] Quarterly: Right-size resources based on actual usage
- [ ] Continuous: Monitor for zombie resources (unused EBS, old snapshots)

### Cost Optimization Strategies

1. **Right-Sizing**
   - Monitor CPU/Memory utilization in CloudWatch
   - Downgrade instance types if usage < 30%
   - Reduce Aurora ACU if database CPU < 40%

2. **Auto-Scaling Optimization**
   - Adjust App Runner concurrency based on actual load
   - Set lower min instances during off-peak hours
   - Configure aggressive scale-down (1 minute cooldown)

3. **Storage Optimization**
   - Implement S3 Lifecycle policies (delete old uploads after 90 days)
   - Enable S3 Intelligent-Tiering for infrequently accessed files
   - Clean up old CloudWatch Logs (reduce retention to 7 days)

4. **Network Optimization**
   - Minimize cross-AZ traffic (keep services in same AZ)
   - Use VPC endpoints for AWS services (avoid NAT Gateway fees)
   - Enable CloudFront compression (reduce data transfer)

5. **Reserved Capacity (If Committed to AWS)**
   - Reserved Instances for DocumentDB (save 30-50%)
   - Savings Plans for compute (App Runner/Lambda)
   - Only if committed to 1+ year usage

---

## Risk Assessment & Mitigation

### Technical Risks

#### Risk 1: Database Connection Exhaustion
**Likelihood:** Medium | **Impact:** High

**Description:** Aurora Serverless and App Runner's auto-scaling may create too many database connections.

**Mitigation:**
- Configure connection pooling in Drizzle ORM (max 5 connections per App Runner instance)
- Use RDS Proxy (adds $15/month but solves connection pooling)
- Monitor active connections in CloudWatch
- Set connection limits in Aurora configuration

**Rollback:** Deploy RDS Proxy if connection issues occur.

#### Risk 2: Cold Start Latency
**Likelihood:** Medium | **Impact:** Medium

**Description:** App Runner instances may experience cold starts (2-5s) after scaling down.

**Mitigation:**
- Keep min instances = 1 for critical services
- Implement aggressive health check intervals (10s)
- Add loading states in frontend for slow initial requests
- Consider Lambda SnapStart alternative (if moving to Lambda)

**Monitoring:** Track cold start frequency in CloudWatch Logs.

#### Risk 3: Monorepo Build Complexity
**Likelihood:** High | **Impact:** Medium

**Description:** Building multi-package monorepo in Docker may be slow or fail.

**Mitigation:**
- Use multi-stage Dockerfiles to cache dependencies
- Implement Docker layer caching in CI/CD
- Pre-build shared packages and cache artifacts
- Consider moving to pre-built images in ECR

**Testing:** Build Docker images locally and in CI before deploying.

#### Risk 4: Cost Overruns
**Likelihood:** Medium | **Impact:** High

**Description:** Unexpected AWS costs exceed budget ($50/month).

**Mitigation:**
- Set up AWS Budget alerts at 50%, 80%, 100%
- Enable Cost Anomaly Detection (alerts on unusual spend)
- Review Cost Explorer weekly
- Implement service quotas to prevent runaway scaling
- Tag all resources for cost allocation

**Response Plan:** Immediately scale down or pause non-critical services if budget exceeded.

### Operational Risks

#### Risk 5: Data Loss During Migration
**Likelihood:** Low | **Impact:** Critical

**Description:** Data corruption or loss during database migration.

**Mitigation:**
- **Pre-Migration:**
  - Full backup of local MongoDB and PostgreSQL
  - Verify backup integrity (test restore)
  - Document all data schemas
- **During Migration:**
  - Use AWS DMS (Database Migration Service) for live replication
  - Perform migration during low-traffic window
  - Keep local databases running until verification complete
- **Post-Migration:**
  - Compare record counts (local vs. cloud)
  - Run data integrity checks
  - Keep local backups for 30 days

**Rollback:** Restore from backups and revert DNS to local environment.

#### Risk 6: Service Downtime During Deployment
**Likelihood:** Medium | **Impact:** Medium

**Description:** New deployments cause service outages.

**Mitigation:**
- Enable blue/green deployments in App Runner
- Implement health checks that fail fast on issues
- Test deployments in staging environment first
- Schedule deployments during off-peak hours (if applicable)
- Implement feature flags to disable new features if issues arise

**Monitoring:** Set up uptime monitoring (UptimeRobot free tier) with SMS alerts.

#### Risk 7: GitHub Actions CI/CD Failures
**Likelihood:** Medium | **Impact:** Medium

**Description:** CI/CD pipeline failures block deployments.

**Mitigation:**
- Implement comprehensive test coverage (target: > 80%)
- Add smoke tests that run post-deployment
- Enable manual approval for production deployments
- Document manual deployment process as fallback
- Use GitHub Actions matrix strategy for parallel builds

**Response Plan:** Manual deployment via AWS CLI if CI/CD unavailable.

### Security Risks

#### Risk 8: Exposed Secrets in Environment Variables
**Likelihood:** Low | **Impact:** Critical

**Description:** Sensitive credentials accidentally exposed in plain text.

**Mitigation:**
- **Never** commit secrets to Git (use `.env.example` templates)
- Store all secrets in AWS Secrets Manager
- Reference secrets by ARN in App Runner
- Enable AWS CloudTrail to audit secret access
- Rotate secrets every 90 days (automated)
- Use git-secrets pre-commit hook to prevent accidental commits

**Detection:** AWS Secrets Manager alerts on unusual access patterns.

#### Risk 9: Publicly Accessible Databases
**Likelihood:** Low | **Impact:** Critical

**Description:** Databases accidentally exposed to internet.

**Mitigation:**
- **Always** place databases in private subnets
- Configure security groups to allow ONLY App Runner SG
- Disable public accessibility flag on RDS/DocumentDB
- Enable VPC Flow Logs to detect unauthorized access attempts
- Run AWS Trusted Advisor security checks weekly

**Verification:** Attempt to connect to database from public IP (should fail).

#### Risk 10: DDoS or Abuse
**Likelihood:** Low | **Impact:** Medium

**Description:** Service abuse or attack causes high costs or downtime.

**Mitigation:**
- Implement rate limiting at multiple layers:
  - App Runner concurrency limits
  - Express rate-limit middleware (already implemented)
  - AWS WAF rate-based rules (optional)
- Set maximum auto-scaling limits (max 3 instances per service)
- Enable AWS Shield Standard (free, automatic)
- Monitor for unusual traffic patterns in CloudWatch

**Response Plan:** Temporarily disable service if abuse detected, investigate, implement stricter rate limits.

---

## Success Metrics

### Launch Criteria (Go/No-Go Decision)

**Must-Have (Blocking)**
- [ ] All services deployed and accessible via HTTPS
- [ ] Health checks passing for 1 hour continuously
- [ ] Database connections successful from all services
- [ ] User authentication flow working end-to-end
- [ ] File upload to S3 working
- [ ] Frontend communicating with backend APIs
- [ ] Zero critical security vulnerabilities
- [ ] Total monthly cost projection < $50

**Should-Have (Non-Blocking)**
- [ ] CI/CD pipeline functional
- [ ] CloudWatch dashboards created
- [ ] Custom domain configured
- [ ] Architecture documentation complete

**Nice-to-Have**
- [ ] Performance optimizations applied
- [ ] Blog post written
- [ ] Demo video recorded

### Performance Targets

**Application Performance**
- API Response Time:
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1000ms
- Frontend Load Time:
  - First Contentful Paint < 1.5s
  - Largest Contentful Paint < 2.5s
  - Time to Interactive < 3.5s
- Lighthouse Score: > 90 (all categories)

**Reliability Targets**
- Service Availability: > 99% uptime
- Error Rate: < 1% of requests
- Failed Deployments: < 5% of total deployments

**Cost Targets**
- Phase 1: $38-50/month
- Average cost per user (POC): N/A (single user)
- Cost per 1000 requests: < $0.10

### Portfolio Impact Metrics

**Quantitative**
- Number of AWS services utilized: 10+
- Lines of Infrastructure-as-Code: 1000+
- CI/CD pipeline execution time: < 10 minutes
- Deployment frequency: Multiple per week (after setup)

**Qualitative**
- Demonstrates cloud architecture skills
- Shows cost consciousness and optimization
- Proves ability to deliver production-grade infrastructure
- Highlights DevOps and automation expertise

---

## Maintenance & Operations

### Routine Maintenance Tasks

**Daily**
- [ ] Check CloudWatch alarms (automated notifications)
- [ ] Review error logs for critical issues

**Weekly**
- [ ] Review AWS Cost Explorer for spending trends
- [ ] Check service health metrics
- [ ] Review database performance insights
- [ ] Update dependencies with security patches

**Monthly**
- [ ] Review and right-size resources based on utilization
- [ ] Rotate secrets (automated via Lambda)
- [ ] Review and update documentation
- [ ] Analyze CloudWatch Logs Insights for patterns
- [ ] Test backup restore process

**Quarterly**
- [ ] Review security posture with AWS Trusted Advisor
- [ ] Update Node.js versions in Docker images
- [ ] Review and optimize auto-scaling configuration
- [ ] Conduct cost optimization review
- [ ] Update portfolio documentation with new metrics

### Incident Response Plan

**Severity Levels**
- **P0 (Critical)**: Service completely down, data loss risk
  - Response Time: Immediate
  - Escalation: Page on-call (yourself)

- **P1 (High)**: Major functionality broken, affecting all users
  - Response Time: < 1 hour
  - Escalation: Investigate ASAP

- **P2 (Medium)**: Partial functionality broken, workarounds available
  - Response Time: < 4 hours
  - Escalation: Schedule fix within 24 hours

- **P3 (Low)**: Minor issues, cosmetic problems
  - Response Time: < 24 hours
  - Escalation: Fix in next deployment cycle

**Incident Response Steps**
1. **Detect**: CloudWatch alarm or manual discovery
2. **Assess**: Determine severity and impact
3. **Communicate**: Update status page (if applicable)
4. **Mitigate**: Apply temporary fix or rollback
5. **Resolve**: Implement permanent fix
6. **Document**: Write incident post-mortem
7. **Improve**: Update monitoring and prevention measures

---

## Appendix

### A. Technology Stack Summary

**Frontend**
- React 19
- TypeScript 5.8
- Vite 6
- TanStack Router
- Redux Toolkit + RTK Query
- Tailwind CSS 4
- Radix UI

**Backend**
- Node.js 20
- Express.js
- TypeScript 5.8
- Drizzle ORM (PostgreSQL)
- Mongoose (MongoDB)
- Zod (validation)
- Winston (logging)

**Infrastructure**
- AWS App Runner
- Amazon Aurora Serverless v2 (PostgreSQL)
- Amazon DocumentDB (MongoDB-compatible)
- Amazon S3
- Amazon CloudFront
- AWS Secrets Manager
- Amazon CloudWatch
- AWS Route 53

**DevOps**
- Docker
- GitHub Actions
- AWS CDK (TypeScript)
- pnpm (package manager)
- Turborepo (monorepo build system)

### B. Useful AWS CLI Commands

```bash
# Check CloudWatch Logs
aws logs tail /aws/apprunner/lego-api-service --follow

# Describe App Runner service
aws apprunner describe-service --service-arn <arn>

# Update App Runner environment variable
aws apprunner update-service \
  --service-arn <arn> \
  --source-configuration file://config.json

# Check Aurora cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier lego-moc-db

# Check DocumentDB cluster status
aws docdb describe-db-clusters \
  --db-cluster-identifier auth-db

# List S3 buckets
aws s3 ls

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <id> \
  --paths "/*"

# Get current month-to-date costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

### C. Helpful Resources

**AWS Documentation**
- [App Runner Developer Guide](https://docs.aws.amazon.com/apprunner/)
- [Aurora Serverless v2 Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [DocumentDB Developer Guide](https://docs.aws.amazon.com/documentdb/)
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)

**Community Resources**
- [App Runner Pricing Calculator](https://calculator.aws/#/addService/AppRunner)
- [AWS CDK Examples](https://github.com/aws-samples/aws-cdk-examples)
- [AWS Cost Optimization Guide](https://aws.amazon.com/pricing/cost-optimization/)

**Portfolio Examples**
- [CloudCraft](https://www.cloudcraft.co/) - Architecture diagram tool
- [Lucidchart](https://www.lucidchart.com/) - Diagramming tool
- [Draw.io](https://www.drawio.com/) - Free diagramming tool

### D. Glossary

- **ACU (Aurora Capacity Unit)**: Unit of compute/memory for Aurora Serverless
- **App Runner**: AWS service for running containerized web apps without managing infrastructure
- **CDK (Cloud Development Kit)**: Infrastructure-as-Code framework using TypeScript/Python
- **CloudFront**: AWS CDN (Content Delivery Network)
- **DocumentDB**: AWS managed MongoDB-compatible database
- **ECR (Elastic Container Registry)**: Docker image registry on AWS
- **IaC (Infrastructure-as-Code)**: Managing infrastructure through code rather than manual configuration
- **RDS (Relational Database Service)**: AWS managed database service
- **VPC (Virtual Private Cloud)**: Isolated network in AWS cloud

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-26 | Michael Menard | Initial PRD creation |

---

## Approval & Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | Michael Menard | _____________ | ______ |
| Technical Lead | Michael Menard | _____________ | ______ |
| Budget Approver | Michael Menard | _____________ | ______ |

---

**END OF DOCUMENT**
