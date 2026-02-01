# Future Opportunities - WISH-2045

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Multi-image HEIC burst photos | Low - Rare use case (user must select burst photo) | Medium - Need UI to select which image from burst | heic2any can extract all images from multi-image HEIC. Future enhancement: let user pick which image to use instead of always taking first image |
| 2 | HEIC metadata preservation | Low - Wishlist images don't need EXIF/GPS data | High - Would require EXIF parsing/rewriting library | EXIF data (orientation, location, camera settings) lost during HEIC → JPEG conversion. Consider preserving orientation tag for future |
| 3 | Server-side HEIC fallback | Low - Client-side works for most browsers | Medium - Would require Lambda/ImageMagick setup | For browsers without WebAssembly support (very old), server-side conversion could be fallback. Monitor browser compatibility metrics first |
| 4 | HEIC format preservation | Low - JPEG conversion already planned for compatibility | Medium - Would require native HEIC display support checks | Story explicitly converts HEIC to JPEG for compatibility. Future: Could preserve HEIC format if browser supports display (Safari, Chrome 104+) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Conversion progress accuracy | Low - Current estimate-based progress acceptable | Medium - Would need to hook into heic2any internals or use Worker messages | heic2any doesn't provide granular progress. Consider implementing WebWorker-based conversion with progress events for more accurate % display |
| 2 | Conversion quality selection | Medium - Power users may want quality control | Low - Add quality slider to "High quality" mode | Currently hardcoded to 0.9 quality for HEIC → JPEG conversion. Let advanced users adjust conversion quality (0.7-1.0) before compression step |
| 3 | Batch HEIC conversion | Low - Single upload is primary flow | Medium - Would need batch upload UI from other story | If batch upload feature is added (separate story), extend HEIC conversion to batch process with overall progress |
| 4 | Conversion telemetry | Medium - Valuable for understanding usage/failures | Low - Add analytics events for conversion metrics | Track: HEIC conversion success rate, average conversion time, browser compatibility issues, file size delta. Helps prioritize optimizations |
| 5 | Conversion caching | Low - User unlikely to upload same HEIC twice | Medium - Would need client-side cache with IndexedDB | Cache converted JPEGs by file hash to skip re-conversion if user uploads same HEIC multiple times |
| 6 | Format recommendation to user | Low - User may not know they're using HEIC | Low - Show one-time info toast when first HEIC detected | Educate iPhone users that they can change camera settings to capture JPEG instead of HEIC for faster uploads |
| 7 | WebP conversion option | Medium - WebP offers better compression than JPEG | Medium - Requires browser support detection + pipeline changes | Instead of HEIC → JPEG, could do HEIC → WebP for better size. Depends on browser support (95%+ as of 2026) |
| 8 | Offline conversion support | Low - Upload requires network anyway | Medium - Would need Service Worker + conversion caching | Pre-convert HEIC images while offline, queue for upload when online. Useful for users with intermittent connectivity |

## Categories

### Edge Cases
- Multi-image HEIC burst photo selection (Gap #1)
- HEIC files with `application/octet-stream` MIME type (noted in story, no enhancement needed)
- Large HEIC files > 10MB memory warning (already in story)
- Corrupted HEIC file handling (already in story)

### UX Polish
- Conversion progress accuracy improvement (Enhancement #1)
- Conversion quality selection for power users (Enhancement #2)
- Format recommendation toast for first-time HEIC users (Enhancement #6)

### Performance
- Conversion caching for repeated uploads (Enhancement #5)
- WebP as conversion target instead of JPEG (Enhancement #7)
- Batch HEIC conversion for multiple uploads (Enhancement #3)
- Offline conversion support via Service Worker (Enhancement #8)

### Observability
- Conversion telemetry tracking (Enhancement #4)
- Browser compatibility metrics for WebAssembly support
- Conversion failure rate monitoring
- Average conversion time per file size bucket

### Integrations
- Server-side HEIC conversion fallback for old browsers (Gap #3)
- Integration with batch upload feature (Enhancement #3)
- Integration with image variant generation if added later

### Format Support
- HEIC metadata preservation (orientation, EXIF) (Gap #2)
- Native HEIC format preservation when browser supports it (Gap #4)
- AVIF format support (next-gen format after HEIC)
