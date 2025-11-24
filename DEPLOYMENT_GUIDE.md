# Monorepo Deployment Guide

This guide walks you through deploying your monorepo to AWS.

## Prerequisites

- [x] AWS Account with admin access
- [x] AWS CLI configured
- [x] Node.js 20+ and pnpm installed
- [x] SST CLI installed (via pnpm)

## Current Status

### Fixed Issues ✅

1. **SST Configuration**: Moved all top-level imports to dynamic imports inside the `run()` function
2. **VPC Configuration**: Fixed NAT gateway configuration to use `{ type: 'managed' }`
3. **API Gateway Authorizer**: Fixed to use `api.nodes.api.id` instead of `api.id`
4. **IAM Policy**: Created comprehensive deployment policy document

### Remaining Issues ⚠️

1. **IAM Permissions**: The `lego-moc-deployer` user needs additional permissions

## Step 1: Grant IAM Permissions

Your `lego-moc-deployer` user currently lacks the necessary permissions to deploy infrastructure. You need to attach the IAM policy created at:

```
apps/api/docs/DEPLOYMENT_IAM_POLICY.json
```

### Option A: Using AWS Console

1. Go to IAM Console → Users → `lego-moc-deployer`
2. Click "Add permissions" → "Attach policies directly"
3. Click "Create policy"
4. Choose "JSON" tab
5. Copy the contents of `apps/api/docs/DEPLOYMENT_IAM_POLICY.json`
6. Create the policy with name: `SST-Deployment-Policy`
7. Attach it to the `lego-moc-deployer` user

### Option B: Using AWS CLI (if you have admin credentials)

```bash
# Create the policy
aws iam create-policy \
  --policy-name SST-Deployment-Policy \
  --policy-document file://apps/api/docs/DEPLOYMENT_IAM_POLICY.json

# Attach to user (replace ACCOUNT_ID with your AWS account ID: 213351177820)
aws iam attach-user-policy \
  --user-name lego-moc-deployer \
  --policy-arn arn:aws:iam::213351177820:policy/SST-Deployment-Policy
```

## Step 2: Deploy the API

Once IAM permissions are granted:

```bash
cd apps/api
pnpm sst deploy --stage production
```

This will create:

- VPC with public/private subnets across 2 AZs
- RDS PostgreSQL database
- OpenSearch domain
- S3 buckets for storage
- Cognito User Pool for authentication
- API Gateway with HTTP and WebSocket APIs
- Lambda functions for all endpoints
- DynamoDB table for WebSocket connections
- CloudWatch dashboards and alarms
- SNS topics for alerts
- Cost monitoring and budgets

Expected deployment time: 20-30 minutes

## Step 3: Configure Frontend

After API deployment completes, you'll receive output with:

- API URL
- WebSocket URL
- Cognito User Pool ID
- Cognito User Pool Client ID
- Identity Pool ID

Create `apps/web/lego-moc-instructions-app/.env.production`:

```env
VITE_USE_AWS_SERVICES=true
VITE_API_BASE_URL=<API_URL_FROM_DEPLOYMENT>
VITE_WEBSOCKET_URL=<WEBSOCKET_URL_FROM_DEPLOYMENT>
VITE_USER_POOL_ID=<USER_POOL_ID_FROM_DEPLOYMENT>
VITE_USER_POOL_CLIENT_ID=<CLIENT_ID_FROM_DEPLOYMENT>
VITE_IDENTITY_POOL_ID=<IDENTITY_POOL_ID_FROM_DEPLOYMENT>
VITE_ENVIRONMENT=production
```

## Step 4: Deploy Frontend

The frontend needs to be deployed to a hosting service. Options:

### Option A: AWS Amplify Hosting (Recommended)

```bash
cd apps/web/lego-moc-instructions-app
pnpm build

# Upload build output to Amplify
# (This requires setting up Amplify Hosting in AWS Console first)
```

### Option B: Vercel

```bash
cd apps/web/lego-moc-instructions-app
vercel --prod
```

### Option C: Netlify

```bash
cd apps/web/lego-moc-instructions-app
pnpm build
netlify deploy --prod --dir=dist
```

### Option D: S3 + CloudFront (Manual)

```bash
cd apps/web/lego-moc-instructions-app
pnpm build

# Create S3 bucket
aws s3 mb s3://lego-moc-app-production

# Upload files
aws s3 sync dist/ s3://lego-moc-app-production/ --acl public-read

# Configure as static website
aws s3 website s3://lego-moc-app-production/ \
  --index-document index.html \
  --error-document index.html
```

## Step 5: Initialize Database

After deployment, run migrations:

```bash
cd apps/api
pnpm db:migrate
```

## Step 6: Verify Deployment

1. Check API health:

   ```bash
   curl https://<API_URL>/health
   ```

2. Check CloudWatch dashboard in AWS Console

3. Test authentication flow in the frontend

## Monitoring

- **CloudWatch Dashboard**: Search for "lego-api-serverless-production" in CloudWatch Console
- **Logs**: Each Lambda function has its own log group
- **Alarms**: SNS topics will send alerts for errors
- **Costs**: Budget alerts configured for monthly spend

## Cost Estimates (Production)

- VPC with NAT Gateway: ~$32/month
- RDS PostgreSQL (db.t3.micro): ~$15/month
- OpenSearch (t3.small.search): ~$25/month
- API Gateway + Lambda: Pay per request (~$10-50/month depending on traffic)
- S3 Storage: ~$5/month
- CloudWatch Logs: ~$5/month
- **Total**: ~$92-132/month + variable costs

## Rollback

If you need to remove everything:

```bash
cd apps/api
pnpm sst remove --stage production
```

⚠️ **Warning**: This will delete all infrastructure including databases!

## Troubleshooting

### Issue: IAM Permission Errors

**Solution**: Ensure all permissions from `apps/api/docs/DEPLOYMENT_IAM_POLICY.json` are attached

### Issue: VPC Quota Exceeded

**Solution**: Delete unused VPCs or request quota increase from AWS Support

### Issue: RDS Subnet Group Error

**Solution**: Ensure you have at least 2 availability zones with private subnets

### Issue: OpenSearch Domain Creation Fails

**Solution**: Check service quotas for OpenSearch domains in your region

## Next Steps

1. Set up custom domain for API and frontend
2. Configure SSL certificates
3. Set up CI/CD pipeline
4. Configure backup policies for RDS
5. Set up monitoring alerts and on-call rotation

## Support

For issues or questions:

- Check CloudWatch Logs for error details
- Review SST documentation: https://sst.dev
- Check AWS service quotas and limits
