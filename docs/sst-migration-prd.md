# LEGO Projects API - Serverless Migration to SST (Ion v3)
## Product Requirements Document (PRD)

---

## Goals and Background Context

### Goals

- **Cost Reduction**: Eliminate continuous server costs by migrating from ECS Fargate to Lambda-based serverless architecture
- **Scalability**: Achieve automatic scaling based on demand without manual intervention
- **Developer Experience**: Improve local development workflow with SST's Live Lambda Development
- **Infrastructure Simplification**: Consolidate infrastructure as code using SST v3 (Ion) with TypeScript
- **Zero Downtime Migration**: Execute a phased rollout strategy ensuring no service disruption
- **Maintain Feature Parity**: Preserve all existing API functionality during and after migration
- **Performance Optimization**: Leverage serverless patterns for improved cold start times and response latency

### Background Context

The LEGO Projects API currently runs as a containerized Express.js application on AWS ECS Fargate with supporting infrastructure including PostgreSQL (RDS), Redis (ElastiCache), Elasticsearch/OpenSearch, and S3 for file storage. While functional, this architecture incurs continuous compute costs regardless of actual usage patterns.

SST v3 (Ion) represents a modern infrastructure-as-code framework built on Pulumi that enables full-stack serverless applications on AWS. By migrating to SST, we can reduce operational costs, improve scalability, and enhance the developer experience with features like Live Lambda Development. The existing API already uses AWS Cognito for authentication and has clear separation between routes and handlers, making it well-suited for serverless decomposition.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-02 | 1.0 | Initial PRD creation for SST migration | Winston (Architect Agent) |

---

## Requirements

### Functional Requirements

**FR1**: The migrated API must maintain 100% backward compatibility with existing frontend clients - all endpoints, request/response formats, and authentication flows must remain unchanged.

**FR2**: The system must support all existing CRUD operations for MOC instructions, gallery images, wishlist items, and user profiles with identical business logic.

**FR3**: File upload functionality must preserve existing validation rules (file types, sizes, virus scanning) and store files in S3 with the same URL structure.

**FR4**: Image processing operations (resizing, optimization via Sharp) must execute within Lambda's constraints or be offloaded to appropriate compute resources.

**FR5**: Search functionality via Elasticsearch/OpenSearch must remain available with fallback to PostgreSQL queries when search service is unavailable.

**FR6**: Redis caching layer must continue to function for frequently accessed data with configurable TTL policies.

**FR7**: CSRF protection and security headers must be maintained across all state-changing operations.

**FR8**: Rate limiting must continue to protect against abuse with configurable limits per endpoint category (general, auth, upload).

**FR9**: The API must support both cookie-based and Bearer token authentication schemes for AWS Cognito JWT validation.

**FR10**: Database migrations must execute reliably using Drizzle ORM with rollback capabilities.

**FR11**: All existing API routes must be preserved: `/api/images`, `/api/albums`, `/api/mocs`, `/api/users`, `/api/wishlist`.

**FR12**: Health check endpoints must support container orchestration and monitoring tools.

### Non-Functional Requirements

**NFR1**: Lambda cold start times must not exceed 2 seconds for the 99th percentile of requests.

**NFR2**: API response times must remain within ±20% of current performance benchmarks under equivalent load.

**NFR3**: The infrastructure must support multiple deployment environments (dev, staging, production) via SST stages.

**NFR4**: All infrastructure must be defined as code in TypeScript using SST v3 components.

**NFR5**: The solution must leverage AWS free tier resources where possible to minimize development costs.

**NFR6**: Secrets and credentials must never be hardcoded - all sensitive values must use AWS Systems Manager Parameter Store or Secrets Manager.

**NFR7**: Lambda functions must be sized appropriately with configurable memory (512MB-3GB) and timeout (30s-900s) based on endpoint requirements.

**NFR8**: VPC configuration must allow Lambda functions to access RDS PostgreSQL while maintaining internet connectivity via NAT Gateway.

**NFR9**: Database connections must use RDS Proxy to handle serverless connection pooling efficiently.

**NFR10**: The solution must include comprehensive error logging and distributed tracing via AWS CloudWatch and X-Ray.

**NFR11**: Deployment must be fully automated via CI/CD pipeline with automated rollback on failure.

**NFR12**: The monorepo structure must be preserved - SST infrastructure lives within the existing project structure.

**NFR13**: Local development must support hot reload and debugging via SST's Live Lambda Development feature.

**NFR14**: Cost monitoring must be implemented with alerts for unexpected spending beyond defined thresholds.

---

## Technical Assumptions

### Repository Structure: **Monorepo (Existing Turborepo)**

The SST infrastructure will be added to the existing monorepo structure:
- SST config: `/apps/api/lego-api-serverless/sst.config.ts`
- Lambda handlers: `/apps/api/lego-api-serverless/src/functions/`
- Shared code: Continue using `@monorepo/file-validator`, `@repo/upload` packages
- Migration will NOT create a separate repository

