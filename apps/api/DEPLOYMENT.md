# Lambda Deployment Guide

This document explains how to deploy Lambda functions in the LEGO API using the Lambda Layers architecture.

## Table of Contents

- [Overview](#overview)
- [Deployment Methods](#deployment-methods)
- [CI/CD Pipeline](#cicd-pipeline)
- [Manual Deployment](#manual-deployment)
- [Deployment Workflow](#deployment-workflow)
- [Troubleshooting](#troubleshooting)

## Overview

The LEGO API uses a **per-Lambda deployment** strategy enabled by Lambda Layers. This means:

✅ **Individual deployability** - Deploy one function without affecting others
✅ **Fast deployments** - Only deploy what changed (5-10 seconds per function)
✅ **Isolated failures** - One failed deployment doesn't block others
✅ **Parallel deployments** - Deploy multiple functions simultaneously
✅ **Automatic detection** - CI/CD detects which functions need deployment

## Deployment Methods

### 1. Automatic CI/CD (Recommended)

**Triggers:**

- Push to `main` branch → Deploy to `production`
- Pull request → Deploy to `dev`

**What it does:**

1. Detects changed files using git diff
2. Maps changes to affected Lambda functions
3. Runs tests
4. Rebuilds layers if needed
5. Deploys only affected functions (up to 3 in parallel)
6. Reports deployment status

**Files:**

- `.github/workflows/deploy-api-lambdas.yml` - Main deployment workflow
- `.github/workflows/reusable-deploy-lambda.yml` - Reusable Lambda deployment

### 2. Manual Deployment (Single Function)

Deploy a specific function manually using GitHub Actions UI:

1. Go to Actions → "Reusable Lambda Deploy"
2. Click "Run workflow"
3. Select:
   - Function name (e.g., `GalleryUploadImage`)
   - Stage (`dev`, `staging`, or `production`)
   - Region (default: `us-east-1`)
4. Click "Run workflow"

### 3. Command Line Deployment

Deploy from your local machine or CI/CD:

```bash
cd apps/api

# Deploy single function
./scripts/deploy-lambda.sh GalleryUploadImage dev us-east-1

# Deploy multiple functions
for func in Health GalleryListAlbums WishlistList; do
  ./scripts/deploy-lambda.sh $func dev
done
```

## CI/CD Pipeline

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     1. Detect Changes                        │
│  • Git diff to find changed files                           │
│  • Map changes to affected Lambda functions                 │
│  • Detect layer changes                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      2. Run Tests                            │
│  • Type checking (tsc)                                      │
│  • Linting (eslint)                                         │
│  • Unit tests (vitest)                                      │
│  • Integration tests                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 3. Deploy Layers (if changed)                │
│  • Build all three layers                                   │
│  • Publish to AWS Lambda                                    │
│  • Save ARNs as artifacts                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Deploy Functions (parallel)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Function 1  │  │  Function 2  │  │  Function 3  │     │
│  │  • Bundle    │  │  • Bundle    │  │  • Bundle    │     │
│  │  • Package   │  │  • Package   │  │  • Package   │     │
│  │  • Deploy    │  │  • Deploy    │  │  • Deploy    │     │
│  │  • Smoke test│  │  • Smoke test│  │  • Smoke test│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   5. Deployment Summary                      │
│  • List affected functions                                  │
│  • Report success/failure per function                      │
│  • Include ARNs and versions                                │
└─────────────────────────────────────────────────────────────┘
```

### Change Detection Logic

The pipeline uses `scripts/get-affected-lambdas.js` to determine which functions need deployment:

| **Change Type**      | **Affected Functions**             | **Example**                                                        |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Single endpoint file | That endpoint only                 | `endpoints/gallery/upload-image/handler.ts` → `GalleryUploadImage` |
| Domain `_shared/`    | All endpoints in domain            | `endpoints/gallery/_shared/service.ts` → All 12 gallery functions  |
| Domain schemas       | All endpoints in domain            | `endpoints/wishlist/schemas.ts` → All 8 wishlist functions         |
| `core/` directory    | All functions using standard layer | `core/database/client.ts` → ~38 functions                          |
| Layer changes        | All functions using that layer     | `layers/processing-layer/package.json` → 7 functions               |
| `sst.config.ts`      | All functions                      | `sst.config.ts` → All 44 functions                                 |

**Examples:**

```bash
# See what would be deployed
node scripts/get-affected-lambdas.js --verbose

# Get functions using a specific layer
node scripts/get-affected-lambdas.js --layer=processing

# Compare against a specific branch
node scripts/get-affected-lambdas.js --base=origin/staging
```

### Reusable Workflow

All Lambda deployments use the same reusable workflow (`.github/workflows/reusable-deploy-lambda.yml`).

**Benefits:**

- ✅ Single source of truth for deployment logic
- ✅ Consistent deployment process for all 44 functions
- ✅ Easy to update deployment steps for all functions
- ✅ Can be triggered manually or from other workflows

**Workflow inputs:**

```yaml
inputs:
  function-name: 'GalleryUploadImage' # Required
  stage: 'dev' # Required: dev|staging|production
  region: 'us-east-1' # Optional
  run-tests: true # Optional: run tests before deploy
```

**Workflow outputs:**

```yaml
outputs:
  function-arn: 'arn:aws:lambda:...' # Deployed function ARN
  version: '12' # Published version number
```

## Manual Deployment

### Prerequisites

1. **AWS Credentials** configured:

   ```bash
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   ```

2. **Lambda Layers** deployed:

   ```bash
   cd apps/api/layers
   ./build-and-deploy-layers.sh dev us-east-1
   ```

3. **Dependencies** installed:

   ```bash
   cd apps/api
   pnpm install
   ```

4. **IAM Role** exists:
   - Role name: `lego-api-lambda-role-{stage}`
   - Required permissions: Lambda execution, VPC access, CloudWatch logs

### Deploy Single Function

```bash
cd apps/api

# Basic deployment
./scripts/deploy-lambda.sh GalleryUploadImage dev

# With specific region
./scripts/deploy-lambda.sh Health production us-west-2

# Dry run (see what would happen)
./scripts/deploy-lambda.sh GalleryListAlbums dev --dry-run
```

**What the script does:**

1. ✅ Reads function configuration from `layers/lambda-layer-mapping.ts`
2. ✅ Bundles function code with esbuild (excluding layer dependencies)
3. ✅ Creates ZIP package (~5-10MB, code only)
4. ✅ Reads layer ARNs from `layers/*/layer-arn-{stage}.txt`
5. ✅ Updates or creates Lambda function in AWS
6. ✅ Attaches correct layers based on function configuration
7. ✅ Publishes new version
8. ✅ Returns function ARN and version number

### Deploy Multiple Functions

```bash
# Deploy all gallery functions
for func in GalleryListAlbums GalleryGetAlbum GalleryCreateAlbum; do
  ./scripts/deploy-lambda.sh $func dev
done

# Deploy all functions using processing layer
PROCESSING_FUNCS=$(node scripts/get-affected-lambdas.js --layer=processing)
for func in $PROCESSING_FUNCS; do
  ./scripts/deploy-lambda.sh $func dev
done
```

### Deploy All Functions

```bash
# Get all function names
cd apps/api
ALL_FUNCTIONS=$(node -e "
  const fs = require('fs');
  const content = fs.readFileSync('layers/lambda-layer-mapping.ts', 'utf-8');
  const matches = content.matchAll(/name: '([^']+)'/g);
  const names = Array.from(matches, m => m[1]);
  console.log(names.join(' '));
")

# Deploy all
for func in $ALL_FUNCTIONS; do
  echo "Deploying $func..."
  ./scripts/deploy-lambda.sh $func dev || echo "Failed: $func"
done
```

## Deployment Workflow

### Typical Development Workflow

1. **Make changes** to your code:

   ```bash
   # Edit endpoint handler
   vim apps/api/endpoints/gallery/upload-image/handler.ts
   ```

2. **Test locally**:

   ```bash
   cd apps/api
   pnpm test
   pnpm check-types
   ```

3. **Commit and push**:

   ```bash
   git add .
   git commit -m "feat: improve image upload validation"
   git push origin feature/upload-improvements
   ```

4. **Create PR** → CI/CD automatically deploys to `dev`

5. **Merge to main** → CI/CD automatically deploys to `production`

### Hot Fix Workflow

For urgent fixes that need immediate deployment:

1. **Create fix**:

   ```bash
   git checkout -b hotfix/critical-bug
   # Make fix
   ```

2. **Test locally**:

   ```bash
   pnpm test
   ```

3. **Deploy directly** (skip CI/CD):

   ```bash
   ./scripts/deploy-lambda.sh GalleryUploadImage production
   ```

4. **Then commit** and create PR for record:
   ```bash
   git add .
   git commit -m "fix: critical bug in upload handler"
   git push
   # Create PR
   ```

### Rollback Workflow

If a deployment causes issues:

**Option 1: Revert code and redeploy**

```bash
# Revert the commit
git revert <commit-hash>
git push

# CI/CD will automatically deploy the reverted version
```

**Option 2: Deploy previous version manually**

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name lego-api-GalleryUploadImage-production

# Update alias to point to previous version
aws lambda update-alias \
  --function-name lego-api-GalleryUploadImage-production \
  --name live \
  --function-version 11  # Previous working version
```

**Option 3: Deploy from previous commit**

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Deploy
./scripts/deploy-lambda.sh GalleryUploadImage production

# Return to main
git checkout main
```

## Deployment Stages

### Dev Stage

- **Purpose:** Development and testing
- **Trigger:** Pull requests, manual deploys
- **Database:** Dev database (can be reset)
- **Monitoring:** Basic CloudWatch logs
- **Cost:** Minimal (low traffic)

### Staging Stage (Optional)

- **Purpose:** Pre-production testing
- **Trigger:** Manual deploys
- **Database:** Staging database (production-like data)
- **Monitoring:** Full monitoring enabled
- **Cost:** Medium (production-like scale)

### Production Stage

- **Purpose:** Live user traffic
- **Trigger:** Merges to `main` branch
- **Database:** Production database (protected)
- **Monitoring:** Full monitoring + alerts
- **Cost:** Variable (based on traffic)

## Troubleshooting

### Layer ARN not found

**Error:**

```
Error: Layer ARN file not found: layers/standard-layer/layer-arn-dev.txt
Run: ./layers/build-and-deploy-layers.sh dev us-east-1
```

**Solution:**

```bash
cd apps/api/layers
./build-and-deploy-layers.sh dev us-east-1
```

### Function not found in mapping

**Error:**

```
Error: Function MyNewFunction not found in mapping
```

**Solution:**

Add the function to `layers/lambda-layer-mapping.ts`:

```typescript
{
  name: 'MyNewFunction',
  handler: 'endpoints/my-domain/my-endpoint/handler.handler',
  domain: 'my-domain',
  layers: ['minimal', 'standard'],
},
```

### IAM role not found

**Error:**

```
Error: IAM role not found. Please create 'lego-api-lambda-role-dev' first.
```

**Solution:**

Create the IAM role (usually done by SST):

```bash
# Or use AWS Console to create the role with:
# - Lambda execution permissions
# - VPC access (if needed)
# - CloudWatch logs permissions
```

### Bundle size too large

**Error:**

```
RequestEntityTooLargeException: Request must be smaller than 69905067 bytes
```

**Cause:** Function code + layers exceed 250MB unzipped limit

**Solution:**

1. Check what's being bundled:

   ```bash
   cd apps/api/.build/GalleryUploadImage
   du -sh *
   ```

2. Ensure dependencies are externalized:
   - Edit `scripts/deploy-lambda.sh`
   - Add more `--external:package-name` flags

3. Move dependencies to layers if possible

### Deployment timeout

**Error:**

```
Error: Function update timed out after 5 minutes
```

**Possible causes:**

- VPC configuration issues (no NAT gateway)
- Function in infinite loop during initialization
- Very large deployment package

**Solution:**

1. Check CloudWatch logs for errors
2. Verify VPC/security group configuration
3. Increase timeout in deployment script
4. Check for initialization errors

### Permission denied errors

**Error:**

```
AccessDeniedException: User is not authorized to perform: lambda:UpdateFunctionCode
```

**Solution:**

Ensure AWS credentials have necessary Lambda permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishVersion",
        "lambda:GetFunction",
        "lambda:CreateFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:lego-api-*"
    }
  ]
}
```

## Best Practices

### 1. Always test locally first

```bash
pnpm test
pnpm check-types
sst dev  # Test with real AWS resources
```

### 2. Use dev stage for experimentation

```bash
# Try risky changes in dev first
./scripts/deploy-lambda.sh MyFunction dev

# If successful, deploy to production
./scripts/deploy-lambda.sh MyFunction production
```

### 3. Deploy during low-traffic periods

- Production deployments during off-peak hours
- Use CloudWatch metrics to identify low-traffic windows

### 4. Monitor after deployment

```bash
# Watch CloudWatch logs
aws logs tail /aws/lambda/lego-api-GalleryUploadImage-production --follow

# Check error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=lego-api-GalleryUploadImage-production \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 5. Keep deployment packages small

- Externalize all layer dependencies
- Don't bundle node_modules that are in layers
- Use esbuild tree-shaking

### 6. Version everything

- Layer versions are immutable
- Function versions are immutable
- Use aliases for routing traffic

### 7. Use CI/CD for production

- Avoid manual production deployments
- Use CI/CD for audit trail and consistency
- Manual deploys are for emergencies only

## Related Documentation

- [Lambda Layers README](./layers/README.md)
- [SST Config Example](./layers/sst-config-example.ts)
- [Get Affected Lambdas Script](./scripts/get-affected-lambdas.js)
- [Build and Deploy Layers Script](./layers/build-and-deploy-layers.sh)
