# Project Structure

> **CRITICAL: NO BARREL FILES (index.ts re-exports)**
>
> This project does NOT use barrel files. Always import directly from source files:
>
> ```typescript
> // ✅ CORRECT - Direct imports
> import { createRedisClient } from './core/cache/redis'
> import { mocService } from './endpoints/moc-instructions/_shared/moc-service'
>
> // ❌ WRONG - Barrel imports (DO NOT CREATE index.ts files that re-export)
> import { createRedisClient } from './core/cache'
> import { mocService } from './endpoints/moc-instructions'
> ```

## Current Structure (as of 2025-11-28)

```plaintext
apps/api/
├── serverless.yml                    # Serverless Framework configuration
├── package.json
├── tsconfig.json
├── tsconfig.serverless.json
├── drizzle.config.ts                 # Drizzle ORM config (main app)
├── drizzle.umami.config.ts           # Drizzle config (Umami analytics)
├── vitest.config.ts                  # Unit test config
├── vitest.integration.config.ts      # Integration test config
├── eslint.config.js
├── esbuild-plugins.js
├── .env.example
│
├── core/                             # Shared business logic & utilities
│   ├── auth/
│   │   └── cognito.ts                # Cognito Admin API
│   ├── cache/
│   │   └── redis.ts                  # Redis client setup
│   ├── database/
│   │   ├── client.ts                 # Drizzle client setup
│   │   ├── umami-client.ts           # Umami DB client
│   │   ├── migrate.ts                # Migration runner
│   │   ├── migrate-umami.ts          # Umami migration runner
│   │   ├── setup-umami.ts            # Umami setup
│   │   ├── retry.ts                  # DB retry logic
│   │   ├── schema/
│   │   │   ├── index.ts              # Schema definitions (exception: schema barrel OK)
│   │   │   └── umami.ts              # Umami schema
│   │   └── migrations/               # Migration files
│   │       ├── app/                  # App migrations
│   │       └── umami/                # Umami migrations
│   ├── observability/
│   │   ├── logger.ts                 # Pino logger setup
│   │   ├── metrics.ts                # Custom metrics
│   │   ├── cloudwatch-metrics.ts     # CloudWatch metrics
│   │   ├── tracing.ts                # X-Ray tracing
│   │   ├── error-sanitizer.ts        # Error sanitization
│   │   ├── frontend-errors.ts        # Frontend error tracking
│   │   └── web-vitals.ts             # Web vitals tracking
│   ├── search/
│   │   ├── opensearch.ts             # OpenSearch client
│   │   ├── utils.ts                  # Search utilities
│   │   └── retry.ts                  # Search retry logic
│   ├── storage/
│   │   ├── s3.ts                     # S3 client setup
│   │   └── retry.ts                  # Storage retry logic
│   └── utils/
│       ├── env.ts                    # Environment utilities
│       ├── errors.ts                 # Error classes
│       ├── responses.ts              # Standard response builders
│       ├── response-types.ts         # Response type definitions
│       ├── lambda-wrapper.ts         # Lambda handler wrapper
│       ├── multipart-parser.ts       # Multipart form parser
│       ├── image-upload-service.ts   # Image upload service
│       ├── retry.ts                  # General retry logic
│       └── runtime-config-schema.ts  # Runtime config validation
│
├── endpoints/                        # API endpoint handlers (one folder per endpoint)
│   ├── health/
│   │   └── handler.ts                # Health check endpoint
│   ├── gallery/
│   │   ├── schemas/
│   │   │   └── index.ts              # Zod schemas for gallery
│   │   ├── create-album/handler.ts
│   │   ├── delete-album/handler.ts
│   │   ├── delete-image/handler.ts
│   │   ├── flag-image/handler.ts
│   │   ├── get-album/handler.ts
│   │   ├── get-image/handler.ts
│   │   ├── list-albums/handler.ts
│   │   ├── list-images/handler.ts
│   │   ├── search-images/handler.ts
│   │   ├── update-album/handler.ts
│   │   ├── update-image/handler.ts
│   │   └── upload-image/handler.ts
│   ├── moc-instructions/
│   │   ├── _shared/                  # Shared logic for MOC endpoints
│   │   │   ├── moc-service.ts        # MOC business logic
│   │   │   ├── moc-file-service.ts   # File handling logic
│   │   │   ├── opensearch-moc.ts     # MOC search indexing
│   │   │   ├── parts-list-parser.ts  # Parts list parsing
│   │   │   └── types.ts              # MOC types
│   │   ├── delete-file/handler.ts
│   │   ├── download-file/handler.ts
│   │   ├── finalize-with-files/handler.ts
│   │   ├── get-gallery-images/handler.ts
│   │   ├── get-stats/handler.ts
│   │   ├── get-uploads-over-time/handler.ts
│   │   ├── initialize-with-files/handler.ts
│   │   ├── link-gallery-image/handler.ts
│   │   ├── list/handler.ts
│   │   ├── unlink-gallery-image/handler.ts
│   │   ├── upload-file/handler.ts
│   │   └── upload-parts-list/handler.ts
│   ├── moc-parts-lists/
│   │   ├── _shared/
│   │   │   └── parts-list-service.ts
│   │   ├── create/handler.ts
│   │   ├── delete/handler.ts
│   │   ├── get/handler.ts
│   │   ├── get-user-summary/handler.ts
│   │   ├── parse/handler.ts
│   │   ├── update/handler.ts
│   │   └── update-status/handler.ts
│   ├── websocket/
│   │   ├── _shared/
│   │   │   ├── broadcast.ts          # WebSocket broadcast logic
│   │   │   ├── message-types.ts      # Message type definitions
│   │   │   └── index.ts              # WebSocket shared exports
│   │   ├── connect/handler.ts
│   │   ├── default/handler.ts
│   │   └── disconnect/handler.ts
│   └── wishlist/
│       ├── schemas/
│       │   └── index.ts              # Zod schemas for wishlist
│       ├── create-item/handler.ts
│       ├── delete-item/handler.ts
│       ├── get-item/handler.ts
│       ├── list/handler.ts
│       ├── reorder/handler.ts
│       ├── search/handler.ts
│       ├── update-item/handler.ts
│       └── upload-image/handler.ts
│
├── infrastructure/                   # Serverless infrastructure definitions
│   ├── api/
│   │   ├── authorizers.ts            # API Gateway authorizers
│   │   ├── http-api.ts               # HTTP API configuration
│   │   └── websocket-api.ts          # WebSocket API configuration
│   ├── auth/
│   │   ├── cognito.ts                # Cognito user pool
│   │   └── iam-roles.ts              # IAM roles
│   ├── core/
│   │   ├── vpc.ts                    # VPC configuration
│   │   └── security-groups.ts        # Security groups
│   ├── cost/
│   │   ├── budgets.ts                # AWS Budgets
│   │   └── cost-monitoring.ts        # Cost monitoring
│   ├── database/
│   │   ├── postgres.ts               # RDS PostgreSQL
│   │   └── iam-roles.ts              # DB IAM roles
│   ├── functions/
│   │   ├── all-functions.ts          # All function definitions
│   │   ├── gallery-wishlist-websocket.ts
│   │   ├── health/health-check.ts
│   │   └── moc-instructions/
│   │       ├── _shared-config.ts
│   │       ├── crud.ts
│   │       └── file-upload.ts
│   ├── lambda/
│   │   ├── cost-monitoring/
│   │   │   └── cost-metrics-publisher.ts
│   │   └── tracking/
│   │       ├── frontend-error-ingestion.ts
│   │       └── web-vitals-ingestion.ts
│   ├── monitoring/
│   │   ├── alarms.ts                 # CloudWatch alarms
│   │   ├── simple-alarms.ts          # Simple alarm definitions
│   │   ├── dashboards.ts             # CloudWatch dashboards
│   │   ├── sns-topics.ts             # SNS topics
│   │   ├── s3-lifecycle-policies.ts  # S3 lifecycle
│   │   ├── cost-anomaly-detection.ts
│   │   ├── cost-budgets.ts
│   │   ├── slack-budget-forwarder.js
│   │   └── cost/
│   │       ├── budget-alerts.ts
│   │       └── cost-explorer.ts
│   ├── observability/
│   │   └── tags.ts                   # Resource tagging
│   ├── search/
│   │   └── opensearch.ts             # OpenSearch domain
│   ├── storage/
│   │   ├── s3-buckets.ts             # S3 bucket definitions
│   │   └── lifecycle-policies.ts     # S3 lifecycle policies
│   └── cloudwatch-alarms.ts          # Root alarm config
│
├── layers/                           # Lambda layers
│   ├── get-layer-arns.ts
│   ├── lambda-layer-mapping.ts
│   ├── minimal-layer/                # Minimal dependencies layer
│   ├── standard-layer/               # Standard dependencies layer
│   └── processing-layer/             # Image processing layer
│
├── stacks/                           # CloudFormation stacks
│   ├── functions/
│   └── infrastructure/
│
├── gateway/                          # API Gateway configuration
│
├── scripts/                          # Utility scripts
│   ├── cost-monitoring/              # Cost analysis scripts
│   ├── database/                     # Database scripts
│   ├── observability/                # Observability scripts
│   ├── performance/                  # Performance analysis
│   │   ├── analyze-cold-starts.ts
│   │   ├── analyze-costs.ts
│   │   ├── analyze-lambda-performance.ts
│   │   ├── compare-baselines.ts
│   │   ├── extract-metrics.ts
│   │   ├── generate-validation-report.ts
│   │   └── validate-thresholds.ts
│   ├── validate-runtime-config.ts
│   └── get-affected-lambdas.js
│
├── tests/                            # Test utilities
│   └── performance/
│       ├── test-processor.js
│       ├── fixtures/
│       └── results/
│
├── baselines/                        # Performance baselines
├── reports/                          # Generated reports
├── __docs__/                         # API documentation
│   ├── components/
│   ├── observability/
│   └── paths/
│
└── docs/                             # Additional documentation
```

## Import Guidelines

### ✅ CORRECT Import Patterns

```typescript
// Direct imports from source files
import { createRedisClient } from '../core/cache/redis'
import { getLogger } from '../core/observability/logger'
import { mocService } from './_shared/moc-service'
import { GalleryImageSchema } from './schemas/index' // schemas barrel OK

// Import from handler files directly
import { handler as healthHandler } from '../endpoints/health/handler'
```

### ❌ WRONG Import Patterns

```typescript
// Do NOT create barrel files that re-export everything
import { redis, cache, cacheUtils } from '../core/cache'  // NO barrel exports
import { mocService, fileService } from '../endpoints/moc-instructions'  // NO barrel

// Do NOT use index.ts as a catch-all re-export
import * from './index'  // NEVER do this
```

### Exceptions (Where Barrels Are Acceptable)

1. **Schema files**: `schemas/index.ts` can export all Zod schemas for a domain
2. **Database schema**: `core/database/schema/index.ts` exports Drizzle schema
3. **WebSocket shared**: `endpoints/websocket/_shared/index.ts` for message types

---

**Last Updated**: 2025-11-28
