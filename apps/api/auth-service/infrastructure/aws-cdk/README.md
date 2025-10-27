# Auth Service Infrastructure

AWS CDK infrastructure for the Authentication Service.

## Architecture

This stack deploys:

- **ECS Fargate** - Containerized auth service
- **DocumentDB** - MongoDB-compatible database for user data
- **Application Load Balancer** - Traffic distribution
- **ECR** - Container image repository
- **CloudWatch Logs** - Centralized logging
- **AWS Secrets Manager** - Database credentials
- **Auto Scaling** (production only) - CPU/Memory-based scaling

## Prerequisites

1. **AWS CLI** configured with credentials
2. **Node.js** 20+
3. **AWS CDK** installed globally (or use npx)
4. **Docker** for building container images

## Setup

### 1. Install Dependencies

```bash
cd apps/api/auth-service/infrastructure/aws-cdk
npm install
```

### 2. Configure AWS Account

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=$AWS_ACCOUNT_ID
export CDK_DEFAULT_REGION=$AWS_REGION
```

### 3. Bootstrap CDK (first time only)

```bash
npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

## Deployment

### Deploy to Staging

```bash
npm run deploy:staging
```

### Deploy to Production

```bash
npm run deploy:production
```

### View Changes Before Deploy

```bash
ENVIRONMENT=staging npm run diff
```

### Synthesize CloudFormation Template

```bash
npm run synth
```

## Stack Outputs

After deployment, the stack outputs:

- **LoadBalancerDns** - Load balancer DNS name
- **ServiceName** - ECS service name
- **ClusterName** - ECS cluster name
- **RepositoryUri** - ECR repository URI
- **DatabaseEndpoint** - DocumentDB endpoint

View outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs'
```

## Environment Differences

### Staging
- 1 ECS task (512 MB / 256 CPU)
- t3.small DocumentDB instance
- 1 database instance
- 1-day backup retention
- No deletion protection

### Production
- 2 ECS tasks (1024 MB / 512 CPU)
- t3.medium DocumentDB instance
- 2 database instances (HA)
- 7-day backup retention
- Deletion protection enabled
- Auto-scaling: 2-10 tasks

## Destroy Stack

**WARNING**: This will delete all resources including databases!

```bash
# Staging
ENVIRONMENT=staging npm run destroy

# Production (requires manual confirmation)
ENVIRONMENT=production npm run destroy
```

## Troubleshooting

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster AuthServiceCluster \
  --services AuthServiceService
```

### View CloudWatch Logs

```bash
aws logs tail /ecs/auth-service-staging --follow
```

### Check Load Balancer Health

```bash
LOAD_BALANCER_DNS=$(aws cloudformation describe-stacks \
  --stack-name AuthServiceStackStaging \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDns`].OutputValue' \
  --output text)

curl http://$LOAD_BALANCER_DNS/health
```

## Cost Estimates

### Staging (monthly)
- ECS Fargate: ~$15
- DocumentDB t3.small: ~$55
- ALB: ~$20
- **Total: ~$90/month**

### Production (monthly)
- ECS Fargate (2 tasks): ~$30
- DocumentDB t3.medium x2: ~$220
- ALB: ~$20
- **Total: ~$270/month**

## Security

- All traffic encrypted in transit (HTTPS)
- DocumentDB encrypted at rest
- Database credentials in Secrets Manager
- Non-root container user
- Security groups restrict traffic flow
- VPC isolation with private subnets
