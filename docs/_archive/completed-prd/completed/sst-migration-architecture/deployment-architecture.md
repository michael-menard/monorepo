# Deployment Architecture

## SST Deployment Workflow

**SST Stages**:

- `dev`: Personal developer environments (ephemeral)
- `staging`: Shared pre-production environment
- `production`: Live environment

**Deployment Commands**:

```bash
# Development (local + remote)
sst dev

# Deploy to staging
sst deploy --stage staging

# Deploy to production
sst deploy --stage production

# Remove stack
sst remove --stage dev
```

## CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/sst-deploy.yml`):

```yaml
name: Deploy SST Serverless API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/lego-api-serverless/**'
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter lego-api-serverless lint
      - run: pnpm --filter lego-api-serverless check-types
      - run: pnpm --filter lego-api-serverless test
      - run: pnpm --filter lego-api-serverless build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: npx sst deploy --stage staging
        working-directory: apps/api/lego-api-serverless
      - name: Run Integration Tests
        run: pnpm --filter lego-api-serverless test:integration

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}
          aws-region: us-east-1
      - run: npx sst deploy --stage production
        working-directory: apps/api/lego-api-serverless
```

**Deployment Gates**:

- Linting and type checking must pass
- Unit tests >95% coverage
- Integration tests against staging must pass
- Manual approval required for production deployment

## Environment Variables

**Development** (`.env.local`):

```bash
AWS_PROFILE=lego-moc-dev
AWS_REGION=us-east-1
STAGE=dev
```

**Staging/Production** (GitHub Secrets):

- `AWS_ROLE_ARN`: OIDC role for staging deployments
- `AWS_ROLE_ARN_PROD`: OIDC role for production deployments

**Runtime Env Vars** (injected by SST via Resource):

- All database, Redis, OpenSearch, S3 values
- No hardcoded configuration in code

---
