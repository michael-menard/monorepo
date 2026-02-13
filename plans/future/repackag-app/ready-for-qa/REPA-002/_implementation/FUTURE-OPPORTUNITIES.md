# Future Opportunities - REPA-002

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Test coverage for edge cases (large files >100MB, slow networks, concurrent cancellations) | Low | Medium | Add comprehensive edge case tests after MVP migration completes |
| 2 | Missing retry logic for transient network failures | Medium | Medium | Add exponential backoff retry in follow-up story (see DEV-FEASIBILITY.md) |
| 3 | Client-side file validation before upload (magic bytes, size limits) | Low | Low | Add pre-upload validation in follow-up story (see DEV-FEASIBILITY.md) |
| 4 | Stale upload session handling (expired presigned URLs) | Low | Medium | Add session expiration detection and recovery flow |
| 5 | No request timeout configuration (uses browser defaults) | Low | Low | Add configurable timeout option to uploadFile/uploadToPresignedUrl |
| 6 | Error messages not i18n-ready | Low | Medium | Defer to broader i18n effort (if/when internationalization is prioritized) |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Analytics and observability (upload success rates, error tracking, performance metrics) | High | Medium | Add telemetry in follow-up story after migration stabilizes (see FUTURE-RISKS.md) |
| 2 | Upload performance monitoring (track upload speed, identify slow regions/ISPs) | Medium | Medium | Add performance instrumentation after analytics infrastructure exists |
| 3 | Resume capability for interrupted uploads (chunked upload, S3 multipart) | High | High | Major feature - defer to separate epic (requires backend API changes) |
| 4 | Parallel chunk uploads for large files (>50MB) | Medium | High | Performance optimization - defer to separate story after chunking infrastructure exists |
| 5 | Progressive image compression preview during upload | Low | High | UX enhancement - defer to future UX polish iteration |
| 6 | Upload queue persistence (survive page refresh) | Medium | Medium | Add localStorage-based queue persistence in follow-up story |
| 7 | Bandwidth throttling for development/testing | Low | Low | Add optional bandwidth simulator for testing slow connections |
| 8 | Better error recovery UX (auto-retry with user notification) | Medium | Medium | Combine with retry logic enhancement (Gap #2) |
| 9 | Upload history/audit log for debugging | Low | Medium | Add upload event logging after analytics infrastructure exists |
| 10 | TypeScript strict mode for upload client (currently allows `any`) | Low | Low | Enable `noImplicitAny: true` in follow-up cleanup story |

## Categories

### Edge Cases
- Large file handling (>100MB, >1GB)
- Slow network simulation testing
- Concurrent upload cancellation race conditions
- Expired presigned URL handling
- Request timeout edge cases

### UX Polish
- Progressive compression preview
- Upload queue persistence across page refresh
- Better error recovery messaging
- Upload history visibility
- Bandwidth simulation for testing

### Performance
- Upload speed monitoring and analytics
- Parallel chunk uploads (requires chunking)
- Resume capability (requires multipart upload)
- Network condition detection and adaptation

### Observability
- Analytics integration (success/failure rates)
- Performance metrics collection
- Error tracking and alerting
- Upload audit logging
- Request correlation IDs

### Integrations
- Future integration with CDN purging
- Future integration with image optimization service
- Future integration with virus scanning (if required)

### Technical Debt
- Enable TypeScript strict mode
- Comprehensive edge case test coverage
- Standardize error message formats
- Add JSDoc documentation for all public APIs

---

## Prioritization Notes

**High-Impact, Low-Effort** (consider for next iteration):
- Client-side file validation (Gap #3)
- Request timeout configuration (Gap #5)
- Bandwidth throttling for testing (Enhancement #7)

**High-Impact, Medium-Effort** (prioritize after MVP stabilizes):
- Analytics and observability (Enhancement #1)
- Retry logic with exponential backoff (Gap #2)
- Upload queue persistence (Enhancement #6)

**High-Impact, High-Effort** (defer to separate epic):
- Resume capability with chunked uploads (Enhancement #3)
- Parallel chunk uploads (Enhancement #4)

**Low-Priority** (defer indefinitely unless user demand emerges):
- Progressive compression preview (Enhancement #5)
- Upload history/audit log (Enhancement #9)
- i18n for error messages (Gap #6)

---

## Notes

Most opportunities align with FUTURE-RISKS.md findings:
- Retry logic (Gap #2) → matches "Retry Logic" risk
- Analytics/observability (Enhancement #1) → matches "Analytics and Observability" risk
- Client validation (Gap #3) → matches "Client-Side File Validation" risk

The migration itself is low-risk. The real opportunities lie in enhancing the upload experience after consolidation completes.
