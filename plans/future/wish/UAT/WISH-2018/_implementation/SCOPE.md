# Scope - WISH-2018

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | CloudFront URL generation utilities, API response modifications |
| frontend | false | URLs are transparent - frontend just uses imageUrl field |
| infra | true | CloudFront configuration documentation (no IaC code changes in scope) |

## Scope Summary

This story adds Amazon CloudFront CDN integration to serve wishlist images from edge locations worldwide. The backend will generate CloudFront URLs instead of S3 URLs in API responses, with on-the-fly conversion of legacy S3 URLs for backward compatibility.

## Key Implementation Points

### Backend Changes

1. **New CloudFront Utilities** (`apps/api/lego-api/core/cdn/`)
   - `cloudfront.ts` - URL generation functions
   - Convert S3 keys to CloudFront URLs
   - Convert legacy S3 URLs to CloudFront URLs
   - Environment variable: `CLOUDFRONT_DISTRIBUTION_DOMAIN`

2. **Wishlist Storage Adapter** (`apps/api/lego-api/domains/wishlist/adapters/storage.ts`)
   - Update `buildImageUrl()` to return CloudFront URL instead of S3 URL
   - Add `convertS3UrlToCloudFrontUrl()` for legacy URL conversion

3. **Repository Layer** (`apps/api/lego-api/domains/wishlist/adapters/repositories.ts`)
   - Update `mapRowToWishlistItem()` to convert S3 URLs in `imageUrl` field

4. **No API Route Changes Required**
   - Existing endpoints already return `imageUrl` - just the domain changes
   - Presigned URLs for upload still use S3 (CloudFront is read-only CDN)

### Infrastructure Documentation

1. CloudFront distribution configuration (documented, not coded)
2. OAI (Origin Access Identity) setup documentation
3. S3 bucket policy updates documentation
4. Cache invalidation strategy (versioned URLs recommended)

### Tests

1. Unit tests for CloudFront URL generation utilities (15+ tests)
2. Unit tests for S3-to-CloudFront URL conversion
3. Integration tests verifying API responses contain CloudFront URLs

## Files to Create

| File | Purpose |
|------|---------|
| `apps/api/lego-api/core/cdn/cloudfront.ts` | CloudFront URL utilities |
| `apps/api/lego-api/core/cdn/index.ts` | Module exports |
| `apps/api/lego-api/core/cdn/__tests__/cloudfront.test.ts` | Unit tests |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/api/lego-api/domains/wishlist/adapters/storage.ts` | Use CloudFront for `buildImageUrl()` |
| `apps/api/lego-api/domains/wishlist/adapters/repositories.ts` | Convert S3 URLs in row mapping |

## Out of Scope

- Frontend code changes (URLs are transparent)
- Infrastructure as Code (CloudFormation/Terraform)
- Lambda@Edge for image transformations
- Custom domain (cdn.lego-moc.com)
- Cache invalidation API integration
- Multi-CDN strategy
