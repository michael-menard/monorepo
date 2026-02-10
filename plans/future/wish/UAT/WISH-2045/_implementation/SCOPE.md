# Implementation Scope - WISH-2045

## Story: HEIC/HEIF Image Format Support

## Scope Summary

| Layer | Impacted | Notes |
|-------|----------|-------|
| Frontend | YES | Modifications to imageCompression.ts and useS3Upload.ts |
| Backend | NO | No API changes required |
| Infrastructure | NO | No infrastructure changes required |

## Frontend Components Affected

### Files to Modify

1. **`apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`**
   - Add HEIC detection utility function
   - Add HEIC to JPEG conversion utility function
   - Export new types for HEIC conversion result

2. **`apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`**
   - Integrate HEIC conversion into upload workflow
   - Add 'converting' state to UploadState
   - Add conversion progress tracking
   - Update ALLOWED_MIME_TYPES to include HEIC types
   - Handle conversion errors with fallback to original

### Files to Create

1. **`apps/web/app-wishlist-gallery/src/utils/__tests__/heicConversion.test.ts`**
   - Unit tests for HEIC detection logic
   - Unit tests for conversion success/failure
   - Unit tests for filename transformation

## New Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| heic2any | ^0.0.4 | MIT | Client-side HEIC to JPEG conversion |

## Acceptance Criteria Coverage

| AC # | Description | Implementation Location |
|------|-------------|------------------------|
| 1 | HEIC/HEIF detection by MIME type and extension | imageCompression.ts - isHEIC() |
| 2 | Automatic conversion to JPEG using heic2any | imageCompression.ts - convertHEICToJPEG() |
| 3 | Conversion progress indicator | useS3Upload.ts - conversionProgress state |
| 4 | Converted JPEG passed to compression workflow | useS3Upload.ts - upload() integration |
| 5 | Filename preserved with .jpg extension | imageCompression.ts - transformFilename() |
| 6 | Conversion failure error toast | useS3Upload.ts - error handling |
| 7 | Fallback to original HEIC on failure | useS3Upload.ts - fallback logic |
| 8 | Browser compatibility check | imageCompression.ts - canConvertHEIC() |
| 9 | Toast notification after conversion | Consumer responsibility (component layer) |
| 10 | Image preview updates | Consumer responsibility (component layer) |
| 11 | Sequential workflow (HEIC -> JPEG -> compress -> upload) | useS3Upload.ts - upload() flow |
| 12 | High quality checkbox skips compression but allows conversion | useS3Upload.ts - skipCompression option |
| 13-15 | Unit/Integration/E2E tests | Test files |
| 16 | Documentation | README updates |

## Out of Scope

- Server-side HEIC conversion (client-side only for MVP)
- Native HEIC storage (convert to JPEG for compatibility)
- HEIC display in browsers (rely on JPEG conversion)
- Other exotic image formats (focus on HEIC/HEIF only)
- Playwright E2E tests (will be separate story)
