# Scope - WISH-2016

## Surfaces Impacted

| Surface | Impacted | Notes |
|---------|----------|-------|
| backend | true | Image processing service, S3 event Lambda handler, database migration |
| frontend | true | Responsive images with picture element and srcset |
| infra | true | S3 event triggers, Lambda layer for Sharp, CloudWatch metrics |

## Scope Summary

This story implements automatic image optimization for wishlist uploads including resizing (thumbnail/medium/large), WebP compression at 85% quality, and watermarking. Backend includes a Sharp-based image processing service and S3-triggered Lambda. Frontend updates WishlistCard and DetailPage to use responsive images with picture element.
