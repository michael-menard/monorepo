# Future Opportunities - WISH-2058

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Compression time analytics - Track actual compression time and size savings across user base | Low | Low | Add telemetry to measure real-world compression performance and validate 25-35% savings claim |
| 2 | Compression quality slider - Allow users to adjust WebP quality (0.6-0.95) for size vs quality tradeoff | Low | Medium | User preference for power users who want control over compression level |
| 3 | Batch compression - If multiple images added in one session, compress in parallel | Low | Medium | Performance optimization for users adding multiple items at once |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Visual quality comparison - Side-by-side preview of original vs compressed image | Medium | Medium | UX polish: Let users see quality impact before upload (especially useful during initial rollout to build trust) |
| 2 | Compression cache - Cache compressed images in IndexedDB to avoid re-compressing if user navigates away | Low | High | Performance optimization for interrupted upload flows |
| 3 | Advanced format support - Support AVIF format for even better compression (30-50% smaller than WebP) | Medium | High | Future-proofing: AVIF has lower browser support (Chrome 85+, Firefox 93+) but offers superior compression |
| 4 | Adaptive quality - Adjust quality based on image content (e.g., higher quality for complex scenes, lower for simple graphics) | Low | High | Advanced optimization requiring image analysis algorithms |
| 5 | Compression preview toast - Show preview thumbnail in the "Image compressed" toast notification | Low | Low | UX delighter: Visual confirmation of what was compressed |
| 6 | File size warnings - Warn if final WebP file is still > 800KB (approaching 1MB limit) | Low | Low | Proactive user feedback to avoid upload failures |
| 7 | Compression bypass for already-WebP - If source is already WebP and under size/dimension limits, skip compression entirely | Low | Low | Performance optimization to avoid redundant processing |

## Categories

- **Edge Cases**: Gaps #1-3
- **UX Polish**: Enhancements #1, #5
- **Performance**: Gaps #2-3, Enhancements #2, #7
- **Future-Proofing**: Enhancements #3-4
- **Observability**: Gaps #1, Enhancement #6

## Notes

- **Priority for next iteration**: Enhancement #1 (visual quality comparison) would build user trust during WebP rollout
- **Browser compatibility**: Enhancement #3 (AVIF) should wait until browser support exceeds 90%
- **Reuse opportunity**: Enhancement #2 (compression cache) could be extracted to a shared package if other apps need similar functionality
