# LEGO Projects API Deployment Guide

This guide provides step-by-step instructions for deploying the LEGO Projects API to AWS using CDK.

## 🎯 **Prerequisites**

Before deploying, ensure you have:

1. **AWS Credentials configured**:
   ```bash
   export AWS_PROFILE=lego-moc
   export CDK_DEFAULT_ACCOUNT=213351177820
   export CDK_DEFAULT_REGION=us-east-1
   ```

2. **Shared infrastructure deployed**:
   - VPC with public/private/isolated subnets
   - RDS PostgreSQL database
   - ElastiCache Redis
   - All must be deployed from `/apps/infrastructure/shared-services`

   Verify with:
   ```bash
   aws cloudformation list-exports --query "Exports[?Name.contains(@, 'LegoMoc-dev')]"
   ```

3. **Docker image built and pushed to ECR**:
   ```bash
   # The ECR repository will be created during first CDK deployment
   # After first deployment, build and push your image
   ```

## 🏗️ **Infrastructure Components**

This CDK stack creates:

- **ECS Cluster** - Fargate-based container orchestration
- **ECR Repository** - Docker image storage (`lego-projects-api-dev`)
- **Application Load Balancer** - Internet-facing HTTP/HTTPS traffic
- **ECS Service** - Runs the containerized API (1 task in dev, 2 in prod)
- **Security Groups** - Network access controls
- **CloudWatch Logs** - Application logging (`/ecs/lego-projects-api-dev`)
- **IAM Roles** - Task execution and task roles with least-privilege access

The stack **uses shared infrastructure** for:
- VPC networking (imported via CloudFormation exports)
- RDS PostgreSQL (imported connection via Secrets Manager)
- ElastiCache Redis (imported endpoint)
- OpenSearch (currently disabled)

## 📋 **Deployment Steps**

### Step 1: Install Dependencies

```bash
cd apps/api/lego-projects-api/infrastructure/aws-cdk
npm install
```

### Step 2: Build CDK TypeScript

```bash
npm run build
```

### Step 3: Synthesize Stack (Optional - Verify Configuration)

```bash
# Preview CloudFormation template
ENVIRONMENT=dev npm run synth
```

### Step 4: Review Changes

```bash
# See what will be deployed/changed
ENVIRONMENT=dev npm run diff
```

### Step 5: Deploy Infrastructure

```bash
# Deploy to dev environment (default)
npm run deploy:dev

# Or deploy to other environments
npm run deploy:staging
npm run deploy:production
```

**Expected output**:
- Stack creation/update progress
- CloudFormation events
- Outputs including:
  - Load Balancer DNS name
  - ECR Repository URI
  - Database/Redis endpoints
  - Infrastructure mode (shared)

### Step 6: Build and Push Docker Image

After the first deployment creates the ECR repository:

```bash
# From monorepo root
cd /Users/michaelmenard/Development/Monorepo

# Get ECR login
aws ecr get-login-password --region us-east-1 --profile lego-moc | \
  docker login --username AWS --password-stdin 213351177820.dkr.ecr.us-east-1.amazonaws.com

# Build the Docker image
docker build -f apps/api/lego-projects-api/Dockerfile -t lego-projects-api:latest .

# Tag for ECR (replace with your repository URI from CDK output)
docker tag lego-projects-api:latest 213351177820.dkr.ecr.us-east-1.amazonaws.com/lego-projects-api-dev:latest

# Push to ECR
docker push 213351177820.dkr.ecr.us-east-1.amazonaws.com/lego-projects-api-dev:latest
```

### Step 7: Update ECS Service

After pushing the Docker image, ECS will automatically pull and deploy it:

```bash
# Force new deployment (pulls latest image)
aws ecs update-service \
  --cluster <cluster-name> \
  --service <service-name> \
  --force-new-deployment \
  --profile lego-moc
```

## 🔍 **Verification**

### Check Stack Status

```bash
aws cloudformation describe-stacks \
  --stack-name LegoApiStackDev \
  --profile lego-moc \
  --query "Stacks[0].StackStatus"
```

### Check ECS Service

```bash
aws ecs describe-services \
  --cluster <cluster-name> \
  --services <service-name> \
  --profile lego-moc
```

### Test Health Endpoint

```bash
# Get ALB DNS from CDK outputs
curl http://<alb-dns>/health
# Expected: {"status":"healthy","service":"lego-projects-api"}
```

### View Logs

```bash
aws logs tail /ecs/lego-projects-api-dev --follow --profile lego-moc
```

## 🔧 **Environment Configuration**

The stack automatically configures these environment variables for the container:

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | CDK | Environment (dev/staging/production) |
| `PORT` | CDK | Container port (3000) |
| `REDIS_HOST` | Shared Infrastructure | ElastiCache endpoint |
| `REDIS_PORT` | Shared Infrastructure | ElastiCache port (6379) |
| `DATABASE_URL` | Secrets Manager | PostgreSQL connection string |
| `OPENSEARCH_DISABLED` | CDK | Set to 'true' (OpenSearch not yet in shared infra) |

