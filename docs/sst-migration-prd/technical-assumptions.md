# Technical Assumptions

## Repository Structure: **Monorepo (Existing Turborepo)**

The SST infrastructure will be added to the existing monorepo structure:
- SST config: `/apps/api/lego-api-serverless/sst.config.ts`
- Lambda handlers: `/apps/api/lego-api-serverless/src/functions/`
- Shared code: Continue using `@monorepo/file-validator`, `@repo/upload` packages
- Migration will NOT create a separate repository

## Service Architecture: **Serverless (Lambda + API Gateway)**

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

## Testing Requirements: **Full Testing Pyramid**

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

## Language & Framework Stack

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

## Database Configuration

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

## Additional Technical Assumptions and Requests

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
