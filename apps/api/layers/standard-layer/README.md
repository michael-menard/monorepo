# Standard Lambda Layer

## Overview

The standard layer contains the core infrastructure dependencies used by most CRUD operations: database access (PostgreSQL via Drizzle), caching (Redis), search (OpenSearch), and AWS services. This layer powers ~35 Lambda functions handling standard API operations.

## Contents

### Dependencies

- **drizzle-orm** (^0.44.3) - PostgreSQL ORM
- **pg** (^8.16.3) - PostgreSQL client
- **redis** (^5.7.0) - Redis client for caching
- **@opensearch-project/opensearch** (^2.12.0) - OpenSearch client
- **@aws-sdk/client-secrets-manager** (^3.848.0) - Secrets management
- **@aws-sdk/s3-request-presigner** (^3.848.0) - S3 presigned URLs
- **@aws-sdk/client-sns** (^3.932.0) - SNS notifications
- **@aws-sdk/client-sts** (^3.932.0) - AWS STS for role assumption
- **aws-jwt-verify** (5.1.1) - JWT verification for Cognito
- **aws-xray-sdk-core** (3.12.0) - X-Ray tracing
- **aws-embedded-metrics** (4.2.1) - CloudWatch embedded metrics

### Core Modules (from `@api/core`)

- `@api/core/database` - Drizzle client, migrations, schema
- `@api/core/cache` - Redis client and caching utilities
- `@api/core/search` - OpenSearch client and indexing
- `@api/core/schemas` - Zod validation schemas
- `@api/core/storage` - S3 client and file operations
- `@api/core/auth` - Authentication and authorization
- `@api/core/utils` - All utilities (responses, errors, logger, etc.)
- `@api/core/observability` - Logging, metrics, tracing

### Monorepo Packages

All `@monorepo/*` packages except:

- `@monorepo/image-processing` (in processing layer)
- `@monorepo/file-validator` (in processing layer)

## Used By

### Lambda Functions (Minimal + Standard)

**Gallery (11 functions):**

- GalleryListAlbums, GalleryGetAlbum, GalleryCreateAlbum, GalleryUpdateAlbum, GalleryDeleteAlbum
- GalleryListImages, GalleryGetImage, GalleryDeleteImage, GalleryUpdateImage, GallerySearchImages, GalleryFlagImage

**Wishlist (7 functions):**

- WishlistList, WishlistGetItem, WishlistCreateItem, WishlistUpdateItem, WishlistDeleteItem, WishlistReorder, WishlistSearch

**MOC Instructions (11 functions):**

- MocInstructionsList, MocInstructionsGet, MocInstructionsCreate, MocInstructionsUpdate, MocInstructionsDelete
- MocInstructionsDownloadFile, MocInstructionsDeleteFile
- MocInstructionsLinkGalleryImage, MocInstructionsUnlinkGalleryImage, MocInstructionsGetGalleryImages
- MocInstructionsGetStats, MocInstructionsGetUploadsOverTime

**MOC Parts Lists (6 functions):**

- MocPartsListsGet, MocPartsListsCreate, MocPartsListsUpdate, MocPartsListsUpdateStatus, MocPartsListsDelete, MocPartsListsGetUserSummary

**WebSocket (3 functions):**

- WebsocketConnect, WebsocketDisconnect, WebsocketDefault

**Total: ~38 Lambda functions**

## Size Estimate

- ~100MB zipped
- ~300MB unzipped (within 512MB Lambda limit)

## How to Update Dependencies

### 1. Update package.json

Edit `package.json` and update the version number of the dependency you want to change.

### 2. Test Locally First

Since this layer is used by many functions, test changes locally with `sst dev` before deploying:

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api
pnpm sst dev
```

### 3. Rebuild the Layer

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/layers
./build-and-deploy-layers.sh [stage] [region]
```

### 4. Verify Layer Size

Check that the unzipped size doesn't exceed 250MB:

```bash
unzip -l standard-layer.zip | tail -1
```

### 5. Deploy Affected Lambdas

Changes to this layer affect ~38 Lambda functions. Use the deployment helper to deploy affected functions:

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api
node scripts/get-affected-lambdas.js --layer standard
# Then deploy those functions
```

## Build Process

The layer is built in the Lambda-required directory structure:

```
standard-layer/
├── nodejs/
│   └── node_modules/    # Dependencies installed here
├── package.json
└── standard-layer.zip   # Built artifact
```

## Local Development

During `sst dev`:

1. Layers are not used - functions run locally
2. Dependencies come from `apps/api/package.json`
3. This allows faster iteration without rebuilding layers

## Performance Characteristics

### Cold Start Impact

- Adds ~200-500ms to cold starts due to layer size
- Most functions with this layer have 1-2 second cold starts total
- Acceptable for CRUD operations that aren't ultra-latency-sensitive

### Memory Usage

- Layer contents loaded into `/opt/` directory
- ~300MB of disk space in Lambda execution environment
- Minimal memory impact (loaded on-demand)

## Troubleshooting

### "Cannot find module" errors

1. Check if the module is in this layer's package.json
2. If not, add it and rebuild the layer
3. Verify the Lambda is using the latest layer version ARN

### Layer size exceeds 250MB unzipped

1. Review dependencies for bloat:
   ```bash
   cd nodejs
   du -sh node_modules/* | sort -h
   ```
2. Remove unnecessary dependencies
3. Consider moving large deps to processing layer if only used by a few functions

### Slow cold starts (>3 seconds)

1. Profile which dependencies are slow to initialize
2. Consider lazy-loading heavy modules
3. Use X-Ray to identify bottlenecks

### Database connection errors

1. Verify RDS security group allows Lambda access
2. Check secrets manager has correct credentials
3. Ensure Lambda is in correct VPC subnets

### OpenSearch indexing failures

1. Check OpenSearch domain is accessible from Lambda's VPC
2. Verify IAM role has OpenSearch permissions
3. These errors are non-critical - they won't fail the request
