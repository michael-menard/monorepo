# LEGO API Serverless

AWS Lambda-based serverless migration of the LEGO Projects API using SST v3 (Ion).

## Overview

This project is a complete serverless rewrite of the existing Express.js-based LEGO Projects API (`apps/api/lego-projects-api/`). It provides the same REST API functionality while leveraging AWS Lambda, API Gateway, RDS Proxy, ElastiCache Redis, and OpenSearch for a scalable, cost-effective serverless architecture.

**Key Features:**

- 🚀 **AWS Lambda Functions** - Individual route handlers as Lambda functions
- 🔄 **RDS Proxy** - Managed connection pooling for PostgreSQL
- ⚡ **ElastiCache Redis** - Serverless caching layer
- 🔍 **OpenSearch** - Full-text search with PostgreSQL fallback
- 📦 **Drizzle ORM** - Type-safe database queries and migrations
- 🏗️ **SST v3 (Ion)** - Modern infrastructure-as-code on Pulumi
- 🌍 **Multi-stage** - dev/staging/production deployment support

## Project Structure

```
apps/api/
├── sst.config.ts              # SST configuration (infrastructure definition)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration with path aliases
├── .env.example               # Environment variable template
├── .gitignore                 # SST artifacts exclusion
├── src/
│   ├── functions/             # Lambda function handlers
│   │   ├── health/            # Health check endpoint
│   │   ├── projects/          # Project CRUD operations
│   │   ├── uploads/           # File upload handling
│   │   └── search/            # Search functionality
│   ├── lib/                   # Shared utilities and business logic
│   │   ├── db/                # Database client and queries
│   │   ├── cache/             # Redis caching layer
│   │   ├── search/            # OpenSearch integration
│   │   ├── storage/           # S3 operations
│   │   ├── auth/              # JWT validation
│   │   └── utils/             # Common utilities
│   └── types/                 # TypeScript type definitions
├── infrastructure/            # Custom AWS resource definitions
├── scripts/                   # Deployment and migration scripts
└── __tests__/                 # Integration and unit tests
```

## Path Aliases

The project uses TypeScript path aliases for clean imports:

- `@/*` → `src/*` - Root source directory
- `@/functions/*` → `src/functions/*` - Lambda handlers
- `@/lib/*` → `src/lib/*` - Shared libraries
- `@/types/*` → `src/types/*` - Type definitions

**Example:**

```typescript
import { getEnv } from '@/lib/utils/env'
import { createProject } from '@/lib/db/projects'
import type { Project } from '@/types/project'
```

## Environment Configuration

### Environment Variables

Environment variables are validated at runtime using Zod schemas (see `src/lib/utils/env.ts`). Most values are auto-populated by SST Resource linking, eliminating hardcoded configuration.

**Key Variables:**

- `STAGE` - Deployment stage (dev/staging/production)
- `NODE_ENV` - Node environment (development/staging/production)
- `AWS_REGION` - AWS region (default: us-east-1)
- `POSTGRES_HOST`, `POSTGRES_PORT`, etc. - Auto-populated by RDS Resource
- `REDIS_HOST`, `REDIS_PORT` - Auto-populated by ElastiCache Resource
- `OPENSEARCH_ENDPOINT` - Auto-populated by OpenSearch Resource
- `S3_BUCKET` - Auto-populated by S3 Bucket Resource
- `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` - Existing AWS Cognito auth

See `.env.example` for complete list.

### Local database & migrations

For local development (running migrations from your laptop without full infra), you can point the API at a local Postgres instance or a dev Aurora instance using `.env.local.example`:

```bash
# apps/api/.env.local.example
NODE_ENV=development
STAGE=dev
AWS_REGION=us-east-1
LOG_LEVEL=debug

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=legoapidb
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=postgres
```

To apply Drizzle migrations locally:

```bash
cd apps/api
export $(grep -v '^#' .env.local.example | xargs)
pnpm db:migrate
```

