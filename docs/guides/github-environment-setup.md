# GitHub Environment Setup Guide

This guide explains how to configure the GitHub production environment and secrets required for the CI/CD pipeline.

## GitHub Environment Configuration

### Creating the Production Environment

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Environments**
3. Click **New environment**
4. Name: `production`

### Protection Rules

Configure the following protection rules for the production environment:

#### Required Reviewers

- ✅ Enable **Required reviewers**
- Add at least 1 reviewer (e.g., `@devops-team` or specific users)
- This ensures manual approval before production deployment

#### Deployment Branches

- ✅ Enable **Deployment branches**
- Select **Selected branches**
- Add: `main`
- This ensures only the main branch can deploy to production

#### Wait Timer (Optional)

- Set to `0` minutes (or configure as needed for your workflow)

## GitHub Secrets Configuration

Navigate to **Settings** → **Secrets and variables** → **Actions**

### Repository Secrets

Configure the following secrets at the repository level:

#### AWS Credentials

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

**How to obtain:**

1. Log in to AWS Console
2. Navigate to IAM → Users
3. Create a new user for GitHub Actions (or use existing)
4. Attach policy: `AdministratorAccess` (or create custom policy with required permissions)
5. Create access key → Copy Access Key ID and Secret Access Key

#### Production Database

```
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/lego_production
```

**Format:**

```
postgresql://[username]:[password]@[host]:[port]/[database]
```

#### Production Redis

```
PRODUCTION_REDIS_URL=redis://production-redis.cache.amazonaws.com:6379
```

**How to obtain:**

1. AWS Console → ElastiCache
2. Find your production Redis cluster
3. Copy the **Primary Endpoint**
4. Format: `redis://[endpoint]:[port]`

#### Production OpenSearch

```
PRODUCTION_OPENSEARCH_ENDPOINT=https://search-lego-production.us-east-1.es.amazonaws.com
```

**How to obtain:**

1. AWS Console → OpenSearch Service
2. Find your production domain
3. Copy the **Domain endpoint**

#### Production S3 Bucket

```
PRODUCTION_S3_BUCKET=lego-api-production
```

**Value:** Your S3 bucket name for production

#### Production Cognito

```
PRODUCTION_COGNITO_USER_POOL_ID=us-east-1_XXXXX
```

**How to obtain:**

1. AWS Console → Cognito
2. Find your production User Pool
3. Copy the **Pool Id**

#### Test Environment (for CI Tests)

```
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/lego_test
TEST_REDIS_URL=redis://localhost:6379
```

**Note:** These are used for integration tests in CI. They should point to test databases, not production.

#### Slack Webhook

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**How to obtain:**

1. Go to your Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Select the channel for deployment notifications
5. Copy the **Webhook URL**

#### Codecov (Optional)

```
CODECOV_TOKEN=...
```

**How to obtain:**

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Copy the **Repository Upload Token**

## Environment Secrets vs Repository Secrets

### Repository Secrets (Configure at repository level)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `TEST_DATABASE_URL`
- `TEST_REDIS_URL`
- `SLACK_WEBHOOK_URL`
- `CODECOV_TOKEN`

### Environment Secrets (Configure at environment level - production)

- `PRODUCTION_DATABASE_URL`
- `PRODUCTION_REDIS_URL`
- `PRODUCTION_OPENSEARCH_ENDPOINT`
- `PRODUCTION_S3_BUCKET`
- `PRODUCTION_COGNITO_USER_POOL_ID`

**Why separate?** Environment-specific secrets are scoped to the `production` environment and only accessible when deploying to that environment. This provides an additional layer of security.

## Verification Checklist

After configuration, verify:

- [ ] Production environment created
- [ ] Required reviewers configured (minimum 1)
- [ ] Deployment branches restricted to `main`
- [ ] All AWS credentials configured
- [ ] All production service URLs configured
- [ ] Test database URLs configured
- [ ] Slack webhook configured
- [ ] Codecov token configured (if using)

## Testing the Configuration

1. **Trigger a deployment:**

   ```bash
   git push origin main
   ```

2. **Verify workflow runs:**
   - Navigate to **Actions** tab in GitHub
   - Check that the "Deploy to Production" workflow starts

3. **Verify approval gate:**
   - Workflow should pause at the deploy job
   - An approval should be required before deployment proceeds

4. **Test Slack notifications:**
   - After deployment completes, check your Slack channel
   - You should receive a success or failure notification

## Troubleshooting

### Workflow fails at lint/test stage

- Check that all dependencies are properly installed
- Verify `pnpm-lock.yaml` is committed to repository

### Workflow fails at build stage

- Verify AWS credentials are correct
- Check AWS IAM permissions for the user

### Workflow fails at deploy stage

- Verify all production secrets are configured correctly
- Check SST deployment logs in the workflow output

### No Slack notification received

- Verify `SLACK_WEBHOOK_URL` is correct
- Check that the Slack app has permission to post to the channel

### Approval gate not working

- Verify production environment has "Required reviewers" enabled
- Check that the correct GitHub users/teams are added as reviewers

## Security Best Practices

1. **Rotate credentials regularly:** Update AWS access keys every 90 days
2. **Use least-privilege IAM policies:** Grant only necessary permissions
3. **Audit secret access:** Review who has access to repository secrets
4. **Enable branch protection:** Require pull request reviews before merging to main
5. **Use environment secrets:** Separate production secrets from repository secrets
6. **Enable two-factor authentication:** Require 2FA for all team members

## Additional Resources

- [GitHub Environments Documentation](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SST Deployment Guide](https://docs.sst.dev/deployment)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

**Last Updated:** 2025-11-22
**Version:** 1.0