### Service Architecture: **Serverless (Lambda + API Gateway)**

**Migration Strategy**: Phased approach with parallel deployments

**Phase 1 - Infrastructure Foundation**:
- SST v3 project initialization
- PostgreSQL RDS with RDS Proxy configuration
- ElastiCache Redis cluster in VPC
- OpenSearch domain configuration
- VPC with private subnets, NAT Gateway, and Bastion host
- S3 buckets for file storage (reuse existing)

**Phase 2 - Core API Lambda Functions**:
- Health check endpoint (warmup function)
- MOC Instructions CRUD operations
- Gallery Images CRUD operations
- Wishlist CRUD operations
- User Profile operations

**Phase 3 - Advanced Features**:
- File upload handlers with S3 integration
- Image processing (Sharp in Lambda or Step Functions)
- CSV parsing for parts lists
- Elasticsearch indexing operations

**Phase 4 - Migration & Cutover**:
- Blue/Green deployment with Route53 weighted routing
- Progressive traffic shifting (10% → 50% → 100%)
- Monitoring and validation
- Decommission ECS infrastructure

**Rationale**: Lambda with API Gateway provides automatic scaling, pay-per-use pricing, and native AWS integrations. RDS Proxy solves connection pooling challenges inherent in serverless architectures. The phased approach minimizes risk while maintaining service availability.

### Testing Requirements: **Full Testing Pyramid**

**Unit Tests**:
- All Lambda handler functions
- Business logic in shared packages
- Database query builders
- Utility functions

**Integration Tests**:
- API endpoint tests using actual AWS resources (LocalStack for CI)
- Database integration via test database
- S3 upload/download workflows
- Cache invalidation patterns

**E2E Tests**:
- Existing Playwright tests must pass against new serverless endpoints
- Authentication flows via AWS Cognito
- Complete user journeys (create MOC → upload files → retrieve)

**Load Testing**:
- Concurrent request handling
- Cold start mitigation validation
- Connection pool saturation tests

**Rationale**: Serverless introduces new failure modes (cold starts, VPC timeouts, connection limits). Comprehensive testing ensures reliability and performance meet requirements.

### Language & Framework Stack

**Infrastructure as Code**: SST v3 (Ion) with TypeScript
- **Rationale**: Type-safe infrastructure, unified development experience, Pulumi-backed with 150+ cloud providers

**Runtime**: Node.js 20 (matches existing API)
- **Rationale**: Maintain compatibility with existing codebase, leverage fast cold start times

**API Framework**: Direct Lambda handlers (not Express in Lambda)
- **Rationale**: Avoid Express overhead in Lambda; reduce cold start time and memory footprint
- **Pattern**: Extract route handlers into focused Lambda functions using shared business logic

**ORM**: Continue using Drizzle ORM
- **Rationale**: Existing schema definitions, lightweight, PostgreSQL-focused with excellent TypeScript support
- SST provides native Drizzle integration for migrations

**Validation**: Continue using Zod schemas
- **Rationale**: Runtime type safety for API payloads, integrates with Drizzle for end-to-end type safety

**Bundling**: SST uses esbuild by default
- **Rationale**: Extremely fast builds, tree-shaking, minification out of the box

### Database Configuration

**PostgreSQL RDS**: Aurora Serverless v2 (preferred) or RDS PostgreSQL with RDS Proxy
- **Cluster Configuration**: Multi-AZ for production, single-AZ for dev/staging
- **RDS Proxy**: Required for connection pooling (Lambda best practice)
- **Migrations**: Drizzle Kit via SST's migration component
- **Connection**: Via Data API (for simple queries) and direct connections through Proxy

**Redis**: ElastiCache in VPC
- **Deployment**: Single node for dev, cluster mode for production
- **Access**: Lambda functions in VPC access directly
- **Fallback**: Graceful degradation when Redis unavailable

**Elasticsearch/OpenSearch**: AWS OpenSearch in VPC
- **Deployment**: Single node for dev, multi-node for production
- **Access**: Lambda functions in VPC with IAM-based authentication
- **Fallback**: PostgreSQL full-text search when unavailable

### Additional Technical Assumptions and Requests

**SST Resource Linking**: Use SST's `Resource` object for runtime access to infrastructure values (database credentials, S3 buckets, Redis endpoints) - no hardcoded configuration.

**Lambda Layer Strategy**: Create shared layer for node_modules dependencies (Sharp, AWS SDK, common packages) to reduce individual function bundle sizes.

**API Gateway Configuration**:
- HTTP API (v2) for lower latency and cost vs REST API
- JWT authorizer integrated with AWS Cognito User Pool
- CORS configuration matching existing ECS setup

