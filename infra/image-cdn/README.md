# Image CDN Stack

S3 bucket with CloudFront CDN for serving wishlist and MOC images.

## Resources Created

- **S3 Bucket**: Private bucket for image storage
- **CloudFront Distribution**: CDN with OAC (Origin Access Control)
- **Cache Policy**: 24-hour default TTL with version-based cache busting
- **Log Bucket**: CloudFront access logs
- **IAM Policy**: For Lambda/API to upload images

## Prerequisites

- AWS CLI configured with appropriate permissions
- (Optional) Cognito stack deployed for cross-stack references

## Deployment

### Development

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-image-cdn-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Production

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name lego-moc-image-cdn-production \
  --parameter-overrides Environment=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name lego-moc-image-cdn-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Environment Variables

After deployment, set these environment variables:

```bash
# Backend (.env)
S3_BUCKET=<ImageBucketName output>
CLOUDFRONT_DISTRIBUTION_DOMAIN=<CloudFrontDomainName output>
```

## Image URL Format

Images are accessed via CloudFront:

```
https://<CloudFrontDomainName>/wishlist/{userId}/{imageId}.jpg
https://<CloudFrontDomainName>/wishlist/{userId}/{imageId}.jpg?v=1234567890
```

The `?v=` query parameter enables cache busting for updated images.

## Upload Flow

1. Backend generates presigned S3 URL for upload
2. Frontend uploads directly to S3
3. Backend returns CloudFront URL for viewing
4. Users access images via CloudFront (cached at edge)

## Cache Invalidation

For immediate updates, use version query parameter:

```typescript
const imageUrl = `https://${cloudfrontDomain}/wishlist/user-123/image.jpg?v=${Date.now()}`
```

Or manually invalidate via CLI:

```bash
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/wishlist/user-123/*"
```

## Delete Stack

```bash
# Empty buckets first
aws s3 rm s3://<ImageBucketName> --recursive
aws s3 rm s3://<LogBucketName> --recursive

# Then delete stack
aws cloudformation delete-stack --stack-name lego-moc-image-cdn-dev
```
