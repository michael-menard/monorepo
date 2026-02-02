# Agent Context - WISH-2058

```yaml
story_id: WISH-2058
feature_dir: plans/future/wish
mode: implement
base_path: plans/future/wish/in-progress/WISH-2058/
artifacts_path: plans/future/wish/in-progress/WISH-2058/_implementation/
story_file: plans/future/wish/in-progress/WISH-2058/WISH-2058.md
backend_impacted: false
frontend_impacted: true
infra_impacted: false
```

## Key Files

- **Main implementation:** `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
- **Unit tests:** `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`
- **Hook using compression:** `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
- **Hook tests:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

## Dependencies

- **WISH-2022:** Client-side Image Compression (UAT status) - provides the imageCompression.ts utility
- **browser-image-compression:** Library with built-in WebP support

## Implementation Strategy

1. Change `fileType: 'image/jpeg'` to `fileType: 'image/webp'` in compression presets
2. Update filename transformation functions for WebP extension
3. Update toast notification format message
4. Update tests to verify WebP output