**Monitoring & Observability**:
- AWS CloudWatch Logs for all Lambda functions
- AWS X-Ray for distributed tracing
- Custom CloudWatch Metrics for business KPIs
- CloudWatch Alarms for error rates, cold starts, and latency

**CI/CD Pipeline**:
- Existing GitHub Actions workflow extended to support SST deployment
- Separate workflows for each stage (dev → staging → production)
- Automated testing gates before deployment
- Rollback automation on deployment failure

**Cost Controls**:
- Lambda reserved concurrency limits to prevent runaway costs
- CloudWatch budget alerts
- S3 lifecycle policies for old uploads
- RDS/OpenSearch instance sizing appropriate to workload

**Security Hardening**:
- Lambda execution role with least-privilege IAM policies
- VPC security groups restricting database access to Lambda functions only
- S3 bucket policies enforcing encryption at rest and in transit
- WAF rules on API Gateway for common attack patterns

**Development Workflow**:
- `sst dev` for local development with Live Lambda
- `sst deploy --stage dev` for shared dev environment
- `sst deploy --stage staging` for pre-production validation
- `sst deploy --stage production` for production releases
- SST Console integration (optional) for team collaboration

---

## Epic List

### Epic 1: SST Infrastructure Foundation & Database Migration
**Goal**: Establish SST v3 project structure, configure VPC, RDS PostgreSQL with Proxy, ElastiCache Redis, and OpenSearch. Implement Drizzle migrations and validate database connectivity from Lambda. Deploy a basic health check endpoint to verify end-to-end infrastructure.

### Epic 2: Core MOC Instructions API Migration
**Goal**: Migrate all MOC Instructions CRUD operations to Lambda functions with API Gateway routes. Implement authentication, validation, caching, and Elasticsearch indexing. Ensure complete feature parity with existing Express endpoints.

### Epic 3: Gallery & Wishlist APIs Migration
**Goal**: Migrate Gallery Images and Wishlist APIs to serverless architecture including file upload handlers, S3 integration, image processing, and Redis caching. Validate all CRUD operations and search functionality.

### Epic 4: User Profile & Advanced Features Migration
**Goal**: Migrate user profile operations (avatar upload, profile management) and implement advanced features including CSV parts list parsing, multi-file uploads, and comprehensive error handling.

### Epic 5: Production Deployment, Monitoring & Cutover
**Goal**: Implement production-grade monitoring, alerting, and logging. Execute blue/green deployment strategy with progressive traffic shifting. Decommission legacy ECS infrastructure after validation.

---

## Epic 1: SST Infrastructure Foundation & Database Migration

**Epic Goal**: Establish the foundational serverless infrastructure using SST v3 including VPC networking, PostgreSQL RDS with Proxy, ElastiCache Redis, OpenSearch domain, and S3 buckets. Set up Drizzle ORM for schema management and migrations. Deploy a basic health check Lambda function to validate the entire stack connectivity and prove the infrastructure is operational.

### Story 1.1: Initialize SST v3 Project Structure

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

### Story 1.2: Configure VPC Networking Infrastructure

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

### Story 1.3: Provision PostgreSQL RDS with RDS Proxy

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

### Story 1.4: Configure ElastiCache Redis Cluster

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

### Story 1.5: Provision OpenSearch Domain

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

### Story 1.6: Configure S3 Buckets and Lifecycle Policies

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

### Story 1.7: Implement Drizzle ORM Schema and Migrations

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

### Story 1.8: Create Health Check Lambda Function

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

## Epic 2: Core MOC Instructions API Migration

**Epic Goal**: Migrate all MOC Instructions CRUD operations from Express routes to Lambda functions including creation, retrieval (list and detail), update, deletion, file uploads, and search functionality. Implement authentication, request validation, caching, and Elasticsearch indexing while maintaining complete backward compatibility with existing API contracts.

### Story 2.1: Create MOC Instructions Lambda Handler Foundation

