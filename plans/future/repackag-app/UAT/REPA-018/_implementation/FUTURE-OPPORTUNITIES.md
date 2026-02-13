# Future Opportunities - REPA-018

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No retry logic with exponential backoff for network failures | Medium | Medium | Add configurable retry strategy in future version. Current error handling logs and throws, which is acceptable for MVP. AuthProvider may handle retries at higher level. |
| 2 | No session timeout utilities or expiration warnings | Medium | Low | Future enhancement: Add `getSessionTimeRemaining()`, `isSessionExpiringSoon()` utilities. Not needed for MVP as Cognito tokens have their own expiration handling. |
| 3 | No observability metrics (session creation rate, failure rate, latency) | Medium | Medium | Future integration with monitoring service. Logger already captures errors, which is sufficient for MVP. |
| 4 | Missing request/response interceptor hooks | Low | Medium | Allow consumers to inject custom logic before/after session calls. Not needed for current use case. |
| 5 | No session metadata support (device info, location, etc.) | Low | Medium | Future enhancement to track session context. Backend does not currently support this. |
| 6 | Integration tests lack concurrent session test coverage | Low | Low | AC-3 unit tests cover concurrent calls with mocked fetch. Real backend concurrent testing deferred. |
| 7 | No granular session scopes (MFA pending, email unverified) | Low | High | Future feature as auth complexity grows. Current binary authenticated/unauthenticated is sufficient. |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Cross-tab session synchronization with BroadcastChannel | High | Medium | Sync session state across browser tabs. High user value for multi-tab workflows. Consider for post-MVP. |
| 2 | Session debugging tools (dev mode only) | Medium | Low | Add `window.__DEBUG_SESSION__` object with session state, request history, timing metrics. Useful for development. |
| 3 | Configurable base URL override for testing | Medium | Low | Allow runtime base URL override instead of compile-time env var. Useful for E2E tests with dynamic backends. |
| 4 | TypeScript strict mode improvements | Low | Low | Current sessionService has no strict mode violations, but future contributors may benefit from stricter typing on fetch responses. |
| 5 | Request deduplication for rapid concurrent calls | Low | Medium | Prevent multiple simultaneous `setAuthSession` calls with same token. Current behavior is last-write-wins (acceptable). |
| 6 | Session persistence across page reloads (in-memory cache) | Low | Low | Cache session status to avoid unnecessary status checks. httpOnly cookies already handle persistence. |
| 7 | Custom error classes for session errors | Low | Low | Replace generic Error throws with `SessionValidationError`, `SessionNetworkError`, etc. for better error handling. |
| 8 | Multi-region support for global deployments | Low | High | Support region-specific base URLs. Not needed for current single-region deployment. |

## Categories

### Edge Cases
- **Concurrent session calls**: Unit tests cover race conditions. Integration testing deferred.
- **Malformed backend responses**: JSON parse errors are caught and logged. Could add schema validation on responses.
- **Very long tokens**: Backend handles validation. Client-side validation not needed for MVP.

### UX Polish
- **Session expiration warnings**: Pre-expiration notifications to user. Requires backend session TTL info.
- **Automatic token refresh**: Currently handled by AuthProvider. Could be integrated into session service.
- **Loading states**: Session service is async but doesn't provide loading indicators. Higher-level components handle this.

### Performance
- **Request caching**: Cache `getSessionStatus()` responses for short duration to reduce backend load.
- **Batch session operations**: Group multiple session operations into single backend call.
- **Connection pooling**: HTTP/2 or connection reuse for repeated session calls.

### Observability
- **Performance monitoring**: Track session call latency, failure rates, retry counts.
- **Analytics integration**: Track session creation patterns, user behavior across sessions.
- **Alerting**: Notify on high session failure rates or backend unavailability.

### Integrations
- **WebSocket session sync**: Real-time session updates without polling `getSessionStatus()`.
- **Service Worker integration**: Offline session handling, background session refresh.
- **Third-party auth providers**: Extend beyond Cognito to support other identity providers.

### Testing
- **E2E session flow tests**: Playwright tests for full auth journey including session management.
- **Load testing**: Validate session service under high concurrency (1000+ simultaneous logins).
- **Chaos testing**: Simulate backend failures, network partitions, slow responses.

## Notes

All opportunities listed are explicitly OUT OF SCOPE for REPA-018 MVP. The story focuses on:
1. Pure migration with Zod conversion
2. Comprehensive unit tests
3. Integration tests (or documented skip strategy)
4. Single consumer migration (AuthProvider)

Future stories can build on this foundation to add enhanced session features as product needs evolve.

## Related Future Stories

Potential follow-up stories for repackag-app epic:
- **REPA-019**: Add Error Mapping to @repo/api-client (already in index)
  - Could include session-specific error handling utilities
- **Session Observability Story** (not yet created): Integrate @repo/auth-services with monitoring service
- **Cross-Tab Sync Story** (not yet created): Add BroadcastChannel support for multi-tab session sync
- **Advanced Auth Flows Story** (not yet created): Support MFA, email verification states in session service
