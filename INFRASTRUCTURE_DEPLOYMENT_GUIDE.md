# Infrastructure Deployment Guide

Complete guide to deploying the LEGO MOC Platform infrastructure to AWS using CDK.

## Prerequisites Checklist

- [x] AWS CLI installed (version 2.31.3 detected)
- [x] Node.js 20+ installed
- [x] CDK dependencies installed
- [ ] AWS account with appropriate permissions
- [ ] AWS credentials configured
- [ ] CDK bootstrapped in target region

## Step 1: Configure AWS Credentials

You have several options for configuring AWS credentials:

### Option A: AWS SSO (Recommended for Organizations)

```bash
aws configure sso
# Follow the prompts to set up SSO
```

### Option B: IAM User Access Keys

1. **Create IAM User** (if you don't have one):
   - Go to AWS Console → IAM → Users → Add User
   - Grant permissions: `AdministratorAccess` (for CDK deployment)
   - Create access keys

2. **Configure credentials**:
   ```bash
   aws configure
   ```

   You'll be prompted for:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., `us-east-1`)
   - Default output format (e.g., `json`)

3. **Verify credentials**:
   ```bash
   aws sts get-caller-identity
   ```

   Should output:
   ```json
   {
       "UserId": "AIDAXXXXXXXXXXXXXXXXX",
       "Account": "123456789012",
       "Arn": "arn:aws:iam::123456789012:user/your-username"
   }
   ```

### Option C: Environment Variables

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Step 2: Set CDK Environment Variables

```bash
# Get your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Set your preferred region
export AWS_REGION=us-east-1

# Set CDK-specific variables
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_REGION

# Verify
echo "Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

## Step 3: Bootstrap CDK

Bootstrap creates necessary AWS resources for CDK deployments (S3 bucket, IAM roles, etc.).

**You only need to do this once per account/region combination.**

```bash
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

Expected output:
```
 ⏳  Bootstrapping environment aws://123456789012/us-east-1...
 ✅  Environment aws://123456789012/us-east-1 bootstrapped.
```

### Verify Bootstrap

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION
```

## Step 4: Deploy Infrastructure

You can deploy each stack individually or all together.

### Deploy Auth Service (Recommended First)

```bash
cd apps/api/auth-service/infrastructure/aws-cdk

# Review what will be deployed
ENVIRONMENT=staging npx cdk diff

# Deploy to staging
ENVIRONMENT=staging npx cdk deploy

# Or use the npm script
npm run deploy:staging
```

**Expected deployment time:** 15-25 minutes

### Deploy LEGO Projects API

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/api/lego-projects-api/infrastructure/aws-cdk

# Review changes
ENVIRONMENT=staging npx cdk diff

# Deploy
ENVIRONMENT=staging npx cdk deploy
```

**Expected deployment time:** 20-30 minutes (includes RDS, Redis, OpenSearch)

### Deploy Frontend

```bash
cd /Users/michaelmenard/Development/Monorepo/apps/web/lego-moc-instructions-app/infrastructure/aws-cdk

# First, build the frontend application
cd /Users/michaelmenard/Development/Monorepo
pnpm --filter lego-moc-instructions-app build

# Then deploy infrastructure
cd apps/web/lego-moc-instructions-app/infrastructure/aws-cdk
ENVIRONMENT=staging npx cdk deploy
```

**Expected deployment time:** 10-15 minutes

## Step 5: Build and Push Docker Images

After infrastructure is deployed, you need to build and push container images.

### Auth Service

```bash
cd /Users/michaelmenard/Development/Monorepo

# Get ECR repository URI from stack outputs
AUTH_ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AUTH_ECR_URI

# Build and push image
docker build -f apps/api/auth-service/Dockerfile -t $AUTH_ECR_URI:latest .
docker push $AUTH_ECR_URI:latest

# Update ECS service
CLUSTER_NAME=$(aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
  --output text)

SERVICE_NAME=$(aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
  --output text)

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment
```

### LEGO Projects API

```bash
# Get ECR repository URI
LEGO_ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name LegoApiStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`RepositoryUri`].OutputValue' \
  --output text)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $LEGO_ECR_URI

# Build and push
docker build -f apps/api/lego-projects-api/Dockerfile -t $LEGO_ECR_URI:latest .
docker push $LEGO_ECR_URI:latest

# Update service
CLUSTER_NAME=$(aws cloudformation describe-stacks \
  --stack-name LegoApiStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue' \
  --output text)

SERVICE_NAME=$(aws cloudformation describe-stacks \
  --stack-name LegoApiStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue' \
  --output text)

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment
```

## Step 6: Deploy Frontend Static Assets

```bash
cd /Users/michaelmenard/Development/Monorepo

# Get S3 bucket name and CloudFront distribution ID
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

CF_DISTRIBUTION=$(aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

# Sync built files to S3
aws s3 sync apps/web/lego-moc-instructions-app/dist/ s3://$S3_BUCKET --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $CF_DISTRIBUTION \
  --paths "/*"
```

## Step 7: Verify Deployment

### Check Stack Status

```bash
# Auth Service
aws cloudformation describe-stacks --stack-name AuthServiceStackStaging

# LEGO API
aws cloudformation describe-stacks --stack-name LegoApiStackStaging

# Frontend
aws cloudformation describe-stacks --stack-name FrontendStackStaging
```

### Health Checks

```bash
# Auth Service
AUTH_LB=$(aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDns`].OutputValue' \
  --output text)