**As a** backend developer,
**I want** to create a Lambda handler for MOC Instructions operations,
**so that** I have a foundation for implementing CRUD operations in a serverless environment.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/moc-instructions.ts` with multi-method handler (switch on `event.requestContext.http.method`)
2. Shared utilities extracted to `src/lib/` for database client, response formatting, error handling
3. AWS SDK v3 clients initialized for S3, Secrets Manager as needed
4. Drizzle database client instantiated with RDS Proxy connection string from `Resource.MyPostgres`
5. Redis client created using `Resource.MyRedis` endpoint
6. OpenSearch client initialized with `Resource.MyOpenSearch` endpoint and IAM authentication
7. API Gateway HTTP API configured with `/api/mocs` route and `{id}` path parameter
8. JWT authorizer configured using AWS Cognito User Pool (existing)
9. Environment variable access via SST resource linking (no hardcoded values)
10. TypeScript types defined for MOC entities matching existing schema

### Story 2.2: Implement GET /api/mocs - List All MOCs

**As a** user,
**I want** to retrieve a paginated list of all my MOC instructions,
**so that** I can browse my collection.

**Acceptance Criteria**:

1. Lambda handler implements `GET /api/mocs` with query parameters: `page`, `limit`, `search`, `tag`
2. User ID extracted from JWT token via `event.requestContext.authorizer.jwt.claims.sub`
3. Query builder uses Drizzle to filter `mocInstructions` table by `userId`
4. Pagination implemented with default `limit=20` and `page=1`
5. Search query triggers OpenSearch full-text search if available, falls back to PostgreSQL `ILIKE` query
6. Tag filtering applies to `tags` JSONB column
7. Results include MOC metadata: `id`, `title`, `description`, `thumbnailUrl`, `type`, `createdAt`
8. Response cached in Redis with TTL 5 minutes using key pattern `moc:user:{userId}:list:{page}:{limit}`
9. Cache invalidation on any MOC creation/update/deletion
10. Response format matches existing API contract: `{ success: true, data: [...], total: number, page: number }`
11. Error handling returns appropriate HTTP status codes (400, 401, 500)

### Story 2.3: Implement GET /api/mocs/:id - Retrieve MOC Detail

**As a** user,
**I want** to retrieve full details of a specific MOC,
**so that** I can view all associated files, images, and parts lists.

**Acceptance Criteria**:

1. Lambda handler implements `GET /api/mocs/{id}` path parameter extraction
2. Query includes eager loading of relationships: `mocFiles`, `galleryImages`, `partsLists` via Drizzle relations
3. Authorization check ensures `userId` from JWT matches MOC owner
4. Response includes all MOC fields plus related entities
5. Results cached in Redis with TTL 10 minutes using key pattern `moc:detail:{mocId}`
6. Cache hit logged for monitoring
7. 404 response if MOC not found
8. 403 response if user does not own the MOC
9. Response format: `{ success: true, data: { ...moc, files: [...], images: [...], partsLists: [...] } }`

### Story 2.4: Implement POST /api/mocs - Create New MOC

**As a** user,
**I want** to create a new MOC instruction entry,
**so that** I can start building my collection.

**Acceptance Criteria**:

1. Lambda handler implements `POST /api/mocs` with request body validation using Zod schema
2. Required fields validated: `title`, `type` (moc|set), `description` (optional)
3. Type-specific field validation (MOC requires `author`, `partsCount`; Set requires `brand`, `setNumber`)
4. User ID from JWT automatically assigned to `userId` field
5. Business rule enforced: unique MOC title per user (check via database unique index)
6. Transaction used to insert into `mocInstructions` table and return created record
7. Created MOC indexed in OpenSearch asynchronously (non-blocking)
8. Redis cache invalidated for user's MOC list
9. Response format: `{ success: true, data: { id, title, ... }, statusCode: 201 }`
10. Duplicate title returns 409 Conflict with clear error message
11. Validation errors return 400 with field-level error details

### Story 2.5: Implement PATCH /api/mocs/:id - Update MOC

**As a** user,
**I want** to update an existing MOC's metadata,
**so that** I can correct information or add details.

**Acceptance Criteria**:

1. Lambda handler implements `PATCH /api/mocs/{id}` with partial update support
2. Request body validated using Zod schema (all fields optional)
3. Authorization check: user must own the MOC
4. Update query modifies only provided fields, sets `updatedAt` timestamp
5. Business logic validates type-specific fields (e.g., can't add `brand` to MOC type)
6. Transaction ensures atomic update with optimistic locking check
7. Updated MOC re-indexed in OpenSearch
8. Redis caches invalidated: detail cache for MOC, list cache for user
9. Response format: `{ success: true, data: { ...updated MOC } }`
10. 404 if MOC not found, 403 if not owner, 400 for validation errors

### Story 2.6: Implement DELETE /api/mocs/:id - Delete MOC

**As a** user,
**I want** to delete a MOC from my collection,
**so that** I can remove entries I no longer need.

**Acceptance Criteria**:

1. Lambda handler implements `DELETE /api/mocs/{id}`
2. Authorization check: user must own the MOC
3. Cascade deletion of related records via database foreign key constraints (files, images, parts lists)
4. S3 files referenced in `mocFiles` table deleted via batch `DeleteObjectCommand`
5. OpenSearch document deleted from `moc_instructions` index
6. Redis caches invalidated (detail and list caches)
7. Transaction ensures all-or-nothing deletion
8. Response format: `{ success: true, message: "MOC deleted successfully" }`
9. 404 if MOC not found, 403 if not owner
10. Error logged but user notified on success even if S3/OpenSearch cleanup fails

### Story 2.7: Implement MOC File Upload Handler

**As a** user,
**I want** to upload instruction files and parts lists to a MOC,
**so that** I can attach documentation to my creations.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/moc-file-upload.ts` for `POST /api/mocs/{id}/files`
2. Multipart form data parsing using `busboy` or similar library (no Multer)
3. File validation: max size 10MB, allowed types (PDF, XML, CSV per `@monorepo/file-validator`)
4. Virus scanning integrated (ClamAV Lambda layer or S3 + Lambda trigger pattern)
5. File uploaded to S3 with key pattern: `mocs/{userId}/{mocId}/{uuid}.{ext}`
6. MOC ownership verified before accepting upload
7. Database record inserted into `mocFiles` table with metadata: `fileType`, `fileUrl`, `originalFilename`, `mimeType`
8. Lambda timeout set to 60 seconds to accommodate large files
9. Lambda memory configured at 1024 MB for file processing
10. Response format: `{ success: true, data: { fileId, fileUrl, ... } }`
11. Error handling for upload failures, S3 errors, database errors

