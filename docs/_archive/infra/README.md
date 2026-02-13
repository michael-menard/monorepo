# Infrastructure

AWS CloudFormation templates for the LEGO MOC Instructions platform.

## Stacks

| Stack | Purpose | Dependencies |
|-------|---------|--------------|
| [cognito/](./cognito/) | User authentication (User Pool, Identity Pool) | None |
| [image-cdn/](./image-cdn/) | Image storage and CDN (S3 + CloudFront) | None |
| [frontend-hosting/](./frontend-hosting/) | React SPA hosting (S3 + CloudFront) | None |
| [monitoring/](./monitoring/) | CloudWatch alarms and dashboards | PostgreSQL RDS |

## Quick Deploy (Development)

```bash
# Deploy all stacks
./deploy.sh dev

# Or deploy individually
./deploy.sh dev cognito
./deploy.sh dev image-cdn
./deploy.sh dev frontend-hosting
```

## Deployment Order

Stacks are independent and can be deployed in parallel:

```
┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
│   cognito   │   │  image-cdn  │   │ frontend-hosting │
└─────────────┘   └─────────────┘   └──────────────────┘
       │                 │                    │
       └─────────────────┼────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Application Code   │
              │ (uses stack outputs) │
              └──────────────────────┘
```

## Environment Variables

After deploying stacks, configure your application:

### Backend (.env)

```bash
# From cognito stack
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
COGNITO_REGION=us-east-1

# From image-cdn stack
S3_BUCKET=lego-moc-images-dev-123456789012
CLOUDFRONT_DISTRIBUTION_DOMAIN=d1234567890.cloudfront.net
```

### Frontend (.env)

```bash
# From cognito stack
VITE_AWS_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_AWS_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AWS_REGION=us-east-1

# From frontend-hosting stack (for deployment)
VITE_CLOUDFRONT_DISTRIBUTION_ID=E1234567890
VITE_S3_BUCKET=lego-moc-frontend-dev-123456789012
```

## Stack Outputs

Get outputs from a deployed stack:

```bash
aws cloudformation describe-stacks \
  --stack-name lego-moc-cognito-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Costs (Estimated)

| Resource | Free Tier | Beyond Free Tier |
|----------|-----------|------------------|
| Cognito | 50,000 MAU | $0.0055/MAU |
| S3 | 5GB storage | $0.023/GB |
| CloudFront | 1TB/month | $0.085/GB (US) |

## Cleanup

```bash
# Delete all stacks (dev)
./deploy.sh dev --delete

# Or individually
aws cloudformation delete-stack --stack-name lego-moc-frontend-dev
aws cloudformation delete-stack --stack-name lego-moc-image-cdn-dev
aws cloudformation delete-stack --stack-name lego-moc-cognito-dev
```

**Note**: Empty S3 buckets before deleting stacks:

```bash
aws s3 rm s3://<bucket-name> --recursive
```
