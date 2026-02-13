# Frontend Hosting Stack

S3 bucket with CloudFront CDN for hosting the React SPA.

## Resources Created

- **S3 Bucket**: Private bucket for frontend assets
- **CloudFront Distribution**: CDN with SPA routing support
- **CloudFront Function**: Rewrites SPA routes to index.html
- **Cache Policies**: Long TTL for static assets, short TTL for HTML
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Log Bucket**: CloudFront access logs
- **IAM Policy**: For CI/CD deployments

## Prerequisites

- AWS CLI configured with appropriate permissions
- (Optional) ACM certificate in us-east-1 for custom domain

## Deployment

### Development (CloudFront default domain)

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-frontend-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Production (with custom domain)

First, create an ACM certificate in us-east-1:

```bash
aws acm request-certificate \
  --domain-name lego-moc-instructions.com \
  --subject-alternative-names "*.lego-moc-instructions.com" \
  --validation-method DNS \
  --region us-east-1
```

Then deploy:

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-frontend-production \
  --parameter-overrides \
    Environment=production \
    CustomDomainName=lego-moc-instructions.com \
    AcmCertificateArn=arn:aws:acm:us-east-1:123456789:certificate/abc-123 \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name lego-moc-frontend-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Deploy Frontend Assets

### Manual Deployment

```bash
# Build the frontend
cd apps/web/main-app
pnpm build

# Sync to S3 (static assets with long cache)
aws s3 sync dist/ s3://<BucketName> \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "*.html"

# Sync HTML with no-cache
aws s3 sync dist/ s3://<BucketName> \
  --delete \
  --cache-control "max-age=0, no-cache, no-store, must-revalidate" \
  --include "*.html"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

### CI/CD Deployment

Attach the `DeploymentPolicy` to your CI/CD role, then use the deploy commands above.

## SPA Routing

The CloudFront Function handles SPA routing:

- `/` → serves `index.html`
- `/dashboard` → serves `index.html`
- `/wishlist/123` → serves `index.html`
- `/assets/main.js` → serves the actual file
- `/*.css`, `/*.js` → serves actual files

## Custom Domain Setup

After deployment with custom domain:

1. Get the CloudFront domain from outputs
2. Create CNAME record in DNS:
   ```
   lego-moc-instructions.com → <CloudFrontDomainName>
   www.lego-moc-instructions.com → <CloudFrontDomainName>
   ```

## Delete Stack

```bash
# Empty bucket first
aws s3 rm s3://<BucketName> --recursive
aws s3 rm s3://<LogBucketName> --recursive

# Delete stack
aws cloudformation delete-stack --stack-name lego-moc-frontend-dev
```