### Story 2.8: Implement MOC Search with Elasticsearch

**As a** user,
**I want** to search my MOCs by keywords in titles, descriptions, and tags,
**so that** I can quickly find specific builds.

**Acceptance Criteria**:

1. Search functionality integrated into `GET /api/mocs` handler via `search` query parameter
2. OpenSearch query constructed with multi-match across fields: `title^3`, `description`, `tags^2`
3. Fuzziness enabled (`AUTO`) for typo tolerance
4. User ID filter applied (user can only search their own MOCs)
5. Results sorted by relevance score (descending) then `updatedAt` (descending)
6. Pagination supported (from/size parameters)
7. Fallback to PostgreSQL `ts_vector` full-text search if OpenSearch unavailable
8. Search results mapped to standard MOC response format
9. Query performance logged for monitoring
10. Response includes total hit count: `{ success: true, data: [...], total: number }`

---

## Epic 3: Gallery & Wishlist APIs Migration

**Epic Goal**: Migrate Gallery Images and Wishlist APIs to serverless Lambda functions including image upload with Sharp processing, album management, wishlist CRUD operations, Redis caching, and Elasticsearch search. Ensure all image processing operations respect Lambda constraints and implement appropriate error handling.

### Story 3.1: Create Gallery Images Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for gallery image operations,
**so that** users can manage their LEGO image collections via serverless functions.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/gallery.ts` for gallery operations
2. API Gateway routes configured: `GET /api/images`, `GET /api/images/{id}`, `POST /api/images`, `PATCH /api/images/{id}`, `DELETE /api/images/{id}`
3. JWT authorizer attached to all routes
4. Database client configured with access to `galleryImages`, `galleryAlbums`, `galleryFlags` tables
5. S3 client initialized for image storage operations
6. Redis client configured for caching
7. OpenSearch client for search indexing
8. Response utilities shared from core lib
9. TypeScript types defined for Gallery entities

### Story 3.2: Implement POST /api/images - Upload Gallery Image

**As a** user,
**I want** to upload images to my gallery,
**so that** I can organize photos of my LEGO builds.

**Acceptance Criteria**:

1. Lambda handler for `POST /api/images` with multipart form data parsing
2. Image validation: file types (JPEG, PNG, WebP), max size 10MB (via `@monorepo/file-validator`)
3. Sharp image processing pipeline: resize to max 2048px width, optimize quality (80%), convert to WebP
4. Processed image uploaded to S3: `images/{userId}/{uuid}.webp`
5. Thumbnail generated (400px width) and stored: `images/{userId}/thumbnails/{uuid}.webp`
6. Database record created in `galleryImages` with metadata from form: `title`, `description`, `tags`, `albumId`
7. Image indexed in OpenSearch `gallery_images` index
8. Redis cache invalidated for user's gallery list
9. Lambda memory: 2048 MB (for Sharp processing), timeout: 60 seconds
10. Response format: `{ success: true, data: { id, imageUrl, thumbnailUrl, ... } }`
11. Error handling for image processing failures, S3 upload errors

### Story 3.3: Implement Gallery Image CRUD Operations

**As a** user,
**I want** to view, update, and delete my gallery images,
**so that** I can manage my photo collection.

**Acceptance Criteria**:

1. `GET /api/images` returns paginated list of user's standalone images (no albumId) with caching
2. `GET /api/images/{id}` returns single image details with ownership check
3. `PATCH /api/images/{id}` updates metadata (title, description, tags, albumId) with validation
4. `DELETE /api/images/{id}` removes database record and deletes S3 objects (image + thumbnail)
5. All operations verify ownership via JWT userId
6. Redis caching with key patterns: `gallery:images:user:{userId}`, `gallery:image:detail:{imageId}`
7. Cache invalidation on mutations
8. OpenSearch index updated on metadata changes, document deleted on image deletion
9. Response formats match existing API contracts
10. Error handling: 404 not found, 403 forbidden, 400 validation errors

### Story 3.4: Implement Album Management Operations

**As a** user,
**I want** to create albums and organize images into them,
**so that** I can categorize my photos by project or theme.

**Acceptance Criteria**:

1. Lambda routes configured: `GET /api/albums`, `GET /api/albums/{id}`, `POST /api/albums`, `PATCH /api/albums/{id}`, `DELETE /api/albums/{id}`
2. `POST /api/albums` creates album with `title`, `description`, optional `coverImageId`
3. `GET /api/albums` returns user's albums with image count and cover image URL
4. `GET /api/albums/{id}` returns album details with all contained images (eager load via relations)
5. `PATCH /api/albums/{id}` updates album metadata with validation
6. `DELETE /api/albums/{id}` removes album, sets `albumId=null` for contained images (does not delete images)
7. Ownership validation on all operations
8. Redis caching for album lists and detail views
9. OpenSearch indexing for albums with type `album`
10. Response formats consistent with existing API

### Story 3.5: Create Wishlist Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for wishlist operations,
**so that** users can manage their LEGO set wish lists.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/wishlist.ts`
2. API Gateway routes: `GET /api/wishlist`, `GET /api/wishlist/{id}`, `POST /api/wishlist`, `PATCH /api/wishlist/{id}`, `DELETE /api/wishlist/{id}`, `POST /api/wishlist/reorder`
3. Database client configured with `wishlistItems` table access
4. S3 client for wishlist image uploads
5. Redis and OpenSearch clients configured
6. TypeScript types defined for Wishlist entities