Or, with `dotenv-cli`:

```bash
cd apps/api
npx dotenv -e .env.local.example -- pnpm db:migrate
```

In real environments, `serverless.yml` injects `POSTGRES_*` from the Aurora cluster, and Lambda functions use `DB_SECRET_ARN` to fetch credentials from Secrets Manager.

### Upload Configuration (Story 3.1.5)

Upload-related environment variables are validated at startup using Zod schemas. Invalid values cause Lambda initialization failure (fast-fail).

| Variable                       | Description                              | Default              | Valid Range                     |
| ------------------------------ | ---------------------------------------- | -------------------- | ------------------------------- |
| `UPLOAD_PDF_MAX_MB`            | Max PDF file size in MB                  | `50`                 | Positive integer                |
| `UPLOAD_IMAGE_MAX_MB`          | Max image file size in MB                | `20`                 | Positive integer                |
| `UPLOAD_IMAGE_MAX_COUNT`       | Max images per upload                    | `10`                 | Positive integer                |
| `UPLOAD_PARTSLIST_MAX_MB`      | Max parts list file size in MB           | `10`                 | Positive integer                |
| `UPLOAD_PARTSLIST_MAX_COUNT`   | Max parts lists per upload               | `5`                  | Positive integer                |
| `UPLOAD_ALLOWED_IMAGE_FORMATS` | Allowed image formats (CSV)              | `jpeg,png,webp,heic` | jpeg,jpg,png,webp,heic,heif,gif |
| `UPLOAD_ALLOWED_PARTS_FORMATS` | Allowed parts list formats (CSV)         | `txt,csv,json,xml`   | txt,csv,json,xml,xlsx,xls       |
| `UPLOAD_RATE_LIMIT_PER_DAY`    | Max uploads per user per day             | `100`                | Positive integer                |
| `PRESIGN_TTL_MINUTES`          | Presigned URL and session TTL in minutes | `15`                 | 1-60                            |
| `FINALIZE_LOCK_TTL_MINUTES`    | Finalize lock TTL for idempotency        | `5`                  | Positive integer                |

**Example:**

```bash
# Custom upload limits
UPLOAD_PDF_MAX_MB=100
UPLOAD_IMAGE_MAX_MB=25
UPLOAD_IMAGE_MAX_COUNT=20
UPLOAD_ALLOWED_IMAGE_FORMATS=jpeg,png,webp
PRESIGN_TTL_MINUTES=30
```

**Notes:**

- CSV values are normalized: trimmed, lowercased, and deduplicated
- Invalid formats cause startup failure with descriptive error
- Config is cached after first access for performance
- `PRESIGN_TTL_MINUTES` also controls the upload session TTL (Story 3.1.8)

#### Session TTL and MIME Type Validation (Story 3.1.8)

The initialize endpoint returns `sessionTtlSeconds` in the response, which equals `PRESIGN_TTL_MINUTES * 60`. Clients should complete file uploads within this window.

**Allowed MIME Types by File Type:**

| File Type                    | Allowed MIME Types                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `instruction`                | `application/pdf`                                                                                                                                                                                            |
| `parts-list`                 | `text/csv`, `application/csv`, `text/plain`, `application/json`, `text/json`, `application/xml`, `text/xml`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel` |
| `thumbnail`, `gallery-image` | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`                                                                                                                                          |

Invalid MIME types are rejected with HTTP 400:

```json
{
  "success": false,
  "error": {
    "type": "BAD_REQUEST",
    "message": "File example.txt has invalid MIME type \"text/plain\" for instruction. Allowed types: application/pdf"
  }
}
```

**Finalize Verification (Story 3.1.8):**

During finalize, the API performs additional S3 verification:

1. **HeadObject**: Verifies file exists and checks `ContentLength` against size limits
2. **GetObject Range**: Fetches first 512 bytes for magic bytes validation (PDF, JPEG, PNG, WebP)

