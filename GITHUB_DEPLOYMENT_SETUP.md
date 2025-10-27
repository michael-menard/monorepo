# GitHub Deployment Setup

This document explains how to configure GitHub repository secrets and environment files for automated frontend deployment.

## Required GitHub Secrets

Navigate to your repository → Settings → Secrets and variables → Actions → Secrets

### AWS Credentials (Sensitive - Keep as Secrets)
- **`AWS_ACCESS_KEY_ID`** - Your AWS access key ID for the `lego-moc-deployer` user
- **`AWS_SECRET_ACCESS_KEY`** - Your AWS secret access key for the `lego-moc-deployer` user
- **`AWS_ACCOUNT_ID`** - Your AWS account ID (e.g., `213351177820`)

## Environment Configuration Files

Instead of GitHub variables, we use environment files stored in the repository:

### Staging Environment
File: `.github/environments/staging.env`

Contains your current staging configuration:
- **`S3_BUCKET_NAME`**: `lego-moc-frontend-staging-213351177820`
- **`CLOUDFRONT_DISTRIBUTION_ID`**: `E1WB24HDQZF3SZ`
- **`FRONTEND_URL`**: `https://d1dftknr5az71q.cloudfront.net`

### Production Environment
File: `.github/environments/production.env`

Template for production configuration (update when you deploy production):
- **`S3_BUCKET_NAME`**: `lego-moc-frontend-production-213351177820`
- **`CLOUDFRONT_DISTRIBUTION_ID`**: `YOUR_PROD_DISTRIBUTION_ID`
- **`FRONTEND_URL`**: `https://app.yourdomain.com`

## Benefits of Environment Files

✅ **Version Controlled** - Configuration changes are tracked in git
✅ **Environment Specific** - Easy to maintain staging vs production configs
✅ **No GitHub UI Setup** - No need to configure variables in GitHub interface
✅ **Transparent** - All configuration is visible in the repository
✅ **Easy Updates** - Just edit the file and commit

## How to Get These Values

### From Your Current Deployment

You can get the current values from your AWS CloudFormation stack:

```bash
# Get S3 bucket name
aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text

# Get CloudFront distribution ID
aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text

# Get frontend URL
aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
  --output text
```

### Current Values (Based on Your Deployment)

Based on your successful deployment, here are the values you should use:

- **`S3_BUCKET_NAME`**: `lego-moc-frontend-staging-213351177820`
- **`CLOUDFRONT_DISTRIBUTION_ID`**: `E1WB24HDQZF3SZ`
- **`FRONTEND_URL`**: `https://d1dftknr5az71q.cloudfront.net`

## Workflow Trigger

The updated workflow will automatically deploy when:

1. **Push to main branch** with changes to:
   - `apps/web/lego-moc-instructions-app/**`
   - `packages/**`
   - `.github/workflows/deploy-frontend.yml`

2. **Manual trigger** via GitHub Actions UI:
   - Go to Actions → Deploy Frontend → Run workflow
   - Choose environment (staging/production)

## Environment Configuration

The workflow supports two environments:

### Staging (Default)
- Automatically deploys on push to main
- Uses staging AWS resources
- Environment: `staging`

### Production
- Manual deployment only
- Uses production AWS resources  
- Environment: `production`

## Deployment Process

The enhanced workflow now:

1. ✅ **Validates** all required environment variables
2. ✅ **Builds essential packages** (@repo/ui, @repo/cache, @repo/auth)
3. ✅ **Builds frontend** with proper environment variables
4. ✅ **Verifies build artifacts** before deployment
5. ✅ **Deploys CDK infrastructure** (if changes needed)
6. ✅ **Syncs to S3** with deletion of old files
7. ✅ **Invalidates CloudFront** and waits for completion
8. ✅ **Performs health check** on deployed site
9. ✅ **Creates deployment summary** with all relevant URLs

## Troubleshooting

### Common Issues

1. **Missing environment variables** - The workflow will fail early with clear error messages
2. **Build failures** - Check the "Build essential packages" step for TypeScript errors
3. **AWS permission issues** - Verify your AWS credentials have the required permissions
4. **CloudFront cache** - The workflow waits for invalidation to complete

### Monitoring

- Check the **Actions** tab for deployment status
- View the **deployment summary** for quick access to URLs
- Monitor **CloudFormation** console for infrastructure changes

## Testing Environment Configuration

You can test your environment configuration locally before deploying:

```bash
# Test staging environment
./scripts/test-env-config.sh staging

# Test production environment
./scripts/test-env-config.sh production
```

This script will:
- ✅ Load the environment file
- ✅ Display all configuration values
- ✅ Validate required variables are set
- ✅ Report any missing or invalid configuration

## Next Steps

### 1. Set Up GitHub Secrets (One Time)
Only the AWS credentials need to be configured as GitHub secrets:
- Navigate to your repository → Settings → Secrets and variables → Actions → Secrets
- Add the three AWS credential secrets listed above

### 2. Test Your Configuration
```bash
./scripts/test-env-config.sh staging
```

### 3. Deploy Automatically
1. Make a small change to your frontend code
2. Push to main branch
3. Watch the automatic deployment in GitHub Actions
4. Verify the changes are live at your frontend URL

The deployment should complete in approximately 3-5 minutes.

### 4. Update Configuration (When Needed)
To change deployment configuration:
1. Edit `.github/environments/staging.env` or `.github/environments/production.env`
2. Commit and push the changes
3. The next deployment will use the updated configuration

## No GitHub UI Configuration Required! 🎉

Unlike the previous approach, you don't need to configure any variables in the GitHub web interface. Everything is managed through the environment files in your repository.