### Story 3.6: Implement Wishlist CRUD Operations

**As a** user,
**I want** to add, view, update, and delete items from my wishlist,
**so that** I can track LEGO sets I want to acquire.

**Acceptance Criteria**:

1. `POST /api/wishlist` creates item with fields: `title`, `description`, `productLink`, `imageUrl`, `category`, `sortOrder`
2. `GET /api/wishlist` returns all user's items sorted by `sortOrder` with optional `category` filter
3. `GET /api/wishlist/{id}` returns single item with ownership check
4. `PATCH /api/wishlist/{id}` updates item metadata with validation
5. `DELETE /api/wishlist/{id}` removes item and S3 image if present
6. `POST /api/wishlist/reorder` updates `sortOrder` for multiple items in batch transaction
7. Image upload support via separate endpoint `POST /api/wishlist/{id}/image` using Sharp processing
8. Redis caching with pattern: `wishlist:user:{userId}:all`
9. OpenSearch indexing for wishlist search by title, description, category
10. All operations validate ownership and return appropriate errors

### Story 3.7: Implement Wishlist Image Upload

**As a** user,
**I want** to upload images for wishlist items,
**so that** I can visualize the sets I'm tracking.

**Acceptance Criteria**:

1. Lambda handler for `POST /api/wishlist/{id}/image` with multipart parsing
2. Image validation: JPEG/PNG/WebP, max 5MB
3. Sharp processing: resize to max 800px, optimize quality, convert to WebP
4. Upload to S3: `wishlist/{userId}/{itemId}.webp`
5. Database `wishlistItems.imageUrl` updated with S3 URL
6. Previous image deleted from S3 if exists
7. Lambda memory 1024 MB for Sharp processing
8. Redis cache invalidated for wishlist
9. Response: `{ success: true, data: { imageUrl } }`
10. Error handling for processing and upload failures

### Story 3.8: Implement Gallery and Wishlist Search

**As a** user,
**I want** to search my gallery and wishlist by keywords,
**so that** I can quickly find specific items.

**Acceptance Criteria**:

1. `GET /api/images?search=query` searches gallery via OpenSearch multi-match on `title`, `description`, `tags`
2. `GET /api/wishlist?search=query` searches wishlist via OpenSearch multi-match on `title`, `description`, `category`
3. User ID filter enforced (search only own items)
4. Fallback to PostgreSQL `ILIKE` queries if OpenSearch unavailable
5. Search results paginated with `page` and `limit` parameters
6. Fuzzy matching enabled for typo tolerance
7. Results sorted by relevance score
8. Response includes total hits: `{ success: true, data: [...], total: number }`
9. Search performance metrics logged
10. Cache search results in Redis with short TTL (2 minutes)

---

## Epic 4: User Profile & Advanced Features Migration

**Epic Goal**: Migrate user profile operations including avatar upload and management, implement CSV parts list parsing for MOCs with batch processing, support multi-file uploads for MOC instructions, and add comprehensive error handling with retry logic for external service failures.

### Story 4.1: Create User Profile Lambda Handler