Files that fail verification are rejected with descriptive error messages.

#### Rate Limiting (429 Response)

When a user exceeds their daily upload limit (`UPLOAD_RATE_LIMIT_PER_DAY`), the API returns HTTP 429 with the following response:

```json
{
  "success": false,
  "error": {
    "type": "TOO_MANY_REQUESTS",
    "message": "Daily upload limit exceeded",
    "details": {
      "message": "You have reached your daily upload limit of 100. Please try again tomorrow.",
      "nextAllowedAt": "2025-12-07T00:00:00.000Z",
      "retryAfterSeconds": 28800
    }
  },
  "timestamp": "2025-12-06T16:00:00.000Z"
}
```

**Fields:**

- `nextAllowedAt`: ISO timestamp of next UTC midnight when limit resets
- `retryAfterSeconds`: Seconds until limit resets (for `Retry-After` header)

Rate limits are applied to both `/mocs/with-files/initialize` and `/mocs/{mocId}/finalize` endpoints.

#### Duplicate Title Conflict (409 Response)

When a user attempts to create a MOC with a title that already exists for their account, the API returns HTTP 409:

```json
{
  "success": false,
  "error": {
    "type": "CONFLICT",
    "message": "A MOC with this title already exists",
    "details": {
      "title": "My Duplicate Title",
      "existingMocId": "abc123"
    }
  },
  "timestamp": "2025-12-06T16:00:00.000Z"
}
```

This is enforced by a unique constraint on `(user_id, title)` in the database.

#### Two-Phase Finalize and Idempotency

The finalize endpoint uses a two-phase locking pattern for safe concurrent access:

1. **Lock Acquisition**: Sets `finalizing_at` timestamp atomically via `UPDATE ... WHERE finalized_at IS NULL AND (finalizing_at IS NULL OR finalizing_at < stale_cutoff)`
2. **Side Effects**: Verifies S3 files, sets thumbnail, indexes in Elasticsearch
3. **Completion**: Sets `finalized_at` on success, clears `finalizing_at` on failure

**Idempotent Responses:**

- If MOC is already finalized (`finalized_at IS NOT NULL`), returns `200 OK` with `idempotent: true` and the existing data
- If another process holds the lock (`finalizing_at` is recent), returns `200 OK` with `idempotent: true, status: 'finalizing'`
- Stale locks (older than `FINALIZE_LOCK_TTL_MINUTES`, default 5) are automatically rescued

**Environment Variable:**

- `FINALIZE_LOCK_TTL_MINUTES`: Lock timeout in minutes (default: 5)

### Local Development Setup

1. **Copy environment template:**

   ```bash
   cp .env.example .env.local
   ```

2. **Configure AWS credentials:**

   ```bash
   # Ensure AWS_PROFILE is set in root .env or shell
   export AWS_PROFILE=your-profile
   export AWS_REGION=us-east-1
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

## Development Workflow

### Starting Local Development

SST v3 provides live Lambda development with hot reload:

```bash
# Start SST dev environment (provisions ephemeral AWS resources)
pnpm dev

# Or from monorepo root
pnpm --filter lego-api-serverless dev
```

This command:

1. Provisions ephemeral AWS infrastructure (VPC, RDS, Redis, etc.)
2. Starts local Lambda runtime with hot reload
3. Proxies requests to your local code
4. Auto-updates on file changes

**Port:** API Gateway endpoint URL will be output in terminal (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com`)

