# Turborepo + SST Migration Guide

## New Architecture

We've restructured the monorepo to leverage Turborepo's change detection for granular deployments:

```
shared/
└── infrastructure/          → @repo/shared-infrastructure
    ├── sst.config.ts       (VPC, Database, Redis, ES)
    └── package.json

apps/
├── api/
│   ├── gateway/            → @repo/api-gateway
│   │   ├── sst.config.ts   (API Gateway, Cognito)
│   │   └── package.json
│   └── functions/
│       └── gallery/        → @repo/gallery-functions
│           ├── sst.config.ts (Gallery Lambda functions)
│           └── package.json
└── web/
    └── lego-moc-instructions-app/ → @repo/lego-moc-instructions-app
        ├── sst.config.ts   (Frontend S3 + CloudFront)
        └── package.json
```

## New Deployment Commands

### Smart Deployments (Recommended)

```bash
# Deploy only what changed since last commit
pnpm run deploy:changed

# Deploy only what changed since main branch
pnpm run deploy:since-main
```

### Specific Component Deployments

```bash
# Deploy shared infrastructure (database, Redis, etc.)
pnpm run deploy:shared

# Deploy API Gateway and auth
pnpm run deploy:api-gateway

# Deploy gallery functions only
pnpm run deploy:gallery

# Deploy frontend only
pnpm run deploy:frontend

# Deploy everything
pnpm run deploy:all
```

## Migration Steps

### 1. Install Dependencies

```bash
pnpm install
```

### 2. First-Time Setup (Deploy Everything)

```bash
# Deploy in dependency order
pnpm run deploy:shared        # ~15 min (database, infrastructure)
pnpm run deploy:api-gateway   # ~3 min (API Gateway, auth)
pnpm run deploy:gallery       # ~2 min (gallery functions)
pnpm run deploy:frontend      # ~2 min (static site)
```

### 3. Daily Development Workflow

```bash
# Make changes to gallery functions
git add apps/api/functions/gallery/
git commit -m "fix: gallery upload validation"

# Turborepo automatically detects and deploys only gallery functions
pnpm run deploy:changed       # ~30 seconds!
```

## Benefits

✅ **30-second deployments** - Only deploy what changed
✅ **Parallel deployments** - Independent services deploy simultaneously  
✅ **Dependency-aware** - Shared infrastructure changes trigger dependent deployments
✅ **Caching** - Skip deployments if nothing changed
✅ **Granular control** - Deploy individual function groups

## Next Steps

1. **Complete the migration** by creating remaining function groups:
   - `apps/api/functions/wishlist/`
   - `apps/api/functions/moc-instructions/`
   - `apps/api/functions/health/`

2. **Move existing infrastructure** from `apps/api/sst.config.ts` to the new structure

3. **Test the workflow** with small changes to see Turborepo's magic in action

## Example Workflow

```bash
# Working on gallery upload feature
vim apps/api/functions/gallery/src/upload-image/handler.ts
git add . && git commit -m "feat: add image validation"
pnpm run deploy:changed  # Only deploys gallery functions (~30 sec)

# Working on database schema
vim shared/infrastructure/database/schema.ts
git add . && git commit -m "feat: add new table"
pnpm run deploy:changed  # Deploys shared infrastructure + all dependents (~5 min)
```

This gives you the ultimate granular deployment experience!