**As a** backend developer,
**I want** to create Lambda handlers for user profile operations,
**so that** users can manage their account settings and avatars.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/profile.ts`
2. API Gateway routes: `GET /api/users/{id}`, `PATCH /api/users/{id}`, `POST /api/users/{id}/avatar`, `DELETE /api/users/{id}/avatar`
3. JWT authorizer validates user can only access their own profile (userId match)
4. Note: User profiles stored in AWS Cognito, not PostgreSQL - Lambda queries Cognito User Pool for profile data
5. S3 client configured for avatar storage
6. Redis client for profile caching
7. TypeScript types for Cognito user attributes

### Story 4.2: Implement GET /api/users/:id - Retrieve User Profile

**As a** user,
**I want** to view my profile information,
**so that** I can see my account details and avatar.

**Acceptance Criteria**:

1. Lambda handler queries AWS Cognito User Pool via `AdminGetUserCommand`
2. Authorization: userId from JWT must match route parameter `:id`
3. User attributes extracted: `sub`, `email`, `name`, `picture` (avatar URL)
4. Response includes aggregated statistics: total MOCs, total gallery images, total wishlist items (queries PostgreSQL)
5. Profile data cached in Redis with key: `profile:user:{userId}`, TTL 10 minutes
6. Response format: `{ success: true, data: { id, email, name, avatarUrl, stats: { mocs, images, wishlistItems } } }`
7. 403 if user attempts to access another user's profile
8. 404 if user not found in Cognito

### Story 4.3: Implement PATCH /api/users/:id - Update User Profile

**As a** user,
**I want** to update my profile information,
**so that** I can keep my details current.

**Acceptance Criteria**:

1. Lambda handler accepts `name` field update (other Cognito attributes managed via Cognito console)
2. Validation: `name` must be 1-100 characters, alphanumeric + spaces
3. Update via `AdminUpdateUserAttributesCommand` to Cognito User Pool
4. Authorization: userId match enforced
5. Redis cache invalidated for user profile
6. Response format: `{ success: true, data: { ...updated profile } }`
7. 400 for validation errors, 403 for unauthorized, 500 for Cognito API errors

### Story 4.4: Implement POST /api/users/:id/avatar - Upload Avatar

**As a** user,
**I want** to upload a profile avatar,
**so that** I can personalize my account.

**Acceptance Criteria**:

1. Lambda handler for avatar upload with multipart parsing
2. Image validation: JPEG/PNG/GIF, max 2MB size
3. Sharp processing: crop to square (1:1 aspect ratio), resize to 256x256, optimize, convert to WebP
4. Upload to S3: `avatars/{userId}/avatar.webp` (overwrites previous)
5. Cognito user attribute `picture` updated with S3 URL via `AdminUpdateUserAttributesCommand`
6. Previous avatar deleted from S3 if exists
7. Lambda memory 1024 MB for Sharp processing
8. Redis cache invalidated for user profile
9. Response: `{ success: true, data: { avatarUrl } }`
10. 403 if userId mismatch, 400 for invalid image

### Story 4.5: Implement DELETE /api/users/:id/avatar - Remove Avatar

**As a** user,
**I want** to remove my profile avatar,
**so that** I can revert to a default image.

**Acceptance Criteria**:

1. Lambda handler deletes avatar from S3: `avatars/{userId}/avatar.webp`
2. Cognito user attribute `picture` set to null via `AdminUpdateUserAttributesCommand`
3. Authorization: userId match enforced
4. Redis cache invalidated
5. Response: `{ success: true, message: "Avatar removed" }`
6. 403 if userId mismatch
7. Success returned even if no avatar exists

### Story 4.6: Implement CSV Parts List Parser Lambda

**As a** user,
**I want** to upload a CSV parts list for a MOC,
**so that** the system can parse and store part details automatically.

**Acceptance Criteria**:

1. Lambda function created at `src/functions/parse-parts-list.ts` for `POST /api/mocs/{id}/upload-parts-list`
2. CSV file uploaded to S3 first, Lambda triggered via S3 event or invoked directly with S3 key
3. CSV parsing using `csv-parser` library (existing dependency)
4. Expected CSV format: columns for `Part ID`, `Part Name`, `Quantity`, `Color`
5. Validation: file must be valid CSV, max 10,000 rows
6. Parsed data stored in `mocPartsLists` table with fields populated from CSV
7. Parts count aggregated and MOC's `totalPieceCount` updated
8. Lambda timeout: 5 minutes (for large CSV files)
9. Lambda memory: 512 MB
10. Response: `{ success: true, data: { totalParts, partsListId } }`
11. Error handling for malformed CSV, invalid data, database errors

### Story 4.7: Implement Multi-File Upload for MOCs

**As a** user,
**I want** to upload multiple instruction files at once,
**so that** I can efficiently add complete documentation sets.

**Acceptance Criteria**:

1. Lambda handler enhanced to support multiple files in `POST /api/mocs/{id}/files`
2. Multipart parsing accepts up to 10 files per request
3. Each file validated independently (type, size per `@monorepo/file-validator`)
4. Files uploaded to S3 in parallel using `Promise.all()`
5. Database records inserted in batch transaction to `mocFiles` table
6. Partial success handling: if some uploads fail, successful ones are recorded, errors returned for failed ones
7. Lambda timeout: 120 seconds, memory: 2048 MB
8. Response: `{ success: true, data: { uploaded: [...], failed: [...] } }`
9. Error details include file name and reason for failure
10. Total payload size limited to 50 MB

### Story 4.8: Implement Advanced Error Handling and Retry Logic

**As a** backend developer,
**I want** robust error handling with automatic retries for transient failures,
**so that** users experience reliable service even during AWS service hiccups.

**Acceptance Criteria**:

1. All Lambda functions implement structured error handling with custom error classes
2. Transient errors (network timeouts, throttling) trigger exponential backoff retry (max 3 attempts)
3. Non-retryable errors (validation, authorization) fail immediately with clear messages
4. Database connection errors trigger retry with jitter
5. S3 upload failures logged with presigned URL fallback notification to user
6. OpenSearch indexing failures logged but do not block main operation (eventual consistency acceptable)
7. All errors logged to CloudWatch with structured JSON format including: `errorType`, `errorMessage`, `requestId`, `userId`
8. Error responses never expose internal implementation details (sanitized messages)
9. AWS X-Ray tracing enabled to track error propagation across services
10. CloudWatch metric alarms configured for error rate thresholds (>5% error rate triggers alert)

---

## Epic 5: Production Deployment, Monitoring & Cutover

**Epic Goal**: Implement production-grade observability including CloudWatch dashboards, alarms, and X-Ray tracing. Configure CI/CD pipeline for automated deployments with rollback capability. Execute blue/green deployment strategy with progressive traffic shifting from ECS to Lambda. Validate performance and cost metrics. Decommission legacy ECS infrastructure.

### Story 5.1: Implement CloudWatch Dashboards

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

### Story 5.2: Configure CloudWatch Alarms and SNS Notifications

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

### Story 5.3: Enable AWS X-Ray Distributed Tracing

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

### Story 5.4: Configure CI/CD Pipeline for Automated Deployments

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

### Story 5.5: Implement Blue/Green Deployment Strategy

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

### Story 5.6: Validate Performance and Cost Metrics

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

### Story 5.7: Configure Cost Monitoring and Budgets

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

### Story 5.8: Decommission Legacy ECS Infrastructure

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

## Checklist Results Report

*This section will be populated after running the PM checklist to validate PRD completeness.*

---

## Next Steps

### UX Expert Prompt

*This migration is primarily backend infrastructure with no UI changes. The existing frontend remains unchanged and continues to consume the same API contracts. No UX Expert consultation required for this PRD.*

### Architect Prompt

**Prompt for Architect**:

```
I've completed the Product Requirements Document for migrating the LEGO Projects API from ECS Fargate to AWS Lambda using SST v3 (Ion). The PRD is located at docs/sst-migration-prd.md.

