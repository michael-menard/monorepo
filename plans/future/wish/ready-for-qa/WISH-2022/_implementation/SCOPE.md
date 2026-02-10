# SCOPE.md - WISH-2022: Client-side Image Compression

## Summary

This story implements client-side image compression before S3 uploads to reduce upload time and storage costs while maintaining acceptable visual quality.

## Scope Classification

- **Type**: Frontend Enhancement
- **Complexity**: Medium
- **Estimated Points**: 3

## Affected Components

### Primary Files (Modify)
1. `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
   - Add compression step before presigned URL request
   - Add compression state and progress tracking
   - Add compression skip logic for small images
   - Add high-quality preference option

2. `apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`
   - Add "High quality (skip compression)" checkbox
   - Update progress UI to show compression phase
   - Add toast notification for compression results

### New Files (Create)
1. `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
   - Compression utility using browser-image-compression
   - Compression settings configuration
   - Skip logic for small images
   - Error handling with fallback

2. `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`
   - Unit tests for compression utility

### Test Files (Modify/Create)
1. `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`
   - Add tests for compression integration

## Dependencies

### New Package
- `browser-image-compression` - MIT licensed, widely used client-side image compression

### Existing Dependencies Used
- `useLocalStorage` hook for preference persistence
- `sonner` for toast notifications (already in package.json)

## Integration Points

1. **useS3Upload hook** - Primary integration point
2. **WishlistForm component** - UI for preference toggle
3. **localStorage** - Preference persistence (`wishlist:preferences:imageCompression`)

## Out of Scope

- Server-side image processing
- Multiple image size variants
- HEIC/HEIF format support (follow-up story WISH-2045)
- Compression quality presets (follow-up story WISH-2046)
- Compression telemetry (follow-up story WISH-2023)
- WebP conversion (follow-up story WISH-2048)
- Background compression (follow-up story WISH-2049)

## Technical Notes

### Compression Settings
```typescript
{
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8
}
```

### Skip Compression Criteria
- File size < 500KB AND dimensions < 1920x1920
- User has enabled "High quality" preference

### Error Handling
- Compression failure falls back to original image
- Unsupported formats skip compression
- Browser compatibility issues gracefully handled
