# Future Opportunities - WISH-2022

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | HEIC/HEIF format support | Low | Medium | Add browser-image-compression plugin or convert via server-side Lambda when browser fails. Modern iPhones use HEIC by default, but browser support is limited. |
| 2 | Compression quality presets | Low | Low | Add quality presets: "Low bandwidth" (0.6, 1200px), "Balanced" (0.8, 1920px - default), "High quality" (0.9, 2400px). Gives users more control. |
| 3 | Compression failure telemetry | Low | Low | Track compression failures (format, size, browser, error) via CloudWatch or analytics to identify patterns and improve fallback logic. |
| 4 | Original image preservation option | Low | Medium | "Keep original" checkbox uploads both original and compressed version. Allows user to download full-resolution later. Doubles S3 storage cost. |
| 5 | Progressive JPEG encoding | Low | Medium | Use progressive JPEG encoding for better perceived performance on slow connections. Requires additional browser-image-compression configuration. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | WebP format conversion | Medium | Low | Convert all images to WebP instead of JPEG for 25-35% additional size savings. Already supported by browser-image-compression. Trade-off: some older browsers lack WebP support. |
| 2 | Client-side image cropping/rotation | Medium | Medium | Add image editor before compression: crop, rotate, adjust brightness. Improves UX for users wanting to prepare images before upload. |
| 3 | Bulk upload compression | Medium | Medium | When multiple images are selected, compress all in parallel using web workers. Significantly faster than sequential compression. Requires queue management. |
| 4 | Compression analytics dashboard | Low | Medium | Show user statistics: "You've saved X GB of storage and Y minutes of upload time with compression". Gamification encourages feature adoption. |
| 5 | Smart quality selection | Medium | High | Analyze image content (sharp edges, gradients, text) and dynamically adjust quality settings. Text-heavy images need higher quality (0.9), photos can use lower (0.7). Requires ML model or heuristics. |
| 6 | Background compression | Low | Medium | Start compressing image as soon as selected (before form is filled). By the time user submits, compression is already complete. Reduces perceived latency. |
| 7 | Compression preview comparison | Medium | Low | Side-by-side or slider comparison of original vs compressed image. Helps users understand quality trade-offs and builds trust. |
| 8 | Offline compression queue | Low | High | Queue compression operations when offline, process when connection restored. Requires IndexedDB storage and service worker integration. Complex but enables PWA use case. |

## Categories

- **Edge Cases**: HEIC format support (#1 Gap), compression failure telemetry (#3 Gap), original preservation option (#4 Gap)
- **UX Polish**: Quality presets (#2 Gap), client-side image editor (#2 Enhancement), compression preview comparison (#7 Enhancement), analytics dashboard (#4 Enhancement)
- **Performance**: WebP conversion (#1 Enhancement), bulk upload (#3 Enhancement), background compression (#6 Enhancement), smart quality selection (#5 Enhancement)
- **Observability**: Compression failure telemetry (#3 Gap), analytics dashboard (#4 Enhancement)
- **Integrations**: Offline compression queue (#8 Enhancement)