Please review the PRD and create a comprehensive architecture document (docs/sst-migration-architecture.md) that includes:

1. **High-Level Architecture Diagram**: Visual representation of serverless components (API Gateway, Lambda, RDS Proxy, ElastiCache, OpenSearch, S3, Cognito)
2. **Lambda Function Specifications**: Memory, timeout, environment variables, IAM roles, VPC configuration for each function
3. **Database Connection Strategy**: RDS Proxy configuration, connection pooling best practices, migration from direct RDS connections
4. **File Upload Flow**: Detailed sequence diagram for multipart uploads with Sharp processing in Lambda
5. **Caching Strategy**: Redis key patterns, TTL policies, invalidation triggers
6. **Search Architecture**: OpenSearch indexing pipelines, fallback to PostgreSQL patterns
7. **Security Model**: IAM policies, JWT validation, resource isolation, secrets management
8. **Migration Strategy**: Detailed blue/green deployment plan with rollback procedures
9. **Cost Model**: Break down projected costs by service (Lambda, RDS, Redis, OpenSearch, S3, data transfer)
10. **Performance Optimization**: Cold start mitigation (provisioned concurrency, Lambda layers), connection reuse patterns, bundle optimization

Reference the existing codebase at apps/api/lego-projects-api for current implementation details. Use SST v3 best practices and AWS Well-Architected Framework principles.
```

---

## Document Metadata

- **PRD Version**: 1.0
- **Created**: 2025-11-02
- **Author**: Winston (Architect Agent)
- **Framework**: SST v3 (Ion)
- **Target Platform**: AWS Lambda + Serverless Ecosystem
- **Migration Complexity**: High (Full API replatforming)
- **Estimated Timeline**: 6-8 weeks (5 epics with 8 stories average)
