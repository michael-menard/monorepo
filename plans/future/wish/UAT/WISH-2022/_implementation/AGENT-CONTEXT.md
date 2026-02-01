# AGENT-CONTEXT.md - WISH-2022: Client-side Image Compression

## Story Context

**Story ID**: WISH-2022
**Title**: Client-side Image Compression
**Parent Story**: WISH-2002 (Add Item Flow)
**Status**: In Progress
**Phase**: 4 (UX Polish)

## Business Context

Users uploading high-resolution images from smartphones experience slow upload times and unnecessary S3 storage consumption. This enhancement compresses images client-side before upload to:
- Reduce upload time by 60-80% for typical phone photos
- Reduce S3 storage costs significantly
- Improve perceived performance
- Reduce bandwidth costs for mobile users

## Technical Context

### Existing Architecture
- `useS3Upload` hook handles file validation and S3 upload via presigned URLs
- `WishlistForm` component uses `useS3Upload` for image uploads
- `useLocalStorage` hook available for preference persistence
- Sonner toast library already integrated for notifications

### New Integration
- `browser-image-compression` library for client-side compression
- Compression happens BEFORE requesting presigned URL
- Sequential progress: compression first, then upload
- User preference stored in localStorage

## Key Acceptance Criteria

1. Images automatically compressed using browser-image-compression
2. Settings: max 1920x1920, quality 0.8, max 1MB
3. Progress shows "Compressing image... X%"
4. Skip compression if < 500KB
5. Fallback to original on compression failure
6. "High quality" toggle in form
7. Toast shows compression results
8. Preview updates with compressed image

## Implementation Strategy

### Phase 1: Utility Creation
Create `imageCompression.ts` with:
- `compressImage()` function
- `shouldSkipCompression()` helper
- Compression configuration constants

### Phase 2: Hook Integration
Modify `useS3Upload.ts` to:
- Add compression state ('compressing' | 'idle' | etc.)
- Add compression progress tracking
- Integrate compression before presigned URL request
- Handle compression errors with fallback

### Phase 3: UI Integration
Modify `WishlistForm` to:
- Add "High quality" checkbox
- Show compression progress
- Display compression toast
- Update preview with compressed image

### Phase 4: Testing
- Unit tests for imageCompression utility
- Integration tests for useS3Upload with compression
- Playwright E2E tests for full workflow

## File Map

```
apps/web/app-wishlist-gallery/src/
  hooks/
    useS3Upload.ts           # MODIFY - add compression
    __tests__/
      useS3Upload.test.ts    # MODIFY - add compression tests
  utils/
    imageCompression.ts      # CREATE - compression utility
    __tests__/
      imageCompression.test.ts  # CREATE - utility tests
  components/
    WishlistForm/
      index.tsx              # MODIFY - add preference toggle
```

## Risk Mitigation

1. **Browser memory limits**: Show warning for images > 20MB
2. **Quality degradation**: 0.8 quality acceptable for wishlist images
3. **HEIC support**: Out of scope, fallback to original
4. **Web worker overhead**: Acceptable tradeoff for UI responsiveness

## Testing Strategy

### Unit Tests
- Compression utility functions
- Skip logic validation
- Error handling

### Integration Tests
- useS3Upload with compression enabled/disabled
- Progress callback integration
- Fallback behavior

### E2E Tests (Playwright)
- Happy path compression flow
- Skip compression for small images
- User preference toggle
- Compression failure fallback
