# Minimal Lambda Layer

## Overview

The minimal layer contains only the most basic dependencies needed for simple Lambda functions like health checks and WebSocket handlers. This layer is optimized for fast cold starts and minimal size (~20MB).

## Contents

### Dependencies

- **zod** (^4.0.5) - Schema validation
- **uuid** (^11.1.0) - UUID generation
- **@aws-sdk/client-s3** (^3.848.0) - S3 operations

### Core Modules (from `@api/core`)

- `@api/core/utils` - Response builders, error handling, logger
- `@api/core/observability` - Logging and metrics

## Used By

### Lambda Functions (Minimal Layer Only)

- `Health` - Health check endpoint

### Lambda Functions (Minimal + Standard)

All CRUD operations that don't require file processing use minimal + standard layers.

## Size Estimate

- ~20MB zipped
- ~60MB unzipped

## How to Update Dependencies

### 1. Update package.json

Edit `package.json` and update the version number of the dependency you want to change.

### 2. Rebuild the Layer

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/layers
./build-and-deploy-layers.sh [stage] [region]
```

### 3. Update SST Configuration

The build script automatically saves the new ARN to `layer-arn-{stage}.txt`. The sst.config.ts reads this file to get the latest ARN.

### 4. Deploy Affected Lambdas

Any Lambda using this layer will need to be redeployed to pick up the new layer version:

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api
pnpm sst deploy --stage [stage]
```

## Build Process

The layer is built in the Lambda-required directory structure:

```
minimal-layer/
├── nodejs/
│   └── node_modules/    # Dependencies installed here
├── package.json
└── minimal-layer.zip    # Built artifact
```

Lambda automatically adds `/opt/nodejs/node_modules` to the Node.js require path, so your function code can import dependencies normally.

## Local Development

During local development with `sst dev`, Lambda layers are not used. Instead:

1. The main `apps/api/package.json` contains all dependencies
2. Functions run locally and use the monorepo's node_modules
3. Only deployed functions use the actual layers

## Troubleshooting

### Layer size too large (>250MB unzipped)

- Review dependencies and remove any that aren't needed
- Consider moving heavy dependencies to a separate layer

### Import errors in deployed Lambda

- Ensure the dependency is listed in the layer's package.json
- Rebuild and redeploy the layer
- Verify the Lambda is using the latest layer ARN

### Cold start performance issues

- Minimal layer should have fast cold starts (~100-200ms)
- If slow, check for unnecessary dependencies
- Consider code splitting to reduce bundle size
