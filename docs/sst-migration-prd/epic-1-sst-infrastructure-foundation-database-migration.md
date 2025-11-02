# Epic 1: SST Infrastructure Foundation & Database Migration

**Epic Goal**: Establish the foundational serverless infrastructure using SST v3 including VPC networking, PostgreSQL RDS with Proxy, ElastiCache Redis, OpenSearch domain, and S3 buckets. Set up Drizzle ORM for schema management and migrations. Deploy a basic health check Lambda function to validate the entire stack connectivity and prove the infrastructure is operational.

## Story 1.1: Initialize SST v3 Project Structure

**As a** backend developer,
**I want** to initialize an SST v3 (Ion) project within the monorepo,
**so that** I have a structured foundation for defining serverless infrastructure.

**Acceptance Criteria**:

1. SST v3 project created at `/apps/api/lego-api-serverless/` with `sst.config.ts` configuration file
2. Package.json includes SST v3 dependencies and scripts for `dev`, `deploy`, `remove` commands
3. TypeScript configuration extends monorepo root with appropriate path aliases
4. Directory structure created: `src/functions/`, `src/lib/`, `src/types/`, `infrastructure/`
5. `.gitignore` updated to exclude SST artifacts (`.sst/`, `.build/`, etc.)
6. Turborepo configuration updated to include new SST workspace
7. Environment variable schema defined using Zod for local/dev/staging/production configurations
8. Documentation added explaining SST project structure and development workflow

## Story 1.2: Configure VPC Networking Infrastructure

**As a** DevOps engineer,
**I want** to provision a VPC with public/private subnets, NAT Gateway, and Internet Gateway,
**so that** Lambda functions can securely access RDS, Redis, and OpenSearch while maintaining internet connectivity.

**Acceptance Criteria**:

1. VPC created with CIDR block 10.0.0.0/16 using SST `aws.Vpc` component
2. Two Availability Zones configured for high availability
3. Public subnets (10.0.1.0/24, 10.0.2.0/24) with Internet Gateway routing
4. Private subnets (10.0.101.0/24, 10.0.102.0/24) with NAT Gateway routing
5. Security groups defined for RDS (port 5432), Redis (port 6379), OpenSearch (port 443), and Lambda egress
6. Bastion host configured in public subnet for database access during development (optional, can use SST tunneling)
7. VPC endpoints for S3 configured to avoid NAT Gateway costs for S3 traffic
8. All resources tagged with environment (dev/staging/production) and project name

## Story 1.3: Provision PostgreSQL RDS with RDS Proxy

**As a** backend developer,
**I want** to create an RDS PostgreSQL database with RDS Proxy,
**so that** Lambda functions can efficiently connect to the database with proper connection pooling.

**Acceptance Criteria**:

1. RDS PostgreSQL 15 instance provisioned using SST `aws.Postgres` component in private subnets
2. RDS Proxy configured with connection pooling (max connections: 100) for Lambda access
3. Database credentials stored in AWS Secrets Manager and rotated automatically
4. Security group rules allow Lambda functions to connect via RDS Proxy only (not direct RDS access)
5. Parameter group configured for PostgreSQL performance optimization
6. Automated backups enabled with 7-day retention
7. Database instance sized appropriately per environment (db.t4g.micro for dev, db.r6g.large for production)
8. SST resource linking configured so Lambda functions can access connection string via `Resource.MyPostgres`

## Story 1.4: Configure ElastiCache Redis Cluster

**As a** backend developer,
**I want** to provision an ElastiCache Redis cluster in the VPC,
**so that** Lambda functions can cache frequently accessed data.

**Acceptance Criteria**:

1. ElastiCache Redis 7.x cluster created in private subnets
2. Cluster mode disabled for dev, cluster mode enabled for production
3. Security group allows access from Lambda security group only
4. Redis configuration parameters set (maxmemory-policy: allkeys-lru)
5. Single node for dev, multi-node with automatic failover for production
6. SST resource linking provides Redis endpoint to Lambda functions via `Resource.MyRedis`
7. Connection parameters (host, port) accessible without hardcoding
8. Graceful fallback logic documented if Redis is unavailable

## Story 1.5: Provision OpenSearch Domain

**As a** backend developer,
**I want** to create an AWS OpenSearch domain for full-text search,
**so that** users can search MOCs, images, and wishlist items efficiently.

**Acceptance Criteria**:

1. OpenSearch 2.x domain provisioned in private subnets using SST component
2. Instance sizing: t3.small.search for dev, r6g.large.search for production
3. Security group restricts access to Lambda security group only
4. IAM-based authentication configured with fine-grained access control
5. Index templates pre-configured for `moc_instructions`, `gallery_images`, `wishlist_items`
6. SST resource linking provides OpenSearch endpoint via `Resource.MyOpenSearch`
7. Dedicated master nodes enabled for production environment
8. Automated snapshots configured with retention policy

## Story 1.6: Configure S3 Buckets and Lifecycle Policies

**As a** backend developer,
**I want** to configure S3 buckets for file storage with appropriate access policies,
**so that** MOC files, images, and avatars can be stored securely and efficiently.

**Acceptance Criteria**:

1. S3 bucket created or reused: `lego-moc-files-{stage}` (dev/staging/production)
2. Bucket versioning enabled for production, disabled for dev
3. Server-side encryption (SSE-S3) enabled by default
4. CORS configuration allows uploads from frontend domains
5. Lifecycle policy moves objects older than 90 days to Infrequent Access storage
6. Public read access blocked by default - presigned URLs used for secure access
7. SST resource linking provides bucket name via `Resource.MyBucket`
8. CloudFront distribution configured for CDN delivery (optional for MVP)

## Story 1.7: Implement Drizzle ORM Schema and Migrations

**As a** backend developer,
**I want** to migrate existing Drizzle schema definitions to the SST project,
**so that** database schema is managed via code with migration support.

**Acceptance Criteria**:

1. Existing Drizzle schema files copied to `/apps/api/lego-api-serverless/src/db/schema.ts`
2. `drizzle.config.ts` configured to access RDS credentials via SST `Resource.MyPostgres`
3. Drizzle Kit installed and npm scripts configured: `db:generate`, `db:migrate`, `db:push`, `db:studio`
4. All existing tables defined: `galleryImages`, `galleryAlbums`, `galleryFlags`, `mocInstructions`, `mocFiles`, `mocGalleryImages`, `mocGalleryAlbums`, `wishlistItems`, `mocPartsLists`
5. Migration files generated from schema and stored in `src/db/migrations/`
6. SST `DevCommand` configured to run Drizzle Studio during local development
7. Initial migration applied to dev database successfully
8. Database connection utility module created with connection pooling configuration

## Story 1.8: Create Health Check Lambda Function

**As a** backend developer,
**I want** to deploy a health check Lambda function with API Gateway endpoint,
**so that** I can validate the complete infrastructure stack is operational.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/health.ts` with TypeScript
2. Handler checks connectivity to RDS PostgreSQL (simple SELECT 1 query)
3. Handler checks connectivity to Redis (PING command)
4. Handler checks connectivity to OpenSearch (cluster health API)
5. API Gateway HTTP API endpoint configured: `GET /health`
6. Response format includes status (healthy/degraded/unhealthy) and individual component status
7. CloudWatch Logs capture all health check execution logs
8. Function executes successfully via `sst dev` local testing
9. Function deploys successfully via `sst deploy --stage dev`
10. Endpoint accessible via public URL and returns healthy status with all services green

---
