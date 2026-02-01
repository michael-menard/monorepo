# Agent Context - WISH-2018

## Story Information

```yaml
story_id: WISH-2018
feature_dir: plans/future/wish
mode: qa-verify
base_path: plans/future/wish/UAT/WISH-2018/
artifacts_path: plans/future/wish/UAT/WISH-2018/_implementation/
```

## Paths

| Artifact | Path |
|----------|------|
| Story File | `plans/future/wish/UAT/WISH-2018/WISH-2018.md` |
| PROOF | `plans/future/wish/UAT/WISH-2018/PROOF-WISH-2018.md` |
| SCOPE | `plans/future/wish/UAT/WISH-2018/_implementation/SCOPE.md` |
| CHECKPOINT | `plans/future/wish/UAT/WISH-2018/_implementation/CHECKPOINT.md` |
| VERIFICATION | `plans/future/wish/UAT/WISH-2018/_implementation/VERIFICATION.yaml` |

## Story Summary

**Title:** CDN Integration for Image Performance Optimization

**Phase:** 5 - Performance

**Priority:** P2

**Complexity:** Medium

**Effort:** 3-5 points

## Scope

### Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | CloudFront URL generation, API response updates |
| frontend | false | URLs transparent to frontend |
| infra | true | Documentation only (no IaC changes) |

## Key Acceptance Criteria

- AC4: CloudFront URL generation utility
- AC5: GET /api/wishlist returns CloudFront URLs
- AC6: GET /api/wishlist/:id returns CloudFront URL
- AC8: Backward compatibility for existing S3 URLs
- AC9: Presigned URL upload still uses S3
- AC13: Integration tests for CloudFront URLs

## Technical Context

### Existing Code Locations

- Wishlist Routes: `apps/api/lego-api/domains/wishlist/routes.ts`
- Wishlist Service: `apps/api/lego-api/domains/wishlist/application/services.ts`
- Storage Adapter: `apps/api/lego-api/domains/wishlist/adapters/storage.ts`
- Repository: `apps/api/lego-api/domains/wishlist/adapters/repositories.ts`
- S3 Utilities: `packages/api-core/src/s3.ts`

### Environment Variables

- `S3_BUCKET` - Existing S3 bucket name
- `CLOUDFRONT_DISTRIBUTION_DOMAIN` - New CloudFront domain (e.g., `d1234abcd.cloudfront.net`)

### URL Patterns

- S3 URL: `https://{bucket}.s3.amazonaws.com/wishlist/{userId}/{imageId}.jpg`
- CloudFront URL: `https://{distribution}.cloudfront.net/wishlist/{userId}/{imageId}.jpg`

## Dependencies

### Blocked By
- WISH-2013 (File Upload Security Hardening) - Completed

### Blocks
- WISH-2016 (Image Optimization with Lambda@Edge)

## Constraints

1. **No Frontend Changes** - URLs are transparent to the frontend
2. **Upload Still Uses S3** - CloudFront is read-only CDN
3. **No IaC Changes** - Infrastructure documented, not coded
4. **Backward Compatible** - Must convert existing S3 URLs

## Phase Tracking

```yaml
phase_0_setup: in_progress
phase_1_planning: pending
phase_2_implementation: pending
phase_3_verification: pending
phase_4_documentation: pending
```
