# Agent Context - WISH-2045

## Story: HEIC/HEIF Image Format Support

Command: qa-verify-story
Phase: setup
Updated: 2026-01-31T23:25:00Z

## Key Paths

### Story Files
- Story: `plans/future/wish/UAT/WISH-2045/WISH-2045.md`
- Elaboration: `plans/future/wish/UAT/WISH-2045/ELAB-WISH-2045.md`
- Proof: `plans/future/wish/UAT/WISH-2045/PROOF-WISH-2045.md`
- Analysis: `plans/future/wish/UAT/WISH-2045/_implementation/ANALYSIS.md`

### Implementation Files
- Main utility: `apps/web/app-wishlist-gallery/src/utils/imageCompression.ts`
- Upload hook: `apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`
- Utility tests: `apps/web/app-wishlist-gallery/src/utils/__tests__/imageCompression.test.ts`
- Hook tests: `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

### Package Files
- App package.json: `apps/web/app-wishlist-gallery/package.json`

## Dependencies

### Parent Story
- WISH-2022: Client-side Image Compression (provides base compression workflow)
- WISH-2046: Client-side Image Compression Quality Presets (provides preset system)

### New Package Required
- `heic2any` - MIT licensed, client-side HEIC to JPEG conversion

## Implementation Notes

### heic2any Library Behavior
1. Returns `Blob` or `Blob[]` - must handle both cases
2. Multi-image HEIC (burst photos) returns array - take first image only
3. Conversion quality set to 0.9 for high quality before compression step

### HEIC Detection Strategy
1. Primary: Check MIME type (`image/heic`, `image/heif`)
2. Fallback: Check file extension (`.heic`, `.heif`)
3. Edge case: Some apps use `application/octet-stream` for HEIC files

### Error Handling Strategy
1. Conversion failure: Show error toast, fall back to original HEIC upload
2. Browser incompatibility: Detect via heic2any capabilities, show warning
3. Memory issues: Show warning for files > 10MB before conversion

### Filename Transformation
- Input: `IMG_1234.heic` or `IMG_1234.HEIC`
- Output: `IMG_1234.jpg`
- Logic: Replace extension, preserve original name

## Commands

### Development
```bash
# Install new dependency
pnpm --filter app-wishlist-gallery add heic2any

# Run tests
pnpm --filter app-wishlist-gallery test

# Type check
pnpm check-types

# Lint
pnpm lint
```

### Verification
```bash
# Run all checks
pnpm check-types && pnpm lint && pnpm test
```
