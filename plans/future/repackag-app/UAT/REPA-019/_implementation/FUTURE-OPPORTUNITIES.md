# Future Opportunities - REPA-019

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Legacy error format support may be obsolete | Low | Low | Current code supports legacy error format with 'type' instead of 'code' field. Review API error logs to determine if this format is still in use. If not, remove legacy parsing logic in future cleanup story. |
| 2 | Error code enum may not match backend exactly | Low | Medium | Frontend ApiErrorCodeSchema (21 codes) may not be in sync with backend error codes. Create future story to generate frontend schema from backend OpenAPI spec or shared schema file. |
| 3 | Correlation ID extraction has dual sources | Low | Low | Code extracts correlation ID from both headers (X-Correlation-Id) and body (correlationId field). Document which source is canonical or create priority order. Consider standardizing on one source in future. |
| 4 | Auth page list hardcoded in multiple places | Low | Medium | AUTH_PAGES constant exists in authFailureHandler.ts (6 entries). REPA-013 may create similar list in route guards. Future story: consolidate auth page definitions in @repo/auth-utils and import from there. |
| 5 | Retry delay logic could be more sophisticated | Low | Medium | Current retry delays are hardcoded per error code. Future: support Retry-After header parsing for date format (not just seconds), exponential backoff calculation, jitter for distributed systems. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Error telemetry and analytics | Medium | High | Current code logs errors but doesn't send telemetry. Future: integrate with analytics service to track error rates, correlation IDs, user impact. Useful for debugging production issues and measuring API reliability. |
| 2 | User-friendly error UI components | High | Medium | Error mapping provides title/message/icon but no UI components. Future: create shared ErrorAlert, ErrorToast, ErrorBoundary components in @repo/app-component-library that consume ParsedApiError. Eliminates per-app error display logic. |
| 3 | Error recovery suggestions | Medium | Medium | Current error messages say "try again" but don't provide actionable steps. Future: enhance error mapping with specific recovery actions (e.g., "Check your internet connection", "Verify file size is under 10MB"). |
| 4 | Contextual error messages | Medium | Medium | Current implementation uses `getContextualMessage()` to prefer API messages for validation errors. Future: expand this pattern to more error types, use error details to enrich user messages (e.g., "Title 'My MOC' already exists" instead of generic "Title already exists"). |
| 5 | Error code documentation | Low | Low | No central documentation of what each error code means, when it occurs, and how to fix it. Future: generate markdown docs from error mappings, include in Storybook or developer portal. Useful for support teams and QA. |
| 6 | Auth failure handler improvements | Medium | Medium | Current implementation redirects to /login with return URL. Future enhancements: (a) show toast explaining why redirect happened, (b) preserve form data/drafts before redirect, (c) support configurable redirect URL per app, (d) handle concurrent 401s gracefully (debounce redirects). |
| 7 | Error retry UI with countdown | Low | Medium | For retryable errors, show countdown timer and auto-retry button. Current implementation provides retry delay but no UI affordance. |
| 8 | Offline error detection | Medium | Medium | Current code detects network errors but doesn't distinguish between offline (no connectivity) and server errors. Future: use `navigator.onLine` + custom offline detection to show "You're offline" message instead of generic network error. |

## Categories

- **Edge Cases**: Legacy error format handling (Gap #1), correlation ID dual sources (Gap #3), error code sync (Gap #2)
- **UX Polish**: Error recovery suggestions (Enhancement #3), contextual messages (Enhancement #4), retry UI with countdown (Enhancement #7), offline detection (Enhancement #8)
- **Developer Experience**: Error code documentation (Enhancement #5), shared error UI components (Enhancement #2)
- **Observability**: Error telemetry and analytics (Enhancement #1)
- **Architecture Cleanup**: Auth page list consolidation (Gap #4), sophisticated retry logic (Gap #5), auth failure improvements (Enhancement #6)

## Notes

**High-Impact Opportunities:**
1. **Shared error UI components** (Enhancement #2) - Most impactful for reducing duplication across apps. Once error mapping is centralized, creating ErrorAlert/ErrorToast components that consume ParsedApiError would eliminate ~100-200 lines per app.

2. **Error telemetry** (Enhancement #1) - Critical for production observability. Tracking correlation IDs, error rates, and user impact would significantly improve debugging and API monitoring.

**Quick Wins:**
1. Auth page list consolidation (Gap #4) - Can be done during REPA-013 implementation with minimal effort
2. Error code documentation (Enhancement #5) - Generate from ERROR_MAPPINGS constant, useful for support/QA teams

**Dependencies:**
- Enhancement #2 (error UI components) depends on REPA-019 completion
- Gap #4 (auth page consolidation) should coordinate with REPA-013
- Enhancement #1 (telemetry) requires analytics service infrastructure (may be separate epic)