curl http://$AUTH_LB/health

# LEGO API
LEGO_LB=$(aws cloudformation describe-stacks \
  --stack-name LegoApiStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDns`].OutputValue' \
  --output text)

curl http://$LEGO_LB/health

# Frontend
FRONTEND_URL=$(aws cloudformation describe-stacks \
  --stack-name FrontendStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteUrl`].OutputValue' \
  --output text)

curl -I $FRONTEND_URL
```

## Cost Estimation

### Staging Environment (Monthly)

| Service | Component | Cost |
|---------|-----------|------|
| Auth Service | ECS Fargate (1 task) | $15 |
| Auth Service | DocumentDB t3.small | $55 |
| Auth Service | ALB | $20 |
| LEGO API | ECS Fargate (1 task) | $20 |
| LEGO API | RDS PostgreSQL t3.micro | $15 |
| LEGO API | ElastiCache Redis t3.micro | $12 |
| LEGO API | OpenSearch t3.small | $40 |
| LEGO API | ALB | $20 |
| Frontend | S3 + CloudFront | $5 |
| **Total** | | **~$202/month** |

### Production Environment (Monthly)

| Service | Component | Cost |
|---------|-----------|------|
| Auth Service | ECS Fargate (2 tasks) | $30 |
| Auth Service | DocumentDB t3.medium x2 | $220 |
| Auth Service | ALB | $20 |
| LEGO API | ECS Fargate (2 tasks) | $40 |
| LEGO API | RDS PostgreSQL t3.medium (Multi-AZ) | $75 |
| LEGO API | ElastiCache Redis t3.medium | $48 |
| LEGO API | OpenSearch t3.medium x2 | $180 |
| LEGO API | ALB | $20 |
| Frontend | S3 + CloudFront | $10 |
| **Total** | | **~$643/month** |

*Costs are approximate and may vary based on usage.*

## Cleanup / Destroy Stacks

**WARNING:** This will permanently delete all resources and data!

```bash
# Destroy frontend (safe to do first)
cd apps/web/lego-moc-instructions-app/infrastructure/aws-cdk
ENVIRONMENT=staging npx cdk destroy

# Destroy LEGO API
cd /Users/michaelmenard/Development/Monorepo/apps/api/lego-projects-api/infrastructure/aws-cdk
ENVIRONMENT=staging npx cdk destroy

# Destroy Auth Service
cd /Users/michaelmenard/Development/Monorepo/apps/api/auth-service/infrastructure/aws-cdk
ENVIRONMENT=staging npx cdk destroy
```

## Troubleshooting

### Bootstrap Failed

```bash
# Check if bootstrap stack exists
aws cloudformation describe-stacks --stack-name CDKToolkit

# If it exists but is in a bad state, delete and retry
aws cloudformation delete-stack --stack-name CDKToolkit
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit
npx cdk bootstrap
```

### Deployment Stuck

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name AuthServiceStackStaging --max-items 20

# Check ECS service events
aws ecs describe-services --cluster AuthServiceCluster --services AuthServiceService
```

### Container Won't Start

```bash
# View ECS task logs
aws logs tail /ecs/auth-service-staging --follow

# Check task status
aws ecs list-tasks --cluster AuthServiceCluster
aws ecs describe-tasks --cluster AuthServiceCluster --tasks <task-id>
```

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
   - Update stack with `domainName` parameter
   - Configure Route53 or your DNS provider

2. **Configure GitHub Actions**
   - Add AWS credentials to GitHub Secrets
   - Enable deployment workflows

3. **Set up monitoring**
   - Configure CloudWatch alarms
   - Set up SNS notifications

4. **Database migrations**
   - Run Drizzle migrations for LEGO API
   - Seed initial data

5. **SSL/TLS certificates**
   - Add ACM certificates for custom domains
   - Update ALB listeners for HTTPS

## Support

For issues or questions:
- Check CloudFormation events in AWS Console
- Review CloudWatch logs
- Consult AWS CDK documentation: https://docs.aws.amazon.com/cdk/