### Available Scripts

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `pnpm dev`               | Start SST dev environment with live Lambda debugging |
| `pnpm build`             | Build all Lambda functions for deployment            |
| `pnpm deploy`            | Deploy to default stage (dev)                        |
| `pnpm deploy:staging`    | Deploy to staging environment                        |
| `pnpm deploy:production` | Deploy to production with additional safeguards      |
| `pnpm remove`            | Remove deployed stack and resources                  |
| `pnpm test`              | Run unit and integration tests                       |
| `pnpm test:watch`        | Run tests in watch mode                              |
| `pnpm check-types`       | TypeScript type checking                             |
| `pnpm lint`              | Lint code with ESLint                                |
| `pnpm db:generate`       | Generate Drizzle schema types from database          |
| `pnpm db:push`           | Push schema changes to database                      |
| `pnpm db:migrate`        | Run database migrations                              |
| `pnpm db:studio`         | Open Drizzle Studio (database GUI)                   |

### Database Operations

**Drizzle ORM** is used for type-safe database operations and migrations.

```bash
# Generate TypeScript types from schema
pnpm db:generate

# Push schema changes to database (dev only)
pnpm db:push

# Run migrations (staging/production)
pnpm db:migrate

# Open database GUI
pnpm db:studio
```

**Schema Location:** Database schema is shared with the existing Express API at `apps/api/lego-projects-api/src/db/schema.ts`.

### Deployment

#### Deploy to Development

```bash
pnpm deploy
# or
sst deploy --stage dev
```

#### Deploy to Staging

```bash
pnpm deploy:staging
# or
sst deploy --stage staging
```

#### Deploy to Production

```bash
# Production deploys require explicit confirmation
pnpm deploy:production
# or
sst deploy --stage production
```

**Production Safeguards:**

- Stack removal set to "retain" (prevents accidental deletion)
- Stack protection enabled (blocks stack deletion)
- Manual confirmation required for deployment

### Removing Deployed Stacks

```bash
# Remove dev stack
sst remove --stage dev

# Remove staging stack
sst remove --stage staging

# Production stack cannot be removed due to protection
# Must disable protection in sst.config.ts first
```

## Infrastructure Components

The `sst.config.ts` file defines the complete AWS infrastructure:

1. **VPC Networking** - Public/private subnets, NAT Gateway, security groups
2. **RDS PostgreSQL** - Aurora Serverless v2 with RDS Proxy for connection pooling
3. **ElastiCache Redis** - Cluster mode with automatic failover
4. **OpenSearch** - Managed domain for full-text search
5. **S3 Buckets** - File storage with lifecycle policies
6. **Lambda Functions** - Individual handlers with optimized bundles
7. **API Gateway** - HTTP API (v2) with JWT authorizer
8. **CloudWatch** - Logs, metrics, and alarms
9. **X-Ray** - Distributed tracing

All resources are linked via SST's Resource system, auto-populating environment variables at runtime.

## Lambda Functions

Lambda functions are organized by domain:

- **Health Check** (`functions/health/`) - API health status
- **Projects** (`functions/projects/`) - CRUD operations for MOC projects
- **Uploads** (`functions/uploads/`) - File uploads to S3 with image processing
- **Search** (`functions/search/`) - OpenSearch queries with PostgreSQL fallback

Each function:

- Has isolated handler file
- Shares business logic from `src/lib/`
- Uses Drizzle ORM for database access
- Leverages Redis for caching
- Validates JWT tokens via Cognito

## Shared Business Logic

All business logic is centralized in `src/lib/` to maintain DRY principles and consistency with the existing Express API:

- **Database** (`lib/db/`) - Drizzle client, query builders, transaction helpers
- **Caching** (`lib/cache/`) - Redis client with TTL management
- **Search** (`lib/search/`) - OpenSearch client with fallback logic
- **Storage** (`lib/storage/`) - S3 upload/download with Sharp image processing
- **Authentication** (`lib/auth/`) - JWT validation, user context
- **Validation** (`lib/validation/`) - Zod schemas for request/response
- **Utilities** (`lib/utils/`) - Logging, error handling, env config

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

```bash
# Tests require deployed dev stack
pnpm dev  # Start dev environment
pnpm test:integration
```

### E2E Tests

