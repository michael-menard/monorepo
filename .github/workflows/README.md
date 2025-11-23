# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for the LEGO MOC Instructions monorepo.

## Workflows Overview

### Production Deployment

#### `deploy-production.yml`
**Purpose:** Automated production deployment pipeline with approval gate

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Pipeline Stages:**
1. **Lint** - ESLint and TypeScript type checking
2. **Test** - Unit and integration tests with coverage
3. **Build** - Build packages and SST application
4. **Deploy** - Deploy to production (requires approval)

**Key Features:**
- ✅ Automated testing before deployment
- ✅ Build artifact caching
- ✅ Manual approval required for production
- ✅ Database migrations
- ✅ Slack notifications on success/failure

**Approval Gate:**
- Configured via GitHub Environments
- Requires reviewer approval before deploy stage
- See [GitHub Environment Setup Guide](../../docs/github-environment-setup.md)

#### `rollback-production.yml`
**Purpose:** Manual rollback to previous version

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `version` - Git commit SHA or tag to rollback to

**Process:**
1. Checkout code at specified version
2. Install dependencies
3. Deploy via SST
4. Notify Slack

**Usage:**
```bash
# Via GitHub UI
Actions → Rollback Production → Run workflow → Enter commit SHA
```

### Continuous Integration

#### `ci.yml`
**Purpose:** Run tests and checks on pull requests

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**
- Detect changed files
- Lint and type check
- Run tests on changed packages
- Build changed packages

### Other Workflows

#### `dependencies.yml`
**Purpose:** Keep dependencies up to date

#### `security.yml`
**Purpose:** Security scanning and vulnerability checks

#### `lego-moc-instructions-app.yml`
**Purpose:** Frontend application deployment

#### `lego-projects-api.yml`
**Purpose:** Backend API deployment

## Required Secrets

### Repository Secrets
Configure these in **Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for deployment |
| `AWS_REGION` | AWS region (e.g., us-east-1) |
| `TEST_DATABASE_URL` | PostgreSQL URL for CI tests |
| `TEST_REDIS_URL` | Redis URL for CI tests |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `CODECOV_TOKEN` | Codecov upload token (optional) |

### Environment Secrets (Production)
Configure these in **Settings → Environments → production**

| Secret | Description |
|--------|-------------|
| `PRODUCTION_DATABASE_URL` | Production PostgreSQL URL |
| `PRODUCTION_REDIS_URL` | Production Redis URL |
| `PRODUCTION_OPENSEARCH_ENDPOINT` | Production OpenSearch endpoint |
| `PRODUCTION_S3_BUCKET` | Production S3 bucket name |
| `PRODUCTION_COGNITO_USER_POOL_ID` | Production Cognito user pool ID |

**See [GitHub Environment Setup Guide](../../docs/github-environment-setup.md) for detailed configuration instructions.**

## GitHub Environment Setup

The production deployment workflow requires a GitHub Environment to be configured:

1. Navigate to **Settings → Environments**
2. Create environment: `production`
3. Configure protection rules:
   - ✅ Required reviewers (minimum 1)
   - ✅ Deployment branches: `main` only
4. Add environment secrets (see above)

**Detailed instructions:** [GitHub Environment Setup Guide](../../docs/github-environment-setup.md)

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Push to main                                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Lint & Type    │
              │  Check          │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Run Tests      │
              │  (Unit + Integ) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Build          │
              │  (SST + Pkgs)   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Approval Gate  │ ◄── Manual Review Required
              │  (GitHub Env)   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Deploy to Prod │
              │  + Migrations   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Slack Notify   │
              │  (Success/Fail) │
              └─────────────────┘
```

## Development Workflow

### Making Changes
1. Create feature branch from `main`
2. Make changes and commit
3. Push feature branch
4. Create pull request to `main`
5. CI workflow runs automatically
6. Address any failures
7. Get PR approved and merge

### Deploying to Production
1. Merge PR to `main` (or push directly to `main`)
2. `deploy-production.yml` workflow starts automatically
3. Wait for lint, test, and build stages to complete
4. Approve deployment in GitHub Actions UI
5. Monitor deployment progress
6. Check Slack for success/failure notification
7. Verify deployment at https://api.lego-mocs.com/health

### Rolling Back
1. Navigate to **Actions → Rollback Production**
2. Click **Run workflow**
3. Enter commit SHA to rollback to (from `git log`)
4. Confirm and run
5. Approve deployment if approval gate is configured
6. Monitor rollback progress
7. Check Slack for rollback notification

## Pipeline Duration

Expected duration for production deployment (excluding approval wait):

| Stage | Duration |
|-------|----------|
| Lint | 1-2 minutes |
| Test | 3-5 minutes |
| Build | 2-3 minutes |
| Deploy | 3-5 minutes |
| **Total** | **~10-15 minutes** |

**Optimization opportunities:**
- Cache pnpm dependencies (already enabled)
- Parallel test execution
- Incremental builds with Turborepo (partially enabled)

## Troubleshooting

### Workflow doesn't start
- Check workflow syntax with `act -l`
- Verify workflow is enabled in Actions settings
- Check branch name matches trigger condition

### Approval gate doesn't appear
- Verify production environment exists
- Check "Required reviewers" is configured
- Ensure you're not the only reviewer

### Deployment fails
- Check AWS credentials are valid
- Verify all required secrets are set
- Review workflow logs in Actions tab
- Check CloudFormation stack in AWS Console

### No Slack notification
- Verify `SLACK_WEBHOOK_URL` is set
- Check webhook is active in Slack settings
- Review workflow logs for Slack API errors

### Build artifacts not found
- Check upload step succeeded in build job
- Verify artifact name matches in download step
- Check artifact retention period (default: 1 day)

## Best Practices

### Security
- ✅ Never commit secrets to repository
- ✅ Use environment secrets for production
- ✅ Rotate AWS credentials every 90 days
- ✅ Require pull request reviews
- ✅ Enable branch protection on `main`

### Deployment
- ✅ Always test changes in staging first
- ✅ Deploy during low-traffic periods
- ✅ Monitor CloudWatch metrics after deployment
- ✅ Keep last 3 commit SHAs for quick rollback
- ✅ Document breaking changes in commit messages

### Testing
- ✅ Run tests locally before pushing
- ✅ Don't skip approval gate for urgent fixes
- ✅ Verify migrations in staging environment first
- ✅ Use feature flags for risky changes

## Maintenance

### Regular Tasks
- Review and approve Dependabot PRs
- Monitor workflow execution times
- Update GitHub Actions versions
- Rotate AWS credentials quarterly
- Test rollback procedure quarterly

### Updating Workflows
1. Create feature branch
2. Modify workflow file
3. Test with `act` locally if possible
4. Create PR with workflow changes
5. Monitor first run carefully after merge

## Monitoring

### Key Metrics
- Deployment frequency (goal: multiple per week)
- Deployment success rate (goal: >95%)
- Mean time to deployment (goal: <20 minutes)
- Rollback frequency (goal: <5% of deployments)

### Alerts
- Slack notifications on deployment failure
- CloudWatch alarms for Lambda errors
- GitHub Actions email on workflow failure

## Related Documentation

- [GitHub Environment Setup Guide](../../docs/github-environment-setup.md)
- [SST Deployment Guide](https://docs.sst.dev/deployment)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Story 5.4: CI/CD Pipeline](../../docs/stories/5.4-cicd-pipeline-github-actions.md)

---

**Last Updated:** 2025-11-22
**Version:** 1.0
