# Future Opportunities - WISH-2068

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No caching of browser detection result | Low | Low | detectWebPSupport() runs on every compression. Could cache result in sessionStorage or module-level variable for performance. |
| 2 | No user preference override | Low | Low | Power users might want to force JPEG even on WebP-capable browsers (e.g., for compatibility with older systems they'll share files with). Add optional settings toggle. |
| 3 | No analytics/telemetry for fallback usage | Low | Low | Track how often JPEG fallback is used to inform browser support sunset decisions. Add event logging to analytics pipeline. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | AVIF format support | Medium | Medium | AVIF offers 20% better compression than WebP but has lower browser support (~85% vs 97%). Could add as third-tier: AVIF → WebP → JPEG with same detection pattern. |
| 2 | Progressive degradation messaging | Low | Low | Toast messages could include link to browser upgrade instructions for users on Safari < 14 / IE11. "Your browser doesn't support WebP. [Upgrade browser for better performance](link)". |
| 3 | Detection unit tests with canvas mocking | Medium | Low | Add comprehensive unit tests for detectWebPSupport() with mocked canvas.toDataURL responses (success, failure, partial support). |
| 4 | Browser version detection in analytics | Low | Low | Log detected browser version (navigator.userAgent) alongside fallback usage to understand which specific browsers are triggering fallback most often. |
| 5 | Compression format indicator in UI | Low | Medium | Show small badge in preview indicating which format was used (WebP/JPEG) to educate users. "Compressed to WebP (25% smaller than JPEG)" |
| 6 | Retry logic for transient compression failures | Low | Medium | If WebP compression fails, try 2-3 times before falling back to JPEG (in case of transient web worker errors). Add exponential backoff. |

## Categories

- **Edge Cases**: Gaps #1-3 (caching, user override, analytics)
- **UX Polish**: Enhancements #2, #5 (browser upgrade messaging, format indicator)
- **Performance**: Gap #1, Enhancement #6 (detection caching, retry logic)
- **Observability**: Gaps #2-3, Enhancement #4 (user preference, analytics, browser version logging)
- **Next-Gen Formats**: Enhancement #1 (AVIF support)
- **Testing**: Enhancement #3 (unit tests with mocking)