Secrets are securely injected from AWS Secrets Manager at runtime.

## 🚨 **Important Notes**

### Health Endpoint Required

The ALB health check expects `/health` to return HTTP 200. The API now includes:
- `GET /health` → `{"status":"healthy","service":"lego-projects-api"}`

### Docker Build Context

The Dockerfile uses the **monorepo root** as the build context:
- Builds shared packages first: `pnpm turbo build --filter="./packages/*"`
- Then builds the API: `pnpm turbo build --filter="lego-projects-api"`
- Multi-stage build for optimized production image

### Port Configuration

- **Container Port**: 3000 (hardcoded in CDK and Dockerfile)
- **ALB Port**: 80 (public HTTP access)
- **Health Check**: `/health` endpoint on port 3000

### Security Groups

The stack creates three security groups:
1. **ALB Security Group** - Allows inbound 80/443 from internet
2. **ECS Security Group** - Allows inbound 3000 from ALB only
3. **DB Security Group** - Allows inbound 5432/6379/9200 from ECS only

### Auto Scaling (Production Only)

Production environment includes auto scaling:
- **Min**: 2 tasks
- **Max**: 10 tasks
- **CPU Target**: 70%
- **Memory Target**: 80%

### Monitoring

CloudWatch logs are automatically configured:
- **Log Group**: `/ecs/lego-projects-api-dev`
- **Retention**: 1 week (dev), 1 month (production)
- **Streams**: One per task

## 🔄 **Update Workflows**

### Infrastructure Changes

```bash
cd apps/api/lego-projects-api/infrastructure/aws-cdk
npm run build
ENVIRONMENT=dev npm run deploy
```

### Application Code Changes

```bash
# From monorepo root
docker build -f apps/api/lego-projects-api/Dockerfile -t lego-projects-api:latest .
docker tag lego-projects-api:latest <ecr-repo-uri>:latest
docker push <ecr-repo-uri>:latest

# Force ECS to pull new image
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment
```

### Database Migrations

```bash
# Connect to ECS task via SSM Session Manager
aws ecs execute-command \
  --cluster <cluster-name> \
  --task <task-id> \
  --container LegoApiContainer \
  --interactive \
  --command "/bin/sh"

# Inside container, run migrations
cd /app/apps/api/lego-projects-api
npx drizzle-kit migrate
```

## 🧹 **Cleanup**

### Destroy Stack

```bash
npm run destroy

# Or specific environment
ENVIRONMENT=dev cdk destroy
```

**⚠️ Warning**: This will delete:
- ECS Service and Cluster
- Application Load Balancer
- ECR Repository and images (dev only; retained in production)
- CloudWatch Log Groups
- Security Groups
- IAM Roles

Shared infrastructure (VPC, RDS, Redis) is **not** deleted.

## 📞 **Troubleshooting**

### "No exports found for LegoMoc-dev-*"

**Problem**: Shared infrastructure not deployed.

**Solution**:
```bash
cd apps/infrastructure/shared-services
npm run deploy:dev
```

### ECS Tasks Failing Health Checks

**Problem**: Health endpoint not responding or returning wrong status code.

**Solution**:
1. Check logs: `aws logs tail /ecs/lego-projects-api-dev --follow`
2. Verify `/health` endpoint returns 200
3. Check security group allows ALB → ECS on port 3000
4. Verify container starts successfully

### Docker Build Fails

**Problem**: Monorepo dependencies not building correctly.

**Solution**:
1. Ensure you're building from monorepo root
2. Verify all shared packages build: `pnpm turbo build --filter="./packages/*"`
3. Check `pnpm-lock.yaml` is present in root
4. Review Dockerfile COPY statements match your package structure

### Cannot Assume CDK Roles

**Problem**: IAM permissions insufficient.

**Solution**:
1. Review IAM policy in `/apps/infrastructure/shared-services/iam-policy.json`
2. Ensure your AWS user/role has the required permissions
3. Bootstrap CDK if not done: `npx cdk bootstrap aws://213351177820/us-east-1`

## 📊 **Cost Estimates**

### Development Environment
- **ECS Fargate**: ~$15/month (1 task, 0.5 vCPU, 1GB RAM)
- **ALB**: ~$20/month
- **ECR Storage**: ~$1/month (10 images)
- **CloudWatch Logs**: ~$1/month (low volume)
- **Data Transfer**: Variable
- **Total**: ~$37/month

### Production Environment
- **ECS Fargate**: ~$60/month (2-10 tasks, 1 vCPU, 2GB RAM)
- **ALB**: ~$20/month
- **ECR Storage**: ~$2/month
- **CloudWatch Logs**: ~$5/month
- **Data Transfer**: Variable
- **Total**: ~$87/month (baseline)

**Note**: Shared infrastructure costs (VPC, RDS, Redis) are in `/apps/infrastructure/shared-services/README.md`

## 🎓 **Additional Resources**

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Fargate Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Shared Infrastructure README](/apps/infrastructure/shared-services/README.md)