```bash
# E2E tests use staging environment
pnpm deploy:staging
pnpm test:e2e
```

## Migration from Express API

This serverless API is designed for **blue/green deployment** alongside the existing Express API:

1. **Phase 1 (10% traffic)** - Deploy Lambda functions, route 10% via API Gateway
2. **Phase 2 (50% traffic)** - Monitor metrics, increase to 50% if stable
3. **Phase 3 (100% traffic)** - Full cutover, maintain Express as fallback
4. **Phase 4 (Decommission)** - Remove Express stack after validation period

Both APIs share:

- Same PostgreSQL database (via Drizzle ORM)
- Same Redis cache
- Same OpenSearch domain
- Same S3 buckets
- Same Cognito User Pool

This ensures zero downtime and easy rollback if needed.

## Monitoring and Observability

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/lego-api-serverless-dev-health --follow

# View API Gateway logs
aws logs tail /aws/apigateway/lego-api-serverless-dev --follow
```

### CloudWatch Metrics

Key metrics tracked:

- Lambda invocation count, duration, errors
- API Gateway request count, latency, 4xx/5xx errors
- RDS connection pool utilization
- Redis cache hit rate
- OpenSearch query latency

### X-Ray Tracing

All Lambda functions are instrumented with AWS X-Ray for distributed tracing. View traces in AWS Console:

- Lambda → Functions → [Function Name] → Monitoring → Traces

## Troubleshooting

### Common Issues

**Issue:** `pnpm dev` fails with "AWS credentials not configured"

- **Fix:** Ensure `AWS_PROFILE` is set and credentials are valid
  ```bash
  export AWS_PROFILE=your-profile
  aws sts get-caller-identity  # Verify credentials
  ```

**Issue:** TypeScript path aliases not resolving

- **Fix:** Ensure `tsconfig.json` `paths` are correct and restart TS server

**Issue:** Lambda timeout errors

- **Fix:** Check CloudWatch logs for slow queries, increase timeout in `sst.config.ts`

**Issue:** Database connection pool exhausted

- **Fix:** Verify RDS Proxy configuration, increase max connections

**Issue:** Redis connection failures

- **Fix:** Check security groups allow Lambda → ElastiCache communication

### Debugging Lambda Functions

```bash
# View live logs during development
pnpm dev  # Logs appear in terminal

# View deployed Lambda logs
aws logs tail /aws/lambda/lego-api-serverless-dev-health --follow

# Invoke function directly
aws lambda invoke \
  --function-name lego-api-serverless-dev-health \
  --payload '{}' \
  response.json
```

## Performance Optimization

### Cold Start Mitigation

- Lambda functions use Node.js 20 runtime (fast cold starts)
- Shared dependencies bundled via ESBuild
- Database client initialized outside handler (connection reuse)

### Caching Strategy

- Redis TTL: 5 minutes for list queries, 15 minutes for detail queries
- CloudFront CDN for static assets (S3)
- API Gateway caching for read-heavy endpoints

### Database Optimization

- RDS Proxy manages connection pooling (max 100 connections)
- Read replicas for search/analytics queries
- Prepared statements via Drizzle ORM

## Security

### IAM Roles and Policies

- Lambda execution roles have least-privilege access
- RDS accessed via IAM database authentication
- S3 buckets use KMS encryption at rest

### Network Security

- Lambda functions run in private subnets (no internet access)
- NAT Gateway for outbound traffic (package installs, external APIs)
- Security groups restrict inter-service communication

### Authentication

- AWS Cognito JWT validation on all protected endpoints
- API Gateway JWT authorizer rejects invalid tokens
- CSRF protection on mutation operations

## Additional Resources

- [SST v3 Documentation](https://docs.sst.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Express API Source](../lego-projects-api/) - Original implementation

## Contributing

See monorepo root `CLAUDE.md` for development conventions, testing guidelines, and contribution workflow.

## License

Proprietary - Internal use only.
